// 定义请求频率限制的配置
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 10, // 最多10个请求
};

// 定义抖音解析API返回的数据类型
interface DouyinApiResponse {
  code: number;
  msg: string;
  data: {
    author: string;
    author_id: string;
    avatar: string;
    title: string;
    cover: string;
    url: string;
    music_url: string;
    video_duration?: number;
    images?: string[];
  };
  api_source?: string;
}

// 存储每个IP的请求次数
const ipRequestCount = new Map<
  string,
  {
    count: number;
    resetTime: number;
  }
>();

// 实现重试机制
const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> => {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (retries > 0) {
      // 指数退避
      const delay = Math.pow(2, 3 - retries) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      // 提取前端传来的视频URL参数
      const videoUrl = url.searchParams.get("url");

      if (!videoUrl) {
        return Response.json(
          {
            code: 400,
            msg: "请提供视频URL参数",
            data: null,
          },
          { status: 400 }
        );
      }

      // 请求频率限制
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const now = Date.now();

      if (!ipRequestCount.has(ip)) {
        ipRequestCount.set(ip, {
          count: 1,
          resetTime: now + RATE_LIMIT.windowMs,
        });
      } else {
        const requestInfo = ipRequestCount.get(ip)!;

        // 检查是否需要重置计数
        if (now > requestInfo.resetTime) {
          requestInfo.count = 1;
          requestInfo.resetTime = now + RATE_LIMIT.windowMs;
        } else {
          // 检查是否超过限制
          if (requestInfo.count >= RATE_LIMIT.maxRequests) {
            return Response.json(
              {
                code: 429,
                msg: "请求过于频繁，请稍后重试",
                data: null,
              },
              { status: 429 }
            );
          }
          requestInfo.count++;
        }
      }

      try {
        // 调用抖音解析API，并实现重试机制
        const apiUrl = `https://api.pearktrue.cn/api/video/douyin/?url=${encodeURIComponent(
          videoUrl
        )}`;
        const response = await fetchWithRetry(apiUrl, {}, 3);
        const data = (await response.json()) as DouyinApiResponse;

        // 对返回数据进行格式化和处理
        if (data.code === 200) {
          return Response.json({
            code: 200,
            msg: "解析成功",
            data: {
              author: data.data.author,
              author_id: data.data.author_id,
              title: data.data.title,
              cover: data.data.cover,
              url: data.data.url,
              music_url: data.data.music_url,
              avatar: data.data.avatar,
            },
          });
        } else {
          return Response.json(
            {
              code: data.code,
              msg: data.msg,
              data: null,
            },
            { status: data.code }
          );
        }
      } catch (error) {
        return Response.json(
          {
            code: 500,
            msg: "解析失败，请稍后重试",
            data: null,
          },
          { status: 500 }
        );
      }
    }
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

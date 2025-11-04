// 定义请求频率限制的配置
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 30, // 增加到30个请求
};

// 定义抖音解析API返回的数据类型
interface DouyinApiResponse {
  code: number;
  msg: string;
  data: {
    create_time?: number;
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

// 定义批量解析结果的类型
interface BatchResult {
  originalUrl: string;
  code: number;
  msg: string;
  data: DouyinApiResponse["data"] | null;
}

// 定义环境变量类型
interface Env {
  // 添加任何环境变量定义
}

// 定义批量请求的请求体类型
interface BatchRequest {
  urls: string[];
}

// 定义API响应类型
interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

// 定义Cloudflare Worker的请求类型
type WorkerRequest = Request<unknown, IncomingRequestCfProperties>;

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
    const response = await fetch(url, {
      ...options,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
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

// 验证抖音链接格式
const validateDouyinUrl = (url: string): boolean => {
  const regex =
    /(https?:\/\/)?(www\.)?(douyin\.com|iesdouyin\.com|v\.douyin\.com)\/.+/;
  return regex.test(url);
};

// 解析单个视频
const parseSingleVideo = async (
  videoUrl: string
): Promise<{
  code: number;
  msg: string;
  data: DouyinApiResponse["data"] | null;
}> => {
  if (!validateDouyinUrl(videoUrl)) {
    return {
      code: 400,
      msg: "请输入有效的抖音视频链接",
      data: null,
    };
  }

  try {
    const apiUrl = `https://api.pearktrue.cn/api/video/douyin/?url=${encodeURIComponent(
      videoUrl
    )}`;
    const response = await fetchWithRetry(apiUrl, {}, 3);
    const data = (await response.json()) as DouyinApiResponse;

    if (data.code === 200) {
      return {
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
          create_time: data.data.create_time,
          video_duration: data.data.video_duration,
          images: data.data.images || [],
        },
      };
    } else {
      return {
        code: data.code,
        msg: data.msg,
        data: null,
      };
    }
  } catch (err) {
    console.error("Parse error:", err);
    return {
      code: 500,
      msg: "解析失败，请稍后重试",
      data: null,
    };
  }
};

// 批量解析视频
const parseBatchVideos = async (
  urls: string[]
): Promise<ApiResponse<BatchResult[]>> => {
  // 验证URL数组
  if (!Array.isArray(urls) || urls.length === 0) {
    return {
      code: 400,
      msg: "请提供有效的URL数组",
      data: [],
    };
  }

  // 限制最大10个URL
  const limitedUrls = urls.slice(0, 10);
  const results: BatchResult[] = [];

  // 并行解析所有视频
  for (const url of limitedUrls) {
    const result = await parseSingleVideo(url);
    results.push({
      originalUrl: url,
      ...result,
    });
  }

  return {
    code: 200,
    msg: `批量解析完成，共${results.length}个视频`,
    data: results,
  };
};

export default {
  async fetch(request: WorkerRequest, env: Env) {
    const url = new URL(request.url);

    // 处理CORS预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (url.pathname.startsWith("/api/")) {
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
              {
                status: 429,
                headers: {
                  "Access-Control-Allow-Origin": "*",
                },
              }
            );
          }
          requestInfo.count++;
        }
      }

      // API解析端点
      if (
        (url.pathname === "/api/parse" || url.pathname === "/api/") &&
        request.method === "GET"
      ) {
        const videoUrl = url.searchParams.get("url");

        if (!videoUrl) {
          return Response.json(
            {
              code: 400,
              msg: "请提供视频URL参数",
              data: null,
            },
            {
              status: 400,
              headers: {
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }

        const result = await parseSingleVideo(videoUrl);
        return Response.json(result, {
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      // 批量解析端点
      if (url.pathname === "/api/batch" && request.method === "POST") {
        try {
          const body = (await request.json()) as BatchRequest;
          const results = await parseBatchVideos(body.urls);
          return Response.json(results, {
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (err) {
          console.error("Batch parse error:", err);
          return Response.json(
            {
              code: 400,
              msg: "请求格式错误，请检查请求体",
              data: [],
            },
            {
              status: 400,
              headers: {
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }
      }
    }

    // 返回前端页面
    try {
      return await fetch(request);
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;

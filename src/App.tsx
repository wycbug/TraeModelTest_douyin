import { useState, useEffect } from "react";
import "./App.css";

// 定义解析结果的数据类型
interface VideoData {
  author: string;
  author_id: string;
  title: string;
  cover: string;
  url: string;
  music_url: string;
  avatar: string;
  create_time?: number;
  video_duration?: number;
  images?: string[];
}

// 定义批量解析结果的数据类型
interface BatchResult {
  originalUrl: string;
  code: number;
  msg: string;
  data: VideoData | null;
}

// 字段映射（英文转中文）
const fieldMapping: Record<string, string> = {
  author: "作者",
  author_id: "作者ID",
  title: "视频标题",
  cover: "视频封面",
  url: "无水印链接",
  music_url: "音乐链接",
  avatar: "作者头像",
  create_time: "创建时间",
  video_duration: "视频时长",
  images: "图片列表",
};

// 定义历史记录的数据类型
interface HistoryRecord {
  id: string;
  videoUrl: string;
  videoData: VideoData;
  timestamp: number;
}

function App() {
  // 状态管理
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [validUrlCount, setValidUrlCount] = useState(0);
  const [exportFields, setExportFields] = useState<Record<string, boolean>>({
    author: true,
    author_id: true,
    title: true,
    cover: true,
    url: true,
    music_url: true,
    avatar: true,
    create_time: false,
    video_duration: false,
    images: false,
  });
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  // 从本地存储加载历史记录
  useEffect(() => {
    const savedHistory = localStorage.getItem("douyinHistory");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error("Failed to parse history:", error);
      }
    }
  }, []);

  // 保存历史记录到本地存储
  const saveHistory = (record: HistoryRecord) => {
    const updatedHistory = [record, ...history].slice(0, 50); // 只保留最近50条记录
    setHistory(updatedHistory);
    localStorage.setItem("douyinHistory", JSON.stringify(updatedHistory));
  };

  // 从历史记录中删除
  const deleteHistory = (id: string) => {
    const updatedHistory = history.filter((record) => record.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem("douyinHistory", JSON.stringify(updatedHistory));
  };

  // 清空历史记录
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("douyinHistory");
  };

  // 处理链接输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputValue = e.target.value;
    setVideoUrl(inputValue);
    setError("");
    
    // 检测是否为批量模式
    const lines = inputValue.split("\n").filter(line => line.trim() !== "");
    setIsBatchMode(lines.length > 1);
    
    // 验证链接并统计有效链接数量
    let validCount = 0;
    for (const line of lines) {
      const url = line.trim();
      if (url && validateDouyinUrl(url)) {
        validCount++;
      }
    }
    setValidUrlCount(validCount);
  };

  // 解析短链接
  const resolveShortUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url, { method: "HEAD", redirect: "manual" });
      if (response.headers.has("Location")) {
        return response.headers.get("Location") || url;
      }
      return url;
    } catch (error) {
      console.error("Failed to resolve short URL:", error);
      return url;
    }
  };

  // 验证抖音链接格式
  const validateDouyinUrl = (url: string) => {
    const regex =
      /(https?:\/\/)?(www\.)?(douyin\.com|iesdouyin\.com|v\.douyin\.com)\/.+/;
    return regex.test(url);
  };

  // 解析视频链接（支持单条和批量）
  const parseVideo = async () => {
    if (!videoUrl) {
      setError("请输入视频链接");
      return;
    }

    setLoading(true);
    setError("");
    setVideoData(null);
    setBatchResults([]);

    try {
      // 解析所有链接
      const lines = videoUrl.split("\n").filter(line => line.trim() !== "");
      const urls = [];
      
      // 解析短链接并验证格式
      for (const line of lines) {
        const url = line.trim();
        if (url) {
          let resolvedUrl = url;
          if (url.includes("v.douyin.com")) {
            resolvedUrl = await resolveShortUrl(url);
          }
          
          if (validateDouyinUrl(resolvedUrl)) {
            urls.push(resolvedUrl);
          }
        }
      }

      if (urls.length === 0) {
        setError("没有有效的抖音视频链接");
        setLoading(false);
        return;
      }

      // 限制最大10个URL
      const limitedUrls = urls.slice(0, 10);
      
      if (limitedUrls.length > 1) {
        // 批量解析
        const response = await fetch("/api/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ urls: limitedUrls }),
        });
        const data = await response.json();

        if (data.code === 200) {
          setBatchResults(data.data);
          
          // 保存成功的记录到历史
          for (const result of data.data) {
            if (result.code === 200 && result.data) {
              const record: HistoryRecord = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                videoUrl: result.originalUrl,
                videoData: result.data,
                timestamp: Date.now(),
              };
              saveHistory(record);
            }
          }
        } else {
          setError(data.msg || "批量解析失败");
        }
      } else {
        // 单条解析
        const response = await fetch(
          `/api/parse?url=${encodeURIComponent(limitedUrls[0])}`
        );
        const data = await response.json();

        if (data.code === 200) {
          setVideoData(data.data);

          // 保存历史记录
          if (data.data) {
            const record: HistoryRecord = {
              id: Date.now().toString(),
              videoUrl: limitedUrls[0],
              videoData: data.data,
              timestamp: Date.now(),
            };
            saveHistory(record);
          }
        } else {
          setError(data.msg || "解析失败");
        }
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 复制文本到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("已复制到剪贴板");
    } catch (err) {
      alert("复制失败，请手动复制");
    }
  };

  // 导出为CSV
  const exportToCSV = (data: VideoData | VideoData[] = videoData || []) => {
    if (!data || (Array.isArray(data) && data.length === 0)) return;

    const dataArray = Array.isArray(data) ? data : [data];
    
    const headers = Object.keys(dataArray[0])
      .filter((key) => exportFields[key as keyof typeof exportFields])
      .map((key) => `"${fieldMapping[key]}"`)
      .join(",");

    const rows = dataArray.map((item) => {
      const values = Object.values(item)
        .filter((_, index) => exportFields[Object.keys(item)[index]])
        .map((value) => {
          if (Array.isArray(value)) {
            return `"${value.join('; ')}"`;
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",");
      return values;
    }).join("\n");

    // 添加BOM头以支持Excel正确显示中文
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const csv = new Blob([bom, headers + "\n" + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(csv);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `douyin_videos_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 导出为Excel (使用HTML表格方式)
  const exportToExcel = (data: VideoData | VideoData[] = videoData || []) => {
    if (!data || (Array.isArray(data) && data.length === 0)) return;

    const dataArray = Array.isArray(data) ? data : [data];
    
    const headers = Object.keys(dataArray[0])
      .filter((key) => exportFields[key as keyof typeof exportFields])
      .map((key) => `<th>${fieldMapping[key]}</th>`)
      .join("");

    const rows = dataArray.map((item) => {
      const cells = Object.values(item)
        .filter((_, index) => exportFields[Object.keys(item)[index]])
        .map((value) => {
          if (Array.isArray(value)) {
            return `<td>${value.join('; ')}</td>`;
          }
          return `<td>${value}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>${headers}</tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `douyin_videos_${Date.now()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 处理导出字段选择变化
  const handleFieldChange = (field: string) => {
    setExportFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <div className="app-container">
      <h1>抖音视频解析工具</h1>
      
      <div className="tab-panel">
          <div className="input-section">
            <textarea
              value={videoUrl}
              onChange={handleInputChange}
              placeholder={isBatchMode 
                ? `已检测到${validUrlCount}个有效链接，将自动进行批量解析（最多10条）` 
                : "请输入抖音视频链接（支持多种格式）"}
              disabled={loading}
              rows={isBatchMode ? 4 : 1}
            />
            <button onClick={parseVideo} disabled={loading}>
              {loading ? (isBatchMode ? "批量解析中..." : "解析中...") : "解析视频"}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
          
          {/* 批量解析结果展示 */}
          {batchResults.length > 0 && (
            <div className="batch-results-section">
              <h2>批量解析结果</h2>
              <div className="batch-results-list">
                {batchResults.map((result, index) => (
                  <div key={index} className={`batch-result-item ${result.code === 200 ? 'success' : 'error'}`}>
                    <div className="result-url">
                      {result.originalUrl.length > 50 
                        ? `${result.originalUrl.substring(0, 50)}...` 
                        : result.originalUrl}
                    </div>
                    <div className="result-status">
                      {result.code === 200 ? '成功' : '失败'}
                    </div>
                    {result.code === 200 && result.data && (
                      <div className="result-summary">
                        <span>作者: {result.data.author}</span>
                        <span>标题: {result.data.title}</span>
                      </div>
                    )}
                    {result.code !== 200 && (
                      <div className="result-error">
                        {result.msg}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {videoData && !isBatchMode && (
            <div className="result-section">
              <h2>解析结果</h2>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>作者</td>
                    <td>{videoData.author}</td>
                  </tr>
                  <tr>
                    <td>作者ID</td>
                    <td>{videoData.author_id}</td>
                  </tr>
                  <tr>
                    <td>视频标题</td>
                    <td>{videoData.title}</td>
                  </tr>
                  {videoData.create_time && (
                    <tr>
                      <td>创建时间</td>
                      <td>{new Date(videoData.create_time * 1000).toLocaleString()}</td>
                    </tr>
                  )}
                  {videoData.video_duration && (
                    <tr>
                      <td>视频时长</td>
                      <td>{Math.floor(videoData.video_duration / 1000)}秒</td>
                    </tr>
                  )}
                  <tr>
                    <td>封面</td>
                    <td>
                      <img
                        src={videoData.cover}
                        alt="视频封面"
                        className="preview-image"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>无水印链接</td>
                    <td>
                      <a
                        href={videoData.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        点击查看
                      </a>
                      <button
                        onClick={() => copyToClipboard(videoData.url)}
                        className="copy-button"
                      >
                        复制
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>音乐链接</td>
                    <td>
                      <a
                        href={videoData.music_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        点击播放
                      </a>
                      <button
                        onClick={() => copyToClipboard(videoData.music_url)}
                        className="copy-button"
                      >
                        复制
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>作者头像</td>
                    <td>
                      <img
                        src={videoData.avatar}
                        alt="作者头像"
                        className="preview-image avatar"
                      />
                    </td>
                  </tr>
                  {videoData.images && videoData.images.length > 0 && (
                    <tr>
                      <td>图片列表</td>
                      <td>
                        <div className="images-grid">
                          {videoData.images.map((img, index) => (
                            <img
                              key={index}
                              src={img}
                              alt={`图片${index + 1}`}
                              className="preview-image small"
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="export-section">
                <h3>选择导出字段</h3>
                <div className="export-fields">
                  {Object.keys(exportFields).map((field) => (
                    <label key={field} className="field-checkbox">
                      <input
                        type="checkbox"
                        checked={exportFields[field]}
                        onChange={() => handleFieldChange(field)}
                      />
                      {fieldMapping[field]}
                    </label>
                  ))}
                </div>

                <div className="export-buttons">
                  <button onClick={() => exportToCSV()} disabled={loading}>
                    导出为CSV
                  </button>
                  <button onClick={() => exportToExcel()} disabled={loading}>
                    导出为Excel
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* 历史记录展示 */}
      {history.length > 0 && (
        <div className="history-section">
          <div className="history-header">
            <h2>历史记录</h2>
            <button onClick={clearHistory} className="clear-history-button">
              清空历史
            </button>
          </div>

          <div className="history-list">
            {history.map((record) => (
              <div key={record.id} className="history-item">
                <div className="history-item-content">
                  <img
                    src={record.videoData.cover}
                    alt="视频封面"
                    className="history-preview-image"
                  />
                  <div className="history-item-info">
                    <h3>{record.videoData.title}</h3>
                    <p>{new Date(record.timestamp).toLocaleString()}</p>
                    <button
                  onClick={() => {
                    setVideoUrl(record.videoUrl);
                    setVideoData(record.videoData);
                    setBatchResults([]);
                    setIsBatchMode(false);
                  }}
                  className="view-details-button"
                >
                      查看详情
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => deleteHistory(record.id)}
                  className="delete-history-button"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

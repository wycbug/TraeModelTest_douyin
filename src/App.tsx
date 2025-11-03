import { useState, useEffect } from 'react'
import './App.css'

// 定义解析结果的数据类型
interface VideoData {
  author: string;
  author_id: string;
  title: string;
  cover: string;
  url: string;
  music_url: string;
  avatar: string;
}

// 定义历史记录的数据类型
interface HistoryRecord {
  id: string;
  videoUrl: string;
  videoData: VideoData;
  timestamp: number;
}

function App() {
  // 状态管理
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [exportFields, setExportFields] = useState<Record<string, boolean>>({ 
    author: true, 
    author_id: true, 
    title: true, 
    cover: true, 
    url: true, 
    music_url: true, 
    avatar: true 
  });
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  
  // 从本地存储加载历史记录
  useEffect(() => {
    const savedHistory = localStorage.getItem('douyinHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to parse history:', error);
      }
    }
  }, []);
  
  // 保存历史记录到本地存储
  const saveHistory = (record: HistoryRecord) => {
    const updatedHistory = [record, ...history].slice(0, 50); // 只保留最近50条记录
    setHistory(updatedHistory);
    localStorage.setItem('douyinHistory', JSON.stringify(updatedHistory));
  };
  
  // 从历史记录中删除
  const deleteHistory = (id: string) => {
    const updatedHistory = history.filter(record => record.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('douyinHistory', JSON.stringify(updatedHistory));
  };
  
  // 清空历史记录
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('douyinHistory');
  };

  // 处理链接输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let url = e.target.value;
    setError('');
    
    // 链接格式自动识别和清理
    if (url) {
      // 提取短链接中的实际链接
      if (url.includes('v.douyin.com')) {
        // 这里可以添加短链接解析逻辑，由于时间关系，暂时不实现
        // 实际项目中可以使用fetch请求短链接获取实际链接
      }
      
      // 清理链接中的多余参数
      try {
        const parsedUrl = new URL(url);
        // 只保留必要的参数
        parsedUrl.searchParams.delete('utm_source');
        parsedUrl.searchParams.delete('utm_medium');
        parsedUrl.searchParams.delete('utm_campaign');
        parsedUrl.searchParams.delete('share_source');
        parsedUrl.searchParams.delete('share_medium');
        parsedUrl.searchParams.delete('share_plat');
        parsedUrl.searchParams.delete('share_session_id');
        parsedUrl.searchParams.delete('share_tag');
        
        url = parsedUrl.toString();
      } catch (error) {
        // 忽略无效URL的错误
      }
    }
    
    setVideoUrl(url);
  };

  // 验证抖音链接格式
  const validateDouyinUrl = (url: string) => {
    const regex = /(https?:\/\/)?(www\.)?(douyin\.com|iesdouyin\.com|v\.douyin\.com)\/.+/;
    return regex.test(url);
  };

  // 解析视频链接
  const parseVideo = async () => {
    if (!videoUrl) {
      setError('请输入视频链接');
      return;
    }

    if (!validateDouyinUrl(videoUrl)) {
      setError('请输入有效的抖音视频链接');
      return;
    }

    setLoading(true);
    setError('');
    setVideoData(null);

    try {
      const response = await fetch(`/api/?url=${encodeURIComponent(videoUrl)}`);
      const data = await response.json();

      if (data.code === 200) {
        setVideoData(data.data);
        
        // 保存历史记录
        if (data.data) {
          const record: HistoryRecord = {
            id: Date.now().toString(),
            videoUrl,
            videoData: data.data,
            timestamp: Date.now()
          };
          saveHistory(record);
        }
      } else {
        setError(data.msg || '解析失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 复制文本到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('已复制到剪贴板');
    } catch (err) {
      alert('复制失败，请手动复制');
    }
  };

  // 导出为CSV
  const exportToCSV = () => {
    if (!videoData) return;

    const headers = Object.keys(videoData)
      .filter(key => exportFields[key as keyof typeof exportFields])
      .map(key => `"${key}"`)
      .join(',');

    const values = Object.values(videoData)
      .filter((_, index) => exportFields[Object.keys(videoData)[index]])
      .map(value => `"${value}"`)
      .join(',');

    const csv = `${headers}\n${values}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `douyin_video_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 导出为Excel
  const exportToExcel = () => {
    if (!videoData) return;

    // 这里简化处理，实际项目中可以使用xlsx库
    const headers = Object.keys(videoData)
      .filter(key => exportFields[key as keyof typeof exportFields])
      .map(key => `<th>${key}</th>`)
      .join('');

    const rows = Object.values(videoData)
      .filter((_, index) => exportFields[Object.keys(videoData)[index]])
      .map(value => `<td>${value}</td>`)
      .join('');

    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body>
          <table>
            <thead>
              <tr>${headers}</tr>
            </thead>
            <tbody>
              <tr>${rows}</tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `douyin_video_${Date.now()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 处理导出字段选择变化
  const handleFieldChange = (field: string) => {
    setExportFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="app-container">
      <h1>抖音视频解析工具</h1>
      
      <div className="input-section">
        <input
          type="text"
          value={videoUrl}
          onChange={handleInputChange}
          placeholder="请输入抖音视频链接"
          disabled={loading}
        />
        <button
          onClick={parseVideo}
          disabled={loading}
        >
          {loading ? '解析中...' : '解析视频'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {videoData && (
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
              <tr>
                <td>封面</td>
                <td>
                  <img src={videoData.cover} alt="视频封面" className="preview-image" />
                </td>
              </tr>
              <tr>
                <td>无水印链接</td>
                <td>
                  <a href={videoData.url} target="_blank" rel="noopener noreferrer">点击查看</a>
                  <button onClick={() => copyToClipboard(videoData.url)} className="copy-button">复制</button>
                </td>
              </tr>
              <tr>
                <td>音乐链接</td>
                <td>
                  <a href={videoData.music_url} target="_blank" rel="noopener noreferrer">点击播放</a>
                  <button onClick={() => copyToClipboard(videoData.music_url)} className="copy-button">复制</button>
                </td>
              </tr>
              <tr>
                <td>作者头像</td>
                <td>
                  <img src={videoData.avatar} alt="作者头像" className="preview-image avatar" />
                </td>
              </tr>
            </tbody>
          </table>

          <div className="export-section">
            <h3>选择导出字段</h3>
            <div className="export-fields">
              {Object.keys(exportFields).map(field => (
                <label key={field} className="field-checkbox">
                  <input
                    type="checkbox"
                    checked={exportFields[field]}
                    onChange={() => handleFieldChange(field)}
                  />
                  {field}
                </label>
              ))}
            </div>

            <div className="export-buttons">
              <button onClick={exportToCSV} disabled={loading}>导出为CSV</button>
              <button onClick={exportToExcel} disabled={loading}>导出为Excel</button>
            </div>
          </div>
        </div>
      )}
      
      {/* 历史记录展示 */}
      {history.length > 0 && (
        <div className="history-section">
          <div className="history-header">
            <h2>历史记录</h2>
            <button onClick={clearHistory} className="clear-history-button">清空历史</button>
          </div>
          
          <div className="history-list">
            {history.map(record => (
              <div key={record.id} className="history-item">
                <div className="history-item-content">
                  <img src={record.videoData.cover} alt="视频封面" className="history-preview-image" />
                  <div className="history-item-info">
                    <h3>{record.videoData.title}</h3>
                    <p>{new Date(record.timestamp).toLocaleString()}</p>
                    <button onClick={() => {setVideoUrl(record.videoUrl); setVideoData(record.videoData);}} className="view-details-button">查看详情</button>
                  </div>
                </div>
                <button onClick={() => deleteHistory(record.id)} className="delete-history-button">删除</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App

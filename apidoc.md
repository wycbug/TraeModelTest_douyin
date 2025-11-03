# 抖音单视频解析API

免费

通过抖音分享链接获取抖音链接信息

## 接口信息

**接口地址：** `https://api.pearktrue.cn/api/video/douyin/`

**请求方式：** GET

**返回格式：** JSON

## 请求参数

| 参数名 | 说明 | 必填 |
|--------|------|------|
| url | 视频链接 | 必填 |

## 返回结果

| 字段名 | 说明 | 类型 |
|--------|------|------|
| code | 状态码 | 整数 |
| msg | 状态信息 | 字符串 |
| data | 返回数据 | 对象 |
| data.create_time | 创建时间 | 整数 |
| data.author | 账号作者 | 字符串 |
| data.author_id | 账号ID | 字符串 |
| data.avatar | 作者头像 | 字符串 |
| data.title | 视频标题 | 字符串 |
| data.cover | 视频封面 | 字符串 |
| data.url | 无水印链接 | 字符串 |
| data.video_duration | 视频时长 | 整数 |
| data.music_url | 音乐链接 | 字符串 |
| data.images | 图片列表 | 数组 |
| api_source | API来源 | 字符串 |

## 调用示例

```bash
GET https://api.pearktrue.cn/api/video/douyin/?url=https://v.douyin.com/iererwFh/
```

## 响应示例

```json
{
  "code": 200,
  "msg": "解析成功",
  "data": {
    "create_time": 1693542028,
    "author": "祝绪丹Bambi",
    "author_id": "666a666a6666",
    "avatar": "https://p11.douyinpic.com/aweme/100x100/aweme-avatar/mosaic-legacy_30ea30000c528070df091.jpeg?from=327834062",
    "title": "这次queencard跳得很开心，没想到秦霄贤会是我的舞蹈老师啊哈哈哈哈 恶魔循环训练  但我觉得他跳的没我好👀#行动派全员queencard收官 #全力以赴的行动派",
    "cover": "https://p26-sign.douyinpic.com/tos-cn-i-0813/okEPq9CktexZNfgJJrDzogAANMANAFkAzIAbhL~c5_300x400.jpeg?lk3s=138a59ce&x-expires=1763388000&x-signature=gnbTjdqjxPLFI9dJyMC0a16mXnA%3D&from=327834062_large&s=PackSourceEnum_AWEME_DETAIL&se=false&sc=cover&biz_tag=aweme_video&l=20251103224523C8BF1573E169C82F2A17",
    "url": "https://v6-cold.douyinvod.com/a4fcbd90aed5370b42b06dc5722821c3/6908ce2d/video/tos/cn/tos-cn-ve-15c001-alinc2/ogxsAeB9Nnkf8TAUZgLIABzwQbNSyzADR3I4Wg/?a=0&ch=26&cr=3&dr=0&lr=all&cd=0%7C0%7C0%7C3&cv=1&br=1814&bt=1814&cs=0&ds=6&ft=pEagMPI8ffPdqK~-I1VNvAq-antLjrK.gUenRka7e9B9UjVhWL6&mime_type=video_mp4&qs=0&rc=ODloZTQzNDdmaWkzZmczZUBpMzk6azM6ZjdwbTMzNGkzM0BjLWIyXy4yNi4xNGFfMWAwYSNvZC5gcjRnXmxgLS1kLWFzcw%3D%3D&btag=c0000e00010000&cquery=100F_100E_103t_100I_100H&dy_q=1762181123&feature_id=f0150a16a324336cda5d6dd0b69ed299&l=20251103224523C8BF1573E169C82F2A17",
    "video_duration": 26841,
    "music_url": "https://sf3-cdn-tos.douyinstatic.com/obj/ies-music/7273707626255502139.mp3",
    "images": []
  },
  "api_source": "官方API网:https://api.pearktrue.cn/"
}
```

## 调用统计

- **总调用次数：** 22,833,298
- **今日调用：** 30,088
- **本周调用：** 1,370,967

## 在线调试

[https://api.pearktrue.cn/api/video/douyin/](https://api.pearktrue.cn/api/video/douyin/)

---

*API来源：官方API网 https://api.pearktrue.cn/*
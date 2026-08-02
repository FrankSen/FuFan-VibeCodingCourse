# 后端接口适配说明

## 概述

本项目已完成与 Python 后端 (http://localhost:8002) 的完整接口适配。

## 架构说明

### 文件结构

```
/
├── services/
│   └── api.ts                    # API 服务层，所有后端请求的封装
├── components/
│   ├── login/
│   │   ├── LoginPage.tsx        # 登录页（集成会话列表加载）
│   │   └── SettingsModal.tsx    # API Key 设置弹窗
│   └── editor/
│       ├── EditorPageWithBackend.tsx  # 编辑器主页面（完整后端集成）
│       ├── FilmStrip.tsx        # 幻灯片缩略图组件
│       └── VersionModal.tsx     # 版本管理弹窗
├── config.ts                     # 后端配置（可修改后端地址）
└── App.tsx                       # 主应用路由
```

## 已实现功能

### 1. 登录页 (LoginPage)

✅ **会话列表加载**
- 自动从 `/sessions` 获取历史项目
- 显示项目封面、标题和时间

✅ **文件上传**
- 支持 PDF、Word、TXT 文件上传
- 调用 `/upload/doc` 提取文本内容

✅ **创建新项目**
- 调用 `/session/create` 创建会话
- 自动执行 `/ppt/plan` 规划 PPT 结构
- 逐页调用 `/ppt/generate_slide` 生成幻灯片

### 2. 编辑器页面 (EditorPageWithBackend)

✅ **加载项目数据**
- 从 `/session/{session_id}` 获取完整项目数据
- 自动转换后端数据格式为前端格式

✅ **PPT 规划流程**
- 对于新会话，自动调用规划和生成流程
- 显示规划进度和生成状态

✅ **版本管理**
- 切换版本：`PATCH /session/{id}/slide/{index}/version`
- 删除版本：`DELETE /session/{id}/slide/{index}/version/{vid}`
- 生成新版本：修改模式调用 `generate_slide`

✅ **幻灯片操作**
- 删除页面：`DELETE /session/{id}/slide/{index}`
- 插入页面：插入模式调用 `generate_slide`
- 拖拽排序（前端实现，后端可扩展排序API）

✅ **图片处理**
- 自动拼接后端图片 URL
- 错误处理和降级显示

## API 服务层 (services/api.ts)

### 核心功能

1. **自动 API Key 注入**
   - 从 localStorage 读取 `openrouter_api_key`
   - 自动添加到请求 header `x-api-key`

2. **统一错误处理**
   - 自动处理 HTTP 错误
   - 提供清晰的错误信息

3. **数据格式转换**
   - 后端时间戳 → 前端可读时间
   - 后端图片路径 → 完整 URL

### 主要接口

| 功能 | 函数名 | 后端路由 |
|-----|-------|---------|
| 会话列表 | `listSessions()` | `GET /sessions` |
| 创建会话 | `createSession(topic)` | `POST /session/create` |
| 获取会话 | `getSessionData(id)` | `GET /session/{id}` |
| 上传文档 | `uploadDoc(file)` | `POST /upload/doc` |
| 规划PPT | `planPPT(request)` | `POST /ppt/plan` |
| 生成幻灯片 | `generateSlide(request)` | `POST /ppt/generate_slide` |
| 删除幻灯片 | `deleteSlide(id, index)` | `DELETE /session/{id}/slide/{index}` |
| 切换版本 | `setActiveVersion(...)` | `PATCH /session/{id}/slide/{index}/version` |
| 删除版本 | `deleteVersion(...)` | `DELETE /session/{id}/slide/{index}/version/{vid}` |

## 使用流程

### 首次使用

1. 用户访问登录页
2. 点击"设置 API Key"输入 OpenRouter Key
3. 输入主题，可选上传文档
4. 点击"开始制作"

### 创建流程

```
1. 上传文档 (如有) → 提取文本
2. 创建会话 → 获得 session_id
3. 规划 PPT → 获得页面结构
4. 逐页生成 → 创建幻灯片图片
5. 跳转编辑器 → 展示完成的 PPT
```

### 编辑流程

1. 点击"编辑 & 版本选择"
2. 输入修改需求
3. 生成新版本（图生图）
4. 可在历史版本间切换

### 插入流程

1. 点击胶片条之间的 "+" 按钮
2. 输入新页面内容
3. 自动插入到指定位置

## 配置修改

### 修改后端地址

编辑 `/config.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://your-backend-url:port',
};
```

### 使用环境变量

```typescript
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8002',
};
```

然后在 `.env` 文件中设置：

```
VITE_API_URL=http://production-backend.com
```

## 数据格式

### 后端 → 前端转换

**后端 Slide 格式:**
```json
{
  "index": 0,
  "active_version_id": "v_xxx",
  "versions": [{
    "id": "v_xxx",
    "image_url": "/images/session/img.png",
    "prompt": "...",
    "timestamp": 1764150000.0
  }]
}
```

**前端 Slide 格式:**
```typescript
{
  id: 0,
  activeVersionId: "v_xxx",
  versions: [{
    id: "v_xxx",
    url: "http://localhost:8002/images/session/img.png",
    prompt: "...",
    timestamp: "10:02 AM"
  }]
}
```

## 错误处理

所有 API 调用都包含 try-catch 错误处理：

- 网络错误 → 弹窗提示
- API Key 错误 → 提示设置 Key
- 生成失败 → 显示错误信息

## 注意事项

1. **CORS 配置**: 确保后端允许前端域名的跨域请求
2. **API Key 安全**: Key 存储在 localStorage，仅用于开发环境
3. **图片加载**: 使用 `onError` 降级处理图片加载失败
4. **长时间请求**: PPT 规划可能需要几分钟，已添加加载状态提示

## 测试建议

1. 测试无 API Key 时的提示
2. 测试文件上传功能
3. 测试会话列表加载
4. 测试完整的创建流程
5. 测试版本切换和删除
6. 测试插入新页面功能
7. 测试拖拽排序

## 后续扩展

- [ ] 添加会话重命名功能
- [ ] 添加幻灯片排序API调用
- [ ] 添加导出功能
- [ ] 添加实时聊天记录显示
- [ ] 添加批量操作功能

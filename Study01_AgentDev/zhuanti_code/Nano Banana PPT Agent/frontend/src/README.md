# 赋范空间 fufan.ai - AI PPT Agent

<div align="center">

**🎨 专业的 AI 驱动 PPT 演示文稿生成平台**

[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.x-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[在线体验](https://fufan.ai) · [报告问题](https://github.com/yourusername/fufan-ai/issues) · [功能建议](https://github.com/yourusername/fufan-ai/issues)

</div>

---

## 📖 目录

- [项目简介](#-项目简介)
- [核心功能](#-核心功能)
- [技术栈](#-技术栈)
- [项目结构](#-项目结构)
- [快速开始](#-快速开始)
- [前端部署](#-前端部署)
- [后端 API](#-后端-api)
- [环境配置](#-环境配置)
- [使用指南](#-使用指南)
- [开发说明](#-开发说明)
- [常见问题](#-常见问题)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

---

## 🎯 项目简介

**赋范空间 fufan.ai** 是一款基于 AI 的智能 PPT 生成平台，通过 OpenRouter API 提供强大的 AI 能力，帮助用户快速创建专业的演示文稿。

### ✨ 亮点特性

- 🤖 **AI 智能生成** - 基于主题或文档自动生成完整的 PPT 内容
- 🎨 **现代化设计** - 深色主题 + 极光背景 + 玻璃拟态效果
- 📝 **提示词模板** - 自定义全局风格偏好，统一演示文稿设计语言
- 🔑 **API Key 管理** - 支持前端设置、后端保存、连接测试
- 📂 **文档上传** - 支持 PDF/DOC/IMG 作为参考资料
- 🎬 **实时编辑** - 拖拽排序、版本管理、幻灯片预览
- 💾 **会话管理** - 自动保存历史项目，随时继续编辑
- 🎯 **响应式设计** - 完美适配桌面端和移动端

---

## 🚀 核心功能

### 登录页 (LoginPage)

| 功能模块 | 描述 |
|---------|------|
| **API Key 设置** | 支持从后端读取、保存到 `.env`、自动测试连接 |
| **提示词模板** | 自定义全局风格模板，应用于所有生成任务 |
| **主题输入** | 输入演示主题，支持多行文本 |
| **文件上传** | 上传 PDF/Word/图片作为参考资料 |
| **项目历史** | 展示近期项目，一键继续编辑 |

### PPT 编辑页 (EditorPage)

| 功能模块 | 描述 |
|---------|------|
| **幻灯片展示** | 大屏预览当前幻灯片 |
| **版本管理** | 每张幻灯片支持多版本切换 |
| **拖拽排序** | 拖拽调整幻灯片顺序 |
| **缩略图胶片条** | 底部展示所有幻灯片缩略图 |
| **导出功能** | 导出为 PDF、PNG 等格式 |

---

## 🛠 技术栈

### 前端框架

```
React 18.x          - 核心框架
TypeScript 5.x      - 类型安全
Vite 6.x            - 构建工具
```

### UI & 样式

```
Tailwind CSS 4.x    - 样式框架
Phosphor Icons      - 图标库
Motion (Framer)     - 动画库
```

### 状态管理 & 工具

```
React Hooks         - 状态管理
LocalStorage        - 本地持久化
Fetch API           - HTTP 请求
```

### 后端 API

```
OpenRouter API      - AI 模型服务
自定义后端          - 会话管理、文件上传
```

---

## 📁 项目结构

```
fufan-ai/
├── public/                      # 静态资源
├── src/
│   ├── App.tsx                  # 应用入口
│   ├── components/              # React 组件
│   │   ├── login/               # 登录页组件
│   │   │   ├── LoginPage.tsx    # 登录主页面
│   │   │   ├── SettingsModal.tsx     # API Key 设置弹窗
│   │   │   └── PromptTemplateModal.tsx  # 提示词模板弹窗
│   │   ├── editor/              # 编辑器组件
│   │   │   ├── EditorPage.tsx   # 编辑器主页面
│   │   │   ├── SlideCanvas.tsx  # 幻灯片画布
│   │   │   ├── FilmStrip.tsx    # 缩略图胶片条
│   │   │   └── VersionPanel.tsx # 版本管理面板
│   │   └── figma/               # Figma 相关组件
│   │       └── ImageWithFallback.tsx
│   ├── services/                # API 服务
│   │   └── api.ts               # API 接口封装
│   ├── styles/                  # 全局样式
│   │   └── globals.css          # Tailwind + 自定义样式
│   └── main.tsx                 # 应用入口
├── index.html                   # HTML 模板
├── package.json                 # 依赖配置
├── tsconfig.json                # TypeScript 配置
├── vite.config.ts               # Vite 配置
├── tailwind.config.js           # Tailwind 配置 (如果需要)
├── BACKEND_API_REQUIREMENTS.md  # 后端 API 需求文档
├── BACKEND_PROMPT_TEMPLATE_API.md  # 提示词模板 API 文档
└── README.md                    # 本文档
```

---

## ⚡ 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 或 **pnpm** >= 8.0.0
- **后端服务** 运行在 `http://localhost:8002`

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/yourusername/fufan-ai.git
cd fufan-ai

# 安装依赖 (推荐使用 pnpm)
npm install
# 或
pnpm install
```

### 本地开发

```bash
# 启动开发服务器
npm run dev

# 应用将运行在 http://localhost:5173
```

### 构建生产版本

```bash
# 构建优化后的生产版本
npm run build

# 预览生产构建
npm run preview
```

---

## 🌐 前端部署

### 方法 1: Vercel 部署 (推荐)

**最简单的部署方式，支持自动部署**

#### 步骤 1: 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 步骤 2: 登录 Vercel

```bash
vercel login
```

#### 步骤 3: 部署项目

```bash
# 在项目根目录执行
vercel

# 第一次部署会提示配置项目
# 后续部署直接运行 vercel --prod
```

#### 步骤 4: 配置环境变量（可选）

在 Vercel Dashboard 中配置：

```
VITE_API_BASE_URL=https://your-backend-api.com
```

---

### 方法 2: Netlify 部署

#### 步骤 1: 构建项目

```bash
npm run build
```

#### 步骤 2: 使用 Netlify CLI 部署

```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 登录
netlify login

# 部署
netlify deploy --prod --dir=dist
```

或者通过 **Netlify Web UI**：

1. 登录 [Netlify](https://app.netlify.com/)
2. 点击 "Add new site" → "Deploy manually"
3. 拖拽 `dist` 文件夹到部署区域

**构建配置**：
```
Build command: npm run build
Publish directory: dist
```

---

### 方法 3: 传统服务器部署 (Nginx)

#### 步骤 1: 构建项目

```bash
npm run build
```

#### 步骤 2: 上传到服务器

```bash
# 使用 scp 上传 dist 目录
scp -r dist/* user@your-server:/var/www/fufan-ai/
```

#### 步骤 3: 配置 Nginx

创建 Nginx 配置文件 `/etc/nginx/sites-available/fufan-ai`：

```nginx
server {
    listen 80;
    server_name fufan.ai www.fufan.ai;

    root /var/www/fufan-ai;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API 代理 (如果需要)
    location /api {
        proxy_pass http://localhost:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

#### 步骤 4: 启用站点并重启 Nginx

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/fufan-ai /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 步骤 5: 配置 HTTPS (Let's Encrypt)

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d fufan.ai -d www.fufan.ai

# 自动续期
sudo certbot renew --dry-run
```

---

### 方法 4: Docker 部署

#### 步骤 1: 创建 Dockerfile

```dockerfile
# 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产环境
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 步骤 2: 创建 nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

#### 步骤 3: 构建和运行 Docker 容器

```bash
# 构建镜像
docker build -t fufan-ai:latest .

# 运行容器
docker run -d -p 80:80 --name fufan-ai fufan-ai:latest

# 查看日志
docker logs -f fufan-ai
```

---

### 方法 5: GitHub Pages 部署

#### 步骤 1: 修改 vite.config.ts

```typescript
export default defineConfig({
  base: '/fufan-ai/', // 替换为你的仓库名
  // ...其他配置
});
```

#### 步骤 2: 添加部署脚本

在 `package.json` 中添加：

```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

#### 步骤 3: 安装并部署

```bash
npm install -g gh-pages
npm run deploy
```

---

## 🔌 后端 API

后端服务默认运行在 `http://localhost:8002`，提供以下 API 接口：

### API Key 管理

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/key` | GET | 获取 API Key 状态 |
| `/api/key/save` | POST | 保存 API Key 到 `.env` |
| `/api/key/test` | POST | 测试 API Key 有效性 |

### 提示词模板

| 接口 | 方法 | 说明 |
|------|------|------|
| `/ppt/template` | GET | 获取用户模板 |
| `/ppt/template` | POST | 保存用户模板 |

### 会话管理

| 接口 | 方法 | 说明 |
|------|------|------|
| `/ppt/sessions` | GET | 获取所有会话 |
| `/ppt/session` | POST | 创建新会话 |
| `/ppt/session/<id>` | GET | 获取会话详情 |
| `/ppt/session/<id>` | DELETE | 删除会话 |

### PPT 生成

| 接口 | 方法 | 说明 |
|------|------|------|
| `/ppt/plan` | POST | 生成 PPT 规划 |
| `/ppt/generate_slide` | POST | 生成单张幻灯片 |
| `/upload` | POST | 上传参考文档 |

**详细的 API 文档**：
- [API Key 管理接口](./BACKEND_API_REQUIREMENTS.md)
- [提示词模板接口](./BACKEND_PROMPT_TEMPLATE_API.md)

---

## 🔧 环境配置

### 前端环境变量

创建 `.env` 文件（可选）：

```env
# API 后端地址
VITE_API_BASE_URL=http://localhost:8002

# 其他配置
VITE_APP_TITLE=赋范空间 fufan.ai
```

### 后端环境变量

后端 `.env` 文件示例：

```env
# OpenRouter API Key
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# 服务器配置
PORT=8002
HOST=0.0.0.0

# 数据库配置 (如果需要)
DATABASE_URL=sqlite:///./fufan.db

# 文件存储路径
UPLOAD_FOLDER=./uploads
OUTPUT_FOLDER=./outputs
```

---

## 📚 使用指南

### 1. 设置 API Key

1. 点击右上角 "⚙️ 设置 API Key"
2. 输入 OpenRouter API Key (格式: `sk-or-v1-...`)
3. 点击 "👁️ 显示密码" 查看输入内容
4. 点击 "💾 保存" - 自动测试并保存到后端
5. 看到 ✅ "API Key 验证通过并已保存成功！"

### 2. 设置提示词模板

1. 点击输入框右侧 "✨ 提示词模板"
2. 编辑全局风格模板（默认为现代科技风格）
3. 点击 "🔄 恢复默认" 可重置模板
4. 点击 "💾 保存" 应用到所有后续生成

### 3. 创建 PPT

**方式 1: 纯文本输入**
```
输入: "帮我制作一份关于深度学习发展史的 PPT"
→ 点击 "开始制作"
```

**方式 2: 上传参考文档**
```
1. 点击 "📎 添加参考文档"
2. 选择 PDF/Word/图片
3. 输入补充说明（可选）
4. 点击 "开始制作"
```

### 4. 编辑幻灯片

- **切换版本**: 点击右侧版本按钮
- **拖拽排序**: 拖动底部缩略图调整顺序
- **生成新版本**: 点击 "🔄 重新生成"
- **导出 PPT**: 点击 "📥 导出"

---

## 🧑‍💻 开发说明

### 安装开发工具

```bash
# 安装 ESLint + Prettier
npm install -D eslint prettier eslint-plugin-react

# 安装 TypeScript 类型定义
npm install -D @types/react @types/react-dom
```

### 代码规范

```bash
# 运行 ESLint 检查
npm run lint

# 自动修复问题
npm run lint:fix

# 格式化代码
npm run format
```

### 热更新

开发模式下支持热模块替换 (HMR)：

```bash
npm run dev
# 修改文件后自动刷新浏览器
```

### 调试技巧

1. **查看 API 请求**：打开浏览器开发者工具 → Network
2. **查看状态**：使用 React DevTools
3. **查看本地存储**：Application → Local Storage

### 新增组件

```bash
# 创建新组件
touch src/components/your-component/YourComponent.tsx

# 导入使用
import { YourComponent } from './components/your-component/YourComponent';
```

---

## ❓ 常见问题

### Q1: API Key 保存后仍然显示红点？

**A**: 检查以下几点：
1. 确认后端服务运行在 `http://localhost:8002`
2. 检查浏览器控制台是否有网络错误
3. 尝试刷新页面重新检查 API Key 状态

### Q2: 上传文件失败？

**A**: 确保：
1. 文件大小 < 10MB
2. 文件格式为 PDF、DOC、DOCX、TXT 或图片
3. 后端 `/upload` 接口正常工作

### Q3: 生成的幻灯片为空白？

**A**: 可能原因：
1. OpenRouter API Key 额度不足
2. 网络连接问题
3. 查看浏览器控制台和后端日志

### Q4: 如何修改后端 API 地址？

**A**: 修改 `src/services/api.ts`：

```typescript
const API_BASE_URL = 'https://your-backend-api.com';
```

或使用环境变量：

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002';
```

### Q5: 部署后样式错乱？

**A**: 检查：
1. `vite.config.ts` 中的 `base` 配置
2. Tailwind CSS 是否正确构建
3. 浏览器缓存（强制刷新 Ctrl+Shift+R）

### Q6: 如何清除所有数据？

**A**: 
```javascript
// 在浏览器控制台执行
localStorage.clear();
location.reload();
```

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 贡献流程

1. **Fork 项目**
2. **创建功能分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **创建 Pull Request**

### 代码风格

- 使用 TypeScript 类型注解
- 遵循 React Hooks 规范
- 组件命名使用 PascalCase
- 函数命名使用 camelCase
- 注释使用中文

### 提交规范

```
feat: 新增功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具链更新
```

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证。

---

## 🙏 致谢

感谢以下开源项目：

- [React](https://reactjs.org/) - UI 框架
- [Vite](https://vitejs.dev/) - 构建工具
- [Tailwind CSS](https://tailwindcss.com/) - 样式框架
- [Phosphor Icons](https://phosphoricons.com/) - 图标库
- [OpenRouter](https://openrouter.ai/) - AI API 服务

---

## 📞 联系我们

- **官网**: [https://fufan.ai](https://fufan.ai)
- **Email**: support@fufan.ai
- **GitHub**: [@yourusername](https://github.com/yourusername)
- **Issues**: [提交问题](https://github.com/yourusername/fufan-ai/issues)

---

<div align="center">

**[⬆ 回到顶部](#赋范空间-fufanai---ai-ppt-agent)**

Made with ❤️ by fufan.ai Team

</div>

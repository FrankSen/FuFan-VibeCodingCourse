# Nano Banana Studio - UI 风格设计文档

## 📖 项目概述

Nano Banana Studio 是一个专业的 AI 绘画和聊天界面网页应用，采用现代化的玻璃拟态（Glassmorphism）设计风格，呈现出科技感十足的暗色主题视觉体验。

---

## 🎨 核心设计语言

### 设计理念
- **玻璃拟态美学**：通过 `backdrop-blur` 和半透明背景营造层次感
- **冷色调科技感**：蓝灰色调搭配渐变效果，传达专业与未来感
- **极简主义**：去除冗余元素，强调内容与功能
- **流畅交互**：丰富的过渡动效提升用户体验

---

## 🌈 配色系统

### 主色调（Primary Colors）

#### 1. 背景渐变
```css
/* 全局页面背景 */
background: linear-gradient(to bottom right, #1a1a1a, #1f2937, #324F78);
```
- **#1a1a1a**（深黑色）→ **#1f2937**（暗灰蓝）→ **#324F78**（蓝灰色）
- 创造深邃的空间感，从左上到右下的对角线渐变

#### 2. 强调色渐变
```css
/* 主要 CTA 按钮、选中状态 */
background: linear-gradient(to right, #9ED1FF, #FFFFFF);
```
- **#9ED1FF**（浅蓝色）→ **#FFFFFF**（白色）
- 应用场景：
  - 所有主要操作按钮
  - Tab 选中状态
  - 分页器激活页码
  - 收藏按钮激活状态
  - 品牌标题文字

#### 3. 悬停状态渐变
```css
/* 按钮悬停效果 */
background: linear-gradient(to right, #7EC1FF, #9ED1FF);
```
- **#7EC1FF**（中蓝色）→ **#9ED1FF**（浅蓝色）
- 比主强调色更深，提供视觉反馈

### 辅助色调（Secondary Colors）

#### 玻璃拟态透明度系列
```css
/* 面板背景 */
background: rgba(0, 0, 0, 0.3);  /* black/30 */

/* 卡片、输入框背景 */
background: rgba(255, 255, 255, 0.05);  /* white/5 */

/* 悬停状态 */
background: rgba(255, 255, 255, 0.1);  /* white/10 */

/* 遮罩层 */
background: rgba(0, 0, 0, 0.8);  /* black/80 */

/* 边框 */
border: 1px solid rgba(255, 255, 255, 0.05);  /* white/5 */
border: 1px solid rgba(255, 255, 255, 0.1);  /* white/10 */
```

#### 文本颜色
```css
/* 主文本 */
color: #ffffff;  /* white */

/* 次要文本 */
color: #a3a3a3;  /* neutral-400 */
color: #737373;  /* neutral-500 */

/* 占位符文本 */
color: #525252;  /* neutral-600 */

/* 品牌主色文本（渐变） */
background: linear-gradient(to right, #9ED1FF, #ffffff);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

### 状态色（Status Colors）

#### API 状态指示
```css
/* API Ready - 绿色系统 */
background: rgba(34, 197, 94, 0.1);   /* green-500/10 */
border: rgba(34, 197, 94, 0.2);       /* green-500/20 */
color: #86efac;                        /* green-300 */
icon-color: #4ade80;                   /* green-400 */

/* No API Key - 黄色警告 */
background: rgba(234, 179, 8, 0.1);   /* yellow-500/10 */
border: rgba(234, 179, 8, 0.2);       /* yellow-500/20 */
color: #fde047;                        /* yellow-300 */
icon-color: #facc15;                   /* yellow-400 */

/* 删除按钮 - 红色系统 */
background: rgba(239, 68, 68, 0.2);   /* red-500/20 */
hover-background: rgba(239, 68, 68, 0.3);  /* red-500/30 */
color: #fca5a5;                        /* red-300 */
```

#### 成功/错误提示
```css
/* 成功 */
background: rgba(34, 197, 94, 0.1);   /* green-500/10 */
border: rgba(34, 197, 94, 0.2);       /* green-500/20 */
text: #86efac;                         /* green-300 */

/* 错误 */
background: rgba(239, 68, 68, 0.1);   /* red-500/10 */
border: rgba(239, 68, 68, 0.2);       /* red-500/20 */
text: #fca5a5;                         /* red-300 */

/* 信息提示 */
background: rgba(59, 130, 246, 0.1);  /* blue-500/10 */
border: rgba(59, 130, 246, 0.2);      /* blue-500/20 */
text: #93c5fd;                         /* blue-300 */
```

---

## 📐 布局结构

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                     Top Bar (固定)                       │
│                    高度: 80px (h-20)                     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────┬─────────────────────────────┐
│                         │                             │
│    Gallery Panel        │      Chat Panel             │
│    (左侧作品集面板)      │      (右侧聊天面板)          │
│    宽度: 2/3            │      宽度: 1/3              │
│    高度: calc(100vh-88px)│     高度: calc(100vh-88px) │
│                         │                             │
│                         │                             │
│                         │                             │
└─────────────────────────┴─────────────────────────────┘
```

### 间距规范

#### 全局间距
```css
/* 页面边距 */
px-6  /* 左右内边距 24px */
pb-6  /* 底部内边距 24px */
gap-6 /* 面板间距 24px */

/* 组件内边距 */
p-4   /* 16px - 常规内容区域 */
p-5   /* 20px - 面板头部 */
p-6   /* 24px - 较大模态框 */
p-10  /* 40px - 大型模态框 */
```

#### 组件间距
```css
/* 卡片网格 */
gap-4  /* 16px - Gallery Cards 之间 */

/* 消息列表 */
space-y-3  /* 12px - 聊天消息之间 */

/* 按钮组 */
gap-2  /* 8px - 小按钮组 */
gap-3  /* 12px - 标准按钮组 */
```

---

## 🔲 组件样式

### 1. Top Bar（顶部栏）

#### 结构
```
高度: 80px (h-20)
布局: 固定定位 (sticky top-0)
背景: 渐变背景 + 玻璃拟态
```

#### 样式特征
```css
/* 外层容器 */
height: 80px;
padding: 16px 24px;
background: linear-gradient(to right, #1a1a1a, rgba(50, 79, 120, 0.3));
position: sticky;
top: 0;
z-index: 50;

/* 内层玻璃卡片 */
height: 100%;
padding: 0 24px;
border-radius: 16px;
background: rgba(0, 0, 0, 0.4);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.05);
```

#### 三列布局
```
┌──────────────────────────────────────────────────┐
│  品牌标识        标题 + 副标题        CTA 按钮    │
│  (absolute)      (居中)            (absolute)    │
└──────────────────────────────────────────────────┘
```

- **品牌标识**：绝对定位左侧，渐变文字 `text-sm`
- **主标题**：居中，渐变文字 `text-xl`，品牌名称 "Nano Banana Studio"
- **副标题**：居中，灰色文字 `text-xs`，作者信息
- **CTA 按钮**：绝对定位右侧，强调色渐变背景

---

### 2. Gallery Panel（作品集面板）

#### 容器特征
```css
width: 66.666667%;  /* w-2/3 */
height: calc(100vh - 88px);
background: rgba(0, 0, 0, 0.3);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.05);
border-radius: 24px;
overflow: hidden;
```

#### 头部过滤器（Filter Tabs）
```css
/* 容器 */
padding: 20px;
border-bottom: 1px solid rgba(255, 255, 255, 0.05);

/* 按钮 - 未选中 */
padding: 8px 20px;
border-radius: 8px;
background: rgba(255, 255, 255, 0.05);
color: #a3a3a3;
transition: all 200ms;

/* 按钮 - 选中 */
background: linear-gradient(to right, #9ED1FF, #ffffff);
color: #1a1a1a;

/* 按钮 - 悬停 */
background: rgba(255, 255, 255, 0.1);
color: #ffffff;
```

#### 画廊网格
```css
/* 容器 */
flex: 1;
overflow-y: auto;
padding: 20px;

/* 网格布局 */
display: flex;
flex-wrap: wrap;
gap: 16px;

/* 卡片尺寸 */
width: 256px;  /* w-64 */
height: 256px;  /* h-64 */
```

#### 分页控制器
```css
/* 容器 */
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
padding-top: 16px;
border-top: 1px solid rgba(255, 255, 255, 0.05);

/* 翻页按钮 */
padding: 8px;
border-radius: 8px;
background: rgba(255, 255, 255, 0.05);

/* 页码按钮 - 未选中 */
width: 40px;
height: 40px;
border-radius: 8px;
background: rgba(255, 255, 255, 0.05);

/* 页码按钮 - 选中 */
background: linear-gradient(to right, #9ED1FF, #ffffff);
color: #1a1a1a;
```

---

### 3. Gallery Card（作品卡片）

#### 卡片尺寸与基础样式
```css
width: 256px;
height: 256px;
border-radius: 16px;
border: 1px solid rgba(255, 255, 255, 0.05);
overflow: hidden;
cursor: pointer;
transition: transform 300ms;
position: relative;

/* 悬停放大 */
transform: scale(1.01);
```

#### 图片显示
```css
/* 容器 */
width: 100%;
height: 100%;
display: flex;
align-items: center;
justify-content: center;
background: #171717;  /* neutral-900 */

/* 图片 */
max-width: 100%;
max-height: 100%;
object-fit: contain;  /* 保持宽高比完整显示 */
```

#### 悬停遮罩层
```css
/* 渐变遮罩 */
position: absolute;
inset: 0;
background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4), transparent);
opacity: 0;
transition: opacity 300ms;

/* 悬停时显示 */
opacity: 1;
```

#### 提示词显示
```css
/* 容器 */
position: absolute;
bottom: 0;
left: 0;
right: 0;
padding: 16px;

/* 文本 */
font-size: 14px;
color: rgba(255, 255, 255, 0.9);
line-height: 1.625;  /* leading-relaxed */
/* 限制3行 */
display: -webkit-box;
-webkit-line-clamp: 3;
-webkit-box-orient: vertical;
overflow: hidden;
```

#### 操作按钮组
```css
/* 容器 */
position: absolute;
top: 12px;
right: 12px;
display: flex;
gap: 8px;

/* 按钮基础样式 */
padding: 8px;
border-radius: 8px;
backdrop-filter: blur(24px);
transition: all 200ms;

/* 查看大图按钮 */
background: rgba(255, 255, 255, 0.1);
color: #ffffff;
hover: background: rgba(255, 255, 255, 0.2);

/* 收藏按钮 - 未收藏 */
background: rgba(255, 255, 255, 0.1);
color: #ffffff;
hover: background: rgba(255, 255, 255, 0.2);

/* 收藏按钮 - 已收藏 */
background: linear-gradient(to right, #9ED1FF, #ffffff);
color: #1a1a1a;

/* 删除按钮 */
background: rgba(239, 68, 68, 0.2);
color: #fca5a5;
hover: background: rgba(239, 68, 68, 0.3);
```

---

### 4. Chat Panel（聊天面板）

#### 容器特征
```css
width: 33.333333%;  /* w-1/3 */
height: calc(100vh - 88px);
display: flex;
flex-direction: column;
background: rgba(0, 0, 0, 0.3);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.05);
border-radius: 24px;
overflow: hidden;
```

#### 头部控制区
```css
/* 容器 */
padding: 16px;
border-bottom: 1px solid rgba(255, 255, 255, 0.05);

/* 标题区 */
display: flex;
align-items: center;
justify-content: space-between;
margin-bottom: 16px;

/* 工具按钮 */
padding: 8px;
border-radius: 8px;
background: rgba(255, 255, 255, 0.05);
transition: background 200ms;

/* 模型选择器 */
width: 100%;
padding: 10px 16px;
border-radius: 8px;
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
color: #ffffff;
```

#### API 状态指示器
```css
/* Ready 状态 */
display: flex;
align-items: center;
gap: 6px;
padding: 4px 8px;
border-radius: 8px;
background: rgba(34, 197, 94, 0.1);
border: 1px solid rgba(34, 197, 94, 0.2);

/* 图标 */
width: 14px;
height: 14px;
color: #4ade80;

/* 文本 */
font-size: 12px;
color: #86efac;
```

#### 消息区域
```css
/* 容器 */
flex: 1;
overflow-y: auto;
padding: 16px;
gap: 12px;  /* space-y-3 */

/* 空状态 */
display: flex;
align-items: center;
justify-content: center;
height: 100%;
color: #737373;
text-align: center;

/* 加载动画 */
display: flex;
gap: 8px;

/* 加载点 */
width: 8px;
height: 8px;
border-radius: 9999px;
background: linear-gradient(to right, #9ED1FF, #ffffff);
animation: bounce 1s infinite;
animation-delay: 0ms / 150ms / 300ms;
```

#### 输入区域
```css
/* 容器 */
padding: 16px;

/* 输入框背景 */
background: rgba(0, 0, 0, 0.4);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 16px;
padding: 12px;

/* 已上传图片预览 */
width: 64px;
height: 64px;
border-radius: 8px;
background: #171717;
border: 1px solid rgba(255, 255, 255, 0.1);

/* 文本输入框 */
flex: 1;
padding: 10px 12px;
border-radius: 8px;
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
color: #ffffff;
resize: none;
rows: 2;

/* 发送按钮 */
padding: 10px;
border-radius: 8px;
background: linear-gradient(to right, #9ED1FF, #ffffff);
hover: linear-gradient(to right, #7EC1FF, #9ED1FF);
```

#### API Key 警告横幅
```css
/* 容器 */
margin-bottom: 12px;
padding: 12px;
border-radius: 12px;
background: rgba(234, 179, 8, 0.1);
border: 1px solid rgba(234, 179, 8, 0.2);

/* 图标 */
width: 16px;
height: 16px;
color: #facc15;

/* 文本 */
font-size: 14px;
color: #fde047;

/* 链接按钮 */
font-size: 12px;
color: #fef08a;
text-decoration: underline;
```

---

### 5. Chat Message（聊天消息）

#### 用户消息
```css
/* 外层容器 */
display: flex;
justify-content: flex-end;

/* 内容容器 */
max-width: 80%;
display: flex;
flex-direction: column;
align-items: flex-end;
gap: 8px;

/* 文本气泡 */
padding: 10px 16px;
border-radius: 16px;
backdrop-filter: blur(12px);
background: linear-gradient(to right, #9ED1FF, #ffffff);
color: #1a1a1a;
font-size: 14px;
```

#### 助手消息
```css
/* 外层容器 */
display: flex;
justify-content: flex-start;

/* 内容容器 */
max-width: 80%;
display: flex;
flex-direction: column;
align-items: flex-start;
gap: 8px;

/* 文本气泡 */
padding: 10px 16px;
border-radius: 16px;
backdrop-filter: blur(12px);
background: rgba(255, 255, 255, 0.05);
color: #ffffff;
font-size: 14px;
```

#### 图片显示
```css
/* 用户上传图片 */
max-width: 288px;  /* max-w-xs */
height: auto;
border-radius: 12px;
border: 1px solid rgba(255, 255, 255, 0.1);
cursor: pointer;
transition: border 200ms;

/* 悬停效果 */
border: 1px solid rgba(255, 255, 255, 0.3);

/* AI 生成图片 */
width: 100%;
height: auto;
border-radius: 12px;
border: 1px solid rgba(255, 255, 255, 0.1);
cursor: pointer;
position: relative;

/* 悬停遮罩 */
background: rgba(0, 0, 0, 0);
hover: background: rgba(0, 0, 0, 0.2);

/* 悬停提示文字 */
color: #ffffff;
font-size: 14px;
opacity: 0;
hover-opacity: 1;
text: "点击查看大图"
```

#### Markdown 样式（助手消息）
```css
/* 标题 */
h1, h2, h3 {
  color: #9ED1FF;
  margin-top: 1em;
  margin-bottom: 0.5em;
}
h1 { font-size: 1.5em; }
h2 { font-size: 1.3em; }
h3 { font-size: 1.15em; }

/* 段落 */
p {
  color: #ffffff;
  margin-bottom: 0.75em;
}

/* 列表 */
ul, ol {
  color: #ffffff;
  margin-left: 1.5em;
  margin-bottom: 0.75em;
}

/* 行内代码 */
code {
  background: rgba(158, 209, 255, 0.1);
  border: 1px solid rgba(158, 209, 255, 0.2);
  color: #9ED1FF;
  padding: 0.125em 0.375em;
  border-radius: 6px;
  font-size: 0.9em;
}

/* 代码块 */
pre {
  background: rgba(0, 0, 0, 0.4) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1em;
  margin: 0.75em 0;
  overflow-x: auto;
}

/* 加粗 */
strong {
  color: #9ED1FF;
  font-weight: 600;
}

/* 链接 */
a {
  color: #9ED1FF;
  text-decoration: underline;
}
a:hover {
  color: #ffffff;
}
```

---

### 6. Image Lightbox（图片灯箱）

#### 背景遮罩
```css
position: fixed;
inset: 0;
z-index: 9999;
display: flex;
align-items: center;
justify-content: center;
background: rgba(0, 0, 0, 0.9);
backdrop-filter: blur(4px);
padding: 16px;
cursor: pointer;
```

#### 主容器
```css
position: relative;
max-width: 1280px;  /* max-w-7xl */
max-height: 90vh;
width: 100%;
height: 100%;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
```

#### 控制按钮
```css
/* 关闭按钮 */
position: absolute;
top: 16px;
right: 16px;
padding: 12px;
border-radius: 9999px;
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(24px);
transition: all 200ms;
z-index: 10;

/* 上一张/下一张 */
position: absolute;
top: 50%;
transform: translateY(-50%);
left: 16px / right: 16px;
padding: 12px;
border-radius: 9999px;
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(24px);
```

#### 图片计数器
```css
position: absolute;
top: 16px;
left: 50%;
transform: translateX(-50%);
padding: 8px 16px;
border-radius: 9999px;
background: rgba(0, 0, 0, 0.6);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.1);
font-size: 14px;
color: #ffffff;
```

#### 图片展示
```css
/* 容器 */
position: relative;
display: flex;
align-items: center;
justify-content: center;
width: 100%;
height: 100%;

/* 图片 */
max-width: 100%;
max-height: 100%;
object-fit: contain;
border-radius: 16px;
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

#### 提示词显示
```css
/* 全宽显示，不居中 */
position: absolute;
bottom: 16px;
left: 16px;
right: 16px;
padding: 12px 24px;
border-radius: 12px;
background: rgba(0, 0, 0, 0.6);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.1);

/* 文本 */
font-size: 14px;
color: #ffffff;
text-align: left;
line-height: 1.625;
```

---

### 7. Settings Modal（设置模态框）

#### 背景遮罩
```css
position: fixed;
inset: 0;
z-index: 50;
display: flex;
align-items: center;
justify-content: center;
padding: 16px;

/* 遮罩背景 */
background: rgba(0, 0, 0, 0.8);
backdrop-filter: blur(24px);
```

#### 模态框容器
```css
position: relative;
max-width: 512px;
width: 100%;
padding: 32px;
border-radius: 24px;
background: rgba(0, 0, 0, 0.8);
backdrop-filter: blur(48px);
border: 1px solid rgba(255, 255, 255, 0.1);
```

#### 头部图标
```css
/* 图标容器 */
padding: 12px;
border-radius: 12px;
background: linear-gradient(to right, rgba(158, 209, 255, 0.2), rgba(255, 255, 255, 0.2));

/* 图标 */
width: 24px;
height: 24px;
color: #9ED1FF;
```

#### 引导区域
```css
padding: 16px;
border-radius: 12px;
background: rgba(59, 130, 246, 0.1);
border: 1px solid rgba(59, 130, 246, 0.2);

/* 文本 */
font-size: 14px;
color: #93c5fd;

/* 链接 */
color: #ffffff;
hover: color: #9ED1FF;
```

#### 输入框
```css
width: 100%;
padding: 12px 16px;
border-radius: 12px;
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
color: #ffffff;
transition: all 200ms;

/* 聚焦状态 */
outline: none;
ring: 2px solid rgba(158, 209, 255, 0.5);
border: 1px solid rgba(158, 209, 255, 0.5);
```

#### 操作按钮
```css
/* 取消按钮 */
flex: 1;
padding: 12px 20px;
border-radius: 12px;
background: rgba(255, 255, 255, 0.05);
color: #ffffff;
transition: all 200ms;
hover: background: rgba(255, 255, 255, 0.1);

/* 保存按钮 */
flex: 1;
padding: 12px 20px;
border-radius: 12px;
background: linear-gradient(to right, #9ED1FF, #ffffff);
color: #1a1a1a;
transition: all 200ms;
hover: linear-gradient(to right, #7EC1FF, #9ED1FF);
```

---

### 8. QR Code Modal（二维码模态框）

#### 容器特征
```css
/* 同 Settings Modal 基础样式 */
max-width: 448px;
padding: 40px;

/* 内容垂直居中 */
display: flex;
flex-direction: column;
align-items: center;
gap: 24px;
```

#### 标题
```css
font-size: 24px;
text-align: center;
background: linear-gradient(to right, #9ED1FF, #ffffff);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

#### 二维码容器
```css
width: 256px;
height: 256px;
background: #ffffff;
border-radius: 16px;
padding: 16px;
display: flex;
align-items: center;
justify-content: center;

/* 图片 */
width: 100%;
height: 100%;
object-fit: contain;
```

#### 描述文字
```css
color: #a3a3a3;
text-align: center;
font-size: 14px;
```

---

## 🎭 玻璃拟态效果实现

### 标准玻璃拟态
```css
/* 面板级别 */
background: rgba(0, 0, 0, 0.3);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.05);
border-radius: 24px;

/* 卡片级别 */
background: rgba(0, 0, 0, 0.4);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.05);
border-radius: 16px;

/* 按钮/小组件 */
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 8px;
```

### 高强度玻璃拟态
```css
/* 模态框 */
background: rgba(0, 0, 0, 0.8);
backdrop-filter: blur(48px);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 24px;

/* 灯箱控制按钮 */
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(24px);
border-radius: 9999px;
```

### 模糊度标准
```
blur(12px)  - 小组件、按钮
blur(24px)  - 标准面板、卡片
blur(48px)  - 模态框、重要强调
```

---

## 🔄 动画与过渡

### 标准过渡时间
```css
/* 快速交互 */
transition: all 200ms;
transition-duration: 200ms;

/* 标准过渡 */
transition: all 300ms;
transition-duration: 300ms;

/* 缓慢展开 */
transition: all 500ms;
```

### 常用动画效果

#### 1. 悬停放大
```css
/* 卡片悬停 */
transition: transform 300ms;
hover: transform: scale(1.01);
```

#### 2. 透明度渐变
```css
/* 遮罩层显示 */
opacity: 0;
transition: opacity 300ms;
hover-opacity: 1;
```

#### 3. 背景颜色过渡
```css
/* 按钮交互 */
background: rgba(255, 255, 255, 0.05);
transition: background 200ms;
hover: background: rgba(255, 255, 255, 0.1);
```

#### 4. 弹跳加载动画
```css
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

animation: bounce 1s infinite;
animation-delay: 0ms / 150ms / 300ms;  /* 三个点交错 */
```

#### 5. 脉动提示
```css
/* API Key 警告点 */
width: 10px;
height: 10px;
background: #eab308;  /* yellow-500 */
border-radius: 9999px;
animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
```

---

## 📏 圆角规范

```css
/* 小组件 */
border-radius: 8px;   /* rounded-lg */

/* 按钮 */
border-radius: 8px;   /* rounded-lg */
border-radius: 12px;  /* rounded-xl */

/* 卡片 */
border-radius: 16px;  /* rounded-2xl */

/* 面板 */
border-radius: 24px;  /* rounded-3xl */

/* 圆形按钮 */
border-radius: 9999px;  /* rounded-full */
```

---

## 🔤 字体排版

### 字体大小

```css
/* 特大标题 */
font-size: 24px;  /* text-2xl */

/* 大标题 */
font-size: 20px;  /* text-xl */

/* 中标题 */
font-size: 18px;  /* text-lg */

/* 标准文本 */
font-size: 16px;  /* text-base */

/* 小文本 */
font-size: 14px;  /* text-sm */

/* 超小文本 */
font-size: 12px;  /* text-xs */
```

### 字重

```css
/* 标准 */
font-weight: 400;  /* font-normal */

/* 中等（标题、按钮） */
font-weight: 500;  /* font-medium */

/* 加粗 */
font-weight: 600;  /* font-semibold */
```

### 行高

```css
/* 标准 */
line-height: 1.5;

/* 宽松 */
line-height: 1.625;  /* leading-relaxed */

/* 紧凑 */
line-height: 1.25;  /* leading-tight */
```

### 字间距

```css
/* 标题 */
letter-spacing: -0.025em;  /* tracking-tight */

/* 品牌文字 */
letter-spacing: 0.025em;   /* tracking-wide */
```

---

## 🎯 交互状态

### 按钮状态

#### 主要按钮（强调色渐变）
```css
/* 默认 */
background: linear-gradient(to right, #9ED1FF, #ffffff);
color: #1a1a1a;

/* 悬停 */
background: linear-gradient(to right, #7EC1FF, #9ED1FF);

/* 激活 */
transform: scale(0.98);

/* 禁用 */
opacity: 0.5;
cursor: not-allowed;
```

#### 次要按钮（透明背景）
```css
/* 默认 */
background: rgba(255, 255, 255, 0.05);
color: #ffffff;

/* 悬停 */
background: rgba(255, 255, 255, 0.1);
color: #ffffff;

/* 激活 */
background: rgba(255, 255, 255, 0.15);
```

#### 危险按钮（删除）
```css
/* 默认 */
background: rgba(239, 68, 68, 0.2);
color: #fca5a5;

/* 悬停 */
background: rgba(239, 68, 68, 0.3);
color: #ffffff;
```

### 输入框状态

```css
/* 默认 */
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
color: #ffffff;

/* 聚焦 */
outline: none;
ring: 1px solid rgba(255, 255, 255, 0.2);
border: 1px solid rgba(255, 255, 255, 0.2);

/* 设置模态框输入聚焦 */
ring: 2px solid rgba(158, 209, 255, 0.5);
border: 1px solid rgba(158, 209, 255, 0.5);

/* 禁用 */
opacity: 0.5;
cursor: not-allowed;
```

### 选择器状态

```css
/* 下拉选择框 */
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
color: #ffffff;

/* 悬停 */
background: rgba(255, 255, 255, 0.1);

/* 聚焦 */
outline: none;
ring: 1px solid rgba(255, 255, 255, 0.2);

/* Option 元素 */
background: #000000;
color: #ffffff;
```

### 卡片交互状态

```css
/* 默认 */
border: 1px solid rgba(255, 255, 255, 0.05);
transform: scale(1);

/* 悬停 */
transform: scale(1.01);
cursor: pointer;

/* 图片悬停边框 */
border: 1px solid rgba(255, 255, 255, 0.3);
/* 或 */
border: 1px solid rgba(158, 209, 255, 0.5);
```

---

## 🌊 滚动条样式

### 自定义滚动条（Webkit）
```css
/* 滚动条轨道 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(158, 209, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(158, 209, 255, 0.5);
}
```

---

## 🔔 Toast 通知

### 配置
```tsx
<Toaster 
  theme="dark" 
  position="top-right" 
/>
```

### 样式特征
- **主题**：暗色模式
- **位置**：右上角
- **背景**：半透明黑色 + 模糊效果
- **边框**：细微白色边框
- **字体**：白色文字

---

## 📱 响应式设计

### 当前布局特点
- **桌面优先**：专为桌面端设计，宽屏体验最佳
- **固定比例**：左侧 2/3，右侧 1/3
- **全屏高度**：充分利用视口高度

### 建议断点（未实现）
```css
/* 大屏幕 */
@media (min-width: 1536px) { /* 2xl */ }

/* 桌面 */
@media (min-width: 1280px) { /* xl */ }

/* 笔记本 */
@media (min-width: 1024px) { /* lg */ }

/* 平板 */
@media (min-width: 768px) { /* md */ }

/* 手机 */
@media (min-width: 640px) { /* sm */ }
```

---

## 🎨 设计原则总结

### 1. 色彩协调性
- **冷色调统一**：蓝灰色系贯穿始终
- **强调色一致**：所有 CTA 使用相同渐变
- **状态色明确**：绿色（成功）、黄色（警告）、红色（错误）

### 2. 层次与深度
- **玻璃拟态分层**：不同模糊度区分层级
- **透明度渐变**：5% → 10% → 30% → 80%
- **阴影系统**：使用边框而非传统阴影

### 3. 用户体验
- **流畅动效**：200ms-300ms 标准过渡
- **清晰反馈**：悬停、激活、禁用状态明确
- **视觉引导**：渐变色自然引导视线

### 4. 一致性
- **圆角统一**：8px、12px、16px、24px 递进
- **间距规律**：8px、12px、16px、20px、24px
- **字体系统**：统一字重和行高

### 5. 可访问性
- **对比度**：白色文字在暗背景上清晰可读
- **状态指示**：颜色 + 图标双重指示
- **键盘导航**：支持 Escape、方向键等

---

## 🛠️ 技术实现

### CSS 框架
- **Tailwind CSS v4.0**
- 自定义 CSS 变量系统
- 暗色主题默认配置

### 关键技术
```css
/* 玻璃拟态核心 */
backdrop-filter: blur(24px);
background: rgba(0, 0, 0, 0.3);
border: 1px solid rgba(255, 255, 255, 0.05);

/* 渐变文字 */
background: linear-gradient(to right, #9ED1FF, #ffffff);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;

/* 渐变背景 */
background: linear-gradient(to bottom right, #1a1a1a, #1f2937, #324F78);
background: linear-gradient(to right, #9ED1FF, #ffffff);
```

### 图标库
- **Lucide React**
- 一致的 16px / 20px / 24px 尺寸
- 统一的圆角风格

---

## 📸 视觉参考

### 整体风格关键词
- 🌌 深空科技
- 💎 玻璃拟态
- ❄️ 冷色调系统
- ✨ 渐变美学
- 🎯 极简主义
- 🌊 流畅动效

### 设计灵感来源
- 现代 AI 工具界面（如 Midjourney、ChatGPT）
- 玻璃拟态设计趋势
- 科技产品发布会视觉风格
- 深色模式最佳实践

---

## 🔮 风格扩展建议

### 可选变体

#### 1. 暖色调版本
```css
/* 替换主渐变 */
background: linear-gradient(to right, #FFB366, #FFE5B4);
/* 替换背景 */
background: linear-gradient(to bottom right, #1a1a1a, #2d1f1f, #5a3a2a);
```

#### 2. 高对比度版本
```css
/* 增强边框 */
border: 1px solid rgba(255, 255, 255, 0.2);
/* 更强模糊 */
backdrop-filter: blur(48px);
```

#### 3. 极简版本
```css
/* 去除渐变，使用纯色 */
background: #9ED1FF;
color: #000000;
```

---

## ✅ 设计检查清单

### 颜色
- [ ] 所有强调元素使用统一渐变色
- [ ] 状态色遵循绿/黄/红系统
- [ ] 文本对比度符合 WCAG AA 标准

### 间距
- [ ] 组件间距使用标准值（8/12/16/20/24px）
- [ ] 内边距与外边距协调
- [ ] 留白充足，不拥挤

### 动效
- [ ] 所有交互有过渡动画
- [ ] 过渡时间统一（200ms/300ms）
- [ ] 悬停状态明确

### 一致性
- [ ] 圆角大小遵循规范
- [ ] 按钮样式统一
- [ ] 卡片布局一致

### 可访问性
- [ ] 键盘可操作
- [ ] 状态有视觉反馈
- [ ] 错误提示清晰

---

**文档版本**：v1.0  
**最后更新**：2025-11-26  
**项目名称**：Nano Banana Studio  
**设计师**：By 九天Hector  
**出品方**：赋范空间

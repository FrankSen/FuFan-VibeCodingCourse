# 提示词模板 API 接口文档

## 新增的提示词模板管理接口

---

### 1. 获取提示词模板

**接口**: `GET /ppt/template`

**功能**: 获取用户自定义的全局提示词模板

**响应格式**:
```json
{
  "template": "请制作一个现代的科技/互联网公司演示幻灯片。风格：现代SaaS美学..."
}
```

或（如果没有自定义模板）:
```json
{
  "template": ""
}
```

**实现要点**:
- 从数据库或配置文件读取用户保存的提示词模板
- 如果没有自定义模板，返回空字符串
- 前端会自动使用默认模板

---

### 2. 保存提示词模板

**接口**: `POST /ppt/template`

**功能**: 保存用户自定义的全局提示词模板，该模板将应用于所有后续的幻灯片生成

**请求体**:
```json
{
  "template": "请制作一个现代的科技/互联网公司演示幻灯片。风格：现代SaaS美学，简洁的UI，流畅的矢量艺术，柔和的阴影（玻璃质感）。背景：干净的浅色背景（白色或非常浅的灰色），带有微妙的科技元素（淡淡的网格、柔和的蓝色/紫色网格渐变）。内容：极简的图表，圆角卡片，无衬线字体风格。避免：老式学术风格，沉重的深色边框，逼真的照片，杂乱的文字。"
}
```

**响应格式**:
```json
{
  "status": "success",
  "message": "提示词模板已保存"
}
```

**实现要点**:
- 接收 `template` 参数（字符串）
- 保存到数据库或配置文件中
- 这个模板应该在后续的 `/ppt/plan` 和 `/ppt/generate_slide` 接口中被使用
- 建议将模板附加到生成请求的 prompt 中，影响 AI 的生成风格

---

## 模板应用场景

提示词模板应该在以下场景中被自动应用：

### 1. PPT 规划阶段 (`/ppt/plan`)

在调用 `/ppt/plan` 接口时，将用户保存的模板附加到系统提示词中：

```python
# 伪代码示例
def plan_ppt(topic: str, user_template: str):
    system_prompt = f"""
    你是一个专业的PPT设计师。
    
    用户的全局风格偏好：
    {user_template}
    
    现在用户想要制作关于「{topic}」的PPT，请规划...
    """
    # 调用 AI 模型...
```

### 2. 幻灯片生成阶段 (`/ppt/generate_slide`)

在调用 `/ppt/generate_slide` 接口时，同样应用模板：

```python
# 伪代码示例
def generate_slide(prompt: str, user_template: str):
    full_prompt = f"""
    {user_template}
    
    具体要求：{prompt}
    """
    # 调用图像生成 API...
```

---

## 默认模板内容

如果用户没有自定义模板，前端会使用以下默认内容：

```
请制作一个现代的科技/互联网公司演示幻灯片。风格：现代SaaS美学，简洁的UI，流畅的矢量艺术，柔和的阴影（玻璃质感）。背景：干净的浅色背景（白色或非常浅的灰色），带有微妙的科技元素（淡淡的网格、柔和的蓝色/紫色网格渐变）。内容：极简的图表，圆角卡片，无衬线字体风格。避免：老式学术风格，沉重的深色边框，逼真的照片，杂乱的文字。
```

---

## 存储建议

### 方案1: 数据库存储（推荐）
```sql
CREATE TABLE user_settings (
    id INTEGER PRIMARY KEY,
    user_id VARCHAR(255),  -- 如果有多用户
    prompt_template TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 方案2: 配置文件存储
```python
# config/user_settings.json
{
    "prompt_template": "用户自定义的模板内容..."
}
```

### 方案3: 环境变量（简单场景）
```env
PROMPT_TEMPLATE=请制作一个现代的科技/互联网公司演示幻灯片...
```

---

## 测试方法

### 1. 获取模板
```bash
curl http://localhost:8002/ppt/template
```

预期响应：
```json
{
  "template": ""
}
```
或
```json
{
  "template": "请制作一个现代的科技..."
}
```

### 2. 保存模板
```bash
curl -X POST http://localhost:8002/ppt/template \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-or-v1-xxx" \
  -d '{
    "template": "请制作一个现代的科技/互联网公司演示幻灯片。风格：现代SaaS美学，简洁的UI，流畅的矢量艺术，柔和的阴影（玻璃质感）。背景：干净的浅色背景（白色或非常浅的灰色），带有微妙的科技元素（淡淡的网格、柔和的蓝色/紫色网格渐变）。内容：极简的图表，圆角卡片，无衬线字体风格。避免：老式学术风格，沉重的深色边框，逼真的照片，杂乱的文字。"
  }'
```

预期响应：
```json
{
  "status": "success",
  "message": "提示词模板已保存"
}
```

---

## 前端功能说明

前端已实现：

1. **提示词模板按钮**：位于主页输入框右侧
2. **模板编辑弹窗**：
   - 显示当前模板内容（从后端加载）
   - 提供文本编辑区域
   - 三个操作按钮：恢复默认、取消、保存
3. **保存流程**：点击"保存"按钮时调用 `POST /ppt/template`
4. **恢复默认**：清空并恢复硬编码的默认模板文本

---

## 用户体验流程

```
用户点击「提示词模板」
    ↓
弹出编辑弹窗
    ↓
从后端加载当前模板 (GET /ppt/template)
    ↓
用户编辑模板内容
    ↓
点击「保存」按钮
    ↓
调用 POST /ppt/template 保存
    ↓
显示成功提示
    ↓
1.5秒后自动关闭弹窗
    ↓
后续所有PPT生成都使用新模板
```


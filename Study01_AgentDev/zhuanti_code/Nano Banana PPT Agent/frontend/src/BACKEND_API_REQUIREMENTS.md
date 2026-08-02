# 后端 API 接口需求文档

## 新增的 API Key 管理接口

为了支持 API Key 的后端存储和测试功能，需要在后端（`http://localhost:8002`）实现以下三个接口：

---

### 1. 获取 API Key 状态

**接口**: `GET /api/key`

**功能**: 检查后端 `.env` 文件中是否已配置 `OPENROUTER_API_KEY`

**响应格式**:
```json
{
  "has_key": true,
  "key_preview": "sk-or-v1-****xyz"  // 可选，只显示前几位和后几位
}
```

或

```json
{
  "has_key": false
}
```

**实现要点**:
- 读取 `.env` 文件中的 `OPENROUTER_API_KEY`
- 如果存在且非空，返回 `has_key: true`
- `key_preview` 可以这样生成: `key[:12] + "****" + key[-3:]`（示例）
- 不应该返回完整的 API Key

---

### 2. 保存 API Key 到后端

**接口**: `POST /api/key/save`

**功能**: 将用户提交的 API Key 保存到后端 `.env` 文件

**请求体**:
```json
{
  "api_key": "sk-or-v1-xxxxxxxxxxxxxxxx"
}
```

**响应格式**:
```json
{
  "status": "success",
  "message": "API Key 已成功保存到 .env 文件"
}
```

**实现要点**:
- 接收 `api_key` 参数
- 验证格式：必须以 `sk-or-` 开头，长度 > 20
- 更新后端 `.env` 文件中的 `OPENROUTER_API_KEY=xxx`
- 如果 `.env` 不存在，则创建文件
- 如果 `OPENROUTER_API_KEY` 已存在，则覆盖；否则追加
- **注意**: 需要处理文件写入权限问题

**参考实现** (Python):
```python
import os
from pathlib import Path

def save_api_key_to_env(api_key: str):
    env_path = Path(__file__).parent.parent / '.env'
    
    # 读取现有内容
    if env_path.exists():
        with open(env_path, 'r') as f:
            lines = f.readlines()
    else:
        lines = []
    
    # 更新或添加 OPENROUTER_API_KEY
    found = False
    for i, line in enumerate(lines):
        if line.startswith('OPENROUTER_API_KEY='):
            lines[i] = f'OPENROUTER_API_KEY={api_key}\n'
            found = True
            break
    
    if not found:
        lines.append(f'OPENROUTER_API_KEY={api_key}\n')
    
    # 写回文件
    with open(env_path, 'w') as f:
        f.writelines(lines)
    
    # 重新加载环境变量（如果需要）
    os.environ['OPENROUTER_API_KEY'] = api_key
```

---

### 3. 测试 API Key 连接

**接口**: `POST /api/key/test`

**功能**: 测试提供的 API Key 是否可以正常连接到 OpenRouter API

**请求体**:
```json
{
  "api_key": "sk-or-v1-xxxxxxxxxxxxxxxx"
}
```

**响应格式** (成功):
```json
{
  "status": "success",
  "message": "✅ API Key 有效，已成功连接到 OpenRouter",
  "model_info": {
    "available_models": 150,
    "credits_remaining": "$10.50"
  }
}
```

**响应格式** (失败):
```json
{
  "status": "error",
  "message": "❌ API Key 无效或已过期"
}
```

**实现要点**:
- 使用提供的 `api_key` 向 OpenRouter API 发送一个简单的测试请求
- 推荐测试接口: `GET https://openrouter.ai/api/v1/models`
- 如果返回 200，说明 Key 有效
- 如果返回 401/403，说明 Key 无效
- 可以额外返回账户信息（可选）

**参考实现** (Python):
```python
import httpx

async def test_openrouter_key(api_key: str) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://openrouter.ai/api/v1/models',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'HTTP-Referer': 'https://fufan.ai',
                    'X-Title': 'Fufan AI PPT Agent'
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'status': 'success',
                    'message': '✅ API Key 有效，已成功连接到 OpenRouter',
                    'model_info': {
                        'available_models': len(data.get('data', []))
                    }
                }
            else:
                return {
                    'status': 'error',
                    'message': f'❌ API Key 无效 (HTTP {response.status_code})'
                }
    except Exception as e:
        return {
            'status': 'error',
            'message': f'❌ 连接失败: {str(e)}'
        }
```

---

## 前端使用说明

前端已经实现了以下逻辑：

1. **打开设置弹窗时**：
   - 首先调用 `GET /api/key` 检查后端是否已有 API Key
   - 如果有，不显示完整 Key（安全考虑）
   - 如果没有，尝试从 `localStorage` 读取

2. **点击"测试连接"**：
   - 调用 `POST /api/key/test` 测试当前输入的 Key
   - 显示测试结果（成功/失败）

3. **点击"保存到后端"**：
   - 调用 `POST /api/key/save` 保存到后端 `.env`
   - 同时保存到浏览器 `localStorage`（作为备用）

4. **主页启动时**：
   - 自动调用 `GET /api/key` 检查后端配置
   - 更新右上角的 API Key 状态指示灯（绿色/红色）

---

## 安全建议

1. **不要在响应中返回完整的 API Key**
2. **限制 `/api/key/save` 的调用频率**（防止滥用）
3. **考虑添加简单的身份验证**（如果是多用户环境）
4. **确保 `.env` 文件不会被 git 提交**（添加到 `.gitignore`）

---

## 测试方法

使用 `curl` 测试后端接口：

```bash
# 1. 检查 API Key 状态
curl http://localhost:8002/api/key

# 2. 保存 API Key
curl -X POST http://localhost:8002/api/key/save \
  -H "Content-Type: application/json" \
  -d '{"api_key":"sk-or-v1-xxxxxxxxxxxx"}'

# 3. 测试 API Key
curl -X POST http://localhost:8002/api/key/test \
  -H "Content-Type: application/json" \
  -d '{"api_key":"sk-or-v1-xxxxxxxxxxxx"}'
```

---

## 完成后的用户体验

✅ 用户首次配置 API Key 后，会自动保存到后端  
✅ 下次打开应用时，自动从后端读取（无需重新输入）  
✅ 可以随时测试 API Key 是否有效  
✅ 即使清除浏览器缓存，API Key 依然保存在后端  


# main.py
import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Optional

# 导入我们的本地模块
import models
import data_manager
import core_agent

# 1. 初始化 FastAPI 应用
app = FastAPI(title="AI Drawing Agent Backend")

# 2. 配置 CORS (允许跨域)
# 这对于前后端分离项目至关重要，允许前端 (通常在 3000/8080 端口) 访问后端 API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议指定具体前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. 挂载静态文件目录
# 让前端可以通过 http://localhost:8002/images/xxx.png 访问生成的图片
# 确保存储目录存在
data_manager.ensure_directories()
app.mount("/images", StaticFiles(directory="storage/images"), name="images")

# --- API 接口定义 ---

from pydantic import BaseModel

class ApiKeySetting(BaseModel):
    api_key: str

@app.post("/api/settings/apikey")
def set_api_key(setting: ApiKeySetting):
    """设置用户的 OpenRouter API Key"""
    data_manager.save_api_key(setting.api_key)
    return {"status": "success", "message": "API Key 已保存"}

@app.get("/api/settings/apikey")
def check_has_api_key():
    """检查当前是否已配置 Key (出于安全，不返回明文 Key，只返回是否已设置)"""
    key = data_manager.get_api_key()
    return {"has_key": bool(key)}

@app.post("/api/sessions", response_model=models.Session)
def create_new_session():
    """创建一个新的空白会话"""
    return data_manager.create_session()

@app.get("/api/sessions", response_model=List[models.SessionSummary])
def get_session_list(filter: Optional[str] = Query(None, description="输入 'favorite' 只查看收藏")):
    """
    获取作品集/会话列表。
    支持 filter=favorite 参数。
    """
    only_favorite = (filter == "favorite")
    return data_manager.list_sessions(only_favorite=only_favorite)

@app.get("/api/sessions/{session_id}", response_model=models.Session)
def get_session_detail(session_id: str):
    """获取指定会话的完整历史记录"""
    session = data_manager.load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str):
    """删除会话及其关联图片"""
    data_manager.delete_session(session_id)
    return {"status": "success", "message": f"Session {session_id} deleted"}

@app.post("/api/sessions/{session_id}/favorite")
def toggle_session_favorite(session_id: str):
    """切换会话的收藏状态"""
    new_status = data_manager.toggle_favorite(session_id)
    return {"session_id": session_id, "is_favorite": new_status}

@app.post("/api/chat", response_model=models.ChatResponse)
def chat_endpoint(request: models.ChatRequest):
    """
    核心对话/绘图接口。
    前端发送文本、模型选择、以及可选的参考图，后端返回文本和生成的图片URL。
    """
    # 简单的参数校验
    if not request.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")
    
    # 调用核心 Agent 逻辑
    try:
        response = core_agent.process_chat(request)
        return response
    except Exception as e:
        # 捕获未预料的错误，避免服务崩溃
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 4. 启动入口
if __name__ == "__main__":
    print("正在启动 AI Drawing Agent 后端...")
    print(f"API 文档地址: http://localhost:8002/docs")
    # host="0.0.0.0" 允许局域网访问，port=8002 符合要求
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
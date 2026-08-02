# models.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
import time
import uuid

# --- 基础数据结构 (对应 JSON 存储) ---

class GeneratedImageInfo(BaseModel):
    """
    记录单张生成的图片信息
    """
    file_path: str = Field(..., description="本地存储的相对路径，例如 'storage/images/xxx.png'")
    file_url: str = Field(..., description="前端访问的静态URL，例如 '/images/xxx.png'")
    prompt: str = Field(..., description="生成该图片时对应的完整提示词")

class Message(BaseModel):
    """
    单条对话消息
    """
    role: Literal["system", "user", "assistant"]
    # content 结构遵循 OpenAI 多模态格式
    content: List[Dict[str, Any]] = Field(default_factory=list) 
    
    # 额外字段：用于记录该条消息中涉及的图片
    # 如果是 user，这里存用户上传图片的本地路径
    # 如果是 assistant，这里存模型生成的图片的元数据
    generated_images: List[GeneratedImageInfo] = Field(default_factory=list)
    
    # 记录该条消息是由哪个模型生成的 (仅针对 assistant)
    model_used: Optional[str] = None
    timestamp: float = Field(default_factory=time.time)

class Session(BaseModel):
    """
    完整会话记录 (对应 session_id.json)
    """
    session_id: str
    created_at: float = Field(default_factory=time.time)
    last_updated: float = Field(default_factory=time.time)
    is_favorite: bool = False
    messages: List[Message] = Field(default_factory=list)

# --- API 请求/响应模型 (前端交互用) ---

class ChatRequest(BaseModel):
    session_id: str
    message: str  # 用户输入的文本
    model: str    # 用户选择的模型 ID
    # 用户上传的图片 Base64 列表 (可选)
    user_images_base64: List[str] = Field(default_factory=list)

class ChatResponse(BaseModel):
    assistant_message: str  # 助手的文本回复
    image_urls: List[str] = Field(default_factory=list) # 本轮生成的图片 URL 列表

class SessionSummary(BaseModel):
    """
    用于作品集/橱窗列表展示的简要信息
    """
    session_id: str
    last_updated: float
    is_favorite: bool
    # 橱窗展示用的封面图 (取最后一张生成的图)
    cover_image_url: Optional[str] = None
    # 封面图对应的提示词
    cover_prompt: Optional[str] = None
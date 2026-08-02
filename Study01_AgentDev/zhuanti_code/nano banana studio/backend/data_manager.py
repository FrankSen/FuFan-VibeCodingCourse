# data_manager.py
import os
import json
import uuid
import base64
import time
from typing import List, Optional
from pathlib import Path
from models import Session, Message, SessionSummary, GeneratedImageInfo

# 定义存储路径
BASE_DIR = Path(__file__).parent
STORAGE_DIR = BASE_DIR / "storage"
SESSIONS_DIR = STORAGE_DIR / "sessions"
IMAGES_DIR = STORAGE_DIR / "images"

def ensure_directories():
    """确保存储目录存在"""
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

def save_base64_image(base64_str: str) -> str:
    """
    将 Base64 字符串解码并保存为本地 PNG 文件。
    返回: 文件名 (例如 'img_uuid.png')
    """
    # 有些 base64 串可能带有 header (data:image/png;base64,...)，需要去除
    if "," in base64_str:
        header, encoded = base64_str.split(",", 1)
    else:
        encoded = base64_str

    image_data = base64.b64decode(encoded)
    
    # 生成唯一文件名
    filename = f"img_{uuid.uuid4().hex}.png"
    file_path = IMAGES_DIR / filename
    
    with open(file_path, "wb") as f:
        f.write(image_data)
        
    return filename

def create_session() -> Session:
    """创建一个新的空白会话"""
    ensure_directories()
    new_session = Session(session_id=str(uuid.uuid4()))
    save_session(new_session)
    return new_session

def load_session(session_id: str) -> Optional[Session]:
    """读取指定 ID 的会话"""
    ensure_directories()
    file_path = SESSIONS_DIR / f"{session_id}.json"
    if not file_path.exists():
        return None
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return Session(**data)
    except Exception as e:
        print(f"Error loading session {session_id}: {e}")
        return None

def save_session(session: Session):
    """保存会话到 JSON 文件"""
    ensure_directories()
    session.last_updated = time.time()
    file_path = SESSIONS_DIR / f"{session.session_id}.json"
    
    with open(file_path, "w", encoding="utf-8") as f:
        # model_dump 是 Pydantic v2 的方法 (如果用 v1 请用 .dict())
        # indent=2 方便人工调试查看
        json.dump(session.model_dump(), f, ensure_ascii=False, indent=2)

def delete_session(session_id: str):
    """删除会话 JSON 以及该会话关联的所有图片文件"""
    session = load_session(session_id)
    if not session:
        return

    # 1. 删除该会话产生的所有图片
    for msg in session.messages:
        for img_info in msg.generated_images:
            # img_info.file_path 是相对路径 'storage/images/xxx.png'
            # 我们需要完整的系统路径来删除
            # 这里需要注意 path 拼接逻辑，简单起见我们只取文件名
            filename = Path(img_info.file_path).name
            full_path = IMAGES_DIR / filename
            if full_path.exists():
                try:
                    os.remove(full_path)
                except OSError:
                    pass # 忽略删除错误
    
    # 2. 删除 JSON 文件
    json_path = SESSIONS_DIR / f"{session_id}.json"
    if json_path.exists():
        os.remove(json_path)

def list_sessions(only_favorite: bool = False) -> List[SessionSummary]:
    """
    获取作品集列表（橱窗展示数据）。
    逻辑：遍历 JSON -> 提取最后一张生成的图作为封面。
    """
    ensure_directories()
    summaries = []
    
    # 遍历所有 json 文件
    for file_path in SESSIONS_DIR.glob("*.json"):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                sess = Session(**data)
                
            if only_favorite and not sess.is_favorite:
                continue
                
            # 寻找封面图：倒序遍历消息，找到第一个包含 generated_images 的消息
            cover_url = None
            cover_prompt = None
            
            for msg in reversed(sess.messages):
                if msg.role == "assistant" and msg.generated_images:
                    # 取该消息中的最后一张图
                    last_img = msg.generated_images[-1]
                    cover_url = last_img.file_url
                    cover_prompt = last_img.prompt
                    break # 找到最近的一张图后停止
            
            # 如果整个会话没有图，依然展示在列表中，但没有封面
            summary = SessionSummary(
                session_id=sess.session_id,
                last_updated=sess.last_updated,
                is_favorite=sess.is_favorite,
                cover_image_url=cover_url,
                cover_prompt=cover_prompt
            )
            summaries.append(summary)
            
        except Exception as e:
            print(f"Error parsing session file {file_path}: {e}")
            continue
            
    # 按更新时间倒序排列 (最近的在前面)
    summaries.sort(key=lambda x: x.last_updated, reverse=True)
    return summaries

def toggle_favorite(session_id: str) -> bool:
    """切换收藏状态，返回新的状态"""
    session = load_session(session_id)
    if session:
        session.is_favorite = not session.is_favorite
        save_session(session)
        return session.is_favorite
    return False

SETTINGS_FILE = STORAGE_DIR / "settings.json"

def save_api_key(api_key: str):
    """保存用户设置的 API Key 到 settings.json"""
    ensure_directories()
    settings = {}
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                settings = json.load(f)
        except:
            pass
    
    settings["or_api_key"] = api_key
    
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2)

def get_api_key() -> str:
    """
    获取 API Key。
    优先级：settings.json > 环境变量 (.env)
    """
    # 1. 尝试从 settings.json 读取
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                settings = json.load(f)
                key = settings.get("or_api_key")
                if key and key.strip():
                    return key.strip()
        except:
            pass
            
    # 2. 回退到环境变量
    env_key = os.getenv("OR_API_KEY")
    return env_key if env_key else ""
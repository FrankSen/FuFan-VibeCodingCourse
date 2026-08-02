import os
import base64
import uvicorn
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI  # <--- 新增：用于测试 Key 有效性

# 导入自定义模块
from file_handler import FileHandler
from llm_planner import LLMPlanner
from image_gen import ImageGenerator
from session_manager import SessionManager
from utils import save_image_locally

# 加载环境变量
load_dotenv()

app = FastAPI(title="AI PPT Agent Backend", version="1.1.0")

# 1. 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. 强制 CORS + 禁用缓存 Middleware (解决图片跨域问题)
@app.middleware("http")
async def add_cors_headers_to_images(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/images/"):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# 3. 挂载静态文件服务
os.makedirs("storage/images", exist_ok=True)
app.mount("/images", StaticFiles(directory="storage/images"), name="images")

# 初始化核心组件
planner = LLMPlanner()
image_gen = ImageGenerator()

# --- 数据模型 ---

class CreateSessionRequest(BaseModel):
    topic: str = "Untitled PPT"

class RenameSessionRequest(BaseModel):
    new_title: str

class PPTPlanRequest(BaseModel):
    session_id: str
    topic: str
    page_count: int = 5
    context_text: Optional[str] = ""

class GenerateSlideRequest(BaseModel):
    session_id: str
    slide_index: int
    prompt: str
    is_modification: bool = False
    is_insertion: bool = False
    base_image_url: Optional[str] = None
    style_template: Optional[str] = None # 自定义风格

class SetVersionRequest(BaseModel):
    version_id: str

# [新增] API Key 管理模型
class ApiKeyRequest(BaseModel):
    api_key: str

# --- 辅助函数 ---

def encode_local_image(path_str: str) -> str:
    """
    将路径转换为 Base64 Data URL。
    自动处理完整 URL (http://...) 或 相对路径 (/images/...)。
    """
    try:
        if "/images/" in path_str:
            clean_path = path_str.split("/images/")[-1]
        elif "images/" in path_str:
            clean_path = path_str.split("images/")[-1]
        else:
            clean_path = path_str

        clean_path = clean_path.lstrip("/").lstrip("\\")
        file_path = os.path.join("storage", "images", clean_path)
        file_path = os.path.normpath(file_path)
        
        print(f"Trying to read local image at: {file_path}")
        
        if not os.path.exists(file_path):
            print(f"❌ Error: File not found at {file_path}")
            return None
            
        with open(file_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            mime_type = "image/png" 
            return f"data:{mime_type};base64,{encoded_string}"
    except Exception as e:
        print(f"Base64 encoding error: {e}")
        return None

def update_env_file(key: str, value: str):
    """
    更新或追加 .env 文件中的键值对，并刷新当前进程的环境变量。
    """
    env_path = ".env"
    lines = []
    
    # 读取现有内容
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    
    key_found = False
    new_lines = []
    for line in lines:
        # 如果找到 key，则更新
        if line.strip().startswith(f"{key}="):
            new_lines.append(f"{key}={value}\n")
            key_found = True
        else:
            new_lines.append(line)
            
    # 如果没找到，追加到末尾
    if not key_found:
        if new_lines and not new_lines[-1].endswith('\n'):
            new_lines.append('\n')
        new_lines.append(f"{key}={value}\n")
        
    # 写入文件
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    
    # 立即更新当前运行环境
    os.environ[key] = value
    # 重新加载 dotenv 以确保万无一失
    load_dotenv(override=True)

# --- API 接口 ---

@app.get("/")
def health_check():
    return {"status": "running"}

# === [新增] API Key 管理接口 ===

@app.get("/api/key")
def get_api_key():
    """读取后端 .env 配置的 Key"""
    key = os.getenv("OPENROUTER_API_KEY", "")
    return {"api_key": key}

@app.post("/api/key/save")
def save_api_key(req: ApiKeyRequest):
    """保存 Key 到 .env 文件"""
    if not req.api_key:
        raise HTTPException(400, "API Key cannot be empty")
    
    try:
        update_env_file("OPENROUTER_API_KEY", req.api_key)
        return {"status": "success", "message": "API Key saved to .env"}
    except Exception as e:
        raise HTTPException(500, f"Failed to save .env file: {str(e)}")

@app.post("/api/key/test")
def test_api_key(req: ApiKeyRequest):
    """测试 Key 是否有效 (通过调用 OpenRouter models 列表)"""
    if not req.api_key:
        raise HTTPException(400, "API Key cannot be empty")
        
    try:
        # 创建临时 Client 进行测试
        client = OpenAI(
            base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            api_key=req.api_key
        )
        # 尝试列出模型 (轻量级调用)
        client.models.list()
        return {"valid": True, "message": "API Key is valid"}
    except Exception as e:
        # 如果调用失败，说明 Key 无效或网络问题
        print(f"API Key Test Failed: {e}")
        return {"valid": False, "message": str(e)}

# === 会话管理 ===

@app.get("/sessions")
def list_sessions():
    return SessionManager.list_sessions()

@app.post("/session/create")
def create_session(req: CreateSessionRequest):
    sid = SessionManager.create_session(req.topic)
    return {"session_id": sid, "message": "Session initialized"}

@app.get("/session/{session_id}")
def get_session_data(session_id: str):
    data = SessionManager.get_session(session_id)
    if not data:
        raise HTTPException(404, "Session not found")
    return data

@app.patch("/session/{session_id}/title")
def rename_session(session_id: str, req: RenameSessionRequest):
    success = SessionManager.update_session_title(session_id, req.new_title)
    if not success:
        raise HTTPException(404, "Session not found")
    return {"status": "success", "new_title": req.new_title}

@app.delete("/session/{session_id}")
def delete_session(session_id: str):
    success = SessionManager.delete_session(session_id)
    if not success:
        raise HTTPException(404, "Session not found")
    return {"status": "success"}

# === 幻灯片删除接口 ===

@app.delete("/session/{session_id}/slide/{slide_index}")
def delete_slide(session_id: str, slide_index: int):
    success = SessionManager.delete_slide_at_index(session_id, slide_index)
    if not success:
        raise HTTPException(404, "Session or Slide not found")
    return {"status": "success", "message": f"Slide {slide_index} deleted"}

@app.delete("/session/{session_id}/slide/{slide_index}/version/{version_id}")
def delete_slide_version(session_id: str, slide_index: int, version_id: str):
    success = SessionManager.delete_slide_version(session_id, slide_index, version_id)
    if not success:
        raise HTTPException(400, "Delete failed. Either not found, or it is the only version remaining.")
    return {"status": "success", "message": f"Version {version_id} deleted"}

# === 文件处理 ===

@app.post("/upload/doc")
async def upload_document(file: UploadFile = File(...)):
    text = await FileHandler.extract_text(file)
    if not text:
        raise HTTPException(400, "Could not extract text")
    return {"filename": file.filename, "extracted_text": text}

# === PPT 规划 ===

@app.post("/ppt/plan")
async def plan_ppt(
    req: PPTPlanRequest, 
    x_api_key: Optional[str] = Header(None, alias="x-api-key")
):
    auto_title = None
    try:
        if hasattr(planner, 'generate_short_title'):
            auto_title = planner.generate_short_title(req.topic, api_key=x_api_key)
            SessionManager.update_session_title(req.session_id, auto_title)
    except Exception as e:
        print(f"Auto-title failed: {e}")

    plan = planner.generate_ppt_outline(
        topic=req.topic,
        page_count=req.page_count,
        context_text=req.context_text,
        api_key=x_api_key
    )
    
    if "error" in plan:
        raise HTTPException(500, detail=plan["error"])
        
    SessionManager.add_chat_message(
        req.session_id, 
        "assistant", 
        f"I have planned a presentation for: {req.topic}",
        related_slide_index=-1 
    )
    
    if auto_title:
        plan["session_title"] = auto_title
    
    return plan

# === 绘图核心 ===

@app.post("/ppt/generate_slide")
async def generate_single_slide(
    req: GenerateSlideRequest,
    x_api_key: Optional[str] = Header(None, alias="x-api-key")
):
    if req.is_insertion:
        action_type = "Insertion"
    elif req.is_modification:
        action_type = "Modification"
    else:
        action_type = "Creation"
        
    SessionManager.add_chat_message(
        req.session_id, 
        "user", 
        f"[{action_type}] {req.prompt}", 
        related_slide_index=req.slide_index
    )

    try:
        # A. 插入模式
        if req.is_insertion:
            prev_prompt = SessionManager.get_previous_slide_prompt(req.session_id, req.slide_index)
            prompts_list = planner.plan_insertion_prompts(req.prompt, previous_context=prev_prompt, api_key=x_api_key)
            
            generated_results = []
            current_insert_index = req.slide_index
            
            for visual_prompt in prompts_list:
                image_url = image_gen.generate_slide_image(
                    prompt=visual_prompt, 
                    reference_style_prompt=prev_prompt,
                    api_key=x_api_key,
                    custom_style=req.style_template # <--- 传入自定义风格
                )
                
                if not image_url: continue 
                
                local_path = await save_image_locally(image_url, session_id=req.session_id)
                
                version_id = SessionManager.insert_slide_at_index(
                    session_id=req.session_id,
                    target_index=current_insert_index,
                    image_url=local_path,
                    prompt=visual_prompt
                )
                
                generated_results.append({
                    "slide_index": current_insert_index,
                    "version_id": version_id,
                    "image_url": local_path
                })
                
                current_insert_index += 1

            SessionManager.add_chat_message(
                req.session_id, "assistant", 
                f"Inserted {len(generated_results)} new slides.", 
                related_slide_index=req.slide_index
            )

            first_res = generated_results[0] if generated_results else {}
            return {
                "status": "success",
                "slide_index": first_res.get("slide_index"),
                "version_id": first_res.get("version_id"),
                "image_url": first_res.get("image_url"),
                "inserted_count": len(generated_results)
            }

        # B. 修改模式
        elif req.is_modification:
            if not req.base_image_url:
                raise HTTPException(400, "Modification requires base_image_url")
            
            base64_image = encode_local_image(req.base_image_url)
            if not base64_image:
                raise HTTPException(404, "Base image file not found")
            
            history = SessionManager.get_slide_context_messages(req.session_id, req.slide_index)
            image_url = image_gen.modify_slide_image(
                req.prompt, base64_image, history, api_key=x_api_key,
                custom_style=req.style_template # <--- 传入自定义风格
            )
            
        # C. 创作模式
        else:
            prev_prompt = SessionManager.get_previous_slide_prompt(req.session_id, req.slide_index)
            image_url = image_gen.generate_slide_image(
                prompt=req.prompt, 
                reference_style_prompt=prev_prompt,
                api_key=x_api_key,
                custom_style=req.style_template # <--- 传入自定义风格
            )
            
        # 统一保存逻辑 (B & C)
        if not image_url:
            raise HTTPException(500, "Image generation failed.")

        local_image_path = await save_image_locally(image_url, session_id=req.session_id)
        if not local_image_path:
            raise HTTPException(500, "Failed to save image locally.")

        version_id = SessionManager.add_slide_version(
            session_id=req.session_id,
            slide_index=req.slide_index,
            image_url=local_image_path,
            prompt=req.prompt,
            base_image_url=req.base_image_url if req.is_modification else None
        )
        
        SessionManager.add_chat_message(
            req.session_id, "assistant", 
            f"Generated version {version_id}.", 
            attachments=[local_image_path],
            related_slide_index=req.slide_index
        )
        
        return {
            "status": "success",
            "slide_index": req.slide_index,
            "version_id": version_id,
            "image_url": local_image_path
        }

    except Exception as e:
        print(f"Error in generate_slide: {e}")
        raise HTTPException(500, str(e))

# === 版本控制 ===

@app.patch("/session/{session_id}/slide/{slide_index}/version")
def set_active_version(session_id: str, slide_index: int, req: SetVersionRequest):
    success = SessionManager.set_slide_active_version(session_id, slide_index, req.version_id)
    if not success:
        raise HTTPException(404, "Session, Slide or Version not found")
    return {"status": "success", "current_version_id": req.version_id}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
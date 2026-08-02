# core_agent.py
import os
import time  # 🟢 新增：用于重试休眠
from dotenv import load_dotenv
from openai import OpenAI
from typing import List, Dict, Any
import base64
from pathlib import Path

# 导入本地模块
import data_manager
from models import ChatRequest, ChatResponse, Message, GeneratedImageInfo

load_dotenv()

# 模型配置
MODEL_CONFIGS = {
    "google/gemini-3-pro-image-preview": {
        "extra_body": {"modalities": ["image", "text"]}
    },
    "google/gemini-3-pro-preview": {
        "extra_body": {"reasoning": {"enabled": True}}
    }
}

def _local_image_to_data_url(file_path: str) -> str:
    """辅助函数：读取本地图片文件并转换为 Data URL"""
    try:
        # 路径转换逻辑：将 Web URL (/images/...) 转为本地路径
        if file_path.startswith("/images/"):
            file_path = f"storage/images/{file_path.replace('/images/', '', 1)}"
        
        full_path = Path(file_path)
        if not full_path.exists():
            full_path = data_manager.BASE_DIR.parent / file_path
            
        if full_path.exists():
            with open(full_path, "rb") as img_file:
                base64_data = base64.b64encode(img_file.read()).decode('utf-8')
                return f"data:image/png;base64,{base64_data}"
    except Exception as e:
        print(f"Error converting image to base64: {e}")
    return None

def process_chat(request: ChatRequest) -> ChatResponse:
    # --- 0. 动态获取 Key ---
    current_api_key = data_manager.get_api_key()
    if not current_api_key:
        return ChatResponse(assistant_message="❌ 错误：未配置 API Key。请在设置中输入您的 OpenRouter API Key。")

    client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=current_api_key)

    # --- A. 加载会话 ---
    session = data_manager.load_session(request.session_id)
    if not session:
        session = data_manager.create_session()

    # --- B. 寻找“上下文图片” ---
    context_image_url = None
    for msg in reversed(session.messages):
        # 1. 检查 Assistant 生成的
        if msg.role == "assistant" and msg.generated_images:
            last_img_info = msg.generated_images[-1]
            context_image_url = _local_image_to_data_url(last_img_info.file_path)
            if context_image_url: break 
        
        # 2. 检查 User 上传的
        if msg.role == "user" and msg.content:
            for part in msg.content:
                if part.get("type") == "image_url":
                    stored_url = part["image_url"]["url"]
                    if "storage/images" in stored_url or "/images/" in stored_url:
                        context_image_url = _local_image_to_data_url(stored_url)
                        if context_image_url: break
            if context_image_url: break

    # --- C. 构建当前用户消息 ---
    user_api_content: List[Dict[str, Any]] = [{"type": "text", "text": request.message}]
    user_storage_content: List[Dict[str, Any]] = [{"type": "text", "text": request.message}]

    # 1. User Uploads
    has_new_upload = False
    for img_b64 in request.user_images_base64:
        has_new_upload = True
        if not img_b64.startswith("data:"):
            full_b64 = f"data:image/png;base64,{img_b64}"
        else:
            full_b64 = img_b64
            
        user_api_content.append({"type": "image_url", "image_url": {"url": full_b64}})
        
        try:
            filename = data_manager.save_base64_image(full_b64)
            web_url = f"/images/{filename}"
            user_storage_content.append({"type": "image_url", "image_url": {"url": web_url}})
        except Exception as e:
            print(f"Error saving user upload: {e}")

    # 2. Context Injection
    if not has_new_upload and context_image_url:
        print(f"💡 [Context] 注入最近的历史图片")
        user_api_content.append({"type": "image_url", "image_url": {"url": context_image_url}})

    # --- D. 保存用户消息 ---
    user_msg = Message(role="user", content=user_storage_content)
    session.messages.append(user_msg)
    data_manager.save_session(session)

    # --- E. 准备 API 请求列表 ---
    recent_messages = session.messages[-20:]
    api_messages = []

    for msg in recent_messages:
        if msg.role == "user":
            text_content = ""
            if msg.content:
                for part in msg.content:
                    if part.get("text"): text_content += part.get("text")
            final_content = text_content if text_content else "..."
            api_messages.append({"role": "user", "content": final_content})

        elif msg.role == "assistant":
            text_content = ""
            if msg.content:
                for part in msg.content:
                    if part.get("text"): text_content += part.get("text")
            if not text_content:
                text_content = "[Image generated]" if msg.generated_images else "..."
            api_messages.append({"role": "assistant", "content": text_content})

    if api_messages and api_messages[-1]['role'] == 'user':
        api_messages.pop()

    api_messages.append({"role": "user", "content": user_api_content})

    # --- F. 调用 API (🟢 重试机制升级) ---
    model_id = request.model
    config = MODEL_CONFIGS.get(model_id, {})
    extra_body = config.get("extra_body", {})

    response = None
    max_retries = 5 # ⚡️ 设置最大尝试次数
    
    print(f"🔄 开始调用模型 {model_id}，最多重试 {max_retries} 次...")

    for attempt in range(max_retries):
        try:
            # 调用 API
            temp_response = client.chat.completions.create(
                model=model_id,
                messages=api_messages,
                extra_body=extra_body
            )

            # 🛑 验证响应有效性 (安检门)
            # 1. 检查是否为 None
            if not temp_response:
                raise ValueError("Response is None")
            
            # 2. 检查是否有 explicit error 字段
            if getattr(temp_response, 'error', None):
                raise ValueError(f"API returned error object: {temp_response.error}")

            # 3. 检查 choices 是否为空
            if not temp_response.choices:
                raise ValueError("Response choices are empty (Safety Filter or Network issue)")

            # 🎉 如果通过所有检查，说明成功了
            response = temp_response
            print(f"✅ 第 {attempt + 1} 次尝试成功！")
            break # 跳出循环
            
        except Exception as e:
            print(f"⚠️ 第 {attempt + 1}/{max_retries} 次尝试失败: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(1.5) # 休息 1.5 秒再试，避免请求过快被封
            else:
                print("❌ 重试次数耗尽。")
                # 此时 response 依然是 None 或上一次的无效值，将由 Step G 处理

    # --- G. 解析响应 (最终兜底) ---
    # 如果 5 次全挂了，response 就是 None，或者不符合格式，这里会拦截并报错
    
    # 1. 优先检查显式错误 (针对最后一次尝试的结果)
    if response:
        err_info = getattr(response, 'error', None)
        if err_info:
            err_msg = err_info.get('message', str(err_info)) if isinstance(err_info, dict) else str(err_info)
            return ChatResponse(assistant_message=f"⚠️ API 返回错误 (已重试{max_retries}次): {err_msg}")

    # 2. 检查空响应
    if not response or not response.choices:
        return ChatResponse(assistant_message=f"⚠️ 错误：模型在 {max_retries} 次尝试后仍未返回有效响应。请稍后再试。")

    api_msg_obj = response.choices[0].message
    content_text = api_msg_obj.content if api_msg_obj.content else ""
    
    generated_images_info = []
    frontend_image_urls = []
    
    raw_images = getattr(api_msg_obj, 'images', [])
    if raw_images is None: raw_images = []

    for img_item in raw_images:
        try:
            if not img_item: continue
            
            img_url_obj = None
            if isinstance(img_item, dict): img_url_obj = img_item.get('image_url')
            else: img_url_obj = getattr(img_item, 'image_url', None)
            
            if not img_url_obj: continue

            b64_url = None
            if isinstance(img_url_obj, dict): b64_url = img_url_obj.get('url')
            else: b64_url = getattr(img_url_obj, 'url', None)
            
            if not b64_url: continue

            filename = data_manager.save_base64_image(b64_url)
            file_path = f"storage/images/{filename}"
            file_url = f"/images/{filename}"
            
            img_info = GeneratedImageInfo(
                file_path=file_path,
                file_url=file_url,
                prompt=request.message
            )
            generated_images_info.append(img_info)
            frontend_image_urls.append(file_url)
            
        except Exception as e:
            print(f"Warning: Failed to process an image: {e}")
            continue

    # --- H. 最终结果处理 ---
    if "image-preview" in model_id and not generated_images_info:
        if not content_text:
            content_text = f"⚠️ 绘图失败：模型在 {max_retries} 次尝试后未返回图片。"
        else:
            content_text = f"⚠️ 未生成图片。模型回复：\n{content_text}"
            
    elif "image-preview" in model_id and generated_images_info and not content_text:
        content_text = "Here is your generated image. 🎨"

    assistant_msg = Message(
        role="assistant",
        content=[{"type": "text", "text": content_text}],
        generated_images=generated_images_info,
        model_used=model_id
    )
    
    session.messages.append(assistant_msg)
    data_manager.save_session(session)

    return ChatResponse(
        assistant_message=content_text,
        image_urls=frontend_image_urls
    )
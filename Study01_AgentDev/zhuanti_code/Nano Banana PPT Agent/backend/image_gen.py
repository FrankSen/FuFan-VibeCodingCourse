import os
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# === 默认风格模板 (常量) ===
DEFAULT_STYLE_PROMPT = (
    "A modern Tech/Internet company presentation slide. "
    "Style: Modern SaaS aesthetic, clean UI, sleek vector art, soft shadows (glassmorphism). "
    "Background: Clean LIGHT background (white or very light grey) with SUBTLE tech accents (faint grids, soft blue/purple mesh gradients). "
    "Content: Minimalist infographics, rounded cards, sans-serif typography style. "
    "Avoid: Old-school academic look, heavy dark borders, realistic photos, cluttered text. "
)

class ImageGenerator:
    def __init__(self):
        self.client = OpenAI(
            base_url=os.getenv("OPENROUTER_BASE_URL"),
            api_key=os.getenv("OPENROUTER_API_KEY"),
        )
        self.image_model = "google/gemini-3-pro-image-preview"

    def _call_with_retry(self, func_name, client, messages, max_retries=3):
        """
        内部私有方法：通用重试逻辑 (带详细 Debug)
        """
        for attempt in range(max_retries):
            try:
                print(f"[{func_name}] Attempt {attempt + 1}/{max_retries}...")
                
                response = client.chat.completions.create(
                    model=self.image_model,
                    messages=messages,
                    extra_body={"modalities": ["image", "text"]}
                )

                # 提取结果逻辑
                message = response.choices[0].message
                
                # Debug
                if not (hasattr(message, 'images') and message.images):
                    print(f"⚠️ [DEBUG] No Image found. Raw Content: {message.content}")

                if hasattr(message, 'images') and message.images:
                    return message.images[0]["image_url"]["url"]
                elif hasattr(message, 'content') and message.content and 'http' in message.content:
                    return message.content
                elif hasattr(message, 'images'): 
                    return message.images[0]["image_url"]["url"]
                else:
                    print(f"[{func_name}] Warning: Response structure invalid (No image found). Retrying...")
                    raise ValueError(f"Invalid response structure. Content: {message.content}")

            except Exception as e:
                print(f"[{func_name}] Error on attempt {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2) 
                else:
                    print(f"[{func_name}] All {max_retries} attempts failed.")
                    return None
        return None

    def generate_slide_image(self, prompt: str, reference_style_prompt: str = None, api_key: str = None, custom_style: str = None):
        """
        [创作模式]
        Args:
            custom_style (str): 前端传入的自定义风格提示词。如果为 None，则使用 DEFAULT_STYLE_PROMPT。
        """
        if api_key:
            client_to_use = OpenAI(base_url=os.getenv("OPENROUTER_BASE_URL"), api_key=api_key)
        else:
            client_to_use = self.client

        # === 风格选择逻辑 ===
        # 如果前端传了自定义风格，就用前端的；否则用默认的“现代科技风”
        base_instruction = custom_style if custom_style and custom_style.strip() else DEFAULT_STYLE_PROMPT
        
        if reference_style_prompt:
            full_prompt = (
                f"{base_instruction} "
                f"**TARGET SLIDE CONTENT**: {prompt}. "
                f"**VISUAL CONSISTENCY**: Maintain the exact same style and color palette as this previous slide: [[ {reference_style_prompt} ]]."
            )
        else:
            full_prompt = f"{base_instruction} **SLIDE CONTENT**: {prompt}"
            
        messages = [{"role": "user", "content": full_prompt}]

        return self._call_with_retry("GenerateSlide", client_to_use, messages)

    def modify_slide_image(self, prompt: str, base_image_url: str, history_context: list = None, api_key: str = None, custom_style: str = None):
        """
        [修改模式]
        """
        if api_key:
            client_to_use = OpenAI(base_url=os.getenv("OPENROUTER_BASE_URL"), api_key=api_key)
        else:
            client_to_use = self.client

        # 风格注入
        style_instruction = custom_style if custom_style and custom_style.strip() else "Maintain the modern, clean, light-tech background style."

        # 构建当前消息
        current_message_content = [
            {"type": "text", "text": f"Modify this slide: {prompt}. {style_instruction}"},
            {"type": "image_url", "image_url": {"url": base_image_url}}
        ]

        messages = []
        if history_context:
            messages.extend(history_context)
        
        messages.append({
            "role": "user",
            "content": current_message_content
        })

        return self._call_with_retry("ModifySlide", client_to_use, messages)
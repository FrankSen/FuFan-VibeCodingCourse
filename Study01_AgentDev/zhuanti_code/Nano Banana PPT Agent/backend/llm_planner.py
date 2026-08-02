import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class LLMPlanner:
    def __init__(self):
        self.client = OpenAI(
            base_url=os.getenv("OPENROUTER_BASE_URL"),
            api_key=os.getenv("OPENROUTER_API_KEY"),
        )
        # 逻辑模型 (The Brain)
        self.logic_model = "google/gemini-3-pro-preview"

    def generate_ppt_outline(self, topic: str, page_count: int = 5, context_text: str = "", api_key: str = None):
        """
        使用 Gemini 3 Pro 规划 PPT 大纲。
        特性：智能页数、语种自适应、自定义 Key、现代科技风 PPT 规划。
        """
        if api_key:
            client_to_use = OpenAI(base_url=os.getenv("OPENROUTER_BASE_URL"), api_key=api_key)
        else:
            client_to_use = self.client

        # === 修改重点：System Prompt 强调现代互联网科技风格 ===
        system_prompt = f"""
        You are a Senior Art Director for a top Tech Company (like Apple, Stripe, or Notion).
        
        # TASK
        Plan a modern, high-tech presentation based on the user's request.
        
        # RULES FOR SLIDE COUNT
        1. Analyze complexity: Simple (3-5 slides), Moderate (6-8), Complex (9-12).
        2. If the user specifies a number, OBEY it.
        
        # RULES FOR LANGUAGE
        1. Detect the language of the user's request.
        2. Output `title` and `content_summary` in the Detected Language.
        
        # RULES FOR STRUCTURE (NARRATIVE ARC)
        1. **Slide 1 (Index 0)**: MUST be a **Title/Cover Slide**.
           - Visual: High-impact, modern typography, subtle animated-style background.
        2. **Middle Slides**: Content flow. Focus on modern data visualization.
        3. **Last Slide**: Strategic Closing (if > 5 slides).
        
        # CRITICAL RULES FOR VISUAL PROMPT (The "Artist" Instructions)
        Your `visual_prompt` MUST describe a "Tech/Internet Style" slide.
        
        1. **Style**: Modern SaaS, Clean Tech, "Internet Style" (互联网风).
           - Keywords to include: "Modern UI aesthetics", "Glassmorphism", "Soft gradients", "Rounded corners", "Sleek vector art".
           - Keywords to AVOID: "Old school academic", "Boring charts", "Times New Roman style", "Cluttered details", "Retro".
        
        2. **Background**: **LIGHT & MODERN TECH**. 
           - "Clean white with very subtle blue/purple mesh gradient", "Light grey with abstract tech geometry".
           - The background must be subtle and non-intrusive (不抢镜).
        
        3. **Layout**: Modern grid systems or card-based layouts.
           - "Bento box layout", "Floating cards", "Split screen with clean whitespace".
        
        4. **Text Rendering**:
           - Format: "A presentation slide with the title text '[Title]' clearly written in [Detected Language]..."
        
        # OUTPUT FORMAT
        Output strictly in JSON format:
        {{
            "global_style": "Modern, sleek, tech-oriented business style...",
            "slides": [
                {{ 
                    "index": 0, 
                    "title": "...", 
                    "content_summary": "...", 
                    "visual_prompt": "..." 
                }},
                ...
            ]
        }}
        """

        user_message = f"Topic: {topic}\n"
        if context_text:
            user_message += f"\nReference Context (Use this content):\n{context_text}"

        try:
            print(f"Planning PPT for: {topic}")
            response = client_to_use.chat.completions.create(
                model=self.logic_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                response_format={"type": "json_object"},
                extra_body={"reasoning": {"enabled": True}} 
            )
            
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            print(f"Error generating outline: {e}")
            return {"error": str(e)}

    def plan_insertion_prompts(self, user_requirement: str, previous_context: str = "", api_key: str = None):
        """
        [新增] 插入模式的微型规划。
        """
        if api_key:
            client_to_use = OpenAI(base_url=os.getenv("OPENROUTER_BASE_URL"), api_key=api_key)
        else:
            client_to_use = self.client

        system_prompt = f"""
        You are a Presentation Assistant. The user wants to INSERT new slides.
        
        1. Analyze request to determine slide count (default 1).
        2. Generate `visual_prompt` for Nano Banana.
        3. **Style Rule**: Modern Tech / Internet style. Light background, clean UI elements, soft shadows.
        4. Maintain consistency with 'Previous Context' style.

        Output strictly in JSON:
        {{
            "slides_to_insert": [ {{ "visual_prompt": "..." }} ]
        }}
        """
        
        user_msg = f"Request: {user_requirement}\nPrevious Slide Context: {previous_context}"

        try:
            response = client_to_use.chat.completions.create(
                model=self.logic_model,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_msg}],
                response_format={"type": "json_object"},
                extra_body={"reasoning": {"enabled": True}}
            )
            data = json.loads(response.choices[0].message.content)
            return [item["visual_prompt"] for item in data.get("slides_to_insert", [])]
        except Exception as e:
            print(f"Insertion plan failed: {e}")
            return [f"A clean modern presentation slide. {user_requirement}"]

    def generate_short_title(self, user_input: str, api_key: str = None):
        """生成短标题"""
        if api_key:
            client_to_use = OpenAI(base_url=os.getenv("OPENROUTER_BASE_URL"), api_key=api_key)
        else:
            client_to_use = self.client

        try:
            response = client_to_use.chat.completions.create(
                model=self.logic_model,
                messages=[
                    {"role": "system", "content": "Summarize user input into a concise title (max 6 words). Output raw text only, no quotes."},
                    {"role": "user", "content": user_input}
                ]
            )
            return response.choices[0].message.content.strip()
        except:
            return "New Project"
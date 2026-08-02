import uuid
import time
import json
import os
from glob import glob
from typing import List, Dict

STORAGE_DIR = "storage/sessions"
os.makedirs(STORAGE_DIR, exist_ok=True)

class SessionManager:
    @staticmethod
    def _save_to_disk(session_data):
        file_path = os.path.join(STORAGE_DIR, f"{session_data['id']}.json")
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, ensure_ascii=False, indent=2)

    @staticmethod
    def _load_from_disk(session_id):
        file_path = os.path.join(STORAGE_DIR, f"{session_id}.json")
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    @staticmethod
    def list_sessions():
        files = glob(os.path.join(STORAGE_DIR, "*.json"))
        sessions = []
        for f in files:
            try:
                with open(f, 'r', encoding='utf-8') as file:
                    data = json.load(file)
                    preview = None
                    if data.get("slides") and len(data["slides"]) > 0:
                        versions = data["slides"][0].get("versions", [])
                        if versions:
                            preview = versions[-1]["image_url"]
                            
                    sessions.append({
                        "id": data["id"],
                        "topic": data.get("topic", "Untitled"),
                        "created_at": data.get("created_at", 0),
                        "preview_image": preview
                    })
            except:
                continue
        sessions.sort(key=lambda x: x["created_at"], reverse=True)
        return sessions

    @staticmethod
    def create_session(topic: str):
        session_id = str(uuid.uuid4())
        session_data = {
            "id": session_id,
            "topic": topic,
            "created_at": time.time(),
            "slides": [],
            "chat_history": []
        }
        SessionManager._save_to_disk(session_data)
        return session_id

    @staticmethod
    def get_session(session_id: str):
        return SessionManager._load_from_disk(session_id)

    @staticmethod
    def update_session_title(session_id: str, new_title: str):
        session = SessionManager.get_session(session_id)
        if session:
            session["topic"] = new_title
            SessionManager._save_to_disk(session)
            return True
        return False

    @staticmethod
    def delete_session(session_id: str):
        json_path = os.path.join(STORAGE_DIR, f"{session_id}.json")
        if os.path.exists(json_path):
            os.remove(json_path)
            return True
        return False

    @staticmethod
    def add_slide_version(session_id: str, slide_index: int, image_url: str, prompt: str, base_image_url: str = None):
        session = SessionManager.get_session(session_id)
        if not session: return None
        
        version_id = str(uuid.uuid4())[:8]
        new_version = {
            "version_id": version_id,
            "image_url": image_url,
            "prompt": prompt,
            "base_image_url": base_image_url,
            "timestamp": time.time()
        }

        target_slide = next((s for s in session["slides"] if s["index"] == slide_index), None)
        
        if target_slide:
            target_slide["versions"].append(new_version)
            target_slide["current_version_id"] = version_id
        else:
            session["slides"].append({
                "index": slide_index,
                "current_version_id": version_id,
                "versions": [new_version]
            })
            session["slides"].sort(key=lambda x: x["index"])

        SessionManager._save_to_disk(session)
        return version_id

    @staticmethod
    def insert_slide_at_index(session_id: str, target_index: int, image_url: str, prompt: str):
        session = SessionManager.get_session(session_id)
        if not session: return None
        
        for slide in session["slides"]:
            if slide["index"] >= target_index:
                slide["index"] += 1
        
        version_id = str(uuid.uuid4())[:8]
        new_slide = {
            "index": target_index,
            "current_version_id": version_id,
            "versions": [
                {
                    "version_id": version_id,
                    "image_url": image_url,
                    "prompt": prompt,
                    "base_image_url": None,
                    "timestamp": time.time()
                }
            ]
        }
        
        session["slides"].append(new_slide)
        session["slides"].sort(key=lambda x: x["index"])
        SessionManager._save_to_disk(session)
        return version_id

    # === [新增] 删除整张 Slide ===
    @staticmethod
    def delete_slide_at_index(session_id: str, slide_index: int):
        """删除指定 Index 的 Slide，并将其后所有 Slide 的 Index 前移"""
        session = SessionManager.get_session(session_id)
        if not session: return False
        
        # 1. 找到目标
        target_slide = next((s for s in session["slides"] if s["index"] == slide_index), None)
        if not target_slide: return False
        
        # 2. 移除
        session["slides"].remove(target_slide)
        
        # 3. 调整后续索引 (Shift Back)
        for slide in session["slides"]:
            if slide["index"] > slide_index:
                slide["index"] -= 1
        
        # 重新排序
        session["slides"].sort(key=lambda x: x["index"])
        SessionManager._save_to_disk(session)
        return True

    # === [新增] 删除特定版本 ===
    @staticmethod
    def delete_slide_version(session_id: str, slide_index: int, version_id: str):
        """删除特定版本，如果该版本是当前选中版本，则自动回退到最新版"""
        session = SessionManager.get_session(session_id)
        if not session: return False
        
        target_slide = next((s for s in session["slides"] if s["index"] == slide_index), None)
        if not target_slide: return False
        
        versions = target_slide.get("versions", [])
        target_version = next((v for v in versions if v["version_id"] == version_id), None)
        
        # 没找到，或者是最后一个版本(不允许删空)
        if not target_version or len(versions) <= 1:
            return False
            
        versions.remove(target_version)
        
        # 如果删掉的是当前正在看的版本，把指针指向列表里最后一个（通常是最新的）
        if target_slide["current_version_id"] == version_id:
            target_slide["current_version_id"] = versions[-1]["version_id"]
            
        SessionManager._save_to_disk(session)
        return True

    @staticmethod
    def set_slide_active_version(session_id: str, slide_index: int, version_id: str):
        session = SessionManager.get_session(session_id)
        if not session: return False
        
        target_slide = next((s for s in session["slides"] if s["index"] == slide_index), None)
        if not target_slide: return False
        
        if not any(v["version_id"] == version_id for v in target_slide["versions"]):
            return False
            
        target_slide["current_version_id"] = version_id
        SessionManager._save_to_disk(session)
        return True

    @staticmethod
    def add_chat_message(session_id: str, role: str, content: str, attachments: list = None, related_slide_index: int = -1):
        session = SessionManager.get_session(session_id)
        if session:
            session["chat_history"].append({
                "role": role,
                "content": content,
                "attachments": attachments or [],
                "related_slide_index": related_slide_index,
                "timestamp": time.time()
            })
            SessionManager._save_to_disk(session)

    @staticmethod
    def get_slide_context_messages(session_id: str, slide_index: int):
        session = SessionManager.get_session(session_id)
        if not session: return []
        target_slide = next((s for s in session["slides"] if s["index"] == slide_index), None)
        if not target_slide: return []

        history = []
        for ver in target_slide["versions"]:
            history.append({"role": "user", "content": ver["prompt"]})
            history.append({"role": "assistant", "content": "Image generated."})
        return history

    @staticmethod
    def get_previous_slide_prompt(session_id: str, current_slide_index: int) -> str:
        if current_slide_index <= 0:
            return None
        session = SessionManager.get_session(session_id)
        if not session: return None
        
        prev_index = current_slide_index - 1
        prev_slide = next((s for s in session["slides"] if s["index"] == prev_index), None)
        
        if prev_slide and prev_slide.get("versions"):
            return prev_slide["versions"][-1]["prompt"]
        return None
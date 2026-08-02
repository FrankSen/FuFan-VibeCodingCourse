import os
import aiohttp
import uuid
import base64

# 确保存储根目录存在
STORAGE_ROOT = os.path.join("storage", "images")
os.makedirs(STORAGE_ROOT, exist_ok=True)

async def save_image_locally(image_data: str, session_id: str) -> str:
    """
    将图片保存到 storage/images/{session_id}/ 目录下
    """
    # 1. 创建会话专属文件夹
    session_dir = os.path.join(STORAGE_ROOT, session_id)
    os.makedirs(session_dir, exist_ok=True)

    filename = f"{uuid.uuid4()}.png"
    # 物理保存路径
    filepath = os.path.join(session_dir, filename)
    
    # 逻辑 1: Base64 数据
    if image_data.startswith("data:"):
        header, encoded = image_data.split(",", 1)
        data = base64.b64decode(encoded)
        with open(filepath, "wb") as f:
            f.write(data)
            
    # 逻辑 2: HTTP URL
    elif image_data.startswith("http"):
        async with aiohttp.ClientSession() as session:
            async with session.get(image_data) as resp:
                if resp.status == 200:
                    data = await resp.read()
                    with open(filepath, "wb") as f:
                        f.write(data)
                else:
                    return None
    # 逻辑 3: 纯 Base64
    else:
        try:
            data = base64.b64decode(image_data)
            with open(filepath, "wb") as f:
                f.write(data)
        except:
            return None

    # 返回相对路径 (StaticFiles 会自动处理子目录)
    # 结果类似: /images/session_uuid/image_uuid.png
    return f"/images/{session_id}/{filename}"
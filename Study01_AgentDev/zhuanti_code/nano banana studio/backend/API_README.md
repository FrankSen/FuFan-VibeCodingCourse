# AI Drawing Agent - 后端接口文档

**Base URL**: `http://localhost:8002`  
**API 版本**: v1.0  
**鉴权**: 内部项目，暂无 Token 鉴权，直接调用。

---

## 📂 静态资源 (图片)

后端生成的图片存储在本地，通过静态 URL 访问。

* **访问规则**: `Base URL` + `file_url`
* **示例**: 
    * 后端返回: `/images/img_abc123.png`
    * 前端 `src`: `http://localhost:8002/images/img_abc123.png`

---

## 🚀 核心接口

### 1. 新建会话 (Create Session)
创建一个新的空白对话窗口。

* **URL**: `/api/sessions`
* **Method**: `POST`
* **Response**:
    ```json
    {
      "session_id": "uuid-string...",
      "created_at": 1715000000.0,
      "is_favorite": false,
      "messages": []
    }
    ```

### 2. 获取作品集列表 (List Sessions/Portfolio)
获取所有历史会话的摘要，用于展示“橱窗”列表。

* **URL**: `/api/sessions`
* **Method**: `GET`
* **Query Params**: 
    * `filter`: (可选) 传 `favorite` 则只返回收藏的会话。
* **Response**:
    ```json
    [
      {
        "session_id": "uuid...",
        "last_updated": 1715000500.0,
        "is_favorite": true,
        "cover_image_url": "/images/xxx.png", // 如果该会话没画过图，则为 null
        "cover_prompt": "生成一只猫..."         // 对应封面图的提示词
      }
    ]
    ```

### 3. 获取会话详情 (Get Session Detail)
点击作品集进入详情页，或加载历史记录时使用。

* **URL**: `/api/sessions/{session_id}`
* **Method**: `GET`
* **Response**: 返回完整的 Session 对象，包含所有 `messages` 和图片元数据。

### 4. 对话与绘图 (Chat & Draw)
核心接口。支持文本对话、绘图、修改图片。

* **URL**: `/api/chat`
* **Method**: `POST`
* **Request Body**:
    ```json
    {
      "session_id": "uuid-string...",
      "message": "生成一只赛博朋克风格的猫", 
      "model": "google/gemini-3-pro-image-preview",
      "user_images_base64": [] // (可选) 如果用户上传参考图，放入 Base64 字符串
    }
    ```
* **支持的模型 ID (Model List)**:
    1.  `google/gemini-3-pro-image-preview` (绘图/修图模型)
    2.  `google/gemini-3-pro-preview` (多模态对话/推理模型)

* **Response**:
    ```json
    {
      "assistant_message": "这是为您生成的图片...", 
      "image_urls": [
        "/images/img_generated_001.png"
      ]
    }
    ```

### 5. 删除会话 (Delete Session)
删除会话记录及关联的所有本地图片文件。

* **URL**: `/api/sessions/{session_id}`
* **Method**: `DELETE`

### 6. 切换收藏状态 (Toggle Favorite)
将作品加入或移出精选集。

* **URL**: `/api/sessions/{session_id}/favorite`
* **Method**: `POST`
* **Response**:
    ```json
    {
      "session_id": "uuid...",
      "is_favorite": true // 新的状态
    }
    ```

---

## 💡 开发注意事项

1.  **图片显示**: 前端拿到 `image_urls` 后，记得拼接 `http://localhost:8002`。
2.  **Base64**: 用户上传图片时，转为 Base64 字符串放入 `user_images_base64` 数组即可，不需要加 `data:image/png;base64,` 前缀（后端会自动处理，但带上也没关系）。
3.  **模型参数**: 切换模型时，只需改变 `chat` 接口的 `model` 字段，后端会自动处理不同的 API 参数（如 `reasoning` 或 `modalities`）。
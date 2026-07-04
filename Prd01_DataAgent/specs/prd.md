# Datus Web 工作台 · 产品需求文档

---

## 1. 文档信息

| 项 | 值 |
|---|---|
| 文档名称 | Datus Web 工作台 MVP · 产品需求文档 |
| 版本 | v1.0 |
| 状态 | Review |
| 作者 | PM + Claude Code |
| 创建日期 | 2026-07-04 |
| 最后更新 | 2026-07-04 |
| 评审人 | 待定 |
| 上游产物 | `specs/research/01~06` 调研文件 + `docs/superpowers/specs/2026-07-04-datus-web-mvp-design.md` brainstorming 设计规格 |

### 变更记录
- v1.0 (2026-07-04) 初稿，基于 brainstorming 收敛结果

---

## 2. 项目背景与目标

### 2.1 背景

Datus 是一个开源 AI 数据分析 Agent，当前以 CLI 形态运行，用户通过终端与 Agent 对话完成 SQL 查询、数据分析等任务。核心能力包括：多数据源连接（BigQuery/Snowflake/DuckDB 等）、语义层（Semantic Model）、Agent 驱动的 SQL 生成与执行、RAG 知识检索。

**现状问题**：
- CLI 形态将用户限制在终端环境，数据分析师（非工程师）使用门槛高
- SQL 结果只能以文本形式展示，缺少表格、图表等数据可视化能力
- 无法浏览数据源 Schema，用户需要记住表名或频繁切换到 DataGrip 查看结构
- 会话没有持久化和分支能力，重启后历史丢失，无法基于上次查询"另开一条线"

**用户当前替代方案**：DataGrip/DBeaver（写 SQL）+ Excel（看结果/画图）+ Hex/Databricks（AI 辅助查询）。三工具切换，效率低。

### 2.2 目标（Goals）

- **业务目标**：让 Datus 从"CLI 工具"升级为"数据分析师日常使用的 Web 工作台"，打开非技术用户市场
- **产品目标**：数据分析师能在 5 分钟内启动 Datus Web，完成「连接数据源 → 用自然语言查询 → 看 SQL + 结果表 + 基础图表」全闭环，且愿意用它替代 DataGrip/Hex 做日常查询
- **学习目标**：验证"AI Agent + Schema-aware 工作台"能否让数据分析师的日常查询效率提升 3 倍以上

### 2.3 非目标（Non-Goals）

- 不做 Notebook Cell 编辑模型（保持 chat 流主导，避免交互模型膨胀）
- 不做多 Agent 并行编排（无需求驱动）
- 不做 Plan/Act 双模式（延后 v2，视 SQL 场景需求决定）
- 不做多人协作/认证/权限（v1 单用户本地优先）
- 不做 Dashboard Pin 机制（v1.1）
- 不做独立数据源连接配置面板（v1 用 ChatInput dropdown 替代）
- 不做完整 Schema Browser 四级树（v1 做简化两级列表）
- 不做 SQL Plan / 查询解释器
- 不做数据集 lineage 图
- 不做跨会话全文搜索（v1 用 sidebar 列表过滤）

### 2.4 已锁定决策（架构基线）

以下决策已通过 5 角色法庭辩论确认，不再重开：
- 前端基座：fork pi-web（MIT，Next.js + React + Tailwind）
- 后端：保留 Datus 现有 FastAPI 作为 Agent 引擎层
- 会话存储：JSONL append-only（废弃现有 SQLite）
- 工作目录：路径即元数据 + workspaces.json 覆盖层
- 被否方案：Vercel AI Chatbot / assistant-ui / 全自建 / HTMX / Notebook / Tauri

### 2.5 Alternatives Considered

| 方案 | 为何不选 |
|------|---------|
| Vercel AI Chatbot fork | AI SDK server 层与 Python 后端语言错位，可复用价值仅 8-10 人日；工作台壳全缺（SessionSidebar/FileExplorer/分支需从零自建 16 人日）；License "Other" 合规灰带 |
| assistant-ui + Vercel Chatbot 组合 | 工作台壳几乎全自建（修正后 21-27 人日）；组合无正协同；Generative UI 对 Datus 确定性需求过度设计 |
| 全自建 Vite SPA | 保留 fork/branch 后成本 35+ 人日，ROI 劣于 pi-web fork；失去 Next.js 部署/打包工具链 |
| HTMX / Notebook / Tauri | HTMX 复杂交互吃力且 AI 辅助编码生态差；Notebook cell 模型与 chat 流主导冲突；Tauri 引入 Rust 构建链增加课程门槛 |

---

## 3. 目标用户与画像

### 3.1 主要画像 P1：日常查询型数据分析师

- **背景**：2-5 年经验的数据分析师，日常使用 SQL 查询数据库，熟练使用 DataGrip/DBeaver
- **目标**：用自然语言描述需求，让 AI 生成 SQL 并执行，自己审核结果即可
- **痛点**：
  1. 每天重复写相似 SQL，机械劳动占比高
  2. 换数据源要切换工具，上下文断裂
  3. SQL 结果只能看文本，看趋势要导出到 Excel 画图
  4. 不记得所有表名，需要频繁查 Schema
- **使用频次**：每天 5-15 次查询
- **设备**：PC（Mac/Windows），浏览器
- **数字代表**：每天节省 1-2 小时机械查询时间

### 3.2 次要画像 P2：探索性分析型数据分析师

- **背景**：5 年以上经验，经常做探索性数据分析，需要频繁试错
- **目标**：基于一次查询结果换角度再查，保留完整探索链路
- **痛点**：
  1. 探索性查询经常"走偏"，需要回到某个节点重试，但历史无法分支
  2. 会话重启后上下文丢失，需要重新描述背景
  3. 多个探索方向并行时，对话混乱
- **使用频次**：每周 3-5 次深度探索会话
- **设备**：PC（Mac），浏览器
- **数字代表**：每次探索会话节省 30 分钟上下文重建时间

### 3.3 反画像（明确不服务的人）

- 需要 Notebook Cell 编辑的数据科学家（Hex 场景）—— v1 保持 chat 流主导
- 需要多人协作的 BI 团队（Databricks 场景）—— v1 单用户本地优先
- 需要 Dashboard 搭建的管理层（Mode/Superset 场景）—— v1 不做 Dashboard
- 需要实时数据管道的工程师（Airflow 场景）—— 产品定位不覆盖

---

## 4. 用户故事

### US-01 切换数据源
作为日常查询型数据分析师
我希望在工作台切换不同数据源
以便在同一个界面查询多个数据库而不需要切换工具

**触发情境**：需要查询另一个数据库的数据时
**期望结果**：后续对话的 Agent 上下文切换到新数据源，SQL 查询发往新数据源

### US-02 自然语言查询 + SQL 审核
作为日常查询型数据分析师
我希望用自然语言描述查询需求并看到 Agent 生成的 SQL
以便我审核 SQL 逻辑后再执行，避免误操作

**触发情境**：需要查询数据但不想手写 SQL 时
**期望结果**：Agent 生成 SQL 并执行，返回 SQL 代码块 + 结果；SQL 可复制；执行失败时返回错误原因和建议修正

### US-03 结果表格 + 基础图表
作为日常查询型数据分析师
我希望在 SQL 执行后直接看到结果表格和基础图表
以便快速判断数据趋势而不需要导出到 Excel

**触发情境**：Agent 返回 SQL 查询结果时
**期望结果**：结果以交互式表格展示（可排序、虚拟滚动），可切换 Bar/Line/Pie 图表，可导出 CSV

### US-04 浏览 Schema
作为日常查询型数据分析师
我希望浏览当前数据源的表和列结构
以便我不需要记住所有表名就能写出正确的查询

**触发情境**：不确定表名或列名时
**期望结果**：看到 Database→Table 两级列表，点击表名展开列名+类型，支持搜索过滤

### US-05 Fork 会话
作为探索性分析型数据分析师
我希望 fork 当前会话到新分支
以便基于上一次查询结果换角度探索而不丢失原对话上下文

**触发情境**：查询结果揭示新方向，想基于当前结果探索另一条线时
**期望结果**：创建新独立会话，继承原会话全部历史；原会话不受影响；可通过分支导航器切换

---

## 5. 功能列表与范围

### 5.1 In-Scope（MVP v1.0）

| ID | 功能名 | 一句话描述 | 关联用户故事 | 优先级 |
|---|---|---|---|:--:|
| F1 | 三栏工作台布局 | 左侧会话/文件 + 中间对话 + 右侧结果面板 | US-01~05 | P0 |
| F2 | 工作目录管理 | 按 cwd 分组会话，切换 cwd 自动清场 | US-01 | P0 |
| F3 | 会话浏览器 | 按 cwd 分组的会话列表 + 最近 cwd 快速切换 | US-01, US-05 | P0 |
| F4 | 文件浏览器 | 当前 cwd 的文件树 | US-02 | P0 |
| F5 | 文件预览 | 右侧面板预览文件内容（含 SQL/CSV） | US-02 | P0 |
| F6 | 对话窗口 + 流式渲染 | SSE 流式 token 渲染 + 消息气泡 | US-02 | P0 |
| F7 | SQL/图表消息渲染 | toolResult 中的 SQL 结果集和图表内联渲染 | US-02, US-03 | P0 |
| F8 | Markdown + 代码高亮 | Markdown/GFM/Math/Mermaid/SQL 代码块渲染 | US-02 | P0 |
| F9 | 数据源选择器 | ChatInput 内的 datasource dropdown | US-01 | P0 |
| F10 | SQL 结果集表格 | 交互式表格（虚拟滚动 + 列排序 + 导出 CSV） | US-03 | P0 |
| F11 | 基础图表 | Bar/Line/Pie 三种图表渲染 | US-03 | P0 |
| F12 | 简化 Schema Browser | Database→Table 两级列表 + 列名类型 + 搜索过滤 | US-04 | P0 |
| F13 | 会话分支/分叉 | Fork 创建独立会话 + BranchNavigator 切换 | US-05 | P0 |
| F14 | 会话持久化 | JSONL append-only 读写 + 工作目录物理隔离 | US-05 | P0 |
| F15 | 一键启动 | npx 单包启动 + 自动 spawn Python 子进程 | US-01~05 | P0 |
| F16 | 模型配置 | LLM provider/model 配置管理 | US-02 | P1 |

### 5.2 Out-of-Scope（v1.0 不做）

- ❌ 独立数据源连接配置面板 → v1 用 ChatInput dropdown 替代，v1.1 做独立面板
- ❌ Dashboard Pin 机制 → v1.1
- ❌ 完整 Schema Browser 四级树（DB→Schema→Table→Column + 元数据 hover） → v1.1
- ❌ Notebook Cell 编辑 → 与 chat 流主导冲突，不做
- ❌ 多 Agent 并行编排 → 无需求驱动
- ❌ Plan/Act 双模式 → v2
- ❌ 多人认证/协作 → v2
- ❌ SQL Plan / 查询解释器 → v1.1
- ❌ 跨会话全文搜索 → v1.1
- ❌ 数据集 lineage 图 → v2
- ❌ 会话压缩（compaction）→ v1.1（pi-web 已有实现，可低成本迁移）
- ❌ 拖放上传 / 多模态附件 → v1.1

### 5.3 优先级定义

- P0 = 必须有（缺了产品不能上线）
- P1 = 应该有（缺了用户体验大打折扣）
- P2 = 可以有（锦上添花，v1.1 候选）

---

## 6. 详细功能描述

### F1 三栏工作台布局

**触发**：用户打开 Datus Web

**输入**：无

**核心流程**：
1. 加载三栏布局：左侧 Sidebar（300px）+ 中间 ChatWindow + 右侧 ResultPanel（可折叠）
2. 左侧 Sidebar 分四层：Workspaces → Sessions → Schema Browser → Files
3. 右侧 ResultPanel 支持 Tab 切换：文件预览 / SQL 结果表 / 图表
4. 顶栏显示：CWD breadcrumb + 数据源状态 + token/cost 统计

**输出**：完整三栏工作台界面

**边界条件**：
- 右侧 ResultPanel 无 Tab 时自动折叠 → 点击文件/SQL 结果时展开
- 左侧 Sidebar 可收起 → 中间区域自动扩展
- 浏览器窗口 < 1024px → 右侧面板强制折叠

### F2 工作目录管理

**触发**：用户切换 cwd 或首次打开

**输入**：cwd 路径（字符串）

**核心流程**：
1. 启动时扫描 `~/.datus/web/sessions/` 目录，按 mtime 排序列出最近 5 个 cwd
2. 切换 cwd 时自动关闭当前会话，加载新 cwd 的会话列表
3. cwd 编码规则：`/Users/smy/myproject` → `--Users-smy-myproject--`
4. 可选 `workspaces.json` 覆盖层：为 cwd 绑定显示名/默认数据源/默认模型

**输出**：当前 cwd 的会话列表 + 文件树 + 数据源状态

**边界条件**：
- workspaces.json 不存在或损坏 → 从 sessions 目录反推，不影响主流程
- cwd 路径不存在 → 提示"目录不存在，是否创建"
- 首次使用无历史 cwd → 显示欢迎引导

### F3 会话浏览器

**触发**：用户点击左侧 Sidebar 的会话区域

**输入**：当前 cwd（自动）

**核心流程**：
1. 列出当前 cwd 下所有会话（按时间倒序）
2. 每条会话显示：首条消息摘要 + 时间 + 模型名 + SQL 会话标识
3. 点击会话 → 加载对话历史 + 连接 SSE 流
4. 支持 fork 操作 → 创建新独立会话

**输出**：会话列表 + 会话详情

**边界条件**：
- 会话 jsonl 文件损坏 → 显示"[会话数据损坏]"，不阻塞列表
- 会话数 > 100 → 只加载最近 50 条，底部"加载更多"

### F4 文件浏览器

**触发**：用户点击左侧 Sidebar 的文件区域

**输入**：当前 cwd（自动）

**核心流程**：
1. 懒加载当前 cwd 的文件树（仅展开当前层级）
2. 点击文件 → 右侧 ResultPanel 打开文件预览 Tab
3. 支持 @mention 触发文件引用

**输出**：文件树 + 文件预览

**边界条件**：
- cwd 无文件 → 显示空状态提示
- 文件 > 10MB → 提示"文件过大，仅预览前 N 行"

### F5 文件预览

**触发**：用户点击文件树中的文件

**输入**：文件路径

**核心流程**：
1. 读取文件内容，在右侧 ResultPanel 的文件 Tab 中渲染
2. 支持：代码高亮、Markdown 渲染、图片预览、CSV 表格预览、SQL 语法高亮

**输出**：文件内容预览

**边界条件**：
- 二进制文件 → 显示文件元信息（大小/修改时间），不渲染内容
- 文件读取失败 → 显示"无法读取文件"

### F6 对话窗口 + 流式渲染

**触发**：用户在 ChatInput 输入消息并发送

**输入**：用户消息（文本）+ 当前数据源 + 当前模型

**核心流程**：
1. 消息发送到后端 Agent 服务
2. Agent 流式返回 token → 前端逐字渲染
3. 工具调用（SQL 执行等）以气泡形式展示
4. 流式完成后更新 token/cost 统计

**输出**：流式渲染的 Agent 响应

**边界条件**：
- SSE 连接中断 → 显示"连接断开，点击重连"
- Agent 响应超时(>60s 无 token) → 显示"响应超时，是否重试"
- Agent 返回错误 → 显示错误信息，不阻塞后续对话

### F7 SQL/图表消息渲染

**触发**：Agent 返回 toolResult 事件（toolName = execute_sql / create_chart）

**输入**：toolResult 事件数据

**核心流程**：
1. `execute_sql` toolResult → 渲染 SQL 代码块 + 结果集表格
2. `create_chart` toolResult → 渲染图表
3. SQL 代码块支持复制
4. 结果集可切换 Table/Chart Tab

**输出**：SQL 代码块 + 结果表 + 图表

**边界条件**：
- 结果为空 → 显示"查询返回 0 行"
- 图表 spec 格式错误 → 显示原始 JSON + "图表渲染失败"
- 结果列数 > 50 → 只渲染前 50 列，提示"列数过多"

### F8 Markdown + 代码高亮

**触发**：Agent 返回 Markdown 内容

**输入**：Markdown 文本

**核心流程**：
1. 渲染 GFM Markdown + 表格 + 任务列表
2. 代码块语法高亮 + 复制按钮
3. LaTeX 公式渲染
4. Mermaid 图表渲染
5. SQL 代码块特殊样式

**输出**：渲染后的富文本

**边界条件**：
- Mermaid 语法错误 → 显示原始代码 + 错误提示
- LaTeX 渲染失败 → 显示原始公式文本

### F9 数据源选择器

**触发**：用户点击 ChatInput 的 datasource dropdown

**输入**：无

**核心流程**：
1. 下拉列表展示已配置的数据源（来自 agent.yml）
2. 选择数据源 → 注入到后续 Agent 上下文
3. 当前数据源显示在顶栏状态条

**输出**：选中的数据源 ID

**边界条件**：
- 无已配置数据源 → 显示"请先配置数据源" + 配置入口
- 数据源连接失败 → 标记为"连接失败"，可选重试

### F10 SQL 结果集表格

**触发**：Agent 执行 SQL 返回结果

**输入**：结果集（列定义 + 行数据）

**核心流程**：
1. 渲染交互式表格，支持虚拟滚动
2. 列头点击排序（升序/降序）
3. 列宽自适应
4. "导出 CSV"按钮
5. 结果统计：行数 + 列数 + 执行时间

**输出**：交互式结果表格

**边界条件**：
- 0 行 → 显示"查询返回 0 行"
- > 10,000 行 → 虚拟滚动，只渲染可视区域
- 单元格含 NULL → 显示灰色 "NULL"
- 查询超时 → Agent 返回 error toolResult，显示错误提示

**性能要求**：10,000 行结果集首次渲染 ≤ 1s

### F11 基础图表

**触发**：用户在结果集面板切换到 Chart Tab，或 Agent 返回 create_chart toolResult

**输入**：图表类型（Bar/Line/Pie）+ 数据

**核心流程**：
1. Agent 生成图表配置 JSON（通过 create_chart 工具）
2. 前端渲染对应图表类型
3. 支持在 Table/Chart 之间切换

**输出**：渲染的图表

**边界条件**：
- 图表类型不在 Bar/Line/Pie 范围 → 显示"暂不支持此图表类型"
- 数据格式不匹配图表要求 → 显示原始数据 + "图表渲染失败"
- 数据点 > 10,000 → 采样渲染 + 提示"数据已采样"

### F12 简化 Schema Browser

**触发**：用户点击左侧 Sidebar 的 Schema 区域

**输入**：当前数据源 ID

**核心流程**：
1. 请求数据源 Schema 元数据
2. 渲染 Database→Table 两级列表
3. 点击表名 → 展开列名 + 数据类型
4. 搜索框过滤表名

**输出**：Schema 树

**边界条件**：
- 数据源连接失败 → 显示"无法获取 Schema，请检查连接"
- Schema 请求超时(>10s) → 显示部分结果 + "加载不完整"
- 无表 → 显示"该数据源无可用表"

**性能要求**：单数据源 Schema 列表加载 ≤ 2s

### F13 会话分支/分叉

**触发**：用户点击 Fork 按钮

**输入**：当前会话 ID

**核心流程**：
1. 复制当前会话 jsonl 到新文件
2. 新文件 header 写入 parentSession 指向原会话
3. 新会话出现在左侧会话列表
4. BranchNavigator 可在分支间切换

**输出**：新会话 ID

**边界条件**：
- 源 jsonl 不存在 → 提示"原始会话不存在"
- fork 写入失败 → 提示"创建分支失败"，原会话不受影响
- 同一会话 fork > 10 次 → 仍允许，但 BranchNavigator 折叠显示

### F14 会话持久化

**触发**：Agent 写入事件 / 用户打开历史会话

**输入**：会话事件（JSONL 行）

**核心流程**：
1. Agent 每个动作（消息/工具调用/工具结果）追加写入 jsonl
2. 会话文件路径：`~/.datus/web/sessions/<encoded-cwd>/<timestamp>_<uuid>.jsonl`
3. 打开会话时读取 jsonl 渲染历史
4. 工作目录物理隔离：每个 cwd 独立子目录

**输出**：持久化的会话数据

**边界条件**：
- jsonl 文件不存在 → 自动创建
- 写入失败 → Agent 侧 log error 但不阻塞对话流
- 旧格式 SQLite 会话 → 提供迁移脚本（Should 优先级）

### F15 一键启动

**触发**：用户执行 `npx @datus/web`

**输入**：无

**核心流程**：
1. 探测 `datus` CLI 是否在 PATH
2. 不在 → 提示安装命令 + docs 链接，退出
3. 在 → spawn Agent API 子进程
4. 等待 FastAPI 健康检查通过
5. 启动 Web 服务（:30141）
6. 双进程联动退出（SIGINT/SIGTERM/任一进程退出）

**输出**：可访问的 Web 工作台

**边界条件**：
- `datus` 不在 PATH → 清晰报错 + 安装指引
- FastAPI 启动失败 → 报错 + 日志输出
- 端口冲突 → 提示"端口 N 已占用" + 可配置端口
- FastAPI 运行中崩溃 → 健康检查检测后自动重启

### F16 模型配置

**触发**：用户点击模型配置入口

**输入**：LLM provider/model/thinking 配置

**核心流程**：
1. 展示当前模型配置列表
2. 支持添加/编辑/删除 provider
3. 配置变更实时生效

**输出**：更新后的模型配置

**边界条件**：
- 配置格式错误 → 高亮错误字段 + 提示修正
- provider 连接失败 → 标记为"不可用"，不影响其他 provider

---

## 7. 非功能需求

### 7.1 性能

| 指标 | 目标值 | 测量方式 |
|------|--------|---------|
| 首屏加载（冷启动到三栏可见） | ≤ 3s（localhost） | 浏览器 Performance 面板 |
| SSE 流式延迟（发送到首 token） | ≤ 500ms（本地） | 前端计时 |
| SSE 流式保真（BFF vs 直连） | token 时序完全一致 | `curl -N` 双路对照测试 |
| SQL 结果表渲染（10,000 行） | ≤ 1s | 前端 Performance |
| Schema Browser 加载（单数据源） | ≤ 2s | 前端计时 |
| 会话列表加载（100 个会话） | ≤ 500ms | 前端计时 |
| 大结果集虚拟滚动 | 无卡顿（60fps） | Chrome DevTools FPS |

### 7.2 可用性

- 单用户本地运行可用性 99%（排除 LLM API 故障）
- FastAPI 进程崩溃后自动重启（健康检查 + 重启）
- SSE 连接断开后前端提供"重连"按钮

### 7.3 安全

- DSN 密码不落盘明文（沿用 Datus 现有加密机制）
- 会话数据仅存本地文件系统（~/.datus/），不上云、不外传
- 不暴露 FastAPI 端口到公网（仅 localhost 绑定）

### 7.4 合规

- 全链路开源协议 MIT 或 Apache-2.0（pi-web MIT + Datus 现有协议）
- 不引入 AGPL 或带商业附加条款的依赖

### 7.5 数据

- 会话数据保留：本地持久化，无自动清理
- 数据迁移：提供 SQLite→JSONL 迁移脚本（Should 优先级），分 3 步（注册→转写→清理）
- 迁移期间保留旧 .db 备份，用户主动确认后删除

### 7.6 可访问性

- 支持键盘导航（Tab 切换焦点，Enter 触发操作）
- 颜色对比度 ≥ WCAG AA 标准
- 关键操作有 loading 状态反馈

---

## 8. UI / 交互说明

### 8.1 信息架构

```
┌──────────────────────┬───────────────────────────────────┬──────────────────────┐
│ Left Sidebar (300px) │  Top Bar (CWD breadcrumb + stats) │ Right Panel (可折叠) │
│                      ├───────────────────────────────────┼──────────────────────┤
│ ─ Workspaces (CWD)   │                                   │ TabBar (多类型 Tab)  │
│   ▸ Recent (5)       │  Main Area:                       │ ─ FileViewer         │
│   ▸ All projects     │  ┌─────────────────────────────┐  │ ─ SQL ResultTable    │
│ ─ Active CWD 内容    │  │  Chat 流                      │  │ ─ ChartView          │
│   ▸ Sessions         │  │   [USER] 查询昨日订单        │  │                      │
│   ▸ Schema Browser   │  │   [AGENT] SQL + 结果 + 图    │  │                      │
│   ▸ Files (FS tree)  │  └─────────────────────────────┘  │                      │
│ ─ [Models] 配置入口  │  ChatInput (datasource + model)    │                      │
└──────────────────────┴───────────────────────────────────┴──────────────────────┘
```

### 8.2 关键交互流程

- **新建会话**：点击"+ New Session" → 选择数据源 → 开始对话
- **切换数据源**：ChatInput datasource dropdown → 选择 → 后续对话切换上下文
- **查看 Schema**：点击左侧 Schema Browser → 展开表 → 点击列名
- **查看结果**：Agent 执行 SQL → 右侧自动打开 ResultTable Tab → 切换 Chart Tab
- **Fork 会话**：点击 Fork 按钮 → 新会话出现在列表 → BranchNavigator 切换

### 8.3 设计原则

- 工作目录是顶级组织单位：切换 cwd 自动清场当前会话
- 会话呈现 chat 主导，数据元素一等公民：SQL 块/结果/图表作为特殊消息块
- 顶栏状态条扩展数据维度：活跃数据源 + 最近 SQL 行数 + scanned bytes

---

## 9. 验收标准

### AC-F1-01：三栏布局正常渲染
**Given** 用户已启动 Datus Web
**When** 浏览器打开 localhost:30141
**Then** 三栏布局（左 Sidebar + 中 Chat + 右 Panel）正常显示，无布局错乱

### AC-F2-01：工作目录切换清场
**Given** 用户在 cwd-A 有一个活跃会话
**When** 用户切换到 cwd-B
**Then** cwd-A 的会话自动关闭，cwd-B 的会话列表加载

### AC-F6-01：流式对话正常
**Given** 用户已连接数据源并开始新会话
**When** 用户输入"查询昨日订单总额"
**Then** Agent 流式返回响应，token 逐字渲染，无卡顿

### AC-F6-02：SSE 保真
**Given** Datus Web 正常运行
**When** 用 `curl -N` 分别直连 FastAPI 和经 BFF 转发
**Then** 两条路径的 token 时序完全一致

### AC-F7-01：SQL 结果渲染
**Given** Agent 执行了一条返回结果的 SQL
**When** toolResult 事件到达前端
**Then** 右侧 ResultPanel 自动打开 SQL ResultTable Tab，显示完整结果

### AC-F10-01：大结果集渲染
**Given** SQL 查询返回 10,000 行结果
**When** 结果集表格渲染完成
**Then** 首次渲染 ≤ 1s，滚动无卡顿（60fps）

### AC-F10-02：导出 CSV
**Given** 结果集表格已渲染
**When** 用户点击"导出 CSV"
**Then** 浏览器下载 CSV 文件，内容与表格一致

### AC-F11-01：基础图表
**Given** Agent 返回 create_chart toolResult（类型=Bar/Line/Pie）
**When** 前端渲染图表
**Then** 对应类型的图表正确显示

### AC-F12-01：Schema Browser
**Given** 用户已连接一个数据源
**When** 点击左侧 Schema Browser
**Then** 显示 Database→Table 两级列表，点击表名展开列名+类型

### AC-F12-02：Schema 搜索
**Given** Schema Browser 已加载
**When** 用户在搜索框输入表名
**Then** 列表实时过滤，只显示匹配的表

### AC-F13-01：Fork 会话
**Given** 用户有一个包含多轮对话的会话
**When** 点击 Fork 按钮
**Then** 新会话出现在列表，继承全部历史，原会话不受影响

### AC-F15-01：一键启动
**Given** 用户已安装 datus-agent
**When** 执行 `npx @datus/web`
**Then** 3s 内浏览器可访问工作台，双进程正常运行

### AC-F15-02：启动失败提示
**Given** 用户未安装 datus-agent
**When** 执行 `npx @datus/web`
**Then** 显示清晰错误信息 + 安装命令 + docs 链接

### AC-NFR-01：首屏加载
**Given** 本地环境
**When** 冷启动 Datus Web
**Then** 首屏三栏可见 ≤ 3s

---

## 10. 优先级 / MVP 范围

### 10.1 MVP 范围（v1.0）

**核心 5 个能力域**：

1. **工作台壳**（F1 + F2 + F3 + F4 + F5）：三栏布局 + 工作目录 + 会话浏览 + 文件浏览/预览
2. **Agent 对话**（F6 + F8）：流式对话 + Markdown/代码渲染
3. **数据面板**（F7 + F9 + F10 + F11 + F12）：SQL 结果表 + 图表 + 数据源选择 + Schema 浏览
4. **会话持久化**（F13 + F14）：JSONL 读写 + fork/branch
5. **部署**（F15）：一键启动 + 双进程管理

### 10.2 MVP 验证假设

通过 MVP 我们要验证：
- 假设 1：数据分析师愿意用 AI Agent + Schema-aware 工作台替代 DataGrip 做日常查询
- 假设 2：自然语言→SQL→结果表→图表的闭环足以覆盖 80% 的日常查询场景
- 假设 3：简化 Schema Browser（两级列表）已满足"不记表名"的需求

### 10.3 v1.1 计划（MVP 之后）

- 独立数据源连接配置面板
- Dashboard Pin 机制
- 完整 Schema Browser 四级树
- 跨会话全文搜索
- 会话压缩（compaction）
- 拖放上传 / 多模态附件

### 10.4 优先级评估（MoSCoW + 改造成本）

按改造成本排序，成本低 = 优先级前：

**Must（31.5 人日）**：F1~F15 全部 P0 功能
**Should（3.5 人日）**：F16 模型配置（2 人日）+ SQLite 迁移脚本（1.5 人日）
**Could**：v1.1 候选功能
**Won't**：v1 范围外功能（见 §5.2）

---

## 11. 度量指标

### 11.1 北极星指标

**周活跃查询会话数（WAQS）**——每周有多少个独立会话产生了至少 1 次成功的 SQL 执行。

选择理由：
- 直接反映"数据分析师用它替代 DataGrip"的产品目标
- 包含完整闭环：连数据源 → 对话 → SQL 执行 → 拿到结果
- 不含 vanity metric（启动次数、页面浏览量）

### 11.2 关键指标

**Activation（激活）**
- 首次启动后 24h 内完成至少 1 次成功 SQL 执行的用户占比 ≥ 60%

**Retention（留存）**
- 次周留存 ≥ 30%（上周用过的人本周仍在用）
- 4 周留存 ≥ 15%

**Engagement（深度使用）**
- 周活跃用户平均每周 fork 会话 ≥ 1 次
- 周活跃用户平均每周浏览 Schema ≥ 2 次

### 11.3 反指标

- 平均每会话消息数 > 50 但成功 SQL 执行 < 1 → 说明 Agent 无法完成查询，用户在反复尝试
- 图表 Tab 切换率 < 5% → 说明图表功能未满足需求或用户不知道

### 11.4 关停线

MVP 上线后 8 周内 WAQS < 10（平均每天 < 1.5 次有效查询），则重新评估产品方向。

依据：1 人 7 周投入，8 周观察期。如果分析师都不用它查数据，说明产品假设不成立。

### 11.5 度量频率

- 日报：WAQS / 激活率
- 周报：留存 / 北极星 / 反指标
- 月报：完整 AARRR

---

## 12. 依赖与约束

### 12.1 外部依赖

| 依赖项 | 提供方 | 期望就绪时间 | 风险等级 |
|---|---|---|:--:|
| `datus web --api-only` 命令 | Datus-agent | M1 前 | 高 |
| Datus FastAPI SSE 端点协议稳定 | Datus-agent | M2 前 | 高 |
| Datus Schema 查询接口可用 | Datus-agent | M4 前 | 中 |
| LLM API 可用性 | OpenAI/Anthropic/等 | 已就绪 | 低 |
| npm 发版权限（@datus/web） | npm registry | M4 前 | 低 |
| pi-web MIT 协议无变更 | pi-web | fork 前 | 低 |

### 12.2 约束

- 预算：34 人日（1 人 7 周）
- 团队：1 人独立完成
- 平台：macOS / Linux / Windows 三平台支持
- 架构约束：双进程模式（Node + Python），不允许合并为单进程
- 数据约束：所有数据本地存储，不上云

---

## 13. 风险与开放问题

### 13.1 风险登记

| ID | 风险 | 严重 | 概率 | 对策 |
|---|---|:--:|:--:|---|
| R-01 | SSE 双层转发缓冲导致流式 token 卡顿 | 高 | 中 | 严格禁用中间缓冲 + `curl -N` 双路对照测试 |
| R-02 | Python 子进程 spawn 失败导致启动即挂 | 高 | 中 | PATH 探测 + 清晰报错 + `--datus-bin` 显式指定 |
| R-03 | 现有 SQLite 会话迁移导致用户数据丢失 | 高 | 低 | 3 步迁移 + 保留 .db 备份 + `--dry-run` 预演 |
| R-04 | 工作目录与 Datus 现有 project_name 概念错位 | 中 | 中 | M1 即统一：project_name 从 cwd 派生，前端只信任 jsonl 里的 cwd |
| R-05 | 前端框架组合 hydration 问题 | 低 | 中 | 默认 client 组件优先；动态内容 `ssr: false` |
| R-06 | Agent 接入层隐式时序契约导致 BFF 替换不完整 | 高 | 中 | 彻底拆除 rpc-manager 进程内模式，Agent 生命周期完全由 FastAPI 管理，Node 侧仅 SSE 透传 |

### 13.2 开放问题

**来自架构基线决策的遗留问题**：

- [ ] OQ-01：pi-web fork 后的仓库策略——独立 datus-web 仓库 vs Datus-agent monorepo 内？默认立场：独立仓库；M1 前确认
- [ ] OQ-02：jsonl schema 长期一致性保证——TS ↔ Python 双语镜像如何防漂移？默认立场：M1 手动对齐 10 个事件类型；v1.1 评估 schema registry
- [ ] OQ-03：SSE 直连 vs BFF 转发——前端直连 FastAPI 省一跳 vs BFF 架构更统一？默认立场：M2 前技术预研；默认 BFF
- [ ] OQ-04：pi-web 上游同步策略——fork 后彻底断开 vs 定期 cherry-pick？默认立场：彻底断开
- [ ] OQ-05：v2 Plan/Act 模式——Cline 状态机是否值得引入？默认立场：MVP 不做；jsonl schema 预留 `mode` 字段

**新增产品级问题**：

- [ ] OQ-06：Schema Browser 数据来源——调 Datus 现有接口 vs 前端独立缓存？默认立场：沿用现有接口；M4 验证性能
- [ ] OQ-07：图表 spec 生成方式——Agent 生成 ECharts JSON vs 前端自动推断？默认立场：Agent 生成（Datus `create_chart` 已有此能力）
- [ ] OQ-08：工作目录与 project_name 映射统一时机——M1 即统一 vs 延后？默认立场：M1 即统一

### 13.3 决策记录

- ✅ DR-01：前端基座选 pi-web fork → 见 06-架构基线决策.md
- ✅ DR-02：会话存储选 JSONL 废弃 SQLite → 见 05-决策汇总.md §2.2
- ✅ DR-03：MVP 目标用户选"数据分析师生产力优先" → brainstorming 收敛
- ✅ DR-04：Schema Browser 选简化两级列表 → brainstorming 收敛
- ✅ DR-05：图表选基础 3 种（Bar/Line/Pie）→ brainstorming 收敛

---

## 14. 里程碑 / 时间计划

### 14.1 关键节点

| 里程碑 | 目标 | 交付物 | 人日 |
|---|---|---|:--:|
| M1：地基 | Fork pi-web + 改名 + 三栏布局 + 工作目录可切换 + Python 子进程 spawn | 可启动的空壳工作台 | 8 |
| M2：Agent 联通 | SSE BFF 转发跑通 + 会话列表可见 + 流式对话正常 | 能与 Agent 对话的工作台 | 8 |
| M3：会话持久化 + 分支 | JSONL 读写 + fork/branch + BranchNavigator + 文件浏览器 + workspaces.json | 会话可持久化可分支的工作台 | 7 |
| M4：数据工作台特性 | SQL 结果表 + 基础图表 + 简化 Schema Browser + datasource 选择器 + npm 发版 | 完整 MVP | 7.5 |

**合计**：30.5 人日 | **Buffer**：3.5 人日

### 14.2 7 周节奏

- 第 1-2 周：M1 地基 + M2 Agent 联通（前半）
- 第 3-4 周：M2 完成 + M3 会话持久化
- 第 5-6 周：M4 数据工作台特性
- 第 7 周：联调 + 修 Bug + npm 发版 + buffer

### 14.3 风险缓冲

预留 3.5 人日 buffer，优先用于：
1. SSE 双层转发联调风险（R-01）
2. SQLite 迁移脚本（Should 项，视 buffer 消耗决定）
3. 意外问题处理

---

## 下一步

本 PRD 已完成。继续走技术方案设计：
- 使用 Spec-kit `/speckit-plan` 命令基于本 PRD 生成 plan.md
- 或者启动 Brainstorming Skill 做技术选型深化
- 关注点：API 契约（jsonl schema + SSE 事件协议） / 部署方案 / 迁移策略

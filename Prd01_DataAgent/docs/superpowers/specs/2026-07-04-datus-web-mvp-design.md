# Datus Web MVP 设计规格

> 日期：2026-07-04
> 方法论：Superpowers Brainstorming Skill，基于 5 份调研文件收敛
> 架构基线：06-架构基线决策.md（已锁定，不再讨论）
> 交付约束：1 人 7 周（34 人日预算，实排 Must 31.5 人日 + Should 3.5 人日 + 2.5 人日 buffer）

---

## 1. 为什么 / 做什么 / 不做什么

### 1.1 业务目标 + 产品目标 + Non-Goals

**业务目标**：让 Datus 从"CLI 工具"升级为"数据分析师日常使用的 Web 工作台"，打开非技术用户市场。

**产品目标**：数据分析师能在 5 分钟内启动 Datus Web，完成「连接数据源 → 用自然语言查询 → 看 SQL + 结果表 + 基础图表」全闭环，且愿意用它替代 DataGrip/Hex 做日常查询。

**Non-Goals（明确不做）**：
- 不做 Notebook Cell 编辑模型（保持 chat 流主导）
- 不做 Cursor 2.0 风格多 Agent 并行编排
- 不做 Cline Plan/Act 双模式（延后 v2）
- 不做多人协作/认证/权限（单用户本地优先）
- 不做 Dashboard Pin 机制（v1.1）
- 不做独立 ConnectionsConfig 面板（v1 用 ChatInput dropdown）
- 不做完整 Schema Browser 四级树（v1 做简化两级列表）
- 不做 SQL Plan / 查询解释器
- 不做数据集 lineage 图
- 不做跨会话全文搜索（v1 用 sidebar 列表过滤）

### 1.2 主画像 + 反画像

**主画像 1：日常查询型数据分析师**
- 使用 DataGrip/DBeaver 做日常 SQL 查询，但觉得"写 SQL + 看结果"的循环太机械
- 希望用自然语言描述需求，Agent 生成 SQL，自己审核后执行
- 核心诉求：快速出结果、结果可导出、能看简单趋势图

**主画像 2：探索性分析型数据分析师**
- 经常基于一次查询结果"换个角度再查"，需要 fork 会话保留上下文
- 需要浏览 Schema 了解表结构，但不一定记得所有表名
- 核心诉求：Schema 可浏览、会话可 fork、上下文不丢失

**反画像（明确不服务）**：
- 需要 Notebook Cell 编辑的数据科学家（Hex 场景）
- 需要多人协作的 BI 团队（Databricks 场景）
- 需要 Dashboard 搭建的管理层（Mode/Superset 场景）
- 需要实时数据管道的工程师（Airflow 场景）

### 1.3 核心用户故事（5 条，INVEST 格式）

**US1**：作为数据分析师，我想在工作台切换不同数据源，以便在同一个界面查询多个数据库而不需要切换工具。

**US2**：作为数据分析师，我想用自然语言描述查询需求并看到 Agent 生成的 SQL，以便我审核 SQL 逻辑后再执行，避免误操作。

**US3**：作为数据分析师，我想在 SQL 执行后直接看到结果表格和基础图表，以便快速判断数据趋势而不需要导出到 Excel。

**US4**：作为数据分析师，我想浏览当前数据源的表和列结构，以便我不需要记住所有表名就能写出正确的查询。

**US5**：作为数据分析师，我想 fork 当前会话到新分支，以便基于上一次查询结果换角度探索而不丢失原对话上下文。

---

## 2. 架构基线影响的功能决策

### 2.1 MVP 功能列表 + Out-of-Scope 清单

按 06 复用矩阵改造成本排序，成本低 = 优先级前：

| # | 功能 | 来源 | 06 处理方式 | 改造成本 | 优先级 |
|---|------|------|------------|---------|--------|
| 1 | 三栏布局 AppShell + TabBar | pi-web 直接复用 | 浅改（加 Schema/Query Tab 类型） | 1 人日 | Must |
| 2 | 会话浏览器（按 cwd 分组） | pi-web 直接复用 | 微改类型 + 加"SQL 会话"标识 | 1.5 人日 | Must |
| 3 | 文件浏览器 | pi-web 直接复用 | 直接搬 | 0.5 人日 | Must |
| 4 | 文件预览 | pi-web 直接复用 | 改造（加 SQL/CSV 预览） | 1 人日 | Must |
| 5 | 聊天窗口 + SSE 流式 | pi-web 改造 | 改造底层 hook（换 BFF 转发） | 3 人日 | Must |
| 6 | 消息渲染 | pi-web 改造 | 改造（加 SQL/图表 toolResult 分支） | 1.5 人日 | Must |
| 7 | Markdown 渲染 + 代码高亮 | pi-web 直接复用 | 直接搬 + 加 SQL 代码块变体 | 0.5 人日 | Must |
| 8 | 分支导航器 | pi-web 直接复用 | 直接搬 | 0 人日 | Must |
| 9 | ChatInput datasource 选择器 | pi-web ChatInput 改造 | 加 datasource dropdown | 1 人日 | Must |
| 10 | Agent 接入层（rpc→BFF） | 自建 | 重写为 SSE 转发到 FastAPI | 5 人日 | Must |
| 11 | JSONL SessionManager | 自建 | 自写 ~250 行 TS | 3 人日 | Must |
| 12 | 会话类型适配 | 自建 | 约 6 个文件类型替换 | 1 人日 | Must |
| 13 | SQL 结果集表格 | Datus 新增 | TanStack Table + 虚拟滚动 | 3 人日 | Must |
| 14 | 基础图表（Bar/Line/Pie） | Datus 新增 | react-echarts | 2 人日 | Must |
| 15 | 简化 Schema Browser | Datus 新增 | Database→Table+Columns 两级列表 | 1.5 人日 | Must |
| 16 | 部署（bin + Python spawn） | pi-web 改造 | 加 Python spawn + 健康检查 | 1.5 人日 | Must |
| 17 | Python FastAPI 侧补齐 | Datus 现有 | fork/branch 协议 + jsonl 写入 | 3 人日 | Must |
| 18 | 双侧联调 | — | jsonl schema 对齐 + SSE 端到端验证 | 1.5 人日 | Must |
| 19 | 模型配置改造 | pi-web 改造 | 改造为 ConnectionsConfig | 2 人日 | Should |
| 20 | SQLite 迁移脚本 | 自建 | 3 步迁移 | 1.5 人日 | Should |

**Must 合计**：31.5 人日 | **Should**：3.5 人日

**Out-of-Scope 清单**（含 06 代言人自报致命缺陷涉及的能力）：

| # | 功能 | 排除理由 |
|---|------|---------|
| 21 | 独立数据源连接面板 | 2 人日，v1 用 ChatInput dropdown 替代 |
| 22 | Dashboard Pin 机制 | 1.5 人日，非 MVP 闭环必需 |
| 23 | 完整 Schema Browser 四级树 | 3 人日，简化两级列表已覆盖核心需求 |
| 24 | Notebook Cell 编辑 | 与 chat 流主导交互模型冲突 |
| 25 | 多 Agent 并行编排 | 无需求驱动 |
| 26 | Plan/Act 双模式 | 延后 v2 |
| 27 | 多人认证/协作 | 单用户本地优先 |
| 28 | SQL Plan / 查询解释器 | 高级用户场景，非 MVP |
| 29 | 跨会话全文搜索 | sidebar 列表过滤够用 |
| 30 | 数据集 lineage 图 | 进阶功能 |

### 2.2 每个核心功能的关键边界条件

| 功能 | 数据缺失 | 并发 | 失败 |
|------|---------|------|------|
| SSE 流式转发 | — | 单用户单会话，无并发冲突 | BFF 转发中断→前端显示"连接断开，点击重连"；FastAPI 崩溃→bin 脚本检测后自动重启 |
| JSONL 写入 | jsonl 文件不存在→自动创建 | Agent 写 + Next.js 读，无写冲突（append-only） | 写入失败→Agent 侧 log error 但不阻塞对话流 |
| SQL 结果表 | 结果为空→显示"查询返回 0 行" | — | 查询超时→Agent 返回 error toolResult，前端显示错误提示 + SQL 文本 |
| Schema Browser | 数据源连接失败→显示"无法获取 Schema，请检查连接" | — | Schema 请求超时(>10s)→显示部分结果 + "加载不完整"提示 |
| fork/branch | 源 jsonl 不存在→提示"原始会话不存在" | — | fork 写入失败→提示"创建分支失败"，原会话不受影响 |
| Python 子进程 spawn | `datus` 不在 PATH→提示安装命令 | — | spawn 失败→bin 脚本报错退出 + docs 链接；运行中崩溃→健康检查检测后重启 |
| workspaces.json | 文件不存在→从 sessions 目录反推 | 无并发写（单用户） | 文件损坏→忽略元数据，从 sessions 目录重建 |

---

## 3. 怎么算做好了

### 3.1 非功能需求（必须用数字）

| 维度 | 指标 | 数字 | 依据 |
|------|------|------|------|
| 首屏加载 | 冷启动到三栏可见 | ≤ 3s（localhost） | Next.js standalone 本地启动 + fs 读取会话列表 |
| SSE 流式延迟 | 用户发送到首 token 显示 | ≤ 500ms（本地） | BFF 转发多一跳，localhost 环路 < 5ms；瓶颈在 LLM 首 token |
| SSE 流式保真 | BFF 转发 vs 直连 FastAPI token 时序 | 完全一致（curl -N 对照测试） | 06 风险 #1 核心验收标准 |
| SQL 结果表渲染 | 10,000 行结果集首次渲染 | ≤ 1s | TanStack Table 虚拟滚动 |
| Schema Browser 加载 | 单数据源 Schema 列表 | ≤ 2s | 受数据源响应速度约束 |
| 会话列表加载 | 100 个会话 | ≤ 500ms | fs 扫描 + mtime 排序，pi-web 已验证 |
| 可用性 | 单用户本地运行 | 99%（排除 LLM API 故障） | 本地进程，无网络依赖（除 LLM 调用） |
| 数据安全 | DSN 密码存储 | 不落盘明文 | 沿用 Datus 现有 agent.yml 加密机制 |
| 数据安全 | 会话数据位置 | 本地文件系统（~/.datus/） | 不上云、不外传 |
| 合规 | 开源协议 | 全链路 MIT 或 Apache-2.0 | pi-web MIT + Datus 现有协议 |

### 3.2 每个用户故事的验收标准（Given/When/Then）

**US1：切换数据源**
- Given 我已连接至少 2 个数据源
- When 我在 ChatInput 的 datasource dropdown 选择另一个数据源
- Then 后续对话的 Agent 上下文切换到新数据源，SQL 查询发往新数据源

**US2：自然语言查询 + SQL 审核**
- Given 我已选择一个数据源并开始新会话
- When 我输入"查询昨日订单总额"
- Then Agent 生成 SQL 并自动执行，返回包含 SQL 代码块 + 结果的消息
- And SQL 代码块有语法高亮，可复制
- And 如果 SQL 执行失败，Agent 返回错误原因并建议修正

**US3：结果表格 + 基础图表**
- Given Agent 执行了一条返回结果的 SQL
- When 结果展示在 ResultPanel
- Then 我能看到 TanStack Table 渲染的结果集（支持列排序 + 虚拟滚动）
- And 我能切换到 Chart Tab 看到 Bar/Line/Pie 三种基础图表
- And 我能点击"导出 CSV"下载结果

**US4：浏览 Schema**
- Given 我已连接一个数据源
- When 我点击左侧 Schema Browser
- Then 我看到 Database→Table 两级列表，点击表名展开列名+类型
- And 我能在搜索框输入表名过滤

**US5：Fork 会话**
- Given 我有一个包含多轮对话的会话
- When 我点击"Fork"按钮
- Then 创建一个新的独立会话，继承原会话全部历史，新会话出现在左侧会话列表
- And 原会话不受影响，BranchNavigator 可切换

### 3.3 优先级（MoSCoW）

按 06 改造成本排序：

**Must（31.5 人日）**：
1. 三栏布局 AppShell + TabBar（1 人日）
2. 分支导航器（0 人日）
3. 文件浏览器（0.5 人日）
4. Markdown 渲染 + SQL 代码块（0.5 人日）
5. 会话浏览器按 cwd 分组（1.5 人日）
6. ChatInput datasource 选择器（1 人日）
7. 文件预览 + SQL/CSV（1 人日）
8. 会话类型适配（1 人日）
9. 消息渲染 + SQL/图表分支（1.5 人日）
10. 聊天窗口 + SSE 流式（3 人日）
11. SQL 结果集表格（3 人日）
12. JSONL SessionManager（3 人日）
13. Python FastAPI 侧补齐（3 人日）
14. Agent 接入层 rpc→BFF（5 人日）
15. 简化 Schema Browser（1.5 人日）
16. 基础图表 Bar/Line/Pie（2 人日）
17. 部署 bin + Python spawn（1.5 人日）
18. 双侧联调（1.5 人日）

**Should（3.5 人日）**：
19. 模型配置改造为 ConnectionsConfig（2 人日）
20. SQLite 迁移脚本（1.5 人日，M3 期间做）

**Could（v1.1 候选）**：
- 独立数据源连接面板
- Dashboard Pin 机制
- 完整 Schema Browser 四级树
- 跨会话全文搜索

**Won't（v1 范围外）**：
- Notebook Cell 编辑
- 多 Agent 并行编排
- Plan/Act 双模式
- 多人认证/协作
- SQL Plan 解释器
- 数据集 lineage 图

### 3.4 北极星指标 + 关停线

**北极星指标**：**周活跃查询会话数（WAQS）**——每周有多少个独立会话产生了至少 1 次成功的 SQL 执行。

选择理由：
- 直接反映"数据分析师用它替代 DataGrip"的产品目标
- 包含完整闭环：连数据源 → 对话 → SQL 执行 → 拿到结果
- 不含 vanity metric（注册数、启动次数）

**关停线**：
- MVP 上线后 8 周内 WAQS < 10（平均每天 < 1.5 次有效查询），则重新评估产品方向
- 依据：1 人 7 周投入，8 周观察期
- 架构扩展上限：单机可支撑 3-5 个并发会话（受 LLM API rate limit 约束），关停线远低于此上限

---

## 4. 还不确定的

### 4.1 Open Questions

**来自 06 架构基线决策的 5 个遗留问题**：

| # | 问题 | 影响 | 建议默认立场 |
|---|------|------|-------------|
| OQ1 | pi-web fork 后的仓库策略：独立 `datus-web` 仓库 vs Datus-agent monorepo 内？ | CI/CD 流程、版本管理、协调成本 | 独立仓库；M1 前确认 |
| OQ2 | jsonl schema 长期一致性保证：TS ↔ Python 双语镜像如何防漂移？ | 前后端事件 schema 不一致导致消息渲染失败 | M1 先手动对齐 10 个事件类型；v1.1 评估 schema registry |
| OQ3 | SSE 直连 vs BFF 转发：前端直连 FastAPI 省一跳 vs BFF 架构更统一 | 延迟、缓冲风险、部署复杂度 | M2 开始前做技术预研；默认 BFF |
| OQ4 | pi-web 上游同步策略：fork 后彻底断开 vs 定期 cherry-pick？ | bugfix 获取和代码维护成本 | 彻底断开 |
| OQ5 | v2 Plan/Act 模式：Cline 状态机是否值得引入？对 jsonl schema 有何影响？ | v2 功能规划 | MVP 不做；jsonl schema 预留 `mode` 字段 |

**新增产品级 Open Questions**：

| # | 问题 | 影响 | 建议默认立场 |
|---|------|------|-------------|
| OQ6 | Schema Browser 的 Schema 数据来源：调 Datus 现有接口还是前端独立缓存？ | 加载速度和数据新鲜度 | 沿用 Datus 现有接口；M4 验证性能 |
| OQ7 | 基础图表的 spec 由谁生成：Agent 生成 ECharts JSON 还是前端自动推断？ | 图表灵活度和 Agent 工具设计 | Agent 生成 ECharts option JSON（Datus `create_chart` 已有此能力） |
| OQ8 | 工作目录与 Datus 现有 `project_name` 的映射规则是否需要在 MVP 中统一？ | 会话归错目录 | M1 即统一：project_name 从 cwd 派生，前端只信任 jsonl 里的 cwd |

### 4.2 依赖与约束（产品级）

| # | 依赖/约束 | 类型 | 影响范围 | 缓解 |
|---|----------|------|---------|------|
| D1 | Datus Agent `datus web --api-only` 命令需可用 | 外部 API | 整个 MVP | M1 前确认；bin 脚本做 PATH 探测 |
| D2 | LLM API 可用性 | 外部 API | 所有对话功能 | Datus 现有 provider 体系已处理 |
| D3 | npm 发版权限（`@datus/web` 包名） | 平台政策 | 部署形态 | M4 前确认；备选 `@datus-ai/web` |
| D4 | pi-web MIT 协议无变更 | 合规 | 整个 fork 基座 | fork 前做 license 最终确认 |
| D5 | Datus 现有 FastAPI 接口兼容性 | 外部 API | Agent 联通 + SSE 转发 | M2 开始前列举端点，确认协议稳定 |
| D6 | 用户本地已安装 Python + datus-agent | 环境约束 | 启动体验 | bin 脚本检测 + 安装引导 |

---

## 5. 里程碑与交付节奏

| 里程碑 | 验收形态 | 人日 |
|--------|---------|------|
| M1：地基 | Fork pi-web + 改名 + 三栏布局可见 + 工作目录可切换 + Python 子进程 spawn | 8 |
| M2：Agent 联通 | SSE BFF 转发跑通端到端 + 会话列表可见 + 流式对话正常 | 8 |
| M3：会话持久化 + 分支 | JSONL 读写/fork/branch + BranchNavigator + 文件浏览器 + workspaces.json | 7 |
| M4：数据工作台特性 | SQL 结果表 + 基础图表 + 简化 Schema Browser + datasource 选择器 + npm 发版 | 7.5 |
| **合计** | | **30.5** |

Buffer：3.5 人日，用于 SSE 联调风险、迁移脚本、意外问题。Should 项（3.5 人日）视 buffer 消耗情况决定是否纳入。

---

## 6. 禁止重开的话题

- 架构基线（用什么 fork / 复合方案）—— 06 已决定
- 技术选型（用什么框架 / 库）—— 留给 spec-kit /plan
- 06 中已被否决的方案（Vercel AI Chatbot / assistant-ui / 全自建 / HTMX / Notebook / Tauri）—— 不旧事重提

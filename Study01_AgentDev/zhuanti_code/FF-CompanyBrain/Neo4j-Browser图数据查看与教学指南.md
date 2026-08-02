---
document_type: learning_note
course: 第四节课
topic: Neo4j Browser 图数据查看与 GraphRAG 教学演示
status: 可作为课件输入
evidence_date: 2026-07-22
project: /Users/mac/Git/ff-companybrain
---

# 第四节课 · Neo4j Browser 图数据查看与教学指南

> 用途：帮助讲师和学员使用 Neo4j Browser 查看 FF-CompanyBrain 的 GraphRAG 图数据，并理解“节点、关系、属性、workspace 和来源溯源”。本文不是 Neo4j 运维手册，也不把当前教学项目描述成生产级图数据库平台。

## 1. 一句话结论

Neo4j Browser 是本项目的**图数据开发者观察台**：通过 Cypher 查询 Neo4j 中的节点和关系，并把结果显示成图或表格。

本项目中需要同时理解两个入口：

| 入口 | 当前开发机地址 | 作用 |
| --- | --- | --- |
| Neo4j Browser | `http://127.0.0.1:17474/browser/` | 提供网页界面、Cypher 编辑器和图形化结果 |
| Neo4j Bolt | `bolt://127.0.0.1:17687` | Browser、驱动程序和数据库工具真正执行图查询的通信协议 |

它们连接的是**同一个 Neo4j 容器和同一份图数据**，不是两套数据库。打开 Browser 页面后，连接地址填写 `127.0.0.1:17687`，用户填写 `neo4j`，密码取私有 `deploy/compose/.env` 中的 `NEO4J_PASSWORD`，禁止把真实密码写入课件或截图。

## 2. 先建立正确的项目边界

FF-CompanyBrain 的 GraphRAG 并不是把所有数据都放进 Neo4j：

```text
GraphRAG
├── Neo4j：实体节点、实体关系、workspace 图隔离
└── PostgreSQL + pgvector：业务记录、文档状态、KV、向量和检索辅助数据
```

因此：

- Neo4j Browser 适合查看“谁和谁有关、关系含义是什么、来源片段在哪里”。
- PostgreSQL 客户端适合查看 source/document 业务记录、向量表和处理状态。
- Neo4j Browser 不是学员使用的业务前台，也不是完整项目管理后台。

源码依据：

- `/Users/mac/Git/ff-companybrain/modules/graph-rag/src/graph_rag/core/lightrag_service.py`：按 source workspace 创建 LightRAG，图存储为 `Neo4JStorage`，其他存储仍为 PostgreSQL。
- `/Users/mac/Git/ff-companybrain/modules/graph-rag/src/graph_rag/core/neo4j_boundary.py`：运行数据库固定为 `neo4j`，并禁止用全局 `NEO4J_WORKSPACE` 覆盖 source 隔离。
- `/Users/mac/Git/ff-companybrain/docs/SERVICE_BOUNDARIES.md`：平台/API/Gateway 不直接访问 GraphRAG 数据库，需通过 GraphRAG 模块边界。

## 3. 当前真实图数据快照

截至 2026-07-22，当前 Docker Neo4j 中实际有：

```text
节点：5
关系：6
实际有节点的 workspace label：gsrc_d57ec3d6e575b759
关系类型：DIRECTED
来源文件：m5-graph-source.md
```

当前节点：

| entity_id | entity_type | 说明 |
| --- | --- | --- |
| `M5` | `artifact` | 当前验收系统/项目框架中心实体 |
| `GraphRAG` | `method` | 图增强检索生成技术 |
| `M5 GraphRAG验收素材` | `content` | M5 GraphRAG 链路教学素材 |
| `天枢交付` | `concept` | M5 中的 GraphRAG 专案概念 |
| `林知` | `person` | 验收素材中的项目负责人 |

可以把当前图理解成：

```text
GraphRAG ──→ M5
GraphRAG ──→ M5 GraphRAG验收素材
M5 ──→ M5 GraphRAG验收素材
M5 ──→ 天枢交付 ──→ 林知
M5 ──→ 林知
```

这是一份用于 M5 真实链路验证的**小型教学 fixture**，不能把“当前只有 5 个节点”误讲成系统只能处理 5 个节点。

### 3.1 `gsrc_...` 为什么不是业务类型

`gsrc_d57ec3d6e575b759` 是 GraphRAG 为某个 source 分配的 workspace label，作用是隔离不同资料源的图。它相当于“资料房间编号”，不是“人物、公司、方法”等业务分类。

真正的业务分类保存在节点属性 `entity_type`：

```text
person / method / artifact / content / concept
```

教学时要明确区分：

```text
Neo4j label（gsrc_...） = 技术隔离边界
entity_type 属性       = 业务语义类型
```

### 3.2 `m2b_bootstrap` 为什么显示但没有节点

Browser 左侧可能显示 `m2b_bootstrap` label，但当前按节点实际统计只有 `gsrc_d57ec3d6e575b759` 的 5 个节点。

`m2b_bootstrap` 来自迁移容器的一次性 LightRAG/Neo4j 存储初始化：

```text
/Users/mac/Git/ff-companybrain/deploy/database/migrate/graph_setup.py
workspace="m2b_bootstrap"
```

它是初始化痕迹，不是当前业务知识图谱，不应作为课堂查询重点。

### 3.3 为什么所有关系都叫 `DIRECTED`

当前 LightRAG 图存储使用通用有向关系 `DIRECTED`。真正的业务含义主要看关系属性：

- `description`：关系用自然语言表达的含义；
- `weight`：关系权重；
- `source_id`：关系来自哪个文本片段；
- `file_path`：来源文件（视具体节点/关系属性而定）。

因此不要只讲“有一条 DIRECTED 边”，而应讲：

> 起点是谁 → 关系说明是什么 → 终点是谁 → 证据来自哪里。

## 4. 页面各区域怎么使用

| 页面区域 | 功能 | 当前优先级 | 教学口径 |
| --- | --- | --- | --- |
| 顶部 Instance / Database / User | 确认连接实例、数据库和当前用户 | 高 | 先确认连接的是 `127.0.0.1:17687`、数据库是 `neo4j` |
| 左侧 Database information | 查看节点数、关系数、labels、关系类型和属性键 | 高 | 用来快速认识图的结构，不代表已经看懂业务语义 |
| 中间 `neo4j$` 编辑器 | 输入并运行 Cypher | 最高 | 这是主要操作区，点击蓝色运行按钮或按 `Cmd/Ctrl + Enter` |
| Result frame：Graph | 将返回的节点和关系显示成图 | 最高 | 用于解释局部关系、中心节点和路径 |
| Result frame：Table | 将查询结果显示成表 | 高 | 用于核对字段、来源、权重和计数 |
| Result frame：RAW | 查看原始响应和排障信息 | 低 | 一般教学不必优先使用 |
| Saved Cypher（书签） | 保存常用查询 | 中 | 建议保存为“01-图规模”“02-全图”“03-来源溯源” |
| History（时钟） | 查看本浏览器执行过的查询 | 中 | 是本机查询历史，不是系统业务审计日志 |
| Cypher Reference（书本） | 查询 Cypher 语法 | 中 | 忘记 MATCH/WHERE/RETURN 时使用 |
| Parameters（`{}`） | 为参数化查询准备值 | 低 | 图规模变大、需要按 source 查询时再讲 |
| Settings（齿轮） | 调整结果数量、历史、图渲染上限等 | 低 | 当前 5 节点图不必调整 |
| AuraDB 引导卡 | Neo4j 云产品入口 | 不需要 | 当前课程使用本地 Docker，不必连接 AuraDB |

### 4.1 Result frame 的核心交互

- 点击节点：查看 `entity_id`、`entity_type`、`description`、`source_id` 等属性。
- 点击关系：查看 `description`、`weight` 和来源属性。
- 拖拽节点：调整图的展示位置，不会修改数据库。
- 双击或右键节点：展开相邻节点；它只是扩展当前可视化结果。
- Graph 视图适合理解结构，Table 视图适合核对字段。
- 查询结果太多时应先加 `LIMIT`，不要一次返回整库数据。

## 5. 课堂实操：15 分钟掌握 Browser

### 步骤 0：先切到只读模式

在编辑器运行：

```cypher
:access-mode read
```

这能减少课堂演示时误执行写操作的风险。

### 步骤 1：确认图规模

```cypher
MATCH (n)
OPTIONAL MATCH ()-[r]->()
RETURN count(DISTINCT n) AS 节点数,
       count(DISTINCT r) AS 关系数;
```

预期结果：

```text
节点数 = 5
关系数 = 6
```

这条查询返回标量，应看 Table 视图，不会显示关系图。

### 步骤 2：显示完整教学图

```cypher
MATCH (a)-[r:DIRECTED]->(b)
RETURN a, r, b
LIMIT 50;
```

运行后切换到 Graph 视图：

1. 点击 `M5` 节点，查看它的属性；
2. 点击 `M5 → 林知` 的关系，查看 `description`；
3. 拖动节点整理布局；
4. 观察箭头方向，区分起点和终点。

### 步骤 3：围绕中心实体查看两跳关系

```cypher
MATCH path = (m {entity_id: 'M5'})-[*1..2]-(related)
RETURN path;
```

教学重点：

- `M5` 是中心实体；
- `*1..2` 表示查找一跳到两跳邻居；
- 查询的是“局部子图”，不是把数据库全部加载进浏览器。

### 步骤 4：按业务类型统计节点

```cypher
MATCH (n)
RETURN n.entity_type AS 类型,
       count(*) AS 数量
ORDER BY 数量 DESC, 类型;
```

教学重点：业务类型来自 `entity_type`，不是 `gsrc_...` workspace label。

### 步骤 5：查看节点来源

```cypher
MATCH (n)
RETURN n.entity_id AS 实体,
       n.entity_type AS 类型,
       n.description AS 说明,
       n.file_path AS 来源文件,
       n.source_id AS 来源片段
ORDER BY 类型, 实体;
```

教学重点：知识图谱不是只有“好看的连线”，还应能回答“这个实体从哪份资料、哪个片段抽取出来”。

### 步骤 6：查看关系的真实语义

```cypher
MATCH (a)-[r:DIRECTED]->(b)
RETURN a.entity_id AS 起点,
       r.description AS 关系含义,
       b.entity_id AS 终点,
       r.weight AS 权重,
       r.source_id AS 来源片段
ORDER BY 起点, 终点;
```

这条查询适合切换到 Table 视图逐条讲解。

### 步骤 7：查看图结构模式

```cypher
CALL db.schema.visualization();
```

当前结构很小，主要会看到 workspace label 与 `DIRECTED` 关系。此图展示的是数据库 schema/标签结构，不等于业务知识图的完整内容。

## 6. 建议保存的教学查询

在 Saved Cypher 中新建“GraphRAG 教学”文件夹，保存：

```text
01-图规模
02-显示完整教学图
03-M5两跳关系
04-业务类型统计
05-节点来源溯源
06-关系语义与权重
```

这样课堂不需要反复手输，History 仍保留临时尝试，Saved Cypher 保存正式演示语句。

## 7. 学员必须理解的三问模型

每次点击一个节点或关系，都让学员回答：

1. **它是什么？** 看 `entity_id + entity_type`。
2. **它为什么与另一个实体有关？** 看关系方向、`description + weight`。
3. **这个结论从哪里来？** 看 `file_path + source_id`。

这是本节最重要的学习输出，比记住 Browser 每个按钮更有价值。

## 8. 常见误解与回答

| 学员问题 | 正确回答 |
| --- | --- |
| Browser 和 Bolt 是两套数据库吗？ | 不是。Browser 是网页工具，Bolt 是它查询同一 Neo4j 的通信协议。 |
| 左侧 `gsrc_...` 是实体类型吗？ | 不是。它是 source workspace 隔离标签；实体类型看 `entity_type`。 |
| 为什么 `m2b_bootstrap` 显示出来但查不到节点？ | 它是迁移初始化 workspace 的痕迹，当前实际业务节点为 0。 |
| 为什么所有边都叫 `DIRECTED`？ | 这是通用有向边类型，业务语义在关系的 `description` 等属性中。 |
| 为什么只有 5 个节点？ | 当前是 M5 验收教学 fixture，不代表系统容量或完整生产数据。 |
| Neo4j 里为什么找不到向量表和文档状态？ | 这些数据在 PostgreSQL/pgvector；Neo4j 只负责图结构。 |
| 可以直接在 Browser 修改数据吗？ | 技术上可以，但本课只读观察；业务数据应经 GraphRAG 的受控入库/删除流程。 |
| History 是审计日志吗？ | 不是。它只是当前浏览器本地保存的查询历史。 |

## 9. 安全边界

课堂阶段只运行 `MATCH`、`RETURN`、只读 `CALL db.*` 和 Browser 命令。

不要随手执行：

```cypher
CREATE
MERGE
SET
DELETE
DETACH DELETE
DROP
```

原因：Browser 当前以 Neo4j 管理账号连接，误操作会直接改变 Docker 数据卷中的真实图数据。项目的 source 删除还涉及 Neo4j 与 PostgreSQL 的持久化 Saga，不能在 Browser 中只删一侧图节点。

## 10. 五分钟讲解口径

> Neo4j Browser 是开发人员查看知识图谱的工具。中间写 Cypher，下面看查询结果；Graph 视图看节点和连线，Table 视图看属性和来源。当前这份 M5 教学图有 5 个实体、6 条关系。`gsrc_...` 不是人物或公司类型，而是每份资料独立的 workspace 标签；真正类型在 `entity_type`。关系虽然统一叫 `DIRECTED`，但含义写在 `description`。GraphRAG 的图结构在 Neo4j，向量、文档状态和业务记录仍在 PostgreSQL，所以两边一起构成完整 GraphRAG 数据层。

## 11. 后续可扩展教学

当前 Browser 入门完成后，可以继续扩展：

1. 新上传一份 GraphRAG 文档，比较入库前后的节点、边和来源字段；
2. 建立两个 source，观察两个不同 `gsrc_...` workspace，解释资源隔离；
3. 在前台删除一个 source，再检查 Neo4j 图和 PostgreSQL 记录如何一起收敛；
4. 对比 Graph 视图与 GraphRAG 最终问答，解释“结构检索如何支持答案”；
5. 使用 `EXPLAIN` / `PROFILE` 学习查询执行计划，但不作为本节入门重点。

## 12. 事实核查来源

项目源码：

- `/Users/mac/Git/ff-companybrain/modules/graph-rag/src/graph_rag/core/lightrag_service.py`
- `/Users/mac/Git/ff-companybrain/modules/graph-rag/src/graph_rag/core/neo4j_boundary.py`
- `/Users/mac/Git/ff-companybrain/deploy/database/migrate/graph_setup.py`
- `/Users/mac/Git/ff-companybrain/deploy/compose/compose.dev-ports.yml`
- `/Users/mac/Git/ff-companybrain/docs/SERVICE_BOUNDARIES.md`

Neo4j 官方文档：

- Browser visual tour：https://neo4j.com/docs/browser/visual-tour/
- Result frames：https://neo4j.com/docs/browser/operations/result-frames/
- Browser commands：https://neo4j.com/docs/browser/reference-commands/
- Browser settings：https://neo4j.com/docs/browser/operations/browser-settings/

## 13. 后续课件流水线建议

- 课件类型：数据库与 GraphRAG 融合应用实操。
- 最佳演示顺序：连接成功 → 只读模式 → 全图 → 中心实体两跳 → 来源溯源 → PostgreSQL/Neo4j 边界。
- 必须保留当前 5 节点图作为轻量入门，不要一开始导入大图增加认知负担。
- 正式课件截图要遮盖密码、token 和 `.env` 内容。
- 若后续运行 `courseware-pipeline-team`，本文件与 `第四节课-DockerCompose一键部署-课件输入.md` 可作为同一基础设施与数据层章节的输入材料。

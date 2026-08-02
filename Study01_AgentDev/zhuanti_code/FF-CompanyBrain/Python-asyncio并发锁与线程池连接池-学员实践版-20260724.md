---
title: Python Agent 并发实践：锁、线程池与连接池
date: 2026-07-24
type: learner-guide
domain: 工程实践
tags:
  - Python
  - asyncio
  - FastAPI
  - Agent
  - 并发
  - 线程池
  - 连接池
  - 锁
audience: 已会 Python 基础与 async/await，正在开发 Agent / FastAPI 服务的学员
source:
  - "[[Python-asyncio并发锁与线程池连接池最佳实践-20260718]]"
  - Python / Starlette / AnyIO / psycopg 官方文档（见文末）
status: learner-edition
---

# Python Agent 并发实践：锁、线程池与连接池

> 这是一份面向学员的实践版。它不替代原始调研稿，而是把原稿压缩为一条可执行的学习路径：先判断代码运行在哪，再决定要不要加锁、要不要进线程池、并发上限该由谁控制。

## 先给结论

当一个 Agent 同时处理多个请求、工具调用或定时任务时，最容易犯的错误不是“线程开得不够多”，而是没有区分三件事：

1. 共享状态是否会被多个执行单元同时修改；
2. 当前代码是在事件循环、操作系统线程，还是数据库连接中运行；
3. 下游真实容量是多少，谁负责把并发量限制在这个容量以内。

记住这四条，就能避开大部分事故：

- 临界区跨过 await，且只在同一个事件循环内竞争：使用 asyncio.Lock。
- 临界区会被多个操作系统线程进入：使用 threading.Lock。
- 同步阻塞 I/O 不能直接写进 async def：先用 asyncio.to_thread 或专用线程池隔离。
- Semaphore 负责“前置节流”，ConnectionPool 负责“复用和封顶连接”；二者不能互相替代。

---

## 1. 这篇要解决什么问题

### 1.1 典型 Agent 场景

假设你有一个每天运行的工业预警 Agent：

1. 读取当天的设备、订单和告警数据；
2. 并发调用多个工具或数据源；
3. 汇总结果后交给模型生成预警说明；
4. 将结果写回数据库，并发送通知。

当多个任务在同一时刻到来时，可能出现：

- 同一个工厂的“规则索引”被重复初始化；
- async 路由里直接执行同步数据库查询，导致整个事件循环被卡住；
- 一次性创建 500 个查询任务，数据库连接池只有 10 条连接；
- 以为取消了协程，实际上已经开始执行的线程查询还在占连接；
- 多进程部署后，连接总数超过数据库的 max_connections。

这些都不是模型问题，而是并发控制和资源预算问题。

### 1.2 先画出运行域

把下面这张图记住。选锁和选池之前，先回答“代码此刻在哪个域里运行”。

~~~text
请求 / 定时任务 / Agent run
            │
            ▼
事件循环：很多协程轮流推进，不应被同步阻塞调用卡住
    ├─ 原生异步 I/O：直接 await
    ├─ 跨 await 的共享状态：asyncio.Lock
    └─ 同步阻塞 I/O：提交给线程池
                         │
                         ▼
操作系统线程：同步函数真正执行的位置
    ├─ 跨线程共享状态：threading.Lock
    └─ 同步数据库驱动：从连接池借连接
                         │
                         ▼
数据库连接池：复用连接，并限制实际连接数
~~~

不要把这三个概念混在一起：

| 概念 | 它解决什么 | 它不解决什么 |
|---|---|---|
| Lock | 同一份共享状态不能被同时错误修改 | 请求限流、连接复用 |
| ThreadPoolExecutor | 把同步阻塞工作移出事件循环 | 数据库连接上限 |
| Semaphore | 限制某段异步流程同时“放行”多少个 | 连接生命周期与连接复用 |
| ConnectionPool | 复用数据库连接、限制真实连接数 | 非数据库工具调用的限流 |

---

## 2. 每次写并发代码，先回答五个问题

不要先问“该用哪种库”，按顺序回答以下问题。

| 问题 | 你的答案 | 典型选择 |
|---|---|---|
| 1. 我要保护共享状态，还是要限制并发量？ | 状态正确性 / 资源容量 | Lock / Semaphore 或 Pool |
| 2. 临界区会不会跨 await？ | 会 / 不会 | 会：asyncio.Lock；不会且跨线程：threading.Lock |
| 3. 调用是原生异步还是同步阻塞？ | async I/O / sync I/O / CPU 密集 | 直接 await / to_thread 或专用池 / ProcessPoolExecutor |
| 4. 下游资源的真实容量是什么？ | DB 连接、外部 API QPS、GPU 任务数等 | 以真实容量做预算，设置前置节流 |
| 5. 取消、超时和失败后，已经开始的工作怎么办？ | 可撤销 / 不可撤销 / 有副作用 | deadline、幂等键、补偿或事务，而不是盲目重试 |

### 一张最短决策表

| 看到的代码或需求 | 首选方式 | 不要这样做 |
|---|---|---|
| async 函数里要调用同步 SDK、requests、同步 DB | asyncio.to_thread 或专用 executor | 直接调用同步函数 |
| 同一 key 的缓存或索引需要异步冷启动 | 同一事件循环内的 asyncio.Lock | 用 threading.Lock 包住 await |
| 多个线程可能同时初始化同步单例 | threading.Lock | 把 asyncio.Lock 传进线程 |
| 批量查询、工具调用、恢复任务要有上限 | asyncio.Semaphore | 让任务数量无上限地同时冲向下游 |
| 要限制数据库实际连接数 | ConnectionPool | 把 Semaphore 当成连接池 |
| 纯 Python 的 CPU 密集计算 | ProcessPoolExecutor、拆分算法或专用计算服务 | 以为线程池会让它在 GIL 下并行 |

---

## 3. 从一个 Agent 任务走一遍

设定一条明确的资源预算：

~~~text
单个进程
├─ 数据库连接池 max_size = 8
├─ DB 专用线程池 max_workers = 8
├─ DB 前置 Semaphore = 8
└─ 外部告警 API 同时请求数 = 5
~~~

这不是“8 永远正确”，而是一个可解释的起点：这条同步 DB 路径最多会有 8 个工作线程真正去借 8 条连接。若连接池由其他路由、其他进程或其他服务共享，必须按全局预算重新计算，不能只看这一段代码。

### 3.1 推荐的工作流

~~~text
接收一批任务
  → 校验任务和幂等键
  → 有界并发拉取数据 / 调工具
  → 汇总与校验完整性
  → 调用模型生成解释
  → 单次、可追踪地写入结果
  → 发送通知
~~~

并发适合用在“彼此独立的 I/O 等待”上；规则判断、风险决策、写入顺序和外部副作用仍要有明确的顺序与边界。Agent 不等于“把所有工具调用同时发出去”。

---

## 4. 五个应优先掌握的模式

### 模式 A：把同步阻塞 I/O 移出事件循环

若同步查询或同步 SDK 运行在 async def 中，它会占住事件循环线程；同一 worker 上的其他协程也无法继续推进。

~~~python
import asyncio


def blocking_lookup(rule_id: str) -> dict:
    # 这里代表同步 SDK、同步数据库驱动或文件 I/O。
    # 真实项目中要配置自身的超时。
    return {"rule_id": rule_id, "status": "ok"}


async def lookup_rule(rule_id: str) -> dict:
    return await asyncio.to_thread(blocking_lookup, rule_id)
~~~

何时够用：

- 低频或中低并发的同步 I/O；
- 迁移中的旧 SDK；
- 不值得立刻重写为异步驱动的边缘路径。

何时应该进一步设计：

- 某类阻塞调用长期占满默认线程池；
- 慢 HTTP、文件、DB 查询彼此抢同一批线程；
- 高峰期的排队时间和超时明显上升。

此时按资源类型拆分专用 executor，或迁移热点路径到原生异步驱动。不要把“线程池默认大小”当作系统容量承诺；它会随 Python 版本、容器 CPU 配额和部署拓扑变化。

### 模式 B：同一个事件循环内，用 per-key asyncio.Lock 防重复冷启动

这是“同一个知识库索引、同一个工厂规则、同一个租户客户端只初始化一次”的常见模式。

~~~python
import asyncio

_services: dict[str, object] = {}
_locks: dict[str, asyncio.Lock] = {}


async def build_service(key: str) -> object:
    await asyncio.sleep(0.1)  # 代表异步建连、加载索引或远程初始化
    return object()


async def get_service(key: str) -> object:
    cached = _services.get(key)
    if cached is not None:
        return cached  # 热路径：命中后直接返回

    # 前提：这两个 dict 只由同一个事件循环线程访问。
    lock = _locks.setdefault(key, asyncio.Lock())
    async with lock:
        cached = _services.get(key)
        if cached is not None:
            return cached  # 其他协程可能已经建好

        service = await build_service(key)
        _services[key] = service
        return service
~~~

为什么要二次检查：任务 A 等待初始化时，任务 B 也可能已经通过锁并完成初始化；B 获得锁后必须重新读取缓存。

边界要说清：

- asyncio 同步原语不是线程安全工具，只能在它所属的事件循环线程内使用。
- 上例中的 setdefault 只是“单事件循环拥有该注册表”时的简化写法；如果工作线程也会读写这两个 dict，就必须改成线程锁保护，或把所有状态操作切回同一个事件循环。
- 这不是让你给所有缓存都上锁。只有“缓存未命中后会发生昂贵且可重复的初始化”时才需要。

### 模式 C：跨线程的同步单例，用 threading.Lock

如果同步资源会被多个线程池 worker 同时访问或延迟创建，使用 threading.Lock。为了先保证正确性，下面采用最直白的一次检查写法。

~~~python
import threading

_client: object | None = None
_client_lock = threading.Lock()


def create_sync_client() -> object:
    return object()


def get_client() -> object:
    global _client
    with _client_lock:
        if _client is None:
            _client = create_sync_client()
        return _client
~~~

重要限制：锁持有期间不能出现 await。threading.Lock 的竞争会阻塞整个操作系统线程；如果这个线程恰好是事件循环线程，就可能造成事件循环冻结甚至死锁。

只有在性能分析确认“每次获取锁”确实是热点后，才考虑双重检查锁优化；不要因为听说有 GIL，就删除同步资源初始化所需的锁。

### 模式 D：用 Semaphore、专用线程池和连接池共同守住 DB 容量

下面示例适用于“同步数据库驱动 + 异步服务”的过渡方案。生产代码应把 executor 和连接池放进应用生命周期统一创建与关闭。

~~~python
import asyncio
from concurrent.futures import ThreadPoolExecutor

MAX_DB_CONNECTIONS = 8
db_executor = ThreadPoolExecutor(
    max_workers=MAX_DB_CONNECTIONS,
    thread_name_prefix="db",
)
db_slots = asyncio.Semaphore(MAX_DB_CONNECTIONS)


def query_sync(sql: str) -> list[dict]:
    # 真实实现：从 ConnectionPool 借连接，执行 SQL，并在 finally 中归还。
    return [{"sql": sql}]


async def query(sql: str) -> list[dict]:
    loop = asyncio.get_running_loop()
    async with db_slots:
        return await loop.run_in_executor(db_executor, query_sync, sql)
~~~

三层分别承担不同职责：

| 层 | 作用 | 这里为什么设为 8 |
|---|---|---|
| Semaphore | 尽量不要让大量协程先涌到借连接环节 | 给这条路径一个前置护栏 |
| ThreadPoolExecutor | 真正执行同步查询的线程数上限 | 防止线程无限堆积 |
| ConnectionPool | 可同时占用的真实数据库连接上限 | 数据库连接才是最终硬边界 |

有一个容易遗漏的取消语义：如果协程在 run_in_executor 已提交后被取消，async with 会释放 Semaphore 的令牌，但底层线程通常不会被强制杀掉，已开始的查询仍可能继续占用线程和连接。因此，真正的物理并发上限仍要依赖专用线程池 worker 数和连接池 max_size；查询本身还应有数据库侧 statement_timeout。

### 模式 E：FastAPI 用 lifespan 成对管理资源

不要在模块 import 时就创建线程池或连接池。应用启动、失败清理和优雅关闭都应该有明确的所有者。

~~~python
import asyncio
import functools
import os
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI
from psycopg_pool import ConnectionPool

MAX_DB_CONNECTIONS = 8
conninfo = os.environ["DATABASE_URL"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db_pool = ConnectionPool(
        conninfo,
        min_size=2,
        max_size=MAX_DB_CONNECTIONS,
        open=False,
    )
    app.state.db_executor = ThreadPoolExecutor(
        max_workers=MAX_DB_CONNECTIONS,
        thread_name_prefix="db",
    )
    app.state.db_slots = asyncio.Semaphore(MAX_DB_CONNECTIONS)

    try:
        await asyncio.to_thread(app.state.db_pool.open)
        await asyncio.to_thread(app.state.db_pool.wait, 30)
        yield
    finally:
        executor = getattr(app.state, "db_executor", None)
        if executor is not None:
            await asyncio.to_thread(
                functools.partial(
                    executor.shutdown,
                    wait=True,
                    cancel_futures=True,
                )
            )

        pool = getattr(app.state, "db_pool", None)
        if pool is not None:
            await asyncio.to_thread(pool.close)


app = FastAPI(lifespan=lifespan)
~~~

这段代码表达的是资源所有权，不是固定配置：

- 连接池和 executor 必须由同一个生命周期创建和关闭；
- 启动阶段显式等待最小连接就绪，让连接错误尽早暴露；
- 关闭前先停止 executor 接收新工作，再关闭连接池；
- 生产环境还应先从负载均衡摘除实例，避免关闭过程仍持续接收新请求。

---

## 5. FastAPI 中最容易混淆的两类线程资源

在 FastAPI / Starlette 项目中，至少要分清下面两种来源：

| 来源 | 谁会使用它 | 重点 |
|---|---|---|
| AnyIO / Starlette 的线程限流器 | def 同步路由、部分同步依赖、文件处理、后台任务等 | 默认 token 数为 40；它不等于 asyncio 默认 executor |
| asyncio 默认 executor | asyncio.to_thread 与 run_in_executor(None, ...) | 默认 worker 数由 Python 版本和 CPU 配额决定 |
| 自建 ThreadPoolExecutor | 你显式提交的 DB、HTTP、embedding 等专用工作 | 由你命名、限额、监控和关闭 |

因此，“我的服务有 40 个线程”通常不是一个准确结论。排障时要先标明每个阻塞调用落在哪个池，再看该池的排队时间、活跃 worker、超时和下游资源占用。

### 路由选型的简单规则

| 路由主要工作 | 推荐写法 |
|---|---|
| 原生 async 数据库或 HTTP 调用 | async def + 直接 await |
| 同步阻塞 I/O，逻辑简单 | def 路由，接受 Starlette 的托管线程策略 |
| 同步阻塞 I/O，但端点内还要组合多个异步步骤 | async def + 明确地投到 to_thread 或专用 executor |
| 纯 Python CPU 密集计算 | 进程池、独立计算服务或算法优化 |

---

## 6. 容量不是一个常数，而是一笔总账

### 6.1 多进程时先算数据库总连接数

例如：

~~~text
2 个应用副本 × 每副本 4 个 worker × 每 worker 连接池 max_size 8
= 最坏情况下 64 条应用连接
~~~

若数据库还需要保留管理连接、迁移任务、BI 查询和故障余量，64 很可能不是可以直接配置的数字。部署前应确认：

~~~text
应用副本数 × worker 数 × 单 worker 的 pool max_size
  + 管理与预留连接
≤ 数据库允许的可用连接预算
~~~

### 6.2 每层都要有自己的 deadline

一次任务的总超时不能只靠 HTTP 网关。建议分别设置并记录：

- 请求或定时任务的总 deadline；
- 等待 Semaphore / 线程池排队的时长；
- 借数据库连接的 timeout；
- SQL 的 statement_timeout；
- 外部 HTTP / 工具调用的连接、读取与总体超时。

超时后不要对所有失败无脑重试。重试必须同时满足：操作幂等、次数有上限、带退避和 jitter，并且不会让已拥塞的下游更拥塞。

---

## 7. 给自己的编码 Agent 的使用说明

不要只把本文丢给 Agent 并要求“优化并发”。应要求它先做运行域和容量审计，再提出最小改动方案。

### 7.1 可直接复用的审查提示词

~~~text
你正在审查一个 Python Agent / FastAPI 服务的并发代码。

先不要改代码。请逐项输出：
1. 每个关键函数所在的运行域：事件循环、默认线程池、自建线程池、进程池或数据库连接池；
2. 每个共享状态的所有者，以及它是否可能跨 await 或跨 OS 线程竞争；
3. 每个阻塞调用的位置、所属线程池和下游资源；
4. 连接预算：副本数、worker 数、每 worker pool max_size，以及总连接上限；
5. 取消、超时、重试和副作用的风险；
6. 仅在信息充分时给出最小补丁；若缺少 Python 版本、部署 worker 数、驱动类型或数据库容量，先列出假设与待确认项。

硬性约束：
- 不得用 threading.Lock 包住 await；
- 不得在线程中使用 asyncio.Lock 或 asyncio.Semaphore；
- 不得在 async def 中直接执行同步阻塞 I/O；
- 不得把 Semaphore 当作 ConnectionPool；
- 不得仅凭 CPU 核数或默认线程池大小提高并发；
- 不得把取消协程误写成“已停止底层线程或 SQL”。

输出格式：
- 风险表：位置、风险、证据、影响、最小修复；
- 资源预算表；
- 修改后的最小代码片段；
- 需要补充验证的测试与监控项。
~~~

### 7.2 Agent 的合格答案应该长什么样

合格答案会明确说出“这个同步查询发生在 async 路由内，因此需要被隔离到哪个 executor”，并且会计算连接总账。它不会只给出“加一个 Lock”或“把并发改成 100”这样的孤立建议。

信息不足时，Agent 应暂停结论并追问，例如：

- 当前是 Python 3.11、3.13 还是 free-threaded build？
- 应用部署了几副本、每副本多少 worker？
- 使用的是同步 psycopg、psycopg async、asyncpg，还是其他驱动？
- 数据库允许多少可用连接？
- 此操作是只读、幂等写入，还是会触发不可逆外部动作？

---

## 8. 五个高频反模式

| 反模式 | 为什么危险 | 改法 |
|---|---|---|
| 在 async def 中直接调用同步 DB / requests / time.sleep | 卡住事件循环，其他协程无法推进 | to_thread、专用 executor 或异步驱动 |
| 用 threading.Lock 包住 await | 锁竞争可能冻结事件循环并死锁 | 同一事件循环内改用 asyncio.Lock |
| 在线程池 worker 中 acquire asyncio.Lock | asyncio 同步原语不是线程安全工具 | 跨线程状态使用 threading.Lock |
| 让 Semaphore 远大于连接池 | 大量任务会卡在借连接，排队和超时被放大 | 按真实路径的可用容量预算 |
| 对 PoolTimeout / 超时无限重试 | 失败流量会反过来压垮已经拥塞的下游 | 有界重试、退避、jitter、熔断或降级 |

还有一个隐藏反模式：一次性创建非常多的协程，即使你在内部加了 Semaphore。Semaphore 能限制正在执行的工作数量，但不能减少你已创建的任务对象数。面对未知或很大的输入流，应使用队列和固定数量的 worker，而不是一次 gather 数十万项。

---

## 9. 上线前的最小验证清单

### 代码层

- [ ] 每个临界区都能说明：它跨 await，还是跨 OS 线程？
- [ ] 每个同步阻塞调用都有明确去向：AnyIO、asyncio 默认 executor，还是自建 executor？
- [ ] 每个 ConnectionPool 都有创建、就绪检查、关闭和超时策略。
- [ ] 每个批量任务都有失败语义：是否允许部分成功，副作用如何提交或补偿？

### 压力与故障层

- [ ] 同一个 key 被 20 个协程同时请求时，只初始化一次。
- [ ] 慢同步调用不会拖死健康检查和其他 async 路由。
- [ ] DB 达到连接上限时，系统表现为可观测的排队、超时或降级，而不是无限堆积。
- [ ] 取消请求后，已提交的线程和 SQL 行为符合预期。
- [ ] 多副本、多 worker 的连接总数没有超过数据库预算。

### 观测层

至少记录：线程池排队与活跃数、连接池借还等待时间、SQL 超时、外部调用超时、任务取消数、重试次数，以及每个 Agent run 的 trace id。没有这些数据，就很难判断该增加容量、迁移异步驱动，还是先修一个慢查询。

---

## 10. 进阶：哪些结论不能绝对化

### “超过 32 并发 DB 查询就必须改 async”不是规则

32 常常只是某些 Python 版本默认 ThreadPoolExecutor 的上限线索，不是迁移阈值。应根据线程池排队、P95/P99 延迟、连接池等待、CPU、慢查询和业务峰值判断。原生异步驱动通常更适合高并发 I/O，但不是不测量就强制全量重写的理由。

### “有 GIL，所以复合操作不会竞争”也不是规则

不要把某一版 CPython 的实现细节当作并发正确性保证。像“先检查再创建”“先读取再更新”这样的复合流程，应按它真正跨越的执行域设计互斥；未来 free-threaded Python 以及不同解释器实现更要求这一点。

### free-threading 是迁移议题，不是当前所有项目的必选项

Python 3.14 的 free-threaded 支持仍是可选能力。对大多数学员项目，更实际的目标是：今天就不要让 asyncio 原语跨线程，也不要依赖隐式串行；如要迁移，再针对依赖库、性能和测试矩阵单独评估。

---

## 11. 建议的学习与练习顺序

1. 用 15 分钟读完第 1、2 节，能画出自己的 Agent 运行域。
2. 用 20 分钟把一个同步阻塞调用改成模式 A，并确认其他请求仍能响应。
3. 用 20 分钟实现模式 B：同一 key 并发 20 次，只发生一次初始化。
4. 用 30 分钟给一个同步 DB 路径加上模式 D，并写出连接总账。
5. 最后把第 7 节提示词交给自己的编码 Agent，让它只做审计，再人工核对它的风险表。

完成标准不是“会背 API”，而是面对一段代码时能回答：谁在竞争什么、工作落在哪个池、最终资源上限是谁、超时与取消后还会发生什么。

---

## 12. 证据与版本边界

本文把容易随版本变化的结论集中在这里，便于学员和编码 Agent 复核：

- [Python asyncio 同步原语](https://docs.python.org/3/library/asyncio-sync.html)：明确说明 asyncio 的 Lock、Semaphore 等不是线程安全工具，应使用 threading 做操作系统线程同步。
- [Python asyncio Tasks 与在线程中运行](https://docs.python.org/3/library/asyncio-task.html)：查看 asyncio.to_thread、任务取消和并发任务的当前语义。
- [Python ThreadPoolExecutor](https://docs.python.org/3/library/concurrent.futures.html)：默认 max_workers 会随 Python 版本变化，不能写死为一个永恒数字。
- [Starlette Thread Pool](https://starlette.dev/threadpool/) 与 [AnyIO threads](https://anyio.readthedocs.io/en/stable/threads.html)：确认同步端点的线程限流器及其与 asyncio 默认 executor 的边界。
- [psycopg 连接池](https://www.psycopg.org/psycopg3/docs/advanced/pool.html)：确认连接池的生命周期、等待和超时行为。
- [Python 3.14 What's New](https://docs.python.org/3/whatsnew/3.14.html)：free-threading 的当前支持状态与迁移边界。

版本敏感信息的使用原则：写进生产设计前，先记录 Python、FastAPI / Starlette、AnyIO、数据库驱动和部署拓扑的实际版本；文档中的数字只能作为复核起点，不能替代实测。

---

## 13. 教师 / 助教讲授逻辑（35–45 分钟）

这一节不是要学员再背一套内容，而是告诉讲师如何把前文讲成一条连续的因果链。课堂不要按“Lock、线程池、连接池”逐个讲术语；应始终围绕同一个 Agent 场景推进：

~~~text
工业预警 Agent 同时处理多家工厂
    → 同一规则索引会不会被重复初始化？
    → 同步查询会不会卡住整个服务？
    → 多个任务会不会一起冲垮数据库？
    → 服务启动和下线时谁负责资源？
~~~

这四个问题分别自然引出 Lock、线程池、Semaphore / ConnectionPool 和 lifespan。这样学员会理解：它们不是五个零散 API，而是同一条请求链上解决不同问题的机制。

### 13.1 开场：先讲“为什么会出事故”

可以这样开场：

> 很多人一看到并发，第一反应是把线程开大，或者把函数都改成 async。今天我们不先讨论怎么跑得更快，而是先问三个问题：谁在同时改同一份状态？代码此刻在哪运行？下游到底能承受多少并发？这三件事没分清，线程开得越多，事故通常越大。

随后给出一个具体情境：20 个工厂的预警任务同一时间进入，既要查同步数据库、调用老系统，又要首次加载规则索引。让学员先猜会发生什么，再列出四种事故：

- 同一工厂的索引重复初始化；
- async 路由被同步调用卡住；
- 50 个任务争抢只有 8 条连接的数据库；
- 协程取消了，但已经提交到线程的查询还在运行。

此时不要立刻给答案。先追问：“它们都是并发问题，但会用同一把锁解决吗？”用这个问题引出运行域。

### 13.2 第二步：用“运行域”统一概念

把第 1.2 节的图画在白板上，并按从上到下的顺序解释：

~~~text
请求 / 定时任务
  → 事件循环：推进很多协程
    → 原生 async I/O：直接 await
    → 同步阻塞 I/O：交给线程池
      → 同步 DB 驱动：从连接池借连接
~~~

讲师可以用一个有限类比：

- 事件循环像总调度员；
- 线程池像代办慢活的办事员；
- 连接池像数量有限的数据库通行证；
- Lock 像同一份档案的使用锁。

随即说明类比的边界：线程数不等于连接数；拿到线程不代表一定拿到数据库连接；Lock 也不会帮你限制请求数量。

要让学员能回答一个检查题：“同步 DB 查询到底运行在哪里？”正确表述是：同步代码由线程池 worker 执行，再向连接池借数据库连接；因此三层概念不能混为一谈。

### 13.3 第三步：把“五个问题”变成唯一判断入口

不要先让学员记住 API 名称，要求他们以后看到并发代码先按下面顺序提问：

1. 我在保护共享状态，还是限制资源并发？
2. 临界区是否跨 await？
3. 调用是原生 async、同步阻塞 I/O，还是纯 Python CPU 计算？
4. 下游的真实容量是什么？
5. 取消、超时和失败后，已经开始的工作会怎样？

可以直接说：

> 这五个问题不是额外的检查清单，而是选择机制的入口。前两个问题决定用哪种锁；后三个问题决定线程池、Semaphore、连接池和 timeout 应该怎么设计。

此处只用三道题让学员现场判断，不要读完整张表：

- async 路由里直接调用同步 DB；
- 同一 key 的规则索引首次加载；
- 50 个任务访问容量为 8 的数据库。

答案会自然过渡到模式 A、B、D。

### 13.4 第四步：五种模式按“局部问题 → 系统边界”讲

#### 模式 A：先解决“别堵住事件循环”

先说误区：async def 不是自动加速器。同步 DB、同步 SDK、requests 或 time.sleep 写在 async def 里，仍会占住事件循环。

解释代码时只拆三层：

1. 同步函数仍做原来的阻塞工作；
2. asyncio.to_thread 把它交给线程池；
3. await 等待期间，事件循环可以推进其他协程。

要补上边界：to_thread 是隔离阻塞，不是把同步驱动变成原生异步驱动。当该类调用长期排队、超时上升或不同类型 I/O 相互拖累时，再考虑专用 executor 或异步驱动。

一句话收束：同步阻塞 I/O 不能裸跑在 async def 里。

#### 模式 B：再解决“同一份状态不能重复初始化”

用“同一个工厂的规则索引”解释 per-key asyncio.Lock：

1. 先查缓存，命中直接返回；
2. 每个 key 使用自己的 Lock，所以不同工厂仍能并发；
3. async with lock 只让同一个 key 的冷启动串行；
4. 进锁后再次检查缓存，避免别人已经完成初始化后又重复创建。

一定钉住边界：build_service 中有 await，所以要用 asyncio.Lock；它只在同一个事件循环内使用，不能传给线程池 worker。

一句话收束：同 key 串行、不同 key 并发，才是 per-key Lock 的价值。

#### 模式 C：区分“协程竞争”和“线程竞争”

如果多个 OS 线程都可能创建同步客户端或同步单例，才使用 threading.Lock。这里不要先讲双重检查锁等优化，只强调：持有同步锁后检查是否已创建，没有才创建。

务必给出反例：不要用 threading.Lock 包住 await。一个协程持锁后让出执行权，另一个协程竞争同步锁时，可能阻塞事件循环所在的线程，前一个协程也无法回来释放锁。

一句话收束：跨 await 的协程临界区用 asyncio.Lock；跨 OS 线程的同步状态用 threading.Lock。

#### 模式 D：把“有界并发”讲成三层漏斗

面对 50 个查询和 8 条数据库连接时，画出三层：

~~~text
Semaphore：先放行多少协程
    ↓
专用 ThreadPoolExecutor：多少同步查询真正开始执行
    ↓
ConnectionPool：多少真实数据库连接可同时占用
~~~

讲清职责：

- Semaphore 是前置护栏，不管理连接生命周期；
- executor 限制实际运行的同步工作线程；
- ConnectionPool 负责借还和复用真实连接。

“8”只是课堂中的资源预算样例，不是最佳实践常数。应按数据库可用连接、SQL 时长、部署副本和其他服务共同计算。

取消语义必须讲清：协程取消时，Semaphore 的令牌可能释放，但已进入线程池的查询未必会停止；物理并发上限最终仍依赖 executor worker 数和连接池 max_size。

一句话收束：Semaphore 管放行、线程池管执行、连接池管真实连接，三者不能互相代替。

#### 模式 E：最后讲“资源要有主人”

不要把 lifespan 讲成 FastAPI 语法题。它的本质是资源所有权：

1. 启动时创建连接池、executor 和 Semaphore；
2. 使用 open 与 wait 在接流量前确认连接可用；
3. yield 表示应用正常服务；
4. finally 中先 shutdown executor，再 close pool。

讲师可追问：“如果 import 时就建了连接池，密码错什么时候发现？服务下线时谁归还连接？”这样学员会理解生命周期不是装饰代码。

一句话收束：谁创建资源，谁负责让它可用、可观测、可关闭。

### 13.5 第五步：把 FastAPI、容量和观测讲成排障地图

不要问“系统有多少线程”，先问“这个阻塞调用落在哪个池”：

- def 同步路由通常使用 AnyIO / Starlette 的线程限流器；
- asyncio.to_thread 使用 asyncio 默认 executor；
- 显式创建的 ThreadPoolExecutor 是第三类独立资源。

再写出容量总账：

~~~text
2 个应用副本 × 每副本 4 个 worker × 每 worker pool max_size 8
= 最坏情况下 64 条应用连接
~~~

然后问学员：“如果数据库只允许 80 条连接，BI、迁移、运维和故障余量放在哪里？”让他们意识到参数不能只在单个函数里看。

取消、超时与重试可以用一句口令收束：

> 取消的是等待者，不一定是已经开始干活的执行者。

因此要分别观察总 deadline、线程池排队、借连接 timeout、SQL statement_timeout 和外部工具超时。对已经拥塞的下游无限重试，只会把局部失败放大成雪崩。

### 13.6 最后五分钟：用一题检验是否真正理解

给出题目：

> 一个 async 路由收到 50 个工厂查询；内部使用同步 psycopg；同一工厂首次访问需要建规则索引；连接池 max_size 为 8；服务部署 2 个副本、每副本 4 个 worker。请用今天的五个问题，说出你会在哪里使用什么机制。

期待的推导顺序：

1. 同步 psycopg 不能裸跑在 async 路由中，应隔离到线程池或评估异步驱动；
2. 同一工厂首次建索引，用同一事件循环内的 per-key asyncio.Lock；
3. DB 路径用有界并发，让 Semaphore、专用 executor 与连接池按真实预算协同；
4. 最坏连接数按 2 × 4 × 8 计算，再与数据库可用预算核对；
5. 在线程池和连接池的生命周期、超时、监控和压测中验证设计。

若学员能按这个顺序推导，而不是只回答“加一个锁”或“把并发改成 100”，就说明已经掌握了本文的核心逻辑。

### 13.7 五句容易讲偏的话

| 不建议这样说 | 建议这样说 |
|---|---|
| async 一定更快 | async 的首要价值是避免 I/O 等待堵住事件循环；是否更快取决于整条链路 |
| Semaphore 就是连接池 | Semaphore 限制放行数量；连接池负责真实连接的借还与复用 |
| 线程数开大就能扛并发 | 线程、连接、外部 API 和 CPU 都有独立容量，必须算总账 |
| 取消协程就等于 SQL 停了 | 取消等待者不一定会终止已经启动的线程或数据库查询 |
| 8 是最佳实践 | 8 只是课堂样例，容量由下游预算、部署拓扑和实测决定 |

### 13.8 课后作业建议

让学员选自己项目中的一条 Agent 并发路径，提交四样东西：

1. 运行域图；
2. 一张资源预算表；
3. 一个最可能的并发风险；
4. 用第 7 节审查提示词得到并人工复核的最小修复方案。

这样他们学到的不是几个 API，而是一套能迁移到自己 Agent 的判断方法。

---

## 教师 / 助教编辑说明

- 本文是原始调研稿的学员版，原稿保持不改，仍适合架构设计和排障时查阅。
- 重排为“运行域 → 决策 → 模式 → Agent 审查 → 验证”的顺序，避免初学者先陷入版本细节和 DCL 边角问题。
- 对“高并发 DB 必须迁 async”“某个默认线程数就是系统上限”等表述改为测量驱动的条件性结论。
- 原稿 P5 示例中重复出现了一行 async with sem；本学员版的模式 D 已按单层 Semaphore 正确表达。

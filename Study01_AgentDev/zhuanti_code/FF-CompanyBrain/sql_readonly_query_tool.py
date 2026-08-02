"""第四节课：Docker PostgreSQL 的只读教学观察工具。

Notebook/本机 Python 不应连接会变化的容器 IP。先显式叠加
`deploy/compose/compose.dev-ports.yml`，再通过稳定的回环地址
127.0.0.1:15432 连接 Docker 转发的 PostgreSQL 端口。

此工具只允许单条 SELECT / WITH / EXPLAIN / SHOW 查询，并额外设置
PostgreSQL default_transaction_read_only。它只用于显式开启的本机观察入口，
不属于默认 Compose 路径，也不保存或打印密码、DSN、正文消息。
"""

from __future__ import annotations

import argparse
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping


# 数据库白名单：课堂工具只能连接本项目已知的业务库，不能接收任意库名。
ALLOWED_DATABASES = frozenset(
    {
        "platform_identity_db",
        "platform_core_db",
        "nano_brain_db",
        "agent_gateway_db",
        "traditional_rag_db",
        "graph_rag_db",
    }
)
# 语句前缀白名单只是第一层检查；后面还会拒绝危险关键词并启用只读连接。
ALLOWED_PREFIXES = ("select", "with", "explain", "show")
# 数据库标识符必须是普通字母、数字和下划线组合，避免把 SQL 片段当作名称传入。
_IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


class ReadOnlySqlError(ValueError):
    """Query or connection input is unsafe for this teaching helper."""


@dataclass(frozen=True)
class DockerPostgresConfig:
    """宿主机观察 PostgreSQL 时需要的最小连接配置。"""

    # host/port 是宿主机入口，默认指向 Docker 暴露的 127.0.0.1:15432。
    host: str
    port: int
    # user/password 是 PostgreSQL 服务账号，不是 Web 登录用户。
    user: str
    password: str
    # database 表示同一个 PostgreSQL 容器中的目标业务库。
    database: str

    def redacted_target(self) -> str:
        """Safe to show in courseware/logs; deliberately omits password and DSN."""
        return f"{self.host}:{self.port}/{self.database} as {self.user}"


def _parse_dotenv(path: Path) -> dict[str, str]:
    """Minimal .env parser for Compose key=value files; never prints values."""
    if not path.is_file():
        raise FileNotFoundError(f"Compose env file not found: {path}")
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[key] = value
    return values


def _value(name: str, compose_env: Mapping[str, str], default: str | None = None) -> str:
    value = os.getenv(name) or compose_env.get(name) or default
    if value is None or not value.strip() or value.startswith("CHANGE_ME"):
        raise ReadOnlySqlError(f"Missing usable {name}; set it only in the private Compose .env or process environment")
    return value.strip()


def load_config(
    *,
    database: str,
    compose_env_file: str | Path | None = None,
) -> DockerPostgresConfig:
    """Load a host-side connection config for the optional loopback development overlay."""
    # 先限制目标库，再读取私有 .env；错误信息中不会输出密码或完整连接串。
    if database not in ALLOWED_DATABASES:
        raise ReadOnlySqlError(f"Database must be one of {sorted(ALLOWED_DATABASES)}, got {database!r}")
    raw_path = compose_env_file or os.getenv("L4_COMPOSE_ENV_FILE") or os.getenv("FF_COMPOSE_ENV_FILE")
    if not raw_path:
        raise ReadOnlySqlError("Set L4_COMPOSE_ENV_FILE (or FF_COMPOSE_ENV_FILE) to deploy/compose/.env")
    compose_env = _parse_dotenv(Path(raw_path).expanduser())
    # 显式的 L4_* 变量优先；否则复用 Compose 开发观察端口，最后才使用教学默认值。
    host = _value("L4_POSTGRES_HOST", compose_env, "127.0.0.1")
    port_text = _value("L4_POSTGRES_PORT", compose_env, compose_env.get("POSTGRES_DEV_HOST_PORT", "15432"))
    try:
        port = int(port_text)
    except ValueError as exc:
        raise ReadOnlySqlError("L4_POSTGRES_PORT / POSTGRES_DEV_HOST_PORT must be an integer") from exc
    if not 1 <= port <= 65535:
        raise ReadOnlySqlError("PostgreSQL port must be in 1..65535")
    return DockerPostgresConfig(
        host=host,
        port=port,
        user=_value("L4_POSTGRES_USER", compose_env, compose_env.get("POSTGRES_BOOTSTRAP_USER", "postgres")),
        password=_value("L4_POSTGRES_PASSWORD", compose_env, compose_env.get("POSTGRES_BOOTSTRAP_PASSWORD")),
        database=database,
    )


def assert_read_only_sql(sql: str) -> str:
    """Allow exactly one read-only statement; parameter values must use psycopg placeholders."""
    statement = sql.strip()
    if not statement:
        raise ReadOnlySqlError("SQL must not be empty")
    # 允许末尾有一个分号，但正文中再次出现分号就可能是多语句输入。
    if statement.endswith(";"):
        statement = statement[:-1].rstrip()
    if ";" in statement:
        raise ReadOnlySqlError("Only one SQL statement is allowed")
    # 去掉开头块注释后检查语句类型，避免注释遮住真实的 SQL 前缀。
    normalized = re.sub(r"^\s*(?:/\*.*?\*/\s*)*", "", statement, flags=re.DOTALL).lower()
    if not normalized.startswith(ALLOWED_PREFIXES):
        raise ReadOnlySqlError("Only SELECT, WITH, EXPLAIN, or SHOW statements are allowed")
    # 即使语句以 WITH/SELECT 开头，只要出现写入、DDL 或管理关键词也立即拒绝。
    forbidden = re.compile(r"\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do|vacuum)\b", re.I)
    if forbidden.search(statement):
        raise ReadOnlySqlError("Write/DDL/admin keyword rejected by the teaching read-only guard")
    return statement


def _connect(config: DockerPostgresConfig):
    """建立数据库层强制只读、单条语句最多执行五秒的连接。"""
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError as exc:  # pragma: no cover - depends on local teaching kernel
        raise RuntimeError("Install psycopg[binary] in the course kernel before real SQL observation") from exc
    return psycopg.connect(
        host=config.host,
        port=config.port,
        user=config.user,
        password=config.password,
        dbname=config.database,
        autocommit=True,
        row_factory=dict_row,
        # SQL 文本检查之外再加数据库护栏：禁止写入，并避免错误查询长期占用连接。
        options="-c default_transaction_read_only=on -c statement_timeout=5000",
    )


def query_rows(config: DockerPostgresConfig, sql: str, params: Iterable[Any] | None = None) -> list[dict[str, Any]]:
    """Run one guarded, parameterized, read-only query and return dictionaries."""
    statement = assert_read_only_sql(sql)
    with _connect(config) as connection:
        with connection.cursor() as cursor:
            # 条件值通过 psycopg 参数传入，不能用字符串拼接生成 WHERE 条件。
            cursor.execute(statement, tuple(params or ()))
            return list(cursor.fetchall())


def query_df(config: DockerPostgresConfig, sql: str, params: Iterable[Any] | None = None):
    """Third-lesson-compatible table view: a read-only query rendered as a DataFrame."""
    try:
        import pandas as pd
    except ImportError as exc:  # pragma: no cover - depends on local teaching kernel
        raise RuntimeError("Install pandas in the course kernel before calling query_df") from exc
    return pd.DataFrame(query_rows(config, sql, params))


def preflight(config: DockerPostgresConfig) -> dict[str, Any]:
    """Prove this is the loopback observation path without exposing a DSN or password."""
    # 只读取连接元数据。inet_server_port() 返回容器内服务端口，通常是 5432；
    # 宿主机访问端口仍以 config.port/.env 中的 POSTGRES_DEV_HOST_PORT 为准。
    rows = query_rows(
        config,
        """
        SELECT current_database() AS database_name,
               current_user AS database_user,
               inet_server_port() AS server_port,
               current_setting('transaction_read_only') AS transaction_read_only
        """,
    )
    if len(rows) != 1 or rows[0].get("transaction_read_only") != "on":
        raise RuntimeError("Read-only PostgreSQL preflight did not produce the expected single row")
    return rows[0]


def query_platform_scenario_summary(config: DockerPostgresConfig, scenario_id: str):
    """Read only scenario/task/file metadata; does not select source content or chat messages."""
    # 每个摘要函数固定目标库，避免把同名 ID 带到错误的业务库。
    if config.database != "platform_core_db":
        raise ReadOnlySqlError("Scenario summary must use platform_core_db")
    # 只返回权限判断需要的 owner、组织、范围、状态和计数，不读取资料正文。
    return query_df(
        config,
        """
        SELECT s.id AS scenario_id,
               s.owner_user_id,
               s.organization_id,
               s.visibility,
               s.status AS scenario_status,
               count(DISTINCT t.id) AS task_count,
               count(DISTINCT f.id) FILTER (WHERE f.deleted_at IS NULL) AS active_file_count
        FROM scenarios s
        LEFT JOIN tasks t ON t.scenario_id = s.id
        LEFT JOIN files f ON f.scenario_id = s.id
        WHERE s.id = %s
        GROUP BY s.id, s.owner_user_id, s.organization_id, s.visibility, s.status
        """,
        # %s 与参数元组分离，由 psycopg 完成安全绑定。
        (scenario_id,),
    )


def query_graph_source_summary(config: DockerPostgresConfig, source_id: str):
    """Read GraphRAG source/document metadata; no document body is selected."""
    if config.database != "graph_rag_db":
        raise ReadOnlySqlError("Graph source summary must use graph_rag_db")
    # workspace 与 owner 用于解释隔离边界；查询只统计文档状态，不返回文档正文。
    return query_df(
        config,
        """
        SELECT s.id AS source_id,
               s.workspace,
               s.kind,
               s.owner_user_id,
               s.delete_state,
               count(d.id) AS document_count,
               count(d.id) FILTER (WHERE d.status = 'ready') AS ready_document_count
        FROM public.graph_sources s
        LEFT JOIN public.graph_documents d ON d.source_id = s.id
        WHERE s.id = %s
        GROUP BY s.id, s.workspace, s.kind, s.owner_user_id, s.delete_state
        """,
        (source_id,),
    )


def query_agent_conversation_summary(config: DockerPostgresConfig, conversation_id: str):
    """Read conversation/run index metadata; intentionally excludes messages, citations and tool payloads."""
    if config.database != "agent_gateway_db":
        raise ReadOnlySqlError("Agent conversation summary must use agent_gateway_db")
    # 只观察会话归属和运行索引，故意排除消息、引用及工具调用载荷。
    return query_df(
        config,
        """
        SELECT c.id AS conversation_id,
               c.user_id,
               c.active_module,
               c.status AS conversation_status,
               c.thread_id,
               count(r.id) AS run_count,
               max(r.created_at) AS latest_run_at
        FROM agent_conversations c
        LEFT JOIN agent_runs r ON r.conversation_id = c.id
        WHERE c.id = %s
        GROUP BY c.id, c.user_id, c.active_module, c.status, c.thread_id
        """,
        (conversation_id,),
    )


def _self_test() -> None:
    """离线验证语句护栏；本函数不会读取配置，也不会连接 PostgreSQL。"""
    # 两条安全查询应通过。
    assert assert_read_only_sql("SELECT 1;") == "SELECT 1"
    assert assert_read_only_sql("WITH x AS (SELECT 1) SELECT * FROM x")
    # 写操作和多语句必须逐一被拒绝，否则立即让课堂自检失败。
    for unsafe in ("DELETE FROM files", "SELECT 1; SELECT 2", "UPDATE scenarios SET status = 'x'"):
        try:
            assert_read_only_sql(unsafe)
        except ReadOnlySqlError:
            pass
        else:  # pragma: no cover - self-test must fail loudly
            raise AssertionError(f"unsafe statement was accepted: {unsafe}")


def main() -> None:
    """命令行只提供离线自检和只读预检两个明确入口。"""
    parser = argparse.ArgumentParser(description="Fourth-lesson Docker PostgreSQL read-only helper")
    parser.add_argument("--self-test", action="store_true", help="run guard tests only; never connects to PostgreSQL")
    parser.add_argument("--preflight", action="store_true", help="connect to the loopback dev port and show non-secret metadata")
    parser.add_argument("--database", default="platform_core_db", choices=sorted(ALLOWED_DATABASES))
    parser.add_argument("--compose-env", help="private deploy/compose/.env path; never printed")
    args = parser.parse_args()
    if args.self_test:
        _self_test()
        print("SQL read-only guard self-test: PASS")
        return
    if not args.preflight:
        parser.error("choose --self-test or --preflight")
    config = load_config(database=args.database, compose_env_file=args.compose_env)
    result = preflight(config)
    print({key: result[key] for key in ("database_name", "database_user", "server_port", "transaction_read_only")})


if __name__ == "__main__":
    main()

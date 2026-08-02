"""第四节课：用户权限闸门链教学 MVP。

这是零依赖的教学最小复现，不是 ff-companybrain 的生产实现。
它对齐 store 层核心判断顺序：认证与授权分离、private/team/company
读取、场景管理、私人会话 owner-only，以及 Agent 的内部服务信任。

它不复现 Bearer Token 登录、数据库读写，也不复现 Web / Gateway 对组织和团队
上下文的运行时默认补全；这些边界必须回到项目源码与真实 UI/API 证据核对。

生产真值锚点见同目录的《Explorable-用户权限管理-源码真值清单.md》。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Iterable


class Scope(str, Enum):
    """资源可见范围；它不是用户角色，也不能单独决定最终权限。"""

    PRIVATE = "private"
    TEAM = "team"
    COMPANY = "company"


class Action(str, Enum):
    """课堂中拆分观察的四类动作，避免把“能读”误当成“都能做”。"""

    READ_RESOURCE = "read_resource"
    MANAGE_SCENARIO = "manage_scenario"
    READ_CONVERSATION = "read_conversation"
    AGENT_RETRIEVE = "agent_retrieve"


@dataclass(frozen=True)
class User:
    """一次权限判断所需的最小用户上下文。"""

    # user_id/authenticated 表示认证结果；username 只用于课堂输出。
    user_id: str | None
    username: str
    # 管理员是部分资源动作的治理例外，但不是私人会话的读取例外。
    is_admin: bool = False
    # 普通成员访问 team/company 资源时必须提供组织和团队上下文。
    organization_id: str | None = None
    team_ids: frozenset[str] = field(default_factory=frozenset)
    authenticated: bool = True


@dataclass(frozen=True)
class Resource:
    """被访问资源的归属信息与共享范围。"""

    resource_id: str
    # owner、组织、团队和 scope 共同参与读取或管理判断。
    owner_user_id: str
    organization_id: str
    team_ids: frozenset[str]
    scope: Scope


@dataclass(frozen=True)
class Conversation:
    """私人会话只保留 owner 判断需要的两个字段。"""

    conversation_id: str
    owner_user_id: str


@dataclass(frozen=True)
class Decision:
    """结构化授权结果：结论、命中闸门、原因和完整判断轨迹。"""

    allowed: bool
    gate: str
    reason: str
    trace: tuple[str, ...]


def _decision(allowed: bool, gate: str, reason: str, trace: Iterable[str]) -> Decision:
    return Decision(allowed=allowed, gate=gate, reason=reason, trace=tuple(trace))


def _authenticated(user: User, trace: list[str]) -> Decision | None:
    """第一道认证闸门；失败后不再进入资源授权判断。"""
    if not user.authenticated or not user.user_id:
        trace.append("认证闸门：拒绝（缺少有效登录身份）")
        return _decision(False, "authentication", "需要已认证且带 user_id 的当前用户", trace)
    trace.append(f"认证闸门：通过（当前用户={user.username}）")
    return None


def can_read_resource(user: User, resource: Resource) -> Decision:
    """读取规则：有效 admin 是资源读取例外；普通成员按 scope 严格判定。"""
    trace: list[str] = []
    # 先确认“你是谁”，再判断“你能否读取这个资源”。
    denied = _authenticated(user, trace)
    if denied:
        return denied

    assert user.user_id is not None
    # 管理员对知识资源有治理读取例外，但这个例外不会沿用到私人会话。
    if user.is_admin:
        trace.append("资源读取闸门：通过（有效 admin 的知识资源治理读取例外）")
        return _decision(True, "resource_read", "admin 可读取该知识资源", trace)

    # private 最严格：只有资源 owner 可以读取。
    if resource.scope is Scope.PRIVATE:
        allowed = user.user_id == resource.owner_user_id
        trace.append("private 闸门：" + ("通过（owner）" if allowed else "拒绝（非 owner）"))
        return _decision(allowed, "private_owner", "private 仅 owner 可读", trace)

    # team/company 都要求显式组织上下文；上下文缺失时默认拒绝。
    if not user.organization_id:
        trace.append("组织闸门：拒绝（普通成员缺 organization_id，fail-closed）")
        return _decision(False, "organization", "普通成员缺少组织上下文", trace)
    if resource.scope is Scope.TEAM and not user.team_ids:
        trace.append("团队闸门：拒绝（team 资源要求完整 team_ids，fail-closed）")
        return _decision(False, "team_intersection", "普通成员缺少团队上下文", trace)

    # 与真实 canAccess 一致：普通 owner 可读自己的 team/company 资源。
    if user.user_id == resource.owner_user_id:
        trace.append("owner 闸门：通过（普通 owner 可读取自己的非 private 资源）")
        return _decision(True, "resource_owner", "owner 可读取自己的 team/company 资源", trace)

    # 对非 owner，组织必须先一致；相同 team 名不能跨组织授权。
    if user.organization_id != resource.organization_id:
        trace.append("组织闸门：拒绝（组织不匹配）")
        return _decision(False, "organization", "组织必须先匹配", trace)
    trace.append("组织闸门：通过（组织匹配）")

    # company 到组织匹配即通过；team 还要继续检查团队交集。
    if resource.scope is Scope.COMPANY:
        trace.append("company 闸门：通过（同组织）")
        return _decision(True, "company_scope", "company 资源要求同组织", trace)

    shared_teams = user.team_ids & resource.team_ids
    allowed = bool(shared_teams)
    trace.append("团队闸门：" + (f"通过（共同团队={sorted(shared_teams)}）" if allowed else "拒绝（无共同团队）"))
    return _decision(allowed, "team_intersection", "team 资源要求同组织且团队有交集", trace)


def can_manage_scenario(user: User, resource: Resource) -> Decision:
    """管理规则独立于读取：仅 owner 或有效 admin 可更新/删除/申请变更。"""
    trace: list[str] = []
    denied = _authenticated(user, trace)
    if denied:
        return denied

    assert user.user_id is not None
    # 同团队只能带来共享读取，不会自动获得场景管理权。
    allowed = user.is_admin or user.user_id == resource.owner_user_id
    if allowed:
        actor = "admin" if user.is_admin else "owner"
        trace.append(f"场景管理闸门：通过（{actor}）")
        return _decision(True, "scenario_manage", "仅 owner 或有效 admin 可管理场景", trace)
    trace.append("场景管理闸门：拒绝（共享读取不授予管理权）")
    return _decision(False, "scenario_manage", "读取权和管理权是两条规则", trace)


def can_read_conversation(user: User, conversation: Conversation) -> Decision:
    """私人会话始终 owner-only；admin 不是正文读取例外。"""
    trace: list[str] = []
    denied = _authenticated(user, trace)
    if denied:
        return denied

    assert user.user_id is not None
    # 这里故意不判断 is_admin：管理员也不能读取他人的私人会话正文。
    allowed = user.user_id == conversation.owner_user_id
    trace.append("会话 owner 闸门：" + ("通过（owner）" if allowed else "拒绝（含 admin 在内的非 owner）"))
    return _decision(allowed, "conversation_owner", "私人会话正文 owner-only", trace)


def can_agent_retrieve(
    authenticated_user: User,
    resource: Resource,
    *,
    internal_token_valid: bool,
    model_requested_user_id: str | None = None,
) -> Decision:
    """Agent 只能代表 Gateway 已认证的当前用户，模型请求的 userId 不参与授权。"""
    trace: list[str] = []
    denied = _authenticated(authenticated_user, trace)
    if denied:
        return denied

    # Tool/模型参数不是可信身份来源，不能覆盖 Gateway 已认证用户。
    if model_requested_user_id and model_requested_user_id != authenticated_user.user_id:
        trace.append("Tool 输入：忽略模型提供的 userId，身份只来自 Gateway 的已认证用户")
    else:
        trace.append("Tool 输入：身份来自 Gateway 的已认证用户")

    # 内部 Token 证明调用来自受信任服务，但它不会替代用户自己的资源权限。
    if not internal_token_valid:
        trace.append("内部服务闸门：拒绝（缺失或错误的内部 token）")
        return _decision(False, "internal_service_token", "模块只接受受信任服务转发的用户上下文", trace)

    trace.append("内部服务闸门：通过（服务间信任成立）")
    # 服务间信任通过后，仍要用真实当前用户继续执行资源读取规则。
    resource_decision = can_read_resource(authenticated_user, resource)
    trace.extend(resource_decision.trace[1:])
    return _decision(
        resource_decision.allowed,
        resource_decision.gate,
        resource_decision.reason,
        trace,
    )


def demo_fixture() -> dict[str, object]:
    """返回课堂固定角色和资源；不会连接数据库、不会产生任何副作用。"""
    # Alice/Bob 同组织同团队；Dave 同组织不同团队；Carol 跨组织但 team 名相同。
    org_a = "org-companybrain"
    alice = User("alice", "Alice", organization_id=org_a, team_ids=frozenset({"red-team"}))
    bob = User("bob", "Bob", organization_id=org_a, team_ids=frozenset({"red-team"}))
    dave = User("dave", "Dave", organization_id=org_a, team_ids=frozenset({"blue-team"}))
    carol = User("carol", "Carol", organization_id="org-external", team_ids=frozenset({"red-team"}))
    # Admin 用于对比“知识资源治理例外”和“私人会话仍然 owner-only”。
    admin = User("admin", "Admin", is_admin=True, organization_id=org_a, team_ids=frozenset({"platform-admin"}))
    missing_context = User("missing", "MissingContext", organization_id=None, team_ids=frozenset())
    team_resource = Resource("team-playbook", "alice", org_a, frozenset({"red-team"}), Scope.TEAM)
    private_resource = Resource("private-notes", "alice", org_a, frozenset({"red-team"}), Scope.PRIVATE)
    company_resource = Resource("company-policy", "alice", org_a, frozenset({"red-team"}), Scope.COMPANY)
    conversation = Conversation("alice-private-conversation", "alice")
    return locals()


def _assert_fixture() -> None:
    """运行 17 条固定断言，覆盖读取、管理、会话和 Agent 四类边界。"""
    data = demo_fixture()
    org_a = data["org_a"]
    alice = data["alice"]
    bob = data["bob"]
    dave = data["dave"]
    carol = data["carol"]
    admin = data["admin"]
    missing_context = data["missing_context"]
    team_resource = data["team_resource"]
    private_resource = data["private_resource"]
    company_resource = data["company_resource"]
    conversation = data["conversation"]
    assert isinstance(org_a, str) and isinstance(alice, User) and isinstance(team_resource, Resource) and isinstance(conversation, Conversation)

    # 读取矩阵：owner / 同团队 / 同组织异团队 / 跨组织同 team-id / admin。
    assert can_read_resource(alice, private_resource).allowed
    assert not can_read_resource(bob, private_resource).allowed
    assert can_read_resource(bob, team_resource).allowed
    assert not can_read_resource(dave, team_resource).allowed
    assert not can_read_resource(carol, team_resource).allowed
    assert can_read_resource(dave, company_resource).allowed
    assert not can_read_resource(missing_context, company_resource).allowed
    assert can_read_resource(admin, private_resource).allowed
    owner_without_team = User("alice", "Alice", organization_id=org_a, team_ids=frozenset({"blue-team"}))
    assert can_read_resource(owner_without_team, team_resource).allowed

    # 管理与会话不是“读取权限”的别名。
    assert not can_manage_scenario(bob, team_resource).allowed
    assert can_manage_scenario(alice, team_resource).allowed
    assert can_manage_scenario(admin, team_resource).allowed
    assert not can_read_conversation(admin, conversation).allowed
    assert can_read_conversation(alice, conversation).allowed

    # Agent 不接受模型伪造身份，且要求内部服务信任。
    forged = can_agent_retrieve(bob, private_resource, internal_token_valid=True, model_requested_user_id="alice")
    assert not forged.allowed and "忽略模型提供的 userId" in forged.trace[1]
    assert not can_agent_retrieve(alice, team_resource, internal_token_valid=False).allowed
    assert can_agent_retrieve(alice, team_resource, internal_token_valid=True).allowed


def main() -> None:
    """运行完整断言，并展示一个最容易混淆的共享读取/管理拒绝案例。"""
    _assert_fixture()
    data = demo_fixture()
    decision = can_manage_scenario(data["bob"], data["team_resource"])
    print("MVP 断言：17 条授权行为均通过")
    print("\nBob 对共享 team 资源发起管理操作：")
    for event in decision.trace:
        print("-", event)
    print(f"结论：{'允许' if decision.allowed else '拒绝'}｜命中闸门：{decision.gate}｜原因：{decision.reason}")


if __name__ == "__main__":
    main()

# 前台注册到 PostgreSQL 的源码链路

> 目标：从前台点击“注册”开始，追踪到身份库 `platform_identity_db.public.users` 的 SQL 写入。本文只讲当前项目真实链路，不展示密码、连接串或 `password_hash`。

## 先区分两个 SQL 时刻

注册按钮**不会**执行建表 SQL。项目启动时和用户点击注册时发生的是两件不同的事：

```text
Docker 启动时，migrate 一次性容器
  └─ CREATE TABLE IF NOT EXISTS users / sessions

用户点击注册时
  └─ INSERT INTO users

注册成功后，前端自动登录时
  └─ INSERT INTO sessions
```

`users` 与 `sessions` 的表结构由 `ff-companybrain/packages/identity/src/migrations.ts` 中的 `migrateIdentityDatabase()` 创建；启动迁移入口是 `ff-companybrain/scripts/init-db.ts`。

## 完整请求链路

```text
登录页点击“注册”
  ↓
LoginPage.submit()
  ↓
AuthContext.register()
  ↓
platformApi.register()
  ↓
POST /api/platform/auth/register
  ↓
Next.js route.ts：handleAuthRoute()
  ↓
auth-store.ts：registerUser() → apiRegister()
  ↓
Docker 内部 API：POST http://api:3001/auth/register
  ↓
apps/api authRouter：createUser()
  ↓
@ff/identity：校验输入、bcrypt 哈希、INSERT INTO users
  ↓
PostgreSQL：platform_identity_db.public.users
```

## 逐层源码定位

### 1. 登录页：注册模式提交

文件：`ff-companybrain/apps/web/components/auth/login-page.tsx`

`LoginPage.submit()` 根据当前模式调用：

```ts
if (mode === "register") {
  await auth.register({ username, password, displayName });
}
```

页面中的“创建并进入”按钮触发这个表单提交。前端只收集账号、显示名称和密码；不要在浏览器控制台、截图或课件中展示密码。

### 2. 前端授权上下文：注册后自动登录

文件：`ff-companybrain/apps/web/lib/auth-context.tsx`

`register()` 的顺序是：

```text
platformApi.register(input)
  → platformApi.login(input)
  → 保存 Bearer Token 和当前 user
  → 页面进入 authenticated 状态
```

因此需要分开理解：

- 注册：创建身份记录；
- 自动登录：验证密码、创建会话记录、返回 Bearer Token；
- 业务授权：后续请求再由 Bearer Token 形成当前用户上下文，结合资源与动作判断。

### 3. 浏览器请求：`/api/platform/auth/register`

文件：`ff-companybrain/apps/web/lib/api.ts`

前端调用：

```ts
platformApi.register(input)
```

请求为：

```http
POST /api/platform/auth/register
Content-Type: application/json
```

请求体包含 `username`、`password` 和 `display_name`。课堂只观察 URL 与 HTTP 状态码，不投屏密码请求体。

### 4. Next.js 本地路由：转入身份注册逻辑

文件：`ff-companybrain/apps/web/app/api/platform/[...path]/route.ts`

该 catch-all 路由先识别 `auth/register`，再调用：

```ts
registerUser({
  username,
  password,
  displayName,
  role: "member",
})
```

这里强制把前台注册者作为普通成员处理；前台注册不能创建管理员。

### 5. Web 服务调用 Docker 内 API

文件：`ff-companybrain/apps/web/lib/server/auth-store.ts`

`registerUser()` 优先调用 `apiRegister()`；在 Compose 运行环境中，它请求：

```text
http://api:3001/auth/register
```

这个地址来自 Web 容器的 `API_INTERNAL_BASE_URL`，配置位于 `deploy/compose/compose.student.yml`。它是 Docker 网络内部地址，不是浏览器直接访问的地址。

当前 Compose 使用 `NODE_ENV=production`。身份服务不可用时，本地 JSON/scrypt 的开发回退不会作为生产路径使用；真实注册以 API 和 PostgreSQL 身份库为准。

> 注意：虽然页面收集 `displayName`，当前真实 identity API 最终只接收 `username` 与 `password`；`users` 表也没有 `display_name` 列。这是“前台字段不一定逐字段落库”的一个例子。

### 6. API 路由：创建普通用户并初始化模块默认空间

文件：`ff-companybrain/apps/api/src/routes/auth.ts`

`POST /auth/register` 的核心顺序：

```ts
const user = await createUser({
  username: body.username,
  password: body.password,
  isAdmin: false,
});

await initializeModuleUser("nano-brain", userContext);
await initializeModuleUser("traditional-rag", userContext);
```

`createUser()` 成功后，API 还会通知 Nano Brain 与 Traditional RAG 初始化该用户的默认私有 workspace/source。这个初始化是注册后的附加业务动作；用户身份主记录仍由下一步的 identity SQL 写入。

### 7. Identity 包：校验、哈希与 SQL 写入

文件：`ff-companybrain/packages/identity/src/index.ts`

`createUser()` 先完成：

1. 用户名 `trim()` 后转小写；
2. 用户名长度限制为 3–64，只允许字母、数字、`_`、`.`、`@`、`-`；
3. 密码长度限制为 8–256；
4. 使用 bcrypt 生成密码哈希；
5. 使用 UUID 生成用户 ID；
6. 以 `isAdmin: false` 写入普通成员。

最终执行的 SQL 是：

```sql
INSERT INTO users (id, username, password_hash, is_admin)
VALUES ($1, $2, $3, $4)
RETURNING id, username, is_admin, created_at;
```

`username` 有唯一约束。若 PostgreSQL 返回唯一键冲突 `23505`，代码将其转换为 `username_taken`，而不是创建重复用户。

## 身份库与运行时数据库角色

```text
PostgreSQL 容器
└─ platform_identity_db
   ├─ public.users       身份记录
   └─ public.sessions    登录会话记录
```

- 运行时 API 使用 `ff_identity_app` 连接 `platform_identity_db`；
- 启动时的 `migrate` 使用迁移角色创建表与授权；
- 课堂只读观察工具显示的 `postgres` 是观察连接账号，不是应用用户，也不是 API 的运行时身份角色；
- `admin`、成员 A、成员 B 等是写入 `users` 表的应用身份，不应与数据库角色混淆。

## 自动登录后的 `sessions` 写入

注册成功后，前端会立即调用登录接口。`@ff/identity` 的 `login()` 验证 bcrypt 密码哈希后，执行：

```sql
INSERT INTO sessions (id, user_id, token_hash, expires_at)
VALUES ($1, $2, $3, $4);
```

数据库保存的是 `token_hash`，不是原始 Bearer Token。后续受保护请求由 Token 找回用户身份，再进入资源授权逻辑。

## 课堂最小演示流程

1. 在登录页切换到“注册”，使用一个新的临时账号完成注册。
2. 在浏览器开发者工具的 Network 面板，只展示 `POST /api/platform/auth/register` 与状态码 `201`；不要展示请求体。
3. 在 DBeaver 连接 `platform_identity_db`，执行下列只读 SQL：

```sql
SELECT
  id,
  username,
  is_admin,
  created_at
FROM public.users
WHERE username = '<刚注册的账号>';
```

4. 对照 `packages/identity/src/index.ts` 中的 `INSERT INTO users`。
5. 说明：查到用户行，只证明身份被创建；它不自动表示该用户拥有任何私人资料、团队资料或管理员权限。
6. 最后指出：前端随后自动登录，才会额外产生 `sessions` 记录；不要查询或展示 `password_hash`、`token_hash`。

## 可直接对学员说明的结论

```text
注册 = 在 identity 库创建普通用户；
自动登录 = 创建该用户的会话；
业务授权 = 之后的请求按当前用户、资源范围和动作单独判断。
```

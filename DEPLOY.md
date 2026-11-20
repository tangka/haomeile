# 部署号没了到 Cloudflare

这是供站长执行的部署手册；仓库开发与本地验收不表示已经上线。目标域名为 `haomeile.rip`，运行时为 Workers + Static Assets + D1。

## 1. 准备域名与本地环境

使用 Node.js ≥ 22.23.4、pnpm 8.6.12。在 Cloudflare 添加并激活 `haomeile.rip`；域名不由 Cloudflare 注册时，由站长在注册商处按控制台提供的值修改 NS。

在项目根目录安装并登录，确认操作的是目标 Cloudflare 账号：

```sh
pnpm install --frozen-lockfile
pnpm exec wrangler login
pnpm exec wrangler whoami
```

## 2. 创建生产 D1

```sh
pnpm exec wrangler d1 create haomeile
```

把输出的真实数据库 UUID 填入 `wrangler.toml` 的 `[[d1_databases]]` → `database_id`，保留 `binding = "DB"`、`database_name = "haomeile"` 和 `migrations_dir = "migrations"`。

首次创建的生产库应为空。产品范围仅 Claude、Codex、Antigravity（反重力），内部键为 `claude`、`codex`、`antigravity`；产品字段名仍保留 `vendor`。已有旧版本数据库时，迁移会把历史 `chatgpt`、`gemini` 键分别改为 `codex`、`antigravity`，其余旧产品记录保留原样，不改写成这三种产品，也不在公开页面、统计与 sitemap 中显示。确认数据库与配置后执行生产迁移：

```sh
pnpm exec wrangler d1 migrations apply haomeile --remote
```

`pnpm db:migrate` 只处理本地数据库，不能替代上面的生产迁移。生产库不导入设计样例、浏览器测试夹具或本地 SQL 审核夹具。

## 3. 配置 Turnstile 与密钥

应用已接入真实 Turnstile SDK，并由 Worker 调用 Siteverify 校验 token。当前本地使用官方始终通过的测试配置，生产 site key 尚未配置。Cloudflare 的 [免费方案](https://developers.cloudflare.com/turnstile/plans/)允许不限次数的验证请求，提供最多 20 个 widget、每个 widget 最多 10 个主机名；本项目可使用该方案，测试密钥仍需替换为正式配置。

由站长在 Cloudflare 创建 Turnstile 站点，将 `haomeile.rip` 加入允许的主机名。把真实 **site key** 填入 `wrangler.toml` 的 `[vars].TURNSTILE_SITE_KEY`；site key 是公开配置。保留 `ENVIRONMENT = "production"` 和 `SITE_ORIGIN = "https://haomeile.rip"`。

真实密钥通过 Wrangler 写入。除 `PEPPER` 外，下列命令均在提示时输入控制台取得的值，不把值写进命令行、源码或截图：

```sh
pnpm exec wrangler secret put TURNSTILE_SECRET
openssl rand -hex 32 | pnpm exec wrangler secret put PEPPER
pnpm exec wrangler secret put ACCESS_AUD
pnpm exec wrangler secret put ACCESS_TEAM_DOMAIN
```

`PEPPER` 使用至少 32 字节随机熵；上面的命令直接通过管道写入，不在终端打印随机值。生产运行后不要随意更换它，否则已有凭据、访客去重和限流哈希会失效。Access 的两个值在下一节创建应用后取得；首次尚无 Worker 时，Wrangler 可能提示创建同名 Worker，先核对账号和名称再继续。

`.dev.vars.example` 里的官方测试密钥与固定本地 `PEPPER` 只供开发使用，不得填入生产 secrets。不要将 `.dev.vars` 上传或提交。

## 4. 配置审核后台 Access

在 Cloudflare Zero Trust 创建一个自托管 Access 应用，为**同一个应用**添加以下公开主机与路径，确保它们使用同一个 Audience：

- `haomeile.rip/admin*`
- `haomeile.rip/api/admin/*`

Allow 策略只允许站长自己的邮箱，通过控制台支持的身份提供方登录；不增加 Bypass、所有人可访问或服务令牌代替人工管理员的规则。公开纪念墙不需要登录。

从应用复制 Audience Tag 到 `ACCESS_AUD`；从 Zero Trust 设置复制团队域名到 `ACCESS_TEAM_DOMAIN`。团队域名应为自己的 `团队名.cloudflareaccess.com`，不要附加路径。用上一节的 `wrangler secret put` 命令写入。

Access 在边缘登录后转发 `Cf-Access-Jwt-Assertion`；Worker 继续验证签名、团队签发者、Audience、有效期和管理员邮箱声明。没有有效 JWT、配置不完整或公钥获取失败时均拒绝访问，本地没有绕过开关。`/admin.html`、`/admin/index.html` 等静态别名也由 Worker 在读取资源前保护；不要另行暴露 `dist/` 作为绕过 Worker 的独立静态站点。

操作步骤可对照 [Cloudflare Access 应用文档](https://developers.cloudflare.com/learning-paths/clientless-access/access-application/create-access-app/)；Worker 的校验依据见 [官方 JWT 验证说明](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)。

## 5. 绑定域名与填写站点内容

在 `wrangler.toml` 的顶层、`[assets]` 之前加入：

```toml
workers_dev = false
preview_urls = false
routes = [{ pattern = "haomeile.rip", custom_domain = true }]
```

这让正式服务通过指定域名访问，并关闭默认 `workers.dev` 与版本预览入口。部署时 Cloudflare 为 [Custom Domain](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) 配置所需 DNS；存在冲突记录时，按控制台提示由站长处理。

发布前由站长完成以下文本配置：

- `src/site/pages/appeal.astro`：人工核对 Claude、Codex、Antigravity 三种产品的官方网站及申诉方式后，替换 `TODO_OFFICIAL_URL`、`TODO` 和核对日期。占位符目前是不可点击的文本；填写后再改成真实 `<a>` 链接。不要猜测网址。
- `src/site/pages/about.astro`：填写 `TODO_CONTACT_EMAIL`。
- 使用须知、数据说明等页面中的 `TODO_DATE`：填写实际修订日期，并核对公开、抓取和撤回说明。按 `PLAN.md` 的安排，由站长在上线前完成法律文本审阅。

## 6. 首次发布与验收

先运行本地检查。端到端测试需要本机 Google Chrome，使用独立的 8790 端口和本地测试库：

```sh
pnpm check
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

确认数据库 UUID、真实密钥、Access 策略、域名和文案都已就绪，再由站长发布：

```sh
pnpm deploy
```

部署完成后检查公开首页和静态资源、`/sitemap.xml`、`/robots.txt`、`/llms.txt`，以及真实 Turnstile 是否正常。确认匿名访问后台不能得到页面或接口数据，站长经 Access 登录后能进入审核队列；不要用伪造请求头代替真实登录验收。未配置真实服务前，本地测试不能证明线上登录、DNS 或人机验证可用。

投稿、审核、修改与撤回的完整验收在隔离测试库完成，生产库只接收真实自愿上报，不写入验收示例。后续真实墓碑撤回时，可核对原公开地址返回 410，并从 sitemap 中移除。

站长后续再按 `design/SEO.md` 在 Google Search Console 与 Bing 验证域名、提交 sitemap，并在 Cloudflare 开启合适的抓取通知配置。这些后台操作不由构建命令代办。

## 7. 备份、更新与回滚

已有数据的生产更新应先导出备份。备份包含用户内容和内部哈希，只存入站长控制的受限目录，不提交 Git。下面的文件路径由站长替换为仓库外的实际备份位置：

```sh
pnpm exec wrangler d1 export haomeile --remote --output /ABSOLUTE_PRIVATE_BACKUP_PATH/haomeile-before-update.sql
```

保存备份与当前已发布的 Worker 版本号，检查新增迁移，再执行迁移并发布：

```sh
pnpm exec wrangler versions list
pnpm exec wrangler d1 migrations apply haomeile --remote
pnpm deploy
```

应用迁移优先采用与旧版本兼容的增量结构；需要修正迁移时，新增后续迁移，不修改已经应用的 SQL。不要把“回退代码”当成“回退数据库”。

需要回退 Worker 时，先确认旧代码兼容当前 D1 结构及绑定，再选定实际版本 ID：

```sh
pnpm exec wrangler rollback VERSION_ID --message "回退到已验证版本"
```

[Worker 回滚](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)切换已发布版本及其资源，不自动撤销 D1 迁移、恢复数据库或恢复被撤回的内容。数据恢复需要另外选择、核对并执行 [D1 导入或恢复流程](https://developers.cloudflare.com/d1/best-practices/import-export-data/)，可能覆盖恢复点之后的数据，不能当成普通发布步骤自动执行。

## 8. 日常维护

`wrangler.toml` 中的 Cron 为 `17 20 * * *`：每天 UTC 20:17，即**次日北京时间 04:17**。它清理超过保留期限的拒绝稿、已处理举报、限流与献花去重记录，保留公开墓碑的累计献花数。部署后在 Cloudflare 的计划任务中确认触发与运行结果。

站长每天处理新投稿、修改与举报。统计只计当前审核通过且公开的记录；不要用它推算厂商封号率，也不要开启第三方追踪或把原始 IP 写入日志。

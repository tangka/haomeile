# 号没了

一个只记录 Claude、Codex、Antigravity 账号停用、受限和异常经历的匿名社区。沿用 `design/` 的像素墓园设计，提供纪念墙、匿名立碑、凭据管理、献花举报、人工审核及纯浏览器墓志铭卡片生成器。所有上报均为用户自述，未经核实。

首页保留总体数字、纪念墙和近 30 天曲线；产品与事件筛选、按产品与事件种类的分布区已移除。投稿表单仍填写产品与事件。

当前仓库提供本地应用和部署配置；部署到 Cloudflare 需按 [DEPLOY.md](DEPLOY.md) 完成账号、域名、真实密钥及人工文案配置。这里的开发与测试命令不会发布生产服务。

## 本地运行

需要 Node.js **22.23.4 或更高版本**、pnpm **8.6.12**。在项目根目录运行：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

访问 <http://127.0.0.1:8787>。`pnpm dev` 会构建 Astro 页面、应用本地 D1 迁移，再启动同一端口上的 Worker 页面与 API；修改页面或公共资源会重新构建，Worker 代码由 Wrangler 监听。

首次运行会在 `.dev.vars` 不存在时从 `.dev.vars.example` 复制本地配置模板。模板不包含 Turnstile 密钥；请填入免费正式 widget 的 site key 与 secret，并允许 `127.0.0.1` 和 `localhost`。首次本地数据库为空，不导入设计稿的示例内容；已有本地数据库会保留。`.dev.vars`、`.wrangler/` 均已忽略，不能提交真实密钥。本地状态存于 `.wrangler/`，与生产 D1 分离。

人机验证已接入前端 Turnstile SDK 和后端 Siteverify。普通开发与生产都拒绝官方测试密钥和 dummy token，并核对 Siteverify 返回的 hostname；正式密钥尚未配置时不能投稿。当前 `haomeile` 免费正式 widget 已创建，公开 site key 已写入生产配置，本地 secret 位于忽略的 `.dev.vars`；线上 secret 随正式部署写入。只有隔离测试环境显式设置 `TURNSTILE_TEST_MODE=true` 并提供成对官方测试密钥时才允许测试验证；生产环境不能开启该模式。Turnstile [免费方案](https://developers.cloudflare.com/turnstile/plans/)不限制验证请求次数，账户最多 20 个 widget，每个 widget 最多 10 个主机名。

单独应用本地迁移：

```sh
pnpm db:migrate
```

本地 `/admin` 默认返回 403，应用没有后台鉴权绕过开关。真实后台需要部署后的 Cloudflare Access；开发中的后台鉴权与审核操作由签名 JWT 接口测试验证。

## 检查与测试

```sh
pnpm check
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

- `check`：Astro、前端、Worker 与端到端测试的严格类型检查。
- `test`：在真实 Workers 运行时和隔离 D1 中执行单元、公开接口、签名 Access JWT、审核、并发与清理测试。
- `test:e2e`：需要本机安装 Google Chrome，测试配置使用 `channel: chrome`。测试自行启动 <http://127.0.0.1:8790>，独立数据库、配置和构建分别位于 `.wrangler/e2e-state/`、`.wrangler/e2e-config/`、`.wrangler/e2e-dist/`。请空出 8790 端口。测试只清理自己的本地测试表，不使用 8787 的开发库或远程 D1。
- `build`：输出 Astro 静态页面与资源到 `dist/`，不会部署。

浏览器生命周期测试通过明确的**本地 SQL 审核夹具**模拟站长审核，真实后台授权与审核接口另由签名 JWT 集成测试覆盖。测试仅替换浏览器端 Turnstile SDK；实际生命周期测试仍调用业务 API，由 Worker 向官方 Siteverify 校验官方测试 token，因此需要连接 Cloudflare 验证服务。表单预填和序列化的回归测试使用浏览器请求夹具，不写入真实投稿。

卡片生成器测试验证 PNG 导出及没有业务或外部请求；移动端测试覆盖 375px 的日夜模式。各里程碑验证结果和实现取舍见 [DECISIONS.md](DECISIONS.md)。

## 运行方式与目录

Astro 采用静态输出。Worker 先处理请求，再用 HTMLRewriter 将 D1 中的真实内容写入静态模板，提供首页、产品页、墓碑详情及分页。首屏内容在服务端返回的 HTML 中，不依赖浏览器先请求数据。`/_templates/` 仅供内部资源读取，外部不能直接访问。

| 位置                                      | 用途                                        |
| ----------------------------------------- | ------------------------------------------- |
| `PLAN.md`、`design/`                      | 实施方案与只读设计稿                        |
| `src/site/`                               | Astro 页面、共享组件、原生 TypeScript、样式 |
| `public/`                                 | 像素 SVG、图标、OG 图及抓取说明             |
| `src/worker/`                             | Hono API、服务端页面、鉴权与定时清理        |
| `migrations/`                             | D1 迁移，生产与本地分别执行                 |
| `tests/unit/`、`tests/api/`、`tests/e2e/` | 单元、接口与浏览器测试                      |
| `scripts/`                                | 本地开发和隔离端到端测试入口                |
| `wrangler.toml`                           | Worker、静态资源、D1、Cron 的生产配置占位   |

## 中英文

默认中文，英文版使用 `/en/` 路径。页头可切换语言并保留当前页面和查询参数；表单、错误、日期、验证码和分享卡片跟随页面语言。用户填写的代号、署名、经过、墓志铭保持原文。语言不依赖 Cookie，也不按浏览器语言自动跳转。

每个页面提供两种语言的 canonical/hreflang；sitemap 按两种语言输出 URL，每个分片最多 22,500 条墓碑记录。后台英文路径与中文路径使用相同 Access 验证。

## 内容与数据约束

产品范围固定为 Claude（`claude`）、Codex（`codex`）、Antigravity（`antigravity`），没有其他产品选项。为保持兼容，数据库及 API 的产品字段仍名为 `vendor`。历史 `chatgpt`、`gemini` 记录分别迁移为 `codex`、`antigravity`；其余旧产品记录保留，但不计入公开页面、统计或 sitemap。

投稿套餐按产品联动：Claude 支持未知、免费、Pro、Max、Ultra；Codex 支持未知、免费、Go、Plus、Pro；Antigravity 支持未知、免费、Pro、Ultra。“未知”始终可选。旧 `paid_personal`、`paid_team`、`api` 保留原值供读取与存量审核；编辑时提示重选，不擅自归入具体档位。

公开内容必须人工审核；修改审核期间保留旧的公开版本。撤回会清空内容及凭据哈希，之后旧凭据失效；原公开地址返回 410。应用不保存原始 IP、不设置 Cookie、不引入第三方追踪。后台登录由 Cloudflare Access 的独立管理会话承担。

`/appeal` 的官方入口、`TODO_DATE` 和 `TODO_CONTACT_EMAIL` 等占位内容需要站长人工核对填写。不要把设计示例或测试夹具导入生产数据库，也不要把测试 Turnstile 密钥用于生产。生产操作、备份和回滚步骤见 [DEPLOY.md](DEPLOY.md)。

# 新加坡服务器部署

域名 `haomeile.rip` 在 Porkbun，应用与 SQLite 数据库部署在现有新加坡 Debian 服务器。Cloudflare 提供免费的 Turnstile 和 Web Analytics。本方案不依赖 Workers 或 D1 远程资源。

## 运行方式

服务器使用 Bun 1.4.5 编译的独立 Linux x64 baseline 程序，原生 HTMLRewriter 与 SQLite 保留现有 Hono 业务逻辑。Caddy 提供 HTTPS，应用仅监听 `127.0.0.1:8788`；全部 HTML 与 API 经应用鉴权后读取资源，不能由 Caddy 单独暴露 `dist/admin/` 或内部模板。

- 发布目录：`/opt/haomeile/releases/版本/`，`current` 是原子切换的链接。
- 私密配置：`/etc/haomeile/haomeile.env`，root 0600，由 systemd 载入。
- 数据：`/var/lib/haomeile/haomeile.sqlite`，独立于发布目录；启用 WAL、外键、busy timeout 和 FULL 同步。
- 备份：`/var/backups/haomeile/`，每日一致性快照保留 14 天；更新前另存升级前快照。
- 服务：`haomeile.service`，独立无登录用户，内存上限 256 MiB，开机启动。
- 维护：`haomeile-maintenance.timer`，新加坡时间每天 04:17 附近先备份，再清理到期数据。

后台默认使用独立的 HTTP Basic 管理认证，通过 HTTPS 访问 `/admin`；密码由部署准备脚本随机生成，服务器仅保存与私密 PEPPER 混合后的哈希。错误登录按可信访客 IP 每小时限 20 次，成功请求释放计数。用户名和初始密码保存在本机被 Git 忽略的 `artifacts/private/haomeile-admin.txt`，不要上传到公共目录、发到聊天或提交 Git。Worker 的默认后台鉴权仍为 Cloudflare Access，没有新增 HTTP 绕过入口。

Caddy 覆盖外部传入的访客 IP 头，应用只接受回环代理传来的有效 IP 后立即计算短期哈希；网站关闭访问日志。当前域名直接解析到服务器，不启用 Cloudflare HTTP 代理。若以后启用代理，必须同时配置可信 Cloudflare 源地址与真实访客 IP 处理，不能直接信任任意客户端提交的头。

## 构建与准备

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm lint
pnpm test
pnpm test:server
pnpm test:e2e
pnpm build
pnpm exec bun build src/server/index.ts --compile --target=bun-linux-x64-baseline --no-compile-autoload-dotenv --no-compile-autoload-bunfig --outfile=artifacts/haomeile-server-linux-x64
node scripts/prepare-server-release.mjs
```

从 `tangka/haomeile` 的最新 `origin/main` 开工作分支，测试通过后合入并推送 `main`。在部署机的干净 `main` 上同步该提交并打包。`prepare-server-release.mjs` 仅打包静态资源、迁移、独立程序及运维配置；真实 `.dev.vars`、生产环境文件和管理密码不会进入发布归档。首次准备生成新的生产 PEPPER 与管理凭据，复用已有本机生产配置时不轮换。已有远程配置在更新时只更新发布版本和构建时间，密钥、PEPPER、管理员凭据及其余配置保持不变。

本地只保留最新发布的目录和对应的压缩包。新包生成成功后会自动清理旧包。可运行 `node scripts/prepare-server-release.mjs --prune-only` 清理已有的本地旧包，无需重新构建。

`SITE_ORIGIN` 必须为 HTTPS 纯 origin；静态资源构建支持 `PUBLIC_SITE_ORIGIN`。本项目正式值是 `https://haomeile.rip`。Turnstile widget 已允许此域名，普通开发与生产拒绝测试密钥，后端核对精确 hostname。

## 安装与切换

部署脚本严格核对已有 SSH 主机密钥，只使用本项目的专用 SSH 身份。首次使用前需要在目标服务器添加其公钥；不要改动现有巡检、恢复或其他登录密钥。

```sh
python3 scripts/deploy-server.py app --archive artifacts/releases/具体版本.tar.gz
python3 scripts/deploy-server.py http
```

应用健康通过后，Porkbun 中仅把根域名的默认停放 ALIAS 改为指向服务器的 A 记录，不改邮件、其他服务的记录或域名所有权。初始 HTTP 入口只提供健康检查，其余请求显示部署中，避免通过 HTTP 传送管理凭据。权威 DNS 与公网递归解析指向新地址后执行：

```sh
python3 scripts/deploy-server.py https
```

Caddy 自动申请和续期证书；只追加或替换带 `HAOMEILE MANAGED SITE` 标记的独立块，不替换其他站点。每次修改前备份并验证完整配置，失败时恢复，再平滑重载 Caddy。不要重启已有代理服务。

上线验收包括正常 HTTPS 证书、首页与中英文自动适配、真实 Turnstile 生成 token、API 健康、公开空库、匿名后台被拒绝、正确管理凭据可访问、私密配置和内部模板不对外暴露，以及原有服务保持运行。真实投稿审核链路使用隔离本地数据库验收，生产库不导入设计稿或测试记录。

## 更新、备份和回滚

日常更新在持有部署密钥的机器上运行 `node scripts/auto-release.mjs`（只看计划）和 `node scripts/auto-release.mjs --deploy`（检查、打包、部署、核对线上）。停下时怎么处理见 [deploy-haomeile skill](.agents/skills/deploy-haomeile/SKILL.md)。

更新前对当前 SQLite 调用一致性备份，再切换发布代码；`backup` 与 `cleanup` 命令不会隐式执行新迁移。迁移按文件哈希追踪，已应用迁移不能原地改写；失败的单次迁移会回滚。

脚本在应用健康失败且存在上一发布时自动恢复旧 `current` 链接。手动回退也应先检查旧代码与当前数据库结构兼容，再原子切换 `current` 并重启本项目服务；不要自动回退或覆盖数据库。

日常查看 `systemctl status haomeile`、`systemctl list-timers haomeile-maintenance.timer`，备份存放在受限目录。不得公开数据库、环境文件、后台密码或服务器 SSH 私钥。

## 网站访问统计

在 Cloudflare Web Analytics 中添加 `haomeile.rip`，选择手动接入。将该站的公开站点令牌保存到 `/etc/haomeile/haomeile.env` 的 `CLOUDFLARE_WEB_ANALYTICS_TOKEN`，发布时会沿用该配置。设为空并重启应用可关闭脚本。

统计脚本只在生产的公开内容页加载。立碑、编辑、制卡、管理、后台、API 和错误页面不加载。访问趋势与页面来源在 [Cloudflare Web Analytics](https://dash.cloudflare.com/?to=/:account/web-analytics) 查看。

在 Google Analytics 中为 `https://haomeile.rip` 设置网站数据流，关闭增强型衡量，将衡量 ID（`G-` 开头）写入 `/etc/haomeile/haomeile.env` 的 `GA4_MEASUREMENT_ID` 并重启应用。打开线上首页后，可在 [Google Analytics](https://analytics.google.com/) 的「实时」报告中查看页面浏览。清空这一项并重启可关闭 GA4。

## 重置雷达数据

在 `/etc/haomeile/haomeile.env` 配置 `RADAR_OVERVIEW_API_KEY`，将 `RADAR_OVERVIEW_API_URL` 设为 `https://api.tangka.online/radar-api/integrations/haomeile/overview` 并重启应用。重置雷达端要求单独的只读 Bearer Token，并核对 Nginx 读到的本站出口 IP。两台服务通过 HTTPS 通信，客户端拿不到上游凭据。怀疑泄露时，先在雷达端吊销旧凭据，再给两台服务配置新凭据并核验新旧令牌的响应。

进程启动后主动获取快照，之后每五分钟刷新，遇到上游限流时延后。`/radar` 和 `/en/radar` 从内存快照渲染 Codex、Claude Code、Antigravity 的概率、生成时间和最近 24 小时的概率趋势。趋势只使用已发布的采样点。若刷新失败或生成时间距今超过 45 分钟，页面标记为最近一次预测。超过三小时或没有有效快照时，页面显示数据暂不可用。

雷达人机验证开启时，未验证的 `/radar` 和 `/en/radar` 只返回独立的全屏验证页。服务器用 Cloudflare Turnstile 核对域名和 `radar_gate` 动作，签发 15 分钟通行 Cookie。验证和读取均按网络限频，雷达 HTML 禁止共享缓存。

在 `/etc/haomeile/haomeile.env` 将 `RADAR_HUMAN_CHECK` 设为 `false` 并重启应用，可暂时开放雷达。开放期间，直接进入预测页的访问纳入现有统计。把配置设为 `true` 或移除这一项，再重启即可恢复雷达验证。这个开关仅适用于雷达页面。

## 社区资料导入

首批经复核的公开来源摘要位于 `docs/research/community-cases.json`，来源和证据边界见同目录 README。它们不是原作者向本站提交的投稿，按 `origin=community` 单独计数，不进入自愿上报及曲线。用户投稿仍不接受来源链接或自行提供的翻译字段。

新程序启动并应用迁移后，以 `haomeile` 用户和现有私有服务环境运行：

```sh
/opt/haomeile/current/haomeile-server import-community /var/lib/haomeile/import/community-cases.json
```

命令会先生成一致性备份，再校验并以单次事务写入，只输出插入/跳过数量，不执行迁移。按稳定原帖身份去重，不覆盖已有记录，也不恢复隐藏或撤回记录。原作者请求删除时，运营人员应下架对应记录并从维护中的导入清单移除；既有备份、研究提交和外站原帖不应声称已同步删除。

### 重置雷达邮件提醒

新订阅按已启用渠道的日余额、月余额及订阅人数分配发信商。首次验证码确定渠道，确认后的提醒和设置变更沿用该渠道。已有订阅归属 Resend。所有渠道使用发件人名称「号没了~重置雷达」。

先在服务商后台激活事务邮件并验证发信域名，将服务商给出的 DNS 记录添加到 Porkbun。逐家核对发件地址和免费套餐后，在新加坡服务器的 `/etc/haomeile/haomeile.env` 配置下列变量并重启 `haomeile.service`。只配置已经通过验证的渠道。现有 Resend 密钥和地址可继续使用。

| 渠道 | 服务端凭据 | 已验证的发件地址 | 免费日上限 | 免费月上限 |
| --- | --- | --- | ---: | ---: |
| Resend | `RADAR_RESEND_API_KEY` | `RADAR_EMAIL_FROM` | 100 | 3,000 |
| Brevo | `RADAR_BREVO_API_KEY` | `RADAR_BREVO_FROM` | 300 | 按日 |
| Mailjet | `RADAR_MAILJET_API_KEY` 和 `RADAR_MAILJET_SECRET_KEY` | `RADAR_MAILJET_FROM` | 200 | 6,000 |

进入 `/admin` 的「雷达邮件额度」，可以查看各渠道的订阅人数、已用额度和可用余额。新加坡服务使用 SQLite 原子预留每一封的额度。Resend 会在发信响应带回用量时校准，其他渠道的数字只统计本站。对于账期起点未知的渠道，使用滚动 24 小时或 31 天保守计算。任一渠道日用量或月用量达 80%、剩余额度接近一轮订阅人数、渠道暂停或停用后仍有绑定用户，面板会提示。站长本机可运行 `node scripts/check-radar-email-capacity.mjs` 读取同一份汇总，凭据从被 Git 忽略的本机管理文件加载。

订阅者选择平台后，网站先发送一封验证邮件。订阅者可在页面输入邮件中的六位验证码（10 分钟有效），也可在 24 小时内打开同一封邮件中的链接并点击「确认订阅」。完成其中一种验证后，该邮箱才会加入所选平台的提醒名单。

服务端检查最新预测，某平台重置概率超过 80% 时，同一连续高位只向已确认关注该平台的邮箱提醒一次。概率回到 80% 或以下后再次超过门槛可重新提醒。提醒邮件含退订链接。服务商临时失败时会限时重试，退订后删除订阅及其排队中的提醒。

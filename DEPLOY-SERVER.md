# 新加坡服务器部署

当前用户选择 `haomeile.rip`：域名在 Porkbun，应用与 SQLite 数据库部署在现有新加坡 Debian 服务器。Cloudflare 仅提供免费正式 Turnstile；本方案不依赖 Workers 或 D1 远程资源。

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

打包前提交本次源码，使发布信息中的 Git 版本对应已检查代码。`prepare-server-release.mjs` 仅打包静态资源、迁移、独立程序及运维配置；真实 `.dev.vars`、生产环境文件和管理密码不会进入发布归档。首次准备生成新的生产 PEPPER 与管理凭据，复用已有本机生产配置时不轮换。已有远程配置在更新时保持不变。

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

更新前对当前 SQLite 调用一致性备份，再切换发布代码；`backup` 与 `cleanup` 命令不会隐式执行新迁移。迁移按文件哈希追踪，已应用迁移不能原地改写；失败的单次迁移会回滚。

脚本在应用健康失败且存在上一发布时自动恢复旧 `current` 链接。手动回退也应先检查旧代码与当前数据库结构兼容，再原子切换 `current` 并重启本项目服务；不要自动回退或覆盖数据库。

日常查看 `systemctl status haomeile`、`systemctl list-timers haomeile-maintenance.timer`，备份存放在受限目录。不得公开数据库、环境文件、后台密码或服务器 SSH 私钥。

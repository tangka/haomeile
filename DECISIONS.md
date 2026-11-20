# 实施决策

## M0 · 2026-11-20

- 按 PLAN.md 使用 Astro 静态构建、Hono Worker 与 D1。动态页面由 Worker 将数据库内容写入 Astro 模板，因此首屏与分页在无 JavaScript 时也包含真实内容。
- 本地统一在 http://127.0.0.1:8787 提供页面和 API；仅在本地复制官方 Turnstile 测试配置。生产配置不包含测试密钥和任何后台绕过。
- design/ 保持只读，生产环境不导入设计稿的示例数据。
- Cloudflare 官方已将计划中的 `@cloudflare/vitest-pool-workers` 更名为 `@cloudflare/vitest-plugin`，使用官方维护的新包和 Vitest 4.1，仍在真实 Workers 运行时测试（https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/）。

## M1 · 数据与接口

- 浏览器和 Worker 使用独立 TypeScript 配置，防止 Workers 的 `Element` 与浏览器 DOM 类型冲突；共享字段类型用模块形式导入数据库类型。
- 撤回严格执行只保留编号、状态、时间及审计的要求，连凭据哈希也清空。撤回的即时响应显示“已撤回”，之后旧凭据不能再查询；公开地址返回 410 的处理在 SEO 阶段完成。
- 举报按不同访客的未处理举报计数，重复举报不增加次数。三个不同访客触发隐藏；不将举报人数视为内容真实与否的结论。
- M1 验证：49 项单元/接口测试通过（真实 Workers 运行时与 D1），构建、严格类型检查、ESLint 通过。测试数据只存在于隔离测试数据库。

## M2 · 设计稿接入

- Astro 静态生成 `/_templates/tomb/`、`/_templates/vendor/`，Worker 在请求时用 HTMLRewriter 写入真实数据、元信息与可抓取分页；模板不允许直接访问。Astro 忽略下划线源码目录，因此用 `[template]` 的静态路径生成模板。
- 使用设计稿的 CSS、SVG、文案与 DOM 结构；只补充 hidden、焦点、窄屏网格必要修正。375px 实测发现原稿 grid 的最小内容宽度导致文字被裁切，已改为 `minmax(0, 1fr)`，文字与猫的右边界均为 359px。
- 近 30 天曲线放在纪念墙之后，避免新增图表改变原设计的首页重点；提供每日数据表供辅助技术读取。
- 已用官方测试 Turnstile 在浏览器实际提交本地示例，并验证凭据弹窗在未确认保存时禁止关闭及 Esc。修正容器 ID 产生的 `window.turnstile` 同名 DOM 属性冲突。
- M2 验证：60 项单元/接口测试通过，构建、类型检查、ESLint 通过；包含服务端分页、用户文本转义、JSON-LD 安全序列化及二进制资源完整性检查。

## M3 · 审核与访问控制

- 按 [Cloudflare 官方 JWT 校验文档](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) 使用 WebCrypto 验证 RS256 签名、固定配置的签发者、应用 audience、有效期、not-before 和应用令牌类型；仅接受带邮箱的人类管理员身份。管理员白名单由 Access 应用策略限制。本地没有绕过鉴权的开关。
- 公钥只从配置团队的 `/cdn-cgi/access/certs` 获取；匹配 `kid`，短期缓存并支持轮换；获取失败或配置不完整均拒绝访问。
- 修改审核保持原有公开版本；隐藏中的墓碑即使修改通过也保持隐藏。所有决定使用数据库批处理和条件更新，避免与用户撤回、再次修改同时发生时重新公开旧内容。
- “被举报”队列同时保留所有隐藏内容，防止逐条处理完举报后无法再找到恢复入口。显式“恢复显示”代表一次完整复核，同一事务关闭当前已有举报，并在审计里记录数量；之后新举报重新累计。只处理单条举报不会自动恢复显示。
- 后台 API 仅返回审核所需数据，不返回凭据哈希或访客哈希。拒绝原因最长 200 字，也通过隐私检测。后台每次有效操作写审计；过期重复操作不追加虚假审计。
- Cloudflare Access 的管理员登录请求使用同源会话凭据，以便边缘校验登录并注入签名头；公开页面 API 不发送 Cookie，应用本身不设置 Cookie。
- 管理路径及静态别名均在资源读取前鉴权，并强制 no-store/noindex；设计路由全部为 ASCII，带百分号编码的路径统一拒绝，避免资源路径归一化绕过。
- M3 验证：合并后 89 项测试全部通过，构建、类型检查与 ESLint 通过。包含实际 Worker 签名 JWT 鉴权、后台别名保护、撤回与审核并发的回归测试。

## M4 · 墓志铭卡片

- 直接移植原稿 Canvas 绘制函数和 32 条文案，只补 TypeScript 类型；输入、随机文案、三种装饰、日夜模式、PNG 输出全部在浏览器完成。
- Playwright 使用独立本地 Worker 与 D1 状态目录（端口 8790），不会连接生产数据库。Turnstile 回归测试仅替换浏览器 SDK 脚本来验证加载逻辑，不给应用添加跳过验证的开关。
- M4 验证：89 项单元/接口测试及 2 项 Playwright 测试通过；卡片下载为有效 PNG，卡片页面没有 fetch/xhr 或外部请求；构建、类型检查与 ESLint 通过。

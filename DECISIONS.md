# 实施决策

## M5 · 可读性与合法长文本

- 设计稿白天草坡的浅字与背景对比度为 3.11:1，13px 注释和筛选文字未达到正文 AA 要求；保留原有颜色变量，将草坡正文、筛选、卡片生成器预览说明和已公开状态文字改用 `--ink`。白天达到 4.64:1，夜间达到 8.12:1。深草地统计区和页脚沿用 `--grass-ink`，分别为白天 5.18:1、夜间 11.06:1。
- 移除统计说明与折线图说明的透明度，避免不透明颜色合格后又因混色降低对比度。错误、规则标记、TODO 和拒绝/隐藏状态文字改用已有 `--ink`，保留原来的红色边框和浅红底；在浅红底上白天为 11.99:1、夜间为 11.10:1。后台完整字段不再套用仅适合石面背景的浅色模式深灰字，改用界面正文色。
- 为合法的 32 字符连续英文代号、120 字符墓志铭、长经过和署名增加自然换行与网格最小宽度处理；未修改 design/。这是为满足 PLAN.md 的移动端与 WCAG AA 验收而对移植样式做的局部修正，没有新增色值或字体。

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

## M5 · 安全与完整验收

- 已接入每日 Cron 清理：拒绝稿 30 天、已处理举报 90 天、限流与献花去重记录超过 2 天删除；保留累计献花数。清理具备期限边界、外键级联与重复执行测试。
- 增加“不记得 / 到月 / 到日”的注册时间精度选择；从月改成日时清空日期，不推测具体日子。修正精确日期编辑预填时先改变控件类型再写入值的顺序。
- 浏览器完整流程发现静态目录重定向会丢失 `mode=edit`；Worker 内部读取带斜杠的资源路径，使浏览器保留原始编辑参数，并补服务端回归测试。
- E2E 构建、数据库与配置均隔离在 `.wrangler/e2e-*`；审核使用明确的本地 SQL 夹具，签名 JWT 的真正后台流程另由接口测试覆盖。浏览器 SDK 夹具产生官方 dummy token，实际业务请求仍由 Worker 向官方 Siteverify 校验。
- 375px 逐页检查浅色/深色，另测 32 字无空格代号、120 字墓志铭、长署名与经过。文字检查针对实际墓碑裁切边界，避免将宋体字形超出行框的正常字体度量误判成裁切。
- M5 验证：95 项 Workers/D1 单元和接口测试、34 项 Playwright 浏览器测试通过，构建、前端/Worker/E2E 严格类型检查与 ESLint 通过。

## M5.5 · SEO、抓取与性能

- 动态 sitemap 只包含当前公开墓碑和达到 5 条公开记录门槛的厂商页；超过 45,000 条时拆为索引、静态页面表及分片。已验证 45,001 条记录的边界、XML 转义和撤回移除。
- 静态页面 lastmod 使用 Cloudflare 提供的 Worker 版本创建时间绑定，避免每次请求伪造“更新时间”；普通 `wrangler deploy` 会创建并激活新版本。依据：https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/ 。
- 保留 canonical、OG、robots、llms、JSON-LD、410/404 与缓存限制；分页在服务端输出真实链接。筛选链接使用适用于链接的 aria-current，献花按钮可访问名称包含可见文字及格式化数字。
- Lighthouse 13.6.0，在本地 Wrangler 上按默认模拟移动端运行：首页 Performance / Accessibility / Best Practices / SEO 均 100，LCP 775ms，CLS 0；公开墓碑详情四项均 100，LCP 766ms，CLS 0。无运行警告。原始结果在本地 artifacts/lighthouse/，可移植摘要在 docs/verification/lighthouse-summary.json；这是本地实验数据，不代表生产网络或真实用户表现。
- 生产 Worker dry-run 打包通过，gzip 34.44 KiB；仅验证构建产物和配置，未创建远程资源、发布 Worker 或绑定域名。

## M6 · 运行与部署交付

- 已编写 README.md 与 DEPLOY.md：本地运行、测试与目录说明，以及 D1、真实 Turnstile、Access、域名、生产密钥、首次发布、备份和回滚步骤。
- 最终桌面空状态目视检查补齐了空墙横跨全部网格列的样式；已在实际浏览器确认空状态宽度与纪念墙一致，375px 仍使用单列。
- 重新执行构建、类型检查、ESLint、100 项单元/接口测试和 34 项浏览器测试通过。本地验收墓碑已通过真实撤回接口清除，公开总数为 0，原地址返回 410，sitemap 不再包含它。
- 所有实现仅在本地分支提交。未推送远程分支、未执行生产迁移、未发布 Worker、未绑定域名；生产仍需站长按 DEPLOY.md 填写数据库 UUID、真实密钥、Access 策略及人工核对的文案与链接。

## 2026-11-20 · 产品范围纠正

- 用户明确只覆盖 Claude、Codex、Antigravity（反重力）。此前把 ChatGPT、Gemini 作为产品入口以及扩展到其他厂商的实现不符合范围，分别纠正为 Codex、Antigravity，并移除其余产品入口。
- 对外分类称“产品”，数据库列、API 字段与兼容路由参数继续使用 `vendor`；规范键仅 `claude`、`codex`、`antigravity`。历史 `chatgpt`、`gemini` 键分别迁移到对应新键，其余旧产品记录不删除、不伪造映射，排除在公开墙、详情、统计和 sitemap 之外。
- 同步修改实施方案和设计说明的产品范围；原静态 HTML、像素图与视觉样式保留，移植时以本次范围纠正及实际应用为准。产品选择、卡片生成器、官方入口与页面说明均限定三种产品；“其他”事件原因和法律厂商归属声明不受影响。
- 验证：构建、类型检查、ESLint、121 项单元/接口测试和 35 项浏览器测试全部通过；实际浏览器确认三个产品的筛选、投稿与生成器选项以及新路由。`0002_three_products.sql` 仅已应用到本机 D1，未执行远程迁移或部署。

## 2026-11-20 · 首页简化、套餐档位与验证配置

- 按用户最新要求移除首页与产品页的产品、事件两组筛选，以及按产品、按事件种类的分布区；保留总体数字、纪念墙、近 30 天曲线。投稿里的产品和事件字段保留。原视觉 HTML 不改，实施说明不再要求还原已移除的区块。
- 套餐改为按产品联动的个人档位，`unknown` 始终保留，Free 显示“免费”：本站当前支持 Claude `unknown/free/pro/max/ultra`、Codex `unknown/free/go/plus/pro`、Antigravity `unknown/free/pro/ultra`。核对来源：[Claude pricing](https://claude.com/pricing)、[Codex pricing](https://chatgpt.com/codex/pricing/)、[Antigravity pricing](https://antigravity.google/pricing)。这些是本站支持的选项，不宣称覆盖官网全部团队、企业或其他档位，不记录价格。
- 不把旧 `paid_personal`、`paid_team`、`api` 猜测映射到具体新档位。读取及已有待审内容审核保留旧值；编辑时回到 `unknown` 并提示重新选择，新写入按产品对应的档位校验。
- Turnstile 是真实 SDK + 后端 Siteverify 调用；当前本地为官方始终通过的测试密钥，生产 site key 仍待配置。官方[方案说明](https://developers.cloudflare.com/turnstile/plans/)显示免费版验证请求不限量，最多 20 个 widget、每个 widget 10 个主机名；免费并不表示正式密钥已配置或线上链路已验收。
- 验证：构建、前端/Worker/E2E 类型检查、ESLint、146 项单元/接口测试和 38 项浏览器测试通过。实际浏览器确认筛选与分布区均不存在，套餐选项随三个产品联动；不创建新迁移、不改写已有套餐记录，也未配置生产 Turnstile 密钥或执行部署。

# 号没了 · 搜索、AI 引用、统计与广告交接

交接快照更新于 2026 年 11 月 23 日 16:50（新加坡/北京时间）。站点是 [haomeile.rip](https://haomeile.rip/)，仓库是 `tangka/haomeile`，现行实现分支是 `codex/implement-haomeile`，线上最新代码为 `f591079`（线上发布包 `20261123074147-f591079`）。涉及账户、收录状态或流量时，以当轮后台核对为准。

[新加坡生产部署](../DEPLOY-SERVER.md)是线上发布入口。[SEO 设计稿](../design/SEO.md)和 [main 分支的早期运营计划](https://github.com/tangka/haomeile/blob/35329be7b5e78a787f1b3f3a84a80e0730b86da9/docs/OPERATIONS.md)提供历史背景。站长后续决定保留「使用小技巧」、启用 GA4，并在 AdSense 审核通过后再加广告。

## 线上已经完成的事

| 项目                  | 已核对的结果                                                                                                                                                                             | 实现或记录                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Google Search Console | `https://haomeile.rip/` 网址前缀资源已验证。站点地图已处理（上次读取 `2026-11-23`，原显示 104 个网址，线上 `/sitemap.xml` 现已增至 108 个）。实查 `/`、`/appeal`、`/tips`、`/v/claude`、`/v/codex`、`/v/antigravity` 6 个核心页**全部已编入索引**且规范网址匹配，三个 `/v/*` 页已检出有效 `Breadcrumbs`；上次抓取时间均在 `15:35` 新版发布前，且「请求编入索引」触发 reCAPTCHA 需站长手动完成。 | [首页模板](../src/site/pages/index.astro)，`e631d97`、`d7d2f13`、`901c790`、`f591079` |
| 品牌词曝光            | 实际在 Google 搜「号没了」时第一页尚无本站；搜 `"haomeile.rip"` 已可被 AI 搜索识别引用。Search Console 效果报告仍显示「正在处理数据，请过 1 天左右再来查看」。 | [Search Console 效果报告](https://search.google.com/search-console/performance/search-analytics?resource_id=https%3A%2F%2Fhaomeile.rip%2F) |
| 搜索标题、语言切换与内链 | 移除中文路径基于 `Accept-Language` 的强制 302 跳转，在顶部导航栏新增显式 `English` / `中文` 切换；修复 `/t/:id` 重复词「账号账号停用」（影响 25/32 条案例）；统一英文标题后缀与 `og:site_name` 为 `Haomeile`；扩充 `/appeal`（含 Antigravity 403、Starter Quota、Codex 401、Claude 恢复问答）与三个 `/v/*` 产品页专属标题/摘要/内链；`/en/tips` 展示英文标题并保留原中文标题出处；修复 3 处硬编码中文官方文档外链。 | [渲染](../src/worker/render.ts)、[本地化](../src/worker/localize.ts)、[申诉页](../src/site/pages/appeal.astro)、[顶栏](../src/site/components/SiteHeader.astro)，`901c790`、`f591079` |
| AI 搜索与结构化数据    | 公开页均直出 HTML 且不因 `Accept-Language` 跳转。`/appeal` 已加 `FAQPage` + `BreadcrumbList`，`/tips` 与 `/v/*` 已加 `CollectionPage` + `BreadcrumbList`，13 篇 `/tips/*` 已加 `HowTo`（含 `author`/`datePublished`/`citation`/`isBasedOn`）+ `BreadcrumbList`，`/t/*` 已补 `publisher`/`mainEntityOfPage`/社区摘要 `inLanguage`。`llms.txt` 已补全 13 篇指南、官方申诉摘要和完整英文入口。Bing Webmaster Tools 尚未登录核对。 | [robots.txt](../public/robots.txt)、[llms.txt](../public/llms.txt)、[技巧页](../src/site/pages/tips/[slug].astro)，`901c790` |
| GA4 与 Cloudflare     | **Cloudflare Web Analytics**（MCP 实拉 `11-22 ~ 11-23 08:42 UTC`）：累计 **108 Visits / 148 Page views**（`11-22` 为 12/16，`11-23` 为 96/132）；Top 页面为 `/tips/antigravity-first-install-google-ai-pro`（53 Visits / 57 Views）、`/`（20/34）、`/tips/claude-max-google-play-recovery`（21/21）；已出现来自 `www.google.com`（2 Visits）与 `cn.bing.com`（1 Visit）的自然搜索访问及微信（8 Visits）。**GA4** 实时概览正常采集（11-23 下午见实时 `page_view`），标准报表因默认截至 `11-22` 且有 24–48h 延迟暂显示 0，待次日核对 `11-23` 数据。 | [GA4 脚本](../public/assets/ga4.js)、[部署和环境配置](../DEPLOY-SERVER.md#网站访问统计)，`2b556b8` |
| AdSense               | 线上 `/ads.txt` 返回 200 且与仓库逐字节一致，公开页未加载任何广告脚本。本轮浏览器访问 `adsense.google.com` 触发 `accounts.google.com` 二次验证未读取最新审批状态，需站长在「网站」列表核对是否已变为「准备就绪」。 | [ads.txt](../public/ads.txt)，`9306a32` |

站点地图里的 104 是 Google 发现的网址数。“百度是否收录”“目前自然搜索日活”“AI 是否已引用”和“广告审核是否通过”都需要各自的证据。直接访问某页成功，只能验证该页当前可访问。

## 普通搜索怎么继续

- 从 Search Console 的「网址检查」读首页和目标页面的收录、上次抓取、Google 选定的规范网址。再用「效果」按查询和页面看曝光、点击、点击率与平均排名。记录日期范围和区域。品牌词目前只是一次搜索快照，适合留作对照。
- 点进 sitemap 详情看最近读取、处理状态和发现网址数。新提交时，列表曾短暂显示「无法抓取」，而详情已经显示成功。若问题持续，再按 Google 文档使用实际网址测试，核对 XML、抓取权限和响应状态。 [Google 站点地图报告](https://support.google.com/webmasters/answer/7451001)
- 一页解决一个具体问题。从「Claude 封号怎么申诉」「Codex 账号停用」「Antigravity 403」「Claude Max 扣费后还是 Free」起步。已有产品页和指南先补明确步骤、官方入口和来源，把新增内容从相关页面连过去。
- 中文内容对应英文页面有自己的标题、描述和 canonical，语言切换路径由服务端输出。修改 Astro 文案时同步 [英文映射](../src/shared/en-static.ts)，并检查 [本地化重写](../src/worker/localize.ts)。
- 页面有实质更新时，验收上线后向 Search Console 请求重抓。重复提交同一个网址不会提高队列优先级，Google 也可能按页面内容重新选择搜索标题。 [Google 标题规则](https://developers.google.com/search/docs/appearance/title-link) · [请求重新抓取](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)

优先维护的入口为 [纪念墙](https://haomeile.rip/)、[Claude 案例](https://haomeile.rip/v/claude)、[Codex 案例](https://haomeile.rip/v/codex)、[Antigravity 案例](https://haomeile.rip/v/antigravity)、[申诉页](https://haomeile.rip/appeal) 和 [技巧目录](https://haomeile.rip/tips)。

## AI 搜索怎么继续

- 用可直接读取的 HTML 给出具体回答、操作步骤和可核对的来源。公开摘要保留原帖日期，有明确事发日期时单独记载。把官方申诉说明、用户经历和本站整理分别标明在对应来源或栏目里。
- 使用搜索端的实际引用作为 GEO 结果。爬虫 User-Agent 测试返回 200，只说明该请求能读取页面。ChatGPT 搜索抓取使用 `OAI-SearchBot`，Google AI 搜索沿用正常的索引和摘要资格，`llms.txt` 可给支持它的工具作导航。 [OpenAI 爬虫说明](https://developers.openai.com/api/docs/bots) · [Google AI 搜索指南](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- 下一项可独立接手的工作是核对 Bing Webmaster Tools 是否已经有本站。完成验证后提交现有 sitemap，用 AI Performance 观察引用页和引用次数。提交、收录、引用分别记状态。涉及连接新的账号或授权关联账号时，交给站长核对。 [Bing 站点验证](https://www2.bing.com/webmasters/help/add-and-verify-site-12184f8b) · [Bing AI Performance](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/)

## 内容怎么继续做

现有四小时任务同时检查纪念墙与使用小技巧。继续使用现有任务，遇到没有合格来源的一侧就跳过该侧。

- 纪念墙先查 X，再查 Reddit、GitHub Issues 和开发者论坛。优先查近 48 小时的第一人称停用经历，再扩至一周，最远查近一个月。核对公开日期、作者后续和申诉状态，按规范化原帖地址去重。社区摘要用中英文第一人称转述，账号标识、工单号和私人信息留在原处。 [案例清单](research/community-cases.json) · [收录约定](research/README.md) · [生产导入说明](../DEPLOY-SERVER.md#社区资料导入)
- 使用小技巧选近 30 天的中文 X 原生长文。保留原标题、作者、原始发布时间和 `x.com/i/article/` 长文链接，按原生文章 ID 去重。从原帖核对作者的实操，用官方说明复核入口和步骤。目录一篇一行，详情保留原文出处。入口为 [技巧数据](../src/shared/tips.ts)。
- 账户停用经历适合记录时间、通知、已经尝试的操作和已知结果。恢复结果按原帖可见进度转述。新的申诉与账单指南优先覆盖本人通过正规渠道能完成的问题。

可以对照同一个案例从不同入口呈现的方式。纪念墙讲当事人的经过，指南讲核对 Google Play 订单和联系支持的步骤。 [Claude 停用及恢复的记录 #0031](https://haomeile.rip/t/RY2SSJDOPW) · [Max 仍显示 Free 的排查指南](https://haomeile.rip/tips/claude-max-google-play-recovery)

## 统计和 AdSense 的使用边界

GA4 适合看活跃用户、浏览与流量来源。Cloudflare 的 Visits 是访问口径，和 Page views 的浏览次数不同。SEO 成效看 Search Console 的自然搜索数据，AI 引用与来自 AI 页面的一次访问也分别记录。GA4 当前发送的页面地址只含站点和路径，referrer 只保留来源站点。测试事件、短时实时数字和成熟的日常流量应按各自口径记录。

GA4 和 Cloudflare 注入由 [服务端](../src/worker/render.ts)控制，覆盖线上公开阅读页，立碑、制卡、管理、后台、API 和错误页面不加载统计。现有统计按 [数据说明](https://haomeile.rip/privacy)披露。复核统计使用正常浏览事件和 GA4 实时报告。

站长已明确要求**等网站审核通过后再加广告**。复查以 [AdSense「网站」列表](https://adsense.google.com/) 中 `haomeile.rip` 的审批状态为准，看到「准备就绪」再设计广告位置、隐私和同意设置、上线与复核。提交审核时已用 `ads.txt` 验证，线上页面当前不加载广告脚本。截图里的广告预览和自动广告开关属于设置页面。 [AdSense 审批状态说明](https://support.google.com/adsense/answer/12170222?hl=zh-Hans)

## 多个 AI 怎么分工与验收

| 可以独立接手的任务 | 交付标准                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| 搜索数据与抓取     | 给出 URL、索引结果、查询和日期范围，确认一个可复现的问题或整理一组值得更新的页面。                |
| 内容与 AI 引用     | 围绕一个用户问题完善已存在的页面，给出原文和官方来源，核对结果、时点以及中英文页面。              |
| 广告准备           | 核实 AdSense 审核结果和缺的事项。审核通过后按站长要求实现广告，核对实际上线的页面范围和后台状态。 |

工作从 `origin/codex/implement-haomeile` 的最新提交开始。各自使用分支或工作树，提交前重读差异，保留其他人的进行中改动。对外发帖、改账号授权、启用广告和生产发布按站长当前授权执行。登录、付款、密钥和私有配置留在现有受限环境。

### 常用核对命令

```sh
git status --short --branch
pnpm check
pnpm lint
pnpm test
pnpm test:e2e tests/e2e/release-copy.spec.ts tests/e2e/responsive.spec.ts
curl -fsS https://haomeile.rip/api/health
curl -fsS https://haomeile.rip/sitemap.xml
curl -fsS https://haomeile.rip/ads.txt | cmp - public/ads.txt
```

修改社区数据时运行 `pnpm exec bun test tests/server/community.test.ts`，导入后用公开 API 和详情核对原帖及编号。修改页面时在中英文线上地址核对标题、摘要、canonical、hreflang、实际正文、内链和抓取权限。日常应用发布用 [现有新加坡部署脚本](../DEPLOY-SERVER.md)，打包前提交待构建版本，本地保留一版发布包（`d7b92fc`）。每次交接写出提交号、测试结果、已上线地址和后台待处理状态。

最近一次 SEO/GEO 发布（`901c790` + `f591079`，线上版本 `20261123074147-f591079`）通过类型检查、Lint、214 项 Worker 测试、48 项 Bun 服务端测试和 53 项端到端测试（`release-copy`、`responsive`、`i18n`）。线上 16 项回读检查及顶栏语言切换均已复核。下一步待处理：1）站长在 GSC 手动过一次 reCAPTCHA 为 `/appeal`、`/v/claude`、`/v/codex`、`/v/antigravity`、`/tips` 请求重抓；2）登录 Bing Webmaster Tools 验证并提交 `/sitemap.xml`（Cloudflare 已观测到 `cn.bing.com` 来访）；3）核对 AdSense「网站」列表状态与次日 GA4 `11-23` 标准报表；4）补齐 Codex 近期案例（当前仅 6 条，远低于 Claude/Antigravity 各 13 条）。

## 第二轮记录（2026-11-24，Claude）

分工：`main` 是唯一主线。开工前先取 `origin/main`，各自在自己的分支改，测完合回 `main`，部署只用 `main`。`claude/seo-geo-2` 由 Claude 使用；其他 AI 不要再从 `codex/implement-haomeile` 部署，否则会覆盖这一轮内容。

| 项 | 状态 | 提交 |
| --- | --- | --- |
| S1 | 16 篇技巧已改成本站转述，有出处行、`isBasedOn` 和测试。**39 条以上社区案例、`/t/*` 出处行与 JSON-LD、线上已有记录的更新命令还没做** | `117e652` |
| S2 | 页脚、关于页、`llms.txt` 的独立声明；隐私页写明广告 Cookie | `32a31b3` |
| S3 | `/v/antigravity`、`/v/claude` 首屏答案和 Starter Quota 页。`/v/codex` 没做。常见通知只写核对过的官方页面和原帖，没有统计“通知原文” | `60adc09` |
| S4、S7、S9 | 没做 | |
| S5 | 只有部分声明；Organization 标记、关于页三节没做 | |
| S6 | 雷达公开说明直出，标明非官方、只算额外重置、没有命中率数据 | `71b3c1d`、`93c32f3` |
| S8 | 没有新增 FAQ / HowTo 标记 | |
| 测试 | 导入测试原来会用正式网址通知 IndexNow 和 WebSub，已改 | `f5ad51d` |
| 发布 | `scripts/auto-release.mjs` 与 `deploy-haomeile` skill；打包不再夹带 macOS `._` 文件 | `19b95f3`、`4cabdbf`、`8e66887` |

- 没有新的数据库迁移。
- 合并 `codex/implement-haomeile` 后 e2e 75 项通过；第二批技巧后再次 75 项通过。之后只改了发布脚本和文档。
- 待站长：Search Console 给改过的页面请求重抓，并确认网站纳入生成式 AI 功能；GA4 渠道组和时区；关于页的处理时限、复查周期、最近一次更正日期；是否不显示三篇技巧的原标题。
- GA4 的浏览次数疑似重复计数，原因未查明，浏览量先看 Cloudflare。

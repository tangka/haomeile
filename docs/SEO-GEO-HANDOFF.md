# 号没了 · 搜索、AI 引用、统计与广告交接

交接快照为 2026 年 11 月 23 日（新加坡时间）。站点是 [haomeile.rip](https://haomeile.rip/)，仓库是 `tangka/haomeile`，现行实现分支是 `codex/implement-haomeile`，本轮工作基于 `d7d2f13`。涉及账户、收录状态或流量时，以当轮后台核对为准。

[新加坡生产部署](../DEPLOY-SERVER.md)是线上发布入口。[SEO 设计稿](../design/SEO.md)和 [main 分支的早期运营计划](https://github.com/tangka/haomeile/blob/35329be7b5e78a787f1b3f3a84a80e0730b86da9/docs/OPERATIONS.md)提供历史背景。站长后续决定保留「使用小技巧」、启用 GA4，并在 AdSense 审核通过后再加广告。

## 线上已经完成的事

| 项目                  | 已核对的结果                                                                                                                                                                             | 实现或记录                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Google Search Console | `https://haomeile.rip/` 网址前缀资源通过首页 HTML 元标签完成所有权验证。站点地图详情显示成功处理并发现 104 个网址。首页、申诉页和技巧目录在「网址检查」中已收录，更新后均提交重新抓取。  | [首页模板](../src/site/pages/index.astro)，`e631d97`、`d7d2f13`                                                                            |
| 品牌词曝光            | 实际在 Google 搜「号没了」时，第一页没有本站。刚建好的 Search Console 效果报告仍在处理，暂无可靠的查询曝光、点击和排名数据。                                                             | [Search Console 效果报告](https://search.google.com/search-console/performance/search-analytics?resource_id=https%3A%2F%2Fhaomeile.rip%2F) |
| 搜索标题和内链        | 中英文首页、申诉页、技巧目录已用更具体的标题与描述。首页产品名可跳到各自的案例页，申诉页有入口通往 Claude Max 账单排查指南。中英 canonical 和语言路径已在线核对。                        | [英文文案](../src/shared/en-static.ts)，`d7d2f13`                                                                                          |
| AI 搜索               | 公开页面允许抓取，首屏正文由服务端输出。案例详情带原帖链接，已有结构化数据通过 `citation` 和 `isBasedOn` 关联来源。`llms.txt` 补了三个产品页和代表性指南。暂未取得可核实的 AI 引用数据。 | [robots.txt](../public/robots.txt)、[llms.txt](../public/llms.txt)、[页面渲染](../src/worker/render.ts)                                    |
| GA4 与 Cloudflare     | 两套访问统计都在生产公开阅读页运行。浏览器实测 GA4 `page_view` 返回 HTTP 204，随后在「实时概览」看到测试访问。                                                                           | [GA4 脚本](../public/assets/ga4.js)、[部署和环境配置](../DEPLOY-SERVER.md#网站访问统计)，`2b556b8`                                         |
| AdSense               | 站点通过 `ads.txt` 所有权验证，后台已显示「已请求审核」「正在准备」。收款地区已设为中国。线上 `/ads.txt` 返回 200，内容与仓库记录一致。                                                  | [ads.txt](../public/ads.txt)，`9306a32`                                                                                                    |

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

最近一次 SEO/GEO 发布通过类型检查、Lint、215 项 Worker 测试和 30 项页面端到端测试。线上首页、申诉页和技巧目录的中英文版本、`/llms.txt`、`/sitemap.xml`、`/ads.txt` 均已复核。

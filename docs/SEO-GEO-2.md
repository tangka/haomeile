# 号没了 · SEO / GEO 第二轮（给 Codex / Antigravity 执行）

适用分支：`codex/implement-haomeile`（核对时为 `8825e08`）。
背景：Codex 和 Antigravity 已经完成了基础工作（见 `docs/SEO-GEO-HANDOFF.md`）：Search Console 和 Bing 验证、sitemap、hreflang、IndexNow、Atom 订阅源、`llms.txt` / `llms-full.txt`、厂商页、结构化数据、统计。**本轮不重复这些，只做会影响排名和 AI 引用的部分。**

按编号顺序做；可以分给 Codex 和 Antigravity 并行，S1、S2 由同一方先完成，其余各项互不依赖。每项完成后跑 `pnpm check && pnpm lint && pnpm test`，提交信息以 `S<n>:` 开头。S1、S2 先做：它们是风险，不做的话后面的优化可能白费。

---

## S1 · 别人的经历不要用“我”来写（风险，必须先做）

**现状**：社区整理和使用小技巧都把别人的帖子改写成第一人称。例如 `docs/research/community-cases.json` 里“我的付费 Claude 账号被停用了……”，`src/shared/tips.ts` 里“我开通了一年的 Google AI Pro……”。同时 `/tips/*` 的 HowTo 结构化数据把 `author` 写成 X 原文作者，`/t/*` 社区记录的 `author` 写成 Organization。

**问题**：
- 读者和 AI 会以为这是当事人本人在本站写的。AI 引用时会写成“号没了的一位用户说……”，或把本站的转述当成原作者原话，等于替别人说话。
- Google 把“大量改写他人内容、几乎不增加价值”视为规模化内容滥用（scaled content abuse）。2026 年 5 月起，Google 明确这些垃圾政策同样适用于 AI 摘要和 AI 模式。一旦被判定，影响的是整站，不只是这几页。
- 把转述挂在原作者名下（`author` = X 作者），等于替原作者署名了他没写过的文字。

**改动**：
1. `docs/research/community-cases.json`：所有 `story` / `story_en` 改成第三人称转述，开头点明出处。
   - 例：`原帖作者说，他的付费 Claude 账号被停用，通知里只提到“可疑信号”，没说明是哪次操作。作者提交了申诉并要求退还订阅费；11 月 20 日再次发帖时，账号仍未恢复。`
   - 英文：`The original poster says their paid Claude account was suspended…`
   - 只写原帖里看得到的事实；作者的猜测保留时写成“作者猜测……”。
2. `src/shared/tips.ts`：正文改成“原文作者记录了……”或直接写成本站的操作步骤（祈使句），不再用“我”。`title` 用本站自己的描述性标题；原文标题只在出处区块里作为引文出现。
3. `src/site/pages/tips/[slug].astro` 的 JSON-LD：`author` 改为 `{ "@type": "Organization", "name": "号没了" }`；原文作者和链接放进 `isBasedOn: { "@type": "CreativeWork", "url": 原文, "author": { "@type": "Person", "name": 原作者 }, "datePublished": 原文日期 }`。`datePublished` 改成本站发布日期，`dateModified` 用最近一次修改日期。
4. 每篇技巧和每条社区整理的正文上方加一行出处说明：`本站根据 @{作者} 于 {日期} 发布的原文整理，非原文作者撰写。<a>查看原文</a>`。
5. `/t/*` 社区记录页的 JSON-LD 保持 `DiscussionForumPosting` 不合适（那不是本站用户发的帖）。改为 `Article`：`author` = 号没了，`isBasedOn` = 原帖。用户自述的碑继续用 `DiscussionForumPosting`。
6. 删掉技巧页显示的 X 原文阅读数（`sourceViews`）。它是别人的数据，本站无法保持准确。
7. 收录约定（`docs/research/README.md`）和交接文档里“第一人称转述”的说法同步改成“第三人称转述、注明出处”。
8. 测试：新增一条测试，确保 `community-cases.json` 和 `tips.ts` 的中文正文不以“我”开头，英文正文不以 `I ` / `My ` 开头。

## S2 · 补回独立声明（风险，必须做）

页脚和关于页至今只写“一个记录 AI 账号经历的独立社区”，没有“与任何 AI 厂商无隶属关系”。站点名、页面标题里大量出现厂商产品名，这句声明既是商标风险的基本防护，也是 AI 判断“这是谁的网站”的依据。

- `src/site/components/SiteFooter.astro`：`号没了，一个记录 AI 账号经历的独立社区，与任何 AI 厂商无隶属关系。文中提及的产品名称和商标归各自所有者。`
- `src/site/pages/about.astro` 和 `public/llms.txt` 开头的简介同样补上。英文：`Not affiliated with any AI company.`

## S3 · 把厂商页做成真正的“答案页”

Cloudflare 数据显示，带来访问的是解决具体问题的页面（Antigravity 安装、Claude Max 恢复），首页只排第二。用户搜的是问题，不是网站名。厂商页应该能直接回答“Claude 封号了怎么办”。

`/v/:vendor` 首屏（纪念墙之前）加一个 `section.vendor-brief`，服务端渲染，内容由数据库实时生成：

1. **一段可以单独引用的摘要**（数字带日期和口径）：
   `截至 2026 年 11 月 23 日，号没了收录了 13 条与 Claude 相关的账号记录：组织停用 4 条，账号停用 7 条，扣费异常 2 条。其中 5 条提到已提交申诉，2 条提到已恢复。以上均为公开帖子和用户自述，未经本站核实，不代表 Claude 的实际封号情况。`
2. **常见通知原文**：从记录里摘出出现过的通知措辞，例如“Your organization has been disabled”，每条注明出现次数和一条示例记录的链接。这类原文是用户最常复制去搜的内容。
3. **该怎么做**：三到五步，每步链到 `/appeal` 里对应的锚点（`/appeal#claude-appeal` 之类）。
4. **相关指南**：列出 `tips.ts` 中与该厂商相关的条目。

`title` / `description` 按下表更新，用户搜索的说法放在前面：

| 页面 | title | description |
|---|---|---|
| `/v/claude` | Claude 封号、账号停用怎么办：13 条真实记录与官方申诉入口 · 号没了 | 收录 Claude / Claude Code 账号停用、组织停用、扣费异常的公开记录，附常见通知原文和官方申诉步骤。截至 {日期}。 |
| `/v/codex` | Codex / ChatGPT 账号停用怎么办：真实记录与官方申诉入口 · 号没了 | 收录 Codex 与关联 ChatGPT 账号停用、401 错误、恢复后套餐异常的公开记录，附官方申诉步骤。截至 {日期}。 |
| `/v/antigravity` | Antigravity 403、服务停用怎么办：真实记录与官方申诉入口 · 号没了 | 收录 Google Antigravity 服务停用、403 权限拒绝、额度异常的公开记录，附官方申诉表单和排查步骤。截至 {日期}。 |

标题里的数字由服务端按实际数量填写；少于 5 条时去掉数字。

## S4 · 每块碑都连到“下一步”

现在 `/t/*` 页面只有一段一两百字的摘要，单独看内容很薄，读完也没有去处。

- 在详情卡下方加 `section.next-steps`：
  - **同类记录**：同厂商、同事件种类的最新 3 条（不足时用同厂商补齐）。
  - **这类问题怎么处理**：链到 `/appeal` 对应厂商的锚点，再链 1–2 篇相关指南。
  - **这家的全部记录**：链到 `/v/:vendor`。
- 社区整理的摘要少于 120 个汉字，且 S4 的模块也加载不出同类记录时，输出 `noindex,follow`，并从 sitemap 移除。用户自述的碑不受这条影响。

## S5 · 让本站成为一个“可被识别的来源”

AI 回答“这个网站可信吗、是谁做的”，依据的是站内的身份信息和站外的提及。

1. **首页 JSON-LD** 增加 `Organization`：
   ```json
   {
     "@context": "https://schema.org",
     "@type": "Organization",
     "@id": "https://haomeile.rip/#org",
     "name": "号没了",
     "alternateName": ["Haomeile", "haomeile.rip"],
     "url": "https://haomeile.rip/",
     "logo": "https://haomeile.rip/icon-512.png",
     "description": "记录 AI 账号停用与申诉经历的独立社区，与任何 AI 厂商无隶属关系。",
     "sameAs": []
   }
   ```
   `sameAs` 先留空。站长开了 X 账号、公众号等官方账号后再填，**不要填写不属于本站的账号**。其他页面的 `publisher` 用 `{"@id": "https://haomeile.rip/#org"}` 引用它。
2. **关于页增加三节**（中英文都要）：
   - `#editorial` 收录标准：收什么（有公开原帖、有日期、第一人称经历）、不收什么（无法核对的转载、规避风控内容）、多久复查一次。
   - `#corrections` 更正与下架：原帖作者或当事人怎么联系、多久处理；附最近一次更正的日期。
   - `#method` 与厂商的关系：独立运营、不接受厂商资助（如果属实）、广告与内容分开。
3. 关于页写一个能收到邮件的联系地址（站长提供，执行的 AI 不要编）。

## S6 · 重置雷达：可以被抓取的说明页

`/radar` 现在整页需要人机验证，爬虫和 AI 只能看到一个验证框，这个页面基本没法被搜到。

- 把 `/radar` 拆成两部分：**公开说明**（服务端直出，可索引）+ **验证后的实时数据**。
- 公开说明包括：雷达是什么、预测依据哪些数据、多久更新一次、**准确率怎么算、近 30 天的实际命中情况**、明确声明“这是本站的统计预测，不是 Claude、OpenAI 或 Google 的官方信息”。
- `llms.txt` 和 `llms-full.txt` 里对雷达的描述加上“非官方预测”。`llms-full.txt` 中的实时概率注明生成时间和这句声明。
- 没有命中率数据之前，页面上和 `llms.txt` 里不要用“准确”“实时预测”这类说法，改为“基于历史数据的估计”。

## S7 · 每月一份数据报告

AI 和媒体最愿意引用带日期、有方法说明的数据。

- 新路由 `/report/:yyyy-mm`（如 `/report/2026-11`），月初由服务端从数据库生成并固定下来（生成后不再变化，修正时注明修正日期）。
- 内容：本月新收录数、按厂商和事件种类的分布、申诉和恢复的提及次数、常见通知措辞、方法与局限（照抄 `/privacy#stats` 的口径）。
- 写法限制：只写“本站收录了什么”；不写比率、排名、“某厂商更容易封号”之类的结论。
- JSON-LD 用 `Article`，`author` 为号没了；加入 sitemap 和 Atom 订阅源；首页和三个厂商页链到最新一期。

## S8 · 不再新增 FAQPage 和 HowTo 标记

Google 从 2026 年 5 月 7 日起不再显示 FAQ 富媒体结果，HowTo 富媒体结果早在 2023 年就已下线。现有标记可以保留，Google 说明它们不会造成问题，但也不会带来展示。

- 现有的不用删，也不要再为了富媒体结果新增。
- 精力放在页面正文本身：问题写成小标题，答案第一句直接回答，步骤用有序列表。这对 Google 和 AI 都有效。

## S9 · 衡量 AI 带来的访问

- GA4 新建自定义渠道组“AI 助手”，规则为来源包含 `chatgpt.com`、`perplexity.ai`、`copilot.microsoft.com`、`gemini.google.com`、`claude.ai`、`kimi`、`doubao`、`deepseek`、`yuanbao`。（这是后台配置，由站长或有权限的人操作。）
- 在 `docs/SEO-GEO-HANDOFF.md` 加一张月度记录表：固定 10 个问题（例如“Claude 账号被封怎么申诉”“Antigravity 403 怎么办”“Codex 账号停用能恢复吗”），每月在 ChatGPT、Perplexity、Gemini、Copilot、Kimi、DeepSeek 各问一次，记录是否引用了本站、引用了哪一页。
- Bing Webmaster Tools 的 AI Performance 报告每月记一次。

## 验收

- [ ] `community-cases.json` 和 `tips.ts` 中没有第一人称转述；测试覆盖。
- [ ] 每篇技巧和社区整理都显示“本站根据……整理，非原文作者撰写”。
- [ ] 技巧页 JSON-LD 的 `author` 是号没了，原作者在 `isBasedOn` 里。
- [ ] 页脚、关于页、`llms.txt` 都有“与任何 AI 厂商无隶属关系”。
- [ ] 三个厂商页首屏有摘要、常见通知原文、处理步骤和相关指南；title 按 S3 更新。
- [ ] `/t/*` 有同类记录和下一步链接；过薄的社区记录为 noindex 且不在 sitemap 中。
- [ ] 首页有 Organization JSON-LD；关于页有收录标准、更正与下架、与厂商的关系三节。
- [ ] `/radar` 的说明部分不需要验证就能看到，并写明“非官方预测”。
- [ ] `/report/2026-11` 可访问，已进入 sitemap 和订阅源。
- [ ] 改动的页面在 Search Console 请求重新抓取（站长操作）。

## 不要做

- 不要为了排名堆关键词、批量生成相似页面，或者给每个搜索词单独做一页。
- 不要在任何地方编造用户经历、数字或官方链接。
- 不要用“某厂商封号率”“最容易被封”之类的标题或说法。

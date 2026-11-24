# 号没了 · 第二轮改版（给 Codex 执行）

适用分支：`codex/implement-haomeile`（线上版本，提交 `dcb32d4`）。
效果参照：`design/v2/index.html`（浏览器直接打开）和 `design/v2/v2.css`。

按编号顺序做，每一项完成后跑全部测试再提交，提交信息以 `R<n>:` 开头。R1、R2 是合规问题，必须最先做。

---

## R1 · 下线“使用小技巧”（合规，必须做）

**原因**：`/tips` 收录的文章包括《封了20多个号换来的全网Claude防封分流保姆级教程》《支付宝购买美区 Apple 礼品卡并订阅 ChatGPT》等，属于规避风控和绕过地区限制的内容，直接违反 `PLAN.md` §2.3。它还放在主导航里，会让整站看起来像一个防封教程站，是这个项目最大的风险点。

**改动**：
1. `src/site/components/SiteHeader.astro`：删掉 `['/tips', '使用小技巧']`。
2. 删除 `src/site/pages/tips.astro`、`src/site/pages/tips/[slug].astro`、`src/shared/tips.ts`。
3. `src/worker/render.ts`（第 155、160 行附近）：`/tips` 和 `/tips/*` 一律返回 **410**，页面用 404 版式，标题“这个页面已经下线了”，正文“本站不再提供账号开通和订阅教程。账号出了问题，请走官方申诉入口。”加一个按钮链到 `/appeal`。
4. `src/worker/sitemap.ts`：去掉 `/tips` 和 `TIP_PATHS`。
5. `public/llms.txt`：删掉“使用小技巧”那一行。
6. `src/worker/lib/graymarket-config.ts`：确认包含 `防封`、`分流`、`美区`、`礼品卡`、`代充`、`低价号`、`共享号`，没有就补上。
7. 测试：删除 `tests/e2e/release-copy.spec.ts` 中 `/tips` 相关断言，`tests/api/sitemap.test.ts` 去掉 `TIP_PATHS`；新增测试：`GET /tips` 和 `GET /tips/任意` 返回 410，sitemap 不含 `/tips`。

**不要**用别的名字把这些内容放回来（比如“开通指南”“订阅攻略”）。

## R2 · 恢复独立声明（合规，必须做）

`PLAN.md` §2.1 要求页脚固定显示独立声明，现在页脚和关于页都漏了“与任何 AI 厂商无隶属关系”。

- `src/site/components/SiteFooter.astro` 第一段改为：
  `号没了，一个记录 AI 账号经历的独立社区，与任何 AI 厂商无隶属关系。文中提及的产品名称和商标归各自所有者。`
- `src/site/pages/about.astro` 第 22 行同样补上后半句。
- 英文：`An independent community archive of AI account experiences. Not affiliated with any AI company. Product names and trademarks belong to their owners.`

## R3 · 导航和首屏

**导航**（`SiteHeader.astro`）：`纪念墙`、`立碑`、`墓志铭卡片`、`官方申诉入口`。申诉入口顶替原来“使用小技巧”的位置，用户最需要的就是它。

**首屏变矮**：现在首屏在手机上占了整整一屏，第一块碑要滑两屏才看到。
- 把 `design/v2/v2.css` 的 **R3 段**整段追加到 `src/site/styles/global.css` 末尾。效果：桌面首屏 300px 左右；手机隐藏小猫，大碑缩小。
- `src/site/components/HeroScene.astro` 文案：
  - h2：`Claude、Codex、Antigravity 账号没了？`
  - p：`来立一块碑，写下它是怎么没的。也看看别人遇到了什么。`
  - 英文：`Lost your Claude, Codex or Antigravity account?` / `Leave a memorial and write down what happened. See what happened to others.`

## R4 · 统计只说一句话，零不出现

现在首页写着“本站共有 0 份用户投稿”，下面又是“社区整理 19 条”，读者会以为网站没人用。

- 删掉 `src/site/components/Tally.astro` 里的 `community-tally` 段落，只保留一个 `tally` 段落和一个 `tally-note`。
- `src/worker/render.ts`（第 184 行附近）按下表生成 `tally`。`N` = 当前可见总数，`A` = 社区整理数，`B` = 用户自述数；`{日期}` 用 `<time datetime>` 包住。

| 情况 | 文案 |
|---|---|
| A > 0 且 B > 0 | 截至 {日期}，园里有 **N** 块碑：**A** 条社区整理，**B** 份用户自述。 |
| B = 0 | 截至 {日期}，园里有 **N** 块碑，都是从公开帖子整理的记录。 |
| A = 0 | 截至 {日期}，园里有 **N** 块碑，都是用户自述。 |
| 厂商页 | 截至 {日期}，园里有 **N** 块 {厂商} 的碑……（同上三种） |

- `tally-note` 固定为：`都未经本站核实，不代表任何平台的实际封号数量。<a href="/privacy#stats">统计口径</a>`
- “今天新增”“近 7 天”从首页移到 `/privacy#stats`，首页不再显示。

## R5 · 纪念墙加产品切换

`src/site/components/Wall.astro`，在 `yard-head` 下面加：

```html
<p class="yard-note">“整理”是本站从公开帖子摘要的记录，附原帖链接；“自述”是用户在这里匿名投稿。新收录的在前面。</p>
<nav class="tabs-wall" aria-label="按产品查看">
  <a href="/" aria-current="page">全部<span class="n">19</span></a>
  <a href="/v/claude">Claude<span class="n">6</span></a>
  <a href="/v/codex">Codex<span class="n">6</span></a>
  <a href="/v/antigravity">Antigravity<span class="n">7</span></a>
</nav>
```

- 数字来自 `stats.by_vendor`，由 `render.ts` 服务端填入；`aria-current` 标在当前页面。
- 厂商页 `/v/:vendor` 用同一个组件。
- 样式：`v2.css` 的 **R5 段**。
- 删掉 `yard-head` 里原来那句“新收录的记录在前面。”（已并入 `yard-note`）。

## R6 · 纪念墙改成等高网格

瀑布流让每块碑高低错落、长文把碑撑得很长，19 块挤在一起很累。改成等高网格，同一行的碑底边和底栏对齐。

- `global.css`：删除 `.rows` 的 `column-count`、`column-gap`、`column-width`（第 593–610 行附近）以及 `.rows > .empty { column-span }`、`.rows:has(> .empty)` 两段（第 1467–1472 行附近）。
- 追加 `v2.css` 的 **R6 段**。
- 经过在墙上最多显示 4 行，完整内容在详情页。

## R7 · 碑面减负

现在每块碑上有：标题、“社区公开记录”、事件日期、两个方框标签、正文、“查看原帖 · 平台 · 日期”两行、虚线、献花，再加碑脚两朵花。信息重复，噪音太多。

**新的碑面结构**（三处必须完全一致：`src/worker/render.ts` 第 65 行的字符串模板、`src/site/scripts/cards.ts` 的 `createTombCard`、`src/site/components/TombCard.astro`）：

```html
<article class="tomb" data-id="{id}">
  <!-- 仅详情页保留碑脚装饰 img.tomb-deco -->
  <div class="tomb-body stone-shape"><div class="tomb-face stone-shape">
    <span class="tomb-kind" data-kind="community">整理</span>        <!-- 用户投稿：data-kind="self"，文字“自述” -->
    <p class="tomb-meta"><b>Claude</b> · 账号停用 · 2026.06.07</p>    <!-- 日期 = died_at；没有时写“日期未说明” -->
    <a class="tomb-link" href="/t/{id}"><h3 class="tomb-name">{标题}</h3></a>
    <p class="tomb-life">存活约 443 天</p>                          <!-- 仅用户自述且填了注册时间时出现 -->
    <p class="tomb-epitaph">{墓志铭}</p>                              <!-- 有才出现 -->
    <p class="tomb-story">{经过}</p>
    <!-- 详情页：这里放 dl.facts，社区整理的“原帖发布日期”也放进 facts -->
    <div class="tomb-foot">
      <p class="tomb-source"><a href="{原帖}" target="_blank" rel="noopener noreferrer nofollow">原帖 · GitHub</a></p>
      <!-- 用户自述：<p class="tomb-source">匿名投稿</p> -->
      <button type="button" class="flower-btn" data-flower-id="{id}" aria-pressed="false" aria-label="献花">
        <img src="/assets/flower.svg" width="14" height="14" alt=""><span>献花</span><span class="n"></span>
      </button>
    </div>
  </div></div>
</article>
```

**删掉**：“社区公开记录”这一行（`render.ts` 第 50 行、`cards.ts` 同名分支）、`ul.tags`（详情页可以保留）、墙上的 `img.tomb-deco`。

**建议**：把碑面 HTML 收成一个函数 `tombCardHtml(t, { detail, locale })` 放在 `src/shared/`，`render.ts` 和 `TombCard.astro` 都调用它；`cards.ts` 用 DOM 构建同样的结构。加一个测试：同一条数据，服务端 HTML 和客户端 DOM 的 class 顺序一致。

**英文**：整理 → `Curated`，自述 → `Firsthand`，原帖 → `Original post`，匿名投稿 → `Anonymous`，日期未说明 → `Date not stated`，献花 → `Flowers`。

样式：`v2.css` 的 **R7 段**。

## R8 · 献花数为 0 时不显示数字

- `.flower-btn` 里数字单独放在 `span.n`，0 时为空。
- `src/site/scripts/flower.ts` 的 `render()`：第一个 `span` 固定写“献花”，数字写进 `.n`（`count > 0 ? num(count) : ''`）；`aria-label` 为 `count > 0 ? 献花，已有 N 朵 : 献花`，已献过时加“今天已献过花”。
- 样式：`v2.css` 的 **R8 段**。

## R9 · 去掉空的趋势图

首页底部的“近 30 天 · 上报日期与事件日期”现在几乎是一条平线。

- `render.ts`（第 205 行附近）：近 30 天上报数加事件数合计少于 30 时，`[data-ssr="timeline"]` 输出空字符串，并给外层 `section.census` 加 `hidden`。
- 有数据以后，把这张图放到 `/privacy#stats`，首页不再放。

## R10 · 验收

用 Playwright 截图 `/`、`/v/claude`、一块社区整理的 `/t/:id`，宽度 375（浅色）和 1280（深色），存到 `docs/verification/revision-2/`，并检查：

- [ ] `/tips`、`/tips/*` 返回 410；主导航没有“使用小技巧”；sitemap 和 llms.txt 不含 `/tips`。
- [ ] 页脚和关于页有“与任何 AI 厂商无隶属关系”。
- [ ] 375px 下第一块碑的顶部出现在页面前 900px 以内；1280px 下“纪念墙”标题出现在前 650px 以内。
- [ ] 首页不出现数字 0；统计只有一句话。
- [ ] 墙上每一行的碑等高、底栏对齐；碑上没有“社区公开记录”字样，没有碑脚装饰。
- [ ] 献花数为 0 时按钮只显示“献花”；献花后数字出现。
- [ ] 产品切换的四个链接可用，当前项有 `aria-current="page"`。
- [ ] 375px 无横向滚动；所有现有测试通过。
- [ ] 改完后的截图和 `design/v2/index.html` 的效果一致（文字可以不同，结构和间距一致）。

## 不要做

- 不要把 `design/v2/index.html` 里的黄色提示条和“小橘号”示例带上线。
- 不要改墓碑外形、配色变量、字体和 logo。
- 不要新增依赖。

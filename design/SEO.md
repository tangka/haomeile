# 号没了 · SEO 与 GEO 规范

目标：让搜索引擎和 AI 助手**找得到**本站、**看得懂**本站、**引用时不说错**。
抓取策略：**欢迎所有搜索引擎和 AI 爬虫**（含用于训练的爬虫），只挡住后台和接口。这一点已写进数据说明和立碑时的同意勾选。

Codex 实现时按 §1–§8 逐项落地，§9 是站长上线后要做的事。

本站只覆盖 Claude、Codex、Antigravity（反重力）。产品键依次为 `claude`、`codex`、`antigravity`；路由和查询参数保留 `vendor` 兼容字段名，页面标题、筛选与统计均按产品表述。

---

## 1. 每个页面的 `<head>`

由 `SiteLayout.astro` 统一输出，页面只传参数：

```astro
---
// src/site/layouts/SiteLayout.astro
interface Props {
  title: string;            // 完整标题，按 §2 的模板生成
  description: string;      // 70–120 个汉字
  path: string;             // 以 / 开头，不带查询参数，用于 canonical
  robots?: string;          // 默认 'index,follow,max-image-preview:large'
  ogType?: 'website' | 'article';
  ogImage?: string;         // 默认 '/og/default.png'
  publishedTime?: string;   // 墓碑页：approved_at
  modifiedTime?: string;    // 墓碑页：updated_at
  jsonLd?: object[];        // 按 §5
}
const SITE = 'https://haomeile.rip';
---
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content={description}>
<link rel="canonical" href={SITE + path}>
<meta name="robots" content={robots}>

<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#cde5f0" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#18213a" media="(prefers-color-scheme: dark)">

<meta property="og:site_name" content="号没了">
<meta property="og:locale" content="zh_CN">
<meta property="og:type" content={ogType}>
<meta property="og:title" content={title}>
<meta property="og:description" content={description}>
<meta property="og:url" content={SITE + path}>
<meta property="og:image" content={SITE + ogImage}>
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="号没了：AI 账号赛博公墓">
<meta name="twitter:card" content="summary_large_image">
{publishedTime && <meta property="article:published_time" content={publishedTime}>}
{modifiedTime && <meta property="article:modified_time" content={modifiedTime}>}
{jsonLd?.map(o => <script type="application/ld+json" set:html={JSON.stringify(o).replace(/</g, '\\u003c')} />)}
```

`jsonLd` 里会带用户写的文字，序列化后必须把 `<` 替换成 `<`，防止 `</script>` 注入。

## 2. 标题和描述模板

| 路由 | title | description | robots |
|---|---|---|---|
| `/` | 号没了 · AI 账号赛博公墓 | 记录 Claude、Codex、Antigravity（反重力）的账号停用、验证受阻和异常经历。匿名立碑、献花或制作墓志铭卡片，内容为用户自述，未经核实；本站与产品所属厂商无关。 | 默认 |
| `/v/:vendor` | {产品} 账号停用、封号经历 · 号没了 | 号没了上用户自述的 {产品} 账号停用、地区限制、验证卡住等经历，共 {n} 块公开墓碑，截至 {日期}。内容未经核实，与 {产品} 官方无关。 | 公开墓碑 ≥ 5 块时默认，否则 `noindex,follow` |
| `/t/:id` | {代号}：{产品} 账号{事件种类} · 号没了 | 用户自述：{经过的前 60 个字}…… 本站未核实。 | `index,follow,noarchive,max-image-preview:large` |
| `/epitaph` | 墓志铭卡片生成器 · 号没了 | 给没了的 AI 账号做一张像素墓碑图。图片只在你的浏览器里生成，不会上传任何内容。 | 默认 |
| `/appeal` | Claude、Codex、Antigravity 官方申诉入口 · 号没了 | 汇总 Claude、Codex、Antigravity（反重力）三个产品的官方帮助与申诉入口。本站无法帮你解封，请走产品所属厂商的官方渠道。 | 默认 |
| `/rules` | 使用须知 · 号没了 | 在号没了立碑前需要知道的规则：写经过、不填隐私、保存凭据、不谈买卖账号和规避风控。 | 默认 |
| `/privacy` | 数据说明 · 号没了 | 号没了公开哪些内容、不收集哪些信息、统计口径是什么，以及公开内容会被搜索引擎和 AI 服务抓取。 | 默认 |
| `/about` | 关于 · 号没了 | 号没了是与任何 AI 厂商都无关的独立社区项目，只记录 Claude、Codex 和 Antigravity（反重力）的用户自述经历。 | 默认 |
| `/submit` | 立一块碑 · 号没了 | 匿名记录你的 AI 账号是怎么没的。 | `noindex,follow` |
| `/manage` | 管理我的墓碑 · 号没了 | 用凭据查看审核结果、修改或撤回。 | `noindex,nofollow` |
| `/admin`、`/api/*` | — | — | 响应头 `X-Robots-Tag: noindex, nofollow` |
| 404 / 410 | 这里什么也没有 · 号没了 | — | `noindex` |

规则：
- 标题里的代号、经过都来自用户输入，输出前转义；描述截断按字符，不截断半个表情符号。
- 首页带筛选参数（`/?vendor=…&event=…`）时 canonical 指向对应的 `/v/:vendor`，没有产品参数时指向 `/`。
- 分页（`?cursor=`）的 canonical 指向不带 cursor 的地址。

## 3. 新增路由：产品落地页 `/v/:vendor`

- `vendor` 只接受 `labels.ts` 里的三个产品键（`claude`、`codex`、`antigravity`），其他值返回 404。旧 `chatgpt`、`gemini` 记录应先迁移为新键，不能作为正式产品页继续收录。
- 页面就是首页去掉天空场景的版本：页头写“{产品} 账号的墓碑”，下面是只算这个产品的统计句、按事件种类的分布、纪念墙。
- 统计句写成可以单独引用的完整陈述（见 §6）。
- 不做任何产品之间的对比或排名。

## 4. 抓取、收录与撤回

**robots.txt**：见 `seo/robots.txt`，放在 `public/robots.txt`。

**sitemap.xml**：由 Worker 动态生成，路径 `/sitemap.xml`。
- 包含：`/`、`/epitaph`、`/appeal`、`/rules`、`/privacy`、`/about`、满足条件的 `/v/:vendor`、全部 `status = approved` 且属于上述三种产品的 `/t/:id`。
- `<lastmod>` 用 `updated_at`（墓碑）或部署时间（静态页）。
- 不写 `<priority>` 和 `<changefreq>`。
- 超过 45,000 条时拆成 sitemap 索引。
- 响应头 `Cache-Control: public, max-age=300`。

**墓碑页的状态码**：

| 墓碑状态 | 状态码 | 页面 |
|---|---|---|
| approved | 200 | 正常 |
| withdrawn | **410** | 404 版式，标题改为“这块碑已经撤回了” |
| hidden | 404 | 404 版式 |
| pending / rejected / 不存在 | 404 | 404 版式 |

撤回或隐藏后，下一次生成的 sitemap 里立即不再出现该地址。墓碑页 HTML 设置 `Cache-Control: public, max-age=60, s-maxage=300`，保证撤回在几分钟内生效。

**分页可抓取**：“再看 20 块”必须是一个真实链接 `<a href="/?cursor=…">`，用脚本拦截做无刷新追加；没有脚本时点击会正常翻页。首屏和每一页都由服务端渲染，墓碑内容必须出现在 HTML 里，不能只靠前端脚本生成。

**llms.txt**：见 `seo/llms.txt`，放在 `public/llms.txt`。这是一个新兴约定，不保证每个 AI 服务都会读取，但成本很低。

## 5. 结构化数据（JSON-LD）

只用能如实描述页面的类型，**不使用 Review、Rating、FAQ、Dataset 等会把用户自述包装成事实或评价的类型**。

首页：

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "号没了",
  "alternateName": "AI 账号赛博公墓",
  "url": "https://haomeile.rip/",
  "inLanguage": "zh-CN",
  "description": "用户匿名记录 Claude、Codex 和 Antigravity（反重力）账号被停用、受限或异常经历的独立社区网站，与产品所属厂商无关。"
}
```

墓碑页（用户发布的内容，用 `DiscussionForumPosting` 如实标注为用户帖子）：

```json
[
  {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "headline": "小橘号：Claude 账号停用",
    "text": "（经过全文）",
    "url": "https://haomeile.rip/t/K7Q2M9XW4T",
    "datePublished": "2026-11-18T09:12:00Z",
    "dateModified": "2026-11-18T09:12:00Z",
    "inLanguage": "zh-CN",
    "author": { "@type": "Person", "name": "匿名用户" },
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/LikeAction",
      "userInteractionCount": 28
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "纪念墙", "item": "https://haomeile.rip/" },
      { "@type": "ListItem", "position": 2, "name": "Claude", "item": "https://haomeile.rip/v/claude" },
      { "@type": "ListItem", "position": 3, "name": "小橘号" }
    ]
  }
]
```

`author.name` 用署名，没有署名时写“匿名用户”。产品落地页只放 BreadcrumbList。

## 6. GEO：让 AI 引用时不说错

- **统计写成完整陈述**，每个数字都带日期和口径，并用 `<time datetime>` 标出：
  > 截至 <time datetime="2026-11-19">2026 年 11 月 19 日</time>，号没了共有 1,204 块公开墓碑。这些都是用户自愿上报，未经核实，不代表任何平台的实际封号数量。
  首页的统计句（Tally）在正式站点改成这个写法，产品落地页同理。
- **每页第一段先定义**：这是什么页面、内容从哪来。墓碑页在经过上方保留“用户自述，未经核实”。
- **数据说明页加一节“统计口径”**（`/privacy#stats`），各页统计说明链接到这里。
- **不写诱导性结论**：不出现“某产品最爱封号”“封号率排名”之类的句子，标题、描述、页面文字都一样。
- **关于页写清楚身份**：独立项目、与厂商无关、联系方式。AI 助手回答“这个网站是谁做的”时会用到。

## 7. 性能

- 首屏 HTML 由服务端渲染，不依赖脚本显示内容。
- 不加载外部字体和第三方脚本（Turnstile 只在立碑页和举报弹窗里加载）。
- 所有 `<img>` 写 `width`、`height`；像素图都是 SVG，体积很小。
- 目标：手机端 LCP < 2.0 秒，CLS < 0.05。M5 用 Lighthouse 跑一次首页和一个墓碑页，结果记在 `DECISIONS.md`。

## 8. 品牌文件放哪

| 设计稿 | 正式路径 |
|---|---|
| `brand/favicon.ico` | `public/favicon.ico` |
| `brand/favicon.svg` | `public/favicon.svg`（带天空色方底，深色标签栏里也看得清） |
| `brand/mark.svg` | `public/assets/logo.svg`（透明底，页头用） |
| `brand/apple-touch-icon.png` | `public/apple-touch-icon.png` |
| `brand/icon-192.png`、`icon-512.png`、`icon-maskable-512.png` | `public/` 根目录 |
| `brand/site.webmanifest` | `public/site.webmanifest` |
| `brand/og-default.png` | `public/og/default.png` |
| `seo/robots.txt`、`seo/llms.txt` | `public/robots.txt`、`public/llms.txt` |

## 9. 站长上线后要做的事（Codex 不做）

1. 在 Google Search Console 和 Bing 网站管理员工具添加 `haomeile.rip`，用 DNS TXT 记录验证（不需要往网站里加脚本），提交 `https://haomeile.rip/sitemap.xml`。
2. 在 Cloudflare 后台开启 Crawler Hints，内容变化（包括撤回）时自动通知支持 IndexNow 的搜索引擎重新抓取。
3. 用户要求尽快从搜索结果中删除某块已撤回的碑时，可以在 Google Search Console 的“删除”工具里提交该地址。
4. 预期：海外部署、未备案、.rip 后缀，百度基本不会收录。主要来源是 Google、Bing、AI 搜索和社交分享。

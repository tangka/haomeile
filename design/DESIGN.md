# 号没了 · UI 设计与实现对照

这个目录是可以直接用浏览器打开的设计稿，**前端长什么样、说什么话，以这里为准**。功能和硬性约束以 `PLAN.md` 为准，两者冲突时以 `PLAN.md` 为准。

SEO、GEO、图标和分享图的落地方式见同目录的 `SEO.md`。

**产品范围修正**：正式应用只提供 Claude（`claude`）、Codex（`codex`）、Antigravity（`antigravity`）。界面分类称“产品”，API 与数据字段仍保留 `vendor`。静态 HTML 设计原稿可能保留旧名称或多产品占位，移植时以这三种产品为准；不重新引入原稿中的其他产品或自由输入产品选项。

**页面简化修正**：正式首页及产品页不再渲染产品、事件两行筛选，也不渲染按产品、按事件种类的分布区；保留总体数字、纪念墙和近 30 天曲线。原稿中的 Filters、Census、Bars 仅为历史设计参考，不再移植回页面。投稿的产品和事件字段仍保留。

给 Codex 的读法：
1. 先读本文件的 §1–§4，知道每个页面、组件、脚本要变成哪个文件。
2. 再看 HTML 里的 `<!-- @component 名称 → 目标文件 ... -->` 注释，它标出了每个组件的边界和数据来源。
3. 样式、像素图、格式函数、组件构建函数都已经写好，**移植，不要重写**。

---

## 1. 路由对照

| 正式路由 | 设计稿 | 目标文件 | 数据 |
|---|---|---|---|
| `/` | `index.html` | `src/site/pages/index.astro` | `GET /api/stats`、`GET /api/tombstones` |
| `/v/:vendor` | `index.html` 去掉天空场景 | `src/site/pages/v/[vendor].astro` | `GET /api/stats?vendor=`、`GET /api/tombstones?vendor=`，规则见 `SEO.md` §3 |
| `/t/:id` | `tomb.html` | `src/site/pages/t/[id].astro` | `GET /api/tombstones/:id`，找不到时渲染 404 |
| `/submit` | `submit.html` | `src/site/pages/submit.astro` | `POST /api/tombstones` |
| `/submit?mode=edit` | `submit.html`（同一表单） | 同上 | 预填 `POST /api/manage/status` 的结果，提交到 `POST /api/manage/patch`；标题改为“修改墓碑”，按钮改为“提交修改” |
| `/manage` | `manage.html` | `src/site/pages/manage.astro` | `POST /api/manage/status`、`POST /api/manage/withdraw` |
| `/epitaph` | `epitaph.html` | `src/site/pages/epitaph.astro` | 无，纯前端 |
| `/appeal` | `appeal.html` | `src/site/pages/appeal.astro` | 无，静态 |
| `/rules` | `doc.html#rules` | `src/site/pages/rules.astro` | 无，静态 |
| `/privacy` | `doc.html#privacy` | `src/site/pages/privacy.astro` | 无，静态 |
| `/about` | `doc.html#about` | `src/site/pages/about.astro` | 无，静态 |
| `/admin` | `admin.html` | `src/site/pages/admin.astro` | `/api/admin/*` |
| 404 | `states.html` 最后一块 | `src/site/pages/404.astro` | 无 |

`states.html` 是设计稿专用的“状态目录”，不需要做成路由，但里面每个空状态、错误、提示的样式和文案都要在对应页面实现。

## 2. 组件对照

| 组件 | 设计稿位置 | 目标文件 | 输入 |
|---|---|---|---|
| SiteLayout | 每页的 `<head>` + 页头 + 页脚 + toast 容器 | `src/site/layouts/SiteLayout.astro` | `title`、`description`、`current` |
| SiteHeader | `.topbar` | `src/site/components/SiteHeader.astro` | `current`（当前路由，用于 `aria-current`） |
| SiteFooter | `.footer` | `src/site/components/SiteFooter.astro` | 无 |
| HeroScene | `index.html` 的 `.scene` | `src/site/components/HeroScene.astro` | 无 |
| Tally | `.ground` | `src/site/components/Tally.astro` | `today`、`last7`、`total` |
| TombCard | `createTombCard()` 的输出 | `src/site/components/TombCard.astro` + `scripts/wall.ts` | 一条墓碑记录（§5 字段）、`detail?: boolean` |
| FlowerButton | `.flower-btn` | 包含在 TombCard 内，逻辑在 `scripts/flower.ts` | `id`、`flowers`、今天是否已献 |
| TombForm | `submit.html` 的 `#tomb-form` | `src/site/components/TombForm.astro` + `scripts/submit.ts` | `mode: 'new' \| 'edit'`、预填值 |
| CredentialDialog | `submit.html` 的 `#cred` | `src/site/components/CredentialDialog.astro` | `id`、`secret` |
| ReportDialog | `tomb.html` 的 `#report` | `src/site/components/ReportDialog.astro` | `tombstoneId` |
| StatusCard | `manage.html` 的 `#status` | `src/site/components/StatusCard.astro` | 墓碑记录 + `status` + 是否有 `pending_patch` |
| EpitaphMaker | `epitaph.html` 的 `.maker` | `src/site/pages/epitaph.astro` + `scripts/epitaph.ts` | 无 |
| AdminQueue | `admin.html` 的 `.tabs` + `.queue` | `src/site/pages/admin.astro` + `scripts/admin.ts` | 三个队列的数据 |
| Toast | `.toast` | 放在 SiteLayout 里，`scripts/toast.ts` 导出 `toast(msg)` | 文本 |

**TombCard 的 DOM 结构必须和 `createTombCard()` 的输出一模一样**：服务端用 Astro 渲染首屏，“再看 20 块”用客户端同名函数追加，两边结构一致才能共用样式。

## 3. 脚本移植

`design/assets/*.js` 是用全局变量写的普通脚本（为了能双击打开），移植时改成 ES 模块 + TypeScript，逻辑不变。

| 设计稿 | 目标 | 说明 |
|---|---|---|
| `labels.js` | `src/site/scripts/labels.ts`（Worker 也引用） | 枚举 → 中文。键名与数据库枚举一致 |
| `format.js` | `src/site/scripts/format.ts` | `fmtDate`、`daysBetween`、`num`、`lifeLine`、`ago`。**全站所有日期和天数都用它** |
| `components.js` | `src/site/scripts/wall.ts`、`flower.ts`、`toast.ts` | 只用 DOM API 和 `textContent`，不要改成 `innerHTML` |
| `epitaphs.js` | `src/site/scripts/epitaphs.ts` | 32 条墓志铭 |
| `epitaph-card.js` | `src/site/scripts/epitaph-card.ts` | `drawEpitaphCard(canvas, data)`，纯函数 |
| `sample-data.js` | `seed/dev-seed.sql` 的参考 | **不要移植到正式站点**。里面的 `demo_*` 产品只在设计稿存在 |
| `style.css` | `src/site/styles/global.css` | 原样复制，删掉末尾“设计稿专用”的 `.mock-note`、`.state-block`、`.tag-example` |
| `*.svg` | `public/assets/` | 原样复制 |

移植后 `createTombCard` 的 `assetBase` 改为 `'/assets/'`，`href` 改为 ``id => `/t/${id}` ``，删掉 `demo` 参数。

## 4. 表单字段对照

`submit.html` 里每个控件的 `name` 和 `value` 就是 `POST /api/tombstones` 的字段名和枚举值，可以直接序列化提交：

| 控件 | name | 值 |
|---|---|---|
| 代号 | `codename` | 文本 |
| 署名 | `nickname` | 文本 |
| 产品 | `vendor` | `claude` `codex` `antigravity` |
| 套餐 | `plan` | 依产品联动：Claude `unknown/free/pro/max/ultra`；Codex `unknown/free/go/plus/pro`；Antigravity `unknown/free/pro/ultra`；`unknown` 始终存在，`free` 显示“免费” |
| 发生了什么 | `event` → 提交时映射为 `event_type` | `suspended` `org_suspended` `region` `verification` `billing` `other` |
| 生于 | `born_at` | `YYYY-MM`；控件为空时 `born_precision = 'none'`，有值时为 `'month'`（正式版可再加“到日”切换） |
| 卒于 | `died_at` | `YYYY-MM-DD` |
| 经过 | `story` | 文本 |
| 墓志铭 | `epitaph` | 文本 |
| 申诉了吗 | `appeal` → 映射为 `appeal_status` | `none` `pending` `rejected` `restored` |
| 碑脚放点什么 | `style` → 映射为 `card_style` | `flower` `cloud` `star` |

---

历史 `paid_personal`、`paid_team`、`api` 不自动转换为具体套餐。读取与审核保留原值；用户进入编辑表单时选中 `unknown` 并提示重新选择，提交的新值按产品档位校验。

## 5. 视觉规则

**概念：一片草坡上的像素墓园。** 白天是晴天，深色模式是月夜，同一个场景换个时辰。纪念墙上的碑高矮不一，但底边落在同一条地平线上（`.rows { align-items: end }`）。首页大碑上用宋体刻着“号没了”，这是全站唯一的视觉重点，其他地方保持克制。

**颜色**：只用 `style.css` 顶部的变量，不新增颜色。菊花黄 `--mum` 是唯一强调色，只用在“要你做点什么”的地方：立碑、献花、下载、主按钮。深色模式靠 `prefers-color-scheme` 自动切换，也支持 `<html data-theme="dark|light">`。

**字体**：只用系统字体栈。宋体 `--font-carve` 用于刻在石头上的字：站名、代号、存活天数、墓志铭、页面大标题；黑体 `--font-ui` 用于其他所有界面文字。字号只用 13 / 15 / 17 / 22 / 30 / 44 这六档变量。

**像素**：直角，无圆角，无模糊阴影。按钮 2px 描边 + 4px 硬阴影，按下时位移 4px。墓碑外形用 `.stone-shape`。

**动效**：只有两处，都由用户触发：按钮按下、献花时冒出一朵小花。加载骨架屏的闪烁在 `prefers-reduced-motion: reduce` 时关闭。不要给区块加淡入，不要给卡片加悬停浮起。

**响应式**：375px 无横向滚动，左右留白 16px；窄屏导航横向滚动并在右侧渐隐，不做汉堡菜单。

## 6. 文案

- 静态页面（使用须知、数据说明、关于、官方申诉入口）的正文以 `doc.html`、`appeal.html` 为准，照抄。
- 空状态、错误、提示、隐私拦截的每一句话以 `states.html` 为准，照抄。
- 同一个动作全站同一个名字：“立一块碑”“提交并等待审核”“提交修改”“撤回这块碑”“下载图片”“献花”。
- 占位符 `TODO_OFFICIAL_URL`、`TODO_DATE`、`TODO_CONTACT_EMAIL` 原样保留，等站长填写。

## 7. 状态清单（每一项都要实现）

| 页面 | 状态 |
|---|---|
| 纪念墙 | 正常、空墙、加载更多中、加载失败（toast）；兼容查询无结果时保留空状态，但没有筛选控件 |
| 献花 | 未献、已献（当天）、请求失败回滚（toast） |
| 立碑 | 正常、字段错误（每条隐私规则一句）、限流、人机验证失败、网络错误、成功弹窗 |
| 凭据弹窗 | 未勾选“已保存”时关闭按钮禁用且 Esc 无效；复制后按钮文字变“已复制” |
| 管理 | 凭据错误、等待审核、已公开、已公开且修改审核中、未通过、已隐藏、已撤回 |
| 详情 | 正常、找不到（404） |
| 审核后台 | 三个队列、命中规则标红、修改对比、空队列（“这个队列是空的。”） |

## 8. 不要做

- 不使用任何厂商的 Logo、吉祥物、品牌色。
- 不加载外部字体、图标库、UI 框架或图表库。
- 不把设计稿的黄色提示条、“示例”标签、`demo_*` 产品、示例墓碑带进正式站点。
- 不把用户内容拼进 `innerHTML`。

## 9. 需要写的单元测试（`tests/unit/format.test.ts`）

| 输入 | 期望 |
|---|---|
| `lifeLine({ born_at: '2026-09-12', born_precision: 'day', died_at: '2026-11-14' })` | `{ days: '存活 63 天', range: '2026.09.12 至 2026.11.14' }` |
| `lifeLine({ born_at: '2025-09', born_precision: 'month', died_at: '2026-11-18' })` | `{ days: '存活约 443 天', range: '2025.09 至 2026.11.18' }` |
| `lifeLine({ born_at: null, born_precision: 'none', died_at: '2026-11-15' })` | `{ days: '存活天数不详', range: '卒于 2026.11.15' }` |
| `lifeLine({ born_at: '2026-12-01', born_precision: 'day', died_at: '2026-11-15' })` | `{ days: '存活天数不详', range: '卒于 2026.11.15' }`（生日晚于卒日） |
| `num(1204)` | `'1,204'` |
| `fmtDate('2026-11-18')` | `'2026.11.18'` |
| `ago(now - 11 分钟)` | `'11 分钟前'` |

## 10. 设计稿自检记录

所有页面已在 375px（浅色）和 1280px（深色）下检查：无横向滚动、无脚本错误、除本地文件外不发出任何网络请求。

## 11. 品牌

**图形标：猫耳墓碑。** 一块拱顶像素墓碑，肩上冒出两只猫耳（守墓小猫躲在碑后面），碑面是一张 x_x 的脸，脚下一行草。意思很直接：账号没了，但不悲伤。

| 文件 | 用途 |
|---|---|
| `brand/mark.svg` | 16×16 主图形。网站图标（SVG）、页头站名左侧。**只按整数倍显示**：16、32、48、64 px |
| `brand/mark-32.svg` | 32×32 细节版（耳朵里有粉色、碑面有高光、脚边一朵花）。用于 64 px 以上的大尺寸 |
| `brand/favicon.svg`、`brand/favicon.ico` | 网站图标，带天空色方底，深色标签栏里猫耳也看得见。ico 含 16 / 32 / 48 三帧，像素未经平滑 |
| `brand/apple-touch-icon.png` | 180×180，天空底 + 草地 |
| `brand/icon-192.png`、`icon-512.png` | 网页应用图标 |
| `brand/icon-maskable-512.png` | 可裁切版本，图形缩在安全区内 |
| `brand/site.webmanifest` | 网页应用清单 |
| `brand/og-default.png` | 1200×630 社交分享图；源文件 `brand/og-default.html`，改文案后用 1200×630 视口截图重新导出 |

**组合方式**：页头是“图形标 + 宋体站名‘号没了’”，站名用 HTML 文字，不做成图片。图形标和站名间距 10px。深色模式下图形标垫一块天空色方底（`style.css` 已处理）。

**不要**：拉伸或非整数倍缩放图形标（像素会糊）；给它加描边、阴影、渐变；换成厂商的颜色；把 x_x 的脸改成哭脸或其他表情。

**分享图**：所有页面暂时共用 `og-default.png`。每块碑单独生成分享图不在 MVP 范围内（PLAN.md §13）。

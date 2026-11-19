# 号没了 · 赛博公墓 —— 实施方案（交给 Codex 执行）

> 本方案假设部署在海外（Cloudflare）。如果要在中国大陆备案部署，第 4 节的技术栈和第 11 节的上线步骤需要调整。

---

## 1. 项目概述

**一句话**：一个多厂商的"AI 账号赛博公墓"。被封号、被停用、卡验证、扣费异常的用户可以匿名"立碑"，记录经过；访客可以献花；另有一个纯前端的"墓志铭生成器"，生成可分享的搞笑墓碑卡片。

**名称**：号没了
**域名**：`haomeile.rip`
**调性**：温和、好玩、带点自嘲；不阴阳怪气，不攻击个人。
**吉祥物**：原创"守墓小猫"（像素风，提着小灯笼巡墓）。

**目标用户**：中文用户，AI 产品重度使用者。

**MVP 范围**：
1. 纪念墙（列表、筛选、统计）
2. 立碑（匿名投稿 + 私密凭据）
3. 管理我的墓碑（查看审核状态、修改、撤回）
4. 献花、举报
5. 墓志铭生成器（纯前端）
6. 官方申诉入口汇总页（链接由站长人工填写）
7. 使用须知、数据说明、关于/免责声明
8. 审核后台

---

## 2. 硬性约束（任何情况下不得违反）

### 2.1 品牌与商标
- 站名、Logo、吉祥物、配色**不得**使用或模仿任何 AI 厂商的商标、Logo、吉祥物或品牌形象（包括但不限于 Claude/Clawd、ChatGPT、OpenAI、Anthropic、Gemini、Grok、DeepSeek、Kimi、通义、豆包等）。
- 厂商名称只能作为**纯文字标签**出现（例如筛选项"Claude"），用于如实说明事实。不得使用厂商 Logo 图片或图标。
- 页脚固定显示：「本站为独立社区项目，与任何 AI 厂商无隶属关系。文中提及的产品名称和商标归各自所有者。」

### 2.2 隐私
- 不收集邮箱、手机号、真实姓名；不需要注册登录。
- 不存储原始 IP。限流和去重只使用 `SHA-256(IP + PEPPER + 日期)` 这类加盐、按日轮换的哈希。
- 不使用任何第三方追踪、广告、指纹脚本；不设置 Cookie。
- 投稿内容中检测到隐私信息（见 §6.3）时，前后端都要拦截，并提示用户删除。

### 2.3 不碰灰产
- 站点任何位置**不得**提供或引导：买卖账号、拼车/合租、中转 API、代充代付、翻墙节点、规避风控/防封技巧、解封服务。
- 投稿命中灰产关键词（见 §6.4）的，一律进入人工审核并标红；审核后台提供一键拒绝。
- 不做"封号概率测算""防封指南"之类功能。

### 2.4 内容真实性
- 所有投稿标注「用户自述，未经核实」。
- 统计数据旁固定说明：「只统计本站当前可见的自愿上报，不代表平台实际封号数量，不能用来推算封号率。」
- **不得生成虚假的上报数据**。开发用的示例数据只能存在于本地开发环境的 seed 文件中，内容明显标注"示例"，生产数据库不得写入。

### 2.5 外链
- 「官方申诉入口」页的链接**不得由 Codex 编造**。只写占位符 `TODO_OFFICIAL_URL`，由站长人工核对后填入。

---

## 3. 页面与功能

| 路径 | 说明 |
|---|---|
| `/` | 首页：标题区 + 吉祥物插画 + 统计卡片 + 纪念墙（按审核通过时间倒序，每页 20 条，"加载更多"），支持按厂商、事件种类筛选 |
| `/t/:id` | 单块墓碑详情页（可分享），含献花、举报按钮 |
| `/submit` | 立碑表单 |
| `/manage` | 输入凭据 → 查看审核状态 / 修改 / 撤回 |
| `/epitaph` | 墓志铭生成器（纯前端，不向服务器发送任何数据） |
| `/appeal` | 各厂商官方帮助与申诉入口汇总（链接为占位符） |
| `/rules` | 使用须知 |
| `/privacy` | 数据说明 |
| `/about` | 关于 & 免责声明 |
| `/admin` | 审核后台（受 Cloudflare Access 保护） |

### 3.1 立碑表单字段

| 字段 | 必填 | 规则 |
|---|---|---|
| 代号 `codename` | 是 | 1–32 字，公开显示，如"小橘号"。提示不要用邮箱或真实用户名 |
| 昵称 `nickname` | 否 | ≤24 字 |
| 厂商 `vendor` | 是 | `claude` / `chatgpt` / `gemini` / `grok` / `deepseek` / `kimi` / `qwen` / `doubao` / `other` |
| 事件种类 `event_type` | 是 | `suspended` 账号停用 / `org_suspended` 组织暂停 / `region` 地区限制 / `verification` 验证卡住 / `billing` 扣费或支付异常 / `other` 其他 |
| 套餐 `plan` | 否 | `free` / `paid_personal` / `paid_team` / `api` / `unknown` |
| 生于 `born_at` | 否 | 精度可选：不记得 / 到月 / 到日 |
| 卒于 `died_at` | 是 | 事件发生日期（北京时间），不得晚于今天 |
| 发生了什么 `story` | 是 | 10–800 字。提示"猜测请注明" |
| 墓志铭 `epitaph` | 否 | ≤120 字 |
| 申诉状态 `appeal_status` | 否 | `none` / `pending` / `rejected` / `restored` |
| 卡片样式 `card_style` | 是 | `flower` 小花 / `cloud` 云朵 / `star` 星星，默认 `flower` |
| 同意公开 | 是 | 勾选框：「我同意审核通过后公开以上内容，确认没有填写隐私信息。」 |

表单顶部醒目提示：**不要填写**邮箱、密码、API Key、订单号、手机号、微信/QQ、链接、证件信息。

提交需通过 Cloudflare Turnstile 人机验证。

### 3.2 私密凭据
- 提交成功后生成凭据：编号 `id`（10 位 base32）+ 密钥 `secret`（32 字节随机数，base64url）。
- 弹窗展示凭据，提供"复制"和"下载凭据文件（.txt）"两个按钮，并强调"丢失无法找回"。必须勾选"我已保存"才能关闭弹窗。
- 浏览器 `localStorage` 可选保存凭据（用户勾选"在本浏览器记住"才保存）。读写都要 try/catch。
- 服务器只存 `SHA-256(PEPPER + secret)`，比较时用常数时间比较。

### 3.3 修改与撤回
- **修改**：修改内容存入 `pending_patch`，重新进入审核；审核通过前，墙上继续显示上一个已通过的版本。
- **撤回**：立即从墙上和统计中移除；同时清空 `story`、`epitaph`、`nickname`、`codename` 等文本字段，只保留 `id`、`status=withdrawn` 和时间戳用于审计。

### 3.4 献花
- 每个访客对每块墓碑每天最多献花 1 次。
- 访客编号：首次访问时在 `localStorage` 生成随机 UUID；服务器只存 `SHA-256(visitor_id + PEPPER)`。
- 不需要人机验证，但按 IP 哈希限流（见 §6.5）。

### 3.5 举报
- 原因：`privacy` 含隐私信息 / `abuse` 辱骂、骚扰或恶意内容 / `gray_market` 灰产广告 / `other` 其他（可附 ≤200 字说明）。
- 需要 Turnstile。举报不会立即隐藏墓碑，进入后台待处理。
- 同一墓碑收到 3 个不同访客的举报时，自动转为 `hidden` 等待复核。

### 3.6 统计
- 今日上报数（北京时间）、近 7 日上报数、当前可见总数。
- 按厂商、按事件种类的分布（简单条形图，用原生 SVG 或 CSS，不引入大型图表库）。
- 每日上报与事件发生数折线（近 30 天）。
- 统计只计 `status = approved` 的记录。

### 3.7 墓志铭生成器（`/epitaph`）
- 输入：代号、厂商（文字）、存活天数（或注册/卒日期自动计算）、死因（事件种类）、一句墓志铭（可点"随机来一句"）。
- 内置 30 条以上原创、无攻击性的随机墓志铭模板，例如：「生前写了 3 万行代码，死后一行也没留下」「它走得很安详，走之前还在思考」。模板不得点名嘲讽真实个人或公司员工。
- 用 `<canvas>` 渲染墓碑卡片（三种样式与纪念墙一致），提供"下载 PNG"。
- **完全在浏览器内完成，不发送任何请求。**
- 卡片右下角小字水印：`haomeile.rip`。

---

## 4. 技术栈

| 层 | 选择 |
|---|---|
| 运行时 | Cloudflare Workers（含 Static Assets） |
| API 框架 | Hono |
| 前端 | Astro（静态输出）+ 少量原生 TypeScript；样式用原生 CSS（CSS 变量），不引入 UI 框架 |
| 数据库 | Cloudflare D1 |
| 人机验证 | Cloudflare Turnstile |
| 后台鉴权 | Cloudflare Access（Zero Trust），Worker 内校验 `Cf-Access-Jwt-Assertion` |
| 测试 | Vitest（单元/接口，使用 `@cloudflare/vitest-pool-workers`）+ Playwright（端到端） |
| 语言 | TypeScript，`strict: true` |
| 包管理 | pnpm |

### 4.1 目录结构

```
/
├── PLAN.md
├── DECISIONS.md            # Codex 记录计划未覆盖的决策
├── wrangler.toml
├── package.json
├── migrations/             # D1 迁移 SQL
├── src/
│   ├── worker/             # Hono API + 静态资源入口
│   │   ├── index.ts
│   │   ├── routes/         # public.ts, admin.ts
│   │   ├── lib/            # validate.ts, privacy.ts, graymarket.ts, crypto.ts, ratelimit.ts, turnstile.ts, access.ts, time.ts
│   │   └── types.ts
│   └── site/               # Astro 项目
│       ├── pages/
│       ├── components/
│       ├── styles/
│       └── scripts/        # epitaph.ts, wall.ts, submit.ts, manage.ts
├── seed/dev-seed.sql       # 仅本地开发用，全部标注"示例"
└── tests/
    ├── unit/
    ├── api/
    └── e2e/
```

---

## 5. 数据模型（D1）

```sql
CREATE TABLE tombstones (
  id              TEXT PRIMARY KEY,           -- 公开编号
  secret_hash     TEXT NOT NULL,
  codename        TEXT,
  nickname        TEXT,
  vendor          TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'unknown',
  born_at         TEXT,                       -- 'YYYY-MM' 或 'YYYY-MM-DD' 或 NULL
  born_precision  TEXT NOT NULL DEFAULT 'none', -- none | month | day
  died_at         TEXT NOT NULL,              -- 'YYYY-MM-DD'（北京时间）
  story           TEXT,
  epitaph         TEXT,
  appeal_status   TEXT NOT NULL DEFAULT 'none',
  card_style      TEXT NOT NULL DEFAULT 'flower',
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | hidden | withdrawn
  pending_patch   TEXT,                       -- JSON，待审核的修改
  flags           TEXT,                       -- JSON，规则命中记录
  flowers         INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  approved_at     TEXT
);
CREATE INDEX idx_tomb_status_approved ON tombstones(status, approved_at DESC);
CREATE INDEX idx_tomb_vendor ON tombstones(vendor, status);
CREATE INDEX idx_tomb_event ON tombstones(event_type, status);

CREATE TABLE flowers (
  tombstone_id  TEXT NOT NULL,
  visitor_hash  TEXT NOT NULL,
  day           TEXT NOT NULL,                -- 'YYYY-MM-DD'（北京时间）
  PRIMARY KEY (tombstone_id, visitor_hash, day)
);

CREATE TABLE reports (
  id            TEXT PRIMARY KEY,
  tombstone_id  TEXT NOT NULL,
  reason        TEXT NOT NULL,
  note          TEXT,
  visitor_hash  TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  resolved_at   TEXT
);
CREATE INDEX idx_reports_open ON reports(resolved_at, created_at);

CREATE TABLE rate_limits (
  key           TEXT NOT NULL,                -- 例如 'submit:<ip_hash>'
  window_start  TEXT NOT NULL,
  count         INTEGER NOT NULL,
  PRIMARY KEY (key, window_start)
);

CREATE TABLE audit_log (
  id            TEXT PRIMARY KEY,
  tombstone_id  TEXT,
  action        TEXT NOT NULL,                -- approve | reject | hide | restore | withdraw | patch_approve | patch_reject
  actor         TEXT NOT NULL,                -- 管理员邮箱（来自 Access JWT）或 'system' / 'owner'
  detail        TEXT,
  created_at    TEXT NOT NULL
);
```

所有时间戳存 UTC ISO 8601；"今日""近 7 日"的统计按 `Asia/Shanghai` 计算。

---

## 6. API 设计

所有接口返回 JSON：`{ ok: true, data }` 或 `{ ok: false, error: { code, message } }`，`message` 为中文、可直接展示给用户。

### 6.1 公开接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/tombstones?vendor=&event=&cursor=` | 已通过墓碑列表，每页 20 |
| GET | `/api/tombstones/:id` | 单条（仅 approved） |
| GET | `/api/stats` | 统计数据 |
| POST | `/api/tombstones` | 立碑（需 Turnstile token）→ 返回 `{ id, secret }` |
| POST | `/api/manage/status` | 凭据 → 返回本人墓碑全部字段和审核状态 |
| POST | `/api/manage/patch` | 凭据 + 修改内容 → 存入 `pending_patch` |
| POST | `/api/manage/withdraw` | 凭据 → 撤回 |
| POST | `/api/tombstones/:id/flower` | 献花（带 visitor_id） |
| POST | `/api/tombstones/:id/report` | 举报（需 Turnstile） |

公开列表只返回展示所需字段，**永远不返回** `secret_hash`、`flags`、`pending_patch`。

### 6.2 后台接口（`/api/admin/*`，必须校验 Access JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/queue?type=new\|patch\|reported` | 待审核列表，命中规则的排在前面并带标记 |
| POST | `/api/admin/tombstones/:id/approve` | 通过 |
| POST | `/api/admin/tombstones/:id/reject` | 拒绝（可选原因） |
| POST | `/api/admin/tombstones/:id/hide` | 隐藏 |
| POST | `/api/admin/tombstones/:id/restore` | 恢复显示 |
| POST | `/api/admin/tombstones/:id/patch/approve` | 通过修改 |
| POST | `/api/admin/tombstones/:id/patch/reject` | 拒绝修改 |
| POST | `/api/admin/reports/:id/resolve` | 处理举报 |

每个后台操作写入 `audit_log`。

### 6.3 隐私信息检测（`lib/privacy.ts`，前后端共用规则）

命中任一规则即拒绝提交，并告诉用户是哪一类信息（不回显原文）：

- 邮箱：`[\w.+-]+@[\w-]+(\.[\w-]+)+`
- 链接或域名：`https?://`、`www\.`、`\b[\w-]+\.(com|net|org|cn|io|ai|rip|xyz|top|me|app|dev|co)\b`
- 中国大陆手机号：`(?<!\d)1[3-9]\d{9}(?!\d)`
- 身份证号：`(?<!\d)\d{17}[\dXx](?!\d)`
- API Key 类前缀：`\b(sk-|sk_|pk_|rk_|AIza|ghp_|gho_|xox[abp]-)[\w-]{8,}`
- 长数字串（订单号等）：`(?<!\d)\d{12,}(?!\d)`
- 微信/QQ：`(微信|vx|v信|wx|QQ|qq|扣扣)\s*[:：号]?\s*[\w-]{5,}`

检查字段：`codename`、`nickname`、`story`、`epitaph`、举报 `note`。

### 6.4 灰产关键词（`lib/graymarket.ts`）

命中后**不拒绝提交**，但写入 `flags` 并在后台标红，必须人工审核：

`买号, 卖号, 出号, 收号, 号商, 成品号, 拼车, 车位, 上车, 合租, 共享账号, 中转, 代理API, 反代, 代充, 代付, 代开, 礼品卡, 虚拟卡, 机场, 节点, 梯子, 科学上网, 防封, 绕过, 规避, 解封服务, 包解封, 低价, 加V, 加微, 私聊, 私信我, 返利, 邀请码`

关键词列表放在单独的配置文件，方便站长增删。

### 6.5 限流（按 IP 哈希）

| 动作 | 限制 |
|---|---|
| 立碑 | 3 次 / 天 |
| 修改 | 10 次 / 天 |
| 举报 | 10 次 / 天 |
| 献花 | 100 次 / 天 |
| 凭据校验失败 | 20 次 / 小时（防暴力破解） |

超限返回 429 和中文提示。

---

## 7. 安全要求

- 所有用户文本以纯文本渲染（`textContent`），**禁止** `innerHTML` 拼接用户内容。
- 服务端校验所有字段的类型、枚举值和长度，前端校验只是体验优化。
- 安全响应头：
  - `Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Content-Type-Options: nosniff`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- 写操作接口只接受 `Content-Type: application/json`，并校验 `Origin` 等于 `https://haomeile.rip`。
- 密钥只通过 `wrangler secret` 配置：`TURNSTILE_SECRET`、`PEPPER`、`ACCESS_AUD`、`ACCESS_TEAM_DOMAIN`。代码和仓库中不得出现真实密钥。
- 本地开发使用 Turnstile 官方测试密钥。

---

## 8. 数据保留

| 数据 | 保留规则 |
|---|---|
| 已通过墓碑 | 一直保留，直到用户撤回或被隐藏 |
| 已撤回 | 立即清空文本字段 |
| 已拒绝 | 30 天后删除整行 |
| 已处理举报 | 90 天后删除 |
| `rate_limits` | 超过 2 天的记录删除 |
| `flowers` | 只保留计数所需记录；超过 2 天的去重记录可删除（`tombstones.flowers` 计数保留） |

用 Workers Cron Trigger 每天凌晨（北京时间 04:17）执行清理。

---

## 9. 文案（Codex 照此落地，可微调措辞）

**首页标题**：号没了 —— AI 账号赛博公墓
**副标题**：被封了、被停了、卡验证了？来这里立块碑，你不是一个人。
**统计说明**：只统计本站当前可见的自愿上报，不代表平台实际封号数量，不能用来推算封号率。
**墓碑卡片角标**：用户自述 · 未经核实

**使用须知（/rules）要点**：
1. 写经过，猜测请注明。
2. 不填隐私：邮箱、密码、API Key、订单号、手机号、微信/QQ、链接、证件信息。
3. 保存好凭据，丢失无法找回。
4. 本站不讨论、不提供：买卖账号、拼车合租、中转代理、代充代付、翻墙节点、防封技巧、解封服务。相关内容一律不予通过。
5. 对事不对人：不点名攻击个人，包括厂商员工。
6. 想申诉？请走厂商官方渠道（见「官方申诉入口」页）。本站无法帮你解封。

**数据说明（/privacy）要点**：公开哪些字段；不收集哪些信息；IP 只以加盐哈希形式用于限流且按日轮换；凭据的作用和保存位置；审核流程；撤回的效果（已被他人截图的无法收回）；数据保留期限；本站不使用 Cookie 和第三方追踪。

**关于（/about）**：独立社区项目，与任何 AI 厂商无隶属关系；产品名称和商标归各自所有者；内容为用户自述，本站不核实，也不据此判断封号原因；联系邮箱 `TODO_CONTACT_EMAIL`（站长填写，用于更正和投诉）。

**官方申诉入口（/appeal）**：每个厂商一张卡片：厂商名（纯文字）+「官方帮助中心」链接 + 「官方申诉方式」说明，全部为 `TODO_OFFICIAL_URL` 占位，并在页面顶部注明「以下链接均指向厂商官方网站，最后核对日期：TODO_DATE」。

---

## 10. 视觉

- 风格：温暖、可爱的"像素墓园"。浅色背景（米黄 / 奶油色），点缀草绿、珊瑚橙。支持深色模式（`prefers-color-scheme`）。
- 吉祥物"守墓小猫"：原创像素风 SVG，Codex 自行绘制，不得参考任何厂商吉祥物。
- 墓碑卡片三种样式：小花 🌷 / 云朵 ☁️ / 星星 ⭐（用 SVG 装饰，不依赖 emoji 渲染）。
- 字体：系统中文字体栈，不加载外部字体。
- 移动端优先：375px 宽度下无横向滚动，左右留白 16px。
- 无障碍：所有按钮有可读标签，颜色对比度符合 WCAG AA，表单错误提示与字段关联。

---

## 11. 里程碑（Codex 按顺序执行）

每个里程碑完成后：运行全部测试 → 通过后提交一次 git commit，提交信息以 `M<n>:` 开头。

**M0 项目初始化**
- pnpm 初始化、TypeScript strict、ESLint + Prettier。
- `wrangler.toml`：Worker、Static Assets、D1 绑定 `DB`、Cron Trigger、环境变量占位。
- Astro 项目，构建输出给 Worker 作为静态资源。
- `pnpm dev` 能在本地同时跑起前端和 API。
- 创建空的 `DECISIONS.md`。

**M1 数据库与公开 API**
- 迁移 SQL（§5）。
- `lib/` 下全部工具函数及单元测试：校验、隐私检测、灰产检测、凭据生成与校验、限流、Turnstile 校验、北京时间工具。
- 实现 §6.1 全部公开接口及接口测试。

**M2 前台页面**
- `/`、`/t/:id`、`/submit`、`/manage`、`/rules`、`/privacy`、`/about`、`/appeal`。
- 统计图表（原生 SVG）。
- 凭据弹窗（复制、下载、"我已保存"）。

**M3 审核后台**
- Access JWT 校验中间件（未通过一律 403）。
- `/admin` 页面：三个队列标签页（新投稿 / 修改 / 被举报），灰产与举报标红，一键通过/拒绝/隐藏/恢复，显示 `audit_log`。
- §6.2 全部接口及测试。

**M4 墓志铭生成器**
- `/epitaph` 页面，canvas 渲染、PNG 下载、30+ 条随机模板。
- 用 Playwright 断言该页面不发出任何网络请求（除静态资源外）。

**M5 安全加固与测试**
- §7 全部安全头和 Origin 校验。
- §8 定时清理任务及测试。
- Playwright 端到端：立碑 → 拿到凭据 → 后台通过 → 墙上可见 → 献花（同日重复无效）→ 修改 → 后台通过修改 → 撤回 → 墙上与统计中消失。
- 隐私检测端到端：填写邮箱/手机号时被拦截。
- 375px 移动端截图检查无横向滚动。

**M6 部署文档**
- 编写 `DEPLOY.md`：创建 D1、执行迁移、配置 secrets、配置 Turnstile、配置 Access、绑定自定义域名、首次发布、回滚方法。
- 编写 `README.md`：本地开发、测试、目录说明。

---

## 12. 验收标准

- [ ] 全部测试通过；TypeScript 无报错；ESLint 无错误。
- [ ] 站点任何地方无厂商 Logo、吉祥物或仿冒品牌元素。
- [ ] 页脚有独立项目声明。
- [ ] 投稿中含邮箱、手机号、链接、API Key、长数字串时被拦截。
- [ ] 灰产关键词投稿进入人工审核并在后台标红。
- [ ] 未审核内容不出现在墙上和统计中。
- [ ] 撤回后文本字段被清空。
- [ ] 数据库中没有原始 IP、没有明文 secret。
- [ ] 不设置任何 Cookie；没有第三方脚本（Turnstile 除外）。
- [ ] `/admin` 和 `/api/admin/*` 未通过 Access 时返回 403。
- [ ] 墓志铭生成器不发出业务请求。
- [ ] `/appeal` 中所有链接都是 `TODO_OFFICIAL_URL` 占位，未编造任何网址。
- [ ] 生产环境数据库无示例数据。
- [ ] 移动端 375px 宽度显示正常。

---

## 13. 不在本次范围内（不要做）

- 用户注册登录、评论区、私信。
- AI 自动审核（如以后要做，须在数据说明中披露发送了哪些字段、发给了谁、保留多久）。
- 广告、付费功能、联盟推广链接。
- 墓碑的动态 OG 分享图（MVP 用统一的静态 OG 图）。
- 多语言。

---

## 14. 站长需要亲自完成的事（Codex 不做）

1. 在 Cloudflare 添加站点 `haomeile.rip`；如果域名不是在 Cloudflare 买的，到注册商后台把 NS 改成 Cloudflare 提供的地址。
2. 创建 Turnstile 站点，拿到 site key 和 secret。
3. 在 Cloudflare Zero Trust 创建 Access 应用，保护 `haomeile.rip/admin*` 和 `haomeile.rip/api/admin/*`，只允许你自己的邮箱。
4. 用 `wrangler secret put` 配置 `TURNSTILE_SECRET`、`PEPPER`（随机 32 字节以上）、`ACCESS_AUD`、`ACCESS_TEAM_DOMAIN`。
5. 人工核对并填写 `/appeal` 的官方链接、`TODO_CONTACT_EMAIL`、`TODO_DATE`。
6. 上线前请律师看一下使用须知、数据说明和免责声明。
7. 上线后每天审核投稿和举报。

---

## 15. 给 Codex 的执行规则

1. 严格按 §11 的里程碑顺序执行，不跳步。
2. 遇到本方案没有覆盖的产品决策，选择**更保守、更保护隐私**的方案，并在 `DECISIONS.md` 记录：问题、选择、理由。
3. 不得违反 §2 的任何硬性约束；如果某个需求与 §2 冲突，以 §2 为准并记录在 `DECISIONS.md`。
4. 不引入本方案未列出的大型依赖；确需引入时在 `DECISIONS.md` 说明理由。
5. 不编造任何外部网址、数据或用户内容。

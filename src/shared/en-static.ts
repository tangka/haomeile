import { TIP_TRANSLATIONS } from './tips';

/** Static, first-party interface copy. User-written memorials are never translated. */
export const EN_STATIC: Record<string, string> = {
  '条。': 'entries.',
  '新收录的记录在前面。': 'Newest additions first.',
  '号没了，一个记录 AI 账号经历的独立社区，与任何 AI 厂商无隶属关系。文中提及的产品名称和商标归各自所有者。':
    'Haomeile is an independent community for AI account stories. Not affiliated with any AI company. Product names and trademarks belong to their owners.',
  '号没了记录 Claude、Codex 和 Antigravity 账号经历，提供用户投稿、社区整理和像素墓志铭卡片。':
    '号没了 records Claude, Codex and Antigravity account stories, with user submissions, community summaries and pixel epitaph cards.',
  '号没了是一个记录 AI 账号经历的独立社区，与任何 AI 厂商无隶属关系。':
    'Haomeile is an independent community for AI account stories. Not affiliated with any AI company.',
  '内容来自本站用户投稿和公开社区原帖。社区整理附原帖链接，摘要由本站编辑。':
    'Content comes from user submissions and public community posts. Community summaries link to the originals and are edited by this site.',
  '了解号没了展示的内容、数据保存方式、统计定义与撤回流程。':
    'Learn about the content shown on 号没了, data retention, count definitions and the withdrawal process.',
  统计定义: 'How counts are defined',
  '投稿统计与近 30 天曲线来自当前公开、审核通过的用户投稿；社区整理显示独立总数。“今天”和“近 7 天”按北京时间计算。':
    'User-submission figures and the 30-day chart use currently public, approved user submissions. Community summaries have a separate total. “Today” and “past 7 days” use Beijing time (UTC+8).',
  '号没了投稿说明：记录经过、保护隐私、保存凭据，并通过官方渠道申诉。':
    'Posting on 号没了: describe events, protect privacy, save your credentials and use official appeal channels.',
  '查看 Claude、Codex 和 Antigravity 的封号与申诉经历，查找官方申诉入口，了解订阅扣费和套餐异常的处理步骤。':
    'Read about Claude, Codex and Antigravity bans and appeals, find official appeal forms and troubleshoot subscription charges or plan issues.',
  'Claude、Codex 和 Antigravity 的账号经历、用户投稿与社区整理。':
    'Account stories, user submissions and community summaries about Claude, Codex and Antigravity.',
  '这里收录账号经历的用户投稿和社区整理。':
    'User submissions and community summaries about account experiences are collected here.',
  '查看账号经历、内容来源与申诉状态。':
    'View an account story, its source and appeal status.',

  号没了: '号没了',
  '这里什么也没有 · 号没了': 'Nothing here · Haomeile',
  '可能地址写错了，也可能这块碑已经被撤回。':
    'The address may be wrong, or this memorial may have been withdrawn.',
  '号没了：AI 账号赛博公墓': 'Haomeile: An AI account cemetery',
  跳到正文: 'Skip to content',
  主导航: 'Main navigation',
  纪念墙: 'Memorial wall',
  立碑制卡: 'Create',
  立碑或制卡: 'Create a memorial',
  立碑方式: 'Ways to create a memorial',
  公开立碑: 'Post to the wall',
  本地制卡: 'Make a local card',
  立碑: 'Add a memorial',
  墓志铭卡片: 'Epitaph cards',
  官方申诉入口: 'Official appeals',
  使用小技巧: 'Tips',
  重置雷达: 'Reset Radar',
  '重置雷达：Codex、Claude Code、Antigravity 额外重置估计 · 号没了': 'Reset Radar: unofficial extra quota reset estimates for Codex, Claude Code & Antigravity · Haomeile',
  '重置雷达每 30 分钟估计一次 Codex、Claude Code 和 Antigravity 未来 24 小时额外重置的可能，非官方，基于社区观测信号。支持超过 80% 时邮件提醒。': 'Reset Radar estimates every 30 minutes how likely an extra Codex, Claude Code or Antigravity quota reset is in the next 24 hours. Unofficial, based on community signals, with email alerts above 80%.',
  '估计 Codex、Claude Code 和 Antigravity 未来 24 小时发生额外额度重置的可能。这是非官方估计。': 'How likely an extra Codex, Claude Code or Antigravity quota reset is in the next 24 hours. This is an unofficial estimate.',
  '查看当前估计': 'See the current estimate',
  '这个估计怎么看': 'How to read this estimate',
  '这是本站的非官方估计，不是 OpenAI、Anthropic 或 Google 发布的信息。': 'This is an unofficial estimate by this site, not information from OpenAI, Anthropic or Google.',
  '估计的是额外重置，不计各平台自然周期内的恢复。依据社区观测信号，每 30 分钟一轮，覆盖 Codex、Claude Code 和 Antigravity 未来 24 小时。': 'It covers extra resets, not recovery within each platform’s natural cycle. It uses community signals, runs every 30 minutes, and looks 24 hours ahead for Codex, Claude Code and Antigravity.',
  '近 24 小时内已确认的重置会标在趋势图上。目前没有可公布的命中率数据，请只当参考。': 'Resets confirmed in the past 24 hours are marked on the trend chart. There is no hit-rate data to publish yet, so treat it as a reference only.',
  '你自己的额度和恢复时间，以各应用里的用量页为准。': 'For your own quota and reset time, rely on the usage page in each app.',
  '可以订阅邮件提醒：所选平台的额外重置概率超过 80% 时发信，连续高于 80% 期间每个平台只提醒一次，随时可以退订。': 'Email alerts are available: you get one when a chosen platform passes 80%, once per platform while it stays above 80%. Unsubscribe any time.',
  '额度用完，不等于封号': 'Out of quota is not a ban',
  '提示额度用完或 429 时，等额度恢复即可。提示 403、服务停用或组织停用时，才需要查下面的处理步骤。': 'If you see a quota message or 429, wait for the quota to return. Use the steps below only for a 403, a disabled service or a disabled organization.',
  'Claude 账号或组织停用怎么办': 'Claude account or organization disabled: what to do',
  '付费后仍显示 Starter Quota': 'Paid plan still shows Starter Quota',
  '广告': 'Ads',
  '本站目前不加载广告，已申请 Google AdSense。': 'This site does not load ads at present. It has applied to Google AdSense.',
  '启用广告后，Google 等第三方供应商会使用 Cookie，根据你访问本站或其他网站的记录投放广告。Google 及其合作伙伴可以凭广告 Cookie 向你展示广告。': 'Once ads are enabled, third-party vendors including Google use cookies to serve ads based on your visits to this and other sites. Advertising cookies let Google and its partners show you ads.',
  '你可以在': 'You can turn off personalized ads in',
  'Google 广告设置': 'Google Ads Settings',
  '关闭个性化广告，也可以到': ', or visit',
  '关闭部分第三方供应商的个性化广告 Cookie。启用广告时，本页会同步更新。': 'to opt out of some third-party vendors’ personalized advertising cookies. This page will be updated when ads are enabled.',
  '重置雷达 · 号没了': 'Reset Radar · Haomeile',
  '重置雷达：Codex、Claude Code、Antigravity 24 小时额外重置概率':
    'Reset Radar: 24-Hour Extra Quota Reset Forecast for Codex, Claude Code & Antigravity',
  '重置雷达：Codex、Claude Code、Antigravity 24 小时额外重置概率 · 号没了':
    'Reset Radar: 24-Hour Extra Quota Reset Forecast for Codex, Claude Code & Antigravity · Haomeile',
  '查看 Codex、Claude Code 和 Antigravity 未来 24 小时额外重置概率预测与近 24 小时趋势，附各平台停用案例与官方申诉入口。':
    'Unofficial 24-hour extra quota reset estimates and trend charts for Codex, Claude Code and Antigravity, with links to suspension cases and official appeal channels.',
  '查看 Codex、Claude Code 和 Antigravity 未来 24 小时额外重置概率预测与近 24 小时趋势，支持超过 80% 时发送免费邮件提醒，附各平台停用案例与官方申诉入口。':
    'Unofficial 24-hour extra quota reset estimates and trend charts for Codex, Claude Code and Antigravity, with free email alerts when probability exceeds 80%, plus suspension cases and official appeal channels.',
  '预测超过 80% 自动发邮件提醒，免费且可随时退订':
    'Free email alerts above 80%; unsubscribe anytime',
  '重置雷达的概率预测怎么看？是否代表厂商官方公告？':
    'How should Reset Radar probabilities be read, and are they official announcements?',
  '重置雷达每 30 分钟按社区观测信号刷新一次，展示 Codex、Claude Code 和 Antigravity 未来 24 小时发生额外重置的概率参考及近 24 小时变化趋势，不代表厂商官方通知。':
    'Reset Radar refreshes every 30 minutes from community signals, showing 24-hour extra quota reset estimates and 24-hour trends for Codex, Claude Code and Antigravity. They are not official provider announcements.',
  '怎么在 Codex、Claude Code 或 Antigravity 额度重置概率升高时收到提醒？':
    'How can I get notified when Codex, Claude Code or Antigravity reset probability spikes?',
  '点击页面上的「订阅邮件提醒」，勾选关注的平台并填写邮箱，输入邮件里的 6 位验证码（或点击确认链接）即可生效。所选平台的额外重置概率超过 80% 时会自动发邮件，连续高于 80% 期间每个平台只提醒一次，且可随时通过邮件链接退订。':
    'Select Get email alerts, choose the platforms you follow, enter your email and confirm with the 6-digit code or confirmation link. You receive one email per platform while its extra reset forecast stays above 80%, and can unsubscribe anytime from any email.',
  查看邮件数据说明: 'See email privacy details',
  邮件提醒隐私说明: 'Email alert privacy',
  说明与相关入口: 'Methodology & related links',
  '百分比表示基于社区观测信号的未来 24 小时额外重置概率参考，不代表厂商官方通知。':
    'Percentages reflect community-signal estimates of extra quota resets over the next 24 hours. They are not official provider announcements.',
  '百分比表示基于社区观测信号的未来 24 小时额外重置概率参考，不代表厂商官方通知。订阅邮件提醒后，所选平台预测超过 80% 时会自动发信通知，连续高于 80% 期间每个平台只提醒一次。':
    'Percentages reflect community-signal estimates of extra quota resets over the next 24 hours and are not official provider announcements. With email alerts enabled, you receive one notification per selected platform whenever a new forecast exceeds 80%.',
  '未来 24 小时额外重置概率':
    'Chance of an extra quota reset in the next 24 hours',
  'Codex、Claude Code 和 Antigravity 在未来 24 小时内发生额外额度重置的概率。':
    '24-hour extra quota reset estimates for Codex, Claude Code and Antigravity.',
  重置预测: 'Reset forecast',
  '近 24 小时额外重置趋势': 'Extra reset forecasts over the past 24 hours',
  '每 30 分钟一轮': '30-minute intervals',
  额外重置概率趋势图: 'Extra quota reset probability chart',
  '指向、轻点或用方向键查看采样点。':
    'Hover, tap, or use the arrow keys to inspect samples.',
  '通过人机验证后进入重置雷达。': 'Verify you are human to open Reset Radar.',
  '请完成人机验证后进入。': 'Complete the human verification to continue.',
  '请开启 JavaScript 完成验证。': 'Enable JavaScript to verify.',
  '暂未获取到额度重置预测。':
    'Quota reset estimates are currently unavailable.',
  订阅邮件提醒: 'Get email alerts',
  已订阅: 'Subscribed',
  修改订阅: 'Edit subscription',
  订阅: 'Subscribe',
  使用其他邮箱: 'Use another email',
  确认修改: 'Confirm changes',
  '这个邮箱已经订阅过了。': 'This email is already subscribed.',
  '这个邮箱已经订阅过了。提醒设置已更新。':
    'This email is already subscribed. Your alert settings have been updated.',
  '这个邮箱已经订阅过了。请查看 {email} 的收件箱，输入验证码确认修改。':
    'This email is already subscribed. Enter the code sent to {email} to confirm your changes.',
  '所选平台的额外重置概率超过 80% 时发邮件。连续高于 80% 期间，每个平台只提醒一次。':
    'Get an email when the chance of an extra quota reset for a selected platform exceeds 80%. You get one alert per platform while its forecast stays above 80%.',
  选择提醒的平台: 'Choose platforms',
  邮箱地址: 'Email address',
  '验证邮箱后开始接收提醒，可随时退订。':
    'Verify your email to receive alerts. You can unsubscribe at any time.',
  发送验证码: 'Send code',
  邮箱验证码: 'Email verification code',
  '请输入邮件里的 6 位验证码，10 分钟内有效。也可以点击邮件中的确认链接。':
    'Enter the 6-digit code from your email within 10 minutes, or use the confirmation link in the email.',
  修改邮箱或重新获取验证码: 'Change email or request another code',
  '验证码错误或已过期，请核对或重新获取。':
    'That code is incorrect or has expired. Check it or request another code.',
  '请至少选择一个平台。': 'Choose at least one platform.',
  '正在提交…': 'Submitting…',
  '请查看 {email} 的收件箱。': 'Check the inbox for {email}.',
  '提交未完成，请稍后再试。': 'Submission failed. Please try again later.',
  '管理雷达邮件提醒 · 号没了': 'Manage Radar email alerts · Haomeile',
  管理雷达邮件提醒: 'Manage Radar email alerts',
  '确认或退订重置雷达的邮件提醒。':
    'Confirm or unsubscribe from Reset Radar email alerts.',
  '请打开邮件中的确认或退订链接。':
    'Open the confirmation or unsubscribe link from your email.',
  确认订阅: 'Confirm subscription',
  退订邮件提醒: 'Unsubscribe from email alerts',
  返回重置雷达: 'Back to Reset Radar',
  '确认后，你会收到所选平台的邮件提醒。':
    'After confirming, you will receive alerts for your selected platforms.',
  '退订后将停止收到重置雷达的邮件提醒。':
    'Unsubscribing stops Reset Radar email alerts.',
  '订阅已确认。': 'Your subscription is confirmed.',
  '已退订。': 'You have unsubscribed.',
  '链接无效或已失效，请使用最新邮件中的链接。':
    'This link is invalid or expired. Use the link from your latest email.',
  '阅读 X 长文': 'Read the full article on X',
  返回技巧目录: 'Back to tips',
  文章导航: 'Article navigation',
  相关入口: 'Related links',
  操作步骤: 'What to do',
  收录时浏览量: 'Views when selected',
  'AI 账号开通、订阅与扣费排查': 'AI account setup, subscriptions and billing',
  'AI 账号开通、订阅与扣费排查 · 号没了':
    'AI account setup, subscriptions and billing · Haomeile',
  '面向中文读者的 Claude、ChatGPT 和 Google AI 开通与订阅指南，涵盖付款、续费和套餐异常排查。':
    'Guides for Chinese-speaking readers on Claude, ChatGPT and Google AI account setup, subscriptions, payments, renewals and plan issues.',
  ...TIP_TRANSLATIONS,
  使用须知: 'Rules',
  提着灯笼的守墓小猫: 'A cemetery cat carrying a lantern',
  这里什么也没有: 'Nothing here',
  回到纪念墙: 'Back to the memorial wall',
  页脚: 'Footer navigation',
  数据说明: 'Data & privacy',
  关于: 'About',
  管理我的墓碑: 'Manage my memorial',
  语言: 'Language',
  中文: '中文',

  '墓碑详情 · 号没了': 'Memorial details · Haomeile',
  复制这块碑的链接: 'Copy memorial link',
  做一张墓志铭卡片: 'Make an epitaph card',
  举报: 'Report',
  举报这块碑: 'Report this memorial',
  '举报需要审核，不会立刻隐藏。如果这是你自己的碑，去“管理我的墓碑”撤回会更快。':
    'Reports are reviewed before a memorial is hidden. If this is your memorial, you can withdraw it sooner through “Manage my memorial”.',
  原因: 'Reason',
  含隐私信息: 'Contains private information',
  '辱骂、骚扰或恶意内容': 'Abuse, harassment or harmful content',
  灰产广告: 'Illicit service advertising',
  其他: 'Other',
  补充说明: 'Additional details',
  '选填，最多 200 字': 'Optional, up to 200 characters',
  人机验证: 'Human verification',
  提交举报: 'Submit report',
  算了: 'Cancel',

  '账号停用、封号经历 · 号没了': 'Account suspensions and bans · Haomeile',
  账号的墓碑: 'Account memorials',
  纪念墙统计: 'Memorial wall statistics',
  统计口径: 'How we count',
  社区整理: 'Community summaries',
  '社区整理提供中英文编辑摘要，原文请看原帖。本站不会自动翻译用户提交的代号、署名、经过或墓志铭。':
    'Community summaries are edited in Chinese and English; read the original posts for the source text. We do not automatically translate aliases, display names, stories or epitaphs submitted by users.',
  '如果你是原帖作者，希望更正或移除整理内容，请打开对应记录的详情页，使用“举报”说明情况。':
    'Original authors can request corrections or removal through Report on the relevant entry’s detail page.',
  '社区整理另显示来源链接、原帖发布日期和编辑摘要。未注明的套餐或发生日期不会补写。原帖作者可通过对应详情页的“举报”请求更正或删除。':
    'Community summaries also show a source link, post date and editorial summary. Unknown plans or incident dates are not filled in. Original authors can request corrections or deletion through Report on the relevant detail page.',
  '用户投稿和修改都由站长人工审核，通过后才公开。审核中的内容不会出现在墙上和统计里。':
    'The site owner manually reviews user submissions and edits before publication. Submissions awaiting review do not appear on the wall or in statistics.',
  '这里还很安静。第一块碑，要不要由你来立？':
    'It’s quiet here. Will you add the first memorial?',
  立一块碑: 'Add a memorial',
  '再看 20 块': 'Load 20 more',
  '近 30 天上报与事件发生数':
    'Reports and incident dates over the past 30 days',

  '关于 · 号没了': 'About · Haomeile',
  '这里只记录 Claude、Codex 和 Antigravity 三个产品的账号经历。':
    'This site records account experiences with three products: Claude, Codex and Antigravity.',
  '需要更正内容、投诉或联系我们：':
    'For corrections, complaints or other enquiries:',
  '更正或撤回自己的碑文：': 'To correct or withdraw your memorial: ',
  '要举报不当内容，请从':
    'To report inappropriate content, find the memorial on the ',
  '打开对应墓碑的详情页，点击“举报”。': ', open its details and choose Report.',

  '审核后台 · 号没了': 'Moderation · Haomeile',
  '号没了投稿、修改和举报审核后台。':
    'Moderation of 号没了 submissions, edits and reports.',
  后台导航: 'Admin navigation',
  审核: 'Moderation',
  '标红的投稿命中了隐私或灰产规则，需要逐条看。通过后才会出现在纪念墙和统计里。':
    'Submissions marked in red triggered privacy or illicit-service rules and need individual review. Only approved submissions appear on the wall and in statistics.',
  审核队列: 'Moderation queue',
  新投稿: 'New submissions',
  修改: 'Edit',
  被举报: 'Reported',
  '正在加载审核队列……': 'Loading moderation queue…',
  雷达邮件额度: 'Radar email capacity',
  刷新额度: 'Refresh usage',
  '正在读取发信额度……': 'Loading email usage…',
  发信渠道: 'Email provider',
  '日用量 / 上限': 'Daily usage / limit',
  '月用量 / 上限': 'Monthly usage / limit',
  今日可发: 'Available today',
  已订阅人数: 'Subscribers',
  最近的操作: 'Recent actions',
  时间: 'Time',
  墓碑: 'Memorial',
  操作: 'Action',
  操作人: 'Moderator',

  'Claude、Codex、Antigravity 封号后怎么申诉 · 号没了':
    'How to appeal a Claude, Codex or Antigravity suspension · Haomeile',
  'Claude、Codex 或 Antigravity 账号停用后，查看对应的官方申诉入口和填写时需要准备的信息。':
    'Find the official appeal channel for a Claude, Codex or Antigravity suspension and get the details you need to file an appeal.',
  'Claude、Codex、Antigravity 账号停用与 403 报错的官方申诉入口、填写清单，以及身份验证、Starter Quota 和解封后订阅异常排查指南。':
    'Official appeal channels, checklists and troubleshooting guides for Claude, Codex and Antigravity account suspensions, 403 errors, ID verification, Starter Quota and billing recovery.',
  '汇总 Claude、Codex 与 Antigravity 的官方申诉渠道、常见报错区分和排查入口。所有链接均指向对应厂商官网或官方表单。':
    'Official appeal channels, common error distinctions and troubleshooting guides for Claude, Codex and Antigravity. Every external link points to the provider’s official site or form.',
  'Claude 解封后还是 Free？查看 Google Play 的 Max 订阅排查步骤':
    'Claude still shows Free after reinstatement? Check your Max subscription in Google Play',
  '用受限的 Claude 账号登录，在账号限制页提交申诉。':
    'Sign in with the affected Claude account to submit an appeal on the account restriction page.',
  'Claude 账号申诉': 'Appeal a Claude restriction',
  'Claude 申诉说明': 'Claude appeal guidance',
  '查看 Claude 停用案例': 'Browse Claude suspension cases',
  'Claude 官方申诉入口': 'Official Claude appeal',
  '优先使用 OpenAI 通知邮件里的申诉链接。账号永久停用且无法查看通知时，可用下方表单。没收到通知，可联系帮助中心。':
    'Start with the appeal link in your OpenAI notification email. For a permanent account closure, use the form below if you cannot access that email. If you received no notification, contact support through the Help Center.',
  'OpenAI 申诉表单': 'OpenAI appeal form',
  'OpenAI 帮助中心': 'OpenAI Help Center',
  '查看 Codex 停用案例': 'Browse Codex suspension cases',
  'Codex / OpenAI 官方申诉入口': 'Official OpenAI appeal',
  '个人账号遇到 Antigravity 服务停用时，用受影响的 Google 账号登录并提交申诉。':
    'If Antigravity access was suspended on a personal account, sign in with the affected Google Account and submit an appeal.',
  '个人账号遇到 Antigravity 服务停用或 403 权限拒绝时，用受影响的 Google 账号登录并提交申诉。':
    'If Antigravity access was suspended or returns a 403 permission error on a personal account, sign in with the affected Google Account and submit an appeal.',
  'Antigravity 申诉表单': 'Antigravity appeal form',
  'Google 账号停用说明': 'Disabled Google Account help',
  '查看 Antigravity 停用案例': 'Browse Antigravity suspension cases',
  'Claude Code 提示组织停用怎么办': 'Claude Code organization disabled: what to do',
  'Antigravity 403 或服务停用怎么办': 'Antigravity 403 or disabled: what to do',
  'Antigravity 官方申诉入口': 'Official Antigravity appeal',
  Antigravity: 'Antigravity',
  申诉时可以写什么: 'What to include in an appeal',
  '出事的时间，以及你当时在做什么。':
    'When the incident happened and what you were doing at the time.',
  '你平时用它做什么，比如写代码、写论文、处理工作文档。':
    'What you normally use the product for, such as coding, academic writing or work documents.',
  '收到的通知原文。': 'The exact wording of any notice you received.',
  '提交一次后保留工单或回执，避免短时间内重复提交多份表单。':
    'Keep your ticket or confirmation after submitting once, and avoid sending duplicate forms in a short period.',
  分产品常见问题与排查: 'Common questions by product',
  'Claude 封号或组织停用后怎么申诉？解封后仍显示 Free 怎么办？':
    'How do I appeal a Claude ban or org suspension, and what if my plan still shows Free afterward?',
  '先登录受限的 Claude 账号访问 claude.ai/restricted 提交申诉；若仅弹出身份验证窗口，先确认所在地区并按官方指引完成证件验证。如果账号恢复后已付费的 Max 或 Pro 仍显示 Free，请核对 Apple、Google Play 或网页账单收据，并从 Claude 网页左下角「获取帮助」联系官方支持核对订单。':
    'Sign in with the restricted Claude account and submit an appeal at claude.ai/restricted. If you only see an identity verification prompt, check supported regions and follow Anthropic’s ID verification flow. If a paid Max or Pro plan still shows Free after reinstatement, check your Apple, Google Play or web receipt and contact support through Get help in the lower left of Claude on the web.',
  'Codex 或 ChatGPT 账号停用怎么申诉？401 报错一定是永久封号吗？':
    'How do I appeal a Codex or ChatGPT deactivation, and does a 401 error always mean a permanent ban?',
  '先查注册邮箱里的 OpenAI 通知邮件，优先使用邮件内的申诉链接；若账号永久停用且无法查看通知，再使用 OpenAI 官方申诉表单，未收到通知则通过 OpenAI 帮助中心联系支持。客户端出现 401 时，先核对网页端账号状态和登录凭据，社区案例中存在 401 与账号停用状态不一致的情况。':
    'Check your account email for an OpenAI notice and start with the appeal link inside it. If the account was permanently deactivated and you cannot access the notice, use OpenAI’s official appeal form, or reach out via the Help Center if you received no notice. For a 401 error in the client, verify your web account status and credentials first—community reports show 401 responses do not always match a permanent ban.',
  'Antigravity 出现 403 或服务停用怎么处理？付费后仍显示 Starter Quota 怎么办？':
    'What should I do for an Antigravity 403 or service suspension, or when a paid plan still shows Starter Quota?',
  '个人 Google 账号遇到 Antigravity 服务停用或 403 权限拒绝时，先核对所在地区与已授权的第三方连接，再使用受影响的 Google 账号提交官方申诉表单，并避免短时间重复提交。如果是已开通 Google AI Pro 或 Ultra 但客户端仍显示 Starter Quota，请先核对客户端登录邮箱、查看额度页是否提示年龄验证，验证后退出重新登录。':
    'If a personal Google Account hits an Antigravity suspension or 403 permission error, check regional availability and third-party account connections first, then submit the official appeal form with the affected Google Account without filing duplicates. If you have an active Google AI Pro or Ultra plan but Antigravity still shows Starter Quota, check the signed-in email and any age verification prompt beneath the quota, then sign out and back in.',
  相关实操指南: 'Related troubleshooting guides',
  'Claude 注册或结账弹出身份验证时怎么核对':
    'What to check when Claude asks for identity verification',
  'Antigravity 开通 Ultra 或 Pro 后仍显示 Starter Quota 的排查步骤':
    'Antigravity still shows Starter Quota on a paid Pro or Ultra plan',
  'Antigravity 桌面端登录与 Google AI Pro 开通核对':
    'Antigravity desktop sign-in and Google AI Pro setup',
  'ChatGPT Plus 与 Codex 账号订阅到账核对':
    'Checking ChatGPT Plus and Codex subscription activation',

  '墓志铭卡片生成器 · 号没了': 'Epitaph card maker · Haomeile',
  '为 Claude、Codex 或 Antigravity 的账号生成像素墓碑图。图片只在你的浏览器里生成，不会上传任何内容。':
    'Make a pixel memorial card for a Claude, Codex or Antigravity account. Images are generated entirely in your browser. Nothing is uploaded.',
  '给没了的账号做一张墓碑图，发给同样遭遇的朋友。图片只在你的浏览器里生成，不会上传。':
    'Make a memorial card for a lost account and share it with friends who understand. Images are generated in your browser and are never uploaded.',
  代号: 'Alias',
  哪个产品: 'Product',
  生于: 'Born',
  卒于: 'Died',
  死因: 'Cause of death',
  账号停用: 'Account disabled',
  组织暂停: 'Organization suspended',
  地区限制: 'Region restricted',
  验证卡住: 'Verification blocked',
  扣费异常: 'Billing or payment issue',
  原因不明: 'Unknown cause',
  墓志铭: 'Epitaph',
  换一句: 'Try another',
  '最多 40 字，太长刻不下。':
    'Up to 40 characters. There’s only so much room on a stone.',
  碑脚放点什么: 'Decoration',
  小花: 'Flower',
  云朵: 'Cloud',
  星星: 'Star',
  时辰: 'Time of day',
  白天: 'Day',
  夜里: 'Night',
  墓碑卡片预览: 'Memorial card preview',
  下载图片: 'Download image',
  '图片右下角会带上 haomeile.rip。':
    'The image includes haomeile.rip in the bottom-right corner.',
  小橘号: 'Little Orange',

  '号没了 · Claude、Codex、Antigravity 封号与申诉记录':
    'Haomeile · Claude, Codex and Antigravity bans and appeals',
  'AI 账号赛博公墓': 'An AI account cemetery',
  '被封了、被停了、卡在验证了？': 'Banned, suspended or stuck in verification?',
  这里收录: 'Stories about',
  '的账号停用与申诉经历。': 'account suspensions and appeals.',

  '管理我的墓碑 · 号没了': 'Manage my memorial · Haomeile',
  '用凭据查看审核结果、修改或撤回。':
    'Use your credentials to check moderation results, edit or withdraw your memorial.',
  '输入立碑时拿到的凭据，可以查看审核结果、修改或撤回。':
    'Enter the credentials you received when submitting your memorial to check its status, edit it or withdraw it.',
  编号: 'ID',
  '10 位字母和数字': '10 letters and numbers',
  密钥: 'Secret key',
  查看: 'Check status',
  用这个浏览器记住的凭据: 'Use credentials saved in this browser',
  编号或密钥不对: 'Incorrect ID or secret key',
  '检查一下有没有多复制空格。凭据丢了没法找回，可以重新立一块。':
    'Check for extra spaces when copying. Lost credentials cannot be recovered, but you can submit a new memorial.',
  去墙上看看: 'View on the wall',
  撤回: 'Withdraw',
  '撤回这块碑？': 'Withdraw this memorial?',
  '撤回后，它会从纪念墙和统计里消失，碑文会被清空，没法恢复。已经被别人看到或截图的内容收不回来。':
    'This will remove the memorial from the wall and statistics and permanently erase its text. We cannot take back anything others have already seen or captured.',
  撤回这块碑: 'Withdraw memorial',
  先不撤: 'Keep memorial',

  '数据说明 · 号没了': 'Data & privacy · Haomeile',
  '号没了公开哪些内容、不收集哪些信息、统计口径是什么，以及公开内容会被搜索引擎和 AI 服务抓取。':
    'What 号没了 makes public, what it does not collect, how statistics are counted, and how search engines and AI services may crawl public content.',
  更新于: 'Updated ',
  会公开的内容: 'What becomes public',
  '审核通过后，墙上会显示：代号、署名、产品、事件种类、套餐、注册时间（按你选的精度）、出事日期、经过、墓志铭、申诉状态、碑脚样式、献花数和立碑时间。':
    'Once approved, the wall displays your alias, display name, product, incident type, plan, registration date at your chosen precision, incident date, story, epitaph, appeal status, decoration, flower count and submission time.',
  不会收集的内容: 'What we do not collect',
  '浏览和立碑不需要注册，也不要求邮箱、手机号或真实姓名。人机验证使用 Cloudflare Turnstile。':
    'Browsing and posting memorials require no registration, email address, phone number, or real name. Human verification uses Cloudflare Turnstile.',
  雷达邮件提醒: 'Radar email alerts',
  '验证邮箱后，这个浏览器会用 Cookie 记住订阅。每次打开雷达，有效期延长到当天起 180 天。Cookie 中没有邮箱地址。':
    'After you verify your email, this browser remembers your subscription with a cookie. Each visit to Radar renews it for 180 days. The cookie contains no email address.',
  '订阅时保存邮箱、所选平台、语言和确认状态，用于发送确认邮件和提醒。邮箱不会公开。你可以通过邮件内的链接退订。':
    'When you subscribe, we store your email address, selected platforms, language, and confirmation status to deliver confirmation messages and alerts. Your email address stays private. Use the link in your email to unsubscribe.',
  '本站不使用第三方统计、广告或追踪脚本。':
    'This site does not use third-party analytics, advertising or tracking scripts.',
  访问统计: 'Web analytics',
  '公开浏览页面使用 Cloudflare Web Analytics 统计浏览量、访问来源和页面加载表现。该服务不使用 Cookie。':
    'Public pages use Cloudflare Web Analytics to measure page views, traffic sources and page load performance. This service does not use cookies.',
  '公开浏览页面使用 Google Analytics 4 统计浏览量、活跃用户和访问来源。Google Analytics 4 使用第一方 Cookie 区分浏览器和会话。':
    'Public pages use Google Analytics 4 to measure page views, active users and traffic sources. Google Analytics 4 uses first-party cookies to distinguish browsers and sessions.',
  'Google 如何使用这些数据': 'How Google uses this data',
  '立碑、制卡、管理和审核页面不加载统计脚本。':
    'Analytics does not run on submission, card creation, management or moderation pages.',
  '搜索引擎和 AI 服务': 'Search engines and AI services',
  '公开的碑任何人都能看到，也欢迎搜索引擎和 AI 服务抓取。这意味着碑文可能出现在搜索结果里，可能被 AI 助手引用，也可能被用于训练 AI 模型。你撤回后，本站会立即下架，但无法删除第三方已经保存的副本。':
    'Anyone can view public memorials, and search engines and AI services are welcome to crawl them. Their text may appear in search results, be quoted by AI assistants or be used to train AI models. If you withdraw a memorial, we remove it immediately, but we cannot delete copies already saved by third parties.',
  'IP 地址': 'IP addresses',
  '为了防刷，服务器会用 IP 计算一个加盐的哈希值做次数限制，哈希每天更换，不保存原始 IP。':
    'To prevent abuse, the server derives a salted hash from your IP address for rate limiting. The hash changes daily. Raw IP addresses are not stored.',
  凭据: 'Credentials',
  '凭据由编号和密钥组成。服务器只保存密钥的哈希，没人能替你找回。你可以选择让浏览器记住它，它只存在你这台设备的这个浏览器里。':
    'Your credentials consist of an ID and a secret key. The server stores only a hash of the key, so nobody can recover it for you. You can choose to save your credentials in this browser; they stay in this browser on this device.',
  '所有投稿和修改都由站长人工审核，通过后才公开。审核中的内容不会出现在墙上和统计里。':
    'The site owner manually reviews every submission and edit before publication. Content awaiting review does not appear on the wall or in statistics.',
  '撤回后，碑会从墙上和统计中消失，碑文会从数据库里清空。已经被别人看到、截图或转发的内容，本站无法收回。':
    'Withdrawing a memorial removes it from the wall and statistics and erases its text from the database. We cannot take back content others have already seen, captured or shared.',
  保存多久: 'How long data is kept',
  '公开的碑：一直保留，直到你撤回或被隐藏。':
    'Public memorials: kept until you withdraw them or they are hidden.',
  '没通过审核的投稿：30 天后删除。':
    'Rejected submissions: deleted after 30 days.',
  '已处理的举报：90 天后删除。': 'Resolved reports: deleted after 90 days.',
  '防刷记录：2 天后删除。': 'Abuse-prevention records: deleted after 2 days.',

  返回填写: 'Back to the form',
  '写经过。': 'Describe what happened.',
  '写你看到了什么、做了什么。不确定的地方请注明“猜测”。':
    'Describe what you saw and did. Label anything uncertain as “speculation”.',
  '不填隐私。': 'Leave out private information.',
  '邮箱、密码、API Key、订单号、手机号、微信或 QQ、链接、证件号码都不要填。':
    'Leave out email addresses, passwords, API keys, order numbers, phone numbers, WeChat or QQ details, links and identity document numbers.',
  '保存好凭据。': 'Save your credentials.',
  '立碑后会得到一组编号和密钥，用来修改和撤回。它只显示一次，丢了没法找回。':
    'You will receive an ID and a secret key to edit or withdraw your memorial. They are shown only once and cannot be recovered if lost.',
  '这里不谈这些。': 'Keep these topics off the site.',
  '买卖账号、拼车合租、中转代理、代充代付、翻墙节点、防封技巧、解封服务。':
    'Account trading or sharing, relay services, third-party payments, proxy nodes, ban-evasion tips and account restoration services.',
  '对事不对人。': 'Discuss events, not individuals.',
  '不点名攻击任何个人，包括厂商的员工。':
    'Do not name and attack individuals, including the providers’ employees.',

  '立一块碑 · 号没了': 'Add a memorial · Haomeile',
  '匿名记录你的 Claude、Codex 或 Antigravity 账号是怎么没的。':
    'Anonymously record what happened to your Claude, Codex or Antigravity account.',
  '写下账号是怎么没的。审核通过后会出现在纪念墙上，你随时可以修改或撤回。':
    'Tell us what happened to your account. Your memorial will appear on the wall after review, and you can edit or withdraw it at any time.',
  '碑文会公开。别填邮箱、手机号等私人信息。':
    'Memorials are public. Leave out email addresses, phone numbers and other private information.',
  读取我的墓碑: 'Load my memorial',
  必填: 'Required',
  '比如：小橘号': 'e.g. Little Orange',
  '代号会作为碑文标题公开显示。': 'The codename is the public memorial title.',
  署名: 'Display name',
  选填: 'Optional',
  '不填就显示“匿名”': 'Leave blank for “Anonymous”',
  请选择: 'Please select',
  套餐: 'Plan',
  不详或不想说: 'Unknown or prefer not to say',
  '先选择产品，再选择对应套餐。':
    'Choose a product first, then select its plan.',
  发生了什么: 'What happened?',
  组织停用: 'Org suspended',
  卡在验证: 'Verification stuck',
  扣费或付款异常: 'Billing issue',
  '生于（注册时间）': 'Born (registration date)',
  不记得: 'I don’t remember',
  记得到月: 'I remember the month',
  记得到日: 'I remember the exact date',
  注册日期: 'Registration date',
  '记不清就空着，存活天数会显示“不详”。':
    'Leave blank if you’re unsure. The lifespan will show as “Unknown”.',
  '卒于（出事那天）': 'Died (incident date)',
  '填写事件发生当天（北京时间，UTC+8）。':
    'Enter the date the incident occurred (Beijing time, UTC+8).',
  事情经过: 'Your story',
  '必填，10 到 800 字': 'Required, 10–800 characters',
  '写你看到了什么、做了什么。猜测请注明“猜测”。':
    'Describe what you saw and did. Label speculation as “speculation”.',
  '选填，最多 120 字': 'Optional, up to 120 characters',
  '比如：它走得很安详，走之前还在思考。':
    'e.g. It passed peacefully, still thinking until the end.',
  申诉了吗: 'Appeal status',
  还没: 'Not yet',
  申诉中: 'Appeal pending',
  被驳回: 'Rejected',
  已恢复: 'Restored',
  '我同意审核通过后公开以上内容，确认没有填写隐私信息。我知道公开后搜索引擎和 AI 服务可能抓取这些内容，撤回后本站无法删除第三方已保存的副本。':
    'I agree to make the above content public after approval and confirm it contains no private information. I understand that search engines and AI services may crawl it once public, and that withdrawing it cannot remove copies already saved by third parties.',
  提交并等待审核: 'Submit for review',
  先不立了: 'Cancel',
  '碑立好了，正在等审核': 'Memorial submitted for review',
  '下面是这块碑的凭据，用来查看审核结果、修改或撤回。只显示这一次，丢了没法找回。':
    'Use these credentials to check the review result, edit or withdraw your memorial. They are shown only once and cannot be recovered if lost.',
  复制凭据: 'Copy credentials',
  下载凭据文件: 'Download credentials',
  我已经保存好了: 'I have saved my credentials',
  也在这个浏览器里记住它: 'Also save them in this browser',
  关闭: 'Close',
};

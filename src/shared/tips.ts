import type { Vendor } from '../worker/types';

interface TipCopy {
  zh: string;
  en: string;
}

interface TipArticle {
  slug: string;
  product: Vendor;
  topic: TipCopy;
  title: TipCopy;
  summary: TipCopy;
  experience: TipCopy;
  steps: TipCopy[];
  source: string;
  sourceDate: string;
  sourceViews: number;
  followUp?: string;
  action?: { href: string; label: TipCopy };
}

export const TIP_ARTICLES: TipArticle[] = [
  {
    slug: 'claude-signup-phone',
    product: 'claude',
    topic: { zh: '注册', en: 'Sign-up' },
    title: {
      zh: '新号不到半天被停用，他先看了邮件',
      en: 'A new Claude account was suspended within half a day',
    },
    summary: {
      zh: '注册后遇到停用提示，可以先从通知邮件确认涉及哪条政策。',
      en: 'If your account is suspended soon after sign-up, check which policy the notice cites.',
    },
    experience: {
      zh: '邦法说，他新开的 Claude 账号不到 12 小时就被停用。邮件写的是支持国家和地区政策，没列出具体触发步骤。',
      en: 'Bangbuilds said his new Claude account was suspended within 12 hours. The email cited the supported countries and regions policy and did not identify a specific action.',
    },
    steps: [
      {
        zh: '注册前，先在 Claude 支持地区列表里查实际所在地区。注册页面发送短信后，填写最新收到的验证码。',
        en: 'Before signing up, check your actual location against Claude’s supported regions. Enter the newest SMS code once the sign-up page sends one.',
      },
      {
        zh: '账号刚注册就受限时，先找官方通知。需要复核时，可把通知引用的政策和注册时间填进申诉表。',
        en: 'If access is restricted soon after sign-up, find the notice. Include the policy it cites and the time you registered if you request a review.',
      },
    ],
    source: 'https://x.com/bangbuilds/status/2106592151534727552',
    sourceDate: '2026-10-04',
    sourceViews: 45502,
    action: {
      href: 'https://www.anthropic.com/legal/supported-regions',
      label: {
        zh: '查 Claude 支持地区',
        en: 'Check Claude’s supported regions',
      },
    },
  },
  {
    slug: 'claude-identity-verification',
    product: 'claude',
    topic: { zh: '身份验证', en: 'Identity verification' },
    title: {
      zh: 'Claude 升级 Max 后遇到身份验证',
      en: 'Claude asked for an identity check after a Max upgrade',
    },
    summary: {
      zh: 'KC 升级 Max 20x 后收到了身份验证提示，完成验证后继续使用。',
      en: 'KC reported completing an identity check and keeping access after upgrading to Max 20x.',
    },
    experience: {
      zh: 'KC 在 X 上写道，他升级 Max 20x 后遇到身份验证，并在同一条帖子里说自己已经通过验证，账号可以正常使用。',
      en: 'KC wrote on X that he was asked to verify his identity after upgrading to Max 20x. In the same post, he said he passed the check and was using the account normally.',
    },
    steps: [
      {
        zh: '用升级套餐时的账号登录 Claude，在账号内打开身份验证提示，先看页面接受哪些证件。',
        en: 'Sign into Claude with the account you upgraded. Open the verification prompt in your account and check which documents the page accepts.',
      },
      {
        zh: '按页面提示完成验证。回到 Claude 确认能否继续使用；如果界面仍卡在验证，记下提示和提交时间，再联系支持。',
        en: 'Complete the on-screen steps, then return to Claude and check your access. If you are still stuck, record the prompt and the submission time before contacting support.',
      },
    ],
    source: 'https://x.com/ScarletKc/status/2106347277946372343',
    sourceDate: '2026-10-03',
    sourceViews: 77768,
  },
  {
    slug: 'claude-appeal-what-to-write',
    product: 'claude',
    topic: { zh: '申诉', en: 'Appeals' },
    title: {
      zh: 'Claude 申诉材料怎么补，先把时间线对上',
      en: 'Build a timeline before updating a Claude appeal',
    },
    summary: {
      zh: '把出问题前后的记录排成时间线，便于说明当时发生了什么。',
      en: 'Put the events around the restriction in order so support can see what happened.',
    },
    experience: {
      zh: 'Alex Getman 说，Claude 账号停用后，他翻本地日志，找出最后一次请求和收到停用邮件的时间。随后把两处时间、客户端版本和通知里的参考编号补交给了申诉团队。',
      en: 'Alex Getman said he used his local logs to find the last request and the time of the suspension email. He sent those times, the client version and the notice reference numbers as an update to his appeal.',
    },
    steps: [
      {
        zh: '列三项就够用：最后在做什么、什么时候受限、页面或邮件提示了什么。找到日志的话，把对应时间和时区写清楚。',
        en: 'Write down the last thing you were doing, when access was restricted and what the notice said. Include the time zone if you have a timestamp from logs.',
      },
      {
        zh: '从账号限制页递交申诉。有现成工单时，把补充材料和参考编号放在同一条支持记录里。',
        en: 'Submit through the account restriction page. If you already have a support case, add the timeline and reference numbers there.',
      },
    ],
    source: 'https://x.com/alexgetmancom/status/2086131953607049275',
    followUp: 'https://x.com/alexgetmancom/status/2086205949929312358',
    sourceDate: '2026-08-09',
    sourceViews: 54618,
    action: {
      href: 'https://claude.ai/restricted',
      label: {
        zh: '打开 Claude 账号限制页',
        en: 'Open Claude’s account restriction page',
      },
    },
  },
  {
    slug: 'claude-organization-suspension',
    product: 'claude',
    topic: { zh: '工作区停用', en: 'Workspace suspension' },
    title: {
      zh: '团队突然用不了 Claude，先确认停的是谁',
      en: 'Check who lost access when a Claude team goes offline',
    },
    summary: {
      zh: '个人账号和团队工作区都可能出问题。从受影响的范围判断该找哪个入口。',
      en: 'A restriction can affect one member or the whole workspace. Check the scope before choosing a support route.',
    },
    experience: {
      zh: 'Belo 的 Pato Molina 在 X 上说，公司一个有 60 多个账号的组织突然失去 Claude 访问权限。后来他更新说，团队已经恢复访问。',
      en: 'Belo’s Pato Molina reported that a company organization with more than 60 accounts lost Claude access. He later posted that access had been restored.',
    },
    steps: [
      {
        zh: '确认同事是否同时遇到问题，并尝试用自己的账号查看个人区和团队区，区分个人受限与组织暂停。',
        en: 'Find out whether teammates are affected too. Check both your personal and team spaces to distinguish a personal restriction from an organization hold.',
      },
      {
        zh: '如果只有组织显示暂停，在受影响的组织旁找 Request a review。提交时附上组织名、出问题的时间和界面截图。',
        en: 'If the organization alone is on hold, look for Request a review beside it. Include the organization name, when access changed and a screenshot.',
      },
    ],
    source: 'https://x.com/patomolina/status/2045254152377323970',
    followUp: 'https://x.com/patomolina/status/2045319260713390191',
    sourceDate: '2026-04-18',
    sourceViews: 1784576,
    action: {
      href: 'https://claude.ai/restricted',
      label: {
        zh: '打开 Claude 账号限制页',
        en: 'Open Claude’s account restriction page',
      },
    },
  },
  {
    slug: 'codex-appeal-task-context',
    product: 'codex',
    topic: { zh: '申诉', en: 'Appeals' },
    title: {
      zh: 'Codex 被停用，申诉时怎么交代任务背景',
      en: 'Explain the task behind a Codex suspension appeal',
    },
    summary: {
      zh: '收到停用通知后，可以先回查任务记录，再说明当时在处理什么。',
      en: 'After a suspension notice, review your recent tasks and explain the work in context.',
    },
    experience: {
      zh: 'Michael 说，他的 OpenAI 账号被停用后，回查到一条涉及自己服务器的请求。他把这段任务背景写进申诉，随后恢复了访问。',
      en: 'Michael said he traced his recent activity to a request involving his own server. He included that context in an appeal and later regained access.',
    },
    steps: [
      {
        zh: '先记下停用通知里的原话，在最近的任务中找相关记录，写上时间、正在做的事，以及涉及的项目是怎么回事。',
        en: 'Record what the notice said. Find the relevant recent task and describe when it took place, what you were doing and how the project is connected to you.',
      },
      {
        zh: '检查时间和任务描述，再从通知邮件的入口提交。涉及项目日志时，截取说明问题的部分。',
        en: 'Confirm the timing and task description, then use the appeal link in the email. Excerpt the relevant part of any project log you include.',
      },
    ],
    source: 'https://x.com/endpointarena/status/2075245286339846145',
    sourceDate: '2026-07-09',
    sourceViews: 749441,
    action: {
      href: '/appeal',
      label: { zh: '查看 Codex 申诉入口', en: 'Find the Codex appeal route' },
    },
  },
  {
    slug: 'codex-suspension-status',
    product: 'codex',
    topic: { zh: '账号停用', en: 'Account suspension' },
    title: {
      zh: 'Codex 申诉暂时没进展，哪些信息先留下',
      en: 'What to keep when a Codex appeal has stalled',
    },
    summary: {
      zh: '保存原通知、提交时间和工单记录，后续补充信息时都有据可查。',
      en: 'Keep the original notice, submission time and case record so you can refer to them later.',
    },
    experience: {
      zh: 'Maurice Kleine 说，他在用 Codex 分析自己应用的访问日志后失去了账号访问权限。最初的申诉没有改变结果，他后来更新说账号已恢复。',
      en: 'Maurice Kleine said he lost access after using Codex to review logs for his own apps. His first appeal did not change the outcome, and he later reported that access had been restored.',
    },
    steps: [
      {
        zh: '把停用通知和申诉回执保存在本地，记下工单编号和日期。收到回复时把它放进同一份记录。',
        en: 'Save the suspension notice and appeal confirmation locally. Record the case number and dates, and keep any replies with them.',
      },
      {
        zh: '需要补充说明时，告诉支持团队你用 Codex 做什么、受限前的最后一个任务，以及遇到的具体提示。恢复后，再确认聊天记录和订阅状态。',
        en: 'If you have more context, tell Support what you were using Codex for, what the last task was and which warning you saw. When access returns, check your chats and subscription.',
      },
    ],
    source: 'https://x.com/mauricekleine/status/2114817529344397582',
    followUp: 'https://x.com/mauricekleine/status/2115323073553433024',
    sourceDate: '2026-10-27',
    sourceViews: 223340,
    action: {
      href: '/appeal',
      label: { zh: '查看 Codex 申诉入口', en: 'Find the Codex appeal route' },
    },
  },
  {
    slug: 'codex-warning-account-status',
    product: 'codex',
    topic: { zh: '账号警告', en: 'Account warning' },
    title: {
      zh: '收到 Codex 警告，先确认还能不能登录',
      en: 'Check your access after receiving a Codex warning',
    },
    summary: {
      zh: '邮件提到未来可能停用时，先看当前账号状态，再选择复核入口。',
      en: 'If a notice mentions possible deactivation, check your current account status before requesting a review.',
    },
    experience: {
      zh: 'XODUD 说，在用 Codex 检查自己的项目后收到一封活动警告。原帖描述的是警告，他随后更新说申诉被接受。',
      en: 'XODUD said they received a warning after asking Codex to review their own project. In a follow-up, they said their appeal was accepted.',
    },
    steps: [
      {
        zh: '看清通知写的是警告、暂时受限还是停用。用原账号确认网页和 Codex 是否还能正常打开。',
        en: 'Check whether the email says warning, temporary restriction or closure. Use the original account to see whether ChatGPT and Codex still open.',
      },
      {
        zh: '如果需要复核，点通知附的申诉链接，用几句话说明当时在做什么。',
        en: 'If you want a review, use the appeal link included with the notice and briefly describe what you were doing.',
      },
    ],
    source: 'https://x.com/xodud_rkd/status/2117158524686151822',
    followUp: 'https://x.com/xodud_rkd/status/2117812043353137331',
    sourceDate: '2026-11-02',
    sourceViews: 27558,
  },
  {
    slug: 'antigravity-appeal-service',
    product: 'antigravity',
    topic: { zh: '账号停用', en: 'Account suspension' },
    title: {
      zh: 'Antigravity 用不了了，如何确定是服务停用',
      en: 'Check whether Antigravity access was suspended',
    },
    summary: {
      zh: '遇到访问问题时，先在 Antigravity 客户端核对提示，再找对应的申诉入口。',
      en: 'When access fails, read the notice in the Antigravity app and choose the corresponding appeal route.',
    },
    experience: {
      zh: 'Ziwen Xu 说，他在调试一套开发流程时同时碰到 Google AI Studio 用量耗尽和 Antigravity 访问被停用。两边出现的是不同状态。',
      en: 'Ziwen Xu said he hit two issues while tuning a development workflow: Google AI Studio ran out of usage and Antigravity access was suspended.',
    },
    steps: [
      {
        zh: '用原来的 Google 账号打开 Antigravity，确认提示是用量不足、登录出错还是服务停用。把提示和时间记录下来。',
        en: 'Open Antigravity with the affected Google Account and check whether the message refers to usage, sign-in or a suspension. Save the message and time.',
      },
      {
        zh: '如果客户端明确提示停用，就用受影响的个人 Google 账号打开提示里的申诉链接，按表单填写。',
        en: 'If the app explicitly says access is suspended, follow the appeal link in the notice and fill it in using the affected personal Google Account.',
      },
    ],
    source: 'https://x.com/ziwenxu_/status/2022190968322101654',
    sourceDate: '2026-02-13',
    sourceViews: 28094,
    action: {
      href: 'https://forms.gle/hGzM9MEUv2azZsrb9',
      label: {
        zh: '打开 Antigravity 申诉表',
        en: 'Open the Antigravity appeal form',
      },
    },
  },
  {
    slug: 'antigravity-google-account-access',
    product: 'antigravity',
    topic: { zh: '账号登录', en: 'Account access' },
    title: {
      zh: 'Antigravity 停用后，怎么确认 Google 账号还能不能用',
      en: 'Check Google Account access after an Antigravity suspension',
    },
    summary: {
      zh: 'LUCIAN 一开始以为 Google 账号被封，后来发现失效的只有 Antigravity。',
      en: 'LUCIAN first thought his Google Account had been banned, then found that only Antigravity was unavailable.',
    },
    experience: {
      zh: 'LUCIAN 发帖说，使用 Antigravity CLI 时失去了访问权限。在后续回复里，他说受影响的只有 Antigravity。',
      en: 'LUCIAN posted that he lost access while using Antigravity CLI. In a follow-up reply, he said only Antigravity was affected.',
    },
    steps: [
      {
        zh: '用同一个账号打开 Google 账号页面或 Gmail，确认还能否登录。再到 Antigravity 客户端核对提示。',
        en: 'Open your Google Account page or Gmail with the same account and confirm you can sign in. Then read the notice in the Antigravity app.',
      },
      {
        zh: '如果其他服务能登录，申诉时写明受影响的服务是 Antigravity。Google 账号本身也登不进去时，先跟随登录页面的恢复提示。',
        en: 'If other services still work, name Antigravity as the affected service in your appeal. If you cannot sign into the Google Account itself, follow the recovery prompt on the sign-in page.',
      },
    ],
    source: 'https://x.com/lucianlamp/status/2122262850676924606',
    followUp: 'https://x.com/lucianlamp/status/2122451364076990638',
    sourceDate: '2026-11-16',
    sourceViews: 91358,
    action: {
      href: 'https://myaccount.google.com/',
      label: { zh: '打开 Google 账号页面', en: 'Open your Google Account' },
    },
  },
  {
    slug: 'antigravity-check-suspension-scope',
    product: 'antigravity',
    topic: { zh: '账号警告', en: 'Account warning' },
    title: {
      zh: '收到 Google 政策邮件，怎么判断是否已停用',
      en: 'Check whether a Google policy email says access was suspended',
    },
    summary: {
      zh: '先读邮件里的账号状态，再到客户端确认实际访问情况。',
      en: 'Read the account status in the email, then check whether you can still access the app.',
    },
    experience: {
      zh: 'Artem Russakovskii 收到两封 Google 政策邮件，邮件注明当时尚未限制服务。后来他更新说，邮件和使用 Antigravity 有关，复核后账号上的违规记录被撤销。',
      en: 'Artem Russakovskii received two Google policy notices saying that access had not been restricted. He later reported that they were related to Antigravity and that the account strikes had been reversed after review.',
    },
    steps: [
      {
        zh: '先找邮件里描述当前状态的那一句，再用同一 Google 账号测试 Antigravity 是否还能打开。',
        en: 'Find the sentence describing the current status. Check whether Antigravity still opens using the same Google Account.',
      },
      {
        zh: '保存通知和当时正在做的任务。若随后收到停用通知，再按新通知的入口提交复核。',
        en: 'Save the notice and the task you were working on. If you later receive a suspension notice, use the review route it provides.',
      },
    ],
    source: 'https://x.com/ArtemR/status/2114514441702420740',
    followUp: 'https://x.com/ArtemR/status/2115520088178880991',
    sourceDate: '2026-10-26',
    sourceViews: 478796,
  },
];

export function tipPageTitle(title: string, locale: 'zh' | 'en'): string {
  return locale === 'zh'
    ? `${title} · 使用小技巧 · 号没了`
    : `${title} · Tips · 号没了`;
}

export const TIP_PATHS = TIP_ARTICLES.map(({ slug }) => '/tips/' + slug);

export const TIP_TRANSLATIONS = Object.fromEntries(
  TIP_ARTICLES.flatMap(
    ({ title, summary, experience, topic, steps, action }) => [
      ...[title, summary, experience, topic, ...steps].map(({ zh, en }) => [
        zh,
        en,
      ]),
      [tipPageTitle(title.zh, 'zh'), tipPageTitle(title.en, 'en')],
      ...(action ? [[action.label.zh, action.label.en]] : []),
    ],
  ),
);

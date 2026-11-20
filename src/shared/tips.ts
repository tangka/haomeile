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
  steps: TipCopy[];
  source: string;
  sourceDate: string;
  action?: { href: string; label: TipCopy };
}

export const TIP_ARTICLES: TipArticle[] = [
  {
    slug: 'claude-signup-phone',
    product: 'claude',
    topic: { zh: '注册', en: 'Sign-up' },
    title: {
      zh: '注册 Claude 前先查地区和手机号',
      en: 'Check your region and phone number before signing up for Claude',
    },
    summary: {
      zh: '一位 X 用户的 Claude 新号很快收到地区政策通知。注册前可以先检查这两项。',
      en: 'An X user received a regional policy notice shortly after creating a Claude account. Check these two requirements before signing up.',
    },
    steps: [
      {
        zh: '先在 Anthropic 的地区列表里查实际所在地。注册时，准备支持地区的手机号码，用它接收短信验证码。',
        en: 'Check your actual location against Anthropic’s supported regions. At sign-up, use a mobile number from a supported region to receive the text verification code.',
      },
      {
        zh: '短信等了五分钟还没到，点 Try again，核对国家区号和号码后再试。收到多条验证码时，填最新的一条。',
        en: 'If the text has not arrived after five minutes, select Try again and check the country code and number. If you receive several codes, enter the newest one.',
      },
    ],
    source: 'https://x.com/bangbuilds/status/2106592151534727552',
    sourceDate: '2026-10-04',
    action: {
      href: 'https://www.anthropic.com/legal/supported-regions',
      label: {
        zh: '查 Claude 支持地区',
        en: 'Check Claude’s supported regions',
      },
    },
  },
  {
    slug: 'claude-identity-check',
    product: 'claude',
    topic: { zh: '验证', en: 'Verification' },
    title: {
      zh: 'Claude 提示身份验证，要准备什么',
      en: 'What to prepare when Claude requests identity verification',
    },
    summary: {
      zh: 'Anthropic 员工在 X 解释过针对部分账号的验证提示。遇到提示时，先准备实体证件和可拍照的设备。',
      en: 'An Anthropic employee explained a verification prompt affecting some accounts on X. If you see it, have a physical ID and a camera ready.',
    },
    steps: [
      {
        zh: '从 Claude 页面打开验证流程，按 Persona 显示的证件类型准备有效的实体政府签发带照片证件。',
        en: 'Open the verification flow in Claude and prepare a valid physical government-issued photo ID from the list Persona shows.',
      },
      {
        zh: '给手机或电脑开启相机权限，在光线充足的地方按页面提示拍照。照片模糊时可以按流程重拍。',
        en: 'Allow camera access on your phone or computer. Follow the prompts in good lighting and retake any blurry photos in the verification flow.',
      },
    ],
    source: 'https://x.com/trq212/status/2068793885535694858',
    sourceDate: '2026-06-22',
    action: {
      href: 'https://support.claude.com/en/articles/14328960-identity-verification-on-claude',
      label: {
        zh: '查看 Claude 身份验证说明',
        en: 'Claude identity verification guide',
      },
    },
  },
  {
    slug: 'claude-appeal-what-to-write',
    product: 'claude',
    topic: { zh: '申诉', en: 'Appeals' },
    title: {
      zh: 'Claude 申诉表里，怎么写账号用途',
      en: 'How to describe account use in a Claude appeal',
    },
    summary: {
      zh: 'X 上一条申诉经验提到表单会问账号用途。把常做的事、受限时间和当时的操作写清楚。',
      en: 'An appeal experience shared on X highlights the form’s question about account use. Describe your usual tasks, when access changed and what you were doing.',
    },
    steps: [
      {
        zh: '用受限的 Claude 账号打开账号限制页，进入申诉表。先记下通知时间和界面上的提示。',
        en: 'Sign in to the account restriction page with the affected Claude account. Open the appeal form and note when the notice arrived and what it said.',
      },
      {
        zh: '用一两句具体的话说平时怎么用。例如“我用 Claude 整理课程笔记。周二晚上传一份讲义后，页面提示账号受限。”把示例换成你的真实时间和用途。',
        en: 'Describe your usual use in a sentence or two. For example, “I organize course notes in Claude. On Tuesday evening, I uploaded a handout and saw the restriction notice.” Use your own dates and activity.',
      },
    ],
    source: 'https://x.com/goan999999/status/2108391098016239888',
    sourceDate: '2026-10-09',
    action: {
      href: 'https://claude.ai/restricted',
      label: {
        zh: '打开 Claude 账号限制页',
        en: 'Open Claude’s account restriction page',
      },
    },
  },
  {
    slug: 'claude-export-after-restriction',
    product: 'claude',
    topic: { zh: '导出', en: 'Data export' },
    title: {
      zh: 'Claude 受限后，先检查导出的文件',
      en: 'Check your Claude export after a restriction',
    },
    summary: {
      zh: '一位 X 用户导出了压缩包，但里面没有他需要的聊天。下载完成后，打开文件核对一下。',
      en: 'An X user downloaded an export that did not contain the chats they wanted. Open the archive and check its contents after downloading.',
    },
    steps: [
      {
        zh: '登录受限账号，在限制页查看有没有数据导出选项。有的话，发起导出并按页面提示下载。',
        en: 'Sign in to the affected account and check the restriction page for a data export option. If available, request an export and follow the download instructions.',
      },
      {
        zh: '打开压缩包确认需要的聊天是否在里面。日常可把重要产出另存到本地或项目文件夹。',
        en: 'Open the archive and look for the conversations you need. Keep useful work in local or project files as you go.',
      },
    ],
    source: 'https://x.com/ggfxckingeasy/status/2107838228124586399',
    sourceDate: '2026-10-07',
    action: {
      href: 'https://claude.ai/restricted',
      label: {
        zh: '打开 Claude 账号限制页',
        en: 'Open Claude’s account restriction page',
      },
    },
  },
  {
    slug: 'codex-personal-work-accounts',
    product: 'codex',
    topic: { zh: '切换账号', en: 'Account switching' },
    title: {
      zh: '个人号和工作号怎么切换',
      en: 'Switch between personal and work accounts',
    },
    summary: {
      zh: 'ChatGPT 的账号切换可以同时保留两个账号的登录状态，聊天、工作区和订阅各自独立。',
      en: 'The ChatGPT account switcher keeps two accounts signed in. Each account has its own chats, workspaces and subscription.',
    },
    steps: [
      {
        zh: '在 ChatGPT 网页点头像打开账号菜单，选择 Add account，再登录或创建另一个账号。',
        en: 'On ChatGPT web, open the account menu from your profile icon and select Add account. Sign in to your other account or create one.',
      },
      {
        zh: '手机端在设置里找 Switch account，再选 Add account。切换之后，先看当前头像和邮箱，再打开工作区或订阅。',
        en: 'On mobile, look for Switch account under Settings and select Add account. After switching, check the active profile and email before opening a workspace or subscribing.',
      },
    ],
    source: 'https://x.com/adamhfry/status/2120244738880401697',
    sourceDate: '2026-11-11',
    action: {
      href: 'https://chatgpt.com/',
      label: { zh: '打开 ChatGPT', en: 'Open ChatGPT' },
    },
  },
  {
    slug: 'codex-suspension-status',
    product: 'codex',
    topic: { zh: '账号停用', en: 'Account suspension' },
    title: {
      zh: 'Codex 突然掉线或停用，先查状态页',
      en: 'Check OpenAI Status if Codex access suddenly stops',
    },
    summary: {
      zh: 'OpenAI 曾在 X 公布一批误停用。突然失去访问时，先看有没有同一时间的账号访问故障。',
      en: 'OpenAI reported an incident on X that incorrectly suspended some accounts. If you suddenly lose access, check for an account incident around the same time.',
    },
    steps: [
      {
        zh: '打开 OpenAI 状态页，看账号访问相关公告，核对报错时间和受影响的服务。',
        en: 'Open OpenAI Status and compare the timing and affected services with your error.',
      },
      {
        zh: '如果账号收到停用通知，就使用通知邮件里的申诉链接。联系支持时带上报错时间和完整提示。',
        en: 'If you received a suspension notice, use the appeal link in the email. When contacting support, include the time and full error message.',
      },
    ],
    source: 'https://x.com/OpenAI/status/2062927046448431587',
    sourceDate: '2026-06-05',
    action: {
      href: 'https://status.openai.com/',
      label: { zh: '打开 OpenAI 状态页', en: 'Open OpenAI Status' },
    },
  },
  {
    slug: 'codex-device-limit',
    product: 'codex',
    topic: { zh: '设备限制', en: 'Device limits' },
    title: {
      zh: 'Codex 提示设备限制，先看完整报错',
      en: 'Read the full error when Codex hits a device limit',
    },
    summary: {
      zh: 'X 上有用户记录了付费账号的设备限制。看到 Device limit reached 时，先确认提示对应哪个账号。',
      en: 'An X user documented device limits on paid accounts. If you see Device limit reached, check which account the warning names.',
    },
    steps: [
      {
        zh: '登录时看是否出现 Device limit reached。结账时留意是否明确提示同一张卡或设备关联的订阅过多。',
        en: 'Look for Device limit reached at sign-in. At checkout, check for a message about too many subscriptions on the same card or device.',
      },
      {
        zh: '准备好报错截图、套餐和发生时间，通过 OpenAI 帮助中心申请复核。若要取消受影响的订阅，按原购买渠道处理。',
        en: 'Send the error screenshot, plan and time of the incident to OpenAI Support for review. If you want to cancel, use the original billing channel.',
      },
    ],
    source: 'https://x.com/Mr_Salio/status/2116717689456492914',
    sourceDate: '2026-11-01',
    action: {
      href: 'https://help.openai.com/en/articles/20001559',
      label: { zh: '查看设备限制说明', en: 'Read the device limit guide' },
    },
  },
  {
    slug: 'codex-save-recovery-keys',
    product: 'codex',
    topic: { zh: '账号安全', en: 'Account security' },
    title: {
      zh: '开高级账号安全前，先存恢复密钥',
      en: 'Save recovery keys before enabling Advanced Account Security',
    },
    summary: {
      zh: 'OpenAI 在 X 介绍了高级账号安全。准备开启前，先安排好备用的登录和恢复方式。',
      en: 'OpenAI announced Advanced Account Security on X. Set up a backup way to sign in and recover your account before enabling it.',
    },
    steps: [
      {
        zh: '在 ChatGPT 网页打开设置 → 安全 → Advanced Account Security，按照页面提示设置通行密钥或安全密钥。',
        en: 'In ChatGPT on the web, go to Settings → Security → Advanced Account Security. Follow the prompts to set up a passkey or security key.',
      },
      {
        zh: '把恢复密钥存到可独立访问的安全位置。开启后，邮箱验证码登录和邮件找回会关闭。',
        en: 'Save your recovery keys somewhere secure that you can access separately. The setting disables email sign-in codes and email-based recovery.',
      },
    ],
    source: 'https://x.com/OpenAI/status/2049902506881462613',
    sourceDate: '2026-05-01',
    action: {
      href: 'https://help.openai.com/en/articles/20001221-advanced-account-security',
      label: { zh: '查看恢复密钥说明', en: 'Read the recovery key guide' },
    },
  },
  {
    slug: 'antigravity-first-sign-in',
    product: 'antigravity',
    topic: { zh: '登录', en: 'Sign-in' },
    title: {
      zh: '第一次登录 Antigravity，用哪个账号',
      en: 'Which account to use for your first Antigravity sign-in',
    },
    summary: {
      zh: 'Google 在 X 发布了 Antigravity。个人用户可以用符合资格的 Google 账号登录，免费版也能开始用。',
      en: 'Google introduced Antigravity on X. If your personal Google Account is eligible, you can sign in and start on the free tier.',
    },
    steps: [
      {
        zh: '从 Antigravity 官网安装客户端，点 Continue with Google。浏览器弹出账号选择时，确认选的是你要用的个人 Google 账号。',
        en: 'Install the app from Antigravity’s site and choose Continue with Google. When the browser opens the account picker, select the personal Google Account you want to use.',
      },
      {
        zh: '登录提示不符合资格时，在官方 FAQ 查账号类型、地区和年龄要求。如果提示年龄未验证，使用同一个 Google 账号按照页面提示完成验证。',
        en: 'If sign-in says you are ineligible, check the account type, region and age requirements in the FAQ. If your age is unverified, follow the verification prompts with the same Google Account.',
      },
    ],
    source: 'https://x.com/antigravity/status/1990813606217236828',
    sourceDate: '2025-11-19',
    action: {
      href: 'https://antigravity.google/docs/faq#why-cant-i-sign-in-with-my-personal-google-account',
      label: {
        zh: '查看 Antigravity 登录要求',
        en: 'Check Antigravity sign-in requirements',
      },
    },
  },
  {
    slug: 'antigravity-appeal-service',
    product: 'antigravity',
    topic: { zh: '申诉', en: 'Appeals' },
    title: {
      zh: 'Antigravity 提示服务停用，怎么申诉',
      en: 'Appeal a suspension of Antigravity access',
    },
    summary: {
      zh: 'Google Antigravity 在 X 说明了服务受限后的恢复渠道。个人账号可以从停用提示打开申诉。',
      en: 'Google Antigravity described a recovery route for restricted access on X. Personal users can start an appeal from the suspension notice.',
    },
    steps: [
      {
        zh: '先看客户端里的停用提示，记下完整报错和发生时间。有申诉链接就从提示里打开。',
        en: 'Read the suspension notice in the app and save the full error and time. Open the appeal link in the notice if it is available.',
      },
      {
        zh: '确认浏览器登录的是受影响的个人 Google 账号。用该账号提交申诉表即可。',
        en: 'Check that the browser is signed in to the affected personal Google Account, then submit the appeal form from that account.',
      },
    ],
    source: 'https://x.com/antigravity/status/2027435365275967591',
    sourceDate: '2026-02-28',
    action: {
      href: 'https://forms.gle/hGzM9MEUv2azZsrb9',
      label: {
        zh: '打开 Antigravity 申诉表',
        en: 'Open the Antigravity appeal form',
      },
    },
  },
  {
    slug: 'antigravity-check-suspension-scope',
    product: 'antigravity',
    topic: { zh: '账号停用', en: 'Account suspension' },
    title: {
      zh: '停的是 Antigravity，还是整个 Google 账号',
      en: 'Is the suspension for Antigravity or your whole Google Account?',
    },
    summary: {
      zh: 'Antigravity 团队成员在 X 解释过停用提示里的“账号”指什么。先确认受影响的范围，再找对应入口。',
      en: 'An Antigravity team member clarified what the word “account” meant in a suspension on X. Check what you can still access before choosing an appeal route.',
    },
    steps: [
      {
        zh: '用同一 Google 账号在浏览器打开 Google 账号页。如果还能登录，但 Antigravity 提示停用，就从 Antigravity 的停用提示或官方表单申诉。',
        en: 'Open the Google Account page with the same login. If you can still sign in and Antigravity shows a suspension, appeal through Antigravity’s notice or its official form.',
      },
      {
        zh: '如果 Google 登录页明确显示整个账号被停用，按 Google 登录提示选择“发起申诉”。',
        en: 'If Google sign-in says your whole account is disabled, select Start Appeal on the Google sign-in screen.',
      },
    ],
    source: 'https://x.com/_mohansolo/status/2095529407033000260',
    sourceDate: '2026-09-03',
    action: {
      href: '/appeal',
      label: { zh: '查看两个申诉入口', en: 'See both appeal routes' },
    },
  },
];

export function tipPageTitle(title: string, locale: 'zh' | 'en'): string {
  return locale === 'zh'
    ? `${title} · 使用小技巧 · 号没了`
    : `${title} · Tips · 号没了`;
}

export const TIP_PATHS = TIP_ARTICLES.map(({ slug }) => '/tips/' + slug);

export const TIP_TRANSLATIONS = Object.fromEntries(
  TIP_ARTICLES.flatMap(({ title, summary, topic, steps, action }) => [
    ...[title, summary, topic, ...steps].map(({ zh, en }) => [zh, en]),
    [tipPageTitle(title.zh, 'zh'), tipPageTitle(title.en, 'en')],
    ...(action ? [[action.label.zh, action.label.en]] : []),
  ]),
);

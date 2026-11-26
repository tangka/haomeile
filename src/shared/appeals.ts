import type { TipVendor } from './tips';

export interface BilingualCopy {
  zh: string;
  en: string;
}

export interface AppealGuideStep {
  title: BilingualCopy;
  text: BilingualCopy;
  link?: {
    href: string | BilingualCopy;
    label: BilingualCopy;
  };
}

export interface AppealGuideFaq {
  question: BilingualCopy;
  answer: BilingualCopy;
}

export interface AppealGuideTipLink {
  slug: string;
  label: BilingualCopy;
}

export interface AppealGuide {
  vendor: TipVendor;
  name: string;
  path: `/appeal/${TipVendor}`;
  seoTitle: BilingualCopy;
  description: BilingualCopy;
  heading: BilingualCopy;
  lead: BilingualCopy;
  appealUrl: string;
  appealAction: BilingualCopy;
  helpUrl: string;
  helpLabel: BilingualCopy;
  casesHref: `/v/${TipVendor}`;
  casesLabel: BilingualCopy;
  checklistIntro: BilingualCopy;
  scenarios: {
    label: BilingualCopy;
    detail: BilingualCopy;
  }[];
  steps: AppealGuideStep[];
  draftChecklist: BilingualCopy[];
  faqs: AppealGuideFaq[];
  relatedTips: AppealGuideTipLink[];
}

export const APPEAL_GUIDES: AppealGuide[] = [
  {
    vendor: 'antigravity',
    name: 'Antigravity',
    path: '/appeal/antigravity',
    seoTitle: {
      zh: 'Antigravity 封号与 403 报错官方申诉入口、申诉表单与排查步骤 · 号没了',
      en: 'How to Submit an Antigravity Appeal: Official Form & 403 Suspension Fix · Haomeile',
    },
    description: {
      zh: 'Google Antigravity 个人账号停用、403 权限拒绝与地区限制的官方申诉表单入口、申诉前排查步骤、表单填写要点与 Starter Quota 常见问答。',
      en: 'Official Google Antigravity appeal form for account suspensions and 403 errors, step-by-step pre-appeal checks, what to include, and Starter Quota fixes.',
    },
    heading: {
      zh: 'Antigravity 官方申诉入口与 403 排查指南',
      en: 'Antigravity Official Appeal Form & 403 Suspension Guide',
    },
    lead: {
      zh: '个人 Google 账号遇到 Antigravity 服务停用或 403 权限拒绝时，先区分是账号停用、地区限制还是套餐额度未刷新，再用受影响的 Google 账号提交官方申诉表单。',
      en: 'When a personal Google Account hits an Antigravity service suspension or 403 permission error, separate an actual ban from regional availability or a Starter Quota sync issue before submitting the official appeal form.',
    },
    appealUrl: 'https://forms.gle/hGzM9MEUv2azZsrb9',
    appealAction: {
      zh: '打开 Antigravity 官方申诉表单',
      en: 'Open the Antigravity appeal form',
    },
    helpUrl: 'https://support.google.com/accounts/answer/40695',
    helpLabel: {
      zh: '查看 Google 账号停用说明',
      en: 'Read Google disabled account help',
    },
    casesHref: '/v/antigravity',
    casesLabel: {
      zh: '查看 Antigravity 停用案例',
      en: 'Browse Antigravity suspension cases',
    },
    checklistIntro: {
      zh: '先对照下面三种常见现象，确认是否需要走封号申诉表单：',
      en: 'Match your error against these three situations before filing a suspension appeal:',
    },
    scenarios: [
      {
        label: {
          zh: '服务停用 / 403 权限拒绝',
          en: 'Service suspension or 403 permission error',
        },
        detail: {
          zh: '桌面端或登录流程提示账户无权访问、服务被停用或返回 403，且 Google 账号本身仍可正常登录其他 Google 服务。',
          en: 'The client or sign-in flow reports suspended access or HTTP 403 even though your Google Account still signs in normally elsewhere.',
        },
      },
      {
        label: {
          zh: '地区不支持提示',
          en: 'Unsupported region notice',
        },
        detail: {
          zh: '先核对实际使用地与 Google 账号关联地区是否在 Antigravity 支持列表中（新加坡、日本、台湾在列，中国大陆、香港、澳门当前不在列表内）。',
          en: 'Check both your current location and Google Account region against Antigravity’s availability list (Singapore, Japan and Taiwan are listed; Mainland China, Hong Kong and Macao are currently absent).',
        },
      },
      {
        label: {
          zh: '已开通 Pro / Ultra 但仍显示 Starter Quota',
          en: 'Paid Pro or Ultra plan still showing Starter Quota',
        },
        detail: {
          zh: '这通常不是封号。先核对桌面端登录邮箱是否与 Google One 会员账号一致，并查看额度下方是否提示完成 Google 年龄验证。',
          en: 'This is usually not a suspension. Verify the desktop app email matches your Google One membership and check for an age verification prompt under the quota.',
        },
      },
    ],
    steps: [
      {
        title: {
          zh: '核对受影响的 Google 账号与地区支持',
          en: 'Confirm the affected Google Account and regional availability',
        },
        text: {
          zh: '先确认桌面端登录的是个人 Google 账号且处于 Antigravity 支持地区；若整个 Google 账号都无法登录，先按 Google 账号停用流程处理。',
          en: 'Confirm you are using a personal Google Account in an Antigravity-supported region. If your entire Google Account is disabled, follow Google’s disabled-account recovery first.',
        },
        link: {
          href: 'https://antigravity.google/docs/faq/#what-is-google-antigravitys-geographical-availability',
          label: {
            zh: '核对 Antigravity 支持地区',
            en: 'Check Antigravity availability',
          },
        },
      },
      {
        title: {
          zh: '检查第三方授权与客户端异常调用',
          en: 'Review third-party connections and client access',
        },
        text: {
          zh: '回忆近期是否把同一个账号授权给第三方中转、脚本或未认证客户端，申诉前清理不必要的第三方连接并切回官方桌面端。',
          en: 'Check whether the account was connected to third-party relays, scripts or unofficial clients, and revoke unnecessary third-party access before appealing.',
        },
      },
      {
        title: {
          zh: '用受影响的 Google 账号提交官方申诉表单',
          en: 'Submit the official appeal form with the affected Google Account',
        },
        text: {
          zh: '打开 Antigravity 官方申诉表单，使用出现 403 或停用的同一个 Google 账号登录填写，写明出事时间、报错原文与正常开发用途。',
          en: 'Open the official Antigravity appeal form while signed in to the affected Google Account. State when the 403 or suspension began, quote the exact error and describe your normal coding use.',
        },
        link: {
          href: 'https://forms.gle/hGzM9MEUv2azZsrb9',
          label: {
            zh: '进入 Antigravity 官方申诉表单',
            en: 'Go to the Antigravity appeal form',
          },
        },
      },
      {
        title: {
          zh: '只提交一次并等待邮件或登录状态更新',
          en: 'Submit once and wait for status updates',
        },
        text: {
          zh: '保存提交确认信息，避免在短时间内重复提交多份表单。等待复核期间定期检查该 Google 账号收件箱，并在桌面端退出后重新登录确认权限。',
          en: 'Keep your confirmation and avoid submitting duplicate forms. Watch the affected inbox for updates, then sign out and back in to the desktop app to test access.',
        },
      },
    ],
    draftChecklist: [
      {
        zh: '受影响的个人 Google 账号邮箱及当前订阅档位（Free、Google AI Pro 或 Ultra）。',
        en: 'The affected personal Google Account email and active tier (Free, Google AI Pro or Ultra).',
      },
      {
        zh: '首次遇到 403 或服务停用的具体日期、时间与界面完整提示语。',
        en: 'The exact date, time and error wording when the 403 or suspension first appeared.',
      },
      {
        zh: '平时使用 Antigravity 的真实工作场景（如日常编码、代码审查、个人项目调试）。',
        en: 'Your normal everyday workflow in Antigravity (for example coding, code review or debugging personal projects).',
      },
      {
        zh: '若曾使用外部插件或第三方工具并已停止，如实说明已切回官方客户端。',
        en: 'If you previously tested an external plugin or third-party tool and stopped, state plainly that you now use the official client only.',
      },
    ],
    faqs: [
      {
        question: {
          zh: 'Antigravity 申诉表单提交后多久会有结果？需要重复填吗？',
          en: 'How long does an Antigravity appeal take, and should I submit it more than once?',
        },
        answer: {
          zh: '官方表单没有公开固定处理时限，从社区公开案例看，恢复或回复从数天到数周不等。建议只提交一次并保留记录，短时间重复提交可能拉长人工排队时间。',
          en: 'Google does not publish a fixed turnaround time for Antigravity appeals; public community cases range from a few days to several weeks. Submit once and avoid duplicate entries that may slow review.',
        },
      },
      {
        question: {
          zh: 'Antigravity 返回 403 一定是永久封号吗？',
          en: 'Does an Antigravity 403 error always mean a permanent ban?',
        },
        answer: {
          zh: '不一定。403 可能对应账号服务停用、所在地区不支持或账号权限异常。先对照官方支持地区列表和 Google 账号状态，确认不是地区或登录账号错配后，再提交官方申诉表单。',
          en: 'Not always. HTTP 403 can reflect a service suspension, an unsupported region or an account permission mismatch. Check regional availability and your signed-in account before filing an appeal.',
        },
      },
      {
        question: {
          zh: '开通 Google AI Pro 或 Ultra 后 Antigravity 仍显示 Starter Quota，要走申诉吗？',
          en: 'My Google AI Pro or Ultra plan still shows Starter Quota in Antigravity—should I appeal?',
        },
        answer: {
          zh: '不需要先走封号申诉。先确认客户端登录邮箱与 Google One 会员账号一致，再查看额度页下方是否有 Google 年龄验证提示，完成验证并退出重新登录。',
          en: 'No suspension appeal is needed first. Confirm the desktop app uses the same email as your Google One membership, complete any Google age verification prompt shown under the quota, then sign out and back in.',
        },
      },
    ],
    relatedTips: [
      {
        slug: 'antigravity-paid-plan-starter-quota',
        label: {
          zh: 'Antigravity 开通 Ultra / Pro 后仍显示 Starter Quota 的排查步骤',
          en: 'Fix Antigravity paid plans still showing Starter Quota',
        },
      },
      {
        slug: 'antigravity-first-install-google-ai-pro',
        label: {
          zh: 'Antigravity 桌面端登录与 Google AI Pro 订阅核对指南',
          en: 'Antigravity desktop sign-in and Google AI Pro setup',
        },
      },
      {
        slug: 'google-ai-pro-change-credit-billing-account',
        label: {
          zh: 'Google AI Pro 每月 $10 Cloud 赠金换绑结算账号步骤',
          en: 'Claim the $10 Google AI Pro monthly Cloud credit with a new billing account',
        },
      },
    ],
  },
  {
    vendor: 'claude',
    name: 'Claude',
    path: '/appeal/claude',
    seoTitle: {
      zh: 'Claude 封号与组织停用官方申诉入口（含解封后 Max 变 Free 与退款排查） · 号没了',
      en: 'How to Appeal a Claude Ban or Org Suspension: Official Form & Billing Guide · Haomeile',
    },
    description: {
      zh: 'Claude 与 Claude Code 账号停用、组织暂停（Portal KYC 后停用）的官方申诉入口、填写步骤，以及解封后 Max 仍显示 Free 与 Apple/Google Play 退款排查指南。',
      en: 'Official Claude and Claude Code appeal link for account bans and organization suspensions, step-by-step review checklist, plus Max-shows-Free and Apple/Google Play refund recovery.',
    },
    heading: {
      zh: 'Claude 封号与组织停用官方申诉指南',
      en: 'Claude Account Ban & Organization Suspension Appeal Guide',
    },
    lead: {
      zh: 'Claude 账号受限、Claude Code 无法登录或组织在验证后被停用时，登录受影响账号通过官方限制页提交申诉；若解封后付费套餐未恢复，再凭收据联系官方支持核对。',
      en: 'If your Claude account, Claude Code access or organization is suspended, sign in with the affected account and appeal through Anthropic’s official restriction page, then reconcile any missing Pro or Max billing separately.',
    },
    appealUrl: 'https://claude.ai/restricted',
    appealAction: {
      zh: '打开 Claude 官方账号申诉页',
      en: 'Open the Claude appeal page',
    },
    helpUrl:
      'https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals',
    helpLabel: {
      zh: '阅读 Anthropic 官方申诉说明',
      en: 'Read Anthropic’s appeal instructions',
    },
    casesHref: '/v/claude',
    casesLabel: {
      zh: '查看 Claude 停用案例',
      en: 'Browse Claude suspension cases',
    },
    checklistIntro: {
      zh: 'Claude 的受限页面通常分三种情况，入口和处理方式不同：',
      en: 'Claude restrictions generally fall into three distinct states with different next steps:',
    },
    scenarios: [
      {
        label: {
          zh: '账号停用（Account disabled）',
          en: 'Account disabled',
        },
        detail: {
          zh: '登录后直接跳转到受限页面或收到停用邮件，需使用原受限账号打开 claude.ai/restricted 提交复核。',
          en: 'Signing in redirects to a restriction screen or you received a disablement email; submit a review at claude.ai/restricted using the affected account.',
        },
      },
      {
        label: {
          zh: '组织停用（Organization suspended / Request a review）',
          en: 'Organization suspended (Request a review)',
        },
        detail: {
          zh: '常见于完成 Portal 身份验证后回到组织列表看到停用状态。直接点击该组织旁的「Request a review」按提示填写用途与补充说明。',
          en: 'Often appears in the organization list right after Portal verification. Click “Request a review” beside the suspended organization and describe your real usage.',
        },
      },
      {
        label: {
          zh: '仅弹出身份验证，或解封后 Max / Pro 仍显示 Free',
          en: 'Identity prompt only, or paid plan still showing Free after reinstatement',
        },
        detail: {
          zh: '仅弹身份验证时先核对支持地区与有效证件；解封后套餐显示 Free 时，整理 Google Play、Apple 或网页收据，从 Claude 网页左下角「获取帮助」联系客服核对订单。',
          en: 'For an ID prompt, check supported regions and valid photo ID requirements. If a restored account shows Free, gather your Google Play, Apple or web receipt and contact support from Get help in Claude on the web.',
        },
      },
    ],
    steps: [
      {
        title: {
          zh: '先区分账号停用、组织停用与身份验证',
          en: 'Identify whether you have an account ban, org hold or ID prompt',
        },
        text: {
          zh: '登录原 Claude 账号查看完整提示。若仅要求身份验证，先核对实际所在地是否在 Claude 支持地区列表内，并按官方证件指引操作。',
          en: 'Sign in to the original Claude account and read the exact notice. If it only asks for identity verification, verify regional availability and follow Anthropic’s ID requirements.',
        },
        link: {
          href: 'https://www.anthropic.com/legal/supported-regions',
          label: {
            zh: '核对 Claude 支持地区',
            en: 'Check Claude supported regions',
          },
        },
      },
      {
        title: {
          zh: '通过官方受限页或组织旁的复核入口提交申诉',
          en: 'Submit your review at claude.ai/restricted or beside the suspended org',
        },
        text: {
          zh: '使用受限的同一个 Claude 账号进入 claude.ai/restricted（或组织列表的「Request a review」），具体写出平时如何使用 Claude 与出事前的操作。',
          en: 'Sign in with the restricted Claude account at claude.ai/restricted (or select “Request a review” next to the org) and describe concrete tasks you perform with Claude.',
        },
        link: {
          href: 'https://claude.ai/restricted',
          label: {
            zh: '进入 Claude 账号申诉页',
            en: 'Go to claude.ai/restricted',
          },
        },
      },
      {
        title: {
          zh: '保留受理邮件并核对恢复后的订阅状态',
          en: 'Keep the acknowledgment email and verify your plan once restored',
        },
        text: {
          zh: '收到受理邮件后避免重复开新单；恢复登录后先进入设置查看当前是 Pro、Max 还是 Free，再核对原支付渠道的订阅状态。',
          en: 'Keep the acknowledgment email without opening duplicate tickets. Once reinstated, check Settings to confirm whether Pro or Max is active alongside your billing provider.',
        },
      },
      {
        title: {
          zh: '如解封后仍显示 Free 或需退款，凭官方收据联系支持',
          en: 'Reconcile missing Pro/Max access or request a refund with receipts',
        },
        text: {
          zh: 'Google Play 或网页扣款用户可从已登录的 Claude 网页左下角「获取帮助」提交订单号核对权益；Apple 内购未到账或已扣款无法恢复时，同时保留收据在 Apple「报告问题」核对退款进度。',
          en: 'For Google Play or web billing, contact support via Get help in Claude on the web with your order receipt. For unactivated Apple in-app purchases, keep the receipt and track refund requests through Apple’s Report a Problem.',
        },
        link: {
          href: 'https://support.claude.com/en/articles/9015913-how-to-get-support',
          label: {
            zh: '查看 Claude 官方客服入口',
            en: 'See how to contact Claude support',
          },
        },
      },
    ],
    draftChecklist: [
      {
        zh: '受限账号的注册邮箱与停用前使用的套餐（Free、Pro 或 Max）。',
        en: 'The email address of the restricted account and your plan before suspension (Free, Pro or Max).',
      },
      {
        zh: '一两件具体的真实使用场景（例如排查前端代码、阅读技术文档、写作润色），避免空泛套话。',
        en: 'One or two concrete examples of your real usage (such as debugging code, reading docs or drafting work) instead of generic filler.',
      },
      {
        zh: '若在完成身份验证后触发组织停用，写清验证时间与看到的停用提示原文。',
        en: 'If the suspension happened right after ID verification, note when you verified and quote the exact hold message.',
      },
      {
        zh: '如有能佐证正常开发者或创作者身份的公开主页（如 GitHub、个人博客），可酌情附上链接。',
        en: 'Optional links to relevant public developer or creator work (such as GitHub or a personal site) if it clarifies your usage.',
      },
    ],
    faqs: [
      {
        question: {
          zh: 'Claude 账号被误封后，申诉有机会恢复吗？一般等多久？',
          en: 'Can a wrongly suspended Claude account be reinstated, and how long does it take?',
        },
        answer: {
          zh: '本站公开案例中有多项申诉成功的记录：有的在提交组织复核后数小时内收到恢复邮件，也有误判停用在次日恢复。请如实填写具体用途并耐心等待同一条受理记录的回复。',
          en: 'Public cases on Haomeile include successful reinstatements ranging from a few hours after an organization review to the next day for mistaken suspensions. Give specific usage details and wait on one review ticket.',
        },
      },
      {
        question: {
          zh: 'Claude 封号或解封后，Google Play 或 Apple 扣的 Pro / Max 怎么处理？',
          en: 'What happens to Google Play or Apple billing for Claude Pro or Max after a ban or reinstatement?',
        },
        answer: {
          zh: '如果账号已解封但仍显示 Free，先在 Google Play 订单记录或 Apple 收据里找到对应账单，再从 Claude 网页左下角「获取帮助」请官方客服核对订单与账号权益。若订阅未生效且需要退款，Google Play 订单通过官方订单页查看退款说明，Apple 内购通过 reportaproblem.apple.com 申请与复核。',
          en: 'If your reinstated account shows Free, locate the receipt in Google Play order history or Apple receipts and ask Claude support via Get help on the web to match the order. If you need a refund for an inactive subscription, use Google Play’s order help or Apple’s reportaproblem.apple.com.',
        },
      },
      {
        question: {
          zh: '完成 Claude Portal 证件认证后反而显示组织停用怎么办？',
          en: 'Why was my Claude organization suspended right after Portal ID verification?',
        },
        answer: {
          zh: '不要急着注册新号。先用原账号查看组织列表，点击停用组织旁的「Request a review」，写明验证后出现停用提示及平时的具体用途，提交后保存受理邮件等待人工复核。',
          en: 'Avoid creating a new account right away. Open the organization list on your original account, click “Request a review” beside the suspended organization, explain that it happened after verification along with your real usage, and keep the acknowledgment email.',
        },
      },
    ],
    relatedTips: [
      {
        slug: 'claude-portal-suspension-review',
        label: {
          zh: 'Claude Portal 认证后组织停用与申诉复核实录',
          en: 'Claude organization suspended after Portal verification: review walkthrough',
        },
      },
      {
        slug: 'claude-max-google-play-recovery',
        label: {
          zh: 'Claude 解封后 Max 仍显示 Free？Google Play 订单恢复步骤',
          en: 'Claude Max still shows Free after appeal: Google Play recovery',
        },
      },
      {
        slug: 'claude-pro-apple-receipt-refund',
        label: {
          zh: '付了钱 Pro 仍是 Free：Claude 与 Apple 收据对账及退款复核',
          en: 'Paid for Claude Pro but still Free: Apple receipt check and refund review',
        },
      },
      {
        slug: 'claude-sign-up-identity-verification',
        label: {
          zh: 'Claude 注册或结账弹出身份验证时的核对步骤',
          en: 'Claude identity verification at sign-up or checkout: what to check',
        },
      },
    ],
  },
  {
    vendor: 'codex',
    name: 'Codex',
    path: '/appeal/codex',
    seoTitle: {
      zh: 'Codex / ChatGPT 账号停用官方申诉入口、表单与 401 报错排查 · 号没了',
      en: 'How to Appeal a Codex or ChatGPT Account Deactivation: Official Form & 401 Fix · Haomeile',
    },
    description: {
      zh: 'OpenAI Codex 与关联 ChatGPT 账号停用的官方申诉顺序（邮件链接优先、永久停用申诉表单、帮助中心）与客户端 401 报错排查步骤。',
      en: 'Official OpenAI Codex and ChatGPT appeal workflow (email link first, official appeal form for permanent closures, Help Center) plus client 401 troubleshooting.',
    },
    heading: {
      zh: 'Codex / OpenAI 账号停用官方申诉指南',
      en: 'Codex & OpenAI Account Deactivation Appeal Guide',
    },
    lead: {
      zh: 'Codex 或关联的 ChatGPT 账号被停用时，优先使用 OpenAI 通知邮件里的专属申诉链接；若账号永久停用且无法查看通知，再使用 OpenAI 官方申诉表单。',
      en: 'When a Codex or linked ChatGPT account is deactivated, start with the appeal link in OpenAI’s notification email; if the account is permanently closed and you cannot access the notice, use OpenAI’s official appeal form.',
    },
    appealUrl: 'https://openai.com/form/appeal/',
    appealAction: {
      zh: '打开 OpenAI 官方申诉表单',
      en: 'Open the OpenAI appeal form',
    },
    helpUrl: 'https://help.openai.com/',
    helpLabel: {
      zh: '访问 OpenAI 帮助中心',
      en: 'Visit the OpenAI Help Center',
    },
    casesHref: '/v/codex',
    casesLabel: {
      zh: '查看 Codex 停用案例',
      en: 'Browse Codex suspension cases',
    },
    checklistIntro: {
      zh: '提交表单前，先按下面三种情况确认你的账号实际状态：',
      en: 'Check which of these three states matches your account before submitting a form:',
    },
    scenarios: [
      {
        label: {
          zh: '收到 OpenAI 停用或封禁通知邮件',
          en: 'You received an OpenAI deactivation email',
        },
        detail: {
          zh: '优先直接点击通知邮件里提供的申诉链接，它通常会直接关联你的处置记录，处理链路比通用表单更直接。',
          en: 'Start with the appeal link inside the email notice—it ties directly to your enforcement record and is preferred over the general form.',
        },
      },
      {
        label: {
          zh: '账号永久停用且无法查看邮件通知',
          en: 'Account permanently closed without email notice access',
        },
        detail: {
          zh: '使用 OpenAI 官方申诉表单（openai.com/form/appeal/），填写注册邮箱与使用说明；若从未收到任何通知，也可通过 OpenAI 帮助中心联系支持。',
          en: 'Use OpenAI’s official appeal form (openai.com/form/appeal/) with your account email and usage details, or reach out via the OpenAI Help Center if you received no notice.',
        },
      },
      {
        label: {
          zh: 'Codex 客户端出现 401 报错',
          en: 'HTTP 401 error in the Codex client',
        },
        detail: {
          zh: '401 不一定等于永久封号。先打开网页端 chatgpt.com 核对账号是否仍可登录、套餐是否有效，并检查本地登录凭据或刷新令牌。',
          en: 'A 401 response does not automatically mean a permanent ban. Check whether your account still signs in at chatgpt.com, confirm your subscription and refresh local credentials first.',
        },
      },
    ],
    steps: [
      {
        title: {
          zh: '检索注册邮箱里的 OpenAI 官方通知',
          en: 'Search your registered inbox for an OpenAI notice',
        },
        text: {
          zh: '在注册邮箱（含垃圾邮件与归档文件夹）搜索 OpenAI 发出的停用或政策通知。如果邮件内带有申诉链接，优先从邮件链接提交。',
          en: 'Check your inbox, spam and archive folders for an OpenAI enforcement email. If it contains a direct appeal link, use that link first.',
        },
      },
      {
        title: {
          zh: '核对网页端账号状态与客户端 401 区别',
          en: 'Check web login status to rule out a client-only 401 error',
        },
        text: {
          zh: '如果只是在 Codex CLI 或桌面端遇到 401，先在浏览器登录 chatgpt.com 检查账号和订阅是否正常，尝试退出客户端重新授权登录。',
          en: 'If only the Codex CLI or desktop app returns 401, sign in at chatgpt.com in a browser to check account and plan status, then sign out and re-authenticate the client.',
        },
      },
      {
        title: {
          zh: '无法通过邮件申诉时提交 OpenAI 官方申诉表单',
          en: 'Submit the OpenAI appeal form if you cannot use the email link',
        },
        text: {
          zh: '打开 openai.com/form/appeal/，填入受停用账号的注册邮箱，简明写清平时用 Codex / ChatGPT 处理的开发工作以及触发前看到的提示。',
          en: 'Open openai.com/form/appeal/, enter the affected account email and explain your regular Codex/ChatGPT development work along with the notice you received.',
        },
        link: {
          href: 'https://openai.com/form/appeal/',
          label: {
            zh: '进入 OpenAI 官方申诉表单',
            en: 'Go to the OpenAI appeal form',
          },
        },
      },
      {
        title: {
          zh: '未收到任何通知或需核对扣费时联系帮助中心',
          en: 'Contact the OpenAI Help Center for missing notices or billing',
        },
        text: {
          zh: '如果没有收到停用邮件，或账号恢复后需要核对 Plus / Pro 订阅到账与扣费记录，前往 OpenAI 帮助中心提交工单并附上支付渠道收据。',
          en: 'If you received no notice or need help with Plus/Pro billing after reinstatement, open a ticket in the OpenAI Help Center with your payment receipt.',
        },
        link: {
          href: 'https://help.openai.com/',
          label: {
            zh: '打开 OpenAI 帮助中心',
            en: 'Open the OpenAI Help Center',
          },
        },
      },
    ],
    draftChecklist: [
      {
        zh: '受影响的 OpenAI / ChatGPT 注册邮箱及当前套餐（Free、Go、Plus 或 Pro）。',
        en: 'The affected OpenAI/ChatGPT email address and current tier (Free, Go, Plus or Pro).',
      },
      {
        zh: '收到停用通知或首次无法登录的日期、时间，以及界面或邮件原文。',
        en: 'The date, time and exact text of the deactivation notice or login error.',
      },
      {
        zh: '平时使用 Codex 或 ChatGPT 的具体用途（如个人代码仓库开发、测试脚本编写、文档整理）。',
        en: 'Concrete description of your normal Codex or ChatGPT use (such as personal repository coding, tests or documentation).',
      },
      {
        zh: '确认单次提交并保存回执，避免在等待审核期间反复创建工单。',
        en: 'Submit once and retain your confirmation instead of opening repeated tickets while waiting.',
      },
    ],
    faqs: [
      {
        question: {
          zh: 'Codex 出现 401 报错是账号被封了吗？',
          en: 'Does a 401 error in Codex mean my account is banned?',
        },
        answer: {
          zh: '不一定。社区案例中存在客户端 401 与账号实际停用状态不一致的情况。建议先在浏览器检查 chatgpt.com 登录与订阅状态，再在 Codex 客户端重新登录授权；只有确认账号已被停用时再走申诉流程。',
          en: 'Not necessarily. Community reports show client 401 responses do not always match an actual account ban. Verify web access at chatgpt.com and re-authenticate Codex before assuming a suspension.',
        },
      },
      {
        question: {
          zh: 'OpenAI 申诉应该先点邮件链接还是直接填 openai.com/form/appeal/？',
          en: 'Should I use the link in OpenAI’s email or go straight to openai.com/form/appeal/?',
        },
        answer: {
          zh: '优先使用 OpenAI 通知邮件内的申诉链接。只有在账号永久停用且无法查看邮件通知时，再使用官方申诉表单；若完全没收到通知，可通过 OpenAI 帮助中心联系支持。',
          en: 'Use the appeal link in OpenAI’s notification email first. Use openai.com/form/appeal/ when the account is permanently deactivated and you cannot access the notice, or contact the Help Center if you received no notice.',
        },
      },
      {
        question: {
          zh: 'iPhone 或安卓付费后 Codex 仍显示免费额度怎么办？',
          en: 'What if I paid on iPhone or Android but Codex still shows free access?',
        },
        answer: {
          zh: '先核对支付时登录的 ChatGPT 账号邮箱与 Codex 桌面端登录的是否为同一账号，并在 App 内检查套餐状态或使用「恢复购买」。',
          en: 'Confirm the ChatGPT account billed in the app matches the account signed into Codex on desktop, check your active plan in Settings and try Restore Purchases if needed.',
        },
      },
    ],
    relatedTips: [
      {
        slug: 'chatgpt-plus-iphone-subscription',
        label: {
          zh: 'iPhone 订阅 ChatGPT Plus 与 Codex 账号到账核对指南',
          en: 'Subscribe to ChatGPT Plus on iPhone and verify Codex access',
        },
      },
      {
        slug: 'android-subscriptions-google-play',
        label: {
          zh: '安卓端通过 Google Play 官方订阅 ChatGPT / Claude 核对步骤',
          en: 'Official Google Play subscriptions for ChatGPT and Claude on Android',
        },
      },
    ],
  },
];

export const APPEAL_GUIDE_PATHS = APPEAL_GUIDES.map(({ path }) => path);

export const APPEAL_GUIDE_TRANSLATIONS: Record<string, string> =
  Object.fromEntries(
    APPEAL_GUIDES.flatMap((guide) => [
      [guide.seoTitle.zh, guide.seoTitle.en],
      [guide.description.zh, guide.description.en],
      [guide.heading.zh, guide.heading.en],
      [guide.lead.zh, guide.lead.en],
      [guide.appealAction.zh, guide.appealAction.en],
      [guide.helpLabel.zh, guide.helpLabel.en],
      [guide.casesLabel.zh, guide.casesLabel.en],
      [guide.checklistIntro.zh, guide.checklistIntro.en],
      ...guide.scenarios.flatMap((item) => [
        [item.label.zh, item.label.en],
        [item.detail.zh, item.detail.en],
      ]),
      ...guide.steps.flatMap((step) => [
        [step.title.zh, step.title.en],
        [step.text.zh, step.text.en],
        ...(step.link ? [[step.link.label.zh, step.link.label.en]] : []),
      ]),
      ...guide.draftChecklist.map((item) => [item.zh, item.en]),
      ...guide.faqs.flatMap((faq) => [
        [faq.question.zh, faq.question.en],
        [faq.answer.zh, faq.answer.en],
      ]),
      ...guide.relatedTips.map((tip) => [tip.label.zh, tip.label.en]),
    ]),
  );

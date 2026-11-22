interface TipCopy {
  zh: string;
  en: string;
}

interface TipArticle {
  slug: string;
  title: string;
  englishTitle: string;
  summary: TipCopy;
  experience: TipCopy;
  steps: { text: TipCopy; link?: { href: string; label: TipCopy } }[];
  source: `https://x.com/i/article/${string}`;
  sourceAuthor: string;
  sourcePublishedAt: string;
  sourceViews: number;
}

export const TIP_ARTICLES: TipArticle[] = [
  {
    slug: 'antigravity-paid-plan-starter-quota',
    title:
      '3 万字超干货 Antigravity 群峰× AI 精品短剧：280元打通双顶配模型池与 96G 云显卡，跑通电影级双语成片',
    englishTitle:
      'A hands-on Antigravity guide: from Google AI Ultra setup to a bilingual short film',
    summary: {
      zh: '看原文第二章 (g) 的问题 2。Google One 已显示 Ultra，Antigravity 还显示 Starter Quota 时，先核对登录账号和额度页的提示。',
      en: 'See issue 2 in section 2(g). If Google One shows Ultra and Antigravity still shows Starter Quota, check the signed-in account and the message beneath the quota.',
    },
    experience: {
      zh: '若宇开通 Ultra 5x 后，Google One 已显示订阅生效，Antigravity 里却还是 Starter Quota。客户端提示需要验证年龄。作者完成账号验证，再退出客户端重新登录，才看到付费额度。',
      en: 'Google One showed an active Ultra 5x subscription after Ruoyu subscribed, but Antigravity still showed Starter Quota. The client asked for age verification. The paid quota appeared after the author verified the account and signed back in.',
    },
    steps: [
      {
        text: {
          zh: '在 Google One 确认订阅档位和会员账号。打开 Antigravity 的「Settings → Account」，核对客户端邮箱是否和会员账号一致，同时查看当前额度档位。',
          en: 'Check your plan and subscription email in Google One. In Antigravity, open Settings → Account and compare both the signed-in email and the quota tier.',
        },
        link: {
          href: 'https://one.google.com/',
          label: { zh: '打开 Google One', en: 'Open Google One' },
        },
      },
      {
        text: {
          zh: '如果免费额度下方明确提示验证年龄，用同一个 Google 账号打开官方验证页，选页面提供的验证方式，按提示提交。',
          en: 'If the message beneath Starter Quota explicitly asks for age verification, open Google’s verification page with the same account and follow one of the options offered there.',
        },
        link: {
          href: 'https://myaccount.google.com/age-verification',
          label: {
            zh: '打开 Google 年龄验证',
            en: 'Open Google age verification',
          },
        },
      },
      {
        text: {
          zh: '完成后在 Antigravity 退出账号，用已开通订阅的账号重新登录。回到「Settings → Account」查看套餐及额度有没有更新。',
          en: 'Sign out of Antigravity after verification, then sign back in with the subscribed account. Return to Settings → Account and check whether the tier and quota have updated.',
        },
      },
    ],
    source: 'https://x.com/i/article/2123346009258602496',
    sourceAuthor: '@ElowenY20119',
    sourcePublishedAt: '2026-11-19T12:10:16Z',
    sourceViews: 27336,
  },
  {
    slug: 'google-ai-claim-cloud-credits',
    title:
      '万字干货｜Gemini 4 + Antigravity，从 0 到 1 跑通全自动出片（附 Agent 指令）',
    englishTitle:
      'Gemini 4 and Antigravity: a full walkthrough for automated video production',
    summary: {
      zh: '看原文第三节。开通 Google AI Pro 或 Ultra 后，到 AI Studio 领取赠金，再到 Cloud Billing 核对到账。',
      en: 'Section three shows how to claim the credit in AI Studio after subscribing to Google AI Pro or Ultra, then verify it in Cloud Billing.',
    },
    experience: {
      zh: 'Leaf Yeah! 用自己的 Pro 账号领了 Google Cloud 赠金。他在账单里查到赠金已生效，之后用它抵扣了 Gemini API 的调用费用。原文也记录了他用预付费账单账户时遇到的余额提示。',
      en: 'Leaf Yeah! claimed Google Cloud credits with his own Pro account. He verified them in Billing and used them against Gemini API charges. He also documented the balance notice he saw on his prepaid billing account.',
    },
    steps: [
      {
        text: {
          zh: '先在 Google One 核对当前套餐和登录邮箱。打开 AI Studio，用同一个账号登录，在左下角找 API 赠金入口。也可以从 Google Developer Program 的福利页查看领取资格。',
          en: 'Check the active plan and email in Google One. Open AI Studio with the same account and look for the API credit entry in the lower left. You can also check eligibility on the Google Developer Program benefits page.',
        },
        link: {
          href: 'https://aistudio.google.com/',
          label: { zh: '打开 AI Studio', en: 'Open AI Studio' },
        },
      },
      {
        text: {
          zh: '在领取窗口选你实际用来给项目付费的 Cloud Billing 账户，再点「兑换并继续」。如果手上有个人和公司两个结算账户，先核对项目绑定的是哪一个。',
          en: 'Choose the Cloud Billing account that pays for your project, then select Redeem and Continue. If you have both a personal and a work billing account, first check which one is linked to the project.',
        },
        link: {
          href: 'https://developers.google.com/profile/help/benefits',
          label: {
            zh: '查看赠金与自动到账设置',
            en: 'Check credit and automatic application settings',
          },
        },
      },
      {
        text: {
          zh: '打开 Google Cloud 的「结算 → 赠金」，选同一个结算账户，再找 Google Developer Program 的赠金条目，查看状态、金额和到期日。作者的预付费账户当时还提示余额要大于零，他在自己的结算账户充值后才恢复调用。遇到同样提示时，先核对自己的结算模式。',
          en: 'In Google Cloud, open Billing → Credits for the same billing account and check the Google Developer Program credit status, amount and expiration. The author’s prepaid account required a positive balance before API calls resumed. If you see that notice, check your own billing mode.',
        },
        link: {
          href: 'https://console.cloud.google.com/billing',
          label: { zh: '打开 Cloud Billing', en: 'Open Cloud Billing' },
        },
      },
    ],
    source: 'https://x.com/i/article/2122671457008500736',
    sourceAuthor: '@leaf_sanren',
    sourcePublishedAt: '2026-11-17T12:48:35Z',
    sourceViews: 334881,
  },
  {
    slug: 'claude-sign-up-identity-verification',
    title: '封了20多个号换来的全网Claude防封分流保姆级教程全网整合版',
    englishTitle:
      'What I learned about Claude sign-up and network setup after more than 20 suspensions',
    summary: {
      zh: '看原文注册和付款部分。开 Pro 时弹出身份验证，先确认现在是在验证、付款，还是核对订阅。',
      en: 'See the sign-up and payment sections. If a verification prompt appears while buying Pro, identify whether you are at identity verification, checkout or subscription confirmation.',
    },
    experience: {
      zh: '起风了记录了自己遇到两次身份验证的经过。第一个账号走到订阅时弹窗，第二个刚注册就看到了提示。他没继续这两次验证。以下步骤结合他的场景和 Claude 当前的验证、账单入口整理。',
      en: 'Qifeng documented two identity prompts. One appeared during subscription checkout and another immediately after sign-up. He did not complete those checks. The steps below pair his scenario with Claude’s current verification and billing instructions.',
    },
    steps: [
      {
        text: {
          zh: '在实际所在地符合 Claude 地区要求时，打开原来的 Claude 账号，确认登录邮箱和屏幕上的提示。提示要求验证身份时，从 Claude 账号内进入身份验证流程。',
          en: 'If Claude supports your actual location, open your existing account and check the signed-in email and the exact prompt. If it asks for identity verification, start that flow from inside your Claude account.',
        },
        link: {
          href: 'https://www.anthropic.com/legal/supported-regions',
          label: { zh: '查 Claude 支持地区', en: 'Check Claude availability' },
        },
      },
      {
        text: {
          zh: '按验证页面显示的签发国家和证件类型，选自己持有的有效带照片实体证件。准备一部可拍照的手机，按页面提示拍摄证件和完成需要的自拍。提示图片模糊时，在光线好的地方重拍。',
          en: 'Use an original, valid photo ID in one of the issuing countries and document types offered on the screen. Keep a phone with a camera ready and follow the prompts for document photos and any required live selfie. Retake blurry photos in good light.',
        },
        link: {
          href: 'https://support.claude.com/en/articles/14328960-identity-verification-on-claude',
          label: {
            zh: '查证件要求和验证失败处理',
            en: 'Check document requirements and verification help',
          },
        },
      },
      {
        text: {
          zh: '回原账号看订阅状态。网页付款去「设置 → 账单」查方案和发票，App 内购回 Apple 或 Google Play 查订单。先确认有没有成交，再决定是否重新结账。',
          en: 'Return to the original account to check the subscription. For a web purchase, check the plan and invoice in Settings → Billing. For in-app purchases, check the Apple or Google Play order. Confirm the first payment status before starting another checkout.',
        },
        link: {
          href: 'https://support.claude.com/en/articles/8325618-paid-plan-billing-faqs',
          label: {
            zh: '查付款和到账记录',
            en: 'Check billing and subscription status',
          },
        },
      },
    ],
    source: 'https://x.com/i/article/2122282102905307136',
    sourceAuthor: '@qifenglelelelel',
    sourcePublishedAt: '2026-11-16T11:06:00Z',
    sourceViews: 95444,
  },
  {
    slug: 'google-ai-ultra-plan-evaluation',
    title: '为什么不建议大家去开通 Google AI Ultra',
    englishTitle:
      'Why I don’t recommend subscribing to Google AI Ultra for everyone',
    summary: {
      zh: '下单前看目标模型、当前用量和账单。适合正在比较 Google AI Pro 和 Ultra 的 Antigravity 用户。',
      en: 'Compare the models, your current usage and the checkout price before paying. This is for Antigravity users deciding between Google AI Pro and Ultra.',
    },
    experience: {
      zh: '刘老板说自己订阅了 Ultra 5X，在 Antigravity 上用 Carbon 跑过编码任务。这篇是对一篇 Linux.do 文章的复测补充，重点是他在多 Agent 和重构任务中感受到的用量消耗，以及云盘、Colab 等权益对购买决策的影响。',
      en: 'Leo says he subscribed to Ultra 5X and ran coding tasks with Carbon in Antigravity. His article revisits a Linux.do post with his own tests, focusing on consumption during parallel and refactoring work and the value of benefits such as storage and Colab.',
    },
    steps: [
      {
        text: {
          zh: '先打开 Antigravity，找到你想用的那个模型，再对照模型表里你当前套餐的那一列。特别核对 Pro 试用与正式付费 Pro 的差别。',
          en: 'Open Antigravity and identify the model you want. Compare it with the model table for your current plan, paying attention to the distinction between a Pro trial and paid Pro.',
        },
        link: {
          href: 'https://antigravity.google/docs/models',
          label: {
            zh: '查各套餐可用模型',
            en: 'Compare model availability by plan',
          },
        },
      },
      {
        text: {
          zh: '在现有套餐用实际项目跑一轮典型任务，记录开始和结束时用量页显示的数值。还想用 Colab、Drive 或 Flow 的话，分开列出自己会用到的权益，再一起算月预算。',
          en: 'Run a typical task on your current plan and record the usage displayed before and after. If you also want Colab, Drive or Flow, list the specific benefits you would use and include them in your monthly budget.',
        },
        link: {
          href: 'https://antigravity.google/docs/plans',
          label: {
            zh: '看用量和套餐规则',
            en: 'Review Antigravity plans and quotas',
          },
        },
      },
      {
        text: {
          zh: '登录准备付费的同一个 Google 账号打开 Google One，确认地区、方案名称、本次价格和续费金额。决定升级后，再从当前订阅的渠道付款。',
          en: 'Open Google One in the Google Account you plan to pay with. Verify the region, plan name, amount due and renewal amount. If you decide to upgrade, pay through the channel managing your current subscription.',
        },
        link: {
          href: 'https://one.google.com/about/google-ai-plans/',
          label: {
            zh: '查看自己账号的报价',
            en: 'See plan pricing for your account',
          },
        },
      },
    ],
    source: 'https://x.com/i/article/2121983690859520000',
    sourceAuthor: '@leo_xiaolei',
    sourcePublishedAt: '2026-11-15T15:10:34Z',
    sourceViews: 60998,
  },
  {
    slug: 'apple-in-app-purchase-review',
    title:
      '外区苹果内购被风控怎么破？8 步挖出隐藏真人客服：实测拿下土区 Google AI Ultra，通杀一切订阅拦截',
    englishTitle:
      'How one Google AI Ultra subscriber resolved an App Store purchase block',
    summary: {
      zh: 'Apple 内购提示「Purchase Not Completed」并要求提交审核时，先从弹窗提交请求。原文有作者找到 Apple 人工支持的逐屏截图。',
      en: 'If an Apple in-app purchase says “Purchase Not Completed” and asks you to request a review, start with that prompt. The original article shows the screens the author used to reach Apple Support.',
    },
    experience: {
      zh: '码农暖爸在 iPhone 上订阅 Google AI Ultra 时，Apple 要求审核购买。他提交审核，又到 Apple 支持网站找到人工客服。作者说自己第三天收到通知，重试后开通了订阅。',
      en: 'Apple requested a purchase review when Delroy tried to subscribe to Google AI Ultra on iPhone. He sent the request and reached a support advisor through Apple’s website. He says Apple notified him on the third day and the purchase worked when he retried.',
    },
    steps: [
      {
        text: {
          zh: '先保存购买提示和出现时间。如果弹窗有「Submit a request」，点进去提交审核。再到 App Store 的购买记录和「订阅」里看这笔交易是否已经成功。',
          en: 'Save the purchase message and the time it appeared. If the prompt offers Submit a request, use it to request a review. Then check App Store purchase history and Subscriptions to see whether the charge or subscription already went through.',
        },
      },
      {
        text: {
          zh: '需要跟进时，打开 Apple 支持，选择 Apple 账号所在地区，从「App Store → 订阅与购买 → 无法购买」进入。往下找「获取更多帮助」。页面如果提供聊天，可带上报错时间、App 名称和套餐联系支持。',
          en: 'To follow up, open Apple Support for the region of your Apple Account and go to App Store → Subscriptions & Purchases → Unable to purchase. Look for Get more help. If chat is offered, give the advisor the error time, app and plan.',
        },
        link: {
          href: 'https://getsupport.apple.com/',
          label: { zh: '打开 Apple 支持', en: 'Open Apple Support' },
        },
      },
      {
        text: {
          zh: '收到审核结果后按 Apple 的回复处理。可以重试时，确认订单中的方案和金额。付款完成后，在 Apple 的订阅列表核对续费日期，再回 App 确认套餐已经生效。',
          en: 'Follow Apple’s response when the review is complete. If told to try again, check the plan and amount before confirming. After it goes through, check the renewal date in Apple Subscriptions and the active plan in the app.',
        },
      },
    ],
    source: 'https://x.com/i/article/2119344771475156992',
    sourceAuthor: '@Delroy715',
    sourcePublishedAt: '2026-11-08T11:53:06Z',
    sourceViews: 38494,
  },
  {
    slug: 'google-ai-ultra-iphone-subscription',
    title: '410元开通谷歌 Ultra 20×：爽用用96GB云端显卡，跑通了开源生图和视频',
    englishTitle:
      'I paid 410 yuan for Google Ultra 20× and ran open-source image and video models on a 96 GB cloud GPU',
    summary: {
      zh: '先核对地区，再确认两个账号：Apple 账户付钱，个人 Google 账号收会员权益。',
      en: 'Check availability first. Your Apple Account pays and your personal Google Account receives the membership.',
    },
    experience: {
      zh: '阿磊在 11 月 4 日记录了用 Apple 内购开通 Google AI Ultra 的过程。他在付款前核对了自己的方案和月价，开通后用同一个 Google 账号实际跑通了 Colab。想用 Antigravity 的读者，还要单独确认它的地区和模型资格。',
      en: 'On November 4, A-Lei documented buying Google AI Ultra through Apple in-app purchase. He checked his plan and monthly price before paying, then ran a Colab notebook with the same Google Account. If you want Antigravity, check its separate region and model requirements as well.',
    },
    steps: [
      {
        text: {
          zh: '先查你实际使用地是否支持 Antigravity，并用准备开通的 Google 账号查看它关联的地区。新加坡、日本和台湾在 Antigravity 的名单上。中国大陆、香港和澳门当前未列入这份名单。Google One 的订阅地区另有一张表，付款前两项都要核对。',
          en: 'Check availability both where you use Antigravity and for the region associated with your Google Account. Singapore, Japan and Taiwan are listed. Mainland China, Hong Kong and Macao are currently absent from the Antigravity list. Google One has its own subscription coverage, so check both before paying.',
        },
        link: {
          href: 'https://antigravity.google/docs/faq/#what-is-google-antigravitys-geographical-availability',
          label: {
            zh: '查 Antigravity 支持地区',
            en: 'Check Antigravity availability',
          },
        },
      },
      {
        text: {
          zh: '先用自己的个人 Google 账号免费登录一次 Antigravity，确认你能进入客户端。然后在 iPhone 打开 Google One，点头像核对同一个邮箱，再进入「设置 → 更改会员方案」查看可买的 Pro 或 Ultra。已通过 Apple 订阅的用户，可在「iPhone 设置 → Apple 账户 → 订阅 → Google One」查看所有方案。',
          en: 'Sign into Antigravity with your personal Google Account on the free tier first. Then open Google One on your iPhone, verify the same email, and check the Pro or Ultra options under Settings → Change membership plan. If you already subscribe through Apple, open iPhone Settings → Apple Account → Subscriptions → Google One to see all plans.',
        },
        link: {
          href: 'https://support.google.com/googleone/answer/16476748?co=GENIE.Platform%3DiOS&hl=zh-Hans',
          label: {
            zh: '打开 iPhone 订阅指引',
            en: 'Open the iPhone subscription instructions',
          },
        },
      },
      {
        text: {
          zh: '用你的 Apple 账户确认内购。看清方案名称、现在应付金额和下次续费价格，再确认付款。原先从网页或 Google Play 买的用户，在 Google One 的原订阅渠道管理升级。',
          en: 'Confirm the in-app purchase with your Apple Account after checking the plan name, the amount due today and the renewal price. If you bought through the web or Google Play, manage the upgrade through your original subscription channel.',
        },
        link: {
          href: 'https://one.google.com/about/google-ai-plans/',
          label: {
            zh: '查看 Google One 网页套餐',
            en: 'See Google One plans on the web',
          },
        },
      },
      {
        text: {
          zh: '回到 Google One 的会员方案页，确认当前邮箱和 Pro 或 Ultra 套餐档位。打开 Antigravity，核对登录邮箱与付款前一致，再进模型菜单和用量页面确认。这样可以分别核实订阅是否到账，以及所需模型在这个账号上是否可用。',
          en: 'Back in Google One, check the email and the active Pro or Ultra tier. Open Antigravity, confirm it uses the same email, then check the model picker and usage screen. This verifies both the membership and availability of the model you want.',
        },
      },
    ],
    source: 'https://x.com/i/article/2117796918327697408',
    sourceAuthor: '@yangleiocx3',
    sourcePublishedAt: '2026-11-04T04:19:46Z',
    sourceViews: 135910,
  },
  {
    slug: 'claude-pro-iphone-apple-sign-in',
    title: 'Claude Pro 保姆级订阅教程 ｜ 性价比版',
    englishTitle: 'A hands-on guide to subscribing to Claude Pro on iPhone',
    summary: {
      zh: '看原文注册和订阅部分。用 Apple 登录 Claude 时，先确认 Claude 账号邮箱，再在 iPhone 上开通 Pro，付款后检查订阅归属。',
      en: 'See the registration and subscription sections. If you use Sign in with Apple, check the Claude account email before upgrading on iPhone and confirm the subscription on that account after paying.',
    },
    experience: {
      zh: '徐行 AI 用 Apple 登录注册自己的 Claude 账号，在 iPhone 上开了 Pro，再到电脑上使用 Claude Code。他记录了「隐藏邮件地址」生成的转发邮箱，以及用邮件登录时去哪个邮箱收信。',
      en: 'Xu Xing AI registered a Claude account with Sign in with Apple, bought Pro on iPhone and then used Claude Code on a computer. The guide shows how he identified the relay address created by Hide My Email and where to receive sign-in emails.',
    },
    steps: [
      {
        text: {
          zh: '如果注册时选了「隐藏邮件地址」，在 iPhone 打开「设置 → 你的姓名 → 通过 Apple 登录」，选 Claude，查看 Apple 为它生成的转发邮箱。回 Claude 核对账号邮箱，记住实际接收转发邮件的邮箱。',
          en: 'If you chose Hide My Email at registration, open iPhone Settings → your name → Sign in with Apple and select Claude to see its relay address. Match it to the email shown in Claude and know which inbox receives the forwarded messages.',
        },
        link: {
          href: 'https://support.apple.com/en-us/105078',
          label: {
            zh: '查 Apple 转发邮箱',
            en: 'Find your Apple relay address',
          },
        },
      },
      {
        text: {
          zh: '在 Claude App 打开头像，再点「Upgrade to Pro」。确认 Claude 当前登录的是要升级的账号，在 Apple 的确认页核对付款账号、订阅价格和续费周期，确认后付款。',
          en: 'Open your profile in the Claude app and choose Upgrade to Pro. Confirm the Claude account you want to upgrade, then review the Apple account, price and renewal period on the purchase screen before paying.',
        },
        link: {
          href: 'https://support.claude.com/en/articles/9266495-how-do-i-sign-up-for-claude-pro-on-the-claude-app-for-ios',
          label: {
            zh: '查 Claude 的 iOS 订阅入口',
            en: 'Find the Claude iOS upgrade option',
          },
        },
      },
      {
        text: {
          zh: '付款后回 Claude 确认显示 Pro，再到 iPhone 的「设置 → 你的姓名 → 订阅」查看 Claude 及下次续费时间。如果手机上已开通、电脑上还是免费版，先核对电脑端是否登录了同一个 Claude 账号。',
          en: 'After paying, confirm Pro inside Claude, then check Claude and the next renewal date in iPhone Settings → your name → Subscriptions. If Pro appears on the phone and the computer still shows Free, check that both are signed into the same Claude account.',
        },
      },
    ],
    source: 'https://x.com/i/article/2117801075705249792',
    sourceAuthor: '@xuxingai',
    sourcePublishedAt: '2026-11-04T02:40:34Z',
    sourceViews: 240652,
  },
  {
    slug: 'claude-pro-web-subscription',
    title:
      '拒绝代充！没有 iPhone 也能自己开通 Claude Pro，一张 Mastercard 亲测跑通',
    englishTitle:
      'How I subscribed to Claude Pro myself without an iPhone, using a Mastercard',
    summary: {
      zh: '人在支持地区时，用自己的邮箱和手机号注册。结账前核对发卡地区、账单地址和含税总价。',
      en: 'Sign up with your own email and phone number in a supported location. Check the card’s issuing country, billing address and total with tax before paying.',
    },
    experience: {
      zh: '阿蔺在 11 月 2 日发的长文里，记录了用本人名下的新加坡 Mastercard 开通 Claude Pro 月付。结账页显示应付 30 新元，付款后他在 Claude 看到了 Pro，并核对了卡上的交易。原文含开卡推广。',
      en: 'In his November 2 article, A-Lin documented buying Claude Pro monthly with a Singapore-issued Mastercard in his own name. Checkout showed a total of SGD 30. After paying, he saw Pro on his Claude account and checked the card transaction. His original article includes a card promotion.',
    },
    steps: [
      {
        text: {
          zh: '先查所在地。中国大陆当前未列入 Claude 官方支持地区。人在新加坡、日本等支持地区，可以用自己的邮箱或 Google 账号注册，并按页面要求用本人可用的对应地区手机号接收验证码。',
          en: 'Check where you are first. Mainland China is not currently listed as a supported Claude location. If you are in a supported location such as Singapore or Japan, sign up with your own email or Google Account and verify with your own eligible phone number when prompted.',
        },
        link: {
          href: 'https://www.anthropic.com/legal/supported-regions',
          label: { zh: '查 Claude 支持地区', en: 'Check Claude availability' },
        },
      },
      {
        text: {
          zh: '登录网页后，点左下角头像，进入「设置 → 账单 → 升级套餐」，选择 Pro。结账页先看月付或年付、币种、税费和本次总额。',
          en: 'After signing in on the web, open Settings → Billing from the bottom-left profile menu, then upgrade to Pro. Review the billing interval, currency, tax and amount due at checkout.',
        },
        link: {
          href: 'https://claude.ai/upgrade',
          label: { zh: '打开 Claude 升级页', en: 'Open Claude’s upgrade page' },
        },
      },
      {
        text: {
          zh: '用自己的借记卡或信用卡付款。先核对发卡地区和账单地址是否符合付款要求，再填真实账单资料。收到银行的付款确认时，在银行 App 或验证页面完成后，返回 Claude 确认结果。',
          en: 'Pay with your own debit or credit card. Check whether the issuing country and billing address qualify, and enter the billing details on file with the issuer. Complete any bank confirmation, then return to Claude to check the result.',
        },
        link: {
          href: 'https://support.claude.com/en/articles/9402418-why-was-my-card-declined',
          label: {
            zh: '看发卡地区和付款要求',
            en: 'Check card and billing requirements',
          },
        },
      },
      {
        text: {
          zh: '回到「设置 → 账单」，检查套餐显示 Pro、下次续费日期和发票。也可以对照银行交易记录核对商户和金额。卡已扣款但页面仍显示 Free 时，先核对网页登录邮箱和交易状态，再决定是否需要联系支持。',
          en: 'Return to Settings → Billing and check for Pro, the next renewal date and the invoice. Compare the merchant and amount with your bank transaction. If a charge appears while the account still shows Free, check the signed-in email and payment status before contacting support.',
        },
        link: {
          href: 'https://support.claude.com/en/articles/8325618-paid-plan-billing-faqs',
          label: {
            zh: '查发票和订阅状态',
            en: 'Find invoices and subscription status',
          },
        },
      },
    ],
    source: 'https://x.com/i/article/2117217865128636416',
    sourceAuthor: '@alin_zone',
    sourcePublishedAt: '2026-11-02T11:41:55Z',
    sourceViews: 67316,
  },
  {
    slug: 'chatgpt-plus-iphone-subscription',
    title: '支付宝购买美区 Apple 礼品卡并订阅 ChatGPT：保姆级20张图文教程',
    englishTitle:
      'Buy a U.S. Apple gift card with Alipay and subscribe to ChatGPT: a guide with 20 screenshots',
    summary: {
      zh: '先看自己的 App Store 能不能内购，结账前核对价格，付完分别查 Apple 订单和 ChatGPT 套餐。',
      en: 'Check whether your App Store offers in-app purchase, review the price, then verify both the Apple order and the ChatGPT plan.',
    },
    experience: {
      zh: '叫我阿杭在 10 月 31 日的图文里演示了把礼品卡兑进 Apple 账户余额、在 ChatGPT App 买 Plus，再回到原账号检查套餐的过程。图文里的美国商店是他的示例，下面按你自己实际使用的商店来操作。',
      en: 'In his illustrated October 31 article, A-Hang showed how to add Apple Account credit, buy Plus inside the ChatGPT app and confirm the plan on the original account. He used the U.S. storefront as his example. Follow the steps for your own eligible storefront.',
    },
    steps: [
      {
        text: {
          zh: '先查 ChatGPT 支持地区。中国大陆、香港和澳门目前未列入官方列表。人在支持地区，且你自己的 App Store 能下载 OpenAI 发布的 ChatGPT App 时，先在 App 里登录准备开通的账号。新用户可以用自己的邮箱注册，老用户沿用原来的登录方式。',
          en: 'Check ChatGPT availability first. Mainland China, Hong Kong and Macao are currently absent from the official list. If you are in a supported location and your storefront offers OpenAI’s ChatGPT app, sign into the account you want to upgrade. Use your own email if you are creating a new account, or your original sign-in method if you already have one.',
        },
        link: {
          href: 'https://help.openai.com/en/articles/7947663-chatgpt-and-openai-api-supported-countries-and-territories',
          label: {
            zh: '查 ChatGPT 支持地区',
            en: 'Check ChatGPT availability',
          },
        },
      },
      {
        text: {
          zh: '在 ChatGPT App 打开菜单，点自己的名字，在设置里进「升级套餐」，先查看 Plus 的当前报价。用 Apple 账户可用的付款方式。已有同地区的 Apple 礼品卡，可以从「App Store → 头像 → 兑换充值卡或代码」把卡充到账户余额，再回来结账。',
          en: 'In the ChatGPT app, open the menu, tap your name and find the upgrade option in Settings. Check the current Plus price and use a payment method available to your Apple Account. If you already have an Apple gift card for that storefront, redeem it under App Store → profile → Redeem Gift Card or Code before returning to checkout.',
        },
        link: {
          href: 'https://support.apple.com/zh-cn/118242',
          label: {
            zh: '看 Apple 礼品卡兑换入口',
            en: 'Find Apple’s gift card redemption steps',
          },
        },
      },
      {
        text: {
          zh: '回到 ChatGPT 选 Plus。在 Apple 弹出的购买页核对周期和实际金额，再用侧边按钮或系统提示确认。没有 App 内购入口时，可登录同一个账号，从 chatgpt.com 的头像菜单打开升级页，查看网页提供的付款选项。',
          en: 'Choose Plus in ChatGPT. Check the interval and total on Apple’s purchase sheet, then confirm using the side button or the system prompt. If in-app purchase is unavailable, sign into the same account at chatgpt.com and check the web upgrade options from your profile.',
        },
        link: {
          href: 'https://help.openai.com/en/articles/7905739-chatgpt-ios-app-upgrading-to-a-paid-subscription',
          label: {
            zh: '查 App 和网页的升级入口',
            en: 'Find the app and web upgrade options',
          },
        },
      },
      {
        text: {
          zh: '在 ChatGPT 设置里确认套餐变成 Plus，再从 Apple 的购买记录核对订单。需要用 Codex 时，回到桌面端，用刚才付费的同一账号进入 Codex。账单有记录但 App 仍显示 Free 时，核对购买时的 Apple 账户和 ChatGPT 账号，并查「恢复购买」。',
          en: 'Confirm Plus appears in ChatGPT Settings and check the order in Apple purchase history. For Codex, use that same ChatGPT account in the desktop app. If Apple shows a purchase while ChatGPT still says Free, check the Apple and ChatGPT accounts used at checkout and look for Restore Purchases.',
        },
        link: {
          href: 'https://help.openai.com/en/articles/20001056-troubleshooting-chatgpt-subscription-access-and-account-changes',
          label: {
            zh: '查到账与恢复购买',
            en: 'Check subscription access and restore purchases',
          },
        },
      },
    ],
    source: 'https://x.com/i/article/2116453063057948672',
    sourceAuthor: '@Astronaut_1216',
    sourcePublishedAt: '2026-10-31T09:35:01Z',
    sourceViews: 13859,
  },
  {
    slug: 'android-subscriptions-google-play',
    title: '别再找代充了！ChatGPT / Claude 官方订阅，其实比你想象中简单',
    englishTitle:
      'How to subscribe to ChatGPT and Claude yourself through official checkout',
    summary: {
      zh: '原文整理了多个自助付款渠道。这里把安卓的 Google Play 结账、到账和续费入口列清楚。',
      en: 'The original covers several self-service payment channels. These steps focus on Android checkout, subscription verification and renewal through Google Play.',
    },
    experience: {
      zh: '苏码玩家在 9 月的长文里写了自己常用的 Safari 网页付款方式，也整理了安卓从官方 App 发起、交给 Google Play 结账的路径。下面按目前的商店和应用入口核对。',
      en: 'In his September article, Suversal described his own Safari checkout method and documented the Android path from the official app to Google Play. The steps below reflect the current store and app controls.',
    },
    steps: [
      {
        text: {
          zh: '人在服务支持的地区时，用自己的 Google Play 账号安装官方 App。Claude 的发布方是 Anthropic，ChatGPT 的发布方是 OpenAI。打开 App 后，先确认准备开通会员的业务账号邮箱。',
          en: 'While in a supported location, install the official app using your own Google Play account. Look for Claude by Anthropic or ChatGPT by OpenAI. In the app, confirm the email of the account you want to upgrade.',
        },
        link: {
          href: 'https://support.claude.com/en/articles/9612887-install-claude-for-android',
          label: {
            zh: '查 Claude 安卓下载入口',
            en: 'Find the official Claude Android app',
          },
        },
      },
      {
        text: {
          zh: '在 Claude 点右上角头像，进设置选「Upgrade to Pro」。ChatGPT 则查看账号菜单的升级入口。出现 Google Play 购买页后，看清付款用的 Google 账号、套餐、币种、税费和续费周期，再用该商店支持的付款方式确认。',
          en: 'In Claude, open Settings from the profile button and choose Upgrade to Pro. In ChatGPT, look for the upgrade option in the account menu. On the Google Play purchase sheet, check the paying Google Account, plan, currency, tax and renewal interval before using a payment method supported by your store.',
        },
        link: {
          href: 'https://support.claude.com/en/articles/9612892-how-do-i-sign-up-for-claude-pro-on-claude-for-android',
          label: {
            zh: '查 Claude 安卓内购步骤',
            en: 'Check Claude’s in-app upgrade steps',
          },
        },
      },
      {
        text: {
          zh: '回 App 确认目标账号显示 Pro 或 Plus。再去「Google Play → 头像 → 付款和订阅 → 订阅」查订单和下次扣款日期。要换到网页续费时，先在原渠道核对当前订阅的结束时间，避免两个渠道同时扣款。',
          en: 'Check that Pro or Plus appears in the intended app account. Then open Google Play → profile → Payments & subscriptions → Subscriptions to check the order and next charge date. If switching to web billing, check when the original plan ends to avoid overlapping charges.',
        },
        link: {
          href: 'https://support.google.com/googleplay/answer/7018481?hl=zh-Hans',
          label: {
            zh: '管理 Google Play 订阅',
            en: 'Manage Google Play subscriptions',
          },
        },
      },
    ],
    source: 'https://x.com/i/article/2096991393403301888',
    sourceAuthor: '@suversal',
    sourcePublishedAt: '2026-09-08T08:47:27Z',
    sourceViews: 125907,
  },
];

const publishedTimeFormat = new Intl.DateTimeFormat('sv-SE', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Singapore',
});

export function tipPublishedTime(iso: string): string {
  return publishedTimeFormat.format(new Date(iso));
}

export function tipPageTitle(title: string, locale: 'zh' | 'en'): string {
  return locale === 'zh'
    ? `${title} · 使用小技巧 · 号没了`
    : `${title} · Tips · 号没了`;
}

export const TIP_PATHS = TIP_ARTICLES.map(({ slug }) => '/tips/' + slug);

export const TIP_TRANSLATIONS = Object.fromEntries(
  TIP_ARTICLES.flatMap(
    ({ title, englishTitle, summary, experience, steps }) => [
      ...[summary, experience].map(({ zh, en }) => [zh, en]),
      ...steps.flatMap(({ text, link }) => [
        [text.zh, text.en],
        ...(link ? [[link.label.zh, link.label.en]] : []),
      ]),
      [tipPageTitle(title, 'zh'), tipPageTitle(englishTitle, 'en')],
    ],
  ),
);

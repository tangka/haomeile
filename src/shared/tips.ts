interface TipCopy {
  zh: string;
  en: string;
}

export type TipVendor = 'claude' | 'codex' | 'antigravity';

interface TipArticle {
  slug: string;
  title: string;
  englishTitle: string;
  summary: TipCopy;
  experience: TipCopy;
  steps: {
    text: TipCopy;
    link?: { href: string | TipCopy; label: TipCopy };
  }[];
  source: `https://x.com/i/article/${string}`;
  sourceAuthor: string;
  sourcePublishedAt: string;
  sourceViews: number;
}

export const TIP_ARTICLES: TipArticle[] = [
  {
    slug: 'antigravity-first-install-google-ai-pro',
    title:
      'Google Antigravity 零基础教程：从下载安装到黑五 99 美元开 Pro，手把手一次讲清',
    englishTitle:
      'Google Antigravity for beginners: installation and the $99 Black Friday Pro plan',
    summary: {
      zh: '我开通了一年的 Google AI Pro。这篇记录了 Antigravity 桌面端怎么登录、在哪订阅，以及到哪里看可选模型和使用额度。',
      en: 'I bought a year of Google AI Pro. Here’s where to sign in to the Antigravity desktop app, subscribe, and check which models and usage limits are available.',
    },
    experience: {
      zh: '我订了一年的 Google AI Pro。我的 Google One 页面显示年付 99.99 美元、5 TB 存储。在 Antigravity 桌面端，我打开模型选择器看有哪些模型，再点「View Usage」查看额度。',
      en: 'I subscribed to Google AI Pro for a year. My Google One page showed $99.99 per year and 5 TB of storage. In the Antigravity desktop app, I opened the model picker to see the available models and used View Usage to check my limits.',
    },
    steps: [
      {
        text: {
          zh: '在 Antigravity 支持的地区，用自己的个人 Google 账号登录。从官网下载并打开桌面端，点「Continue with Google」，在浏览器完成授权后回到客户端。在「New Conversation → No Project」发一条简单消息，确认能收到回复。',
          en: 'In a location where Antigravity is available, use your personal Google Account. Open the desktop app, select Continue with Google, and finish signing in through your browser. Return to the app, open New Conversation → No Project, and send a short message to check that it responds.',
        },
        link: {
          href: 'https://antigravity.google/download',
          label: { zh: '下载 Antigravity', en: 'Download Antigravity' },
        },
      },
      {
        text: {
          zh: '用客户端里登录的同一个账号打开 Google One，选 Google AI Pro。按结账页显示的月付或年付选项订阅，付款前核对本次金额和下次续费日期，付完回 Google One 确认页面已显示 Pro。',
          en: 'Open Google One with the same account you used in the desktop app and select Google AI Pro. Choose an available billing interval, then check the amount due and the renewal date at checkout. After payment, return to Google One and confirm that it shows Pro.',
        },
        link: {
          href: 'https://one.google.com/about/google-ai-plans/',
          label: { zh: '打开 Google AI 套餐页', en: 'View Google AI plans' },
        },
      },
      {
        text: {
          zh: '回到 Antigravity，用已开通 Pro 的账号重新登录。打开输入框左下方的模型选择器，查看当前能选的模型，再点「View Usage」看额度。可以发一条测试消息，确认想用的模型能正常回复。',
          en: 'Return to Antigravity and sign back in with the account that has Pro. Open the model picker below the prompt to see available models, then select View Usage to check your limits. Send a short test message with the model you want to use.',
        },
        link: {
          href: 'https://antigravity.google/docs/models',
          label: { zh: '查看模型选择说明', en: 'See how to choose a model' },
        },
      },
    ],
    source: 'https://x.com/i/article/2124686504060399616',
    sourceAuthor: '@xiaomovps',
    sourcePublishedAt: '2026-11-23T02:10:31Z',
    sourceViews: 14858,
  },
  {
    slug: 'google-ai-pro-switch-to-annual',
    title:
      '黑五 5 折 99.99 刀正规上车 Google AI Pro：美区白号不等 27 号两步升级实测',
    englishTitle:
      'How I switched Google AI Pro to the Black Friday annual plan',
    summary: {
      zh: '我在 Google One 把 Google AI Pro 从月付切到年付，然后在 Google Play 核对了收据和续费价格。',
      en: 'I switched Google AI Pro from monthly to yearly billing in Google One, then checked the receipt and renewal price in Google Play.',
    },
    experience: {
      zh: '11 月 22 日，我在月付开通后进入 Google One 的方案管理，那里显示了年付选项。我的收据上，首年实付 99.99 美元，次年续费价是 199.99 美元。我在 Google Play 取消续费后，又核对了一次已付费的到期日。',
      en: 'On November 22, I opened plan management after starting my monthly membership and found an annual option. My receipt showed $99.99 charged for the first year and $199.99 for renewal. I turned off auto-renewal in Google Play and checked how long my paid access would last.',
    },
    steps: [
      {
        text: {
          zh: '用已有 Google AI Pro 订阅的个人账号打开 Google One。进入「管理会员方案」找年付，也可以在设置里找「更换会员方案」。页面显示的方案和价格以你自己的账号为准。',
          en: 'Open Google One with the personal account that has your Google AI Pro membership. Look for an annual option under Manage membership, or find Change membership plan in Settings. Check the offers and prices shown for your own account.',
        },
        link: {
          href: 'https://support.google.com/googleone/answer/9003633',
          label: {
            zh: '查看切换结算周期的入口',
            en: 'Find billing interval settings',
          },
        },
      },
      {
        text: {
          zh: '在确认付款前，对照套餐名称、本次扣款、续费金额和续费日期。付款后回 Google One 看结算周期是否已变成年付，再用收据核对实际扣款。',
          en: 'Before confirming, compare the plan name, the charge today, the renewal price and the renewal date. After paying, check that Google One shows annual billing and match the actual charge to the receipt.',
        },
      },
      {
        text: {
          zh: '如果是 Google Play 结算，可以在「付款和订阅 → 订阅 → Google One」查看下一次扣款。只打算用已付费的一年时，可以在这页关闭续费，再确认显示的到期日期。',
          en: 'If Google Play bills you, open Payments & subscriptions → Subscriptions → Google One to check the next charge. If you plan to use only the year you paid for, turn off renewal there and check the expiration date afterward.',
        },
        link: {
          href: 'https://play.google.com/store/account/subscriptions',
          label: {
            zh: '查看 Google Play 订阅',
            en: 'View Google Play subscriptions',
          },
        },
      },
    ],
    source: 'https://x.com/i/article/2124429521420230656',
    sourceAuthor: '@heitieya',
    sourcePublishedAt: '2026-11-22T09:17:50Z',
    sourceViews: 5841,
  },
  {
    slug: 'antigravity-paid-plan-starter-quota',
    title:
      '3 万字超干货 Antigravity 群峰× AI 精品短剧：280元打通双顶配模型池与 96G 云显卡，跑通电影级双语成片',
    englishTitle:
      'A hands-on Antigravity guide: from Google AI Ultra setup to a bilingual short film',
    summary: {
      zh: '我开通了 Ultra，Antigravity 却还显示 Starter Quota。排查时先核对登录账号，再看额度页提示。',
      en: 'I had an active Ultra subscription, but Antigravity still showed Starter Quota. Start by checking the signed-in account and the message on the quota page.',
    },
    experience: {
      zh: '当时 Google One 里已经显示 Ultra 5x 生效。我看到 Antigravity 的额度下面有一行提示，让我先验证年龄。我按提示验证，再退出客户端重新登录，付费额度就出来了。',
      en: 'Google One showed that Ultra 5x was active. Under the quota in Antigravity, I saw a message asking me to verify my age. I followed the prompt, then signed out of the client and back in. The paid quota appeared.',
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
    slug: 'claude-max-google-play-recovery',
    title: 'Claude 封号申诉成功了！丢掉的 125 刀 Max 订阅，磨了 5 天也回来了',
    englishTitle:
      'My Claude appeal worked, and I got my $125 Max subscription back after five days',
    summary: {
      zh: '我的 Claude 账号解封后，已付费的 Max 却变成了 Free。我查了 Google Play 的订单，也从 Claude 网页里联系了支持。几天后，Max 回到了原账号。',
      en: 'After Claude restored my account, the Max plan I’d paid for showed up as Free. I checked the Google Play order and contacted support from Claude on the web. A few days later, Max was back on the same account.',
    },
    experience: {
      zh: '11 月 13 日，我收到停用通知，Google Play 也发信说 Claude 订阅将取消。次日，Anthropic 回复说停用是误判，我重新登了进去，但还剩 9 天的 Max 显示成了 Free。我用原账号打开 Claude 网页左下角的「获取帮助」。这次客服查到了由 Google Play 结算的记录，说会把问题转给人工团队。11 月 17 日晚上，我再查时看到 Max 已恢复。具体是哪一步让权益恢复的，我没收到确认。',
      en: 'On November 13, I got a suspension notice and a Google Play email saying my Claude subscription would be canceled. Anthropic told me the next day that the suspension was a mistake. I could sign in again, but my account showed Free with nine days left on Max. I signed in to the same account on Claude’s website and opened Get help in the lower left. Support found the Google Play billing record and said they would pass the issue to a human team. When I checked again on the evening of November 17, Max was back. I never got confirmation of which step restored it.',
    },
    steps: [
      {
        text: {
          zh: '账号仍然停用时，从 Claude 的申诉说明打开表单，填写受影响账号的邮箱，写清收到通知的时间、平时的用途和希望复核的问题。收到恢复通知后，登录原账号查看当前套餐。',
          en: 'If you still can’t access the account, open the form from Claude’s appeal instructions and enter the email address associated with the affected account. Explain when the notice arrived, how you normally use Claude and what you want reviewed. After you receive confirmation that access is restored, sign in to the same account and check the current plan.',
        },
        link: {
          href: 'https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals',
          label: {
            zh: '查看 Claude 申诉说明',
            en: 'See Claude’s appeal instructions',
          },
        },
      },
      {
        text: {
          zh: '如果 Claude 显示 Free，用付款时的 Google 账号打开 Google Play 的「付款和订阅 → 预算和订单记录」。找到 Claude 收据，核对套餐、扣款日期和金额，并记下订阅页显示的状态。',
          en: 'If Claude shows Free, sign in to Google Play with the account you paid with and open Payments & subscriptions → Budget & order history. Find the Claude receipt and check the plan, charge date and amount. Note the status shown on the subscriptions page.',
        },
        link: {
          href: 'https://support.google.com/googleplay/answer/2850369',
          label: {
            zh: '查看 Google Play 订单记录说明',
            en: 'Find your Google Play order history',
          },
        },
      },
      {
        text: {
          zh: '在已登录的 Claude 网页左下角点「获取帮助」。说明账号哪天恢复、当前显示哪一档、Google Play 收据对应哪一档，请客服核对该订单和 Claude 账号上的订阅权益。需要提供订单号时，把它发给官方客服。',
          en: 'While signed in to Claude on the web, open Get help in the lower left. Give support the date your account was restored, the tier Claude currently shows and the tier on the Google Play receipt. Ask them to match the order to the subscription on your Claude account. Share the order number with official support if requested.',
        },
        link: {
          href: 'https://support.claude.com/en/articles/9015913-how-to-get-support',
          label: { zh: '查看 Claude 客服入口', en: 'Find Claude support' },
        },
      },
      {
        text: {
          zh: '后续的进展补在同一条客服对话里。处理完成后回到 Claude 核对套餐名，再从 Google Play 查看订阅状态和下一次扣款日期。',
          en: 'Add any updates to the same support conversation. Once the issue is resolved, confirm the plan name in Claude and check the subscription status and next billing date in Google Play.',
        },
      },
    ],
    source: 'https://x.com/i/article/2122767782291066880',
    sourceAuthor: '@qianshuixia2026',
    sourcePublishedAt: '2026-11-18T01:22:52Z',
    sourceViews: 6866,
  },
  {
    slug: 'google-ai-claim-cloud-credits',
    title:
      '万字干货｜Gemini 4 + Antigravity，从 0 到 1 跑通全自动出片（附 Agent 指令）',
    englishTitle:
      'Gemini 4 and Antigravity: a full walkthrough for automated video production',
    summary: {
      zh: '我开通 Google AI Pro 后，在 AI Studio 领了 Cloud 赠金，再去 Cloud Billing 核对到账。',
      en: 'After subscribing to Google AI Pro, I claimed Cloud credits in AI Studio and checked them in Cloud Billing.',
    },
    experience: {
      zh: '账单里显示赠金已经生效，可以抵扣我的 Gemini API 调用费。我的结算账户是预付费，页面还要求余额大于零。我补了余额才恢复调用。',
      en: 'Once the credit showed as active in Billing, I could use it against my Gemini API charges. My prepaid billing account still needed a positive balance. I added funds before I could make API calls again.',
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
          zh: '打开 Google Cloud 的「结算 → 赠金」，选同一个结算账户，找到 Google Developer Program 的赠金，查看状态、金额和到期日。遇到余额提示时，先核对自己的结算模式。',
          en: 'In Google Cloud, open Billing → Credits for the same billing account and check the Google Developer Program credit status, amount and expiration. If you see a balance notice, check your billing mode.',
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
      zh: '我碰到过两次身份验证，一次是在开 Pro 时，另一次是刚注册完。',
      en: 'I got two identity prompts. One came up as I tried to buy Pro and the other right after sign-up.',
    },
    experience: {
      zh: '第一个账号在结账时弹出了验证窗口，第二个还没走到付款。我两次都停在这一步。遇到这个弹窗，可以先确认是身份验证还是支付问题，再去对应的页面处理。',
      en: 'The first account showed a verification window at checkout. The second had yet to reach payment. I stopped at the prompt both times. If you see it, check whether you are being asked to verify your identity or resolve a payment issue before proceeding.',
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
      zh: '我订了 Ultra 5X，用 Antigravity 的 Carbon 跑了编码任务。我对照 Linux.do 上的一篇文章做了复测，主要看多 Agent 和代码重构会吃掉多少额度，再算云盘和 Colab 这些权益值不值。',
      en: 'I subscribed to Ultra 5X and ran coding tasks with Carbon in Antigravity. I tested what I had read on Linux.do, looking at how much quota parallel agents and refactoring used and whether storage and Colab were worth paying for.',
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
      'How I handled an App Store purchase review while subscribing to Google AI Ultra',
    summary: {
      zh: '我在 iPhone 上订阅 Google AI Ultra 时弹出了「Purchase Not Completed」。我先从弹窗提交了审核请求。',
      en: 'I got a “Purchase Not Completed” message while subscribing to Google AI Ultra on iPhone. I requested a review from the purchase prompt.',
    },
    experience: {
      zh: '提交后，我又去 Apple 支持网站找到了人工客服。第三天我收到了 Apple 的通知，这时再试一次，订阅就开通了。',
      en: 'After submitting the request, I reached a support advisor through Apple’s website. Apple notified me on the third day, and the subscription went through when I tried again.',
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
      zh: '我用 Apple 内购开通了 Google AI Ultra。付款前核对了方案和月价，开通后用同一个 Google 账号跑通了 Colab。要用 Antigravity 的话，可以再查一次它自己的地区和模型要求。',
      en: 'I subscribed to Google AI Ultra through an Apple in-app purchase. I checked the plan and monthly price first, then ran a Colab notebook with the same Google Account. If you plan to use Antigravity, also check its region and model requirements.',
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
          href: {
            zh: 'https://support.google.com/googleone/answer/16476748?co=GENIE.Platform%3DiOS&hl=zh-Hans',
            en: 'https://support.google.com/googleone/answer/16476748?co=GENIE.Platform%3DiOS&hl=en',
          },
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
      zh: '我用 Apple 登录注册 Claude，在 iPhone 上开了 Pro，然后在电脑上用同一个账号登录 Claude Code。',
      en: 'I created my Claude account with Sign in with Apple, bought Pro on iPhone and signed into Claude Code on my computer with the same account.',
    },
    experience: {
      zh: '我注册时选了「隐藏邮件地址」，Claude 账号里显示的是 Apple 生成的转发邮箱。后来用邮箱登录时，我就填这个地址，再去收转发邮件的邮箱看登录邮件。',
      en: 'I chose Hide My Email at sign-up, so Claude showed the relay address Apple generated. When signing in by email, I entered that address and checked the inbox Apple forwards to for the sign-in message.',
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
      zh: '我用自己名下的新加坡 Mastercard 开通了 Claude Pro 月付。结账时显示应付 30 新元。付完我回 Claude 看到了 Pro，又在银行记录里核对了这笔交易。',
      en: 'I paid for monthly Claude Pro with a Singapore-issued Mastercard in my name. Checkout showed SGD 30. After paying, I saw Pro on my Claude account and checked the transaction with my bank.',
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
      zh: '我用美区 App Store 做演示，从把礼品卡兑进 Apple 账户、在 ChatGPT App 选 Plus，到回原账号检查套餐。操作时看你自己的商店和账号。',
      en: 'I used the U.S. App Store as an example to show how to redeem an Apple gift card, buy Plus in ChatGPT and check the plan on the same account. Use the storefront and account you normally use.',
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
          href: {
            zh: 'https://support.apple.com/zh-cn/118242',
            en: 'https://support.apple.com/en-us/118242',
          },
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
      zh: '我平时用 Safari 网页付款，也整理了安卓用户从 Google Play 开通、核对到账和管理续费的入口。',
      en: 'I usually pay on the web in Safari. I also put together the Google Play options for Android users to pay, confirm their plan and manage renewal.',
    },
    experience: {
      zh: '安卓这条路径从 Claude 或 ChatGPT 的官方 App 开始。到了购买页，先看清付款用的 Google 账号，再确认订阅要开在哪个 Claude 或 ChatGPT 账号上。',
      en: 'On Android, start in the official Claude or ChatGPT app. When the purchase sheet opens, check the Google Account that will pay and which Claude or ChatGPT account will receive the subscription.',
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
          href: {
            zh: 'https://support.google.com/googleplay/answer/7018481?hl=zh-Hans',
            en: 'https://support.google.com/googleplay/answer/7018481?hl=en',
          },
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
    : `${title} · Tips · Haomeile`;
}

export function tipLinkHref(href: string | TipCopy, locale: 'zh' | 'en'): string {
  return typeof href === 'string' ? href : href[locale];
}

const TIP_VENDOR_MAP: Record<string, TipVendor[]> = {
  'antigravity-first-install-google-ai-pro': ['antigravity'],
  'google-ai-pro-switch-to-annual': ['antigravity'],
  'antigravity-paid-plan-starter-quota': ['antigravity'],
  'claude-max-google-play-recovery': ['claude'],
  'google-ai-claim-cloud-credits': ['antigravity'],
  'claude-sign-up-identity-verification': ['claude'],
  'google-ai-ultra-plan-evaluation': ['antigravity'],
  'apple-in-app-purchase-review': ['antigravity'],
  'google-ai-ultra-iphone-subscription': ['antigravity'],
  'claude-pro-iphone-apple-sign-in': ['claude'],
  'claude-pro-web-subscription': ['claude'],
  'chatgpt-plus-iphone-subscription': ['codex'],
  'android-subscriptions-google-play': ['claude', 'codex'],
};

export function tipVendors(slug: string): TipVendor[] {
  return TIP_VENDOR_MAP[slug] ?? [];
}

const TIP_SEO_TITLES: Record<string, TipCopy> = {
  'antigravity-first-install-google-ai-pro': {
    zh: 'Antigravity 桌面端登录与 Google AI Pro 订阅核对指南',
    en: 'Antigravity Desktop Sign-In & Google AI Pro Setup Guide',
  },
  'google-ai-pro-switch-to-annual': {
    zh: 'Google AI Pro 月付切换年付及 Google Play 续费核对步骤',
    en: 'Switch Google AI Pro from Monthly to Annual & Check Renewal',
  },
  'antigravity-paid-plan-starter-quota': {
    zh: 'Antigravity 开通 Ultra / Pro 仍显示 Starter Quota 怎么办（年龄验证排查）',
    en: 'Antigravity Paid Plan Still Shows Starter Quota: Age Verification Fix',
  },
  'claude-max-google-play-recovery': {
    zh: 'Claude 解封后 Max 订阅仍显示 Free 怎么办（Google Play 订单恢复）',
    en: 'Claude Max Still Shows Free After Appeal: Google Play Billing Recovery',
  },
  'google-ai-claim-cloud-credits': {
    zh: 'Google AI Pro 领取 Google Cloud API 赠金与预付余额排查',
    en: 'How to Claim Google AI Pro Cloud API Credits & Fix Prepaid Balance',
  },
  'claude-sign-up-identity-verification': {
    zh: 'Claude 注册或结账弹出身份验证怎么办（支持地区与证件核对）',
    en: 'Claude Identity Verification at Sign-Up or Checkout: What to Check',
  },
  'apple-in-app-purchase-review': {
    zh: 'Apple 内购订阅提示 Purchase Not Completed 审核与客服处理',
    en: 'App Store Purchase Not Completed: Review & Apple Support Steps',
  },
  'google-ai-ultra-iphone-subscription': {
    zh: 'iPhone 开通 Google AI Ultra 核对地区与 Antigravity 生效步骤',
    en: 'Subscribing to Google AI Ultra on iPhone for Antigravity: Region & Setup',
  },
  'chatgpt-plus-iphone-subscription': {
    zh: 'iPhone 订阅 ChatGPT Plus 与 Codex 账号到账核对指南',
    en: 'Subscribe to ChatGPT Plus on iPhone & Verify Codex Access',
  },
};

export function tipSeoTitle(
  tip: Pick<TipArticle, 'slug' | 'title' | 'englishTitle'>,
  locale: 'zh' | 'en',
): string {
  const custom = TIP_SEO_TITLES[tip.slug];
  if (custom) return custom[locale];
  return locale === 'zh' ? tip.title : tip.englishTitle;
}

export const TIP_PATHS = TIP_ARTICLES.map(({ slug }) => '/tips/' + slug);

export const TIP_TRANSLATIONS = Object.fromEntries(
  TIP_ARTICLES.flatMap((tip) => {
    const { title, englishTitle, summary, experience, steps } = tip;
    const seoZh = tipSeoTitle(tip, 'zh');
    const seoEn = tipSeoTitle(tip, 'en');
    return [
      [title, englishTitle],
      ...[summary, experience].map(({ zh, en }) => [zh, en]),
      ...steps.flatMap(({ text, link }) => [
        [text.zh, text.en],
        ...(link ? [[link.label.zh, link.label.en]] : []),
      ]),
      [tipPageTitle(title, 'zh'), tipPageTitle(englishTitle, 'en')],
      ...(seoZh !== title
        ? [[tipPageTitle(seoZh, 'zh'), tipPageTitle(seoEn, 'en')]]
        : []),
    ];
  }),
);

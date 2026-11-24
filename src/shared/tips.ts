interface TipCopy {
  zh: string;
  en: string;
}

export type TipVendor = 'claude' | 'codex' | 'antigravity';

interface TipArticle {
  slug: string;
  /** Written by this site; the author's own title appears only as a citation. */
  heading: TipCopy;
  sourceTitle: string;
  /** Link to the post without repeating a title this site does not want to carry. */
  hideSourceTitle?: true;
  summary: TipCopy;
  experience: TipCopy;
  steps: {
    text: TipCopy;
    link?: { href: string | TipCopy; label: TipCopy };
  }[];
  source: `https://x.com/i/article/${string}`;
  sourceAuthor: string;
  sourcePublishedAt: string;
  /** First added to this site, and last edited here. */
  publishedAt: string;
  modifiedAt: string;
}

export const TIP_ARTICLES: TipArticle[] = [
  {
    slug: 'google-ai-pro-change-credit-billing-account',
    heading: {
      zh: 'Google AI Pro 每月 10 美元赠金怎么领，结算账号失效怎么换',
      en: 'Claim the $10 monthly Google AI Pro credit and replace an inactive billing account',
    },
    sourceTitle:
      'Google AI Pro 每月免费领 $10 Cloud & AI 赠金保姆级教程（附旧结算账号失效换绑招行 Visa 实操）',
    summary: {
      zh: '每月开发者赠金在开发者福利页领取，要选一个可用的结算账号。AI Studio 里的预付款提示是给余额充值，不是领取赠金。',
      en: 'Claim the monthly credit on the developer benefits page with a working billing account. The prompt in AI Studio adds prepaid funds; it does not claim the credit.',
    },
    experience: {
      zh: '原文作者 @cybssky 记录：AI Studio 只显示预付款提示，旧结算账号也用不了。作者用同一个 Google 账号，在 Cloud Billing 给新的结算账号绑上自己的招行 Visa，回到开发者福利页选中这个账号后，卡片显示剩余赠金 10 美元。',
      en: 'The author of the original post, @cybssky, reports: AI Studio showed only a top-up prompt and the old billing account no longer worked. The author linked their China Merchants Bank Visa to a new Cloud Billing account under the same Google Account; after selecting it on the developer benefits page, the card showed $10 remaining.',
    },
    steps: [
      {
        text: {
          zh: '用订阅 Google AI Pro 的账号打开开发者福利页，在「福利 → 高级」找到每月赠金卡片。AI Studio 的「立即支付」会给预付费余额充值。',
          en: 'Sign in with the Google Account that pays for AI Pro. On your developer benefits page, open Premium and find the monthly credit. The Pay now button in AI Studio adds prepaid funds.',
        },
        link: {
          href: 'https://developers.google.com/program/my-benefits',
          label: {
            zh: '打开开发者福利',
            en: 'Open developer benefits',
          },
        },
      },
      {
        text: {
          zh: '如果原结算账号已失效，在 Cloud Billing 的「管理结算账号」里新建结算账号，按提示添加本人的付款方式。回到开发者福利页，在赠金卡片中选中新账号。想让以后的赠金也进这个账号，可以勾选「始终使用此结算账号」。',
          en: 'If your old billing account is inactive, open Manage billing accounts in Cloud Billing, create a billing account, and add your own payment method when prompted. Go back to the developer benefits page and select that account as the destination for the monthly credit. To use the same account for future credits, select Always use this billing account.',
        },
        link: {
          href: 'https://console.cloud.google.com/billing',
          label: {
            zh: '核对结算账号',
            en: 'Check billing accounts',
          },
        },
      },
      {
        text: {
          zh: '在同一结算账号的「抵用金」里查看到账金额和有效期。要跟踪当月花费，可以在「预算与提醒」设定金额和邮件提醒比例，达到阈值时会收到通知。',
          en: 'In Credits for the same billing account, check the amount and expiration date. To track monthly spending, open Budgets & alerts, set an amount and choose the thresholds for email notifications.',
        },
        link: {
          href: 'https://docs.cloud.google.com/billing/docs/how-to/budgets',
          label: {
            zh: '设置预算提醒',
            en: 'Set a budget alert',
          },
        },
      },
    ],
    source: 'https://x.com/i/article/2125099208315404288',
    sourceAuthor: '@cybssky',
    sourcePublishedAt: '2026-11-24T05:46:46Z',
    publishedAt: '2026-11-24T07:08:21Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'antigravity-first-install-google-ai-pro',
    heading: {
      zh: 'Antigravity 桌面端登录与 Google AI Pro 订阅核对指南',
      en: 'Antigravity Desktop Sign-In & Google AI Pro Setup Guide',
    },
    sourceTitle:
      'Google Antigravity 零基础教程：从下载安装到黑五 99 美元开 Pro，手把手一次讲清',
    summary: {
      zh: '先在支持地区用个人 Google 账号登录 Antigravity 桌面端，确认能收到回复；再用同一个账号订阅 Google AI Pro，最后回客户端核对可用模型和额度。',
      en: 'Sign in to the Antigravity desktop app with a personal Google Account in a supported location and check that it responds. Subscribe to Google AI Pro with the same account, then check models and limits in the app.',
    },
    experience: {
      zh: '原文作者 @xiaomovps 记录：订阅了一年的 Google AI Pro，Google One 页面显示年付 99.99 美元、5 TB 存储。作者在桌面端打开模型选择器看可用模型，再点「View Usage」查看额度。',
      en: 'The author of the original post, @xiaomovps, reports: after a one-year Google AI Pro subscription, Google One showed $99.99 per year and 5 TB of storage. In the desktop app, the author opened the model picker to see available models and used View Usage to check limits.',
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
    publishedAt: '2026-11-23T06:55:35Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'google-ai-pro-switch-to-annual',
    heading: {
      zh: 'Google AI Pro 月付切换年付及 Google Play 续费核对步骤',
      en: 'Switch Google AI Pro from Monthly to Annual & Check Renewal',
    },
    sourceTitle:
      '黑五 5 折 99.99 刀正规上车 Google AI Pro：美区白号不等 27 号两步升级实测',
    summary: {
      zh: '已有 Google AI Pro 月付的账号，到 Google One 的方案管理找年付选项。付款前核对本次扣款和续费价格，付款后到 Google Play 查下一次扣款。',
      en: 'With a monthly Google AI Pro plan, look for the annual option in Google One plan management. Check today’s charge and the renewal price before paying, then check the next charge in Google Play.',
    },
    experience: {
      zh: '原文作者 @heitieya 记录：11 月 22 日，月付开通后进入 Google One 的方案管理，看到了年付选项。收据上首年实付 99.99 美元，次年续费价是 199.99 美元。作者在 Google Play 取消续费后，又核对了一次已付费的到期日。',
      en: 'The author of the original post, @heitieya, reports: on November 22, after starting a monthly membership, plan management in Google One showed an annual option. The receipt showed $99.99 charged for the first year and $199.99 for renewal. The author turned off auto-renewal in Google Play and checked how long paid access would last.',
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
    publishedAt: '2026-11-22T14:55:18Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'antigravity-paid-plan-starter-quota',
    heading: {
      zh: 'Antigravity 付费后仍显示 Starter Quota 怎么办',
      en: 'Antigravity Still Shows Starter Quota After Paying: What to Check',
    },
    sourceTitle:
      '3 万字超干货 Antigravity 群峰× AI 精品短剧：280元打通双顶配模型池与 96G 云显卡，跑通电影级双语成片',
    summary: {
      zh: '付费后 Antigravity 仍显示 Starter Quota，先核对订阅和客户端是不是同一个个人 Google 账号，再看额度页有没有年龄验证提示，最后退出重新登录。这不是停用，不用申诉。',
      en: 'If Antigravity still shows Starter Quota after you pay, check that the plan and the app use the same personal Google Account, look for an age prompt on the quota page, then sign out and back in. This is not a suspension and needs no appeal.',
    },
    experience: {
      zh: '原文作者 @ElowenY20119 记录：Google One 已显示 Ultra 5x 生效，Antigravity 却仍是 Starter Quota，额度下方有一行提示要求先验证年龄。作者按提示验证，退出客户端重新登录后，付费额度出现了。',
      en: 'The author of the original post, @ElowenY20119, reports that Google One showed Ultra 5x as active while Antigravity still showed Starter Quota, with a message below the quota asking for age verification. After verifying and signing back in, the paid quota appeared.',
    },
    steps: [
      {
        text: {
          zh: '核对账号类型。官方 FAQ 说明，Google Workspace 等公司或学校账号的套餐不含 Antigravity 额度，默认只有有限的 Starter Quota；要用个人 Google 账号订阅的 Google AI Pro 或 Ultra。',
          en: 'Check the account type. The official FAQ says Google Workspace plans do not include Antigravity rate limits and get a limited starter quota by default. Use a personal Google Account with Google AI Pro or Ultra.',
        },
        link: {
          href: 'https://antigravity.google/docs/faq',
          label: { zh: '查看官方 FAQ', en: 'Read the official FAQ' },
        },
      },
      {
        text: {
          zh: '在 Google One 确认订阅档位、会员账号，以及是正式付费还是试用。打开 Antigravity 的「Settings → Account」，核对客户端邮箱是否和会员账号一致，同时查看当前额度档位。',
          en: 'In Google One, check the plan, the subscribed account, and whether it is paid or a trial. In Antigravity, open Settings → Account and compare both the signed-in email and the quota tier.',
        },
        link: {
          href: 'https://one.google.com/settings',
          label: { zh: '打开 Google One', en: 'Open Google One' },
        },
      },
      {
        text: {
          zh: '如果免费额度下方明确提示验证年龄，用同一个 Google 账号打开官方验证页，选页面提供的验证方式，按提示提交。未满 18 岁不能使用 Antigravity。',
          en: 'If the message beneath Starter Quota explicitly asks for age verification, open Google’s verification page with the same account and follow one of the options offered there. Antigravity is unavailable to users under 18.',
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
          zh: '在 Antigravity 退出账号，用已开通订阅的账号重新登录。回到「Settings → Account」查看套餐及额度有没有更新，再新建一个对话试试。',
          en: 'Sign out of Antigravity, then sign back in with the subscribed account. Return to Settings → Account to check whether the tier and quota have updated, then start a new conversation.',
        },
      },
      {
        text: {
          zh: '如果是试用期内升级，带 Google 标识的论坛回复说，残留的试用记录可能让额度停在旧档，可联系 Google One 支持核对。这不是停用，不用提交 Antigravity 申诉表单。',
          en: 'If you upgraded during a trial, a forum reply from a user labelled Google says a leftover trial record can keep the old quota, and suggests contacting Google One Support. This is not a suspension, so the Antigravity appeal form is not needed.',
        },
        link: {
          href: 'https://discuss.ai.google.dev/t/202892',
          label: { zh: '查看论坛回复', en: 'Read the forum reply' },
        },
      },
    ],
    source: 'https://x.com/i/article/2123346009258602496',
    sourceAuthor: '@ElowenY20119',
    sourcePublishedAt: '2026-11-19T12:10:16Z',
    publishedAt: '2026-11-22T11:16:38Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'claude-max-google-play-recovery',
    heading: {
      zh: 'Claude 解封后 Max 订阅仍显示 Free 怎么办（Google Play 订单恢复）',
      en: 'Claude Max Still Shows Free After Appeal: Google Play Billing Recovery',
    },
    sourceTitle:
      'Claude 封号申诉成功了！丢掉的 125 刀 Max 订阅，磨了 5 天也回来了',
    summary: {
      zh: '解封后 Max 显示成 Free，先核对 Google Play 的 Claude 订单，再登录原账号，从 Claude 网页左下角「获取帮助」请客服核对订单和订阅权益。',
      en: 'If Max shows Free after reinstatement, check the Claude order in Google Play, then sign in to the same account and ask support through Get help on Claude’s website to match the order to the plan.',
    },
    experience: {
      zh: '原文作者 @qianshuixia2026 记录：11 月 13 日收到停用通知，Google Play 也发信说 Claude 订阅将取消。次日 Anthropic 回复说停用是误判，作者重新登录，但还剩 9 天的 Max 显示成了 Free。作者用原账号从 Claude 网页的「获取帮助」联系客服，客服查到由 Google Play 结算的记录，说会把问题转给人工团队。11 月 17 日晚上再查时 Max 已恢复，具体是哪一步起了作用，作者没收到确认。',
      en: 'The author of the original post, @qianshuixia2026, reports: a suspension notice arrived on November 13, along with a Google Play email saying the Claude subscription would be canceled. Anthropic replied the next day that the suspension was a mistake. The author could sign in again, but Max, with nine days left, showed Free. Through Get help on Claude’s website, support found the Google Play billing record and said it would go to a human team. Max was back on the evening of November 17. The author never got confirmation of which step restored it.',
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
    publishedAt: '2026-11-23T02:51:55Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'google-ai-claim-cloud-credits',
    heading: {
      zh: 'Google AI Pro 领取 Google Cloud API 赠金与预付余额排查',
      en: 'How to Claim Google AI Pro Cloud API Credits & Fix Prepaid Balance',
    },
    sourceTitle:
      '万字干货｜Gemini 4 + Antigravity，从 0 到 1 跑通全自动出片（附 Agent 指令）',
    summary: {
      zh: '用订阅 Google AI Pro 的账号在 AI Studio 领取 Cloud 赠金，选对实际付费的结算账号，再到 Cloud Billing 核对是否到账。',
      en: 'Claim the Cloud credit in AI Studio with the account that has Google AI Pro, choose the billing account that pays for the project, then confirm it in Cloud Billing.',
    },
    experience: {
      zh: '原文作者 @leaf_sanren 记录：账单里显示赠金已经生效，可以抵扣 Gemini API 调用费。作者的结算账户是预付费，页面还要求余额大于零，补了余额才恢复调用。',
      en: 'The author of the original post, @leaf_sanren, reports: the credit showed as active in Billing and could be used against Gemini API charges. The author’s prepaid billing account still needed a positive balance, and API calls resumed only after adding funds.',
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
    publishedAt: '2026-11-20T11:24:40Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'claude-portal-suspension-review',
    heading: {
      zh: 'Claude 验证身份后组织被停用：怎么用 Request a review 申请复核',
      en: 'Claude organization on hold after identity verification: how to request a review',
    },
    sourceTitle:
      'Claude Portal 门户认证后被停用：我的中国护照 KYC 与申诉解封全过程',
    summary: {
      zh: 'Claude 提示组织已停用时，登录原账号，在受影响的组织旁点「Request a review」，如实写账号用途和看到的停用提示，提交后留好受理邮件。',
      en: 'If Claude shows an organization on hold, sign in to the original account, select “Request a review” beside it, describe your actual use and the message you saw, and keep the acknowledgment email.',
    },
    experience: {
      zh: '原文作者 @theEarlyPanda 记录：用了八个月的 Claude Pro 突然要求验证身份，用自己的中国护照在手机上完成验证，回到 Claude 却看到组织已停用。复核表单有两个问题：第一栏写平时怎么用 Claude 查技术文档、审代码和排查前端问题，第二栏附上自己发教程的 YouTube 频道和 X 账号。从受理邮件到恢复邮件隔了 3 小时 32 分钟，重新登录后账号能用了。',
      en: 'The author of the original post, @theEarlyPanda, reports: after eight months on Claude Pro, an identity check appeared. The author completed it on a phone with their own Chinese passport and returned to find the organization on hold. The review form had two questions: the author described using Claude to read technical docs, review code and debug front-end issues, and linked the YouTube channel and X profile where they publish tutorials. The restoration email came 3 hours and 32 minutes after the acknowledgment, and the account worked after signing back in.',
    },
    steps: [
      {
        text: {
          zh: '在 Claude 里登录原账号，查看组织列表。需要验证身份时，核对组织名称，按页面提示用自己的有效证件完成验证。若列表显示某个组织已停用，点它旁边的「Request a review」打开复核表单。',
          en: 'Sign in to the original Claude account and check the organization list. If you see an identity prompt, confirm the organization and follow the instructions with your own valid ID. If the list shows an organization on hold, select “Request a review” beside its name.',
        },
        link: {
          href: 'https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals',
          label: {
            zh: '查看组织停用后的复核入口',
            en: 'Find the organization review option',
          },
        },
      },
      {
        text: {
          zh: '如果表单问你用账号做什么，挑一两件自己实际做过的事写清楚。例如你用它排查过代码问题，就写遇到了什么问题、让 Claude 帮你检查了哪一段。',
          en: 'If the form asks how you use the account, describe one or two things you actually did. If you used Claude to debug code, for example, explain what went wrong and what you asked it to check.',
        },
      },
      {
        text: {
          zh: '在补充说明栏写下验证后看到的停用提示，请求复核这个组织。如果你有相关的公开作品，也愿意分享，可以附上链接并说明它和账号用途的关系。提交后留存受理邮件，收到审核结果再登录查看。',
          en: 'In the additional information field, describe the suspension message you saw after verification and ask for a review of that organization. If you have relevant public work you want to share, link it and explain how it relates to your use. Keep the acknowledgment email and check access again when you receive the decision.',
        },
      },
    ],
    source: 'https://x.com/i/article/2122625340376031232',
    sourceAuthor: '@theEarlyPanda',
    sourcePublishedAt: '2026-11-17T09:47:26Z',
    publishedAt: '2026-11-23T19:05:30Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'claude-sign-up-identity-verification',
    heading: {
      zh: 'Claude 注册或结账弹出身份验证怎么办（支持地区与证件核对）',
      en: 'Claude Identity Verification at Sign-Up or Checkout: What to Check',
    },
    sourceTitle: '封了20多个号换来的全网Claude防封分流保姆级教程全网整合版',
    hideSourceTitle: true,
    summary: {
      zh: '身份验证窗口可能出现在刚注册完，也可能在结账时。先分清提示要的是验证身份还是处理付款，再从原账号按官方要求完成，最后核对有没有扣款。',
      en: 'The identity prompt can appear right after sign-up or at checkout. Check whether it asks for identity or payment, complete it from the original account, then confirm whether you were charged.',
    },
    experience: {
      zh: '原文作者 @qifenglelelelel 记录：碰到过两次身份验证：一个账号在开 Pro 结账时弹出验证窗口，另一个刚注册完、还没走到付款。作者两次都停在这一步。',
      en: 'The author of the original post, @qifenglelelelel, reports: two identity prompts appeared: one account got it at checkout for Pro, the other right after sign-up, before payment. The author stopped at the prompt both times.',
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
    publishedAt: '2026-11-20T11:24:40Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'google-ai-ultra-plan-evaluation',
    heading: {
      zh: 'Google AI Ultra 值不值得开：先对照模型、用量和账单',
      en: 'Is Google AI Ultra worth it? Compare models, usage and cost first',
    },
    sourceTitle: '为什么不建议大家去开通 Google AI Ultra',
    summary: {
      zh: '下单前看目标模型、当前用量和账单。适合正在比较 Google AI Pro 和 Ultra 的 Antigravity 用户。',
      en: 'Compare the models, your current usage and the checkout price before paying. This is for Antigravity users deciding between Google AI Pro and Ultra.',
    },
    experience: {
      zh: '原文作者 @leo_xiaolei 记录：订阅 Ultra 5X 后，用 Antigravity 的 Carbon 跑编码任务，对照 Linux.do 上的一篇文章做了复测，主要看多 Agent 和代码重构会吃掉多少额度，再算云盘和 Colab 这些权益值不值。',
      en: 'The author of the original post, @leo_xiaolei, reports: with an Ultra 5X subscription, the author ran coding tasks with Carbon in Antigravity and retested a Linux.do article, looking at how much quota parallel agents and refactoring used and whether storage and Colab were worth paying for.',
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
    publishedAt: '2026-11-20T11:24:40Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'apple-in-app-purchase-review',
    heading: {
      zh: 'Apple 内购订阅提示 Purchase Not Completed 审核与客服处理',
      en: 'App Store Purchase Not Completed: Review & Apple Support Steps',
    },
    sourceTitle:
      '外区苹果内购被风控怎么破？8 步挖出隐藏真人客服：实测拿下土区 Google AI Ultra，通杀一切订阅拦截',
    hideSourceTitle: true,
    summary: {
      zh: 'iPhone 内购提示「Purchase Not Completed」时，先从弹窗提交审核请求，再查这笔交易有没有成功，需要时联系 Apple 支持。',
      en: 'If an iPhone purchase shows “Purchase Not Completed”, request a review from the prompt, check whether the purchase went through, and contact Apple Support if needed.',
    },
    experience: {
      zh: '原文作者 @Delroy715 记录：在 iPhone 上订阅 Google AI Ultra 时弹出这个提示。提交审核请求后，作者又从 Apple 支持网站找到了人工客服，第三天收到 Apple 的通知，再试一次，订阅就开通了。',
      en: 'The author of the original post, @Delroy715, reports: the prompt appeared while subscribing to Google AI Ultra on iPhone. After requesting a review, the author reached a support advisor through Apple’s website. Apple sent a notification on the third day, and the subscription went through on the next try.',
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
    publishedAt: '2026-11-22T11:16:38Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'claude-pro-apple-receipt-refund',
    heading: {
      zh: 'Claude Pro 付款后仍是 Free：核对 Apple 收据和申请退款',
      en: 'Claude Pro still Free after paying: check Apple receipts and request a refund',
    },
    sourceTitle: '付了钱，Pro 仍是 Free：我在 Claude 和 Apple 之间的申诉经历',
    summary: {
      zh: '收据总额和 PayPal 扣款对不上时，先看有没有账户余额抵扣；再请 Claude 支持核对订单关联的账号，最后到 Apple「报告问题」申请退款。',
      en: 'If the receipt total and the PayPal charge differ, check for account credit first. Then ask Claude support which account the order is linked to, and request a refund through Apple’s Report a Problem.',
    },
    experience: {
      zh: '原文作者 @SHANQINGJINXIA 记录：在 iPhone 上买了 Claude Pro，收据写着 21.65 美元，账号里却还是 Free。11 月 2 日收到了升级 Max 失败的退款；后来重新买 Pro，Apple 用旧 Pro 订单退回的 11.85 美元余额抵了部分款，PayPal 只扣了余下的 9.80 美元。退出又登录同一个 Claude 账号，还是 Free。Apple 拒绝了这笔新订单的首次退款申请，作者 11 月 4 日提交复核，发文时还在等结果。',
      en: 'The author of the original post, @SHANQINGJINXIA, reports: a Claude Pro purchase on iPhone had a $21.65 receipt, but the account still showed Free. A refund for a failed Max upgrade arrived on November 2. When the author bought Pro again, Apple applied an $11.85 credit from the old Pro order and charged the remaining $9.80 to PayPal. Signing out and back in to the same Claude account still showed Free. Apple declined the first refund request for the new order; the author asked for another review on November 4 and was waiting when the post was published.',
    },
    steps: [
      {
        text: {
          zh: '找出每笔 Apple 收据，分别记下套餐、含税金额和付款方式。如果一笔订单同时用了账户余额和 PayPal，把两项相加再和收据总额核对。上一笔退款如果已作为余额抵扣，PayPal 就只会显示这次实际扣走的部分。',
          en: 'Open each Apple receipt and note the plan, total after tax and payment method. If one order used both account credit and PayPal, add those amounts and compare the sum with the receipt. PayPal shows only the part it paid.',
        },
      },
      {
        text: {
          zh: '用购买时的账号重新登录 Claude，查看套餐。如果仍显示 Free，保留套餐页面和对应的收据，请 Claude 支持核对这笔订单关联的账号和激活状态。升级 Max 和后来购买 Pro 各用各的收据。',
          en: 'Sign back into the Claude account you used for the purchase and check the plan. If it still shows Free, save the plan screen and the matching receipt. Ask Claude support which account the order was linked to and whether it was activated. Use separate receipts for a Max upgrade and a later Pro purchase.',
        },
      },
      {
        text: {
          zh: '用实际扣款的 Apple 账户登录「报告问题」，选「请求退款」，选中未开通的那笔订阅。第一次申请被拒后，若页面提供复核入口，说明收据已开出、同一 Claude 账号仍显示 Free。提交后到「查看申请状态」查这笔订单的进度。',
          en: 'Sign in to Apple’s Report a Problem with the account that paid. Choose Request a refund and select the subscription that was never activated. If Apple declines and offers another review, explain that you received a receipt and the same Claude account still shows Free. Track that order under Check Status of Claims.',
        },
        link: {
          href: 'https://reportaproblem.apple.com/',
          label: {
            zh: '到 Apple 查看退款申请',
            en: 'Check a refund request with Apple',
          },
        },
      },
    ],
    source: 'https://x.com/i/article/2117889766700290048',
    sourceAuthor: '@SHANQINGJINXIA',
    sourcePublishedAt: '2026-11-04T08:07:20Z',
    publishedAt: '2026-11-23T15:08:20Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'google-ai-ultra-iphone-subscription',
    heading: {
      zh: 'iPhone 开通 Google AI Ultra 核对地区与 Antigravity 生效步骤',
      en: 'Subscribing to Google AI Ultra on iPhone for Antigravity: Region & Setup',
    },
    sourceTitle:
      '410元开通谷歌 Ultra 20×：爽用用96GB云端显卡，跑通了开源生图和视频',
    summary: {
      zh: '先核对地区，再确认两个账号：Apple 账户付钱，个人 Google 账号收会员权益。',
      en: 'Check availability first. Your Apple Account pays and your personal Google Account receives the membership.',
    },
    experience: {
      zh: '原文作者 @yangleiocx3 记录：用 Apple 内购开通了 Google AI Ultra，付款前核对了方案和月价，开通后用同一个 Google 账号跑通了 Colab。要用 Antigravity，还要另外查它的地区和模型要求。',
      en: 'The author of the original post, @yangleiocx3, reports: Google AI Ultra was bought through an Apple in-app purchase after checking the plan and monthly price, and a Colab notebook then ran with the same Google Account. Antigravity has its own region and model requirements to check.',
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
    publishedAt: '2026-11-20T11:14:08Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'claude-pro-iphone-apple-sign-in',
    heading: {
      zh: 'iPhone 用 Apple 登录订阅 Claude Pro，电脑端怎么用同一账号',
      en: 'Claude Pro on iPhone with Sign in with Apple: use the same account on a computer',
    },
    sourceTitle: 'Claude Pro 保姆级订阅教程 ｜ 性价比版',
    summary: {
      zh: '用 Apple 登录注册 Claude 时如果选了「隐藏邮件地址」，先查到 Apple 生成的转发邮箱，再在电脑上用同一个账号登录 Claude Code。',
      en: 'If you chose Hide My Email when signing up for Claude with Apple, find the relay address first, then sign in to Claude Code on your computer with the same account.',
    },
    experience: {
      zh: '原文作者 @xuxingai 记录：用 Apple 登录注册 Claude 时选了「隐藏邮件地址」，在 iPhone 上开了 Pro，账号里显示的是 Apple 生成的转发邮箱。后来用邮箱登录时填这个地址，再到接收转发邮件的邮箱看登录邮件。',
      en: 'The author of the original post, @xuxingai, reports: the account was created with Sign in with Apple and Hide My Email, Pro was bought on iPhone, and Claude showed the relay address Apple generated. To sign in by email, the author entered that address and checked the inbox Apple forwards to.',
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
    publishedAt: '2026-11-22T11:16:38Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'claude-pro-web-subscription',
    heading: {
      zh: 'Claude Pro 网页端银行卡订阅：付款前后核对什么',
      en: 'Paying for Claude Pro on the web by card: what to check before and after',
    },
    sourceTitle:
      '拒绝代充！没有 iPhone 也能自己开通 Claude Pro，一张 Mastercard 亲测跑通',
    summary: {
      zh: '人在支持地区时，用自己的邮箱和手机号注册。结账前核对发卡地区、账单地址和含税总价。',
      en: 'Sign up with your own email and phone number in a supported location. Check the card’s issuing country, billing address and total with tax before paying.',
    },
    experience: {
      zh: '原文作者 @alin_zone 记录：用自己名下的新加坡 Mastercard 开通了 Claude Pro 月付，结账时显示应付 30 新元。付完回 Claude 看到了 Pro，又在银行记录里核对了这笔交易。',
      en: 'The author of the original post, @alin_zone, reports: monthly Claude Pro was paid for with a Singapore-issued Mastercard in the author’s own name. Checkout showed SGD 30. After paying, Claude showed Pro, and the author checked the transaction with the bank.',
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
    publishedAt: '2026-11-20T11:14:08Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'chatgpt-plus-iphone-subscription',
    heading: {
      zh: 'iPhone 订阅 ChatGPT Plus 与 Codex 账号到账核对指南',
      en: 'Subscribe to ChatGPT Plus on iPhone & Verify Codex Access',
    },
    sourceTitle:
      '支付宝购买美区 Apple 礼品卡并订阅 ChatGPT：保姆级20张图文教程',
    hideSourceTitle: true,
    summary: {
      zh: '先看自己的 App Store 能不能内购，结账前核对价格，付完分别查 Apple 订单和 ChatGPT 套餐。',
      en: 'Check whether your App Store offers in-app purchase, review the price, then verify both the Apple order and the ChatGPT plan.',
    },
    experience: {
      zh: '原文作者 @Astronaut_1216 以美区 App Store 做演示，从把礼品卡兑进 Apple 账户、在 ChatGPT App 选 Plus，到回原账号检查套餐。操作时以你自己的商店和账号为准。',
      en: 'The author of the original post, @Astronaut_1216, reports: using the U.S. App Store as an example, the post shows redeeming a gift card into an Apple Account, choosing Plus in ChatGPT and checking the plan on the same account. Use your own storefront and account.',
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
    publishedAt: '2026-11-20T11:14:08Z',
    modifiedAt: '2026-11-24T07:32:00Z',
  },
  {
    slug: 'android-subscriptions-google-play',
    heading: {
      zh: '安卓通过 Google Play 订阅 Claude 或 ChatGPT：付款与到账核对',
      en: 'Subscribe to Claude or ChatGPT on Android through Google Play: payment and access checks',
    },
    sourceTitle: '别再找代充了！ChatGPT / Claude 官方订阅，其实比你想象中简单',
    summary: {
      zh: '从官方 App 进入 Google Play 付款，看清付款的 Google 账号和要开通的 Claude 或 ChatGPT 账号，付完核对到账，避免两个渠道同时扣款。',
      en: 'Start in the official app, check the paying Google Account and the Claude or ChatGPT account that receives the plan, then confirm access and avoid overlapping charges.',
    },
    experience: {
      zh: '原文作者 @suversal 平时用 Safari 网页付款，也整理了安卓用户从 Google Play 开通、核对到账和管理续费的入口。',
      en: 'The author of the original post, @suversal, reports: the author usually pays on the web in Safari and also put together the Google Play options for Android users to pay, confirm the plan and manage renewal.',
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
    publishedAt: '2026-11-20T11:24:40Z',
    modifiedAt: '2026-11-24T07:32:00Z',
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

export function tipLinkHref(
  href: string | TipCopy,
  locale: 'zh' | 'en',
): string {
  return typeof href === 'string' ? href : href[locale];
}

const TIP_VENDOR_MAP: Record<string, TipVendor[]> = {
  'google-ai-pro-change-credit-billing-account': ['antigravity'],
  'antigravity-first-install-google-ai-pro': ['antigravity'],
  'google-ai-pro-switch-to-annual': ['antigravity'],
  'antigravity-paid-plan-starter-quota': ['antigravity'],
  'claude-max-google-play-recovery': ['claude'],
  'google-ai-claim-cloud-credits': ['antigravity'],
  'claude-portal-suspension-review': ['claude'],
  'claude-sign-up-identity-verification': ['claude'],
  'google-ai-ultra-plan-evaluation': ['antigravity'],
  'apple-in-app-purchase-review': ['antigravity'],
  'claude-pro-apple-receipt-refund': ['claude'],
  'google-ai-ultra-iphone-subscription': ['antigravity'],
  'claude-pro-iphone-apple-sign-in': ['claude'],
  'claude-pro-web-subscription': ['claude'],
  'chatgpt-plus-iphone-subscription': ['codex'],
  'android-subscriptions-google-play': ['claude', 'codex'],
};

export function tipVendors(slug: string): TipVendor[] {
  return TIP_VENDOR_MAP[slug] ?? [];
}

export const TIP_PATHS = TIP_ARTICLES.map(({ slug }) => '/tips/' + slug);

export const TIP_TRANSLATIONS = Object.fromEntries(
  TIP_ARTICLES.flatMap(({ heading, summary, experience, steps }) => [
    ...[heading, summary, experience].map(({ zh, en }) => [zh, en]),
    [tipPageTitle(heading.zh, 'zh'), tipPageTitle(heading.en, 'en')],
    ...steps.flatMap(({ text, link }) => [
      [text.zh, text.en],
      ...(link ? [[link.label.zh, link.label.en]] : []),
    ]),
  ]),
);

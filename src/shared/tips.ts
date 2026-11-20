interface TipCopy {
  zh: string;
  en: string;
}

interface TipArticle {
  slug: string;
  title: TipCopy;
  summary: TipCopy;
  experience: TipCopy;
  steps: { text: TipCopy; link?: { href: string; label: TipCopy } }[];
  source: `https://x.com/i/article/${string}`;
  sourceAuthor: string;
  sourceDate: string;
  sourceViews: number;
}

export const TIP_ARTICLES: TipArticle[] = [
  {
    slug: 'google-ai-ultra-iphone-subscription',
    title: {
      zh: '用 iPhone 开通 Google AI Ultra，怎么确认 Antigravity 到账',
      en: 'Subscribe to Google AI Ultra on iPhone and check Antigravity access',
    },
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
    sourceDate: '2026-11-04',
    sourceViews: 135910,
  },
  {
    slug: 'claude-pro-web-subscription',
    title: {
      zh: 'Claude Pro 网页开通，从注册到银行卡付款',
      en: 'Sign up for Claude Pro and pay by card on the web',
    },
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
    sourceDate: '2026-11-02',
    sourceViews: 67316,
  },
  {
    slug: 'chatgpt-plus-iphone-subscription',
    title: {
      zh: 'iPhone 上开通 ChatGPT Plus，再用同一个号进 Codex',
      en: 'Buy ChatGPT Plus on iPhone and use the same account for Codex',
    },
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
    sourceDate: '2026-10-31',
    sourceViews: 13859,
  },
];

export function tipPageTitle(title: string, locale: 'zh' | 'en'): string {
  return locale === 'zh'
    ? `${title} · 使用小技巧 · 号没了`
    : `${title} · Tips · 号没了`;
}

export const TIP_PATHS = TIP_ARTICLES.map(({ slug }) => '/tips/' + slug);

export const TIP_TRANSLATIONS = Object.fromEntries(
  TIP_ARTICLES.flatMap(({ title, summary, experience, steps }) => [
    ...[title, summary, experience].map(({ zh, en }) => [zh, en]),
    ...steps.flatMap(({ text, link }) => [
      [text.zh, text.en],
      ...(link ? [[link.label.zh, link.label.en]] : []),
    ]),
    [tipPageTitle(title.zh, 'zh'), tipPageTitle(title.en, 'en')],
  ]),
);

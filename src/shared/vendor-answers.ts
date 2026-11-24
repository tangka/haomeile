import type { Vendor } from '../worker/types';

interface Copy {
  zh: string;
  en: string;
}
interface AnswerLink {
  href: string;
  label: Copy;
}
interface AnswerItem {
  term?: Copy;
  text: Copy;
  links?: AnswerLink[];
}
/** One public post, with only the dates its author wrote down. */
export interface AppealTimelineRow {
  source: string;
  suspended: string | null;
  appealed: string | null;
  seen: string;
  status: Copy;
}
export interface VendorAnswer {
  question: Copy;
  lead: Copy;
  stepsTitle: Copy;
  steps: AnswerItem[];
  sections: { title: Copy; intro?: Copy; items: AnswerItem[] }[];
  timeline?: { title: Copy; intro: Copy; rows: AppealTimelineRow[] };
  /** Day the official pages quoted here were last read. */
  checkedOn: string;
}

const FAQ = 'https://antigravity.google/docs/faq';
const ANTIGRAVITY_FORM = 'https://forms.gle/hGzM9MEUv2azZsrb9';
const FORUM_REPLY = 'https://discuss.ai.google.dev/t/203618';
const OPENAI_ACCOUNT_HELP =
  'https://help.openai.com/en/articles/10562188-openai-account-warnings-safety-suspensions-and-closures';
const CLAUDE_APPEALS =
  'https://support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals';
const CLAUDE_CODE_ERRORS =
  'https://code.claude.com/docs/en/errors#this-organization-has-been-disabled';

/** First-party answers. Statements come from the linked official page, or say who said it. */
export const VENDOR_ANSWERS: Partial<Record<Vendor, VendorAnswer>> = {
  antigravity: {
    question: {
      zh: 'Antigravity 提示 403 或服务停用，怎么办？',
      en: 'Antigravity says 403 or “service has been disabled”: what to do',
    },
    lead: {
      zh: '个人 Google 账号看到“This service has been disabled in this account for violation of Terms of Service”，先断开第三方工具的授权，再用受影响的账号提交一次 Google 官方申诉表单。带 Google 标识的论坛回复说，自动处理大约要 48 到 72 小时，有时更久，不会发邮件通知；通过后，下次登录时自动恢复。',
      en: 'If a personal Google Account shows “This service has been disabled in this account for violation of Terms of Service”, remove third-party access first, then submit Google’s official appeal form once from the affected account. A forum reply from a user labelled Google says automated processing takes about 48 to 72 hours, sometimes longer, and that no email is sent. If approved, access returns the next time you sign in.',
    },
    stepsTitle: { zh: '按这个顺序处理', en: 'Do this in order' },
    steps: [
      {
        text: {
          zh: '看清报错。只有写着违反服务条款、服务停用的 403 才需要走这个申诉；其他提示见下一节。',
          en: 'Read the exact error. This appeal is for a 403 that says the service was disabled for a terms violation. Other messages are covered below.',
        },
      },
      {
        text: {
          zh: '到 Google 账号的第三方连接页，移除不再使用的第三方工具和代理授权。官方 FAQ 说明，不能用第三方软件接入 Antigravity 登录。',
          en: 'Open your Google Account connections and remove third-party tools and proxies. The official FAQ says third-party software may not be used with an Antigravity login.',
        },
        links: [
          {
            href: 'https://myaccount.google.com/permissions',
            label: { zh: '检查第三方连接', en: 'Check connections' },
          },
          { href: FAQ, label: { zh: '官方 FAQ', en: 'Official FAQ' } },
        ],
      },
      {
        text: {
          zh: '用受影响的账号登录，提交一次官方申诉表单。表单写明，恢复后再次违规会被永久停用。',
          en: 'Sign in with the affected account and submit the official form once. The form states that repeated violations after a suspension is lifted lead to a permanent suspension.',
        },
        links: [
          {
            href: ANTIGRAVITY_FORM,
            label: {
              zh: 'Antigravity 申诉表单',
              en: 'Antigravity appeal form',
            },
          },
        ],
      },
      {
        text: {
          zh: '不要重复提交。论坛回复说，重复提交不会加快处理，每个账号只有一次通过申诉恢复的机会。',
          en: 'Do not resubmit. The forum reply says duplicates do not speed up review and each account is eligible for one appeal reinstatement.',
        },
        links: [
          {
            href: FORUM_REPLY,
            label: { zh: '查看论坛回复', en: 'Read the forum reply' },
          },
        ],
      },
      {
        text: {
          zh: '等待期过后，退出客户端再登录，看是否恢复。由 Google Cloud 组织或 Gemini Enterprise 管理的账号，改为联系 Google Cloud 支持。',
          en: 'After the wait, sign out of the client and back in to check. If a Google Cloud organization or Gemini Enterprise manages your account, contact Google Cloud Support instead.',
        },
        links: [
          {
            href: 'https://console.cloud.google.com/support',
            label: { zh: 'Google Cloud 支持', en: 'Google Cloud Support' },
          },
        ],
      },
    ],
    sections: [
      {
        title: { zh: '先分清是哪一种提示', en: 'Which message do you have?' },
        items: [
          {
            term: { zh: '403 服务停用', en: '403, service disabled' },
            text: {
              zh: '提示违反服务条款。按上面的步骤申诉。',
              en: 'Cites a terms violation. Follow the appeal steps above.',
            },
          },
          {
            term: {
              zh: '所在地区不可用',
              en: 'Not available in your location',
            },
            text: {
              zh: '不是封号。核对所在地和 Google 账号关联的国家是否在官方支持名单里，账号年龄需满 18 岁。',
              en: 'Not a ban. Check that your location and your account’s associated country are on the official list and that the account holder is 18 or over.',
            },
            links: [
              {
                href:
                  FAQ +
                  '#what-is-google-antigravitys-geographical-availability',
                label: { zh: '官方支持地区', en: 'Supported locations' },
              },
            ],
          },
          {
            term: { zh: '429', en: '429' },
            text: {
              zh: '额度用完，不是封号。到模型菜单的用量页看剩余额度和恢复时间。',
              en: 'Quota used up, not a ban. Check remaining usage and reset times in the model menu.',
            },
            links: [
              {
                href: 'https://antigravity.google/docs/plans',
                label: { zh: '官方额度说明', en: 'Official quota rules' },
              },
            ],
          },
          {
            term: {
              zh: '付费后仍是 Starter Quota',
              en: 'Paid, but Starter Quota',
            },
            text: {
              zh: '不是停用，不用申诉。先核对订阅和客户端是不是同一个个人账号。',
              en: 'Not a suspension, so no appeal is needed. Check that the plan and the app use the same personal account.',
            },
            links: [
              {
                href: '/tips/antigravity-paid-plan-starter-quota',
                label: {
                  zh: 'Starter Quota 排查步骤',
                  en: 'Starter Quota steps',
                },
              },
            ],
          },
        ],
      },
    ],
    timeline: {
      title: { zh: '别人等了多久', en: 'How long others waited' },
      intro: {
        zh: '下面只列原帖写明的日期，没写的标为“未写明”。都是作者自述，未经本站核实，条数很少，不能当作成功率。',
        en: 'Only dates stated in each post are listed. These are unverified personal accounts and too few to indicate a success rate.',
      },
      rows: [
        {
          source: 'https://x.com/i/status/2122577253800526118',
          suspended: '2026-11-17',
          appealed: null,
          seen: '2026-11-18',
          status: {
            zh: '重新登录后可用，原帖未说明是否两个账号都恢复',
            en: 'Usable after signing in again; the post does not say whether both accounts recovered',
          },
        },
        {
          source: 'https://discuss.ai.google.dev/t/202911',
          suspended: null,
          appealed: null,
          seen: '2026-11-20',
          status: {
            zh: '第一次申诉一天后恢复，隔天再次停用，未恢复',
            en: 'Restored a day after the first appeal, disabled again the next day, not restored',
          },
        },
        {
          source: 'https://discuss.ai.google.dev/t/203618',
          suspended: '2026-11-18',
          appealed: '2026-11-18',
          seen: '2026-11-22',
          status: { zh: '未恢复', en: 'Not restored' },
        },
        {
          source: 'https://discuss.ai.google.dev/t/203919',
          suspended: '2026-11-17',
          appealed: '2026-11-18',
          seen: '2026-11-23',
          status: { zh: '未恢复', en: 'Not restored' },
        },
        {
          source: 'https://discuss.ai.google.dev/t/204136',
          suspended: null,
          appealed: '2026-11-20',
          seen: '2026-11-24',
          status: { zh: '未恢复', en: 'Not restored' },
        },
        {
          source: 'https://discuss.ai.google.dev/t/195031',
          suspended: null,
          appealed: '2026-10-21',
          seen: '2026-10-29',
          status: { zh: '未恢复', en: 'Not restored' },
        },
      ],
    },
    checkedOn: '2026-11-24',
  },
  codex: {
    question: {
      zh: 'Codex 或 ChatGPT 账号被停用，怎么办？',
      en: 'Codex or ChatGPT account deactivated: what to do',
    },
    lead: {
      zh: '先找 OpenAI 发来的通知邮件，用邮件里的申诉链接申请复核。OpenAI 官方说明：看不到那封邮件时，用官方申诉表单；进不去账号又没收到邮件时，从帮助中心联系支持。申请复核不保证账号会恢复。',
      en: 'Find the notification email from OpenAI and use its appeal link. OpenAI’s help page says: if you cannot access that email, use the appeal form; if you lost access without an email, contact support through the Help Center. Requesting a review does not guarantee the account will be restored.',
    },
    stepsTitle: { zh: '按这个顺序处理', en: 'Do this in order' },
    steps: [
      {
        text: {
          zh: '看通知写的是哪一种：警告、限时停用，还是永久关闭。警告不等于账号被停用。',
          en: 'Check which notice you have: a warning, a temporary suspension or a closure. A warning by itself does not mean the account is suspended.',
        },
        links: [
          {
            href: OPENAI_ACCOUNT_HELP,
            label: { zh: 'OpenAI 官方说明', en: 'OpenAI help page' },
          },
        ],
      },
      {
        text: {
          zh: '用对应邮件里的申诉链接申请复核。收到多封通知时，用你想复核的那一封。看不到邮件时，用官方申诉表单。',
          en: 'Use the appeal link in the matching email. If you got several notices, use the one for the decision you want reviewed. If you cannot access the email, use the appeal form.',
        },
        links: [
          {
            href: 'https://openai.com/form/appeal/',
            label: { zh: 'OpenAI 申诉表单', en: 'OpenAI appeal form' },
          },
        ],
      },
      {
        text: {
          zh: '写上用户 ID 和组织 ID（有的话）、账号平时怎么用、为什么认为是误判。怀疑被盗用，就写可疑的时间段和已采取的措施。不要填完整卡号或安全码。',
          en: 'Include your user ID and organization ID if you have them, how the account was used, and why you think it was a mistake. If you suspect unauthorized access, add the dates and what you did. Do not include a full card number or security code.',
        },
      },
      {
        text: {
          zh: '没收到邮件又进不去账号，从帮助中心联系支持。限时停用期间的退款和取消，官方写的是发邮件到 support@openai.com。',
          en: 'If you lost access without an email, contact support through the Help Center. For refunds or cancellation during a temporary suspension, OpenAI lists support@openai.com.',
        },
        links: [
          {
            href: 'https://help.openai.com/',
            label: { zh: 'OpenAI 帮助中心', en: 'OpenAI Help Center' },
          },
        ],
      },
    ],
    sections: [
      {
        title: { zh: '先分清是哪一种情况', en: 'Which situation is it?' },
        items: [
          {
            term: { zh: '限时停用', en: 'Temporary suspension' },
            text: {
              zh: '到期前访问受限，不等于永久关闭。官方说明，只有部分涉及暴力或儿童安全的停用是 24 或 48 小时，以通知为准。',
              en: 'Access is limited for a time; it is not a permanent closure. Only certain suspensions related to violence or child safety last 24 or 48 hours, so follow your notice.',
            },
          },
          {
            term: { zh: '安全限制', en: 'Security restriction' },
            text: {
              zh: '怀疑别人用过账号，先改密码，更换泄露的 API 密钥，再联系支持。',
              en: 'If someone else may have used the account, change your password, rotate exposed API keys, and contact support.',
            },
          },
          {
            term: { zh: '没做完验证', en: 'Verification not completed' },
            text: {
              zh: '身份或年龄验证没完成，账号可能先被停用，按页面提示和期限补做。',
              en: 'An account may be disabled until a required identity or age check is completed. Follow the instructions and deadline shown.',
            },
          },
          {
            term: { zh: 'Codex CLI 报 401', en: 'Codex CLI returns 401' },
            text: {
              zh: '先确认登录状态：运行 codex login status，需要时 codex logout 再 codex login。网页端也进不去，再按上面的步骤申诉。',
              en: 'Check sign-in first: run codex login status, then codex logout and codex login if needed. If the web is also blocked, follow the steps above.',
            },
            links: [
              {
                href: 'https://learn.chatgpt.com/docs/auth',
                label: { zh: 'Codex 登录官方说明', en: 'Codex sign-in docs' },
              },
            ],
          },
        ],
      },
    ],
    timeline: {
      title: { zh: '别人等到了什么结果', en: 'What others reported' },
      intro: {
        zh: '下面只列原帖写明的日期，没写的标为“未写明”。都是作者自述，未经本站核实，条数很少，不能当作成功率。',
        en: 'Only dates stated in each post are listed. These are unverified personal accounts and too few to indicate a success rate.',
      },
      rows: [
        {
          source: 'https://community.openai.com/t/1384852',
          suspended: '2026-06-25',
          appealed: null,
          seen: '2026-07-03',
          status: {
            zh: '可以重新访问，但套餐显示 Free',
            en: 'Access returned, but the plan showed Free',
          },
        },
        {
          source: 'https://community.openai.com/t/1383153',
          suspended: '2026-06-09',
          appealed: null,
          seen: '2026-06-14',
          status: {
            zh: '论坛支持回复：申诉在等专门团队处理',
            en: 'Forum support: the appeal was with a specialist team',
          },
        },
      ],
    },
    checkedOn: '2026-11-24',
  },
  claude: {
    question: {
      zh: 'Claude 账号或组织被停用，怎么办？',
      en: 'Claude account or organization disabled: what to do',
    },
    lead: {
      zh: 'Claude Code 提示“This organization has been disabled”时，先别急着申诉。官方文档说明，这条报错出现在它用了一个旧的 ANTHROPIC_API_KEY，而这个密钥属于已停用的 Console 组织。只要设了这个变量，它就会盖过你的订阅登录，即使 Pro、Max 或 Ultra 订阅正常也会报错。如果 claude.ai 网页也显示账号受限，再走官方申诉。',
      en: 'If Claude Code says “This organization has been disabled”, do not appeal yet. The docs say this error appears when it uses a stale ANTHROPIC_API_KEY from a disabled Console organization. The key overrides a saved subscription login, even with a working Pro, Max or Ultra plan. If claude.ai also shows a restriction, use the official appeal.',
    },
    stepsTitle: { zh: '按这个顺序处理', en: 'Do this in order' },
    steps: [
      {
        text: {
          zh: '在当前终端取消 ANTHROPIC_API_KEY，并从 shell 配置里删掉，再重新启动 claude。密钥也可能来自 .env 文件。',
          en: 'Unset ANTHROPIC_API_KEY in the current shell, remove it from your shell profile, and relaunch claude. The key can also come from a .env file.',
        },
        links: [
          {
            href: CLAUDE_CODE_ERRORS,
            label: { zh: 'Claude Code 官方说明', en: 'Claude Code docs' },
          },
        ],
      },
      {
        text: {
          zh: '运行 /status，确认当前用的是订阅登录。没有登录过就运行 /login。',
          en: 'Run /status to confirm that your subscription login is active. If you have no saved login, run /login.',
        },
      },
      {
        text: {
          zh: '没有设这个变量却仍然报错，就在浏览器登录 claude.ai，看账号本身是否受限。',
          en: 'If the variable is not set and the error remains, sign in to claude.ai in a browser and check whether the account itself is restricted.',
        },
      },
    ],
    sections: [
      {
        title: {
          zh: 'claude.ai 也提示受限时',
          en: 'If claude.ai also shows a restriction',
        },
        items: [
          {
            term: { zh: '账号被停用', en: 'Account banned' },
            text: {
              zh: '用被停用的账号登录后，才能打开申诉表单。同一页面还会显示能否导出数据或删除账号。',
              en: 'You must be signed in with the banned account to open the appeal form. The same screen shows whether you can export data or delete the account.',
            },
            links: [
              {
                href: CLAUDE_APPEALS,
                label: { zh: 'Claude 官方申诉说明', en: 'Claude appeals help' },
              },
            ],
          },
          {
            term: {
              zh: '账号正常，组织被暂停',
              en: 'Account fine, organization on hold',
            },
            text: {
              zh: '登录后的受限页面会列出被暂停的组织，点它旁边的“Request a review”。',
              en: 'The restricted account screen lists each organization on hold. Select “Request a review” on the affected one.',
            },
            links: [
              {
                href: '/tips/claude-portal-suspension-review',
                label: { zh: '复核填写步骤', en: 'Review form steps' },
              },
            ],
          },
          {
            term: {
              zh: '恢复后套餐变成 Free',
              en: 'Restored, but the plan shows Free',
            },
            text: {
              zh: '核对订单和登录账号，不用再申诉。',
              en: 'Match the order to the signed-in account. No further appeal is needed.',
            },
            links: [
              {
                href: '/tips/claude-max-google-play-recovery',
                label: {
                  zh: 'Max 显示 Free 的排查步骤',
                  en: 'Max shows Free: steps',
                },
              },
            ],
          },
        ],
      },
    ],
    checkedOn: '2026-11-24',
  },
};

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

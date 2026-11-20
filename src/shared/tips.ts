interface TipCopy {
  zh: string;
  en: string;
}

interface TipArticle {
  slug: string;
  title: TipCopy;
  summary: TipCopy;
  experience: TipCopy;
  steps: { text: TipCopy; code?: string }[];
  source: `https://x.com/i/article/${string}`;
  sourceAuthor: string;
  sourceDate: string;
  sourceViews: number;
  action?: { href: string; label: TipCopy };
}

export const TIP_ARTICLES: TipArticle[] = [
  {
    slug: 'claude-code-local-history',
    title: {
      zh: 'Claude 账号停用后，从本机找回项目记录并导入 Codex',
      en: 'Recover local Claude Code sessions and import them into Codex',
    },
    summary: {
      zh: '从 Mac 上找到 Claude Code 留下的项目会话，备份原始记录，再用 Codex 接着做。',
      en: 'Find Claude Code project sessions on a Mac, save the originals and pick up the work in Codex.',
    },
    experience: {
      zh: 'Leaf Yeah! 在两次 Claude 账号停用之后，查看了原先运行 Claude Code 的那台 Mac。他在本机找到了项目会话，并在 X 长文里展示了 SeeCut 项目的旧对话出现在 Codex 里的结果。',
      en: 'After losing access to two Claude accounts, Leaf Yeah! inspected the Mac where he had run Claude Code. He found local sessions and showed the previous conversations from his SeeCut project appearing in Codex.',
    },
    steps: [
      {
        text: {
          zh: '回到原先运行 Claude Code 的 Mac。在 Finder 里按 ⌘⇧G，输入下面的路径并回车。如果曾专门设置 CLAUDE_CONFIG_DIR，就打开当时用的配置目录。',
          en: 'On the Mac where you ran Claude Code, press Command–Shift–G in Finder. Enter the path below and press Return. If you previously set CLAUDE_CONFIG_DIR, open that directory instead.',
        },
        code: '~/.claude',
      },
      {
        text: {
          zh: '打开 projects 文件夹，找和原项目路径对应的子目录。会话以 .jsonl 文件保存。先把要保留的项目记录复制到自己的备份文件夹，再回到代码仓库拷出项目里的 CLAUDE.md 和自己编写的 Skills。',
          en: 'Open projects and locate the subfolder for the original project path. Session files end in .jsonl. Copy the project records you want to keep to a private backup folder, then save the repository’s CLAUDE.md and any skills you wrote.',
        },
      },
      {
        text: {
          zh: '在同一台 Mac 打开 ChatGPT 桌面端，进入「设置 → 导入」，在 Claude Code 一行点「导入」。查看扫描到的项目及可导入的内容，先勾选你要接着做的那个项目和近期会话，再确认导入。',
          en: 'On the same Mac, open the ChatGPT desktop app and go to Settings → Import. Select Import beside Claude Code. Review the projects and available items the app finds, select the project and recent chats you want to continue, and confirm.',
        },
      },
      {
        text: {
          zh: '切到 Codex，在项目列表打开导入的项目。找一条认得标题的旧会话，核对最后一条消息和原目录里的任务是否对应。缺的会话可回到备份，在对应的 .jsonl 里查最近几条消息，把任务进度补到新的会话。',
          en: 'Switch to Codex and open the imported project. Find a session by a title you recognize and check the last message against the original work. If a session is missing, read its last few messages in the .jsonl backup and carry the relevant progress into a new chat.',
        },
      },
    ],
    source: 'https://x.com/i/article/2107394164908310528',
    sourceAuthor: '@leaf_sanren',
    sourceDate: '2026-10-08',
    sourceViews: 74375,
    action: {
      href: 'https://learn.chatgpt.com/docs/import',
      label: {
        zh: '查看桌面端导入入口',
        en: 'Find the desktop import controls',
      },
    },
  },
  {
    slug: 'antigravity-separate-google-account',
    title: {
      zh: '把 Antigravity 和日常 Gmail 分开用，从建号到首次授权',
      en: 'Set up a separate Google account for Antigravity',
    },
    summary: {
      zh: '日常 Gmail 留在原浏览器窗口，开发号先核对地区，再走一次完整的 Antigravity 登录。',
      en: 'Keep daily Gmail in its own browser window, then check the development account’s region and complete Antigravity sign-in.',
    },
    experience: {
      zh: '码农暖爸把重要邮箱留在主号，开发、测试和模型工具用另一个 Google 账号。他在长文里写了自己采用的分号方式，还给出了关联地区和客户端授权这两个可以当场核对的入口。',
      en: 'Delroy keeps important email on his main account and uses a separate Google account for development, testing and model tools. His article explains that setup and shows where to check the account region and complete Antigravity authorization.',
    },
    steps: [
      {
        text: {
          zh: 'Chrome 右上角点浏览器头像，选「添加新的 Chrome 个人资料」，命名为「开发」。在新窗口打开 accounts.google.com，登录已有开发号，或点「创建账号」注册自己的个人 Google 账号。原来的日常邮箱继续留在原窗口。',
          en: 'Use the Chrome profile menu in the top right to add a profile called Development. Open accounts.google.com in that new window and sign in to your existing development account or create a personal Google Account. Keep daily email in the original window.',
        },
      },
      {
        text: {
          zh: '在「开发」窗口打开 policies.google.com/terms，确认 Google 当前用的是开发号，然后在条款页查看适用的国家或地区。遇到账号资格报错时，用这个结果对照 Antigravity FAQ 的支持地区。',
          en: 'Open policies.google.com/terms in Development, confirm the active Google account and check the country or region shown on the Terms page. If Antigravity reports an eligibility error, compare the result with the supported locations in its FAQ.',
        },
      },
      {
        text: {
          zh: '打开 Antigravity 桌面端，选择「使用 Google 账号继续」。如果浏览器打开了主号，先在选账号的页面点「使用其他账号」，明确选开发号邮箱，再确认授权。授权页完成后切回客户端。',
          en: 'Open the Antigravity desktop app and choose Continue with Google. If the browser offers your main account, choose Use another account, select the development email, and approve access. Return to the app when authorization completes.',
        },
      },
      {
        text: {
          zh: '在客户端设置的「账号」页核对邮箱。再建一个空文件夹，用这个号问一句「列出当前目录里的文件，先不修改」。收到回复后，日常的开发项目就从这个账号开始加。',
          en: 'Check the email in the app’s Account settings. Open an empty folder and ask the assistant to list its contents without changing files. Once you get a reply, you can start adding the projects you want to use with this account.',
        },
      },
    ],
    source: 'https://x.com/i/article/2102061503004434432',
    sourceAuthor: '@Delroy715',
    sourceDate: '2026-09-22',
    sourceViews: 95496,
    action: {
      href: 'https://antigravity.google/docs/faq',
      label: {
        zh: '查看 Antigravity 登录与地区要求',
        en: 'Check Antigravity sign-in and region requirements',
      },
    },
  },
  {
    slug: 'codex-desktop-first-login',
    title: {
      zh: '用已有 ChatGPT 账号登录 Codex 桌面端',
      en: 'Sign in to Codex desktop with your existing ChatGPT account',
    },
    summary: {
      zh: '从下载安装到切换 Codex，再用一次只读请求验证登录和项目权限。',
      en: 'Install the app, switch to Codex and verify your sign-in and project access with a read-only request.',
    },
    experience: {
      zh: 'Serena 木瓜用 Codex 做自己的内容项目。在她的图解里，第一张图从下载走到登录和进入 Codex。接下来她用一次只读请求来检查新会话能不能顺利运行。',
      en: 'Serena uses Codex for her own content projects. The first screenshot in her illustrated guide follows the path from download through sign-in to Codex. She then uses a read-only request to show how to check a new session.',
    },
    steps: [
      {
        text: {
          zh: '从 Codex 下载页选你的系统，安装并打开 ChatGPT 桌面端。看到登录页时，用现在那份 ChatGPT 订阅对应的邮箱和登录方式。浏览器同时开着多个账号时，在授权前核对显示的邮箱。',
          en: 'Choose your operating system on the Codex download page and open the installed ChatGPT desktop app. Sign in with the email and sign-in method for your existing ChatGPT account. If the browser has multiple sessions, confirm the email on the authorization screen.',
        },
      },
      {
        text: {
          zh: '回到桌面端，点击左上角的体验选择器，切到「Codex」。从左边打开一个本地项目。第一次验证可以直接选一个空文件夹，方便定位会话到底打开了哪里。',
          en: 'Return to the desktop app, open the experience selector in the upper left and choose Codex. Open a local project from the sidebar. An empty folder works for the first check and makes it easy to tell which directory the session opened.',
        },
      },
      {
        text: {
          zh: '点「新对话」，发一条只读请求，例如「告诉我当前项目的目录名和可见文件。先只检查，别改文件。」确认它能回复，且报告的目录与刚选的项目一致。',
          en: 'Start a new chat and send a small read-only request. For example, ask for the project folder name and visible files, with no edits. Check that you receive a reply and that the directory matches the project you selected.',
        },
      },
    ],
    source: 'https://x.com/i/article/2089996874639958017',
    sourceAuthor: '@369Serena',
    sourceDate: '2026-08-19',
    sourceViews: 191573,
    action: {
      href: 'https://chatgpt.com/codex/',
      label: { zh: '打开 Codex 下载页', en: 'Open the Codex download page' },
    },
  },
  {
    slug: 'claude-code-windows-first-login',
    title: {
      zh: 'Windows 装好 Claude Code 后，怎么确认登录的是自己的订阅',
      en: 'Verify your Claude subscription sign-in on Windows',
    },
    summary: {
      zh: '先让 PowerShell 找到 Claude，再完成浏览器授权并核对 CLI 的账号状态。',
      en: 'Make sure PowerShell can find Claude, complete browser authorization and check the account in the CLI.',
    },
    experience: {
      zh: '苏乐在自己的 Windows 环境里走了一遍 Claude Code 安装和首次登录。他把检查命令、浏览器授权和「PowerShell 找不到命令」的排查写在同一篇长文里。',
      en: 'Su Le went through Claude Code installation and sign-in on Windows. His article puts the version check, browser authorization and the fix for a command missing from PowerShell in one walkthrough.',
    },
    steps: [
      {
        text: {
          zh: '装完 Claude Code 后，关掉安装时的 PowerShell，再打开一个新窗口刷新 PATH。先用版本命令确认系统已经找到 Claude。',
          en: 'After installing Claude Code, close the PowerShell window used for installation and open a new one to refresh PATH. Run the version command to check whether Windows can find Claude.',
        },
        code: 'claude --version',
      },
      {
        text: {
          zh: '如果仍提示找不到命令，先查安装和 PATH。用原生安装器的情况下，可在 PowerShell 检查下列路径是否存在。路径存在时，把对应的 .local\\bin 目录加入 Windows 用户 Path，再开一个 PowerShell 验证版本。',
          en: 'If the command is still missing, check the installation and PATH. For a native install, test whether the path below exists in PowerShell. If it does, add the corresponding .local\\bin directory to your Windows user Path and check the version in a new PowerShell window.',
        },
        code: 'Test-Path "$env:USERPROFILE\\.local\\bin\\claude.exe"',
      },
      {
        text: {
          zh: '版本能显示后，启动 Claude Code。终端打开浏览器时，选择 Claude 订阅的登录方式，用你的 Claude Pro 或 Max 账号授权，再回到 PowerShell。',
          en: 'Once the version command works, start Claude Code. When it opens a browser, choose the Claude subscription sign-in method and authorize with the account that owns your Claude Pro or Max plan. Return to PowerShell afterward.',
        },
        code: 'claude',
      },
      {
        text: {
          zh: '在 Claude Code 里打开状态页，核对当前登录邮箱和显示的账号信息。然后在自己的项目里发一条只读请求，看会话能否正常回复。',
          en: 'Open the status panel inside Claude Code and check the signed-in email and account information. Then send a read-only request in one of your own projects and verify that the session replies.',
        },
        code: '/status',
      },
    ],
    source: 'https://x.com/i/article/2071422961719078912',
    sourceAuthor: '@ai_suxiaole',
    sourceDate: '2026-06-29',
    sourceViews: 371034,
    action: {
      href: 'https://code.claude.com/docs/en/quickstart',
      label: {
        zh: '查看 Claude Code 安装入口',
        en: 'Open the Claude Code quickstart',
      },
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
  TIP_ARTICLES.flatMap(({ title, summary, experience, steps, action }) => [
    ...[title, summary, experience, ...steps.map(({ text }) => text)].map(
      ({ zh, en }) => [zh, en],
    ),
    [tipPageTitle(title.zh, 'zh'), tipPageTitle(title.en, 'en')],
    ...(action ? [[action.label.zh, action.label.en]] : []),
  ]),
);

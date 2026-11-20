import { currentLocale, tr, type Locale } from '../../shared/i18n';
// Read-only labels retain the meaning of historical submissions. These are not
// options for new submissions and must never be guessed into named tiers.
export const LEGACY_PLAN_LABELS = {
  paid_personal: '个人付费（旧分类）',
  paid_team: '团队或企业（旧分类）',
  api: 'API（旧分类）',
} as const;
export const LABELS = {
  vendor: {
    claude: 'Claude',
    codex: 'Codex',
    antigravity: 'Antigravity',
  },
  // 表单里用完整说法，墓碑标签和筛选里用短说法
  event_type: {
    suspended: '账号停用',
    org_suspended: '组织暂停',
    region: '地区限制',
    verification: '验证卡住',
    billing: '扣费或支付异常',
    other: '其他',
  },
  event_type_short: {
    suspended: '账号停用',
    org_suspended: '组织暂停',
    region: '地区限制',
    verification: '验证卡住',
    billing: '扣费异常',
    other: '其他',
  },
  plan: {
    unknown: '不详或不想说',
    free: 'Free（免费版）',
    go: 'Go',
    plus: 'Plus',
    pro: 'Pro',
    max: 'Max',
    ultra: 'Ultra',
    ...LEGACY_PLAN_LABELS,
  },
  appeal_status: {
    none: '还没申诉',
    pending: '申诉中',
    rejected: '申诉被驳回',
    restored: '已恢复',
  },
  card_style: {
    flower: '小花',
    cloud: '云朵',
    star: '星星',
  },
  status: {
    pending: '等待审核',
    approved: '已公开',
    rejected: '没有通过审核',
    hidden: '已隐藏',
    withdrawn: '已撤回',
  },
  report_reason: {
    privacy: '含隐私信息',
    abuse: '辱骂、骚扰或恶意内容',
    gray_market: '灰产广告',
    other: '其他',
  },
} as const;

/** Localize system labels without touching submitted content. */
export function getLabels(locale: Locale = currentLocale()): {
  [Group in keyof typeof LABELS]: {
    [Key in keyof (typeof LABELS)[Group]]: string;
  };
} {
  return Object.fromEntries(
    Object.entries(LABELS).map(([group, values]) => [
      group,
      Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, tr(value, locale)]),
      ),
    ]),
  ) as {
    [Group in keyof typeof LABELS]: {
      [Key in keyof (typeof LABELS)[Group]]: string;
    };
  };
}

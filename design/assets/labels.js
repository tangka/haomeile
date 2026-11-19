/* 枚举值 → 中文标签。
   键名与 PLAN.md §3.1 / §5 的数据库枚举完全一致。
   移植：改成 src/site/scripts/labels.ts，`export const LABELS = {...} as const`，前后端共用。 */
window.HML_LABELS = {
  vendor: {
    claude: 'Claude',
    chatgpt: 'ChatGPT',
    gemini: 'Gemini',
    grok: 'Grok',
    deepseek: 'DeepSeek',
    kimi: 'Kimi',
    qwen: '通义千问',
    doubao: '豆包',
    other: '其他'
  },
  // 表单里用完整说法，墓碑标签和筛选里用短说法
  event_type: {
    suspended: '账号停用',
    org_suspended: '组织暂停',
    region: '地区限制',
    verification: '验证卡住',
    billing: '扣费或支付异常',
    other: '其他'
  },
  event_type_short: {
    suspended: '账号停用',
    org_suspended: '组织暂停',
    region: '地区限制',
    verification: '验证卡住',
    billing: '扣费异常',
    other: '其他'
  },
  plan: {
    unknown: '不详或不想说',
    free: '免费版',
    paid_personal: '个人付费',
    paid_team: '团队或企业',
    api: 'API'
  },
  appeal_status: {
    none: '还没申诉',
    pending: '申诉中',
    rejected: '申诉被驳回',
    restored: '已恢复'
  },
  card_style: {
    flower: '小花',
    cloud: '云朵',
    star: '星星'
  },
  status: {
    pending: '等待审核',
    approved: '已公开',
    rejected: '没有通过审核',
    hidden: '已隐藏',
    withdrawn: '已撤回'
  },
  report_reason: {
    privacy: '含隐私信息',
    abuse: '辱骂、骚扰或恶意内容',
    gray_market: '灰产广告',
    other: '其他'
  }
};

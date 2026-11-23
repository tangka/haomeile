import { currentLocale, tr } from '../../shared/i18n';
import { api } from './api';
import { toast } from './toast';
import { getLabels } from './labels';
import { ago, num } from './format';
import type { RadarCapacityReport } from '../../shared/radar-email-report';
import type { PublicTombstone, TombInput } from '../../worker/types';
const labels = getLabels();

type QueueType = 'new' | 'patch' | 'reported';
interface Report {
  id: string;
  reason: keyof typeof labels.report_reason;
  note: string | null;
  created_at: string;
}
interface QueueItem extends Omit<PublicTombstone, 'memorial_number'> {
  flags: string[];
  pending_patch: TombInput | null;
  reports: Report[];
}
interface Audit {
  id: string;
  tombstone_id: string | null;
  action: string;
  actor: string;
  detail: string | null;
  created_at: string;
}
interface QueueResponse {
  items: QueueItem[];
  counts: Record<QueueType, number>;
  audit_log: Audit[];
}

const fieldLabels: Record<string, string> = {
  codename: tr('代号'),
  nickname: tr('署名'),
  vendor: tr('产品'),
  event_type: tr('事件种类'),
  plan: tr('套餐'),
  born_at: tr('生于'),
  born_precision: tr('日期精度'),
  died_at: tr('卒于'),
  story: tr('经过'),
  epitaph: tr('墓志铭'),
  appeal_status: tr('申诉'),
  card_style: tr('碑脚装饰'),
  status: tr('状态'),
};
const actionLabels: Record<string, string> = {
  approve: tr('通过'),
  reject: tr('拒绝'),
  hide: tr('隐藏'),
  restore: tr('恢复显示'),
  patch_approve: tr('通过修改'),
  patch_reject: tr('保留旧版'),
  withdraw: tr('用户撤回'),
  resolve_report: tr('处理举报'),
  auto_hide: tr('自动隐藏：3 人举报'),
};
const queue = document.querySelector<HTMLDivElement>('#queue')!;
const log = document.querySelector<HTMLTableSectionElement>('#audit-log')!;
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-queue]')];
let current: QueueType = 'new';
let loadVersion = 0;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fieldValue(key: string, value: unknown) {
  const groups: Record<string, Record<string, string>> = {
    vendor: labels.vendor,
    event_type: labels.event_type,
    plan: labels.plan,
    appeal_status: labels.appeal_status,
    card_style: labels.card_style,
    status: labels.status,
  };
  const text = value == null || value === '' ? tr('未填写') : String(value);
  return groups[key]?.[text] ?? text;
}

function highlighted(text: string, words: string[]) {
  const fragment = document.createDocumentFragment();
  const rules = [...new Set(words.filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  let offset = 0;
  while (offset < text.length) {
    let first = -1;
    let term = '';
    for (const word of rules) {
      const at = text
        .toLocaleLowerCase()
        .indexOf(word.toLocaleLowerCase(), offset);
      if (at >= 0 && (first === -1 || at < first)) {
        first = at;
        term = word;
      }
    }
    if (first === -1) {
      fragment.append(document.createTextNode(text.slice(offset)));
      break;
    }
    fragment.append(document.createTextNode(text.slice(offset, first)));
    fragment.append(
      element('mark', '', text.slice(first, first + term.length)),
    );
    offset = first + term.length;
  }
  return fragment;
}

function details(item: QueueItem) {
  const disclosure = element('details');
  disclosure.append(element('summary', '', tr('展开全部字段')));
  const fields = element('dl', 'facts');
  for (const key of Object.keys(fieldLabels)) {
    fields.append(
      element('dt', '', fieldLabels[key]),
      element('dd', '', fieldValue(key, item[key as keyof QueueItem])),
    );
  }
  disclosure.append(fields);
  return disclosure;
}

function actionButton(
  label: string,
  path: string,
  className: string,
  getBody: () => object = () => ({}),
) {
  const button = element('button', `btn ${className}`, label);
  button.type = 'button';
  button.addEventListener('click', async () => {
    const article = button.closest('article')!;
    const controls = [...article.querySelectorAll<HTMLButtonElement>('button')];
    controls.forEach((control) => {
      control.disabled = true;
    });
    try {
      await api(path, getBody());
      toast(tr(`已${label}。`, currentLocale(), 'Action completed.'));
      await load();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : tr('操作没有完成，请重试。'),
      );
      controls.forEach((control) => {
        control.disabled = false;
      });
    }
  });
  return button;
}

function renderItem(item: QueueItem) {
  const flags = item.flags.filter(
    (flag): flag is string => typeof flag === 'string',
  );
  const article = element(
    'article',
    `qitem${flags.length || current === 'reported' ? ' flagged' : ''}`,
  );
  const head = element('div', 'qhead');
  head.append(
    element(
      'h3',
      '',
      item.pending_patch?.codename || item.codename || tr('无名氏'),
    ),
  );
  head.append(
    element(
      'span',
      'qmeta',
      currentLocale() === 'en'
        ? `${labels.vendor[item.vendor]} · ${labels.event_type[item.event_type]} · Submitted ${ago(item.updated_at, Date.now(), 'en').toLowerCase()}`
        : `${labels.vendor[item.vendor]}，${labels.event_type[item.event_type]}，${ago(item.updated_at)}提交`,
    ),
  );
  article.append(head);
  if (flags.length)
    article.append(
      element(
        'span',
        'flag',
        `${tr('命中灰产词：')}${flags.join(currentLocale() === 'en' ? ', ' : '、')}`,
      ),
    );
  const story = element('p', 'qstory');
  story.append(highlighted(item.story || '', flags));
  article.append(story);

  if (current === 'patch' && item.pending_patch) {
    const diff = element('div', 'diff');
    for (const key of Object.keys(fieldLabels)) {
      if (!(key in item.pending_patch)) continue;
      const before = fieldValue(key, item[key as keyof QueueItem]);
      const after = fieldValue(key, item.pending_patch[key as keyof TombInput]);
      if (before === after) continue;
      for (const [label, value] of [
        [tr('现在显示'), before],
        [tr('改成'), after],
      ]) {
        const part = element('div');
        part.append(
          element('b', '', `${fieldLabels[key]} · ${label}`),
          document.createTextNode(value),
        );
        diff.append(part);
      }
    }
    if (!diff.childElementCount)
      diff.append(element('p', '', tr('提交的内容和当前版本相同。')));
    article.append(diff);
  }

  const actions = element('div', 'actions');
  const base = `/api/admin/tombstones/${encodeURIComponent(item.id)}`;
  if (current === 'new') {
    const reasonId = `reason-${item.id}`;
    const field = element('div', 'field');
    const label = element('label', '', tr('拒绝原因（选填）'));
    label.htmlFor = reasonId;
    const reason = element('input');
    reason.id = reasonId;
    reason.maxLength = 200;
    field.append(label, reason);
    article.append(field);
    actions.append(
      actionButton(
        tr('通过'),
        `${base}/approve`,
        flags.length ? '' : 'btn-primary',
      ),
      actionButton(
        tr('拒绝'),
        `${base}/reject`,
        flags.length ? 'btn-danger' : '',
        () => ({ reason: reason.value }),
      ),
    );
  } else if (current === 'patch') {
    actions.append(
      actionButton(tr('通过修改'), `${base}/patch/approve`, 'btn-primary'),
      actionButton(tr('保留旧版'), `${base}/patch/reject`, ''),
    );
    if (item.status === 'hidden')
      article.append(
        element(
          'p',
          'hint',
          tr('这块碑已隐藏。通过修改后仍保持隐藏，需要复核举报后恢复显示。'),
        ),
      );
  } else {
    article.append(
      element('span', 'flag', tr(`${item.reports.length} 条待处理举报`)),
    );
    for (const report of item.reports) {
      const note = element('div', 'notice');
      note.append(
        element(
          'p',
          '',
          `${labels.report_reason[report.reason] || tr('其他')} · ${ago(report.created_at, Date.now(), currentLocale())}`,
        ),
      );
      if (report.note) note.append(element('p', '', report.note));
      note.append(
        actionButton(
          tr('标记已处理'),
          `/api/admin/reports/${encodeURIComponent(report.id)}/resolve`,
          'btn-quiet',
        ),
      );
      article.append(note);
    }
    if (item.status === 'approved')
      actions.append(actionButton(tr('隐藏'), `${base}/hide`, 'btn-danger'));
    if (item.status === 'hidden')
      actions.append(
        actionButton(tr('恢复显示'), `${base}/restore`, 'btn-primary'),
      );
  }
  article.append(actions, details(item));
  return article;
}

function renderLog(audits: Audit[]) {
  log.replaceChildren();
  for (const audit of audits) {
    const row = element('tr');
    let action =
      audit.actor === 'system' && audit.action === 'hide'
        ? tr('自动隐藏：3 人举报')
        : actionLabels[audit.action] || audit.action;
    if (audit.action === 'reject' && audit.detail) {
      try {
        const detail: unknown = JSON.parse(audit.detail);
        if (
          detail &&
          typeof detail === 'object' &&
          'reason' in detail &&
          typeof detail.reason === 'string'
        )
          action += `${currentLocale() === 'en' ? ': ' : '：'}${detail.reason}`;
      } catch {
        /* Legacy log data has no reason to show. */
      }
    }
    const actor =
      audit.actor === 'system'
        ? tr('系统')
        : audit.actor === 'owner'
          ? tr('投稿人')
          : audit.actor;
    row.append(
      element('td', '', ago(audit.created_at, Date.now(), currentLocale())),
      element('td', '', audit.tombstone_id || '—'),
      element('td', '', action),
      element('td', '', actor),
    );
    log.append(row);
  }
  if (!audits.length) {
    const row = element('tr');
    const cell = element('td', '', tr('还没有操作记录。'));
    cell.colSpan = 4;
    row.append(cell);
    log.append(row);
  }
}

const providerNames = {
  resend: 'Resend',
  brevo: 'Brevo',
  mailjet: 'Mailjet',
};
const capacityAlertLabels = {
  day: { warning: '日额度即将用完', critical: '日额度已用完' },
  month: { warning: '月额度即将用完', critical: '月额度已用完' },
  remaining: {
    warning: '一轮提醒的余量偏低',
    critical: '余额不足以通知所有订阅者',
  },
  blocked: { warning: '渠道暂停发信', critical: '渠道暂停发信' },
  disabled: {
    warning: '已有订阅者的渠道未启用',
    critical: '已有订阅者的渠道未启用',
  },
};
const refreshCapacity =
  document.querySelector<HTMLButtonElement>('#capacity-refresh')!;
const capacitySummary =
  document.querySelector<HTMLElement>('#capacity-summary')!;
const capacityDetails =
  document.querySelector<HTMLElement>('#capacity-details')!;
const capacityProviders = document.querySelector<HTMLTableSectionElement>(
  '#capacity-providers',
)!;

function renderCapacity(report: RadarCapacityReport) {
  const format = (value: number) => num(value, currentLocale());
  capacitySummary.textContent = report.providers.some((entry) => entry.enabled)
    ? tr(
        `按本站发信记录，今日还可发 ${format(report.remaining)} 封，已启用渠道的日额度共 ${format(report.dayLimit)} 封。`,
      )
    : tr('暂未启用发信渠道。');
  const rows = report.providers.map((entry) => {
    const row = element('tr');
    const provider = element('th', '', providerNames[entry.provider]);
    provider.scope = 'row';
    const status = element('td', '', tr(entry.enabled ? '已启用' : '未启用'));
    for (const alert of report.alerts.filter(
      (item) => item.provider === entry.provider,
    )) {
      const message = capacityAlertLabels[alert.reason][alert.level];
      status.append(element('div', 'flag', tr(message)));
    }
    const monthLimit =
      entry.monthLimit === null ? tr('无月上限') : format(entry.monthLimit);
    row.append(
      provider,
      status,
      element('td', '', `${format(entry.dayUsed)} / ${format(entry.dayLimit)}`),
      element('td', '', `${format(entry.monthUsed)} / ${monthLimit}`),
      element('td', '', format(entry.remaining)),
      element('td', '', format(entry.contacts)),
    );
    return row;
  });
  capacityProviders.replaceChildren(...rows);
  capacityDetails.hidden = false;
}

async function loadCapacity() {
  refreshCapacity.disabled = true;
  capacitySummary.textContent = tr('正在读取发信额度……');
  try {
    renderCapacity(
      await api<RadarCapacityReport>('/api/admin/radar/email-capacity'),
    );
  } catch {
    capacityDetails.hidden = true;
    capacitySummary.textContent = tr('发信额度读取失败，请刷新额度。');
  } finally {
    refreshCapacity.disabled = false;
  }
}

async function load() {
  const version = ++loadVersion;
  queue.setAttribute('aria-busy', 'true');
  try {
    const data = await api<QueueResponse>(`/api/admin/queue?type=${current}`);
    if (version !== loadVersion) return;
    document.querySelectorAll<HTMLElement>('[data-count]').forEach((badge) => {
      badge.textContent = num(data.counts[badge.dataset.count as QueueType]);
    });
    queue.replaceChildren(...data.items.map(renderItem));
    if (!data.items.length)
      queue.append(element('p', 'empty', tr('这个队列是空的。')));
    renderLog(data.audit_log);
  } catch (error) {
    if (version !== loadVersion) return;
    queue.replaceChildren(
      element(
        'p',
        'notice',
        error instanceof Error
          ? error.message
          : tr('审核队列没有加载出来，请重试。'),
      ),
    );
    const retry = element('button', 'btn', tr('重试'));
    retry.addEventListener('click', () => void load());
    queue.append(retry);
  } finally {
    if (version === loadVersion) queue.setAttribute('aria-busy', 'false');
  }
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    current = tab.dataset.queue as QueueType;
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    queue.setAttribute('aria-labelledby', tab.id);
    void load();
  });
  tab.addEventListener('keydown', (event) => {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft')
      next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  });
});
void load();
refreshCapacity.addEventListener('click', () => void loadCapacity());
void loadCapacity();

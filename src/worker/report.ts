import { localePath, type Locale } from '../shared/i18n';
import { getLabels } from '../site/scripts/labels';
import { EVENTS, VENDORS, type Vendor } from './types';
type EventKey = (typeof EVENTS)[number];
import { SUPPORTED_VENDOR_FILTER } from './lib/store';
import { beijingDay, beijingMidnight } from './lib/time';

export const REPORT_MONTH_RE = /^20\d{2}-(?:0[1-9]|1[0-2])$/;
export const REPORT_MIN_RECORDS = 5;

export interface ReportMonthSummary {
  month: string;
  total: number;
  community: number;
  updatedAt: string;
}

export interface NoticePhraseMatch {
  phrase: string;
  count: number;
  exampleId: string;
  exampleVendor: Vendor;
}

export interface MonthlyReportData {
  month: string;
  total: number;
  submitted: number;
  community: number;
  asOf: string;
  inProgress: boolean;
  publishedAt: string;
  updatedAt: string;
  byVendor: { vendor: Vendor; total: number; submitted: number; community: number }[];
  byEvent: { event: EventKey; count: number }[];
  appeals: {
    totalMentioned: number;
    pending: number;
    restored: number;
    rejected: number;
    noneOrUnstated: number;
  };
  notices: NoticePhraseMatch[];
  otherMonths: string[];
}

interface ReportRecordRow {
  id: string;
  vendor: Vendor;
  event_type: EventKey;
  appeal_status: string;
  origin: string;
  story: string | null;
  story_en: string | null;
  approved_at: string;
  updated_at: string;
}

const KNOWN_NOTICES: { phrase: string; pattern: RegExp }[] = [
  {
    phrase: 'Your organization has been disabled',
    pattern: /organization has been disabled|组织已(?:被)?停用|组织暂停/i,
  },
  {
    phrase: '403 (permission / access denied)',
    pattern: /\b403\b/,
  },
  {
    phrase: '401 (unauthorized / auth error)',
    pattern: /\b401\b/,
  },
  {
    phrase: 'Account disabled / suspended',
    pattern: /account (?:has been )?(?:disabled|suspended|deactivated)|账号(?:被)?(?:封|停用|禁用)/i,
  },
  {
    phrase: 'Identity verification / KYC',
    pattern: /identity verification|\bkyc\b|身份验证|证件验证|护照/i,
  },
  {
    phrase: 'Starter Quota',
    pattern: /starter quota/i,
  },
  {
    phrase: 'Region / location unavailable',
    pattern: /not available in your (?:country|region)|地区(?:限制|不支持)|unsupported (?:region|country)/i,
  },
  {
    phrase: 'Suspicious activity / signals',
    pattern: /suspicious (?:activity|signals?)|可疑(?:信号|活动)/i,
  },
];

export function isValidReportMonth(month: string): boolean {
  return REPORT_MONTH_RE.test(month);
}

function nextMonthString(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 12
    ? `${y + 1}-01`
    : `${y}-${String(m + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(month: string, locale: Locale): string {
  const [y, m] = month.split('-').map(Number);
  if (locale === 'zh') return `${y} 年 ${m} 月`;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export async function listReportMonths(
  db: D1Database,
  minRecords = REPORT_MIN_RECORDS,
): Promise<ReportMonthSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT strftime('%Y-%m', datetime(approved_at, '+8 hours')) AS month,
              COUNT(*) AS total,
              SUM(CASE WHEN origin = 'community' THEN 1 ELSE 0 END) AS community,
              MAX(updated_at) AS updated_at
       FROM tombstones
       WHERE status = 'approved' AND approved_at IS NOT NULL AND ${SUPPORTED_VENDOR_FILTER}
       GROUP BY month
       HAVING COUNT(*) >= ?
       ORDER BY month DESC`,
    )
    .bind(minRecords)
    .all<{
      month: string;
      total: number;
      community: number;
      updated_at: string;
    }>();
  return results
    .filter((row) => isValidReportMonth(row.month))
    .map((row) => ({
      month: row.month,
      total: Number(row.total || 0),
      community: Number(row.community || 0),
      updatedAt: row.updated_at,
    }));
}

export async function latestReportMonth(
  db: D1Database,
  minRecords = REPORT_MIN_RECORDS,
): Promise<string | null> {
  const months = await listReportMonths(db, minRecords);
  return months[0]?.month ?? null;
}

export async function buildMonthlyReport(
  db: D1Database,
  month: string,
  now: Date | number = Date.now(),
): Promise<MonthlyReportData | null> {
  if (!isValidReportMonth(month)) return null;
  const start = beijingMidnight(`${month}-01`);
  const end = beijingMidnight(`${nextMonthString(month)}-01`);

  const [{ results }, months] = await Promise.all([
    db
      .prepare(
        `SELECT id, vendor, event_type, appeal_status, origin, story, story_en, approved_at, updated_at
         FROM tombstones
         WHERE status = 'approved'
           AND ${SUPPORTED_VENDOR_FILTER}
           AND approved_at >= ?
           AND approved_at < ?
         ORDER BY approved_at DESC, id DESC`,
      )
      .bind(start, end)
      .all<ReportRecordRow>(),
    listReportMonths(db, REPORT_MIN_RECORDS),
  ]);

  if (results.length === 0) return null;

  let submitted = 0;
  let community = 0;
  let publishedAt = results[0]!.approved_at;
  let updatedAt = results[0]!.updated_at;

  const vendorCounts = new Map<
    Vendor,
    { total: number; submitted: number; community: number }
  >(VENDORS.map((v) => [v, { total: 0, submitted: 0, community: 0 }]));
  const eventCounts = new Map<EventKey, number>(EVENTS.map((e) => [e, 0]));
  const appeals = {
    totalMentioned: 0,
    pending: 0,
    restored: 0,
    rejected: 0,
    noneOrUnstated: 0,
  };

  const noticeHits = new Map<
    string,
    { count: number; exampleId: string; exampleVendor: Vendor }
  >();

  for (const row of results) {
    const isCommunity = row.origin === 'community';
    if (isCommunity) community++;
    else submitted++;

    if (row.approved_at < publishedAt) publishedAt = row.approved_at;
    if (row.updated_at > updatedAt) updatedAt = row.updated_at;

    const vBucket = vendorCounts.get(row.vendor);
    if (vBucket) {
      vBucket.total++;
      if (isCommunity) vBucket.community++;
      else vBucket.submitted++;
    }

    eventCounts.set(row.event_type, (eventCounts.get(row.event_type) ?? 0) + 1);

    if (row.appeal_status === 'pending') {
      appeals.pending++;
      appeals.totalMentioned++;
    } else if (row.appeal_status === 'restored') {
      appeals.restored++;
      appeals.totalMentioned++;
    } else if (row.appeal_status === 'rejected') {
      appeals.rejected++;
      appeals.totalMentioned++;
    } else {
      appeals.noneOrUnstated++;
    }

    const haystack = `${row.story ?? ''}\n${row.story_en ?? ''}`;
    for (const item of KNOWN_NOTICES) {
      if (item.pattern.test(haystack)) {
        const hit = noticeHits.get(item.phrase);
        if (hit) {
          hit.count++;
        } else {
          noticeHits.set(item.phrase, {
            count: 1,
            exampleId: row.id,
            exampleVendor: row.vendor,
          });
        }
      }
    }
  }

  const today = beijingDay(now);
  const inProgress = today.slice(0, 7) === month;
  const asOf = inProgress ? today : beijingDay(Date.parse(updatedAt));

  const byVendor = VENDORS.map((vendor) => ({
    vendor,
    ...vendorCounts.get(vendor)!,
  }));
  const byEvent = EVENTS.map((event) => ({
    event,
    count: eventCounts.get(event) ?? 0,
  })).filter((item) => item.count > 0);
  const notices: NoticePhraseMatch[] = [...noticeHits.entries()]
    .map(([phrase, data]) => ({ phrase, ...data }))
    .sort((a, b) => b.count - a.count);

  return {
    month,
    total: results.length,
    submitted,
    community,
    asOf,
    inProgress,
    publishedAt,
    updatedAt,
    byVendor,
    byEvent,
    appeals,
    notices,
    otherMonths: months.map((m) => m.month).filter((m) => m !== month),
  };
}

export function reportTitle(month: string, locale: Locale): string {
  const label = formatMonthLabel(month, locale);
  return locale === 'en'
    ? `Haomeile Monthly Data Report (${label}): Claude, Codex & Antigravity Records · Haomeile`
    : `${label}月度数据报告：Claude、Codex、Antigravity 公开记录汇总 · 号没了`;
}

export function reportHeading(month: string, locale: Locale): string {
  const label = formatMonthLabel(month, locale);
  return locale === 'en'
    ? `${label} Monthly Data Report`
    : `${label}月度数据报告`;
}

export function reportDescription(
  report: MonthlyReportData,
  locale: Locale,
): string {
  const label = formatMonthLabel(report.month, locale);
  if (locale === 'en') {
    return `Public records compiled on Haomeile in ${label} (${report.total} entries as of ${report.asOf}: ${report.community} community summaries and ${report.submitted} user submissions) across Claude, Codex and Antigravity, with event breakdowns and methodology.`;
  }
  return `截至 ${report.asOf}，号没了在 ${label} 共公开收录 ${report.total} 条 Claude、Codex 与 Antigravity 账号记录（社区整理 ${report.community} 条、用户投稿 ${report.submitted} 条），含事件分布、申诉提及次数、常见提示词与统计口径。`;
}

export function reportLead(report: MonthlyReportData, locale: Locale): string {
  const label = formatMonthLabel(report.month, locale);
  if (locale === 'en') {
    const scope = report.inProgress
      ? `As of ${report.asOf} (Beijing time, UTC+8; updated through month end)`
      : `Finalized snapshot for ${label} (last revised ${report.asOf}, Beijing time, UTC+8)`;
    return `${scope}, Haomeile publicly recorded ${report.total} entries for Claude, Codex and Antigravity (${report.community} community summaries and ${report.submitted} user submissions). These figures describe only what was posted or compiled on this site—they are not ban rates, platform rankings or official provider statistics.`;
  }
  const scope = report.inProgress
    ? `截至 ${report.asOf}（北京时间 UTC+8，持续更新至本月末固定）`
    : `${label}月度汇总（北京时间 UTC+8，最近修订于 ${report.asOf}）`;
  return `${scope}，号没了共公开收录 ${report.total} 条 Claude、Codex 与 Antigravity 账号记录，其中社区整理 ${report.community} 条、用户投稿 ${report.submitted} 条。以下数字只反映本站收录情况，未经独立核实，不代表封号比例、平台对比或厂商官方统计。`;
}

export function renderMonthlyReportBody(
  report: MonthlyReportData,
  locale: Locale,
  escapeHtml: (value: unknown) => string,
): string {
  const labels = getLabels(locale);
  const text = (zh: string, en: string) => (locale === 'en' ? en : zh);
  const e = escapeHtml;

  const vendorRows = report.byVendor
    .map(
      ({ vendor, total, community, submitted }) =>
        `<tr><td><a href="${e(localePath(`/v/${vendor}`, locale))}">${e(labels.vendor[vendor] ?? vendor)}</a></td><td>${total}</td><td>${community}</td><td>${submitted}</td></tr>`,
    )
    .join('');

  const eventRows = report.byEvent
    .map(
      ({ event, count }) =>
        `<tr><td>${e(labels.event_type_short[event] ?? event)}</td><td>${count}</td></tr>`,
    )
    .join('');

  const noticeSection = report.notices.length
    ? `<h2>${text('本月记录中常见的提示与报错措辞', 'Common notices & error wording in this month’s records')}</h2>` +
      `<p>${text(
        '以下按本站公开记录文本中实际出现的关键词统计提及次数，并附一条当月示例记录；同一条记录可能同时提到多项。',
        'Counts reflect terms appearing in this month’s public record summaries, with one example entry each; a single record may mention more than one.',
      )}</p>` +
      `<div class="report-table"><table><thead><tr><th scope="col">${text('提示或报错关键词', 'Notice / error wording')}</th><th scope="col">${text('提及条数', 'Records mentioning')}</th><th scope="col">${text('示例记录', 'Example')}</th></tr></thead><tbody>` +
      report.notices
        .map(
          (item) =>
            `<tr><td><code>${e(item.phrase)}</code></td><td>${item.count}</td><td><a href="${e(localePath(`/t/${item.exampleId}`, locale))}">${e(labels.vendor[item.exampleVendor] ?? item.exampleVendor)} · ${text('查看记录', 'View record')}</a></td></tr>`,
        )
        .join('') +
      `</tbody></table></div>`
    : '';

  const otherMonthsSection = report.otherMonths.length
    ? `<h2>${text('其他月份报告', 'Other monthly reports')}</h2><ul>` +
      report.otherMonths
        .map(
          (m) =>
            `<li><a href="${e(localePath(`/report/${m}`, locale))}">${e(formatMonthLabel(m, locale))}</a></li>`,
        )
        .join('') +
      `</ul>`
    : '';

  return (
    `<h2>${text('按产品统计（仅反映本站收录条数）', 'Records by product (compiled count only)')}</h2>` +
    `<div class="report-table"><table><thead><tr><th scope="col">${text('产品', 'Product')}</th><th scope="col">${text('合计', 'Total')}</th><th scope="col">${text('社区整理', 'Community summaries')}</th><th scope="col">${text('用户投稿', 'User submissions')}</th></tr></thead><tbody>${vendorRows}</tbody></table></div>` +
    `<h2>${text('按事件种类统计', 'Records by incident type')}</h2>` +
    `<div class="report-table"><table><thead><tr><th scope="col">${text('事件种类', 'Incident type')}</th><th scope="col">${text('记录条数', 'Records')}</th></tr></thead><tbody>${eventRows}</tbody></table></div>` +
    `<h2>${text('可见的申诉与恢复提及', 'Visible appeal & recovery mentions')}</h2>` +
    `<p>${text(
      `在本月收录的 ${report.total} 条记录中，有 ${report.appeals.totalMentioned} 条在原帖或自述中明确写到了申诉状态：申诉中 ${report.appeals.pending} 条、提到已恢复 ${report.appeals.restored} 条、提到被驳回 ${report.appeals.rejected} 条；其余 ${report.appeals.noneOrUnstated} 条未说明或尚未申诉。很多原帖在发帖后不会更新最终结果，因此这些数字不能换算成申诉成功率。`,
      `Of the ${report.total} records compiled this month, ${report.appeals.totalMentioned} stated an appeal status in the source or submission: ${report.appeals.pending} pending, ${report.appeals.restored} mentioning restoration, and ${report.appeals.rejected} mentioning rejection; the remaining ${report.appeals.noneOrUnstated} did not state a status or had not appealed. Many public posts are never updated with a final outcome, so these counts cannot be read as a recovery rate.`,
    )}</p>` +
    noticeSection +
    `<h2>${text('统计口径与局限', 'Methodology & limitations')}</h2>` +
    `<ul>` +
    `<li>${text(
      '月份按记录公开收录时间（北京时间 UTC+8）归档，而不是按账号事件发生日统计；与数据说明页保持一致。',
      'Months are grouped by public approval timestamp in Beijing time (UTC+8), matching the Data & privacy definitions rather than incident date.',
    )}</li>` +
    `<li>${text(
      '用户投稿与社区整理分别列出。社区整理由本站编辑自公开原帖转述并附出处，未经本站独立核实；用户投稿由站长按使用须知审核后公开。',
      'User submissions and community summaries are counted separately. Community summaries are edited from public posts with source links and are not independently verified; user submissions are reviewed against site rules before publication.',
    )}</li>` +
    `<li>${text(
      '本站收录受社群活跃度、语言偏好和公开分享意愿影响，不能推算任何厂商的实际封号比例，也不能用于“哪家更容易封号”的排名比较。',
      'What appears on Haomeile depends on community activity, language and willingness to post publicly. It cannot be used to estimate actual ban rates or rank providers.',
    )}</li>` +
    `<li>${text(
      '本站与 Anthropic、OpenAI、Google 或任何 AI 厂商无隶属关系。如原帖作者需要更正或撤回，请通过对应记录详情页的“举报”联系我们。',
      'Haomeile is independent and not affiliated with Anthropic, OpenAI, Google or any AI provider. Original authors can request corrections or removal via Report on any entry page.',
    )}</li>` +
    `</ul>` +
    otherMonthsSection +
    `<h2>${text('相关入口', 'Related links')}</h2>` +
    `<ul class="report-links">` +
    `<li><a href="${e(localePath('/appeal', locale))}">${text('官方申诉入口与等待时间', 'Official appeal forms & wait times')}</a></li>` +
    `<li><a href="${e(localePath('/tips', locale))}">${text('使用小技巧与订阅排查指南', 'Tips & subscription troubleshooting')}</a></li>` +
    `<li><a href="${e(localePath('/privacy#stats', locale))}">${text('查看完整统计口径说明', 'Read full statistical definitions')}</a></li>` +
    `<li><a href="${e(localePath('/', locale))}">${text('返回纪念墙', 'Back to the memorial wall')}</a></li>` +
    `</ul>`
  );
}

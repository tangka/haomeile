import { localePath, type Locale } from '../shared/i18n';
import type { VendorAnswer } from '../shared/vendor-answers';
import { escapeHtml as e } from './render';

/** Posts whose record was hidden or withdrawn must not stay in the timeline. */
export function renderVendorAnswer(
  answer: VendorAnswer,
  locale: Locale,
  recordIds: ReadonlyMap<string, string>,
): string {
  const link = (href: string, label: string) =>
    href.startsWith('/')
      ? `<a href="${e(localePath(href, locale))}">${e(label)}</a>`
      : `<a href="${e(href)}" target="_blank" rel="noopener noreferrer">${e(label)}</a>`;
  const links = (items?: { href: string; label: Record<Locale, string> }[]) =>
    (items ?? [])
      .map((item) => ' ' + link(item.href, item.label[locale]))
      .join('');
  const text = (zh: string, en: string) => (locale === 'en' ? en : zh);
  const steps = answer.steps
    .map((step) => `<li>${e(step.text[locale])}${links(step.links)}</li>`)
    .join('');
  const sections = answer.sections
    .map(
      (section) =>
        `<h2>${e(section.title[locale])}</h2><ul>${section.items
          .map(
            (item) =>
              `<li>${item.term ? `<strong>${e(item.term[locale])}</strong>${text('：', ': ')}` : ''}${e(item.text[locale])}${links(item.links)}</li>`,
          )
          .join('')}</ul>`,
    )
    .join('');
  const rows = (answer.timeline?.rows ?? []).filter((row) =>
    recordIds.has(row.source),
  );
  const date = (value: string | null) =>
    value
      ? `<time datetime="${e(value)}">${e(value)}</time>`
      : e(text('未写明', 'Not stated'));
  const count = (outcome: (typeof rows)[number]['outcome']) =>
    rows.filter((row) => row.outcome === outcome).length;
  const asOf = rows.reduce(
    (last, row) => (row.seen > last ? row.seen : last),
    '',
  );
  // Too few posts would make a tally look like a success rate.
  const tally =
    rows.length >= 5
      ? `<p><strong>${text(
          `截至 ${asOf}，下面 ${rows.length} 条里：${count('restored')} 条恢复访问（含只恢复部分账号），${count('disabled-again')} 条恢复后又停用，${count('waiting')} 条最后可见时仍未恢复。`,
          `As of ${asOf}, of the ${rows.length} posts below: ${count('restored')} regained access (including partly), ${count('disabled-again')} were restored and then disabled again, and ${count('waiting')} were not restored when last seen.`,
        )}</strong></p>`
      : '';
  const timeline =
    answer.timeline && rows.length
      ? `<h2 id="wait">${e(answer.timeline.title[locale])}</h2><p>${e(answer.timeline.intro[locale])}</p>${tally}<div class="answer-table"><table><thead><tr><th scope="col">${text('停用', 'Disabled')}</th><th scope="col">${text('申诉', 'Appealed')}</th><th scope="col">${text('最后可见', 'Last seen')}</th><th scope="col">${text('状态', 'Status')}</th><th scope="col">${text('出处', 'Source')}</th></tr></thead><tbody>${rows
          .map(
            (row) =>
              `<tr><td>${date(row.suspended)}</td><td>${date(row.appealed)}</td><td>${date(row.seen)}</td><td>${e(row.status[locale])}</td><td><a href="${e(localePath('/t/' + recordIds.get(row.source)!, locale))}">${text('记录', 'Record')}</a> <a href="${e(row.source)}" target="_blank" rel="noopener noreferrer nofollow">${text('原帖', 'Post')}</a></td></tr>`,
          )
          .join('')}</tbody></table></div>`
      : '';
  return `<h2 id="answer">${e(answer.stepsTitle[locale])}</h2><ol>${steps}</ol>${sections}${timeline}<p class="updated">${text('官方页面核对日期：', 'Official pages checked: ')}${date(answer.checkedOn)}${text('。本站与任何 AI 厂商无隶属关系。', '. Not affiliated with any AI company.')}</p>`;
}

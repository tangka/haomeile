import { currentLocale, localePath, tr } from '../../shared/i18n';
import type { PublicTombstone } from '../../worker/types';
import { element } from './browser';
import { getLabels } from './labels';
import {
  flowerPresentation,
  lifeLine,
  fmtDate,
  fmtMemorialNumber,
  num,
} from './format';
import { tombPresentation } from '../../shared/tomb-presentation';
const labels = getLabels();
const DECORATIONS: Record<string, [string, string, number, number][]> = {
  flower: [
    ['flower.svg', 'l', 20, 20],
    ['flower.svg', 'r', 20, 20],
  ],
  cloud: [['cloud.svg', 'r', 24, 11]],
  star: [
    ['star.svg', 'l', 20, 14],
    ['star.svg', 'r', 20, 14],
  ],
};
function image(
  file: string,
  className: string,
  width: number,
  height: number,
): HTMLImageElement {
  const img = element('img', className);
  img.src = '/assets/' + file;
  img.width = width;
  img.height = height;
  img.alt = '';
  return img;
}
export function createTombCard(
  tomb: PublicTombstone,
  detail = false,
): HTMLElement {
  const locale = currentLocale();
  const view = tombPresentation(tomb, locale);
  const text = (zh: string, en: string) => tr(zh, locale, en);
  const card = element('article', 'tomb');
  card.dataset.id = tomb.id;
  if (detail || !view.community)
    for (const [file, side, width, height] of DECORATIONS[tomb.card_style] ||
      DECORATIONS.flower)
      card.append(image(file, `tomb-deco ${side}`, width, height));
  const body = element('div', 'tomb-body stone-shape');
  const face = element('div', 'tomb-face stone-shape');
  body.append(face);
  card.append(body);
  if (tomb.memorial_number)
    face.append(
      element('p', 'tomb-number', fmtMemorialNumber(tomb.memorial_number)),
    );
  const name = element(
    detail ? 'h1' : 'h3',
    'tomb-name',
    view.codename || tr('无名氏'),
  );
  if (detail) face.append(name);
  else {
    const link = element('a', 'tomb-link');
    link.href = localePath(`/t/${tomb.id}`);
    link.append(name);
    face.append(link);
  }
  const incidentDate = tomb.died_at
    ? element('time', undefined, fmtDate(tomb.died_at, locale))
    : text('事件日期未说明', 'Incident date not stated');
  if (typeof incidentDate !== 'string') incidentDate.dateTime = tomb.died_at;
  if (detail && view.community) {
    const date = element('p', 'tomb-meta');
    date.append(
      tomb.died_at ? text('事件日期 ', 'Incident date ') : '',
      incidentDate,
    );
    face.append(date);
  } else if (
    !view.community &&
    (detail || (tomb.born_at && tomb.born_precision !== 'none'))
  ) {
    const life = lifeLine(tomb, locale);
    const lifeP = element('p', 'tomb-life');
    lifeP.append(element('span', 'tomb-days', life.days));
    if (detail) lifeP.append(element('span', 'tomb-range', life.range));
    face.append(lifeP);
  }
  const vendorName = labels.vendor[tomb.vendor] || tomb.vendor;
  const eventName = labels.event_type_short[tomb.event_type] || tr('其他');
  if (detail) {
    const tags = element('ul', 'tags');
    tags.append(
      element('li', 'tag', vendorName),
      element('li', 'tag', eventName),
    );
    face.append(tags);
  } else {
    const metadata = element('p', 'tomb-meta');
    metadata.append(vendorName, ' · ', eventName, ' · ', incidentDate);
    face.append(metadata);
  }
  if (tomb.epitaph) face.append(element('p', 'tomb-epitaph', tomb.epitaph));
  face.append(element('p', 'tomb-story', view.story || ''));
  if (view.source) {
    const provenance = element('p', 'tomb-source');
    const link = element(
      'a',
      undefined,
      text('查看原帖', 'Read original post') + ' · ' + tomb.source_platform,
    );
    link.href = view.source;
    link.target = '_blank';
    link.rel = 'noopener noreferrer nofollow';
    provenance.append(link);
    if (tomb.source_published_at) {
      const time = element(
        'time',
        undefined,
        fmtDate(tomb.source_published_at, locale),
      );
      time.dateTime = tomb.source_published_at;
      provenance.append(' · ', time);
    }
    face.append(provenance);
  }
  if (detail) {
    const facts = element('dl', 'facts');
    const add = (label: string, text: string) => {
      facts.append(
        element('dt', undefined, label),
        element('dd', undefined, text),
      );
    };
    add(
      view.community ? text('整理', 'Summary by') : tr('署名'),
      view.community ? text('号没了', 'Haomeile') : tomb.nickname || tr('匿名'),
    );
    add(
      tr('套餐'),
      view.community && tomb.plan === 'unknown'
        ? text('原帖未说明', 'Not stated in the source')
        : labels.plan[tomb.plan] || tr('不详'),
    );
    add(
      view.community
        ? text('原帖申诉状态', 'Appeal status in source')
        : tr('申诉'),
      view.community && tomb.appeal_status === 'none'
        ? text('原帖未说明', 'Not stated in the source')
        : labels.appeal_status[tomb.appeal_status] || tr('还没申诉'),
    );
    if (tomb.approved_at)
      add(
        view.community
          ? text('收录', 'Collected')
          : tr('立碑', locale, 'Added'),
        fmtDate(tomb.approved_at.slice(0, 10), currentLocale()),
      );
    face.append(facts);
  }
  const foot = element('div', 'tomb-foot');
  const flower = element('button', 'flower-btn');
  flower.type = 'button';
  flower.dataset.flowerId = tomb.id;
  flower.dataset.count = String(tomb.flowers);
  flower.setAttribute('aria-pressed', 'false');
  const { label, ariaLabel } = flowerPresentation(tomb.flowers, locale);
  flower.setAttribute('aria-label', ariaLabel);
  flower.append(
    image('flower.svg', '', 14, 14),
    element('span', undefined, label),
  );
  foot.append(flower);
  face.append(foot);
  return card;
}
export function createBars(
  rows: [string, number][],
  labels: Record<string, string>,
): HTMLUListElement {
  const maximum = Math.max(1, ...rows.map(([, count]) => count));
  const list = element('ul', 'bars');
  for (const [key, count] of rows) {
    const li = element('li');
    const bar = element('span', 'bar');
    bar.style.width = `${count === 0 ? 0 : Math.max(2, Math.round((count / maximum) * 100))}%`;
    li.append(
      element('span', undefined, labels[key] || key),
      bar,
      element('span', 'n', num(count)),
    );
    list.append(li);
  }
  return list;
}

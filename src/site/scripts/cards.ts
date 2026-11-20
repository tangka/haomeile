import { currentLocale, localePath, tr } from '../../shared/i18n';
import type { PublicTombstone } from '../../worker/types';
import { element } from './browser';
import { getLabels } from './labels';
import { lifeLine, fmtDate, num } from './format';
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
  const card = element('article', 'tomb');
  card.dataset.id = tomb.id;
  for (const [file, side, width, height] of DECORATIONS[tomb.card_style] ||
    DECORATIONS.flower)
    card.append(image(file, `tomb-deco ${side}`, width, height));
  const body = element('div', 'tomb-body stone-shape');
  const face = element('div', 'tomb-face stone-shape');
  body.append(face);
  card.append(body);
  const name = element(
    detail ? 'h1' : 'h3',
    'tomb-name',
    tomb.codename || tr('无名氏'),
  );
  if (detail) face.append(name);
  else {
    const link = element('a', 'tomb-link');
    link.href = localePath(`/t/${tomb.id}`);
    link.append(name);
    face.append(link);
  }
  const life = lifeLine(tomb, currentLocale()),
    lifeP = element('p', 'tomb-life');
  lifeP.append(
    element('span', 'tomb-days', life.days),
    element('span', 'tomb-range', life.range),
  );
  face.append(lifeP);
  const tags = element('ul', 'tags');
  tags.append(
    element('li', 'tag', labels.vendor[tomb.vendor] || tomb.vendor),
    element(
      'li',
      'tag',
      labels.event_type_short[tomb.event_type] || tr('其他'),
    ),
  );
  face.append(tags);
  if (tomb.epitaph) face.append(element('p', 'tomb-epitaph', tomb.epitaph));
  face.append(element('p', 'tomb-story', tomb.story || ''));
  if (detail) {
    const facts = element('dl', 'facts');
    const add = (label: string, text: string) => {
      facts.append(
        element('dt', undefined, label),
        element('dd', undefined, text),
      );
    };
    add(tr('署名'), tomb.nickname || tr('匿名'));
    add(tr('套餐'), labels.plan[tomb.plan] || tr('不详'));
    add(tr('申诉'), labels.appeal_status[tomb.appeal_status] || tr('还没申诉'));
    if (tomb.approved_at)
      add(
        tr('立碑', currentLocale(), 'Added'),
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
  flower.setAttribute(
    'aria-label',
    tr(`献花 ${num(tomb.flowers)}，为这块碑献一朵花`),
  );
  flower.append(
    image('flower.svg', '', 14, 14),
    element('span', undefined, tr(`献花 ${num(tomb.flowers)}`)),
  );
  foot.append(
    element('span', 'tomb-unverified', tr('用户自述，未经核实')),
    flower,
  );
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

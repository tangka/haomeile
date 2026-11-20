import { basePath, tr } from '../../shared/i18n';
import type { TombstonePage } from '../../worker/types';
import { api } from './api';
import { element } from './browser';
import { createTombCard } from './cards';
import { hydrateFlowers } from './flower';
import { toast } from './toast';
const rows = document.querySelector<HTMLElement>('#rows');
const more = document.querySelector<HTMLAnchorElement>('#more');
hydrateFlowers();
// Filter links navigate to their server-rendered destinations, so their heading,
// statistics, canonical URL and no-JavaScript behavior always remain consistent.
if (rows && more) {
  more.addEventListener('click', async (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    if (more.getAttribute('aria-disabled') === 'true') return;
    const next = new URL(more.href);
    const vendor = /^\/v\/([^/]+)/.exec(basePath(next.pathname))?.[1];
    if (vendor) next.searchParams.set('vendor', vendor);
    const before = more.textContent;
    more.textContent = tr('正在加载…');
    more.setAttribute('aria-disabled', 'true');
    const skeletons = Array.from({ length: 3 }, () => {
      const article = element('article', 'tomb tomb-skel');
      article.setAttribute('aria-hidden', 'true');
      const body = element('div', 'tomb-body stone-shape'),
        face = element('div', 'tomb-face stone-shape');
      for (const width of ['w40', 'w60', 'w80', 'w80', 'w60'])
        face.append(element('div', `skel-line ${width}`));
      body.append(face);
      article.append(body);
      rows.append(article);
      return article;
    });
    rows.setAttribute('aria-busy', 'true');
    try {
      const page = await api<TombstonePage>(
        '/api/tombstones?' + next.searchParams.toString(),
      );
      skeletons.forEach((node) => node.remove());
      page.items.forEach((tomb) => rows.append(createTombCard(tomb)));
      hydrateFlowers(rows);
      if (page.next_cursor) {
        const url = new URL(more.href);
        url.searchParams.set('cursor', page.next_cursor);
        more.href = url.pathname + url.search;
      } else more.hidden = true;
    } catch (error) {
      toast(
        error instanceof Error ? error.message : tr('没能加载更多，稍后再试。'),
      );
    } finally {
      skeletons.forEach((node) => node.remove());
      rows.removeAttribute('aria-busy');
      more.textContent = before;
      more.removeAttribute('aria-disabled');
    }
  });
}

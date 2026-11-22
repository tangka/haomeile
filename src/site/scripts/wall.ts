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
if (rows && more && !more.hidden) {
  let loading = false;
  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          ([entry]) => {
            if (entry?.isIntersecting) void loadMore();
          },
          { rootMargin: '0px 0px 320px' },
        )
      : undefined;

  const loadMore = async () => {
    if (loading || more.hidden) return;
    loading = true;
    observer?.unobserve(more);
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
    let hasMore = false;
    try {
      const page = await api<TombstonePage>(
        '/api/tombstones?' + next.searchParams.toString(),
      );
      skeletons.forEach((node) => node.remove());
      page.items.forEach((tomb) => rows.append(createTombCard(tomb)));
      hydrateFlowers(rows);
      if (
        page.next_cursor &&
        page.next_cursor !== next.searchParams.get('cursor')
      ) {
        const url = new URL(more.href);
        url.searchParams.set('cursor', page.next_cursor);
        more.href = url.pathname + url.search;
        hasMore = true;
      } else {
        more.hidden = true;
        observer?.disconnect();
      }
    } catch {
      toast(tr('没能加载更多，稍后再试。'));
    } finally {
      skeletons.forEach((node) => node.remove());
      rows.removeAttribute('aria-busy');
      more.textContent = before;
      more.removeAttribute('aria-disabled');
      loading = false;
      // A failed load leaves the link available for a deliberate retry.
      if (hasMore) observer?.observe(more);
    }
  };

  more.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    void loadMore();
  });
  observer?.observe(more);
}

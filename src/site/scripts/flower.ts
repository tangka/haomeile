import { currentLocale, tr } from '../../shared/i18n';
import { api } from './api';
import { shanghaiDate, visitorId } from './browser';
import { flowerPresentation } from './format';
import { toast } from './toast';
function storageKey(id: string): string {
  return `haomeile:flower:${shanghaiDate()}:${id}`;
}
function flowered(id: string): boolean {
  try {
    return localStorage.getItem(storageKey(id)) === '1';
  } catch {
    return false;
  }
}
function render(
  button: HTMLButtonElement,
  count: number,
  pressed: boolean,
): void {
  const { label, ariaLabel } = flowerPresentation(
    count,
    currentLocale(),
    pressed,
  );
  button.setAttribute('aria-pressed', String(pressed));
  button.setAttribute('aria-label', ariaLabel);
  const text = button.querySelector('span');
  if (text) text.textContent = label;
  button.dataset.count = String(count);
}
export function hydrateFlowers(root: ParentNode = document): void {
  root
    .querySelectorAll<HTMLButtonElement>('button.flower-btn')
    .forEach((button) => {
      if (button.dataset.bound) return;
      const id =
        button.dataset.flowerId ||
        button.closest<HTMLElement>('.tomb')?.dataset.id;
      if (!id) return;
      const count =
        Number(
          button.dataset.count ??
            button.querySelector('span')?.textContent?.replace(/[^\d]/g, ''),
        ) || 0;
      button.dataset.bound = 'true';
      render(button, count, flowered(id));
      button.addEventListener('click', async () => {
        if (button.disabled) return;
        if (button.getAttribute('aria-pressed') === 'true') {
          toast(tr('今天已经给这块碑献过花了'));
          return;
        }
        const before = Number(button.dataset.count) || 0;
        button.disabled = true;
        render(button, before + 1, true);
        const pop = document.createElement('img');
        pop.src = '/assets/flower.svg';
        pop.className = 'pop';
        pop.width = 14;
        pop.height = 14;
        pop.alt = '';
        button.append(pop);
        setTimeout(() => pop.remove(), 650);
        try {
          const result = await api<{ flowers: number }>(
            `/api/tombstones/${encodeURIComponent(id)}/flower`,
            { visitor_id: visitorId() },
          );
          render(button, result.flowers, true);
          try {
            localStorage.setItem(storageKey(id), '1');
          } catch {
            /* The server also enforces daily deduplication. */
          }
        } catch (error) {
          render(button, before, false);
          toast(
            error instanceof Error
              ? error.message
              : tr('献花没成功，稍后再试。'),
          );
        } finally {
          button.disabled = false;
        }
      });
    });
}

import { basePath, tr } from '../../shared/i18n';
import { checkPrivacy } from '../../worker/lib/privacy';
import { api } from './api';
import { visitorId } from './browser';
import { hydrateFlowers } from './flower';
import { toast } from './toast';
import { mountTurnstile, type Challenge } from './turnstile';
hydrateFlowers();
document.querySelector('#copy-link')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.origin + location.pathname);
    toast(tr('链接已复制'));
  } catch {
    toast(tr('没能复制，请手动复制地址栏里的链接。'));
  }
});
const dialog = document.querySelector<HTMLDialogElement>('#report')!;
const form = document.querySelector<HTMLFormElement>('#report-form')!;
const error = document.querySelector<HTMLElement>('#report-error')!;
const note = document.querySelector<HTMLTextAreaElement>('#report-note')!;
let challenge: Challenge | undefined;
let mounting = false;
function showError(message: string): void {
  error.textContent = tr(message);
  error.hidden = false;
}
document.querySelector('#open-report')?.addEventListener('click', async () => {
  dialog.showModal();
  if (challenge || mounting) return;
  mounting = true;
  try {
    challenge = await mountTurnstile(
      document.querySelector<HTMLElement>('#report-turnstile')!,
    );
  } catch (failure) {
    showError(
      failure instanceof Error
        ? failure.message
        : tr('人机验证没能加载，请刷新页面。'),
    );
  } finally {
    mounting = false;
  }
});
document
  .querySelector('#cancel-report')!
  .addEventListener('click', () => dialog.close());
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.hidden = true;
  note.removeAttribute('aria-invalid');
  const privacy = checkPrivacy(note.value);
  if (privacy) {
    note.setAttribute('aria-invalid', 'true');
    note.setAttribute('aria-describedby', 'report-error');
    showError(privacy.message);
    note.focus();
    return;
  }
  if (Array.from(note.value).length > 200) {
    showError(tr('补充说明最多 200 个字。'));
    return;
  }
  const token = challenge?.token();
  if (!token) {
    showError(tr('人机验证没通过。刷新一下验证框，再点一次提交。'));
    return;
  }
  const button = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  button.disabled = true;
  try {
    const id =
      form.dataset.tombId ||
      basePath(location.pathname).split('/').filter(Boolean)[1];
    const data = new FormData(form);
    await api(`/api/tombstones/${encodeURIComponent(id || '')}/report`, {
      visitor_id: visitorId(),
      reason: data.get('reason'),
      note: note.value,
      turnstile_token: token,
    });
    dialog.close();
    form.reset();
    toast(tr('收到了，会尽快处理。'));
  } catch (failure) {
    showError(
      failure instanceof Error
        ? failure.message
        : tr('举报没成功，请稍后再试。'),
    );
  } finally {
    button.disabled = false;
    challenge?.reset();
  }
});

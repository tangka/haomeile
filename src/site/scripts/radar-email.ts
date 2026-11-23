import { currentLocale, tr } from '../../shared/i18n';

type EmailAction = 'confirm' | 'unsubscribe';
type EmailLink = { action: EmailAction; token: string };

const signup = document.querySelector<HTMLFormElement>(
  '[data-radar-email-signup]',
);
const manage = document.querySelector<HTMLElement>('[data-radar-email-manage]');
if (signup) bindSignup(signup);
if (manage) bindManagement(manage);

async function postEmail(
  action: EmailAction | 'subscribe',
  body:
    | { token: string }
    | { email: string; platforms: string[]; locale: 'en' | 'zh' },
): Promise<number> {
  try {
    const response = await fetch('/api/radar/email/' + action, {
      method: 'POST',
      credentials: 'same-origin',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': currentLocale(),
      },
      body: JSON.stringify(body),
    });
    return response.status;
  } catch {
    return 0;
  }
}

function bindSignup(form: HTMLFormElement): void {
  const button = form.querySelector<HTMLButtonElement>('[type="submit"]');
  const status = form.querySelector<HTMLElement>('[data-radar-email-status]');
  if (!button || !status) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (button.disabled) return;
    const fields = new FormData(form);
    const email = String(fields.get('email') || '').trim();
    const platforms = fields.getAll('platform').map(String);
    if (platforms.length === 0) {
      status.textContent = tr('请至少选择一个平台。');
      form.querySelector<HTMLInputElement>('input[name="platform"]')?.focus();
      return;
    }
    button.disabled = true;
    status.textContent = tr('正在提交…');
    const code = await postEmail('subscribe', {
      email,
      platforms,
      locale: currentLocale(),
    });
    if (code >= 200 && code < 300) {
      form.reset();
      status.textContent = tr('请查收确认邮件。若收件箱没有，请检查垃圾邮件。');
    } else {
      status.textContent = tr(
        code === 429
          ? '请求过于频繁，请稍后再试。'
          : '提交未完成，请稍后再试。',
      );
    }
    button.disabled = false;
  });
}

function readEmailLink(fragment: URLSearchParams): EmailLink | undefined {
  const params = [...fragment];
  if (params.length !== 1) return undefined;
  const [action, token] = params[0];
  if (
    (action === 'confirm' || action === 'unsubscribe') &&
    token &&
    token.length <= 512
  )
    return { action, token };
  return undefined;
}

function bindManagement(page: HTMLElement): void {
  const button = page.querySelector<HTMLButtonElement>(
    '[data-radar-email-action]',
  );
  const status = page.querySelector<HTMLElement>('[data-radar-email-status]');
  if (!button || !status) return;
  let pending: EmailLink | undefined;
  const setAction = () => {
    const fragment = new URLSearchParams(location.hash.slice(1));
    if (!fragment.has('confirm') && !fragment.has('unsubscribe')) return;
    history.replaceState(history.state, '', location.pathname);
    pending = readEmailLink(fragment);
    button.hidden = !pending;
    if (!pending) {
      status.textContent = tr('请打开邮件中的确认或退订链接。');
      return;
    }
    const confirm = pending.action === 'confirm';
    button.textContent = tr(confirm ? '确认订阅' : '退订邮件提醒');
    status.textContent = tr(
      confirm
        ? '确认后，你会收到所选平台的邮件提醒。'
        : '退订后将停止收到重置雷达的邮件提醒。',
    );
  };
  setAction();
  window.addEventListener('hashchange', setAction);

  button.addEventListener('click', async () => {
    if (!pending || button.disabled) return;
    const link = pending;
    button.disabled = true;
    status.textContent = tr('正在提交…');
    const code = await postEmail(link.action, { token: link.token });
    button.disabled = false;
    if (pending !== link) return;

    if (code >= 200 && code < 300) {
      pending = undefined;
      button.hidden = true;
      status.textContent = tr(
        link.action === 'confirm' ? '订阅已确认。' : '已退订。',
      );
    } else if ([400, 404, 410].includes(code)) {
      pending = undefined;
      button.hidden = true;
      status.textContent = tr('链接无效或已失效，请使用最新邮件中的链接。');
    } else {
      status.textContent = tr(
        code === 429
          ? '请求过于频繁，请稍后再试。'
          : '提交未完成，请稍后再试。',
      );
    }
  });
}

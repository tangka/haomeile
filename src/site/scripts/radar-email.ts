import { currentLocale, tr } from '../../shared/i18n';

type EmailAction = 'confirm' | 'unsubscribe';
type EmailLink = { action: EmailAction; token: string };

function subscriptionChannel() {
  try {
    return new BroadcastChannel('radar-email-subscription');
  } catch {
    // Returning to the tab also refreshes its status.
    return undefined;
  }
}
const updates = subscriptionChannel();
const signup = document.querySelector<HTMLFormElement>(
  '[data-radar-email-signup]',
);
const manage = document.querySelector<HTMLElement>('[data-radar-email-manage]');
if (signup) bindSignup(signup);
if (manage) bindManagement(manage);

async function postEmail(
  action: EmailAction | 'subscribe' | 'confirm-code',
  body:
    | { token: string }
    | { email: string; code: string }
    | { email: string; platforms: string[]; locale: 'en' | 'zh' },
) {
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
    const data = response.ok ? await response.json() : null;
    return {
      status: response.status,
      alreadySubscribed: data?.alreadySubscribed === true,
      preferencesChanged: data?.preferencesChanged === true,
    };
  } catch {
    return { status: 0, alreadySubscribed: false, preferencesChanged: false };
  }
}

function confirmationMessage(result: {
  alreadySubscribed: boolean;
  preferencesChanged: boolean;
}) {
  if (result.preferencesChanged)
    return tr('这个邮箱已经订阅过了。提醒设置已更新。');
  return tr(
    result.alreadySubscribed ? '这个邮箱已经订阅过了。' : '订阅已确认。',
  );
}

function bindSignup(form: HTMLFormElement): void {
  const dialog = form.closest('dialog');
  const cta = document.querySelector<HTMLElement>('[data-radar-email-cta]');
  const trigger = cta?.querySelector<HTMLButtonElement>(
    '[data-ssr="radar-email-signup"]',
  );
  const subscribed = cta?.querySelector<HTMLElement>(
    '[data-radar-email-subscribed]',
  );
  const change = cta?.querySelector<HTMLButtonElement>(
    '[data-radar-email-edit-subscription]',
  );
  const title = dialog?.querySelector<HTMLElement>('#radar-email-title');
  const notice = document.querySelector<HTMLElement>(
    '[data-radar-email-notice]',
  );
  const verify = dialog?.querySelector<HTMLFormElement>(
    '[data-radar-email-verify]',
  );
  const code = verify?.querySelector<HTMLInputElement>('[name="code"]');
  const verifyButton =
    verify?.querySelector<HTMLButtonElement>('[type="submit"]');
  const edit = verify?.querySelector<HTMLButtonElement>('[data-edit-email]');
  const button = form.querySelector<HTMLButtonElement>('[type="submit"]');
  const address = form.querySelector<HTMLInputElement>('[name="email"]');
  const status = dialog?.querySelector<HTMLElement>(
    '[data-radar-email-status]',
  );
  if (
    !dialog ||
    !cta ||
    !subscribed ||
    !change ||
    !title ||
    !notice ||
    !trigger ||
    trigger.hidden ||
    !verify ||
    !code ||
    !verifyButton ||
    !edit ||
    !button ||
    !address ||
    !status
  )
    return;
  let pendingEmail = '';
  let statusVersion = 0;
  const resetForms = () => {
    pendingEmail = '';
    verify.reset();
    form.reset();
    code.removeAttribute('aria-invalid');
    verify.hidden = true;
    form.hidden = false;
    status.textContent = '';
  };
  const showState = (active: boolean) => {
    const newlyRecognized = active && cta.dataset.state !== 'subscribed';
    trigger.hidden = active;
    change.hidden = subscribed.hidden = !active;
    cta.dataset.state = active ? 'subscribed' : 'available';
    if (!active) notice.textContent = '';
    if (newlyRecognized && dialog.open) {
      dialog.close();
      resetForms();
      subscribed.focus();
    }
  };
  const refresh = async () => {
    const version = ++statusVersion;
    try {
      const response = await fetch('/api/radar/email/status', {
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        if (
          version === statusVersion &&
          typeof data?.subscribed === 'boolean'
        ) {
          showState(data.subscribed);
        }
      }
    } catch {
      // Keep the last confirmed state if the network is unavailable.
    } finally {
      if (version === statusVersion && cta.dataset.state === 'loading')
        showState(false);
    }
  };
  void refresh();
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) void refresh();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refresh();
  });
  updates?.addEventListener('message', () => void refresh());
  const finish = (message: string) => {
    ++statusVersion;
    dialog.close();
    resetForms();
    showState(true);
    subscribed.focus();
    notice.textContent = message;
    updates?.postMessage('changed');
  };
  const open = () => {
    if (dialog.open) return;
    notice.textContent = '';
    title.textContent = tr(trigger.hidden ? '修改订阅' : '订阅邮件提醒');
    dialog.showModal();
    if (pendingEmail) code.focus();
  };
  trigger.addEventListener('click', open);
  change.addEventListener('click', open);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (button.disabled || form.hidden) return;
    const fields = new FormData(form);
    const email = address.value.trim();
    const platforms = fields.getAll('platform').map(String);
    if (platforms.length === 0) {
      status.textContent = tr('请至少选择一个平台。');
      form.querySelector<HTMLInputElement>('input[name="platform"]')?.focus();
      return;
    }
    button.disabled = true;
    status.textContent = tr('正在提交…');
    const result = await postEmail('subscribe', {
      email,
      platforms,
      locale: currentLocale(),
    });
    if (result.status === 200 && result.alreadySubscribed) {
      finish(confirmationMessage(result));
    } else if (result.status === 202) {
      pendingEmail = email;
      form.hidden = true;
      verify.hidden = false;
      status.textContent = tr(
        result.alreadySubscribed
          ? '这个邮箱已经订阅过了。请查看 {email} 的收件箱，输入验证码确认修改。'
          : '请查看 {email} 的收件箱。',
      ).replace('{email}', () => email);
      code.focus();
    } else {
      status.textContent = tr(
        result.status === 429
          ? '请求过于频繁，请稍后再试。'
          : '提交未完成，请稍后再试。',
      );
    }
    button.disabled = false;
  });

  edit.addEventListener('click', () => {
    pendingEmail = '';
    verify.reset();
    code.removeAttribute('aria-invalid');
    verify.hidden = true;
    form.hidden = false;
    status.textContent = '';
    address.focus();
  });

  code.addEventListener('input', () => code.removeAttribute('aria-invalid'));
  verify.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!pendingEmail || verifyButton.disabled) return;
    verifyButton.disabled = edit.disabled = true;
    status.textContent = tr('正在提交…');
    const result = await postEmail('confirm-code', {
      email: pendingEmail,
      code: code.value,
    });
    if (result.status === 200) {
      finish(confirmationMessage(result));
    } else if (result.status === 410) {
      status.textContent = tr('验证码错误或已过期，请核对或重新获取。');
      code.setAttribute('aria-invalid', 'true');
      code.focus();
      code.select();
    } else {
      status.textContent = tr(
        result.status === 429
          ? '请求过于频繁，请稍后再试。'
          : '提交未完成，请稍后再试。',
      );
    }
    verifyButton.disabled = edit.disabled = false;
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
    const result = await postEmail(link.action, { token: link.token });
    button.disabled = false;
    if (pending !== link) return;

    if (result.status === 200) {
      pending = undefined;
      button.hidden = true;
      status.textContent =
        link.action === 'unsubscribe'
          ? tr('已退订。')
          : confirmationMessage(result);
      updates?.postMessage('changed');
    } else if ([400, 404, 410].includes(result.status)) {
      pending = undefined;
      button.hidden = true;
      status.textContent = tr('链接无效或已失效，请使用最新邮件中的链接。');
    } else {
      status.textContent = tr(
        result.status === 429
          ? '请求过于频繁，请稍后再试。'
          : '提交未完成，请稍后再试。',
      );
    }
  });
}

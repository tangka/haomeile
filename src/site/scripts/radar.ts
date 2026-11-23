import { tr } from '../../shared/i18n';
import { mountTurnstile, type Challenge } from './turnstile';

const verifier = document.querySelector<HTMLElement>(
  '[data-radar-verify]:not([hidden])',
);
if (verifier) bindVerifier(verifier);

function bindVerifier(verifier: HTMLElement): void {
  const start = verifier.querySelector<HTMLButtonElement>('[data-radar-start]');
  const widget = verifier.querySelector<HTMLElement>('[data-radar-challenge]');
  const status = verifier.querySelector<HTMLElement>('[data-radar-status]');
  if (!start || !widget || !status) return;

  let challenge: Challenge | undefined;
  let submitting = false;
  const retry = (message: string): void => {
    if (submitting) return;
    start.textContent = tr('重新验证');
    start.disabled = false;
    status.textContent = tr(message);
  };

  const submitToken = async (token: string): Promise<void> => {
    if (submitting || !start.disabled) return;
    submitting = true;
    status.textContent = tr('正在验证…');
    try {
      const response = await fetch('/api/radar/verify', {
        method: 'POST',
        credentials: 'same-origin',
        redirect: 'error',
        signal: AbortSignal.timeout(12_000),
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ turnstile_token: token }),
      });
      if (response.ok) {
        location.reload();
        return;
      }
      submitting = false;
      retry(
        response.status === 429
          ? '验证请求过多，请稍后再试。'
          : '验证未完成，请重试。',
      );
    } catch {
      submitting = false;
      retry('验证未完成，请重试。');
    }
  };

  start.addEventListener('click', async () => {
    start.disabled = true;
    status.textContent = tr('请完成人机验证。');
    try {
      if (challenge) challenge.reset();
      else
        challenge = await mountTurnstile(widget, {
          action: 'radar_gate',
          size: matchMedia('(max-width: 360px)').matches ? 'compact' : 'normal',
          onToken: (token) => void submitToken(token),
          onFailure: () => retry('验证未完成，请重试。'),
        });
    } catch {
      retry('人机验证暂时不可用，稍后再试。');
    }
  });
  start.hidden = false;
}

import { currentLocale, tr } from '../../shared/i18n';
interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      language: 'zh-cn' | 'en';
      action?: string;
      size?: 'normal' | 'compact';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
      'timeout-callback'?: () => void;
      'unsupported-callback'?: () => void;
    },
  ): string;
  getResponse(widget: string): string;
  reset(widget: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
let scriptReady: Promise<TurnstileApi> | undefined;
function load(): Promise<TurnstileApi> {
  if (typeof window.turnstile?.render === 'function')
    return Promise.resolve(window.turnstile);
  if (!scriptReady)
    scriptReady = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.addEventListener('load', () =>
        typeof window.turnstile?.render === 'function'
          ? resolve(window.turnstile)
          : reject(new Error(tr('人机验证没能加载，请刷新页面。'))),
      );
      script.addEventListener('error', () => {
        scriptReady = undefined;
        reject(new Error(tr('人机验证没能加载，请刷新页面。')));
      });
      document.head.append(script);
    });
  return scriptReady;
}
export interface Challenge {
  token(): string;
  reset(): void;
}
interface ChallengeOptions {
  action?: string;
  size?: 'normal' | 'compact';
  onToken?: (token: string) => void;
  onFailure?: () => void;
}
export async function mountTurnstile(
  container: HTMLElement,
  { onToken, onFailure, ...widgetOptions }: ChallengeOptions = {},
): Promise<Challenge> {
  const sitekey =
    container.dataset.turnstileSitekey ||
    document.querySelector<HTMLMetaElement>('meta[name="turnstile-site-key"]')
      ?.content;
  if (!sitekey) throw new Error(tr('人机验证尚未配置，请稍后再来。'));
  const turnstile = await load();
  let token = '';
  const clearToken = () => {
    token = '';
    onFailure?.();
  };
  const widget = turnstile.render(container, {
    sitekey,
    language: currentLocale() === 'en' ? 'en' : 'zh-cn',
    ...widgetOptions,
    callback: (value) => {
      token = value;
      onToken?.(value);
    },
    'expired-callback': clearToken,
    'error-callback': clearToken,
    ...(onFailure && {
      'timeout-callback': clearToken,
      'unsupported-callback': clearToken,
    }),
  });
  return {
    token: () => token || turnstile.getResponse(widget),
    reset: () => {
      token = '';
      turnstile.reset(widget);
    },
  };
}

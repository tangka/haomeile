interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
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
          : reject(new Error('人机验证没能加载，请刷新页面。')),
      );
      script.addEventListener('error', () => {
        scriptReady = undefined;
        reject(new Error('人机验证没能加载，请刷新页面。'));
      });
      document.head.append(script);
    });
  return scriptReady;
}
export interface Challenge {
  token(): string;
  reset(): void;
}
export async function mountTurnstile(
  container: HTMLElement,
): Promise<Challenge> {
  const sitekey =
    container.dataset.turnstileSitekey ||
    document.querySelector<HTMLMetaElement>('meta[name="turnstile-site-key"]')
      ?.content;
  if (!sitekey) throw new Error('人机验证尚未配置，请稍后再来。');
  const turnstile = await load();
  let token = '';
  const widget = turnstile.render(container, {
    sitekey,
    callback: (value) => {
      token = value;
    },
    'expired-callback': () => {
      token = '';
    },
    'error-callback': () => {
      token = '';
    },
  });
  return {
    token: () => token || turnstile.getResponse(widget),
    reset: () => {
      token = '';
      turnstile.reset(widget);
    },
  };
}

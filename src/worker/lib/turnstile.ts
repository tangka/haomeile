import type { Bindings } from '../types';
import { ApiError } from './errors';
export async function verifyTurnstile(token: unknown, env: Bindings): Promise<void> {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) throw new ApiError('TURNSTILE_FAILED', '人机验证没通过。刷新一下验证框，再点一次提交。');
  if (!env.TURNSTILE_SECRET) throw new ApiError('NOT_CONFIGURED', '服务尚未配置完成，请稍后再试。', 503);
  let result: { success?: boolean; hostname?: string };
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token }), signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('verification unavailable');
    result = await response.json();
  } catch { throw new ApiError('TURNSTILE_UNAVAILABLE', '人机验证暂时不可用，稍后再试。', 503); }
  if (!result.success || (env.ENVIRONMENT === 'production' && result.hostname !== new URL(env.SITE_ORIGIN).hostname)) throw new ApiError('TURNSTILE_FAILED', '人机验证没通过。刷新一下验证框，再点一次提交。');
}

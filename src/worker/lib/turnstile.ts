import type { Bindings } from '../types';
import { ApiError } from './errors';

const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';
const FAILURE_MESSAGE = '人机验证没通过。刷新一下验证框，再点一次提交。';
const CONFIG_MESSAGE = '服务尚未配置完成，请稍后再试。';

// Official dummy sitekeys and secrets use these fixed zero-filled values.
// Real credentials never receive the testing exception, even when a flag is set.
function isOfficialTestKey(value: string): boolean {
  return /^[123]x0{20,}[A-Z]{2}$/.test(value);
}

export async function verifyTurnstile(
  token: unknown,
  env: Bindings,
): Promise<void> {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048)
    throw new ApiError('TURNSTILE_FAILED', FAILURE_MESSAGE);

  const requestedTestMode = env.TURNSTILE_TEST_MODE === 'true';
  const testingEnvironment =
    env.ENVIRONMENT === 'test' || env.ENVIRONMENT === 'development';
  if (
    !env.TURNSTILE_SITE_KEY ||
    !env.TURNSTILE_SECRET ||
    (requestedTestMode && !testingEnvironment)
  )
    throw new ApiError('NOT_CONFIGURED', CONFIG_MESSAGE, 503);

  const testSitekey = isOfficialTestKey(env.TURNSTILE_SITE_KEY);
  const testSecret = isOfficialTestKey(env.TURNSTILE_SECRET);
  const testMode = requestedTestMode && testSitekey && testSecret;
  if ((testSitekey || testSecret) && !testMode)
    throw new ApiError('NOT_CONFIGURED', CONFIG_MESSAGE, 503);
  if (token === DUMMY_TOKEN && !testMode)
    throw new ApiError('TURNSTILE_FAILED', FAILURE_MESSAGE);

  let expectedHostname: string;
  try {
    const origin = new URL(env.SITE_ORIGIN);
    if (!['http:', 'https:'].includes(origin.protocol) || !origin.hostname)
      throw new Error('Invalid origin');
    expectedHostname = origin.hostname;
  } catch {
    throw new ApiError('NOT_CONFIGURED', CONFIG_MESSAGE, 503);
  }

  let result: unknown;
  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        // Workerd supports manual/follow only. Reject 3xx below without forwarding secrets.
        redirect: 'manual',
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET,
          response: token,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error('Verification unavailable');
    result = await response.json();
  } catch {
    throw new ApiError(
      'TURNSTILE_UNAVAILABLE',
      '人机验证暂时不可用，稍后再试。',
      503,
    );
  }

  if (
    !result ||
    typeof result !== 'object' ||
    !('success' in result) ||
    result.success !== true ||
    (!testMode &&
      (!('hostname' in result) || result.hostname !== expectedHostname))
  )
    throw new ApiError('TURNSTILE_FAILED', FAILURE_MESSAGE);
}

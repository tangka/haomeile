import { Hono, type Context } from 'hono';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';
import {
  RADAR_PLATFORM_NAMES,
  type RadarOverview,
  type RadarPlatformId,
} from '../shared/radar';
import type { AppEnv, Bindings } from '../worker/types';
import { ApiError } from '../worker/lib/errors';
import { readJson } from '../worker/lib/json';
import { hasRadarPass } from '../worker/lib/radar-gate';
import { reserveRate } from '../worker/lib/ratelimit';
import {
  createRadarEmailStore,
  normalizeRadarEmail,
  type RadarEmailOutcome,
  type ConfirmedRadarEmail,
} from './radar-email-store';

const subscriptionCookie = 'haomeile_radar_subscription';
const rememberSeconds = 180 * 24 * 60 * 60;

export function createRadarEmail(
  env: Bindings,
  apiKey?: string,
  sender?: string,
) {
  const store = createRadarEmailStore(env.DB, env.PEPPER);
  const senderAddress = normalizeRadarEmail(sender);
  const ready = Boolean(senderAddress && apiKey?.startsWith('re_'));
  const routes = new Hono<AppEnv>();
  const signingKey = env.PEPPER + '\0radar-email-read-only-v1';
  const cookieOptions = {
    httpOnly: true,
    secure: env.SITE_ORIGIN.startsWith('https://'),
    path: '/api/radar/email',
    sameSite: 'Lax' as const,
  };
  function remember(c: Context<AppEnv>, contactId: string) {
    const expiry = Math.floor(Date.now() / 1000) + rememberSeconds;
    return setSignedCookie(
      c,
      subscriptionCookie,
      `${contactId}:${expiry}`,
      signingKey,
      {
        ...cookieOptions,
        maxAge: rememberSeconds,
      },
    );
  }
  async function rememberedContact(c: Context<AppEnv>) {
    const value = await getSignedCookie(c, signingKey, subscriptionCookie);
    if (typeof value !== 'string') return null;
    const [id, expiry] = value.split(':');
    return Number(expiry) > Date.now() / 1000 ? id : null;
  }
  routes.get('/status', async (c) => {
    c.header('Cache-Control', 'private, no-store');
    c.header('Vary', 'Cookie');
    const id = await rememberedContact(c);
    if (!id || !(await store.isSubscribed(id)))
      return c.json({ subscribed: false });
    await remember(c, id);
    return c.json({ subscribed: true });
  });
  async function confirmed(
    c: Context<AppEnv>,
    { contactId, alreadySubscribed, preferencesChanged }: ConfirmedRadarEmail,
  ) {
    await remember(c, contactId);
    return c.json({
      ok: true,
      alreadySubscribed,
      ...(preferencesChanged && { preferencesChanged }),
    });
  }
  const link = (locale: string, path: string) =>
    env.SITE_ORIGIN + (locale === 'en' ? '/en' : '') + '/radar' + path;

  async function send(
    locale: 'zh' | 'en',
    to: string,
    subject: string,
    text: string,
    idempotencyKey: string,
  ): Promise<RadarEmailOutcome> {
    if (!ready) return 'retry';
    const from = `${locale === 'en' ? 'Reset Radar' : '重置雷达'} <${senderAddress}>`;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ from, to: [to], subject, text }),
        redirect: 'error',
        signal: AbortSignal.timeout(8_000),
      });
      if (response.ok) {
        const receipt: unknown = await response.json();
        return receipt &&
          typeof receipt === 'object' &&
          'id' in receipt &&
          typeof receipt.id === 'string' &&
          receipt.id
          ? 'sent'
          : 'retry';
      }
      await response.body?.cancel();
      console.warn('Radar email provider returned HTTP', response.status);
      return response.status === 422 ? 'permanent' : 'retry';
    } catch {
      console.warn('Radar email provider unavailable');
      return 'retry';
    }
  }

  routes.post('/subscribe', async (c) => {
    if (!ready)
      throw new ApiError('EMAIL_UNAVAILABLE', '邮件提醒暂不可用。', 503);
    if (env.RADAR_HUMAN_CHECK !== 'false' && !(await hasRadarPass(c))) {
      throw new ApiError(
        'RADAR_PASS_REQUIRED',
        '请先打开重置雷达完成验证。',
        403,
      );
    }
    await reserveRate(
      env.DB,
      env.PEPPER,
      c.req.header('CF-Connecting-IP') || null,
      'radar_email_signup',
      6,
      true,
    );
    const body = await readJson(c.req.raw);
    const email = normalizeRadarEmail(body.email);
    if (
      !email ||
      (body.locale !== 'en' && body.locale !== 'zh') ||
      !Array.isArray(body.platforms) ||
      body.platforms.length < 1 ||
      body.platforms.length > 3 ||
      !body.platforms.every(
        (id: unknown): id is RadarPlatformId =>
          typeof id === 'string' && Object.hasOwn(RADAR_PLATFORM_NAMES, id),
      )
    ) {
      throw new ApiError('INVALID_SUBSCRIPTION', '请检查邮箱地址和所选平台。');
    }
    const knownId = await rememberedContact(c);
    const existing = knownId
      ? await store.rememberedSubscription(
          knownId,
          email,
          body.platforms,
          body.locale,
        )
      : null;
    if (existing?.matches) {
      await remember(c, existing.id);
      return c.json({ ok: true, alreadySubscribed: true });
    }
    await reserveRate(env.DB, env.PEPPER, email, 'radar_email_address', 3);
    const confirmation = await store.requestConfirmation(
      email,
      body.platforms,
      body.locale,
    );
    if (confirmation) {
      const { locale, token, code, idempotencyKey, platforms } = confirmation;
      const url = link(locale, '/email#confirm=' + token);
      const products = platforms
        .map((id) => RADAR_PLATFORM_NAMES[id])
        .join(', ');
      const subject =
        locale === 'en'
          ? 'Confirm your Reset Radar email alerts'
          : '确认订阅重置雷达邮件提醒';
      const existingNote = confirmation.alreadySubscribed
        ? locale === 'en'
          ? 'This email address is already subscribed.\n\n'
          : '这个邮箱已经订阅过了。\n\n'
        : '';
      const text =
        locale === 'en'
          ? `Your verification code is ${code}. Enter it on Reset Radar within 10 minutes to receive alerts when the reset probability for ${products} rises above 80%.\n\nYou can also confirm using this link. It expires 24 hours after it was first sent.\n${url}\n\nIf you didn’t request these alerts, ignore this email.`
          : `你的验证码是 ${code}。请在 10 分钟内回到重置雷达输入验证码。确认后，${products} 的重置概率超过 80% 时，你会收到提醒。\n\n你也可以通过下面的链接确认，链接从首次发出起 24 小时内有效。\n${url}\n\n如果你没有申请订阅，忽略这封邮件即可。`;
      const outcome = await send(
        locale,
        email,
        subject,
        existingNote + text,
        idempotencyKey,
      );
      if (outcome !== 'sent') {
        if (outcome === 'permanent')
          await store.discardConfirmation(token, confirmation.requestedAt);
        throw new ApiError(
          'EMAIL_UNAVAILABLE',
          '确认邮件发送未完成，请稍后再试。',
          503,
        );
      }
    }
    return c.json(
      existing ? { ok: true, alreadySubscribed: true } : { ok: true },
      202,
    );
  });

  routes.post('/confirm-code', async (c) => {
    await reserveRate(
      env.DB,
      env.PEPPER,
      c.req.header('CF-Connecting-IP') || null,
      'radar_email_code_ip',
      30,
      true,
    );
    const body = await readJson(c.req.raw);
    const email = normalizeRadarEmail(body.email);
    if (email)
      await reserveRate(
        env.DB,
        env.PEPPER,
        email,
        'radar_email_code_address',
        15,
        true,
      );
    const activation = email && (await store.confirmCode(email, body.code));
    if (!activation)
      throw new ApiError('INVALID_EMAIL_CODE', '验证码无效或已过期。', 410);
    return confirmed(c, activation);
  });

  routes.post('/confirm', async (c) => {
    const { token } = await readJson(c.req.raw);
    const activation =
      typeof token === 'string' && (await store.confirm(token));
    if (!activation)
      throw new ApiError('INVALID_EMAIL_LINK', '这个链接已使用或已失效。', 410);
    return confirmed(c, activation);
  });
  routes.post('/unsubscribe', async (c) => {
    const { token } = await readJson(c.req.raw);
    const contactId =
      typeof token === 'string' && (await store.unsubscribe(token));
    if (!contactId)
      throw new ApiError('INVALID_EMAIL_LINK', '这个链接已使用或已失效。', 410);
    if ((await rememberedContact(c)) === contactId) {
      deleteCookie(c, subscriptionCookie, cookieOptions);
    }
    return c.json({ ok: true });
  });
  return {
    ready,
    routes,
    dispatch(overview: RadarOverview | null) {
      return store.dispatch(overview, (alert) => {
        const {
          email,
          platform,
          probability,
          locale,
          idempotencyKey,
          unsubscribeToken,
        } = alert;
        const name = RADAR_PLATFORM_NAMES[platform];
        const radar = link(locale, '');
        const unsubscribe = link(
          locale,
          '/email#unsubscribe=' + unsubscribeToken,
        );
        const subject =
          locale === 'en'
            ? `${name} reset probability reached ${probability}%`
            : `${name} 额度重置概率已达 ${probability}%`;
        const text =
          locale === 'en'
            ? `Reset Radar estimates a ${probability}% chance of a ${name} quota reset in the next 24 hours.\n\nView the forecast: ${radar}\n\nUnsubscribe: ${unsubscribe}`
            : `重置雷达预计，${name} 在未来 24 小时内重置额度的概率为 ${probability}%。\n\n查看趋势 ${radar}\n\n退订提醒 ${unsubscribe}`;
        return send(locale, email, subject, text, idempotencyKey);
      });
    },
  };
}

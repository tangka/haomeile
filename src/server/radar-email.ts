import { setTimeout as delay } from 'node:timers/promises';
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
  createRadarEmailCapacity,
  type RadarProvider,
} from './radar-email-capacity';
import {
  radarEmailProviders,
  deliverRadarEmail,
  type RadarMessage,
} from './radar-email-providers';
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
  values: Record<string, string | undefined>,
) {
  const store = createRadarEmailStore(env.DB, env.PEPPER);
  const providers = radarEmailProviders(values);
  const capacity = createRadarEmailCapacity(env.DB, [...providers.keys()]);
  const ready = providers.size > 0;
  const lastAlertAt = new Map<RadarProvider, number>();
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
    kind: 'confirmation' | 'alert',
    message: RadarMessage,
  ): Promise<RadarEmailOutcome | 'unknown'> {
    const { to, idempotencyKey } = message;
    const reservation = await capacity.reserve(to, idempotencyKey, kind);
    if (reservation.status === 'sent') return 'sent';
    if (reservation.status === 'busy') return 'unknown';
    if (reservation.status !== 'reserved') return 'retry';
    const provider = reservation.provider;
    if (kind === 'alert') {
      // Pace bulk sends while leaving the interactive verification path available.
      const wait = (lastAlertAt.get(provider) ?? 0) + 250 - Date.now();
      if (wait > 0) await delay(wait);
      lastAlertAt.set(provider, Date.now());
    }
    const startedAt = Date.now();
    const result = await deliverRadarEmail(
      provider,
      providers.get(provider)!,
      message,
    );
    if (result.status === 'rejected' && result.blockedUntil) {
      await capacity.block(provider, result.blockedUntil);
    }
    await capacity.settle(
      idempotencyKey,
      result.status === 'rejected' && result.charged
        ? 'unknown'
        : result.status,
    );
    if (result.usage)
      await capacity.observeResendUsage(
        result.usage.day,
        result.usage.month,
        Date.now(),
        undefined,
        startedAt,
      );
    if (result.status === 'rejected')
      return result.retry ? 'retry' : 'permanent';
    return result.status;
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
    const intent = body.intent === undefined ? 'subscribe' : body.intent;
    if (
      !email ||
      (intent !== 'subscribe' && intent !== 'manage') ||
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
    const existing = await store.subscriptionForEmail(
      email,
      body.platforms,
      body.locale,
    );
    const remembered = existing !== null && existing.id === knownId;
    async function duplicate(contactId: string) {
      if (contactId === knownId) {
        await remember(c, contactId);
        return c.json({ ok: true, alreadySubscribed: true, remembered: true });
      }
      return c.json({ ok: true, alreadySubscribed: true });
    }
    if (
      existing &&
      (intent === 'subscribe' || (remembered && existing.matches))
    ) {
      return duplicate(existing.id);
    }
    await reserveRate(env.DB, env.PEPPER, email, 'radar_email_address', 3);
    const confirmation = await store.requestConfirmation(
      email,
      body.platforms,
      body.locale,
      intent,
    );
    // A concurrent confirmation may have activated the address between lookup and insert.
    if (!confirmation && intent === 'subscribe') {
      const active = await store.subscriptionForEmail(
        email,
        body.platforms,
        body.locale,
      );
      if (active) return duplicate(active.id);
    }
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
      const outcome = await send('confirmation', {
        to: email,
        subject,
        text: existingNote + text,
        idempotencyKey,
      });
      if (outcome !== 'sent') {
        if (outcome !== 'unknown')
          await store.discardConfirmation(token, confirmation.requestedAt);
        throw new ApiError(
          'EMAIL_UNAVAILABLE',
          '确认邮件发送未完成，请稍后再试。',
          503,
        );
      }
    }
    return c.json(
      remembered ? { ok: true, alreadySubscribed: true } : { ok: true },
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
    capacity,
    dispatch(overview: RadarOverview | null) {
      return store.dispatch(overview, async (alert) => {
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
        const outcome = await send('alert', {
          to: email,
          subject,
          text,
          idempotencyKey,
        });
        return outcome === 'unknown' ? 'permanent' : outcome;
      });
    },
  };
}

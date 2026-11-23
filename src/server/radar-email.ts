import { Hono } from 'hono';
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
} from './radar-email-store';

export function createRadarEmail(
  env: Bindings,
  apiKey?: string,
  sender?: string,
) {
  const store = createRadarEmailStore(env.DB, env.PEPPER);
  const from = normalizeRadarEmail(sender);
  const ready = Boolean(from && apiKey?.startsWith('re_'));
  const routes = new Hono<AppEnv>();
  const link = (locale: string, path: string) =>
    env.SITE_ORIGIN + (locale === 'en' ? '/en' : '') + '/radar' + path;

  async function send(
    to: string,
    subject: string,
    text: string,
    idempotencyKey: string,
  ): Promise<RadarEmailOutcome> {
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
    await reserveRate(env.DB, env.PEPPER, email, 'radar_email_address', 3);
    const confirmation = await store.requestConfirmation(
      email,
      body.platforms,
      body.locale,
    );
    if (confirmation) {
      const { locale, token, idempotencyKey, platforms } = confirmation;
      const url = link(locale, '/email#confirm=' + token);
      const products = platforms
        .map((id) => RADAR_PLATFORM_NAMES[id])
        .join(', ');
      const subject =
        locale === 'en'
          ? 'Confirm your Reset Radar email alerts'
          : '确认订阅重置雷达邮件提醒';
      const text =
        locale === 'en'
          ? `You requested email alerts for ${products}. Confirm your selection within 24 hours to receive an alert when a platform’s reset probability rises above 80%.\n\n${url}\n\nIf you didn’t request this, you can ignore this email.`
          : `你申请订阅了 ${products} 的邮件提醒。请在 24 小时内打开链接确认，之后所选平台重置概率超过 80% 时，你会收到邮件。\n\n${url}\n\n如果你没有申请订阅，忽略这封邮件即可。`;
      const outcome = await send(email, subject, text, idempotencyKey);
      if (outcome !== 'sent') {
        if (outcome === 'permanent') await store.discardConfirmation(token);
        throw new ApiError(
          'EMAIL_UNAVAILABLE',
          '确认邮件发送未完成，请稍后再试。',
          503,
        );
      }
    }
    return c.json({ ok: true }, 202);
  });

  for (const action of ['confirm', 'unsubscribe'] as const) {
    routes.post('/' + action, async (c) => {
      const { token } = await readJson(c.req.raw);
      const completed =
        typeof token === 'string' && (await store[action](token));
      if (!completed)
        throw new ApiError(
          'INVALID_EMAIL_LINK',
          '这个链接已使用或已失效。',
          410,
        );
      return c.json({ ok: true });
    });
  }
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
        return send(email, subject, text, idempotencyKey);
      });
    },
  };
}

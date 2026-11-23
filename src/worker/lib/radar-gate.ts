import type { Context } from 'hono';
import { getSignedCookie, setSignedCookie } from 'hono/cookie';
import type { AppEnv } from '../types';
import { hashSecret, requirePepper } from './crypto';
import { ApiError } from './errors';
import { readJson } from './json';
import { reserveRate } from './ratelimit';
import { beijingDay } from './time';
import { verifyTurnstile } from './turnstile';

const PASS_COOKIE = 'haomeile_radar';
const PASS_TTL_SECONDS = 15 * 60;

function visitorIp(c: Context<AppEnv>): string | null {
  return c.req.header('CF-Connecting-IP') || null;
}

function signingKey(c: Context<AppEnv>): string {
  requirePepper(c.env.PEPPER);
  // Bind the signed expiry to this use and network without storing its IP in the pass.
  return `${c.env.PEPPER}\0radar-pass-v1\0${visitorIp(c) ?? ''}`;
}

function epochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

async function radarRate(
  c: Context<AppEnv>,
  action: 'radar_verify' | 'radar_read',
  maximum: number,
  message: string,
): Promise<void> {
  try {
    await reserveRate(
      c.env.DB,
      c.env.PEPPER,
      visitorIp(c),
      action,
      maximum,
      true,
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === 'RATE_LIMITED')
      throw new ApiError('RATE_LIMITED', message, 429);
    throw error;
  }
}

export async function verifyRadarAccess(c: Context<AppEnv>): Promise<Response> {
  if (c.env.RADAR_HUMAN_CHECK === 'false')
    throw new ApiError('NOT_FOUND', '没有这个接口。', 404);
  const body = await readJson(c.req.raw);
  const token =
    typeof body.turnstile_token === 'string' ? body.turnstile_token : '';
  await radarRate(c, 'radar_verify', 20, '验证请求过多，请稍后再试。');
  await verifyTurnstile(token, c.env, 'radar_gate');
  const redemption = `radar-redeem:${await hashSecret(token, c.env.PEPPER)}`;
  // The token may still be accepted by a second Siteverify edge before reuse converges.
  // The existing rate table's daily cleanup outlives any valid Turnstile token.
  const claimed = await c.env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, count)
       SELECT ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM rate_limits WHERE key = ?)
       ON CONFLICT DO NOTHING RETURNING key`,
  )
    .bind(redemption, beijingDay(), redemption)
    .first<string>('key');
  if (!claimed) throw new ApiError('TURNSTILE_FAILED', '验证未完成，请重试。');
  await setSignedCookie(
    c,
    PASS_COOKIE,
    String(epochSeconds() + PASS_TTL_SECONDS),
    signingKey(c),
    {
      prefix: 'host',
      httpOnly: true,
      maxAge: PASS_TTL_SECONDS,
      sameSite: 'Lax',
    },
  );
  return c.json({ ok: true, data: { verified: true } });
}

export async function hasRadarPass(c: Context<AppEnv>): Promise<boolean> {
  if (!c.req.header('Cookie')?.includes(`__Host-${PASS_COOKIE}=`)) return false;
  const expiry = await getSignedCookie(c, signingKey(c), PASS_COOKIE, 'host');
  if (
    typeof expiry !== 'string' ||
    !/^\d{10}$/.test(expiry) ||
    Number(expiry) <= epochSeconds()
  )
    return false;
  await radarRate(c, 'radar_read', 120, '请求过于频繁，请稍后再试。');
  return true;
}

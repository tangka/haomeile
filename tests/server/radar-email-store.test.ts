import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import {
  RADAR_PLATFORM_NAMES,
  type RadarOverview,
  type RadarPlatformId,
} from '../../src/shared/radar';
import { openDatabase, type LocalDatabase } from '../../src/server/database';
import {
  createRadarEmailStore,
  normalizeRadarEmail,
  type RadarEmailAlert,
  type RadarEmailStore,
} from '../../src/server/radar-email-store';

const email = 'subscriber@example.com';
const secret = 'isolated-test-only-radar-email-secret';
const minute = 60_000;
let clock: number;
let database: LocalDatabase;
let store: RadarEmailStore;

beforeEach(async () => {
  clock = Date.parse('2026-11-23T10:00:00Z');
  database = openDatabase(':memory:');
  await database.migrate(resolve(import.meta.dir, '../../migrations'));
  store = createRadarEmailStore(database.binding, secret, () => clock);
});

afterEach(() => database.close());

function snapshot(
  id: RadarPlatformId,
  probability: number,
  time = clock,
): RadarOverview {
  const name = RADAR_PLATFORM_NAMES[id];
  return {
    generatedAt: new Date(clock).toISOString(),
    platforms: [{ name, probability }],
    history: [{ id, name, points: [{ time, probability }] }],
    stale: false,
  };
}

describe('Reset Radar email ownership', () => {
  test('a code confirms only its pending mailbox and settings, once, including concurrent submissions', async () => {
    const pending = (await store.requestConfirmation(
      email,
      ['antigravity'],
      'en',
    ))!;
    expect(pending.code).toMatch(/^\d{6}$/);
    expect(await store.confirmCode('other@example.com', pending.code)).toBe(
      false,
    );
    expect(await store.confirmCode(email, pending.code + '0')).toBe(false);
    const accepted = await Promise.all(
      Array.from({ length: 4 }, () => store.confirmCode(email, pending.code)),
    );
    expect(accepted.filter(Boolean)).toHaveLength(1);
    expect(await store.confirm(pending.token)).toBe(false);
    expect(
      await database.binding
        .prepare('SELECT email, platforms, locale FROM radar_email_contacts')
        .first(),
    ).toEqual({ email, platforms: 4, locale: 'en' });
  });

  test('five wrong attempts lock the code and leave the inbox confirmation link usable', async () => {
    const pending = (await store.requestConfirmation(email, ['codex'], 'zh'))!;
    const wrong = pending.code === '000000' ? '000001' : '000000';
    await Promise.all(
      Array.from({ length: 10 }, () => store.confirmCode(email, wrong)),
    );
    expect(
      await database.binding
        .prepare('SELECT code_failures FROM radar_email_confirmations')
        .first('code_failures'),
    ).toBe(5);
    expect(await store.confirmCode(email, pending.code)).toBe(false);
    expect(await store.confirm(pending.token)).toBe(true);
    expect(await store.confirmCode(email, pending.code)).toBe(false);
  });

  test('a resend issues a new ten-minute code; stale delivery reports cannot discard the new request', async () => {
    const first = (await store.requestConfirmation(email, ['claude'], 'zh'))!;
    clock += 10 * minute;
    expect(await store.confirmCode(email, first.code)).toBe(false);
    const second = (await store.requestConfirmation(email, ['claude'], 'zh'))!;
    await store.discardConfirmation(first.token, first.requestedAt);
    const wrong = second.code === '000000' ? '000001' : '000000';
    for (let i = 0; i < 4; i++)
      expect(await store.confirmCode(email, wrong)).toBe(false);
    expect(await store.confirmCode(email, second.code)).toBe(true);
  });

  test('a code issued near the original link deadline gets its full ten minutes', async () => {
    const first = (await store.requestConfirmation(email, ['codex'], 'en'))!;
    clock += (24 * 60 - 5) * minute;
    const recent = (await store.requestConfirmation(email, ['codex'], 'en'))!;
    clock += 6 * minute;
    expect(await store.confirm(first.token)).toBe(false);
    await store.dispatch(null, async () => 'sent');
    expect(await store.confirmCode(email, recent.code)).toBe(true);
  });

  test('normalizes email, limits resends, and requires a one-time confirmation before preference changes', async () => {
    expect(normalizeRadarEmail(' Subscriber@Example.COM ')).toBe(email);
    for (const invalid of [
      'a..b@example.com',
      'text\n@example.com',
      'bad@-example.com',
      'bad@example',
    ]) {
      expect(normalizeRadarEmail(invalid)).toBeNull();
    }

    const request = await store.requestConfirmation(
      ' Subscriber@Example.COM ',
      ['codex'],
      'en',
    );
    expect(request).toMatchObject({
      email,
      platforms: ['codex'],
      locale: 'en',
    });
    expect(await store.requestConfirmation(email, ['codex'], 'en')).toBeNull();
    const pending = await database.binding
      .prepare('SELECT token_hash FROM radar_email_confirmations')
      .first('token_hash');
    expect(pending).toMatch(/^[a-f0-9]{64}$/);
    expect(pending).not.toBe(request!.token);
    expect(
      await database.binding
        .prepare('SELECT count(*) AS count FROM radar_email_contacts')
        .first('count'),
    ).toBe(0);

    clock += 10 * minute;
    const resend = await store.requestConfirmation(email, ['codex'], 'en');
    expect(resend?.token).toBe(request!.token);
    expect(resend?.idempotencyKey).not.toBe(request?.idempotencyKey);
    expect(await store.confirm(request!.token)).toBe(true);
    expect(await store.confirm(request!.token)).toBe(false);
    expect(await store.requestConfirmation(email, ['codex'], 'en')).toBeNull();

    const change = await store.requestConfirmation(
      email,
      ['antigravity', 'claude'],
      'zh',
    );
    expect(change?.platforms).toEqual(['claude', 'antigravity']);
    const prefs = () =>
      database.binding
        .prepare('SELECT platforms, locale FROM radar_email_contacts')
        .first();
    expect(await prefs()).toEqual({ platforms: 1, locale: 'en' });
    expect(await store.confirm(change!.token)).toBe(true);
    expect(await prefs()).toEqual({ platforms: 6, locale: 'zh' });
  });

  test('expired confirmations cannot activate an address', async () => {
    const request = await store.requestConfirmation(email, ['codex'], 'zh');
    clock += 24 * 60 * minute;
    expect(await store.confirm(request!.token)).toBe(false);
    expect(
      await database.binding
        .prepare('SELECT count(*) AS count FROM radar_email_contacts')
        .first('count'),
    ).toBe(0);
    const retry = await store.requestConfirmation(email, ['codex'], 'zh');
    expect(retry?.token).not.toBe(request!.token);
    expect(await store.confirm(retry!.token)).toBe(true);
  });
});

describe('Reset Radar alert delivery', () => {
  async function subscribe(platforms: RadarPlatformId[] = ['codex']) {
    const request = await store.requestConfirmation(email, platforms, 'en');
    expect(await store.confirm(request!.token)).toBe(true);
  }

  test('uses strictly above 80 and deduplicates high episodes without allowing a replay or unhiding a missing platform', async () => {
    const alerts: RadarEmailAlert[] = [];
    const send = async (alert: RadarEmailAlert) => {
      alerts.push(alert);
      return 'sent' as const;
    };
    await subscribe();
    await store.dispatch(snapshot('codex', 80), send);
    await store.dispatch(snapshot('claude', 100), send);
    expect(alerts).toHaveLength(0);
    clock += minute;
    const firstHigh = snapshot('codex', 90);
    await store.dispatch({ ...firstHigh, stale: true }, send);
    expect(alerts).toHaveLength(0);
    await store.dispatch(firstHigh, send);
    await store.dispatch(firstHigh, send);
    clock += minute;
    await store.dispatch(snapshot('codex', 95), send);
    await store.dispatch(snapshot('codex', 40, clock - minute), send);
    clock += minute;
    await store.dispatch(snapshot('codex', 98), send);
    expect(alerts).toHaveLength(1);

    clock += minute;
    await store.dispatch(snapshot('codex', 80), send);
    await store.dispatch(firstHigh, send);
    clock += minute;
    await store.dispatch(snapshot('codex', 81), send);
    expect(alerts.map(({ probability }) => probability)).toEqual([90, 81]);
    expect(alerts[0].idempotencyKey).not.toBe(alerts[1].idempotencyKey);
  });

  test('persists a temporary failure, keeps identical retry payload, and honors the unsubscribe capability', async () => {
    await subscribe();
    const attempts: RadarEmailAlert[] = [];
    const send = async (message: RadarEmailAlert) => {
      attempts.push(message);
      return attempts.length === 1 ? 'retry' : 'sent';
    };
    clock += minute;
    const high = snapshot('codex', 88);
    await store.dispatch(high, send);
    const restarted = createRadarEmailStore(
      database.binding,
      secret,
      () => clock,
    );
    await restarted.dispatch(high, send);
    expect(attempts).toHaveLength(1);
    clock += minute;
    await restarted.dispatch(snapshot('codex', 96), send);
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toEqual(attempts[1]);
    expect(attempts[0]).toMatchObject({
      email,
      locale: 'en',
      platform: 'codex',
      probability: 88,
    });

    const pending = await restarted.requestConfirmation(
      email,
      ['claude'],
      'en',
    );
    expect(await restarted.unsubscribe(attempts[0].unsubscribeToken)).toBe(
      true,
    );
    expect(await restarted.unsubscribe(attempts[0].unsubscribeToken)).toBe(
      false,
    );
    expect(await restarted.confirm(pending!.token)).toBe(false);
    clock += minute;
    await restarted.dispatch(snapshot('codex', 30), send);
    clock += minute;
    await restarted.dispatch(snapshot('codex', 100), send);
    expect(attempts).toHaveLength(2);
  });
});

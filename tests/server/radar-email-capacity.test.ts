import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { openDatabase, type LocalDatabase } from '../../src/server/database';
import { createRadarEmailStore } from '../../src/server/radar-email-store';
import {
  createRadarEmailCapacity,
  type RadarProvider,
} from '../../src/server/radar-email-capacity';

let db: LocalDatabase;
let now: number;
const clock = () => now;
const day = 86_400_000;
const enabled: RadarProvider[] = ['resend', 'brevo', 'smtp2go', 'mailjet'];
const email = 'recipient@example.com';
const store = () =>
  createRadarEmailStore(db.binding, 'test-only-secret', clock);
const allocator = (providers = enabled) =>
  createRadarEmailCapacity(db.binding, providers, clock);

beforeEach(async () => {
  db = openDatabase(':memory:');
  now = Date.parse('2026-11-23T10:00Z');
  await db.migrate('migrations');
});

afterEach(() => db.close());

async function verification(address = email) {
  const result = await store().requestConfirmation(address, ['codex'], 'zh');
  if (!result) throw new Error('missing confirmation');
  return result;
}

async function installContact(address: string, provider: RadarProvider) {
  const pending = await verification(address);
  const capacity = allocator([provider]);
  expect(
    await capacity.reserve(address, pending.idempotencyKey, 'confirmation'),
  ).toEqual({ status: 'reserved', provider });
  await capacity.settle(pending.idempotencyKey, 'sent');
  expect(await store().confirm(pending.token)).toBeTruthy();
}

describe('radar sender affinity and quota reservations', () => {
  test('new contacts use the same provider for verification, alerts and preference changes', async () => {
    await installContact(email, 'mailjet');
    const capacity = allocator();
    expect(await capacity.reserve(email, 'alert-1', 'alert')).toEqual({
      status: 'reserved',
      provider: 'mailjet',
    });
    await capacity.settle('alert-1', 'sent');
    const edit = (await store().requestConfirmation(
      email,
      ['claude'],
      'en',
      'manage',
    ))!;
    expect(
      await capacity.reserve(email, edit.idempotencyKey, 'confirmation'),
    ).toEqual({ status: 'reserved', provider: 'mailjet' });
    await capacity.settle(edit.idempotencyKey, 'sent');
    expect(await store().confirmCode(email, edit.code)).toBeTruthy();
    await capacity.block('mailjet', now + day);
    expect(await capacity.reserve(email, 'alert-2', 'alert')).toEqual({
      status: 'unavailable',
    });
    const serviceWithoutMailjet = allocator(['resend', 'brevo', 'smtp2go']);
    expect(
      await serviceWithoutMailjet.reserve(email, 'alert-2', 'alert'),
    ).toEqual({ status: 'unavailable' });
    expect(
      (await capacity.snapshot()).find((row) => row.provider === 'mailjet'),
    ).toMatchObject({
      remaining: 0,
      contacts: 1,
      pending: 0,
      dayUsed: 3,
      blockedUntil: now + day,
    });
    now += day + 1;
    expect(await allocator().reserve(email, 'alert-2', 'alert')).toEqual({
      status: 'reserved',
      provider: 'mailjet',
    });
  });

  test('simultaneous claims and restarts never send the same uncertain or accepted message twice', async () => {
    await installContact(email, 'resend');
    const attempts = await Promise.all(
      Array.from({ length: 12 }, () =>
        allocator().reserve(email, 'repeat', 'alert'),
      ),
    );
    expect(attempts.filter((item) => item.status === 'reserved')).toHaveLength(
      1,
    );
    expect(attempts.filter((item) => item.status === 'busy')).toHaveLength(11);
    await allocator().settle('repeat', 'rejected');
    expect(await allocator().reserve(email, 'repeat', 'alert')).toEqual({
      status: 'reserved',
      provider: 'resend',
    });
    await allocator().settle('repeat', 'unknown');
    expect(await allocator().reserve(email, 'repeat', 'alert')).toEqual({
      status: 'busy',
    });
    expect(await allocator().reserve(email, 'sent', 'alert')).toMatchObject({
      status: 'reserved',
    });
    await allocator().settle('sent', 'sent');
    expect(await allocator().reserve(email, 'sent', 'alert')).toEqual({
      status: 'sent',
    });
    expect(
      (await allocator().snapshot()).find((p) => p.provider === 'resend')
        ?.dayUsed,
    ).toBe(3);
  });

  test('reserves the last slot atomically, counts external sends, and reopens at midnight UTC', async () => {
    await installContact(email, 'resend');
    const capacity = allocator();
    await capacity.observeResendUsage(99, 157, now, now + 8 * day);
    const attempts = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        allocator().reserve(email, 'last-' + index, 'alert'),
      ),
    );
    expect(
      attempts.filter((attempt) => attempt.status === 'reserved'),
    ).toHaveLength(1);
    const key =
      'last-' + attempts.findIndex((attempt) => attempt.status === 'reserved');
    await capacity.settle(key, 'sent');
    await capacity.observeResendUsage(99, 157, now, now + 8 * day);
    expect(
      (await capacity.snapshot()).find((row) => row.provider === 'resend'),
    ).toMatchObject({ remaining: 0, dayUsed: 100, monthUsed: 158 });
    now = Date.parse('2026-11-24T00:00:00Z');
    expect(
      (await capacity.snapshot()).find((row) => row.provider === 'resend'),
    ).toMatchObject({ remaining: 100, dayUsed: 0, monthUsed: 158 });
    await capacity.observeResendUsage(0, 3000, now, now + day);
    expect(await capacity.reserve(email, 'capped-by-month', 'alert')).toEqual({
      status: 'unavailable',
    });
    now += day;
    expect(
      (await capacity.snapshot()).find((row) => row.provider === 'resend')
        ?.monthUsed,
    ).toBe(0);
    expect(
      await capacity.reserve(email, 'after-account-reset', 'alert'),
    ).toEqual({ status: 'reserved', provider: 'resend' });
  });

  test('a fresh month header resets the local floor and late replies cannot restore the previous cycle', async () => {
    const capacity = allocator(['resend']);
    const monthUsed = async () =>
      (await capacity.snapshot()).find((row) => row.provider === 'resend')!
        .monthUsed;
    await installContact(email, 'resend');
    for (let index = 0; index < 4; index++) {
      await capacity.reserve(email, 'before-cycle-' + index, 'alert');
      await capacity.settle('before-cycle-' + index, 'sent');
    }
    await capacity.observeResendUsage(null, 2900);
    const oldRead = now;
    now += 100;
    // A delayed parallel call has a smaller count and an older request start.
    await capacity.observeResendUsage(null, 2850, now, undefined, oldRead - 1);
    expect(await monthUsed()).toBe(2900);
    now += 1_000;
    const crossing = now - 200;
    await capacity.observeResendUsage(null, 1, now, undefined, now - 100);
    expect(await monthUsed()).toBe(1);
    now += 100;
    await capacity.observeResendUsage(null, 2901, now, undefined, crossing);
    expect(await monthUsed()).toBe(1);
    await capacity.reserve(email, 'new-cycle', 'alert');
    await capacity.settle('new-cycle', 'sent');
    expect(await monthUsed()).toBe(2);
    now += 100;
    const officialReset = now + 20 * day;
    await capacity.observeResendUsage(null, 2, now, officialReset);
    now += 500;
    await capacity.observeResendUsage(null, 1, now);
    expect(await monthUsed()).toBe(2);
    now = officialReset;
    expect(await monthUsed()).toBe(0);
  });

  test('assignments scale with sustainable quota and omit disabled providers', async () => {
    const capacity = allocator(['resend', 'brevo', 'smtp2go']);
    await Promise.all(
      Array.from({ length: 50 }, async (_, index) => {
        const address = 'test-' + index + '@example.com';
        const pending = await verification(address);
        const claim = await capacity.reserve(
          address,
          pending.idempotencyKey,
          'confirmation',
        );
        expect(claim.status).toBe('reserved');
      }),
    );
    const snapshot = await capacity.snapshot();
    const counts = Object.fromEntries(
      snapshot.map((row) => [row.provider, row.pending]),
    );
    expect(counts.mailjet).toBe(0);
    expect(counts.brevo).toBeGreaterThan(counts.resend);
    expect(counts.resend).toBeGreaterThan(counts.smtp2go);
    expect(counts.smtp2go).toBeGreaterThan(0);
    expect(snapshot.reduce((total, row) => total + row.pending, 0)).toBe(50);
    expect(snapshot.reduce((total, row) => total + row.remaining, 0)).toBe(550);
  });

  test('restored provider selection ignores superseded confirmations and expired subscriptions', async () => {
    const old = await verification();
    now += 600_001;
    const next = await verification();
    expect(
      await allocator().reserve(email, old.idempotencyKey, 'confirmation'),
    ).toEqual({ status: 'unavailable' });
    expect(
      await allocator().reserve(email, next.idempotencyKey, 'confirmation'),
    ).toMatchObject({ status: 'reserved' });
    expect(
      await allocator().reserve('absent@example.com', 'orphan', 'alert'),
    ).toEqual({ status: 'unavailable' });
  });
});

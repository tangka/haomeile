import { createHash, createHmac, randomUUID } from 'node:crypto';
import type { D1Database } from '@cloudflare/workers-types/index.ts';
import {
  RADAR_PLATFORM_NAMES,
  type RadarOverview,
  type RadarPlatformId,
} from '../shared/radar';

const PLATFORMS = ['codex', 'claude', 'antigravity'] as const;
const THRESHOLD = 80;
const MAX_AGE_MS = 45 * 60_000;
const RECONFIRM_MS = 10 * 60_000;
const EXPIRY_MS = 24 * 60 * 60_000;
const CLAIM_MS = 2 * 60_000;
const RETRY_MS = [60_000, 3 * 60_000, 10 * 60_000, 20 * 60_000];

type Locale = 'zh' | 'en';

interface ConfirmationRow {
  email: string;
  platforms: number;
  locale: Locale;
  nonce: string;
  requested_at: number;
}

interface AlertRow {
  id: string;
  contact_id: string;
  platform: RadarPlatformId;
  episode_at: number;
  probability: number;
  locale: Locale;
  attempts: number;
}

export interface RadarEmailAlert {
  email: string;
  platform: RadarPlatformId;
  probability: number;
  timestamp: string;
  locale: Locale;
  unsubscribeToken: string;
  idempotencyKey: string;
}

export type RadarEmailOutcome = 'sent' | 'retry' | 'permanent';

export function normalizeRadarEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const email = input.trim().toLowerCase();
  if (email.length > 254) return null;
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (
    !/^[a-z0-9!#$%&'+/=?^_`{|}~*.-]{1,64}$/.test(local) ||
    /^\.|\.$|\.\./.test(local)
  )
    return null;
  if (
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/.test(
      domain,
    )
  )
    return null;
  return email;
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function tokenHash(value: unknown) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
    ? hash(value)
    : null;
}

const hasPlatform = (mask: number, index: number) =>
  (mask & (1 << index)) !== 0;

function recentSamples(overview: RadarOverview | null, now: number) {
  if (!overview || overview.stale) return [];
  const generatedAt = Date.parse(overview.generatedAt);
  if (
    !Number.isFinite(generatedAt) ||
    generatedAt < now - MAX_AGE_MS ||
    generatedAt > now + 60_000
  )
    return [];
  return PLATFORMS.flatMap((id, index) => {
    const current = overview.platforms.find(
      ({ name }) => name === RADAR_PLATFORM_NAMES[id],
    );
    const sample = overview.history
      .find((history) => history.id === id)
      ?.points.at(-1);
    if (
      !sample ||
      !current ||
      !Number.isSafeInteger(sample.time) ||
      sample.time < now - MAX_AGE_MS ||
      sample.time > now ||
      sample.time > generatedAt ||
      !Number.isInteger(current.probability) ||
      current.probability < 0 ||
      current.probability > 100 ||
      Math.round(sample.probability) !== current.probability
    )
      return [];
    return [
      {
        id,
        mask: 1 << index,
        sampleAt: sample.time,
        probability: current.probability,
      },
    ];
  });
}

export function createRadarEmailStore(
  db: D1Database,
  secret: string,
  now = Date.now,
) {
  if (!secret) throw new Error('Radar email token secret is missing');
  const token = (purpose: 'confirmation' | 'unsubscribe', id: string) =>
    createHmac('sha256', secret)
      .update(`haomeile/radar-email/${purpose}\0${id}`)
      .digest('base64url');

  async function requestConfirmation(
    input: string,
    platforms: readonly RadarPlatformId[],
    locale: Locale,
  ) {
    const email = normalizeRadarEmail(input);
    if (
      !email ||
      (locale !== 'zh' && locale !== 'en') ||
      platforms.some((id) => !PLATFORMS.includes(id))
    )
      return null;
    const preferences = PLATFORMS.reduce(
      (mask, id, index) =>
        platforms.includes(id) ? mask | (1 << index) : mask,
      0,
    );
    if (!preferences) return null;
    const timestamp = now();
    const nonce = randomUUID();
    const row = await db
      .prepare(
        `
      INSERT INTO radar_email_confirmations(email, platforms, locale, nonce, token_hash, requested_at, expires_at)
      SELECT ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM radar_email_contacts WHERE email = ? AND platforms = ? AND locale = ?)
      ON CONFLICT(email) DO UPDATE SET
        platforms = excluded.platforms,
        locale = excluded.locale,
        nonce = CASE WHEN platforms = excluded.platforms AND locale = excluded.locale
          AND expires_at > excluded.requested_at THEN nonce ELSE excluded.nonce END,
        token_hash = CASE WHEN platforms = excluded.platforms AND locale = excluded.locale
          AND expires_at > excluded.requested_at THEN token_hash ELSE excluded.token_hash END,
        requested_at = excluded.requested_at,
        expires_at = CASE WHEN platforms = excluded.platforms AND locale = excluded.locale
          AND expires_at > excluded.requested_at THEN expires_at ELSE excluded.expires_at END
      WHERE requested_at <= ?
      RETURNING email, platforms, locale, nonce, requested_at
    `,
      )
      .bind(
        email,
        preferences,
        locale,
        nonce,
        hash(token('confirmation', nonce)),
        timestamp,
        timestamp + EXPIRY_MS,
        email,
        preferences,
        locale,
        timestamp - RECONFIRM_MS,
      )
      .first<ConfirmationRow>();
    return (
      row && {
        email: row.email,
        platforms: PLATFORMS.filter((_, index) =>
          hasPlatform(row.platforms, index),
        ),
        locale: row.locale,
        token: token('confirmation', row.nonce),
        idempotencyKey: `radar-confirm-${row.nonce}-${row.requested_at}`,
      }
    );
  }

  async function discardConfirmation(value: string) {
    const digest = tokenHash(value);
    if (digest)
      await db
        .prepare('DELETE FROM radar_email_confirmations WHERE token_hash = ?')
        .bind(digest)
        .run();
  }

  async function confirm(value: string) {
    const digest = tokenHash(value);
    if (!digest) return false;
    const id = randomUUID();
    const timestamp = now();
    const [result] = await db.batch([
      db
        .prepare(
          `
        INSERT INTO radar_email_contacts(id, email, platforms, locale, unsubscribe_hash, confirmed_at)
        SELECT ?, email, platforms, locale, ?, ? FROM radar_email_confirmations WHERE token_hash = ? AND expires_at > ?
        ON CONFLICT(email) DO UPDATE SET
          platforms = excluded.platforms, locale = excluded.locale, confirmed_at = excluded.confirmed_at
      `,
        )
        .bind(id, hash(token('unsubscribe', id)), timestamp, digest, timestamp),
      db
        .prepare(
          `
        DELETE FROM radar_email_alerts WHERE finished_at IS NULL AND contact_id = (
          SELECT c.id FROM radar_email_contacts c JOIN radar_email_confirmations p ON p.email = c.email
          WHERE p.token_hash = ? AND p.expires_at > ?
        )
      `,
        )
        .bind(digest, timestamp),
      db
        .prepare('DELETE FROM radar_email_confirmations WHERE token_hash = ?')
        .bind(digest),
    ]);
    return result.meta.changes === 1;
  }

  async function unsubscribe(value: string) {
    const digest = tokenHash(value);
    if (!digest) return false;
    const [, result] = await db.batch([
      db
        .prepare(
          `DELETE FROM radar_email_confirmations WHERE email = (
        SELECT email FROM radar_email_contacts WHERE unsubscribe_hash = ?
      )`,
        )
        .bind(digest),
      db
        .prepare('DELETE FROM radar_email_contacts WHERE unsubscribe_hash = ?')
        .bind(digest),
    ]);
    return result.meta.changes === 1;
  }

  async function queue(overview: RadarOverview | null) {
    const timestamp = now();
    const samples = recentSamples(overview, timestamp);
    await db.batch([
      db
        .prepare('DELETE FROM radar_email_confirmations WHERE expires_at <= ?')
        .bind(timestamp),
      db
        .prepare('DELETE FROM radar_email_alerts WHERE episode_at < ?')
        .bind(timestamp - MAX_AGE_MS),
      ...samples.flatMap(({ id, mask, sampleAt, probability }) => [
        db
          .prepare(
            `
          INSERT INTO radar_email_platform_state(platform, observed_at, episode_at) VALUES (?, ?, ?)
          ON CONFLICT(platform) DO UPDATE SET observed_at = excluded.observed_at,
            episode_at = CASE WHEN excluded.episode_at IS NULL THEN NULL ELSE COALESCE(episode_at, excluded.episode_at) END
          WHERE excluded.observed_at > observed_at
        `,
          )
          .bind(id, sampleAt, probability > THRESHOLD ? sampleAt : null),
        db
          .prepare(
            `
          INSERT OR IGNORE INTO radar_email_alerts(id, contact_id, platform, episode_at, probability, locale, next_attempt_at)
          SELECT c.id || ':' || p.platform || ':' || p.episode_at, c.id, p.platform, p.episode_at, ?, c.locale, ?
          FROM radar_email_contacts c CROSS JOIN radar_email_platform_state p
          WHERE p.platform = ? AND p.episode_at = ? AND p.observed_at = ?
            AND c.confirmed_at <= p.episode_at AND (c.platforms & ?) <> 0 AND ? > 80
        `,
          )
          .bind(
            probability,
            timestamp,
            id,
            sampleAt,
            sampleAt,
            mask,
            probability,
          ),
      ]),
    ]);
    return samples.map(({ id }) => id);
  }

  async function claim(platforms: RadarPlatformId[]) {
    const timestamp = now();
    const lease = randomUUID();
    const row = await db
      .prepare(
        `
      UPDATE radar_email_alerts SET claim = ?, claim_until = ?, attempts = attempts + 1
      WHERE id = (
        SELECT a.id FROM radar_email_alerts a JOIN radar_email_platform_state p USING (platform)
        WHERE a.finished_at IS NULL AND (a.claim_until IS NULL OR a.claim_until <= ?) AND a.next_attempt_at <= ?
          AND p.episode_at = a.episode_at AND a.episode_at >= ? AND p.observed_at >= ?
          AND a.platform IN (${platforms.map(() => '?').join(',')})
        ORDER BY a.next_attempt_at, a.id LIMIT 1
      ) RETURNING id, contact_id, platform, episode_at, probability, locale, attempts
    `,
      )
      .bind(
        lease,
        timestamp + CLAIM_MS,
        timestamp,
        timestamp,
        timestamp - MAX_AGE_MS,
        timestamp - MAX_AGE_MS,
        ...platforms,
      )
      .first<AlertRow>();
    return row && { row, lease };
  }

  let running: Promise<void> | null = null;
  function dispatch(
    overview: RadarOverview | null,
    send: (alert: RadarEmailAlert) => Promise<RadarEmailOutcome>,
  ) {
    if (running) return running;
    running = (async () => {
      const eligible = await queue(overview);
      if (!eligible.length) return;
      for (let index = 0; index < 20; index++) {
        const claimResult = await claim(eligible);
        if (!claimResult) break;
        const { row, lease } = claimResult;
        const contact = await db
          .prepare(
            `SELECT c.email, c.unsubscribe_hash FROM radar_email_contacts c
              JOIN radar_email_alerts a ON a.contact_id = c.id
              JOIN radar_email_platform_state p ON p.platform = a.platform
              WHERE a.id = ? AND a.claim = ? AND a.episode_at = p.episode_at`,
          )
          .bind(row.id, lease)
          .first<{ email: string; unsubscribe_hash: string }>();
        const unsubscribeToken = token('unsubscribe', row.contact_id);
        let outcome: RadarEmailOutcome = 'permanent';
        if (contact?.unsubscribe_hash === hash(unsubscribeToken)) {
          try {
            outcome = await send({
              email: contact.email,
              platform: row.platform,
              probability: row.probability,
              timestamp: new Date(row.episode_at).toISOString(),
              locale: row.locale,
              unsubscribeToken,
              idempotencyKey: `radar-alert-${hash(row.id)}`,
            });
          } catch {
            outcome = 'retry';
          }
        }
        const timestamp = now();
        const delay = RETRY_MS[row.attempts - 1];
        const retry =
          outcome === 'retry' &&
          delay !== undefined &&
          timestamp + delay < row.episode_at + MAX_AGE_MS;
        await db
          .prepare(
            `
          UPDATE radar_email_alerts SET claim = NULL, claim_until = NULL, next_attempt_at = ?, finished_at = ?
          WHERE id = ? AND claim = ?
        `,
          )
          .bind(
            retry ? timestamp + delay : timestamp,
            retry ? null : timestamp,
            row.id,
            lease,
          )
          .run();
      }
    })().finally(() => {
      running = null;
    });
    return running;
  }

  return {
    requestConfirmation,
    discardConfirmation,
    confirm,
    unsubscribe,
    dispatch,
  };
}

export type RadarEmailStore = ReturnType<typeof createRadarEmailStore>;

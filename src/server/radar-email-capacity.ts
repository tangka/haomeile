import type { D1Database } from '@cloudflare/workers-types/index.ts';

import type { RadarProviderUsage } from '../shared/radar-email-report';

export type RadarProvider = RadarProviderUsage['provider'];
export type RadarProviderCapacity = RadarProviderUsage;
const DAY = 86_400_000;
const MONTH = 31 * DAY;

type Reservation =
  | { status: 'reserved'; provider: RadarProvider }
  | { status: 'sent' | 'busy' | 'unavailable' };

// Reserve against rolling windows unless the provider publishes its reset boundary.
// A 31-day window covers account-specific monthly billing periods.
const capacityQuery = `
  WITH clock(now, enabledList) AS (VALUES (?, ?)),
  plans(provider, dayLimit, monthLimit) AS (
    VALUES ('resend', 100, 3000), ('brevo', 300, NULL), ('mailjet', 200, 6000)
  ),
  windows AS (
    SELECT plans.*, clock.*,
      provider IN (SELECT value FROM json_each(enabledList)) AS enabled,
      CASE WHEN provider = 'resend' THEN now - (now % ${DAY}) ELSE now - ${DAY} + 1 END AS dayStart,
      MAX(now - ${MONTH} + 1, COALESCE((
        SELECT valid_until FROM radar_email_quota_observations o WHERE o.provider = plans.provider
          AND o.period = 'month' AND o.exact_reset = 1 AND o.valid_until <= now
      ), 0)) AS monthStart
    FROM plans CROSS JOIN clock
  ),
  usage AS (
    SELECT w.*, ps.settled_count, NULLIF(MAX(ps.blocked_until, w.now), w.now) AS blockedUntil,
      COUNT(r.message_key) FILTER (WHERE r.usage_at >= w.monthStart) AS monthLocal,
      COUNT(r.message_key) FILTER (WHERE r.usage_at >= w.dayStart) AS dayLocal,
      COUNT(r.message_key) FILTER (WHERE r.state = 'reserved' AND r.usage_at >= w.monthStart) AS monthReserved,
      COUNT(r.message_key) FILTER (WHERE r.state = 'reserved' AND r.usage_at >= w.dayStart) AS dayReserved
    FROM windows w JOIN radar_email_provider_state ps USING (provider)
    LEFT JOIN radar_email_reservations r ON r.provider = w.provider AND r.usage_at >= MIN(w.dayStart, w.monthStart)
    GROUP BY w.provider
  ),
  totals AS (
    SELECT u.*,
      MAX(dayLocal, COALESCE(d.used + u.settled_count - d.settled_count + dayReserved, 0)) AS dayUsed,
      COALESCE(m.used + u.settled_count - m.settled_count + monthReserved, monthLocal) AS monthUsed,
      (SELECT COUNT(*) FROM radar_email_contacts c WHERE c.provider = u.provider) AS contacts,
      (SELECT COUNT(*) FROM radar_email_confirmations p WHERE p.provider = u.provider
        AND MAX(p.expires_at, COALESCE(p.code_expires_at, 0)) > u.now
        AND NOT EXISTS (SELECT 1 FROM radar_email_contacts c WHERE c.email = p.email)) AS pending
    FROM usage u
    LEFT JOIN radar_email_quota_observations d ON d.provider = u.provider AND d.period = 'day' AND d.valid_until > u.now
    LEFT JOIN radar_email_quota_observations m ON m.provider = u.provider AND m.period = 'month' AND m.valid_until > u.now
  ),
  capacity AS (
    SELECT *, CASE WHEN enabled = 0 OR blockedUntil IS NOT NULL THEN 0
      ELSE MAX(0, MIN(dayLimit - dayUsed, COALESCE(monthLimit - monthUsed, dayLimit))) END AS remaining
    FROM totals
  )`;

export function createRadarEmailCapacity(
  db: D1Database,
  enabled: readonly RadarProvider[],
  now = Date.now,
) {
  const enabledList = JSON.stringify(enabled);

  async function snapshot(): Promise<RadarProviderCapacity[]> {
    const result = await db
      .prepare(
        `${capacityQuery}
      SELECT provider, enabled, dayLimit, monthLimit, dayUsed, monthUsed, remaining,
        contacts, pending, blockedUntil FROM capacity ORDER BY provider`,
      )
      .bind(now(), enabledList)
      .all<Omit<RadarProviderCapacity, 'enabled'> & { enabled: number }>();
    return result.results.map((row) => ({
      ...row,
      enabled: Boolean(row.enabled),
    }));
  }

  async function reserve(
    email: string,
    key: string,
    kind: 'confirmation' | 'alert',
  ): Promise<Reservation> {
    const timestamp = now();
    const target =
      kind === 'alert'
        ? 'SELECT provider FROM radar_email_contacts WHERE email = ?'
        : `SELECT COALESCE(c.provider, p.provider) AS provider
         FROM radar_email_confirmations p LEFT JOIN radar_email_contacts c USING (email)
         WHERE p.email = ? AND 'radar-confirm-' || p.nonce || '-' || p.requested_at = ?`;
    const targetArgs = kind === 'alert' ? [email] : [email, key];
    const insert = db
      .prepare(
        `${capacityQuery}, target AS (${target})
      INSERT INTO radar_email_reservations(message_key, provider, state, usage_at)
      SELECT ?, c.provider, 'reserved', c.now FROM capacity c CROSS JOIN target
      WHERE c.remaining > 0 AND (target.provider IS NULL OR target.provider = c.provider)
      ORDER BY (c.contacts + c.pending + 2 > c.remaining),
        (c.contacts + c.pending + 1.0) / MIN(c.remaining, COALESCE(c.monthLimit / 31.0, c.dayLimit)),
        1.0 * c.dayUsed / c.dayLimit, c.provider
      LIMIT 1 ON CONFLICT(message_key) DO NOTHING RETURNING provider`,
      )
      .bind(timestamp, enabledList, ...targetArgs, key);
    // The write lock covers choosing a sender, its quota reservation and assignment.
    // A replay can inspect the existing entry but cannot make a second network call.
    const statements = [
      db
        .prepare('DELETE FROM radar_email_reservations WHERE usage_at < ?')
        .bind(timestamp - MONTH - DAY),
      insert,
      db
        .prepare(
          'SELECT state FROM radar_email_reservations WHERE message_key = ?',
        )
        .bind(key),
    ];
    if (kind === 'confirmation') {
      statements.push(
        db
          .prepare(
            `UPDATE radar_email_confirmations
          SET provider = (SELECT provider FROM radar_email_reservations WHERE message_key = ?)
          WHERE email = ? AND provider IS NULL AND 'radar-confirm-' || nonce || '-' || requested_at = ?
            AND EXISTS (SELECT 1 FROM radar_email_reservations WHERE message_key = ?)`,
          )
          .bind(key, email, key, key),
      );
    }
    const [, inserted, previous] = await db.batch<{
      provider?: RadarProvider;
      state?: string;
    }>(statements);
    const provider = inserted.results[0]?.provider;
    if (provider) return { status: 'reserved', provider };
    const state = previous.results[0]?.state;
    if (state === 'sent') return { status: 'sent' };
    return { status: state ? 'busy' : 'unavailable' };
  }

  async function settle(key: string, outcome: 'sent' | 'rejected' | 'unknown') {
    if (outcome === 'rejected') {
      await db
        .prepare(
          "DELETE FROM radar_email_reservations WHERE message_key = ? AND state = 'reserved'",
        )
        .bind(key)
        .run();
    } else {
      await db
        .prepare(
          "UPDATE radar_email_reservations SET state = ?, usage_at = ? WHERE message_key = ? AND state = 'reserved'",
        )
        .bind(outcome, now(), key)
        .run();
    }
  }

  async function block(provider: RadarProvider, untilMs: number) {
    const timestamp = now();
    if (!Number.isSafeInteger(untilMs) || untilMs <= timestamp) return;
    await db
      .prepare(
        'UPDATE radar_email_provider_state SET blocked_until = MAX(blocked_until, ?) WHERE provider = ?',
      )
      .bind(Math.min(untilMs, timestamp + MONTH), provider)
      .run();
  }

  async function observeResendUsage(
    day: number | null,
    month: number | null,
    at = now(),
    monthResetsAt?: number,
    requestStartedAt = at,
  ) {
    if (
      !Number.isSafeInteger(at) ||
      at > now() + 60_000 ||
      !Number.isSafeInteger(requestStartedAt) ||
      requestStartedAt > at
    )
      return;
    const dayEnd = at - (at % DAY) + DAY;
    const monthEnd = monthResetsAt ?? at + MONTH;
    const readings = [
      ['day', day, dayEnd],
      ['month', month, monthEnd],
    ] as const;
    const statements = [];
    for (const [period, used, end] of readings) {
      if (
        used === null ||
        !Number.isSafeInteger(used) ||
        used < 0 ||
        !Number.isSafeInteger(end) ||
        end <= at ||
        end > at + MONTH + DAY ||
        (period === 'day' && requestStartedAt < dayEnd - DAY)
      )
        continue;
      // An account reading includes deliveries outside this site. Keep a watermark
      // so our subsequent sends immediately consume capacity between provider polls.
      // A fresh, non-overlapping lower raw monthly reading can identify a rollover
      // without a published reset timestamp. Late responses from before it are ignored.
      statements.push(
        db
          .prepare(
            `

          WITH sample(period, reported, started, finished, exactEnd, fallbackEnd) AS (VALUES (?, ?, ?, ?, ?, ?)),
          prior AS (
            SELECT s.*, ps.settled_count AS tally, o.used AS oldFloor, o.reported_used AS oldReported,
              o.settled_count AS oldTally, o.observed_at AS lastRead, o.cycle_observed_at AS cycleObserved,
              o.valid_until AS oldEnd, o.exact_reset AS wasExact
            FROM sample s JOIN radar_email_provider_state ps ON ps.provider = 'resend'
            LEFT JOIN radar_email_quota_observations o ON o.provider = ps.provider AND o.period = s.period
            WHERE o.period IS NULL OR (finished >= o.observed_at AND started >= o.cycle_observed_at
              AND (exactEnd IS NOT NULL OR o.exact_reset = 0 OR started >= o.valid_until OR finished < o.valid_until))
          ),
          transition AS (
            SELECT *, (lastRead IS NULL OR finished >= oldEnd
              OR (exactEnd IS NOT NULL AND wasExact = 1 AND exactEnd <> oldEnd)
              OR (period = 'month' AND wasExact = 0 AND started > lastRead AND reported < oldReported)
            ) AS newCycle FROM prior
          )
          INSERT INTO radar_email_quota_observations
            (provider, period, used, reported_used, settled_count, observed_at, valid_until, exact_reset, cycle_observed_at)
          SELECT 'resend', period,
            CASE WHEN newCycle OR (started > lastRead AND reported > oldReported)
                    OR (exactEnd IS NOT NULL AND wasExact = 0 AND started > lastRead) THEN reported
              ELSE MAX(reported, oldFloor + tally - oldTally) END,
            CASE WHEN newCycle THEN reported ELSE MAX(oldReported, reported) END,
            tally, finished, COALESCE(exactEnd, CASE WHEN NOT newCycle THEN oldEnd END, fallbackEnd),
            CASE WHEN exactEnd IS NOT NULL THEN 1 WHEN newCycle THEN 0 ELSE wasExact END,
            CASE WHEN lastRead IS NULL THEN 0 WHEN newCycle THEN finished ELSE cycleObserved END
          FROM transition WHERE TRUE
          ON CONFLICT(provider, period) DO UPDATE SET used = excluded.used, reported_used = excluded.reported_used,
            settled_count = excluded.settled_count, observed_at = excluded.observed_at, valid_until = excluded.valid_until,
            exact_reset = excluded.exact_reset, cycle_observed_at = excluded.cycle_observed_at`,
          )
          .bind(
            period,
            used,
            requestStartedAt,
            at,
            period === 'month' ? (monthResetsAt ?? null) : end,
            end,
          ),
      );
    }
    if (statements.length) await db.batch(statements);
  }

  return { reserve, settle, snapshot, block, observeResendUsage };
}

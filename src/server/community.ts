import type { D1Database } from '@cloudflare/workers-types/index.ts';
import { safeCommunitySource } from '../shared/community';
import {
  APPEALS,
  EVENTS,
  PRODUCT_PLANS,
  STYLES,
  VENDORS,
  type Vendor,
} from '../worker/types';
import { sha256 } from '../worker/lib/crypto';
import { checkPrivacy } from '../worker/lib/privacy';
import { beijingDay, validDate } from '../worker/lib/time';

export interface CommunityCase {
  vendor: Vendor;
  event_type: (typeof EVENTS)[number];
  plan: (typeof PRODUCT_PLANS)[Vendor][number];
  appeal_status: (typeof APPEALS)[number];
  card_style: (typeof STYLES)[number];
  died_at: string;
  codename: string;
  codename_en: string;
  story: string;
  story_en: string;
  source_url: string;
  source_platform: string;
  source_published_at: string;
}

export function validateCommunityCases(
  value: unknown,
  today = beijingDay(),
): CommunityCase[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 2000)
    throw new Error(
      'Community import must be a nonempty array of at most 2000 records',
    );
  return value.map((item, index) => {
    const fail = (field: string): never => {
      throw new Error(`Invalid community record ${index + 1}: ${field}`);
    };
    if (!item || typeof item !== 'object' || Array.isArray(item))
      return fail('object');
    const input = item as Record<string, unknown>;
    const text = (field: string, minimum: number, maximum: number) => {
      if (typeof input[field] !== 'string') return fail(field);
      const text = (input[field] as string).trim();
      if (
        [...text].length < minimum ||
        [...text].length > maximum ||
        checkPrivacy(text)
      )
        return fail(field);
      return text;
    };
    const enumeration = <T extends string>(
      field: string,
      choices: readonly T[],
      fallback?: T,
    ): T => {
      const selected = input[field] ?? fallback;
      if (typeof selected !== 'string' || !choices.includes(selected as T))
        return fail(field);
      return selected as T;
    };
    const vendor = enumeration('vendor', VENDORS);
    const plan = enumeration(
      'plan',
      PRODUCT_PLANS[vendor] as readonly CommunityCase['plan'][],
      'unknown',
    );
    const source = safeCommunitySource(
      typeof input.source_url === 'string' ? input.source_url : null,
    );
    if (!source) return fail('source_url');
    const date = input.event_date ?? input.died_at ?? '';
    if (
      typeof date !== 'string' ||
      (date !== '' && (!validDate(date) || date > today))
    )
      return fail('event_date');
    const published = input.source_published_at;
    if (
      typeof published !== 'string' ||
      !validDate(published) ||
      published > today
    )
      return fail('source_published_at');
    const host = new URL(source).hostname;
    return {
      vendor,
      event_type: enumeration('event_type', EVENTS),
      plan,
      appeal_status: enumeration('appeal_status', APPEALS, 'none'),
      card_style: enumeration('card_style', STYLES, 'flower'),
      died_at: date,
      codename: text('codename', 1, 32),
      codename_en: text('codename_en', 1, 96),
      story: text('story', 10, 800),
      story_en: text('story_en', 10, 1600),
      source_url: source,
      source_platform:
        host === 'github.com'
          ? 'GitHub'
          : host === 'www.reddit.com'
            ? 'Reddit'
            : host === 'x.com'
              ? 'X'
              : host === 'community.openai.com'
                ? 'OpenAI Developer Community'
                : 'Google AI Developers Forum',
      source_published_at: published,
    };
  });
}

function publicId(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  return Array.from(
    crypto.getRandomValues(new Uint8Array(10)),
    (byte) => alphabet[byte & 31],
  ).join('');
}

export async function importCommunityCasesDetailed(
  db: D1Database,
  value: unknown,
  now = new Date(),
): Promise<{ inserted: number; skipped: number; insertedPaths: string[] }> {
  const cases = validateCommunityCases(value, beijingDay(now));
  const timestamp = now.toISOString();
  // All validation and asynchronous hashing finish before the database transaction.
  const records = await Promise.all(
    cases.map(async (record) => ({
      record,
      id: publicId(),
      fingerprint: await sha256(record.source_url),
    })),
  );
  const statements = records.flatMap(({ record: item, id, fingerprint }) => [
    db
      .prepare(
        `INSERT INTO tombstones (id,secret_hash,codename,nickname,vendor,event_type,plan,born_at,born_precision,died_at,story,epitaph,appeal_status,card_style,status,pending_patch,flags,flowers,created_at,updated_at,approved_at,origin,source_url,source_platform,source_published_at,codename_en,story_en)
      SELECT ?,'',?,'',?,?,?,NULL,'none',?,?,'',?,?,'approved',NULL,'[]',0,?,?,?,'community',?,?,?,?,?
      WHERE NOT EXISTS (SELECT 1 FROM community_source_history WHERE source_fingerprint=?) AND NOT EXISTS (SELECT 1 FROM tombstones WHERE source_url=?)`,
      )
      .bind(
        id,
        item.codename,
        item.vendor,
        item.event_type,
        item.plan,
        item.died_at,
        item.story,
        item.appeal_status,
        item.card_style,
        timestamp,
        timestamp,
        timestamp,
        item.source_url,
        item.source_platform,
        item.source_published_at,
        item.codename_en,
        item.story_en,
        fingerprint,
        item.source_url,
      ),
    db
      .prepare(
        "INSERT INTO audit_log(id,tombstone_id,action,actor,detail,created_at) SELECT ?,?,'community_import','community-editor',NULL,? WHERE changes()=1",
      )
      .bind(crypto.randomUUID(), id, timestamp),
    db
      .prepare(
        `INSERT OR IGNORE INTO community_source_history(source_fingerprint,tombstone_id,imported_at) SELECT ?,id,? FROM tombstones WHERE origin='community' AND source_url=?`,
      )
      .bind(fingerprint, timestamp, item.source_url),
  ]);
  const result = await db.batch(statements);
  const insertedPaths: string[] = [];
  const vendors = new Set<string>();
  let inserted = 0;
  records.forEach(({ record, id }, index) => {
    if (Number(result[index * 3]?.meta.changes || 0) > 0) {
      inserted++;
      insertedPaths.push(`/t/${id}`);
      vendors.add(record.vendor);
    }
  });
  if (inserted > 0) {
    insertedPaths.push('/', '/llms-full.txt');
    for (const vendor of vendors) insertedPaths.push(`/v/${vendor}`);
  }
  return { inserted, skipped: cases.length - inserted, insertedPaths };
}

/**
 * Rewrites the editor's own summary of records that already exist. It never adds
 * a record, changes its status, or touches a submission or a withdrawn record.
 */
export async function updateCommunityCases(
  db: D1Database,
  value: unknown,
  now = new Date(),
): Promise<{ updated: number; unchanged: number; updatedPaths: string[] }> {
  const cases = validateCommunityCases(value, beijingDay(now));
  const timestamp = now.toISOString();
  const statements = cases.flatMap((item) => [
    db
      .prepare(
        `UPDATE tombstones SET codename=?1,codename_en=?2,story=?3,story_en=?4,updated_at=?5
      WHERE origin='community' AND status IN ('approved','hidden') AND source_url=?6
      AND (codename IS NOT ?1 OR codename_en IS NOT ?2 OR story IS NOT ?3 OR story_en IS NOT ?4)`,
      )
      .bind(
        item.codename,
        item.codename_en,
        item.story,
        item.story_en,
        timestamp,
        item.source_url,
      ),
    db
      .prepare(
        "INSERT INTO audit_log(id,tombstone_id,action,actor,detail,created_at) SELECT ?,id,'community_update','community-editor',NULL,? FROM tombstones WHERE changes()=1 AND origin='community' AND source_url=?",
      )
      .bind(crypto.randomUUID(), timestamp, item.source_url),
    db
      .prepare(
        "SELECT id,vendor FROM tombstones WHERE origin='community' AND status='approved' AND updated_at=? AND source_url=?",
      )
      .bind(timestamp, item.source_url),
  ]);
  const result = await db.batch<{ id: string; vendor: string }>(statements);
  const paths = new Set<string>();
  let updated = 0;
  cases.forEach((_, index) => {
    if (!Number(result[index * 3]?.meta.changes || 0)) return;
    updated++;
    for (const row of result[index * 3 + 2]!.results) {
      paths.add(`/t/${row.id}`);
      paths.add(`/v/${row.vendor}`);
    }
  });
  if (paths.size) paths.add('/').add('/llms-full.txt');
  return {
    updated,
    unchanged: cases.length - updated,
    updatedPaths: [...paths],
  };
}

/** Offline operator import: no HTTP endpoint, owner credential or test CAPTCHA. */
export async function importCommunityCases(
  db: D1Database,
  value: unknown,
  now = new Date(),
): Promise<{ inserted: number; skipped: number }> {
  const { inserted, skipped } = await importCommunityCasesDetailed(
    db,
    value,
    now,
  );
  return { inserted, skipped };
}

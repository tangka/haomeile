import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { safeCommunitySource } from '../../src/shared/community';
import {
  importCommunityCases,
  validateCommunityCases,
} from '../../src/server/community';
import { openDatabase, type LocalDatabase } from '../../src/server/database';
import {
  findPublicTombstone,
  getStats,
  listTombstones,
} from '../../src/worker/lib/store';

const directories: string[] = [],
  databases: LocalDatabase[] = [];
const migrations = resolve(import.meta.dir, '../../migrations');
const fixture = {
  vendor: 'claude',
  event_type: 'suspended',
  plan: 'unknown',
  event_date: null,
  appeal_status: 'none',
  source_url: 'https://github.com/fixture/cases/issues/123',
  source_platform: 'GitHub',
  source_published_at: '2026-11-18',
  codename: '社区案例测试',
  codename_en: 'Community case fixture',
  story: '这是在社区公开发帖的测试摘要，具体原因未经独立核实。',
  story_en:
    'An isolated community case fixture. The reported event is not independently verified.',
};
async function temporary() {
  const directory = await mkdtemp(join(tmpdir(), 'haomeile-community-test-'));
  directories.push(directory);
  return directory;
}
async function database(file = ':memory:') {
  const db = openDatabase(file);
  databases.push(db);
  await db.migrate(migrations);
  return db;
}
afterEach(async () => {
  for (const db of databases.splice(0)) db.close();
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});

describe('community source boundaries', () => {
  test('only permits direct HTTPS issue and discussion links, normalized by immutable post identity', () => {
    expect(
      safeCommunitySource(
        'https://github.com/Fixture/Cases/issues/123?utm_source=test#body',
      ),
    ).toBe(fixture.source_url);
    expect(
      safeCommunitySource(
        'https://old.reddit.com/r/Example/comments/abc123/title/',
      ),
    ).toBe('https://www.reddit.com/comments/abc123/');
    expect(safeCommunitySource('https://www.reddit.com/comments/abc123/')).toBe(
      'https://www.reddit.com/comments/abc123/',
    );
    for (const host of ['community.openai.com', 'discuss.ai.google.dev']) {
      expect(
        safeCommunitySource(`https://${host}/t/old-title/123?ref=test`),
      ).toBe(`https://${host}/t/123`);
      expect(safeCommunitySource(`https://${host}/t/renamed-title/123`)).toBe(
        `https://${host}/t/123`,
      );
      expect(safeCommunitySource(`https://${host}/t/123`)).toBe(
        `https://${host}/t/123`,
      );
    }
    for (const value of [
      undefined,
      null,
      'javascript:alert(1)',
      'http://github.com/a/b/issues/123',
      'https://github.com@evil.example/a/b/issues/123',
      'https://evil.example/t/a/123',
      'https://github.com:444/a/b/issues/123',
      'https://github.com/login',
      'https://github.com/a/b/issues/123%2fprivate',
      'https://community.openai.com/u/a',
      'https://github.com/a\\b/issues/123',
      'https://github.com/a/b/issues/123\nprivate',
    ])
      expect(safeCommunitySource(value)).toBeNull();
  });

  test('normalizes official X post links and rejects other X routes and domains', () => {
    const id = '1966547284500012345';
    const canonical = `https://x.com/i/status/${id}`;
    for (const url of [
      canonical,
      `https://x.com/Some_Author/status/${id}?s=20#context`,
      `https://www.x.com/i/web/status/${id}`,
      `https://twitter.com/old_author/status/${id}/`,
      `https://www.twitter.com/i/status/${id}`,
      `https://mobile.twitter.com/old_author/status/${id}`,
    ])
      expect(safeCommunitySource(url)).toBe(canonical);
    for (const url of [
      `http://x.com/author/status/${id}`,
      `https://x.com.example/author/status/${id}`,
      `https://twitter.com@evil.example/author/status/${id}`,
      `https://login@x.com/author/status/${id}`,
      `https://x.com:444/author/status/${id}`,
      `https://api.x.com/author/status/${id}`,
      `https://x.com/author/status/${id}/photo/1`,
      `https://x.com/intent/retweet?tweet_id=${id}`,
      'https://x.com/author',
      'https://x.com/author/status/0123',
      'https://x.com/author/status/invalid',
      'https://t.co/example',
    ])
      expect(safeCommunitySource(url)).toBeNull();
  });

  test('keeps body privacy filtering and requires bilingual summaries and real published dates', () => {
    expect(validateCommunityCases([fixture])[0]).toMatchObject({
      died_at: '',
      source_platform: 'GitHub',
    });
    for (const field of ['story', 'story_en', 'codename', 'codename_en']) {
      expect(() =>
        validateCommunityCases([{ ...fixture, [field]: 'hello@example.com' }]),
      ).toThrow();
    }
    for (const invalid of [
      { story_en: '' },
      { source_published_at: '2026-02-30' },
      { event_date: '2999-01-01' },
      { source_url: 'https://evil.example/post/123' },
      { vendor: 'other' },
      { plan: 'plus' },
    ])
      expect(() =>
        validateCommunityCases([{ ...fixture, ...invalid }]),
      ).toThrow();
  });
});

describe('transactional editorial import', () => {
  test('stores the X source label and deduplicates aliases of the same post', async () => {
    const db = await database();
    const id = '1966547284500012345';
    expect(
      await importCommunityCases(db.binding, [
        { ...fixture, source_url: `https://twitter.com/author/status/${id}` },
        { ...fixture, source_url: `https://x.com/i/web/status/${id}?s=20` },
      ]),
    ).toEqual({ inserted: 1, skipped: 1 });
    const { items } = await listTombstones(db.binding);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      source_url: `https://x.com/i/status/${id}`,
      source_platform: 'X',
    });
  });

  test('imports approved source-backed cases separately from voluntary submission counts', async () => {
    const db = await database();
    expect(await importCommunityCases(db.binding, [fixture])).toEqual({
      inserted: 1,
      skipped: 0,
    });
    const page = await listTombstones(db.binding),
      item = page.items[0];
    expect(item).toMatchObject({
      origin: 'community',
      source_url: fixture.source_url,
      source_platform: 'GitHub',
      source_published_at: fixture.source_published_at,
      died_at: '',
      nickname: '',
      story_en: fixture.story_en,
      codename_en: fixture.codename_en,
    });
    expect(item).not.toHaveProperty('secret_hash');
    expect(await findPublicTombstone(db.binding, item.id)).toMatchObject({
      origin: 'community',
    });
    const initial = await getStats(db.binding);
    expect(initial).toMatchObject({
      total: 0,
      today: 0,
      last7: 0,
      community_total: 1,
      by_vendor: [],
      by_event: [],
    });
    expect(
      initial.timeline.every((day) => day.reported === 0 && day.occurred === 0),
    ).toBe(true);
    const now = new Date().toISOString();
    await db.binding
      .prepare(
        "INSERT INTO tombstones(id,secret_hash,codename,vendor,event_type,died_at,story,status,created_at,updated_at,approved_at) VALUES ('SUBMITAAAA','hash','User fixture','codex','verification',?,'User submission fixture','approved',?,?,?)",
      )
      .bind(initial.date, now, now, now)
      .run();
    expect(await getStats(db.binding)).toMatchObject({
      total: 1,
      today: 1,
      last7: 1,
      community_total: 1,
      by_vendor: [['codex', 1]],
      by_event: [['verification', 1]],
    });
    expect(
      await db.binding
        .prepare("SELECT secret_hash FROM tombstones WHERE origin='community'")
        .first('secret_hash'),
    ).toBe('');
  });

  test('reimport never overwrites edited content or restores hidden or withdrawn cases', async () => {
    const db = await database();
    const source = {
      ...fixture,
      source_url: 'https://community.openai.com/t/original-title/234',
      vendor: 'codex',
    };
    await importCommunityCases(db.binding, [source]);
    const id = (await listTombstones(db.binding)).items[0].id;
    await db.binding
      .prepare("UPDATE tombstones SET status='hidden' WHERE id=?")
      .bind(id)
      .run();
    const renamed = {
      ...source,
      source_url: 'https://community.openai.com/t/changed-title/234',
      story: '这是一段不应覆盖原记录的全新编辑摘要。',
    };
    expect(await importCommunityCases(db.binding, [renamed])).toEqual({
      inserted: 0,
      skipped: 1,
    });
    expect(
      await db.binding
        .prepare('SELECT status,story FROM tombstones WHERE id=?')
        .bind(id)
        .first(),
    ).toEqual({ status: 'hidden', story: fixture.story });
    await db.binding
      .prepare("UPDATE tombstones SET status='withdrawn' WHERE id=?")
      .bind(id)
      .run();
    expect(
      await db.binding
        .prepare(
          'SELECT codename,story,source_url,source_platform,source_published_at,codename_en,story_en,secret_hash FROM tombstones WHERE id=?',
        )
        .bind(id)
        .first(),
    ).toEqual({
      codename: null,
      story: null,
      source_url: null,
      source_platform: null,
      source_published_at: null,
      codename_en: null,
      story_en: null,
      secret_hash: '',
    });
    expect(await importCommunityCases(db.binding, [renamed])).toEqual({
      inserted: 0,
      skipped: 1,
    });
    expect(
      await db.binding.prepare('SELECT COUNT(*) n FROM tombstones').first('n'),
    ).toBe(1);
    expect(
      await db.binding
        .prepare('SELECT COUNT(*) n FROM community_source_history')
        .first('n'),
    ).toBe(1);
    expect(await getStats(db.binding)).toMatchObject({
      total: 0,
      community_total: 0,
    });
  });

  test('rolls back every record and ledger entry when a later SQL insert fails', async () => {
    const db = await database();
    await db.binding
      .prepare(
        "CREATE TRIGGER fail_import BEFORE INSERT ON tombstones WHEN NEW.codename='后续失败' BEGIN SELECT RAISE(ABORT,'fixture failure'); END;",
      )
      .run();
    await expect(
      importCommunityCases(db.binding, [
        fixture,
        {
          ...fixture,
          codename: '后续失败',
          source_url: 'https://github.com/fixture/cases/issues/124',
        },
      ]),
    ).rejects.toThrow();
    for (const table of ['tombstones', 'community_source_history', 'audit_log'])
      expect(
        await db.binding.prepare(`SELECT COUNT(*) n FROM ${table}`).first('n'),
      ).toBe(0);
  });

  test('validates and imports the reviewed real manifest in an isolated empty database', async () => {
    const db = await database();
    const cases: unknown = JSON.parse(
      await readFile(
        resolve(import.meta.dir, '../../docs/research/community-cases.json'),
        'utf8',
      ),
    );
    const records = validateCommunityCases(cases);
    const count = records.length;
    expect(new Set(records.map((record) => record.source_url)).size).toBe(
      count,
    );
    expect(await importCommunityCases(db.binding, cases)).toEqual({
      inserted: count,
      skipped: 0,
    });
    expect(await importCommunityCases(db.binding, cases)).toEqual({
      inserted: 0,
      skipped: count,
    });
    expect(await getStats(db.binding)).toMatchObject({
      total: 0,
      today: 0,
      last7: 0,
      community_total: count,
    });
  });

  test('CLI backs up first, imports without migration, and prints only counts', async () => {
    const data = await temporary(),
      db = await database(join(data, 'haomeile.sqlite'));
    const source = join(data, 'cases.json');
    await writeFile(source, JSON.stringify([fixture]));
    const backups = join(data, 'backups');
    db.close();
    const child = Bun.spawn(
      [
        process.execPath,
        resolve(import.meta.dir, '../../src/server/index.ts'),
        'import-community',
        source,
      ],
      {
        cwd: data,
        env: {
          PATH: process.env.PATH,
          ENVIRONMENT: 'production',
          SITE_ORIGIN: 'https://haomeile.rip',
          DATA_DIR: data,
          BACKUP_DIR: backups,
          ASSET_ROOT: resolve(import.meta.dir, '../../dist'),
          MIGRATIONS_ROOT: join(data, 'must-not-be-used'),
          PEPPER: 'offline-import-test-only-pepper-longer-than-32',
          TURNSTILE_SITE_KEY: '0xTEST_OFFLINE_IMPORT_SITE',
          TURNSTILE_SECRET: '0xTEST_OFFLINE_IMPORT_SECRET',
          ADMIN_AUTH_MODE: 'basic',
          ADMIN_USERNAME: 'admin',
          ADMIN_PASSWORD_HASH: 'a'.repeat(64),
        },
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    expect(exit).toBe(0);
    expect(JSON.parse(stdout)).toEqual({ inserted: 1, skipped: 0 });
    expect(stderr).toBe('');
    const names = await readdir(backups);
    expect(names).toHaveLength(1);
    const before = openDatabase(join(backups, names[0]));
    databases.push(before);
    expect(
      await before.binding
        .prepare('SELECT COUNT(*) n FROM tombstones')
        .first('n'),
    ).toBe(0);
    const after = openDatabase(join(data, 'haomeile.sqlite'));
    databases.push(after);
    expect(
      await after.binding
        .prepare("SELECT COUNT(*) n FROM tombstones WHERE origin='community'")
        .first('n'),
    ).toBe(1);
  });
});

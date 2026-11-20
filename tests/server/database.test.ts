import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { openDatabase, type LocalDatabase } from '../../src/server/database';

const opened: LocalDatabase[] = [];
const directories: string[] = [];
function database(path = ':memory:'): LocalDatabase {
  const db = openDatabase(path);
  opened.push(db);
  return db;
}
async function temporary(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'haomeile-database-test-'));
  directories.push(directory);
  return directory;
}
afterEach(async () => {
  for (const db of opened.splice(0)) db.close();
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});
const migrations = resolve(import.meta.dir, '../../migrations');

async function tomb(db: LocalDatabase, id: string): Promise<void> {
  await db.binding
    .prepare(
      "INSERT INTO tombstones (id,secret_hash,codename,vendor,event_type,died_at,story,status,created_at,updated_at,approved_at) VALUES (?,'not-a-secret','Database fixture','claude','verification','2026-11-20','Database-only isolated test fixture','approved','2026-11-20T00:00:00Z','2026-11-20T00:00:00Z','2026-11-20T00:00:00Z')",
    )
    .bind(id)
    .run();
}

describe('Bun SQLite D1 binding', () => {
  test('exec runs a single statement without silently discarding SQL script tails', async () => {
    const db = database();
    expect(
      await db.binding.exec("SELECT ';' AS value; -- a trailing comment"),
    ).toMatchObject({ count: 1 });
    await expect(
      db.binding.exec(
        'CREATE TABLE must_not_exist(id INTEGER); INSERT INTO must_not_exist VALUES(1)',
      ),
    ).rejects.toThrow('Use migrate()');
    expect(
      await db.binding
        .prepare("SELECT name FROM sqlite_master WHERE name='must_not_exist'")
        .first(),
    ).toBeNull();
  });
  test('binds values immutably and returns first, named-column, rows and metadata results', async () => {
    const db = database();
    await db.binding
      .prepare(
        'CREATE TABLE example (id INTEGER PRIMARY KEY,value TEXT NOT NULL)',
      )
      .run();
    const query = db.binding.prepare(
      'INSERT INTO example (id,value) VALUES (?,?)',
    );
    const first = query.bind(1, '原文');
    const second = query.bind(2, 'English');
    const result = await db.binding.batch([first, second]);
    expect(result.map((entry) => entry.meta.changes)).toEqual([1, 1]);
    expect(
      await db.binding
        .prepare('SELECT value FROM example WHERE id=?')
        .bind(1)
        .first('value'),
    ).toBe('原文');
    expect(
      await db.binding
        .prepare('SELECT value FROM example WHERE id=999')
        .first(),
    ).toBeNull();
    expect(
      await db.binding
        .prepare('SELECT id,value FROM example ORDER BY id')
        .all(),
    ).toMatchObject({
      success: true,
      results: [
        { id: 1, value: '原文' },
        { id: 2, value: 'English' },
      ],
      meta: { changes: 0 },
    });
    expect(
      await db.binding
        .prepare('SELECT id,value FROM example ORDER BY id')
        .raw({ columnNames: true }),
    ).toEqual([
      ['id', 'value'],
      [1, '原文'],
      [2, 'English'],
    ]);
    expect(() => query.bind(undefined)).toThrow('Unsupported database binding');
  });

  test('rolls back the entire batch on a constraint error', async () => {
    const db = database();
    await db.binding
      .prepare('CREATE TABLE example (id TEXT PRIMARY KEY)')
      .run();
    await expect(
      db.binding.batch([
        db.binding.prepare('INSERT INTO example VALUES (?)').bind('same'),
        db.binding.prepare('INSERT INTO example VALUES (?)').bind('same'),
      ]),
    ).rejects.toThrow();
    expect(
      await db.binding
        .prepare('SELECT COUNT(*) count FROM example')
        .first('count'),
    ).toBe(0);
    await db.binding
      .prepare('INSERT INTO example VALUES (?)')
      .bind('after-rollback')
      .run();
    expect(
      await db.binding
        .prepare('SELECT COUNT(*) count FROM example')
        .first('count'),
    ).toBe(1);
  });

  test('rejects foreign-connection statements without committing preceding writes', async () => {
    const db = database(),
      foreign = database();
    await db.binding
      .prepare('CREATE TABLE example (id TEXT PRIMARY KEY)')
      .run();
    await expect(
      db.binding.batch([
        db.binding.prepare('INSERT INTO example VALUES (?)').bind('rollback'),
        foreign.binding.prepare('SELECT 1'),
      ]),
    ).rejects.toThrow('foreign statements');
    expect(
      await db.binding
        .prepare('SELECT COUNT(*) count FROM example')
        .first('count'),
    ).toBe(0);
  });

  test('preserves changes() between ordered flower statements and deduplicates concurrent requests', async () => {
    const db = database();
    await db.migrate(migrations);
    await tomb(db, 'FLOWERAAAA');
    const flower = () =>
      db.binding.batch([
        db.binding.prepare(
          "INSERT OR IGNORE INTO flowers (tombstone_id,visitor_hash,day) VALUES ('FLOWERAAAA','one-visitor','2026-11-20')",
        ),
        db.binding.prepare(
          "UPDATE tombstones SET flowers=flowers+changes() WHERE id='FLOWERAAAA'",
        ),
      ]);
    await Promise.all(Array.from({ length: 12 }, flower));
    expect(
      await db.binding
        .prepare("SELECT flowers FROM tombstones WHERE id='FLOWERAAAA'")
        .first('flowers'),
    ).toBe(1);
    expect(
      await db.binding
        .prepare('SELECT COUNT(*) count FROM flowers')
        .first('count'),
    ).toBe(1);
    await db.binding
      .prepare("DELETE FROM tombstones WHERE id='FLOWERAAAA'")
      .run();
    expect(
      await db.binding
        .prepare('SELECT COUNT(*) count FROM flowers')
        .first('count'),
    ).toBe(0);
    await expect(
      db.binding
        .prepare(
          "INSERT INTO flowers VALUES ('missing','visitor','2026-11-20')",
        )
        .run(),
    ).rejects.toThrow();
  });

  test('supports mutation RETURNING in first()', async () => {
    const db = database();
    await db.migrate(migrations);
    const query = db.binding.prepare(
      "INSERT INTO rate_limits (key,window_start,count) VALUES ('test','2026-11-20',1) ON CONFLICT(key,window_start) DO UPDATE SET count=count+1 RETURNING count",
    );
    expect(await query.first('count')).toBe(1);
    expect(await query.first('count')).toBe(2);
  });

  test('persists data and idempotent migrations without importing fixtures', async () => {
    const directory = await temporary(),
      file = join(directory, 'db.sqlite');
    const db = database(file);
    expect(await db.migrate(migrations)).toEqual([
      '0001_initial.sql',
      '0002_three_products.sql',
    ]);
    expect(
      await db.binding
        .prepare('SELECT COUNT(*) count FROM tombstones')
        .first('count'),
    ).toBe(0);
    await tomb(db, 'PERSISTAAA');
    expect(await db.migrate(migrations)).toEqual([]);
    expect((await stat(file)).mode & 0o777).toBe(0o600);
    const pragmas = await db.binding.batch([
      db.binding.prepare('PRAGMA journal_mode'),
      db.binding.prepare('PRAGMA foreign_keys'),
      db.binding.prepare('PRAGMA busy_timeout'),
    ]);
    expect(
      pragmas.map((entry) => Object.values(entry.results[0] as object)[0]),
    ).toEqual(['wal', 1, 5000]);
    db.close();
    const reopened = database(file);
    expect(await reopened.migrate(migrations)).toEqual([]);
    expect(
      await reopened.binding.prepare('SELECT id FROM tombstones').first('id'),
    ).toBe('PERSISTAAA');
  });

  test('applies the existing legacy product migration to stored fields and JSON patches', async () => {
    const directory = await temporary();
    await writeFile(
      join(directory, '0001_initial.sql'),
      await readFile(join(migrations, '0001_initial.sql')),
    );
    const db = database();
    await db.migrate(directory);
    await tomb(db, 'LEGACYAAAA');
    await db.binding
      .prepare(
        "UPDATE tombstones SET vendor='gemini',pending_patch=? WHERE id='LEGACYAAAA'",
      )
      .bind(
        JSON.stringify({ vendor: 'chatgpt', story: 'Original user content' }),
      )
      .run();
    await writeFile(
      join(directory, '0002_three_products.sql'),
      await readFile(join(migrations, '0002_three_products.sql')),
    );
    expect(await db.migrate(directory)).toEqual(['0002_three_products.sql']);
    expect(
      await db.binding
        .prepare('SELECT vendor,pending_patch FROM tombstones')
        .first(),
    ).toEqual({
      vendor: 'antigravity',
      pending_patch: '{"vendor":"codex","story":"Original user content"}',
    });
  });

  test('rolls back a failed migration and detects edits to applied files', async () => {
    const directory = await temporary();
    await writeFile(
      join(directory, '0001_test.sql'),
      'CREATE TABLE first_table(id TEXT);',
    );
    await writeFile(
      join(directory, '0002_bad.sql'),
      'CREATE TABLE rolled_back(id TEXT); INSERT INTO missing_table VALUES(1);',
    );
    const db = database();
    await expect(db.migrate(directory)).rejects.toThrow();
    expect(
      await db.binding
        .prepare("SELECT name FROM sqlite_master WHERE name='rolled_back'")
        .first(),
    ).toBeNull();
    expect(
      await db.binding
        .prepare('SELECT name FROM _haomeile_migrations ORDER BY name')
        .all(),
    ).toMatchObject({ results: [{ name: '0001_test.sql' }] });
    await writeFile(
      join(directory, '0002_bad.sql'),
      'CREATE TABLE second_table(id TEXT);',
    );
    expect(await db.migrate(directory)).toEqual(['0002_bad.sql']);
    await writeFile(
      join(directory, '0001_test.sql'),
      'CREATE TABLE changed(id TEXT);',
    );
    await expect(db.migrate(directory)).rejects.toThrow('missing or modified');
  });

  test('backs up committed WAL data into a private standalone SQLite snapshot', async () => {
    const directory = await temporary(),
      db = database(join(directory, 'active.sqlite'));
    await db.migrate(migrations);
    await tomb(db, 'BACKUPAAAA');
    const destination = join(directory, 'snapshots', 'before-update.sqlite');
    await db.backup(destination);
    expect((await stat(destination)).mode & 0o777).toBe(0o600);
    const snapshot = database(destination);
    expect(
      await snapshot.binding.prepare('SELECT id FROM tombstones').first('id'),
    ).toBe('BACKUPAAAA');
    await tomb(db, 'AFTERAAAAA');
    expect(
      await snapshot.binding
        .prepare('SELECT COUNT(*) count FROM tombstones')
        .first('count'),
    ).toBe(1);
    await expect(db.backup(join(directory, 'active.sqlite'))).rejects.toThrow(
      'active database',
    );
  });
});

import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync } from 'node:fs';
import {
  chmod,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type {
  D1Database,
  D1DatabaseSession,
  D1ExecResult,
  D1PreparedStatement,
  D1Result,
} from '@cloudflare/workers-types/index.ts';

type Row = Record<string, unknown>;
interface SqlMetadata {
  changes: number;
  last_row_id: number;
  total_changes: number;
}

function requireSingleStatement(sql: string): void {
  let quote = '',
    ended = false;
  for (let index = 0; index < sql.length; index++) {
    const character = sql[index],
      next = sql[index + 1];
    if (quote) {
      if (character === quote) {
        if (next === quote && quote !== ']') index++;
        else quote = '';
      }
      continue;
    }
    if (character === '-' && next === '-') {
      const lineEnd = sql.indexOf('\n', index + 2);
      index = lineEnd < 0 ? sql.length : lineEnd;
      continue;
    }
    if (character === '/' && next === '*') {
      const commentEnd = sql.indexOf('*/', index + 2);
      if (commentEnd < 0) throw new Error('Unterminated SQL comment');
      index = commentEnd + 1;
      continue;
    }
    if (/\s/.test(character)) continue;
    if (ended)
      throw new Error(
        'Use migrate() for SQL scripts or batch() for multiple statements',
      );
    if (character === ';') ended = true;
    else if (character === "'" || character === '"' || character === '`')
      quote = character;
    else if (character === '[') quote = ']';
  }
}

function bindingValue(value: unknown): SQLQueryBindings {
  if (value === null || typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value))
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (
    Array.isArray(value) &&
    value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
  )
    return Uint8Array.from(value);
  throw new TypeError('Unsupported database binding type');
}

class SqliteStatement implements D1PreparedStatement {
  constructor(
    readonly owner: SqliteBinding,
    readonly sql: string,
    readonly values: SQLQueryBindings[] = [],
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    // D1 bindings are immutable: reusing one prepared query must not overwrite
    // the parameters of statements already queued in a batch.
    return new SqliteStatement(this.owner, this.sql, values.map(bindingValue));
  }

  first<T = unknown>(column: string): Promise<T | null>;
  first<T = Row>(): Promise<T | null>;
  async first<T = Row>(column?: string): Promise<T | null> {
    const row = this.owner.sqlite
      .query(this.sql)
      .get(...this.values) as Row | null;
    if (!row) return null;
    if (column === undefined) return row as T;
    if (!Object.hasOwn(row, column))
      throw new Error('Requested database column does not exist');
    return row[column] as T;
  }

  execute<T>(rows: boolean): D1Result<T> {
    const started = performance.now();
    const before = this.owner.metadata().total_changes;
    const query = this.owner.sqlite.query(this.sql);
    const results = rows ? (query.all(...this.values) as T[]) : [];
    if (!rows) query.run(...this.values);
    const after = this.owner.metadata();
    const written = after.total_changes - before;
    return {
      success: true,
      results,
      meta: {
        duration: performance.now() - started,
        changes: written > 0 ? after.changes : 0,
        last_row_id: Number(after.last_row_id),
        changed_db: written > 0,
        rows_read: results.length,
        rows_written: written,
        // SQLite does not provide D1's storage accounting for an individual query.
        size_after: 0,
      },
    };
  }

  async run<T = Row>(): Promise<D1Result<T>> {
    return this.execute<T>(false);
  }

  async all<T = Row>(): Promise<D1Result<T>> {
    return this.execute<T>(true);
  }

  raw<T = unknown[]>(options: {
    columnNames: true;
  }): Promise<[string[], ...T[]]>;
  raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>;
  async raw<T = unknown[]>(options?: {
    columnNames?: boolean;
  }): Promise<T[] | [string[], ...T[]]> {
    const query = this.owner.sqlite.query(this.sql);
    const rows = query.values(...this.values) as T[];
    return options?.columnNames ? [query.columnNames, ...rows] : rows;
  }
}

class SqliteBinding implements D1Database {
  constructor(readonly sqlite: Database) {}

  metadata(): SqlMetadata {
    return this.sqlite
      .query(
        'SELECT changes() changes,last_insert_rowid() last_row_id,total_changes() total_changes',
      )
      .get() as SqlMetadata;
  }

  prepare(sql: string): D1PreparedStatement {
    return new SqliteStatement(this, sql);
  }

  async batch<T = unknown>(
    statements: D1PreparedStatement[],
  ): Promise<D1Result<T>[]> {
    // Do not await inside this transaction: Bun commits as soon as the callback
    // returns. In particular, changes() must observe the previous batch statement.
    return this.sqlite
      .transaction(() =>
        statements.map((statement) => {
          if (
            !(statement instanceof SqliteStatement) ||
            statement.owner !== this
          )
            throw new TypeError(
              'A database batch cannot contain foreign statements',
            );
          return statement.execute<T>(true);
        }),
      )
      .immediate();
  }

  async exec(sql: string): Promise<D1ExecResult> {
    // The application uses prepare/batch; this convenience method accepts a
    // single statement so its D1 execution count is unambiguous.
    requireSingleStatement(sql);
    const query = this.sqlite.prepare(sql);
    try {
      const started = performance.now();
      query.run();
      return { count: 1, duration: performance.now() - started };
    } finally {
      query.finalize();
    }
  }

  withSession(): D1DatabaseSession {
    // Every local request uses the same primary connection; no replica bookmark
    // is needed to provide sequential consistency.
    return {
      prepare: (sql) => this.prepare(sql),
      batch: <T = unknown>(statements: D1PreparedStatement[]) =>
        this.batch<T>(statements),
      getBookmark: () => null,
    };
  }

  async dump(): Promise<ArrayBuffer> {
    const bytes = this.sqlite.serialize();
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    return copy;
  }
}

export interface LocalDatabase {
  binding: D1Database;
  migrate(directory: string): Promise<string[]>;
  backup(destination: string): Promise<void>;
  close(): void;
}

export function openDatabase(path: string): LocalDatabase {
  if (!path) throw new Error('A database file path is required');
  const memory = path === ':memory:';
  const file = memory ? path : resolve(path);
  if (!memory) mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const sqlite = new Database(file, { create: true, strict: true });
  if (!memory) chmodSync(file, 0o600);
  sqlite.exec(
    'PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;',
  );
  const binding = new SqliteBinding(sqlite);

  return {
    binding,
    async migrate(directory) {
      const names = (await readdir(directory))
        .filter((name) => /^\d{4,}_[\w-]+\.sql$/.test(name))
        .sort();
      // File reads happen before opening any write transaction.
      const sources = await Promise.all(
        names.map(async (name) => {
          const sql = await readFile(resolve(directory, name), 'utf8');
          return {
            name,
            sql,
            checksum: createHash('sha256').update(sql).digest('hex'),
          };
        }),
      );
      sqlite.exec(
        'CREATE TABLE IF NOT EXISTS _haomeile_migrations (name TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at TEXT NOT NULL)',
      );
      const applied = sqlite
        .query('SELECT name,checksum FROM _haomeile_migrations')
        .all() as { name: string; checksum: string }[];
      const sourceByName = new Map(
        sources.map((source) => [source.name, source]),
      );
      for (const previous of applied) {
        if (sourceByName.get(previous.name)?.checksum !== previous.checksum)
          throw new Error(
            'Applied migration is missing or modified: ' + previous.name,
          );
      }
      const executed: string[] = [];
      for (const source of sources) {
        const changed = sqlite
          .transaction(() => {
            const existing = sqlite
              .query('SELECT checksum FROM _haomeile_migrations WHERE name=?')
              .get(source.name) as { checksum: string } | null;
            if (existing) {
              if (existing.checksum !== source.checksum)
                throw new Error(
                  'Applied migration is modified: ' + source.name,
                );
              return false;
            }
            sqlite.exec(source.sql);
            sqlite
              .query(
                'INSERT INTO _haomeile_migrations(name,checksum,applied_at) VALUES (?,?,?)',
              )
              .run(source.name, source.checksum, new Date().toISOString());
            return true;
          })
          .immediate();
        if (changed) executed.push(source.name);
      }
      return executed;
    },
    async backup(destination) {
      const target = resolve(destination);
      if (!memory && target === file)
        throw new Error('A backup cannot replace the active database');
      mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
      // serialize() includes committed WAL data and produces one consistent
      // snapshot; copying the main database file alone would miss recent writes.
      const snapshot = sqlite.serialize();
      const temporary = target + '.tmp-' + randomUUID();
      try {
        await writeFile(temporary, snapshot, { mode: 0o600, flag: 'wx' });
        await chmod(temporary, 0o600);
        await rename(temporary, target);
      } finally {
        await rm(temporary, { force: true });
      }
    },
    close() {
      sqlite.close(true);
    },
  };
}

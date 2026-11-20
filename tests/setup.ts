import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { beforeEach } from 'vitest';
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
beforeEach(async () => {
  await env.DB.batch(['reports', 'flowers', 'tombstones', 'rate_limits', 'audit_log'].map((table) => env.DB.prepare(`DELETE FROM ${table}`)));
});

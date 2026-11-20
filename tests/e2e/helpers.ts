import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

export const E2E_ORIGIN = 'http://127.0.0.1:8790';
export const E2E_STATE = resolve('.wrangler/e2e-state');
const E2E_CONFIG = resolve('.wrangler/e2e-config/wrangler.toml');

export function assertIsolatedOrigin(baseURL: string | undefined): void {
  if (baseURL !== E2E_ORIGIN)
    throw new Error(
      'These tests require their isolated local server on port 8790.',
    );
}

// Every mutation below targets Wrangler LOCAL storage in the E2E-only directory.
// SQL is an explicit moderation fixture, not an application/admin authentication bypass.
export function localSql(sql: string): Record<string, unknown>[] {
  const output = execFileSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'd1',
      'execute',
      'haomeile',
      '--local',
      '--persist-to',
      E2E_STATE,
      '--config',
      E2E_CONFIG,
      '--command',
      sql,
      '--json',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const batches = JSON.parse(output) as {
    results: Record<string, unknown>[];
  }[];
  return batches.flatMap((batch) => batch.results);
}
export function resetIsolatedDatabase(): void {
  localSql(
    'DELETE FROM reports; DELETE FROM flowers; DELETE FROM tombstones; DELETE FROM rate_limits; DELETE FROM audit_log;',
  );
}
export function moderateFixture(id: string, patch = false): void {
  if (!/^[A-Z2-7]{10}$/.test(id))
    throw new Error('Invalid local fixture identifier.');
  const fields = [
    'codename',
    'nickname',
    'vendor',
    'event_type',
    'plan',
    'born_at',
    'born_precision',
    'died_at',
    'story',
    'epitaph',
    'appeal_status',
    'card_style',
  ];
  const assignments = patch
    ? fields
        .map((field) => `${field}=json_extract(pending_patch,'$.${field}'),`)
        .join('')
    : '';
  localSql(
    `UPDATE tombstones SET ${assignments}status='approved',approved_at=COALESCE(approved_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),pending_patch=NULL,flags='[]' WHERE id='${id}' AND status!='withdrawn'${patch ? ' AND pending_patch IS NOT NULL' : " AND status='pending'"};`,
  );
}

// Only the external browser SDK is replaced. The browser calls the real local
// business API; that Worker validates Cloudflare's official dummy token against
// the real Siteverify endpoint using its official always-pass test secret.
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
export async function stubTurnstileSdk(page: Page): Promise<void> {
  await page.route(
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    async (route) => {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `
      (() => {
        const token = 'XXXX.DUMMY.TOKEN.XXXX';
        let options;
        window.turnstile = {
          render(container, configuration) {
            options = configuration;
            container.setAttribute('data-e2e-turnstile-ready', 'true');
            container.textContent = '本地端到端测试验证框';
            configuration.callback(token);
            return 'e2e-widget';
          },
          getResponse() { return token; },
          reset() { options?.callback(token); }
        };
      })();
    `,
      });
    },
  );
}

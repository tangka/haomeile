import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/worker';
import type { Bindings } from '../../src/worker/types';

const app = createApp({
  readRadarOverview: () => ({
    generatedAt: '2026-11-25T10:00:00.000Z',
    stale: false,
    platforms: [{ id: 'codex', name: 'Codex', probability: 37 }],
    history: [],
    resetEvents: [],
  }),
});

describe('radar data use', () => {
  it.each(['/feed.xml', '/en/feed.xml', '/llms-full.txt'])(
    'keeps forecast figures out of %s',
    async (path) => {
      const response = await app.request(
        'https://haomeile.rip' + path,
        {},
        env as unknown as Bindings,
      );
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).not.toContain('37%');
      expect(body).not.toContain('2026-11-25T10:00:00.000Z');
    },
  );
});

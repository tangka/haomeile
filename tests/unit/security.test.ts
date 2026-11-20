import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AppEnv, Bindings } from '../../src/worker/types';
import { security, handleError } from '../../src/worker/security';
import { readJson } from '../../src/worker/lib/json';

const app = new Hono<AppEnv>().use('*', security).onError(handleError);
app.post('/api/check', async (c) =>
  c.json({ ok: true, data: await readJson(c.req.raw) }),
);
app.get('/api/check', (c) => c.json({ ok: true }));
const env = {
  ENVIRONMENT: 'production',
  SITE_ORIGIN: 'https://haomeile.rip',
} as Bindings;
const post = (
  body: string,
  origin = 'https://haomeile.rip',
  contentType = 'application/json',
) =>
  app.request(
    'https://haomeile.rip/api/check',
    { method: 'POST', headers: { origin, 'content-type': contentType }, body },
    env,
  );
describe('request boundary', () => {
  it('keeps parsed body available to routes and sends safe headers', async () => {
    const response = await post('{"text":"碑文"}');
    expect(await response.json()).toEqual({ ok: true, data: { text: '碑文' } });
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-security-policy')).toContain(
      "frame-ancestors 'none'",
    );
    expect(response.headers.has('set-cookie')).toBe(false);
  });
  it('rejects foreign origin, non-JSON and malformed bodies', async () => {
    expect((await post('{}', 'https://example.invalid')).status).toBe(403);
    expect(
      (await post('{}', 'https://haomeile.rip', 'text/plain')).status,
    ).toBe(415);
    expect((await post('{')).status).toBe(400);
  });
  it('limits actual UTF-8 body size without relying on Content-Length', async () => {
    expect(
      (await post(JSON.stringify({ text: '字'.repeat(6000) }))).status,
    ).toBe(413);
  });
  it('does not expose errors or private payloads', async () => {
    const failing = new Hono<AppEnv>().use('*', security).onError(handleError);
    failing.get('/api/error', () => {
      throw new Error('private-secret');
    });
    const response = await failing.request(
      'https://haomeile.rip/api/error',
      {},
      env,
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('private-secret');
  });
});

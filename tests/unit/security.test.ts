import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AppEnv, Bindings } from '../../src/worker/types';
import { security, handleError } from '../../src/worker/security';
import { readJson } from '../../src/worker/lib/json';
import { app as site } from '../../src/worker';

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
  it('rejects ambiguous asset paths before they can expose a protected admin template', async () => {
    let assetRequests = 0;
    const bindings = {
      ...env,
      ASSETS: {
        async fetch() {
          assetRequests++;
          return new Response(
            '<html><body>private admin template</body></html>',
            {
              headers: { 'content-type': 'text/html' },
            },
          );
        },
      },
    } as unknown as Bindings;
    for (const path of [
      '/en//haomeile.rip/admin/',
      '//haomeile.rip/admin/',
      '/en//other.example/admin/',
      '/en//haomeile.rip/admin.html',
      '/en/admin//index.html',
      '/en/%2Fhaomeile.rip/admin/',
    ]) {
      const response = await site.request(
        'https://haomeile.rip' + path,
        {},
        bindings,
      );
      expect(response.status, path).toBe(404);
      expect(response.headers.get('cache-control'), path).toBe('no-store');
      expect(response.headers.get('x-robots-tag'), path).toBe(
        'noindex, nofollow',
      );
      expect(await response.json(), path).toMatchObject({
        ok: false,
        error: { code: 'NOT_FOUND' },
      });
    }
    expect(assetRequests).toBe(0);
  });
  it('keeps unambiguous Chinese and English admin aliases behind Access verification', async () => {
    for (const path of [
      '/admin',
      '/admin/',
      '/admin.html',
      '/admin/index.html',
      '/en/admin',
      '/en/admin/',
      '/en/admin.html',
      '/en/admin/index.html',
      '/en/api/admin/queue',
    ]) {
      const response = await site.request(
        'https://haomeile.rip' + path,
        {},
        env,
      );
      expect(response.status, path).toBe(403);
      expect(response.headers.get('cache-control'), path).toBe('no-store');
      expect(await response.json(), path).toMatchObject({
        ok: false,
        error: { code: 'FORBIDDEN' },
      });
    }
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

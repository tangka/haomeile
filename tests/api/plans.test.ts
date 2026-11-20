import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publicRoutes } from '../../src/worker/routes/public';
import { createCredentials } from '../../src/worker/lib/crypto';
import type { Bindings } from '../../src/worker/types';

const bindings = env as unknown as Bindings;
const input = {
  codename: '套餐档位测试示例',
  vendor: 'claude',
  event_type: 'verification',
  died_at: '2026-11-18',
  story: '这是仅供隔离数据库使用的套餐档位测试示例。',
  consent: true,
  turnstile_token: 'test-only-token',
};
function request(path: string, body?: unknown) {
  return publicRoutes.request(
    path,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'content-type': 'application/json',
        'CF-Connecting-IP': '203.0.113.32',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    bindings,
  );
}
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    Response.json({ success: true, hostname: 'haomeile.rip' }),
  );
});
afterEach(() => vi.restoreAllMocks());

describe('named account plans', () => {
  it('stores the actual Plus, Max and Ultra selections without generic relabelling', async () => {
    for (const [vendor, plan] of [
      ['codex', 'plus'],
      ['claude', 'max'],
      ['antigravity', 'ultra'],
    ]) {
      expect(
        (await request('/tombstones', { ...input, vendor, plan })).status,
      ).toBe(201);
    }
    const result = await env.DB.prepare(
      'SELECT vendor,plan FROM tombstones ORDER BY vendor',
    ).all();
    expect(result.results).toEqual([
      { vendor: 'antigravity', plan: 'ultra' },
      { vendor: 'claude', plan: 'max' },
      { vendor: 'codex', plan: 'plus' },
    ]);
  });
  it('rejects cross-product tiers and generic former classifications before storing a submission', async () => {
    for (const [vendor, plan] of [
      ['claude', 'plus'],
      ['codex', 'ultra'],
      ['antigravity', 'max'],
      ['codex', 'paid_personal'],
      ['claude', 'paid_team'],
      ['antigravity', 'api'],
    ]) {
      const response = await request('/tombstones', { ...input, vendor, plan });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { fields: { plan: expect.any(String) } },
      });
    }
    expect(
      await env.DB.prepare('SELECT COUNT(*) n FROM tombstones').first('n'),
    ).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('preserves a historical generic plan until an owner explicitly chooses a reviewed replacement', async () => {
    const credential = await createCredentials(bindings.PEPPER);
    const now = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO tombstones (id,secret_hash,codename,vendor,event_type,plan,died_at,story,status,created_at,updated_at,approved_at) VALUES (?,?,'旧套餐测试示例','codex','verification','paid_personal','2026-11-18','这是用于验证旧套餐信息不会被伪造映射的测试示例。','approved',?,?,?)",
    )
      .bind(credential.id, credential.secret_hash, now, now, now)
      .run();
    const owner = { id: credential.id, secret: credential.secret };
    expect(await (await request('/manage/status', owner)).json()).toMatchObject(
      { data: { plan: 'paid_personal' } },
    );
    const invalid = await request('/manage/patch', {
      ...owner,
      patch: { ...input, vendor: 'codex', plan: 'paid_personal' },
    });
    expect(invalid.status).toBe(400);
    expect(
      (
        await request('/manage/patch', {
          ...owner,
          patch: { ...input, vendor: 'codex', plan: 'pro' },
        })
      ).status,
    ).toBe(200);
    expect(
      await (await request('/tombstones/' + credential.id)).json(),
    ).toMatchObject({ data: { plan: 'paid_personal' } });
    expect(await (await request('/manage/status', owner)).json()).toMatchObject(
      { data: { plan: 'paid_personal', pending_patch: { plan: 'pro' } } },
    );
  });
});

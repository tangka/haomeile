import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { publicRoutes } from '../../src/worker/routes/public';
import { createCredentials } from '../../src/worker/lib/crypto';
import { getStats } from '../../src/worker/lib/store';
import type { Bindings, TombInput, TombstoneRow } from '../../src/worker/types';

const input: TombInput = {
  codename: '并发测试示例',
  nickname: '',
  vendor: 'codex',
  event_type: 'verification',
  plan: 'unknown',
  born_at: null,
  born_precision: 'none',
  died_at: '2026-11-18',
  story: '这是用于验证撤回期间并发请求的示例内容。',
  epitaph: '',
  appeal_status: 'none',
  card_style: 'flower',
  consent: true,
};
async function seed(): Promise<{ id: string; secret: string }> {
  const credential = await createCredentials(env.PEPPER),
    now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO tombstones (id,secret_hash,codename,vendor,event_type,died_at,story,status,created_at,updated_at,approved_at) VALUES (?,?,?,'codex','verification',?,?,'approved',?,?,?)",
  )
    .bind(
      credential.id,
      credential.secret_hash,
      input.codename,
      input.died_at,
      input.story,
      now,
      now,
      now,
    )
    .run();
  return credential;
}
async function post(path: string, body: unknown): Promise<Response> {
  return publicRoutes.request(
    path,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'CF-Connecting-IP': '203.0.113.99',
      },
      body: JSON.stringify(body),
    },
    env as unknown as Bindings,
  );
}
async function expectPurged(id: string): Promise<void> {
  const row = await env.DB.prepare('SELECT * FROM tombstones WHERE id=?')
    .bind(id)
    .first<TombstoneRow>();
  expect(row).toMatchObject({
    status: 'withdrawn',
    secret_hash: '',
    codename: null,
    nickname: null,
    story: null,
    epitaph: null,
    flags: null,
    pending_patch: null,
    flowers: 0,
  });
  expect((await getStats(env.DB)).total).toBe(0);
}
describe('withdrawal under concurrent public mutations', () => {
  it('cannot be repopulated by edits whose credential lookup overlaps withdrawal', async () => {
    const credential = await seed();
    const responses = await Promise.all([
      post('/manage/withdraw', credential),
      ...Array.from({ length: 5 }, () =>
        post('/manage/patch', {
          ...credential,
          patch: { ...input, codename: '并发修改测试示例' },
        }),
      ),
    ]);
    expect(responses[0]!.status).toBe(200);
    for (const response of responses.slice(1))
      expect([200, 403, 404]).toContain(response.status);
    await expectPurged(credential.id);
  });
  it('cannot regain counters or visitor records from overlapping flower requests', async () => {
    const credential = await seed();
    const responses = await Promise.all([
      post('/manage/withdraw', credential),
      ...Array.from({ length: 5 }, () =>
        post('/tombstones/' + credential.id + '/flower', {
          visitor_id: crypto.randomUUID(),
        }),
      ),
    ]);
    expect(responses[0]!.status).toBe(200);
    for (const response of responses.slice(1))
      expect([200, 404]).toContain(response.status);
    await expectPurged(credential.id);
    expect(
      await env.DB.prepare(
        'SELECT COUNT(*) n FROM flowers WHERE tombstone_id=?',
      )
        .bind(credential.id)
        .first('n'),
    ).toBe(0);
  });
});

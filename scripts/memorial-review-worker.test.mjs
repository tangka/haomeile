import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { reviewer } from './memorial-review-worker.mjs';

const item = {
  id: 'ABCDEFGHIJ',
  origin: 'submission',
  review_version: 'a'.repeat(64),
  codename: 'test',
  story: 'example',
  flags: [],
};
function fixture(decision = 'approve') {
  const db = new DatabaseSync(':memory:');
  let now = 0;
  const writes = [],
    cards = [],
    edits = [];
  let verdicts = 0;
  const api = {
    queue: async (kind) => (kind === 'new' ? [item] : []),
    decide: async (_job, action, who) => writes.push([action, who]),
  };
  const transport = {
    sendCard: async (card) => {
      cards.push(card);
      return 'om_test';
    },
    updateCard: async (_id, card) => edits.push(card),
  };
  const make = () =>
    reviewer({
      db,
      admin: api,
      transport,
      now: () => now,
      judge: async () => {
        verdicts++;
        return { decision, reason: 'test' };
      },
    });
  return {
    db,
    api,
    transport,
    writes,
    cards,
    edits,
    make,
    tick: () => {
      now += 60000;
    },
    verdicts: () => verdicts,
  };
}

test('applies before notifying and a replay across restarts never overrides a human', async () => {
  const f = fixture();
  const worker = f.make();
  await worker.collect();
  await worker.drain();
  await worker.collect();
  await worker.drain();
  assert.deepEqual(f.writes, [['approve', 'ai']]);
  assert.equal(f.cards.length, 1);
  assert.equal(f.verdicts(), 1);
  assert.equal(f.db.prepare('SELECT item FROM jobs').get().item, '{}');
  const { token } = worker.lookup('om_test');
  const click = { messageId: 'om_test', token, action: 'reject' };
  worker.onAction({ ...click, token: 'incorrect' });
  assert.ok(worker.lookup('om_test'));
  worker.onAction(click);
  worker.onAction(click);
  const resumed = f.make();
  await resumed.drain();
  resumed.onAction(click);
  await resumed.drain();
  assert.deepEqual(f.writes, [
    ['approve', 'ai'],
    ['reject', 'human'],
  ]);
  assert.equal(f.edits[0].status, 'rejected');
  assert.equal(f.edits[0].final, true);
});

test('retains the original send token after temporary delivery failure', async () => {
  const f = fixture('reject');
  const worker = f.make();
  const tokens = [];
  f.transport.sendCard = async (_card, token) => {
    tokens.push(token);
    if (tokens.length === 1) throw Error('offline');
    return 'om_test';
  };
  await worker.collect();
  await worker.drain();
  f.tick();
  await f.make().drain();
  assert.equal(f.verdicts(), 1);
  assert.equal(tokens.length, 2);
  assert.equal(tokens[0], tokens[1]);
  assert.deepEqual(f.writes, [['reject', 'ai']]);
});

test('waits for a human when uncertain; a withdrawn item stays withdrawn', async () => {
  const f = fixture('needs_review');
  const worker = f.make();
  await worker.collect();
  await worker.drain();
  assert.deepEqual(f.writes, []);
  const { token } = worker.lookup('om_test');
  worker.onAction({ messageId: 'om_test', token, action: 'approve' });
  f.api.decide = async () => {
    throw Object.assign(Error(), { status: 404 });
  };
  await worker.drain();
  assert.equal(f.edits[0].final, true);
  assert.match(f.edits[0].reason, /失效/);
});

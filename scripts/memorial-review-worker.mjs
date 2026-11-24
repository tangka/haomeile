import { randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as sleep } from 'node:timers/promises';
import { judgeMemorial } from './judge-memorial.mjs';
import { createFeishuTransport } from './feishu-review-transport.mjs';

const site = 'https://haomeile.rip';
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
const values = (row) =>
  Object.fromEntries(fields.filter((k) => k in row).map((k) => [k, row[k]]));
const statuses = {
  approve: 'approved',
  reject: 'rejected',
  needs_review: 'needs_review',
};
const safeError = (e) =>
  e.status
    ? 'HTTP ' + e.status
    : e.code === 'AUTH'
      ? 'credentials unavailable'
      : 'operation failed';

function adminClient(path) {
  async function request(route, body) {
    const file = readFileSync(path, 'utf8');
    const user = /^用户名：(.+)$/m.exec(file)?.[1]?.trim();
    const password = /^密码：(.+)$/m.exec(file)?.[1]?.trim();
    if (!user || !password) throw Object.assign(new Error(), { code: 'AUTH' });
    const response = await fetch(new URL('/api/admin/' + route, site), {
      redirect: 'error',
      method: body ? 'POST' : 'GET',
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization:
          'Basic ' + Buffer.from(user + ':' + password).toString('base64'),
        ...(body && { Origin: site, 'Content-Type': 'application/json' }),
      },
      body: body && JSON.stringify(body),
    });
    if (!response.ok)
      throw Object.assign(new Error(), { status: response.status });
    const value = await response.json();
    if (!value.ok) throw new Error('Invalid response');
    return value.data;
  }
  return {
    queue: async (kind) => (await request('queue?type=' + kind)).items,
    decide: (job, action, reviewer) =>
      request('review/' + job.id + '/' + job.kind + '/' + action, {
        expected_review_version: job.version,
        reviewer,
      }),
  };
}

export function reviewer({
  db,
  admin,
  transport,
  judge = judgeMemorial,
  now = Date.now,
}) {
  db.exec(`PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS jobs (
      token TEXT PRIMARY KEY, id TEXT NOT NULL, kind TEXT NOT NULL, version TEXT NOT NULL,
      item TEXT NOT NULL, step TEXT NOT NULL, decision TEXT, reason TEXT, message TEXT UNIQUE,
      requested TEXT, retry INTEGER NOT NULL DEFAULT 0, failures INTEGER NOT NULL DEFAULT 0,
      UNIQUE(id, kind, version));`);
  const write = (sql, ...args) => db.prepare(sql).run(...args);
  function card(job, final = false) {
    const row = JSON.parse(job.item);
    const item = job.kind === 'patch' ? { ...row, ...row.pending_patch } : row;
    return {
      token: job.token,
      status: job.decision === 'expired' ? 'expired' : statuses[job.decision],
      final,
      title: job.kind === 'patch' ? '纪念墙 · 投稿修改' : '纪念墙 · 新投稿',
      summary:
        !final && !job.reason?.includes('隐私信息')
          ? ['投稿编号 ' + job.id, item.codename, item.story, item.epitaph]
              .filter(Boolean)
              .join('\n')
          : '投稿编号 ' + job.id,
      reason: job.reason,
    };
  }
  async function collect() {
    for (const kind of ['new', 'patch']) {
      for (const row of await admin.queue(kind)) {
        if (row.origin !== 'submission' || !/^[A-Z2-7]{10}$/.test(row.id))
          continue;
        if (!/^[a-f0-9]{64}$/.test(row.review_version))
          throw new Error('Review API requires an update');
        const submission = {
          kind,
          ...values(row),
          flags: row.flags || [],
          pending_patch: row.pending_patch ? values(row.pending_patch) : null,
        };
        write(
          `INSERT OR IGNORE INTO jobs(token,id,kind,version,item,step) VALUES(?,?,?,?,?,'judge')`,
          randomUUID(),
          row.id,
          kind,
          row.review_version,
          JSON.stringify(submission),
        );
      }
    }
  }
  function lookup(messageId) {
    const job = db
      .prepare("SELECT * FROM jobs WHERE message=? AND step='sent'")
      .get(messageId);
    return job ? { token: job.token, status: statuses[job.decision] } : null;
  }
  function onAction({ messageId, token, action }) {
    if (!['keep', 'approve', 'reject'].includes(action)) return;
    write(
      "UPDATE jobs SET requested=?, step='human', retry=0, failures=0 WHERE token=? AND message=? AND step='sent'",
      action,
      token,
      messageId,
    );
  }
  const advance = (job, step) =>
    write(
      'UPDATE jobs SET step=?, retry=0, failures=0 WHERE token=?',
      step,
      job.token,
    );
  async function processJob(job) {
    switch (job.step) {
      case 'judge': {
        const result = await judge(JSON.parse(job.item));
        if (!Object.hasOwn(statuses, result.decision) || !result.reason?.trim())
          throw new Error('Invalid decision');
        write(
          'UPDATE jobs SET decision=?, reason=?, step=?, retry=0, failures=0 WHERE token=?',
          result.decision,
          result.reason.slice(0, 400),
          result.decision === 'needs_review' ? 'send' : 'ai',
          job.token,
        );
        break;
      }
      case 'ai':
        await admin.decide(job, job.decision, 'ai');
        advance(job, 'send');
        break;
      case 'send': {
        const message = await transport.sendCard(card(job), job.token);
        if (!message) throw new Error('Missing Feishu receipt');
        write(
          "UPDATE jobs SET step='sent',item='{}',message=?,retry=0,failures=0 WHERE token=?",
          message,
          job.token,
        );
        break;
      }
      case 'human': {
        const action = job.requested === 'keep' ? job.decision : job.requested;
        if (!['approve', 'reject'].includes(action))
          throw new Error('Choose a decision');
        await admin.decide(job, action, 'human');
        write(
          "UPDATE jobs SET decision=?,reason=?,step='edit',retry=0,failures=0 WHERE token=?",
          action,
          job.requested === 'keep' ? '站长已确认原判断。' : '站长已改判。',
          job.token,
        );
        break;
      }
      case 'edit':
        await transport.updateCard(job.message, card(job, true));
        advance(job, 'done');
        break;
    }
  }
  async function drain() {
    for (;;) {
      const job = db
        .prepare(
          "SELECT * FROM jobs WHERE step IN ('judge','ai','send','human','edit') AND retry<=? ORDER BY CASE step WHEN 'human' THEN 0 WHEN 'edit' THEN 1 WHEN 'send' THEN 2 ELSE 3 END,rowid LIMIT 1",
        )
        .get(now());
      if (!job) return;
      try {
        await processJob(job);
      } catch (error) {
        if (
          ['human', 'ai'].includes(job.step) &&
          [404, 409].includes(error.status)
        ) {
          write(
            "UPDATE jobs SET step=?,decision='expired',item='{}',reason=?,retry=0,failures=0 WHERE token=?",
            job.message ? 'edit' : 'stale',
            '这份投稿已更改、撤回或另行处理，原操作已失效。',
            job.token,
          );
        } else {
          const delay = Math.min(3600, 15 * 2 ** Math.min(8, job.failures));
          write(
            'UPDATE jobs SET retry=?,failures=failures+1 WHERE token=?',
            now() + delay * 1000,
            job.token,
          );
          console.error(
            'review',
            job.step,
            safeError(error),
            'retry in',
            delay,
            's',
          );
        }
      }
    }
  }
  return { collect, drain, lookup, onAction };
}

async function main() {
  process.umask(0o077);
  const dir =
    process.env.HAOMEILE_REVIEW_STATE ||
    join(homedir(), 'Library/Application Support/haomeile-review');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(dir, 'review.sqlite'));
  const config = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));
  const transport = createFeishuTransport(config.feishu);
  const worker = reviewer({
    db,
    admin: adminClient(config.credentialsPath),
    transport,
  });
  const stop = new AbortController();
  for (const signal of ['SIGTERM', 'SIGINT'])
    process.once(signal, () => stop.abort());
  const callbacks = (async () => {
    while (!stop.signal.aborted) {
      try {
        await transport.consume({
          lookup: worker.lookup,
          onAction: worker.onAction,
          signal: stop.signal,
          onReady: () => console.log('Feishu review callbacks ready'),
        });
      } catch (e) {
        if (!stop.signal.aborted)
          console.error('Feishu listener', safeError(e));
      }
      if (!stop.signal.aborted) await sleep(3000);
    }
  })();
  while (!stop.signal.aborted) {
    try {
      await worker.collect();
    } catch (e) {
      console.error('queue', safeError(e));
    }
    await worker.drain();
    // Button clicks wake on the next short tick; new submissions are read every 20 seconds.
    for (let n = 0; n < 10 && !stop.signal.aborted; n++) {
      await sleep(2000);
      if (!stop.signal.aborted) await worker.drain();
    }
  }
  await callbacks;
  db.close();
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch((e) => {
    console.error('review worker stopped:', safeError(e));
    process.exitCode = 1;
  });

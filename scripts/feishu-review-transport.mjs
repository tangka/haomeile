import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';

const SCOPE = 'haomeile.moderation.v1';
const VALID_MESSAGE = /^om_[a-zA-Z0-9_-]+$/;
const VALID_TOKEN = /^[a-zA-Z0-9_-]{12,128}$/;
const choices = {
  expired: {},
  approved: { keep: '保留通过', reject: '改为不通过' },
  rejected: { keep: '保留不通过', approve: '改为通过' },
  needs_review: { approve: '通过', reject: '不通过' },
};
const labels = {
  expired: '原审核已失效',
  approved: '已通过',
  rejected: '未通过',
  needs_review: '待你审核',
};
const plain = (content) => ({ tag: 'plain_text', content });

export function resultCard({
  token,
  status,
  title,
  summary,
  reason,
  final = false,
}) {
  if (
    typeof token !== 'string' ||
    !VALID_TOKEN.test(token) ||
    typeof status !== 'string' ||
    !Object.hasOwn(choices, status)
  )
    throw new Error('Invalid moderation card');
  const text = [title, summary, reason].filter(Boolean);
  const elements = text.map((line) => ({
    tag: 'div',
    text: plain(String(line)),
  }));
  if (!final) {
    for (const [action, label] of Object.entries(choices[status]))
      elements.push({
        tag: 'button',
        text: plain(label),
        type: action === 'reject' ? 'danger' : 'primary',
        behaviors: [
          { type: 'callback', value: { scope: SCOPE, token, status, action } },
        ],
      });
  }
  return {
    schema: '2.0',
    config: { enable_forward: false, update_multi: true },
    header: { title: plain('号没了 · ' + labels[status]) },
    body: { elements },
  };
}

// lark-cli emits only callbacks for the authenticated app on this profile's event bus.
// Bind each result to the server-side message, moderator, and version sent in that card.
export async function authorizedAction(event, reviewerOpenId, lookup) {
  if (
    event?.type !== 'card.action.trigger' ||
    event.host !== 'im_message' ||
    event.action_tag !== 'button' ||
    event.operator_id !== reviewerOpenId ||
    !VALID_MESSAGE.test(event.message_id) ||
    typeof event.event_id !== 'string' ||
    !event.event_id ||
    event.event_id.length > 128
  )
    return;
  let value;
  try {
    value = JSON.parse(event.action_value);
  } catch {
    return;
  }
  if (
    value?.scope !== SCOPE ||
    typeof value.token !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.action !== 'string' ||
    !VALID_TOKEN.test(value.token) ||
    !Object.hasOwn(choices, value.status) ||
    !Object.hasOwn(choices[value.status], value.action)
  )
    return;
  const sent = await lookup(event.message_id);
  if (
    !sent ||
    sent.final ||
    sent.token !== value.token ||
    sent.status !== value.status
  )
    return;
  return {
    eventId: event.event_id,
    messageId: event.message_id,
    token: value.token,
    action: value.action,
  };
}

function runCli(cli, args, body) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      cli,
      args,
      { timeout: 30_000, maxBuffer: 1024 * 1024 },
      (error, stdout) => {
        // The CLI can echo request data in its errors. Never include it in logs.
        if (error)
          return reject(
            new Error('Feishu CLI request failed (' + error.code + ')'),
          );
        try {
          const response = JSON.parse(stdout);
          if (
            response.ok === false ||
            (response.code != null && response.code !== 0)
          )
            throw new Error();
          resolve(response);
        } catch {
          reject(
            new Error('Feishu returned an unsuccessful or unreadable response'),
          );
        }
      },
    );
    child.stdin.on('error', () => {});
    child.stdin.end(body == null ? undefined : JSON.stringify(body));
  });
}

export function createFeishuTransport({
  profile,
  appId,
  reviewerOpenId,
  cli = 'lark-cli',
}) {
  if (
    !profile ||
    !/^cli_[A-Za-z0-9]+$/.test(appId) ||
    !/^ou_[A-Za-z0-9]+$/.test(reviewerOpenId)
  )
    throw new Error(
      'A pinned Feishu profile, application and moderator are required',
    );
  const args = ['--profile', profile];
  const verifyApp = async () => {
    const identity = await runCli(cli, [...args, 'auth', 'status', '--json']);
    if (identity.appId !== appId || identity.brand !== 'feishu')
      throw new Error('Feishu application identity mismatch');
  };
  const endpoint = '/open-apis/im/v1/messages';
  return {
    async sendCard(data, idempotencyKey) {
      if (
        typeof idempotencyKey !== 'string' ||
        !/^[A-Za-z0-9_-]{1,50}$/.test(idempotencyKey)
      )
        throw new Error('Missing stable Feishu message idempotency key');
      await verifyApp();
      const reply = await runCli(
        cli,
        [
          ...args,
          'api',
          'POST',
          endpoint,
          '--as',
          'bot',
          '--params',
          '{"receive_id_type":"open_id"}',
          '--data',
          '-',
        ],
        {
          receive_id: reviewerOpenId,
          msg_type: 'interactive',
          content: JSON.stringify(resultCard(data)),
          uuid: idempotencyKey,
        },
      );
      const messageId = reply.data?.message_id;
      if (!VALID_MESSAGE.test(messageId))
        throw new Error('Missing Feishu message receipt');
      return messageId;
    },
    async updateCard(messageId, data) {
      if (!VALID_MESSAGE.test(messageId))
        throw new Error('Invalid Feishu message ID');
      await verifyApp();
      await runCli(
        cli,
        [
          ...args,
          'api',
          'PATCH',
          endpoint + '/' + messageId,
          '--as',
          'bot',
          '--data',
          '-',
        ],
        { content: JSON.stringify(resultCard(data)) },
      );
    },
    async consume({ lookup, onAction, signal, onReady }) {
      await verifyApp();
      if (signal?.aborted) return;
      // A live stdin keeps the event-bus consumer attached. It shares the CLI bus.
      const child = spawn(
        cli,
        [...args, 'event', 'consume', 'card.action.trigger', '--as', 'bot'],
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );
      const errors = createInterface({ input: child.stderr });
      errors.on('line', (line) => {
        if (line.includes('[event] ready event_key=card.action.trigger'))
          onReady?.();
      });
      const finished = once(child, 'close');
      finished.catch(() => {}); // Spawn failures may arrive before stdout ends.
      const close = () => child.kill('SIGTERM');
      signal?.addEventListener('abort', close, { once: true });
      try {
        for await (const line of createInterface({ input: child.stdout })) {
          if (!line.trim()) continue;
          const action = await authorizedAction(
            JSON.parse(line),
            reviewerOpenId,
            lookup,
          );
          if (action) await onAction(action);
        }
        const [code] = await finished;
        if (!signal?.aborted)
          throw new Error('Feishu event consumer exited (' + code + ')');
      } finally {
        signal?.removeEventListener('abort', close);
        child.stdin.end();
        errors.close();
        close();
      }
    },
  };
}

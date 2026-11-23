import { readFile } from 'node:fs/promises';

const credentials = new URL(
  '../artifacts/private/haomeile-admin.txt',
  import.meta.url,
);
const lines = (await readFile(credentials, 'utf8')).split(/\r?\n/);
const get = (label) =>
  lines
    .find((line) => line.startsWith(label))
    ?.slice(label.length)
    .trim();
const username = get('用户名：');
const password = get('密码：');
if (!username || !password)
  throw new Error('Missing local administrator credentials');
const response = await fetch(
  'https://haomeile.rip/api/admin/radar/email-capacity',
  {
    headers: {
      Authorization:
        'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
    },
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  },
);
if (!response.ok)
  throw new Error('Capacity report returned HTTP ' + response.status);
const { data } = await response.json();
if (!Array.isArray(data?.providers) || !Array.isArray(data.alerts))
  throw new Error('Invalid capacity report');
console.log(JSON.stringify(data));

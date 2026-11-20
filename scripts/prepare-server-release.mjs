import { mkdir, cp, readFile, writeFile, chmod } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { resolve, join } from 'node:path';

const origin = 'https://haomeile.rip';
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const timestamp = new Date().toISOString();
const version = timestamp.replace(/[^0-9]/g, '').slice(0, 14) + '-' + revision;
const release = resolve('artifacts/releases', version);
const privateRoot = resolve('artifacts/private');
await mkdir(release, { recursive: true });
await mkdir(privateRoot, { recursive: true, mode: 0o700 });
await cp('dist', join(release, 'dist'), { recursive: true });
await cp('migrations', join(release, 'migrations'), { recursive: true });
await cp('ops', join(release, 'ops'), { recursive: true });
await cp(
  'artifacts/haomeile-server-linux-x64',
  join(release, 'haomeile-server'),
);
await chmod(join(release, 'haomeile-server'), 0o755);
await writeFile(
  join(release, 'release.json'),
  JSON.stringify(
    {
      version,
      revision,
      builtAt: timestamp,
      siteOrigin: origin,
      runtime: 'Bun 1.4.5 compiled Linux x64 baseline',
    },
    null,
    2,
  ) + '\n',
);
const configFile = join(privateRoot, 'haomeile.env');
let existing = '';
try {
  existing = await readFile(configFile, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (!existing) {
  const local = await readFile('.dev.vars', 'utf8');
  const value = (key) => {
    const match = new RegExp('^' + key + '="([^"\\r\\n]+)"', 'm').exec(local);
    if (!match) throw new Error('Missing real Turnstile configuration');
    return match[1];
  };
  const pepper = randomBytes(32).toString('hex'),
    password = randomBytes(32).toString('base64url');
  const values = {
    ENVIRONMENT: 'production',
    SITE_ORIGIN: origin,
    PORT: '8788',
    DATA_DIR: '/var/lib/haomeile',
    BACKUP_DIR: '/var/backups/haomeile',
    ASSET_ROOT: '/opt/haomeile/current/dist',
    MIGRATIONS_ROOT: '/opt/haomeile/current/migrations',
    PEPPER: pepper,
    TURNSTILE_TEST_MODE: 'false',
    TURNSTILE_SITE_KEY: value('TURNSTILE_SITE_KEY'),
    TURNSTILE_SECRET: value('TURNSTILE_SECRET'),
    ADMIN_AUTH_MODE: 'basic',
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD_HASH: createHash('sha256')
      .update(pepper + password)
      .digest('hex'),
  };
  existing =
    Object.entries(values)
      .map(([key, value]) => key + '=' + JSON.stringify(value))
      .join('\n') + '\n';
  await writeFile(configFile, existing, { mode: 0o600, flag: 'wx' });
  await writeFile(
    join(privateRoot, 'haomeile-admin.txt'),
    `管理页面：${origin}/admin\n用户名：admin\n密码：${password}\n请保存在密码管理器中；不要公开或提交到Git。\n`,
    { mode: 0o600, flag: 'wx' },
  );
}
const configured =
  existing
    .replace(/^APP_VERSION=.*\n?/gm, '')
    .replace(/^BUILD_TIMESTAMP=.*\n?/gm, '') +
  'APP_VERSION=' +
  JSON.stringify(version) +
  '\nBUILD_TIMESTAMP=' +
  JSON.stringify(timestamp) +
  '\n';
await writeFile(configFile, configured, { mode: 0o600 });
await chmod(configFile, 0o600);
const tar = resolve('artifacts/releases', version + '.tar.gz');
execFileSync('tar', ['-czf', tar, '-C', release, '.']);
console.log(
  JSON.stringify({
    version,
    release,
    archive: tar,
    privateConfiguration: configFile,
    privateAdministratorFile: join(privateRoot, 'haomeile-admin.txt'),
  }),
);

import {
  chmod,
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { resolve, join } from 'node:path';

const releasesRoot = resolve('artifacts/releases');
const staging = join(releasesRoot, '.preparing');
const releaseName = /^\d{14}-[a-f0-9]{7,40}$/;
const archiveSuffix = '.tar.gz';

async function releaseFiles() {
  return (await readdir(releasesRoot, { withFileTypes: true })).flatMap(
    (entry) => {
      const isArchive = entry.isFile() && entry.name.endsWith(archiveSuffix);
      const version = isArchive
        ? entry.name.slice(0, -archiveSuffix.length)
        : entry.name;
      return (entry.isDirectory() || isArchive) && releaseName.test(version)
        ? [{ entry, version, isArchive }]
        : [];
    },
  );
}

async function pruneReleases(keep, files) {
  for (const { entry, version } of files) {
    if (version !== keep) {
      await rm(join(releasesRoot, entry.name), {
        recursive: entry.isDirectory(),
        force: true,
      });
    }
  }
}

async function pruneExistingReleases() {
  const files = await releaseFiles();
  const archives = new Set(
    files.filter(({ isArchive }) => isArchive).map(({ version }) => version),
  );
  const newest = files
    .filter(
      ({ entry, version }) => entry.isDirectory() && archives.has(version),
    )
    .map(({ version }) => version)
    .sort()
    .at(-1);
  if (!newest) throw new Error('No complete local release to keep');
  await pruneReleases(newest, files);
  console.log(JSON.stringify({ version: newest }));
}

async function privateConfiguration(configFile, privateRoot, origin) {
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
  return existing;
}

async function prepareRelease() {
  const origin = 'https://haomeile.rip';
  const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  const timestamp = new Date().toISOString();
  const version =
    timestamp.replace(/[^0-9]/g, '').slice(0, 14) + '-' + revision;
  const release = join(releasesRoot, version);
  const archive = release + '.tar.gz';
  const stagedRelease = join(staging, version);
  const stagedArchive = stagedRelease + '.tar.gz';
  const privateRoot = resolve('artifacts/private');
  await mkdir(stagedRelease);
  await mkdir(privateRoot, { recursive: true, mode: 0o700 });
  await cp('dist', join(stagedRelease, 'dist'), { recursive: true });
  await cp('migrations', join(stagedRelease, 'migrations'), {
    recursive: true,
  });
  await cp('ops', join(stagedRelease, 'ops'), { recursive: true });
  await cp(
    'artifacts/haomeile-server-linux-x64',
    join(stagedRelease, 'haomeile-server'),
  );
  await chmod(join(stagedRelease, 'haomeile-server'), 0o755);
  await writeFile(
    join(stagedRelease, 'release.json'),
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
  // A machine that only updates an already configured server needs no secrets.
  const configFile = join(privateRoot, 'haomeile.env');
  let configured = '';
  if (!process.argv.includes('--server-configured'))
    configured = await privateConfiguration(configFile, privateRoot, origin);
  // Without this, macOS adds a "._" companion for every file, even migrations.
  execFileSync('tar', ['-czf', stagedArchive, '-C', stagedRelease, '.'], {
    env: { ...process.env, COPYFILE_DISABLE: '1' },
  });
  await rename(stagedRelease, release);
  try {
    await rename(stagedArchive, archive);
  } catch (error) {
    await rm(release, { recursive: true });
    throw error;
  }
  if (configured) {
    const labelled =
      configured
        .replace(/^APP_VERSION=.*\n?/gm, '')
        .replace(/^BUILD_TIMESTAMP=.*\n?/gm, '') +
      'APP_VERSION=' +
      JSON.stringify(version) +
      '\nBUILD_TIMESTAMP=' +
      JSON.stringify(timestamp) +
      '\n';
    await writeFile(configFile, labelled, { mode: 0o600 });
    await chmod(configFile, 0o600);
  }
  await pruneReleases(version, await releaseFiles());
  console.log(
    JSON.stringify({
      version,
      release,
      archive,
      ...(configured && {
        privateConfiguration: configFile,
        privateAdministratorFile: join(privateRoot, 'haomeile-admin.txt'),
      }),
    }),
  );
}

await mkdir(releasesRoot, { recursive: true });
try {
  await mkdir(staging);
} catch (error) {
  if (error.code === 'EEXIST')
    throw new Error('Another release preparation is using ' + staging, {
      cause: error,
    });
  throw error;
}

try {
  if (process.argv.includes('--prune-only')) await pruneExistingReleases();
  else await prepareRelease();
} finally {
  await rm(staging, { recursive: true, force: true });
}

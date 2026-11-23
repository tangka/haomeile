import { mkdir, readFile, readdir, stat, unlink } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { serve } from 'bun';
import { createApp } from '../worker';
import type { Bindings } from '../worker/types';
import { cleanup } from '../worker/cleanup';
import { requirePepper } from '../worker/lib/crypto';
import { siteOrigin } from '../shared/site';
import { createAssets } from './assets';
import { openDatabase } from './database';
import { createAdminVerifier, prepareRequest } from './auth';
import { importCommunityCases } from './community';
import { createRadarOverview } from './radar';

export function serverConfig(
  values: Record<string, string | undefined> = process.env,
) {
  const origin = siteOrigin(values.SITE_ORIGIN);
  if (values.ENVIRONMENT !== 'development' && !origin.startsWith('https://'))
    throw new Error('Production requires an HTTPS site origin');
  requirePepper(values.PEPPER || '');
  if (
    !values.TURNSTILE_SITE_KEY?.startsWith('0x') ||
    !values.TURNSTILE_SECRET?.startsWith('0x')
  )
    throw new Error('A real Turnstile widget is required');
  const port = Number(values.PORT || 8788);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('Invalid application port');
  const data = values.DATA_DIR || resolve('data');
  if (!isAbsolute(data)) throw new Error('Data directory must be absolute');
  const mode = values.ADMIN_AUTH_MODE || 'basic';
  if (mode !== 'basic' && mode !== 'access')
    throw new Error('Invalid administrator authentication mode');
  if (mode === 'access' && (!values.ACCESS_AUD || !values.ACCESS_TEAM_DOMAIN))
    throw new Error('Cloudflare Access configuration is required');
  return {
    origin,
    port,
    data,
    mode,
    assets: resolve(values.ASSET_ROOT || 'dist'),
    migrations: resolve(values.MIGRATIONS_ROOT || 'migrations'),
    backups: resolve(values.BACKUP_DIR || join(data, 'backups')),
    username: values.ADMIN_USERNAME || 'admin',
    passwordHash: values.ADMIN_PASSWORD_HASH || '',
    env: {
      ENVIRONMENT: values.ENVIRONMENT || 'production',
      SITE_ORIGIN: origin,
      PEPPER: values.PEPPER!,
      TURNSTILE_SITE_KEY: values.TURNSTILE_SITE_KEY,
      TURNSTILE_SECRET: values.TURNSTILE_SECRET,
      TURNSTILE_TEST_MODE: 'false',
      CLOUDFLARE_WEB_ANALYTICS_TOKEN: values.CLOUDFLARE_WEB_ANALYTICS_TOKEN,
      GA4_MEASUREMENT_ID: values.GA4_MEASUREMENT_ID,
      ACCESS_AUD: values.ACCESS_AUD || '',
      ACCESS_TEAM_DOMAIN: values.ACCESS_TEAM_DOMAIN || '',
      CF_VERSION_METADATA: {
        id: values.APP_VERSION || 'server',
        tag: 'singapore',
        timestamp: values.BUILD_TIMESTAMP || '',
      },
    },
  };
}

export async function openRuntime(
  values: Record<string, string | undefined> = process.env,
  options: { migrate?: boolean } = {},
) {
  process.umask(0o077);
  const config = serverConfig(values);
  const radar = createRadarOverview(
    values.RADAR_OVERVIEW_API_KEY,
    values.RADAR_OVERVIEW_API_URL,
  );
  const assets = createAssets(config.assets);
  await mkdir(config.data, { recursive: true, mode: 0o700 });
  const database = openDatabase(join(config.data, 'haomeile.sqlite'));
  try {
    if (options.migrate !== false) await database.migrate(config.migrations);
    const env = {
      ...config.env,
      DB: database.binding,
      ASSETS: assets,
    } satisfies Bindings;
    const app =
      config.mode === 'basic'
        ? createApp({
            verifyAdministrator: createAdminVerifier(env, {
              username: config.username,
              passwordHash: config.passwordHash,
            }),
            basicChallenge: true,
            readRadarOverview: radar?.read,
          })
        : createApp({ readRadarOverview: radar?.read });
    return { config, database, env, app, radar };
  } catch (error) {
    database.close();
    throw error;
  }
}

async function main() {
  const command = process.argv[2] || 'serve';
  if (
    !['serve', 'migrate', 'cleanup', 'backup', 'import-community'].includes(
      command,
    )
  )
    throw new Error('Unknown server command');
  const runtime = await openRuntime(process.env, {
    migrate: command === 'serve' || command === 'migrate',
  });
  const { config, database, app, env, radar } = runtime;
  if (command !== 'serve') {
    try {
      if (command === 'import-community') {
        const source = process.argv[3];
        if (
          !source ||
          process.argv.length > 4 ||
          (await stat(source)).size > 2_000_000
        )
          throw new Error('A bounded community import file is required');
        const input: unknown = JSON.parse(await readFile(source, 'utf8'));
        await mkdir(config.backups, { recursive: true, mode: 0o700 });
        await database.backup(
          join(
            config.backups,
            'haomeile-' +
              new Date().toISOString().replace(/[:.]/g, '-') +
              '.sqlite',
          ),
        );
        const counts = await importCommunityCases(env.DB, input);
        console.log(JSON.stringify(counts));
        return;
      }
      if (command === 'cleanup') await cleanup(env);
      if (command === 'backup') {
        await mkdir(config.backups, { recursive: true, mode: 0o700 });
        const name =
          'haomeile-' +
          new Date().toISOString().replace(/[:.]/g, '-') +
          '.sqlite';
        await database.backup(join(config.backups, name));
        // Only this application's own dated backups are eligible for rotation.
        for (const candidate of await readdir(config.backups)) {
          if (!/^haomeile-\d{4}-\d{2}-\d{2}T[\dTZ-]+\.sqlite$/.test(candidate))
            continue;
          const path = join(config.backups, candidate);
          if ((await stat(path)).mtimeMs < Date.now() - 14 * 86400_000)
            await unlink(path);
        }
      }
      console.log(`Haomeile ${command} completed`);
    } finally {
      database.close();
    }
    return;
  }
  const server = serve({
    hostname: '127.0.0.1',
    port: config.port,
    maxRequestBodySize: 16384,
    async fetch(request, server) {
      const safe = prepareRequest(
        request,
        server.requestIP(request)?.address || '',
        config.origin,
      );
      if (!safe) return new Response('Forbidden', { status: 403 });
      const response = await app.fetch(safe, env);
      // Rewritten HTML must not retain an asset byte length.
      if (response.headers.get('Content-Type')?.includes('text/html'))
        response.headers.delete('Content-Length');
      return response;
    },
    error() {
      return new Response('Service unavailable', {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      });
    },
  });
  radar?.start();
  console.log(`Haomeile listening on loopback port ${server.port}`);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    radar?.stop();
    await server.stop();
    database.close();
  };
  process.on('SIGTERM', () => void stop());
  process.on('SIGINT', () => void stop());
}
if (import.meta.main)
  main().catch(() => {
    console.error(
      'Haomeile startup failed; check private service configuration.',
    );
    process.exitCode = 1;
  });

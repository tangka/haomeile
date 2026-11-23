import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const configDir = path.join(root, '.wrangler/e2e-config');
const config = path.join(configDir, 'wrangler.toml');
const persist = path.join(root, '.wrangler/e2e-state');
const output = path.join(root, '.wrangler/e2e-dist');
await mkdir(configDir, { recursive: true });
await writeFile(
  config,
  `name = "haomeile-e2e"
main = ${JSON.stringify(path.join(root, 'tests/e2e/fixtures/worker.mjs'))}
compatibility_date = "2026-11-20"
compatibility_flags = ["nodejs_compat"]
[assets]
directory = ${JSON.stringify(output)}
binding = "ASSETS"
run_worker_first = true
[version_metadata]
binding = "CF_VERSION_METADATA"
[[d1_databases]]
binding = "DB"
database_name = "haomeile"
database_id = "00000000-0000-0000-0000-000000000000"
migrations_dir = ${JSON.stringify(path.join(root, 'migrations'))}
[vars]
ENVIRONMENT = "development"
SITE_ORIGIN = "http://127.0.0.1:8790"
TURNSTILE_TEST_MODE = "true"
RADAR_HUMAN_CHECK = "false"
TURNSTILE_SITE_KEY = "1x00000000000000000000AA"
TURNSTILE_SECRET = "1x0000000000000000000000000000000AA"
PEPPER = "local-e2e-only-never-use-for-production-storage"
ACCESS_AUD = ""
ACCESS_TEAM_DOMAIN = ""
`,
);
// A private generated directory keeps local test keys separate from operator credentials.
await writeFile(
  path.join(configDir, '.dev.vars'),
  'ENVIRONMENT="development"\nSITE_ORIGIN="http://127.0.0.1:8790"\nTURNSTILE_TEST_MODE="true"\nTURNSTILE_SITE_KEY="1x00000000000000000000AA"\nTURNSTILE_SECRET="1x0000000000000000000000000000000AA"\nPEPPER="local-e2e-only-never-use-for-production-storage"\nACCESS_AUD=""\nACCESS_TEAM_DOMAIN=""\n',
  { mode: 0o600 },
);
const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn('pnpm', args, { cwd: root, stdio: 'inherit' });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(args.join(' ') + ' failed')),
    );
  });
await run(['exec', 'astro', 'build', '--outDir', output]);
await run([
  'exec',
  'wrangler',
  'd1',
  'migrations',
  'apply',
  'haomeile',
  '--local',
  '--persist-to',
  persist,
  '--config',
  config,
]);
const worker = spawn(
  'pnpm',
  [
    'exec',
    'wrangler',
    'dev',
    '--ip',
    '127.0.0.1',
    '--port',
    '8790',
    '--persist-to',
    persist,
    '--config',
    config,
  ],
  { cwd: root, stdio: 'inherit' },
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => worker.kill(signal));
worker.on('exit', (code) => process.exit(code ?? 0));

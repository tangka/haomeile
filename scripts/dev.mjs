import { spawn } from 'node:child_process';
import { watch, existsSync, copyFileSync } from 'node:fs';

if (!existsSync('.dev.vars')) copyFileSync('.dev.vars.example', '.dev.vars');
const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn('pnpm', args, { stdio: 'inherit' });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(args.join(' ') + ' failed')),
    );
  });
await run(['build']);
if (existsSync('migrations/0001_initial.sql')) await run(['db:migrate']);
const worker = spawn(
  'pnpm',
  ['exec', 'wrangler', 'dev', '--ip', '127.0.0.1', '--port', '8787'],
  { stdio: 'inherit' },
);
let busy = false;
let queued = false;
let timer;
async function rebuild() {
  if (busy) {
    queued = true;
    return;
  }
  busy = true;
  try {
    await run(['build']);
  } catch (error) {
    console.error(error.message);
  }
  busy = false;
  if (queued) {
    queued = false;
    void rebuild();
  }
}
for (const path of ['src/site', 'src/shared', 'public'])
  watch(path, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 200);
  });
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    worker.kill(signal);
    process.exit();
  });
worker.on('exit', (code) => process.exit(code ?? 0));

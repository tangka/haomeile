/**
 * One-command release, for the machine that already holds the deploy key.
 *   node scripts/auto-release.mjs            show what would be released
 *   node scripts/auto-release.mjs --deploy   check, build, deploy, verify
 * Flags: --reviewed (a person has read the sensitive changes), --skip-e2e
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmdirSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BASE = 'main';
const SITE = 'https://haomeile.rip';
// A change here can alter how production runs, so it never ships unattended.
const SENSITIVE =
  /^(?:\.env|ops\/|scripts\/|package\.json$|pnpm-lock\.yaml$|migrations\/|\.agents\/|\.claude\/)/;
const LIVE_PAGES = [
  ['/', '号没了'],
  ['/v/antigravity', 'id="answer"'],
  ['/v/claude', 'id="answer"'],
  ['/tips', '使用小技巧'],
  ['/radar', '非官方'],
  ['/privacy', 'id="ads"'],
  ['/about', '与任何 AI 厂商无隶属关系'],
];

export class Stop extends Error {}

export function git(root, ...args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
const contains = (root, ancestor, commit) => {
  try {
    git(root, 'merge-base', '--is-ancestor', ancestor, commit);
    return true;
  } catch {
    return false;
  }
};

function publishedMain(root) {
  git(
    root,
    'fetch',
    '--quiet',
    '--no-tags',
    'origin',
    'refs/heads/main:refs/remotes/origin/main',
  );
  return git(root, 'rev-parse', 'refs/remotes/origin/main');
}

function requireCleanMain(root) {
  if (git(root, 'branch', '--show-current') !== BASE)
    throw new Stop(`Check out ${BASE} first.`);
  if (git(root, 'status', '--porcelain'))
    throw new Stop('The working tree has uncommitted or untracked files.');
}

/**
 * Read-only apart from `git fetch`. Throws Stop when a person must decide.
 * @param {string} root
 * @param {{ reviewed?: boolean, deployed?: string }} [options]
 */
export function planRelease(root, { reviewed = false, deployed } = {}) {
  requireCleanMain(root);
  const target = publishedMain(root);
  const local = git(root, 'rev-parse', 'HEAD');
  if (!contains(root, local, target))
    throw new Stop('The local branch has commits that are not on origin/main.');
  if (!deployed)
    throw new Stop('The deployed revision is unknown; deploy once by hand.');
  const from = git(root, 'rev-parse', '--verify', `${deployed}^{commit}`);
  if (from === target) return { target, from, upToDate: true, files: [] };
  if (!contains(root, from, target))
    throw new Stop('The deployed revision is not part of the new history.');
  const changes = git(
    root,
    'diff',
    '--name-status',
    '--no-renames',
    from,
    target,
  )
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t'));
  const rewritten = changes.filter(
    ([status, file]) => file.startsWith('migrations/') && status !== 'A',
  );
  if (rewritten.length)
    throw new Stop(
      'Existing migrations were changed: ' +
        rewritten.map(([, file]) => file).join(', '),
    );
  const files = changes.map(([, file]) => file);
  const sensitive = files.filter((file) => SENSITIVE.test(file));
  if (sensitive.length && !reviewed)
    throw new Stop(
      'A person must review these, then rerun with --reviewed: ' +
        sensitive.join(', '),
    );
  return { target, from, upToDate: false, files, sensitive };
}

export function verifyReleaseSource(root, target) {
  requireCleanMain(root);
  if (
    git(root, 'rev-parse', 'HEAD') !== target ||
    publishedMain(root) !== target
  )
    throw new Stop(
      'The release no longer matches origin/main. Rerun the release.',
    );
}

/** The live server is the only truth when more than one machine can deploy. */
export function parseRevision(release) {
  return /(?:^|\/)\d{14}-([a-f0-9]{7,40})$/.exec(release.trim())?.[1];
}
function deployedRevision() {
  const host = /^HOST = '([0-9.]+)'$/m.exec(
    readFileSync(new URL('./deploy-server.py', import.meta.url), 'utf8'),
  )?.[1];
  try {
    return parseRevision(
      execFileSync(
        'ssh',
        [
          '-i',
          join(homedir(), '.ssh/haomeile-deploy-sg'),
          ...[
            'BatchMode=yes',
            'IdentitiesOnly=yes',
            'StrictHostKeyChecking=yes',
            'ConnectTimeout=10',
          ].flatMap((option) => ['-o', option]),
          `root@${host}`,
          'readlink -f /opt/haomeile/current',
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      ),
    );
  } catch {
    throw new Stop('The server did not accept this machine’s deploy key.');
  }
}

export function requireDeployMachine(home = homedir()) {
  if (!existsSync(join(home, '.ssh/haomeile-deploy-sg')))
    throw new Stop('This is not the deploy machine (no deploy key).');
}

export async function verifyLive(fetchImpl = fetch) {
  const problems = [];
  const read = async (path) => {
    const response = await fetchImpl(SITE + path, {
      signal: AbortSignal.timeout(15_000),
    });
    return { status: response.status, body: await response.text() };
  };
  for (const [path, marker] of [['/api/health', '"ok":true'], ...LIVE_PAGES]) {
    try {
      const { status, body } = await read(path);
      if (status !== 200) problems.push(`${path} returned ${status}`);
      else if (!body.includes(marker)) problems.push(`${path} lacks ${marker}`);
    } catch {
      problems.push(`${path} could not be read`);
    }
  }
  return problems;
}

async function main() {
  const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
  const flags = new Set(process.argv.slice(2));
  for (const flag of flags)
    if (!['--deploy', '--reviewed', '--skip-e2e'].includes(flag))
      throw new Stop(`Unknown option ${flag}`);
  const run = (command, ...args) =>
    execFileSync(command, args, { cwd: root, stdio: 'inherit' });
  requireDeployMachine();
  const plan = planRelease(root, {
    reviewed: flags.has('--reviewed'),
    deployed: deployedRevision(),
  });
  if (plan.upToDate) return console.log('Nothing new to release.');
  console.log(
    `Release ${plan.from.slice(0, 7)} -> ${plan.target.slice(0, 7)}, ${plan.files.length} files:`,
  );
  console.log(git(root, 'log', '--oneline', `${plan.from}..${plan.target}`));
  if (!flags.has('--deploy')) return console.log('Run again with --deploy.');

  const lock = join(root, 'artifacts/.release-lock');
  mkdirSync(join(root, 'artifacts'), { recursive: true });
  try {
    mkdirSync(lock);
  } catch {
    throw new Stop(`Another release is running (${lock}).`);
  }
  try {
    run('git', 'merge', '--ff-only', plan.target);
    run('pnpm', 'install', '--frozen-lockfile');
    for (const task of ['check', 'lint', 'test', 'build', 'test:server'])
      run('pnpm', task);
    if (!flags.has('--skip-e2e')) run('pnpm', 'test:e2e');
    run('pnpm', 'build');
    run(
      'pnpm',
      'exec',
      'bun',
      'build',
      'src/server/index.ts',
      '--compile',
      '--target=bun-linux-x64-baseline',
      '--no-compile-autoload-dotenv',
      '--no-compile-autoload-bunfig',
      '--outfile=artifacts/haomeile-server-linux-x64',
    );
    const { archive } = JSON.parse(
      execFileSync(
        'node',
        ['scripts/prepare-server-release.mjs', '--server-configured'],
        { cwd: root, encoding: 'utf8' },
      )
        .trim()
        .split('\n')
        .at(-1),
    );
    verifyReleaseSource(root, plan.target);
    // Backs up the database first and restores the old release if unhealthy.
    run('python3', 'scripts/deploy-server.py', 'app', '--archive', archive);
    const problems = await verifyLive();
    if (problems.length)
      throw new Stop(
        'Deployed, but check the live site: ' + problems.join('; '),
      );
    console.log(`Live and verified: ${plan.target.slice(0, 7)}`);
  } finally {
    rmdirSync(lock);
  }
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(
      error instanceof Stop
        ? `Stopped: ${error.message}`
        : 'Release step failed; see the output above. Nothing further was run.',
    );
    process.exitCode = error instanceof Stop ? 3 : 1;
  });

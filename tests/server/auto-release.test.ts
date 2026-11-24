import { afterEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  BASE,
  SOURCE,
  deployedRevision,
  git,
  planRelease,
  requireDeployMachine,
  verifyLive,
} from '../../scripts/auto-release.mjs';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

/** A local bare origin and clone; nothing here reaches GitHub or production. */
function repository() {
  const home = mkdtempSync(join(tmpdir(), 'haomeile-release-test-'));
  directories.push(home);
  const origin = join(home, 'origin.git');
  const root = join(home, 'work');
  git(home, 'init', '--quiet', '--bare', origin);
  git(home, 'init', '--quiet', '--initial-branch', BASE, root);
  git(root, 'config', 'user.name', 'Release test');
  git(root, 'config', 'user.email', 'release@example.test');
  git(root, 'config', 'commit.gpgsign', 'false');
  git(root, 'remote', 'add', 'origin', origin);
  const commit = (file: string, body: string) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), body);
    git(root, 'add', '-A');
    git(root, 'commit', '--quiet', '-m', file);
    return git(root, 'rev-parse', 'HEAD');
  };
  const deployed = commit('migrations/0001.sql', 'first');
  git(root, 'push', '--quiet', 'origin', `HEAD:${BASE}`, `HEAD:${SOURCE}`);
  const onSource = (file: string, body: string) => {
    git(root, 'switch', '--quiet', '--detach', `origin/${SOURCE}`);
    const id = commit(file, body);
    git(root, 'push', '--quiet', 'origin', `HEAD:${SOURCE}`);
    git(root, 'switch', '--quiet', BASE);
    return id;
  };
  return { home, root, deployed, commit, onSource };
}

test('does nothing when the deployed revision is current', () => {
  const { root, deployed } = repository();
  expect(planRelease(root, { deployed }).upToDate).toBe(true);
});

test('plans an ordinary fast-forward without changing the checkout', () => {
  const { root, deployed, onSource } = repository();
  const target = onSource('src/page.ts', 'new page');
  const plan = planRelease(root, { deployed: deployed.slice(0, 7) });
  expect(plan).toMatchObject({
    target,
    upToDate: false,
    files: ['src/page.ts'],
  });
  expect(git(root, 'rev-parse', 'HEAD')).toBe(deployed);
});

test('stops for review of sensitive files and never accepts a rewritten migration', () => {
  const { root, deployed, onSource } = repository();
  for (const file of [
    'ops/a',
    '.env.production',
    'scripts/a.mjs',
    'migrations/0002.sql',
    'package.json',
  ]) {
    const { root, deployed, onSource } = repository();
    onSource(file, 'changed');
    expect(() => planRelease(root, { deployed })).toThrow('must review');
    expect(planRelease(root, { deployed, reviewed: true }).files).toEqual([
      file,
    ]);
  }
  onSource('migrations/0001.sql', 'rewritten');
  expect(() => planRelease(root, { deployed, reviewed: true })).toThrow(
    'Existing migrations were changed',
  );
});

test('stops on local edits, diverged branches, unknown history and the wrong branch', () => {
  const dirty = repository();
  writeFileSync(join(dirty.root, 'note.txt'), 'unfinished');
  expect(() => planRelease(dirty.root, dirty)).toThrow('working tree');

  const diverged = repository();
  diverged.onSource('src/a.ts', 'a');
  diverged.commit('src/b.ts', 'b');
  git(diverged.root, 'push', '--quiet', 'origin', `HEAD:${BASE}`);
  expect(() => planRelease(diverged.root, diverged)).toThrow('diverged');

  const unpushed = repository();
  unpushed.commit('src/local.ts', 'local');
  expect(() => planRelease(unpushed.root, unpushed)).toThrow('not on origin');

  const unknown = repository();
  expect(() => planRelease(unknown.root)).toThrow('unknown');
  git(unknown.root, 'switch', '--quiet', '-c', 'other');
  expect(() => planRelease(unknown.root, unknown)).toThrow(BASE);
});

test('refuses to run without the deploy files and reads the recorded release', () => {
  const { home, root } = repository();
  expect(() => requireDeployMachine(root, home)).toThrow(
    'not the deploy machine',
  );
  expect(deployedRevision(root)).toBeUndefined();
  mkdirSync(join(root, 'artifacts/private'), { recursive: true });
  writeFileSync(
    join(root, 'artifacts/private/deployment-app.json'),
    JSON.stringify({ release: '20261124080000-117e652' }),
  );
  expect(deployedRevision(root)).toBe('117e652');
});

test('reports live pages that fail or lack their marker', async () => {
  const good = (body: string, status = 200) =>
    (async () => new Response(body, { status })) as unknown as typeof fetch;
  expect(
    await verifyLive(
      good(
        '"ok":true 号没了 id="answer" 使用小技巧 非官方 id="ads" 与任何 AI 厂商无隶属关系',
      ),
    ),
  ).toEqual([]);
  expect(await verifyLive(good('', 503))).toContain('/radar returned 503');
  expect(await verifyLive(good('empty'))).toContain('/privacy lacks id="ads"');
});

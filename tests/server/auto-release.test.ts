import { afterEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  BASE,
  parseRevision,
  git,
  planRelease,
  requireDeployMachine,
  verifyReleaseSource,
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
  git(root, 'push', '--quiet', 'origin', BASE);
  const publish = (file: string, body: string, branch = BASE) => {
    git(root, 'switch', '--quiet', '--detach', `origin/${BASE}`);
    const id = commit(file, body);
    git(root, 'push', '--quiet', 'origin', `HEAD:refs/heads/${branch}`);
    git(root, 'switch', '--quiet', BASE);
    return id;
  };
  return { home, root, deployed, commit, publish };
}

test('does nothing when the deployed revision is current', () => {
  const { root, deployed } = repository();
  expect(planRelease(root, { deployed }).upToDate).toBe(true);
});

test('plans an ordinary fast-forward without changing the checkout', () => {
  const { root, deployed, publish } = repository();
  const target = publish('src/page.ts', 'new page');
  const plan = planRelease(root, { deployed: deployed.slice(0, 7) });
  expect(plan).toMatchObject({
    target,
    upToDate: false,
    files: ['src/page.ts'],
  });
  expect(git(root, 'rev-parse', 'HEAD')).toBe(deployed);
});

test('waits for a feature commit to reach main before planning a release', () => {
  const { root, deployed, publish } = repository();
  const feature = publish(
    'src/pending.ts',
    'feature',
    'codex/implement-haomeile',
  );
  expect(planRelease(root, { deployed }).upToDate).toBe(true);
  git(root, 'push', '--quiet', 'origin', `${feature}:refs/heads/main`);
  expect(planRelease(root, { deployed }).target).toBe(feature);
});

test('stops for review of sensitive files and never accepts a rewritten migration', () => {
  const { root, deployed, publish } = repository();
  for (const file of [
    'ops/a',
    '.env.production',
    'scripts/a.mjs',
    'migrations/0002.sql',
    'package.json',
  ]) {
    const { root, deployed, publish } = repository();
    publish(file, 'changed');
    expect(() => planRelease(root, { deployed })).toThrow('must review');
    expect(planRelease(root, { deployed, reviewed: true }).files).toEqual([
      file,
    ]);
  }
  publish('migrations/0001.sql', 'rewritten');
  expect(() => planRelease(root, { deployed, reviewed: true })).toThrow(
    'Existing migrations were changed',
  );
});

test('stops on local edits, diverged branches, unknown history and the wrong branch', () => {
  const dirty = repository();
  writeFileSync(join(dirty.root, 'note.txt'), 'unfinished');
  expect(() => planRelease(dirty.root, dirty)).toThrow('working tree');

  const diverged = repository();
  diverged.publish('src/a.ts', 'a');
  diverged.commit('src/b.ts', 'b');
  expect(() => planRelease(diverged.root, diverged)).toThrow(
    'not on origin/main',
  );

  const unpushed = repository();
  unpushed.commit('src/local.ts', 'local');
  expect(() => planRelease(unpushed.root, unpushed)).toThrow('not on origin');

  const unknown = repository();
  expect(() => planRelease(unknown.root)).toThrow('unknown');
  for (const branch of ['codex/implement-haomeile', 'release/local']) {
    git(unknown.root, 'switch', '--quiet', '-c', branch);
    expect(() => planRelease(unknown.root, unknown)).toThrow(BASE);
  }
});

test('checks the release against the current checkout and latest remote main before uploading', () => {
  const { root, deployed, publish } = repository();
  const target = publish('src/one.ts', 'one');
  expect(() => verifyReleaseSource(root, target)).toThrow('no longer matches');
  git(root, 'merge', '--ff-only', target);
  expect(() => verifyReleaseSource(root, target)).not.toThrow();
  publish('src/two.ts', 'two');
  expect(() => verifyReleaseSource(root, target)).toThrow('no longer matches');
  expect(planRelease(root, { deployed }).target).not.toBe(target);
});

test('refuses to run without the deploy key and reads the live release name', () => {
  const { home } = repository();
  expect(() => requireDeployMachine(home)).toThrow('not the deploy machine');
  expect(parseRevision('/opt/haomeile/releases/20261124080000-117e652\n')).toBe(
    '117e652',
  );
  expect(parseRevision('/opt/haomeile/current')).toBeUndefined();
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

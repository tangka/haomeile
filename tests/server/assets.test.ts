import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAssets } from '../../src/server/assets';

let sandbox: string;
let root: string;
function put(path: string, content = 'public content'): void {
  writeFileSync(join(root, path), content);
}
beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'haomeile-assets-'));
  root = join(sandbox, 'dist');
  mkdirSync(root);
  for (const folder of [
    'about',
    'admin',
    '_templates/tomb',
    '_astro',
    'assets',
  ])
    mkdirSync(join(root, folder), { recursive: true });
  put('index.html', '<h1>Public home</h1>');
  put('about/index.html', '<h1>About</h1>');
  put('admin/index.html', '<h1>Protected admin template</h1>');
  put('_templates/tomb/index.html', '<div data-ssr="detail"></div>');
  put('404.html', '<h1>Not found page</h1>');
  put('_astro/page.DAf893kZ.js', 'export const answer = 42;');
  put('_astro/plain.js', 'export {};');
  put('assets/flower.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  put('site.webmanifest', '{"name":"Haomeile"}');
});
afterEach(() => rmSync(sandbox, { recursive: true, force: true }));
function fetch(path: string, init?: RequestInit): Promise<Response> {
  return createAssets(root).fetch(
    new Request('https://haomeile.rip' + path, init),
  );
}

describe('production internal assets', () => {
  it('requires an absolute real directory', () => {
    expect(() => createAssets('dist')).toThrow('absolute');
    expect(() => createAssets(join(root, 'index.html'))).toThrow('directory');
    expect(() => createAssets(join(root, 'missing'))).toThrow();
  });
  it('serves root, directory and explicit HTML files without redirecting queries', async () => {
    for (const [path, text] of [
      ['/', 'Public home'],
      ['/index.html', 'Public home'],
      ['/about', 'About'],
      ['/about/?mode=edit', 'About'],
      ['/404.html', 'Not found page'],
    ]) {
      const response = await fetch(path);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe(
        'text/html; charset=utf-8',
      );
      expect(response.headers.has('location')).toBe(false);
      expect(response.headers.has('content-length')).toBe(false);
      expect(await response.text()).toContain(text);
    }
  });
  it('preserves internal template access for SSR after the application authorizes a request', async () => {
    const template = await fetch('/_templates/tomb/');
    expect(await template.text()).toContain('data-ssr="detail"');
    const admin = await fetch('/admin/');
    expect(await admin.text()).toContain('Protected admin template');
  });
  it('sets MIME and immutable caching only for hashed build resources', async () => {
    const script = await fetch('/_astro/page.DAf893kZ.js');
    expect(script.headers.get('content-type')).toContain('javascript');
    expect(script.headers.get('cache-control')).toContain('immutable');
    expect(Number(script.headers.get('content-length'))).toBeGreaterThan(0);
    expect(
      (await fetch('/_astro/plain.js')).headers.get('cache-control'),
    ).not.toContain('immutable');
    expect(
      (await fetch('/assets/flower.svg')).headers.get('content-type'),
    ).toBe('image/svg+xml');
    expect(
      (await fetch('/site.webmanifest')).headers.get('content-type'),
    ).toContain('application/manifest+json');
  });
  it('supports HEAD and rejects body-bearing methods without writes', async () => {
    const head = await fetch('/assets/flower.svg', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    const post = await fetch('/index.html', {
      method: 'POST',
      body: 'replace the file',
    });
    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET, HEAD');
    expect(await (await fetch('/index.html')).text()).toContain('Public home');
  });
  it.each([
    '/missing',
    '/ADMIN/',
    '/admin/INDEX.HTML',
    '/About/',
    '/_templates/Tomb/',
    '/assets//flower.svg',
    '/%61dmin/',
    '/admin%2findex.html',
    '/%2e%2e%2foutside.txt',
    '/assets/..%5coutside.txt',
    '/.env',
    '/nested/.env',
  ])('rejects unsafe or non-exact path %s', async (path) => {
    const response = await fetch(path);
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).not.toContain(root);
  });
  it('never serves secret or source artifacts accidentally copied into dist', async () => {
    for (const name of [
      'secret.pem',
      'private.txt',
      'database.xml',
      'credentials.css',
      'password.html',
      'production.sqlite',
      'database.sql',
      'source.js.map',
      'credentials.json',
      '.dev.vars',
    ]) {
      put(name, 'private-value');
      const response = await fetch('/' + name);
      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain('private-value');
    }
  });
  it('blocks both external symlinks and internal aliases of protected templates', async () => {
    const outside = join(sandbox, 'outside.txt');
    writeFileSync(outside, 'outside secret');
    symlinkSync(outside, join(root, 'outside.txt'));
    symlinkSync(join(root, 'admin'), join(root, 'public-alias'));
    symlinkSync(join(root, 'admin/index.html'), join(root, 'public.html'));
    for (const path of ['/outside.txt', '/public-alias/', '/public.html']) {
      const response = await fetch(path);
      expect(response.status).toBe(404);
      expect(await response.text()).not.toMatch(/secret|Protected admin/);
    }
  });
});

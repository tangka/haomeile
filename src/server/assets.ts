import { lstatSync, readdirSync, realpathSync } from 'node:fs';
import { extname, isAbsolute, join, relative, sep } from 'node:path';
import type { AssetBinding } from '../worker/types';

// Keep accidental database, environment, source-map and private key artifacts
// unservable even if they are accidentally copied into the public build.
const PUBLIC_EXTENSIONS = new Set([
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.svg',
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.avif',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.txt',
  '.xml',
  '.webmanifest',
]);
const PRIVATE_NAME =
  /(?:^|[._-])(?:secret|private|credentials?|password|database|backup)(?:[._-]|$)/i;
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};
function unavailable(status: 404 | 405): Response {
  return new Response(status === 404 ? 'Not found' : 'Method not allowed', {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(status === 405 ? { Allow: 'GET, HEAD' } : {}),
    },
  });
}

/**
 * Internal read-only resource binding. The Hono application must handle every
 * public request before calling this binding; do not expose it as a server.
 */
export function createAssets(root: string): AssetBinding {
  if (!isAbsolute(root))
    throw new Error('Asset root must be an absolute directory');
  const canonicalRoot = realpathSync(root);
  if (!lstatSync(canonicalRoot).isDirectory())
    throw new Error('Asset root must be a directory');

  function exactChild(directory: string, name: string): string | null {
    // Case-sensitive membership is intentional, including on macOS. A filesystem
    // lookup alone would let /ADMIN read /admin and bypass path-based auth.
    if (!readdirSync(directory).includes(name)) return null;
    const child = join(directory, name);
    if (lstatSync(child).isSymbolicLink()) return null;
    const resolved = realpathSync(child);
    const inside = relative(canonicalRoot, resolved);
    if (inside === '..' || inside.startsWith('..' + sep) || isAbsolute(inside))
      return null;
    return child;
  }

  return {
    async fetch(
      input: Request | string | URL,
      init?: RequestInit,
    ): Promise<Response> {
      let request: Request;
      try {
        request = new Request(input, init);
      } catch {
        return unavailable(404);
      }
      if (request.method !== 'GET' && request.method !== 'HEAD')
        return unavailable(405);
      const url = new URL(request.url);
      const path = url.pathname;
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        !path.startsWith('/') ||
        path.includes('//') ||
        /[%\\]/.test(path) ||
        Array.from(path).some((character) => character.charCodeAt(0) < 32)
      )
        return unavailable(404);
      const parts = path.split('/').slice(1);
      if (parts.at(-1) === '') parts.pop();
      if (
        parts.some(
          (part) =>
            !part ||
            part.startsWith('.') ||
            PRIVATE_NAME.test(part) ||
            /[\\:]/.test(part),
        )
      )
        return unavailable(404);
      try {
        let filePath = canonicalRoot;
        for (const part of parts) {
          if (!lstatSync(filePath).isDirectory()) return unavailable(404);
          const child = exactChild(filePath, part);
          if (!child) return unavailable(404);
          filePath = child;
        }
        let metadata = lstatSync(filePath);
        if (metadata.isDirectory()) {
          const index = exactChild(filePath, 'index.html');
          if (!index) return unavailable(404);
          filePath = index;
          metadata = lstatSync(filePath);
        }
        const extension = extname(filePath).toLowerCase();
        if (!metadata.isFile() || !PUBLIC_EXTENSIONS.has(extension))
          return unavailable(404);
        const file = Bun.file(filePath);
        const html = extension === '.html';
        const immutable =
          path.startsWith('/_astro/') &&
          /\.[a-z\d_-]{6,}\.[a-z\d]+$/i.test(filePath);
        const headers = new Headers({
          'Content-Type':
            MIME_TYPES[extension] || file.type || 'application/octet-stream',
          'Cache-Control': html
            ? 'public, max-age=0, must-revalidate'
            : immutable
              ? 'public, max-age=31536000, immutable'
              : 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
          'Last-Modified': metadata.mtime.toUTCString(),
        });
        // HTMLRewriter changes the body. Never carry the file's old byte length
        // into its rewritten response.
        if (!html) headers.set('Content-Length', String(metadata.size));
        return new Response(request.method === 'HEAD' ? null : file, {
          headers,
        });
      } catch {
        // Files can disappear during a release switch. Do not expose local paths
        // or filesystem error details in a public response.
        return unavailable(404);
      }
    },
  };
}

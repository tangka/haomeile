import { isIP } from 'node:net';
import type { Bindings } from '../worker/types';
import { constantTimeEqual, hashSecret } from '../worker/lib/crypto';
import { reserveRate, releaseRate } from '../worker/lib/ratelimit';
import type { AccessIdentity } from '../worker/lib/access';

export interface ServerAdmin {
  username: string;
  passwordHash: string;
}
/** A generated high-entropy password is hashed with the site's private pepper. */
export function createAdminVerifier(env: Bindings, admin: ServerAdmin) {
  if (
    !/^[a-zA-Z0-9_-]{3,64}$/.test(admin.username) ||
    !/^[a-f0-9]{64}$/.test(admin.passwordHash)
  )
    throw new Error('Server administrator credentials are not configured');
  return async (request: Request): Promise<AccessIdentity | null> => {
    const reservation = await reserveRate(
      env.DB,
      env.PEPPER,
      request.headers.get('CF-Connecting-IP'),
      'admin_auth',
      20,
      true,
    );
    const header = request.headers.get('Authorization') || '';
    let username = '',
      password = '';
    if (header.length <= 1024 && /^Basic /i.test(header)) {
      try {
        const decoded = atob(header.slice(6));
        const colon = decoded.indexOf(':');
        if (colon >= 0) {
          username = decoded.slice(0, colon);
          password = decoded.slice(colon + 1);
        }
      } catch {
        /* Invalid credentials receive the same challenge. */
      }
    }
    const digest = await hashSecret(password, env.PEPPER);
    const matchesPassword = constantTimeEqual(digest, admin.passwordHash);
    const matchesUsername = constantTimeEqual(username, admin.username);
    if (!matchesPassword || !matchesUsername || password.length < 32)
      return null;
    await releaseRate(env.DB, reservation);
    return { email: 'server-admin', sub: admin.username };
  };
}

/** Only the loopback reverse proxy may supply a client IP, and only valid IPs survive. */
export function prepareRequest(
  request: Request,
  peer: string,
  origin: string,
): Request | null {
  if (peer !== '127.0.0.1' && peer !== '::1' && peer !== '::ffff:127.0.0.1')
    return null;
  const url = new URL(request.url),
    expected = new URL(origin);
  if (url.host !== expected.host && url.pathname !== '/api/health') return null;
  const forwarded = request.headers.get('X-Haomeile-Client-IP') || '';
  const headers = new Headers(request.headers);
  headers.delete('CF-Connecting-IP');
  headers.delete('X-Haomeile-Client-IP');
  headers.set('CF-Connecting-IP', isIP(forwarded) ? forwarded : peer);
  url.protocol = expected.protocol;
  url.hostname = expected.hostname;
  url.port = expected.port;
  return new Request(url, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual',
  });
}

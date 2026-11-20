import { describe, expect, it } from 'bun:test';
import { openDatabase } from '../../src/server/database';
import { createAdminVerifier, prepareRequest } from '../../src/server/auth';
import { hashSecret } from '../../src/worker/lib/crypto';
import type { Bindings } from '../../src/worker/types';
import { resolve } from 'node:path';

describe('server authentication and proxy boundary', () => {
  it('removes user-supplied Cloudflare IPs, trusts only loopback proxy input, and binds the public hostname', () => {
    const origin = 'https://haomeile.rip';
    const request = new Request(origin + '/api/stats', {
      headers: {
        'CF-Connecting-IP': '192.0.2.2',
        'X-Haomeile-Client-IP': '198.51.100.7',
      },
    });
    expect(prepareRequest(request, '192.0.2.50', origin)).toBeNull();
    const safe = prepareRequest(request, '127.0.0.1', origin)!;
    expect(safe.headers.get('CF-Connecting-IP')).toBe('198.51.100.7');
    expect(safe.headers.has('X-Haomeile-Client-IP')).toBe(false);
    const invalid = prepareRequest(
      new Request(origin, {
        headers: {
          'X-Haomeile-Client-IP': 'spoofed',
          'CF-Connecting-IP': '192.0.2.2',
        },
      }),
      '127.0.0.1',
      origin,
    )!;
    expect(invalid.headers.get('CF-Connecting-IP')).toBe('127.0.0.1');
    expect(
      prepareRequest(
        new Request('http://evil.invalid/admin'),
        '127.0.0.1',
        origin,
      ),
    ).toBeNull();
    expect(
      prepareRequest(
        new Request('http://127.0.0.1:8788/api/health'),
        '127.0.0.1',
        origin,
      )?.url,
    ).toBe(origin + '/api/health');
  });
  it('requires real administrator credentials and rate-limits failed attempts', async () => {
    const db = openDatabase(':memory:');
    try {
      await db.migrate(resolve('migrations'));
      const password = 'random-server-only-test-password-with-entropy';
      const pepper = 'server-test-only-pepper-never-production-1234';
      const env = { DB: db.binding, PEPPER: pepper } as Bindings;
      const verify = createAdminVerifier(env, {
        username: 'admin',
        passwordHash: await hashSecret(password, pepper),
      });
      const request = (secret: string, user = 'admin') =>
        new Request('https://haomeile.rip/admin', {
          headers: {
            Authorization: 'Basic ' + btoa(user + ':' + secret),
            'CF-Connecting-IP': '192.0.2.8',
          },
        });
      expect(await verify(request(password))).toEqual({
        email: 'server-admin',
        sub: 'admin',
      });
      expect(await verify(request(password, 'other'))).toBeNull();
      expect(await verify(request('incorrect'))).toBeNull();
      for (let i = 0; i < 18; i++)
        expect(await verify(request('incorrect'))).toBeNull();
      await expect(verify(request('incorrect'))).rejects.toMatchObject({
        code: 'RATE_LIMITED',
      });
    } finally {
      db.close();
    }
  });
});

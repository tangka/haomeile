import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createAccessVerifier } from '../../src/worker/lib/access';

const time = Date.UTC(2026, 10, 20, 12);
const config = {
  ACCESS_AUD: 'test-application',
  ACCESS_TEAM_DOMAIN: 'test-team.cloudflareaccess.com',
};
let keyPair: CryptoKeyPair;
let jwk: JsonWebKey & { kid: string; alg: string; use: string };

function encode(value: string | Uint8Array): string {
  const bytes =
    typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

async function token(
  claims: Record<string, unknown> = {},
  header: Record<string, unknown> = {},
) {
  const encodedHeader = encode(
    JSON.stringify({ alg: 'RS256', kid: 'test-key', typ: 'JWT', ...header }),
  );
  const encodedPayload = encode(
    JSON.stringify({
      iss: 'https://test-team.cloudflareaccess.com',
      aud: [config.ACCESS_AUD],
      exp: time / 1_000 + 600,
      nbf: time / 1_000 - 60,
      iat: time / 1_000 - 60,
      type: 'app',
      email: 'moderator@example.test',
      sub: 'test-identity',
      ...claims,
    }),
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyPair.privateKey,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  return `${encodedHeader}.${encodedPayload}.${encode(new Uint8Array(signature))}`;
}

const request = (value: string) =>
  new Request('https://haomeile.rip/admin', {
    headers: { 'Cf-Access-Jwt-Assertion': value },
  });

beforeAll(async () => {
  keyPair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  jwk = {
    ...((await crypto.subtle.exportKey(
      'jwk',
      keyPair.publicKey,
    )) as JsonWebKey),
    kid: 'test-key',
    alg: 'RS256',
    use: 'sig',
  };
});

describe('Cloudflare Access', () => {
  it('verifies a locally signed application token against configured JWKS and caches keys', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ keys: [jwk] }));
    const verify = createAccessVerifier(fetcher, () => time);
    const valid = await token();
    expect(await verify(request(valid), config)).toEqual({
      email: 'moderator@example.test',
      sub: 'test-identity',
    });
    expect(await verify(request(valid), config)).not.toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(
      'https://test-team.cloudflareaccess.com/cdn-cgi/access/certs',
    );
  });

  it.each([
    { iss: 'https://attacker.cloudflareaccess.com' },
    { aud: ['another-application'] },
    { aud: config.ACCESS_AUD },
    { exp: time / 1_000 },
    { exp: '9999999999' },
    { nbf: time / 1_000 + 1 },
    { iat: time / 1_000 + 1 },
    { type: 'org' },
    { email: undefined, common_name: 'service-token' },
  ])(
    'rejects invalid application claims before fetching keys: %j',
    async (claims) => {
      const fetcher = vi.fn();
      const verify = createAccessVerifier(fetcher, () => time);
      expect(await verify(request(await token(claims)), config)).toBeNull();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each([{ alg: 'none' }, { alg: 'HS256' }, { crit: ['b64'] }, { kid: '' }])(
    'rejects unsupported headers: %j',
    async (header) => {
      const fetcher = vi.fn();
      expect(
        await createAccessVerifier(fetcher, () => time)(
          request(await token({}, header)),
          config,
        ),
      ).toBeNull();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it('rejects missing/malformed tokens, bad signature and key service failure', async () => {
    const verify = createAccessVerifier(
      vi.fn().mockResolvedValue(Response.json({ keys: [jwk] })),
      () => time,
    );
    expect(
      await verify(new Request('https://haomeile.rip/admin'), config),
    ).toBeNull();
    expect(await verify(request('not.a.valid.token'), config)).toBeNull();
    const valid = await token();
    const parts = valid.split('.');
    parts[2] = encode(new Uint8Array(256));
    expect(await verify(request(parts.join('.')), config)).toBeNull();
    expect(
      await createAccessVerifier(
        vi.fn().mockRejectedValue(new Error('offline')),
        () => time,
      )(request(valid), config),
    ).toBeNull();
  });

  it('never uses an issuer supplied by a token or malformed configuration as a network destination', async () => {
    const fetcher = vi.fn();
    const verify = createAccessVerifier(fetcher, () => time);
    for (const domain of [
      '',
      'http://test-team.cloudflareaccess.com',
      'localhost',
      'https://test-team.cloudflareaccess.com.evil.test',
      'https://test-team.cloudflareaccess.com/other',
      'https://name:pass@test-team.cloudflareaccess.com',
    ]) {
      expect(
        await verify(request(await token()), {
          ...config,
          ACCESS_TEAM_DOMAIN: domain,
        }),
      ).toBeNull();
    }
    expect(
      await verify(request(await token()), { ...config, ACCESS_AUD: '' }),
    ).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('refreshes rotated keys after a bounded interval without refetching on every unknown kid', async () => {
    let clock = time;
    const fetcher = vi.fn().mockImplementation(async () =>
      Response.json({
        keys: [
          {
            ...jwk,
            kid: fetcher.mock.calls.length === 1 ? 'previous-key' : 'test-key',
          },
        ],
      }),
    );
    const verify = createAccessVerifier(fetcher, () => clock);
    const valid = await token();
    expect(await verify(request(valid), config)).toBeNull();
    expect(await verify(request(valid), config)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    clock += 31_000;
    expect(await verify(request(valid), config)).not.toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

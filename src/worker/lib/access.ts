/** Cloudflare Access application-token verification. Trust only configured issuer/JWKS. */
export interface AccessConfig {
  ACCESS_AUD: string;
  ACCESS_TEAM_DOMAIN: string;
}

export interface AccessIdentity {
  email: string;
  sub: string;
}

interface AccessJwk extends JsonWebKey {
  kid: string;
}

interface KeySet {
  fetchedAt: number;
  keys: AccessJwk[];
}

function decodePart(part: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new Error('Invalid encoding');
  const base64 = part.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function decodeObject(part: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(
      decodePart(part),
    ),
  );
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('Invalid JSON');
  return parsed as Record<string, unknown>;
}

function teamIssuer(value: string): string {
  const issuer = new URL(value.includes('://') ? value : `https://${value}`);
  if (
    issuer.protocol !== 'https:' ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.cloudflareaccess\.com$/.test(
      issuer.hostname,
    ) ||
    issuer.port ||
    issuer.username ||
    issuer.password ||
    issuer.pathname !== '/' ||
    issuer.search ||
    issuer.hash
  )
    throw new Error('Invalid Access team domain');
  return issuer.origin;
}

/** Factory provides isolated caches for tests; production always uses the exported verifier. */
export function createAccessVerifier(
  fetcher: typeof fetch | undefined = undefined,
  now: () => number = Date.now,
) {
  const cache = new Map<string, KeySet>();
  return async function verify(
    request: Request,
    config: AccessConfig,
  ): Promise<AccessIdentity | null> {
    try {
      if (!config.ACCESS_AUD || !config.ACCESS_TEAM_DOMAIN) return null;
      const issuer = teamIssuer(config.ACCESS_TEAM_DOMAIN);
      const token = request.headers.get('Cf-Access-Jwt-Assertion');
      if (!token || token.length > 16_384) return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [encodedHeader, encodedPayload, encodedSignature] = parts;
      const header = decodeObject(encodedHeader);
      const claims = decodeObject(encodedPayload);
      const timestamp = Math.floor(now() / 1_000);
      if (
        header.alg !== 'RS256' ||
        typeof header.kid !== 'string' ||
        !header.kid ||
        header.crit !== undefined ||
        header.b64 === false ||
        claims.iss !== issuer ||
        claims.type !== 'app' ||
        !Array.isArray(claims.aud) ||
        !claims.aud.includes(config.ACCESS_AUD) ||
        typeof claims.exp !== 'number' ||
        !Number.isFinite(claims.exp) ||
        claims.exp <= timestamp ||
        (claims.nbf !== undefined &&
          (typeof claims.nbf !== 'number' ||
            !Number.isFinite(claims.nbf) ||
            claims.nbf > timestamp)) ||
        (claims.iat !== undefined &&
          (typeof claims.iat !== 'number' ||
            !Number.isFinite(claims.iat) ||
            claims.iat > timestamp)) ||
        typeof claims.email !== 'string' ||
        claims.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)
      )
        return null;

      const cached = cache.get(issuer);
      let keySet = cached;
      const unknownKid = !keySet?.keys.some((key) => key.kid === header.kid);
      if (
        !keySet ||
        now() - keySet.fetchedAt >= 300_000 ||
        (unknownKid && now() - keySet.fetchedAt >= 30_000)
      ) {
        const response = await (fetcher ?? fetch)(
          `${issuer}/cdn-cgi/access/certs`,
          {
            redirect: 'error',
            signal: AbortSignal.timeout(5_000),
          },
        );
        if (!response.ok) return null;
        const body: unknown = await response.json();
        if (
          !body ||
          typeof body !== 'object' ||
          !('keys' in body) ||
          !Array.isArray(body.keys)
        )
          return null;
        const keys = body.keys.filter(
          (key): key is AccessJwk =>
            !!key &&
            typeof key === 'object' &&
            key.kty === 'RSA' &&
            key.alg === 'RS256' &&
            key.use === 'sig' &&
            typeof key.kid === 'string',
        );
        keySet = { fetchedAt: now(), keys };
        cache.set(issuer, keySet);
      }
      const jwk = keySet.keys.find((key) => key.kid === header.kid);
      if (!jwk) return null;
      const key = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      const valid = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        key,
        decodePart(encodedSignature),
        new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
      );
      return valid
        ? {
            email: claims.email,
            sub: typeof claims.sub === 'string' ? claims.sub : '',
          }
        : null;
    } catch {
      // No token or error detail is reflected, logged, or exposed to unauthenticated callers.
      return null;
    }
  };
}

export const verifyAccess = createAccessVerifier();

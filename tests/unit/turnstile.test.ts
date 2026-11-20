import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from '../../src/worker/lib/turnstile';
import type { Bindings } from '../../src/worker/types';
const configured = { TURNSTILE_SECRET: 'test-secret', ENVIRONMENT: 'production', SITE_ORIGIN: 'https://haomeile.rip' } as Bindings;
afterEach(() => vi.restoreAllMocks());
describe('Turnstile verification', () => {
  it('verifies the token server-side and sends no IP address', async () => {
    const mock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ success: true, hostname: 'haomeile.rip' }));
    await expect(verifyTurnstile('one-time-token', configured)).resolves.toBeUndefined();
    const [url, options] = mock.mock.calls[0]!;
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(String(options?.body)).toBe('secret=test-secret&response=one-time-token');
    expect(String(options?.body)).not.toContain('remoteip');
  });
  it('rejects a valid token from another hostname', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ success: true, hostname: 'elsewhere.invalid' }));
    await expect(verifyTurnstile('token', configured)).rejects.toMatchObject({ code: 'TURNSTILE_FAILED' });
  });
  it('fails closed when the verifier is unavailable or unconfigured', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network problem'));
    await expect(verifyTurnstile('token', configured)).rejects.toMatchObject({ code: 'TURNSTILE_UNAVAILABLE', status: 503 });
    await expect(verifyTurnstile('', configured)).rejects.toMatchObject({ code: 'TURNSTILE_FAILED' });
    await expect(verifyTurnstile('token', { ...configured, TURNSTILE_SECRET: '' })).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
  });
});

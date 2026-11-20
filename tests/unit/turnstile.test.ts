import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from '../../src/worker/lib/turnstile';
import type { Bindings } from '../../src/worker/types';

const configured = {
  TURNSTILE_SITE_KEY: 'real-widget-site-key',
  TURNSTILE_SECRET: 'test-secret',
  ENVIRONMENT: 'production',
  SITE_ORIGIN: 'https://haomeile.rip',
} as Bindings;
const dummy = {
  TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
  TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
};
const dummyToken = 'XXXX.DUMMY.TOKEN.XXXX';
afterEach(() => vi.restoreAllMocks());

describe('Turnstile verification', () => {
  it('verifies the token server-side and sends no IP address', async () => {
    const mock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Response.json({ success: true, hostname: 'haomeile.rip' }),
      );
    await expect(
      verifyTurnstile('one-time-token', configured),
    ).resolves.toBeUndefined();
    const [url, options] = mock.mock.calls[0]!;
    expect(url).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(String(options?.body)).toBe(
      'secret=test-secret&response=one-time-token',
    );
    expect(String(options?.body)).not.toContain('remoteip');
    expect(options?.redirect).toBe('manual');
  });

  it('rejects verifier redirects without forwarding credentials to another URL', async () => {
    const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 307,
        headers: { location: 'https://elsewhere.invalid/collect' },
      }),
    );
    await expect(
      verifyTurnstile('one-time-token', configured),
    ).rejects.toMatchObject({
      code: 'TURNSTILE_UNAVAILABLE',
      status: 503,
    });
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock.mock.calls[0]![1]?.redirect).toBe('manual');
  });

  it('validates the hostname for real local-development credentials', async () => {
    const mock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Response.json({ success: true, hostname: '127.0.0.1' }),
      );
    const local = {
      ...configured,
      ENVIRONMENT: 'development',
      SITE_ORIGIN: 'http://127.0.0.1:8787',
    };
    await expect(verifyTurnstile('token', local)).resolves.toBeUndefined();
    mock.mockImplementation(async () =>
      Response.json({ success: true, hostname: 'haomeile.rip' }),
    );
    await expect(verifyTurnstile('token', local)).rejects.toMatchObject({
      code: 'TURNSTILE_FAILED',
    });
  });

  it('rejects a valid token from another hostname', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      Response.json({ success: true, hostname: 'elsewhere.invalid' }),
    );
    await expect(verifyTurnstile('token', configured)).rejects.toMatchObject({
      code: 'TURNSTILE_FAILED',
    });
  });

  it.each([null, [], 'success', { success: 'true' }, { success: true }])(
    'rejects malformed verification data or a missing hostname: %j',
    async (data) => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        Response.json(data),
      );
      await expect(verifyTurnstile('token', configured)).rejects.toMatchObject({
        code: 'TURNSTILE_FAILED',
      });
    },
  );

  it('rejects the official dummy token before a real verification request', async () => {
    const mock = vi.spyOn(globalThis, 'fetch');
    for (const environment of ['production', 'development']) {
      await expect(
        verifyTurnstile(dummyToken, {
          ...configured,
          ENVIRONMENT: environment,
        }),
      ).rejects.toMatchObject({ code: 'TURNSTILE_FAILED' });
    }
    expect(mock).not.toHaveBeenCalled();
  });

  it.each([
    dummy,
    { TURNSTILE_SITE_KEY: dummy.TURNSTILE_SITE_KEY },
    { TURNSTILE_SECRET: dummy.TURNSTILE_SECRET },
    { TURNSTILE_SITE_KEY: '3x00000000000000000000FF' },
    { TURNSTILE_SECRET: '2x0000000000000000000000000000000AA' },
  ])(
    'rejects official test credentials outside isolated test mode: %j',
    async (patch) => {
      const mock = vi.spyOn(globalThis, 'fetch');
      await expect(
        verifyTurnstile('token', {
          ...configured,
          ENVIRONMENT: 'development',
          ...patch,
        }),
      ).rejects.toMatchObject({ code: 'NOT_CONFIGURED', status: 503 });
      expect(mock).not.toHaveBeenCalled();
    },
  );

  it.each(['test', 'development'])(
    'allows paired official test keys only when explicitly enabled in %s',
    async (environment) => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        Response.json({ success: true, hostname: 'example.com' }),
      );
      await expect(
        verifyTurnstile(dummyToken, {
          ...configured,
          ...dummy,
          ENVIRONMENT: environment,
          TURNSTILE_TEST_MODE: 'true',
        }),
      ).resolves.toBeUndefined();
    },
  );

  it('cannot enable the testing exception in production', async () => {
    const mock = vi.spyOn(globalThis, 'fetch');
    await expect(
      verifyTurnstile(dummyToken, {
        ...configured,
        ...dummy,
        TURNSTILE_TEST_MODE: 'true',
      }),
    ).rejects.toMatchObject({ code: 'NOT_CONFIGURED', status: 503 });
    expect(mock).not.toHaveBeenCalled();
  });

  it('never skips hostname validation for real credentials even with a development test flag', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      Response.json({ success: true, hostname: 'elsewhere.invalid' }),
    );
    await expect(
      verifyTurnstile('token', {
        ...configured,
        ENVIRONMENT: 'development',
        TURNSTILE_TEST_MODE: 'true',
      }),
    ).rejects.toMatchObject({ code: 'TURNSTILE_FAILED' });
  });

  it('rejects a mixed real/test credential pair even with the test flag', async () => {
    const mock = vi.spyOn(globalThis, 'fetch');
    await expect(
      verifyTurnstile(dummyToken, {
        ...configured,
        ENVIRONMENT: 'test',
        TURNSTILE_SECRET: dummy.TURNSTILE_SECRET,
        TURNSTILE_TEST_MODE: 'true',
      }),
    ).rejects.toMatchObject({ code: 'NOT_CONFIGURED', status: 503 });
    expect(mock).not.toHaveBeenCalled();
  });

  it.each([
    { TURNSTILE_SECRET: '' },
    { TURNSTILE_SITE_KEY: '' },
    { SITE_ORIGIN: '' },
    { SITE_ORIGIN: 'not-a-url' },
  ])(
    'fails closed with missing or invalid configuration: %j',
    async (patch) => {
      const mock = vi.spyOn(globalThis, 'fetch');
      await expect(
        verifyTurnstile('token', { ...configured, ...patch }),
      ).rejects.toMatchObject({ code: 'NOT_CONFIGURED', status: 503 });
      expect(mock).not.toHaveBeenCalled();
    },
  );

  it('fails closed when the verifier is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('network problem'),
    );
    await expect(verifyTurnstile('token', configured)).rejects.toMatchObject({
      code: 'TURNSTILE_UNAVAILABLE',
      status: 503,
    });
    await expect(verifyTurnstile('', configured)).rejects.toMatchObject({
      code: 'TURNSTILE_FAILED',
    });
  });
});

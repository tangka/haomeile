import { afterEach, expect, spyOn, test } from 'bun:test';
import {
  deliverRadarEmail,
  radarEmailProviders,
  type RadarMessage,
} from '../../src/server/radar-email-providers';
import type { RadarProvider } from '../../src/server/radar-email-capacity';

const from = 'radar@example.test';
const message: RadarMessage = {
  to: 'reader@example.test',
  subject: '提醒',
  text: '正文',
  idempotencyKey: 'radar-confirm-isolated-test',
};
const all = radarEmailProviders({
  RADAR_RESEND_API_KEY: 're_test',
  RADAR_EMAIL_FROM: 'Reset Radar <' + from + '>',
  RADAR_BREVO_API_KEY: 'brevo-test',
  RADAR_BREVO_FROM: from,
  RADAR_MAILJET_API_KEY: 'mailjet-test',
  RADAR_MAILJET_SECRET_KEY: 'test-secret',
  RADAR_MAILJET_FROM: from,
});

let http: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>;

function respond(response: () => Response) {
  http = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(async () => response(), { preconnect() {} }),
  );
}

afterEach(() => http?.mockRestore());

test('only enables fully configured provider and sender pairs', () => {
  expect([...all.keys()].sort()).toEqual(['brevo', 'mailjet', 'resend']);
  expect(
    radarEmailProviders({
      RADAR_MAILJET_API_KEY: 'public-only',
      RADAR_MAILJET_FROM: from,
      RADAR_BREVO_FROM: from,
      RADAR_RESEND_API_KEY: 're_test',
      RADAR_EMAIL_FROM: 'invalid',
    }).size,
  ).toBe(0);
});

test.each([
  {
    provider: 'brevo',
    url: 'https://api.brevo.com/v3/smtp/email',
    header: 'api-key',
    authentication: 'brevo-test',
    body: {
      sender: { name: '号没了~重置雷达', email: from },
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
    },
    receipt: { messageId: '<test@example.test>' },
  },
  {
    provider: 'mailjet',
    url: 'https://api.mailjet.com/v3.1/send',
    header: 'Authorization',
    authentication: 'Basic ' + btoa('mailjet-test:test-secret'),
    body: {
      Messages: [
        {
          From: { Name: '号没了~重置雷达', Email: from },
          To: [{ Email: message.to }],
          Subject: message.subject,
          TextPart: message.text,
        },
      ],
    },
    receipt: {
      Messages: [{ Status: 'success', To: [{ MessageUUID: 'fake-id' }] }],
    },
  },
] as const)(
  'uses the $provider API with one private recipient',
  async ({ provider, url, header, authentication, body, receipt }) => {
    respond(() => Response.json(receipt));
    expect(
      await deliverRadarEmail(provider, all.get(provider)!, message),
    ).toEqual({ status: 'sent' });
    const [requestUrl, options] = http.mock.calls[0];
    expect(String(requestUrl)).toBe(url);
    expect(options?.method).toBe('POST');
    expect(new Headers(options?.headers).get(header)).toBe(authentication);
    expect(JSON.parse(String(options?.body))).toEqual(body);
  },
);

test.each([
  ['mailjet', { Messages: [{ Status: 'error' }] }, 'rejected'],
  ['brevo', {}, 'unknown'],
  ['mailjet', { Messages: [{ Status: 'success', To: [] }] }, 'unknown'],
] as const)(
  'checks recipient acceptance in a %s HTTP 200 response',
  async (provider, receipt, expected) => {
    respond(() => Response.json(receipt));
    expect(
      (await deliverRadarEmail(provider, all.get(provider)!, message)).status,
    ).toBe(expected);
  },
);

test('distinguishes daily account exhaustion from per-second limiting', async () => {
  const provider: RadarProvider = 'resend';
  respond(() =>
    Response.json({ name: 'daily_quota_exceeded' }, { status: 429 }),
  );
  const result = await deliverRadarEmail(provider, all.get(provider)!, message);
  const midnight = new Date();
  expect(result).toEqual({
    status: 'rejected',
    retry: true,
    blockedUntil: midnight.setUTCHours(24, 0, 0, 0),
  });
});

test('reports Resend server usage without treating a missing quota header as zero', async () => {
  respond(() =>
    Response.json(
      { id: 'receipt' },
      { headers: { 'x-resend-daily-quota': '57' } },
    ),
  );
  expect(
    await deliverRadarEmail('resend', all.get('resend')!, message),
  ).toEqual({
    status: 'sent',
    usage: { day: 57, month: null },
  });
  const body = JSON.parse(String(http.mock.calls[0][1]?.body));
  expect(body.from).toBe('号没了~重置雷达 <radar@example.test>');
});

test('a lost Brevo response is recorded as ambiguous', async () => {
  respond(() => {
    throw new Error('Connection interrupted');
  });
  expect(await deliverRadarEmail('brevo', all.get('brevo')!, message)).toEqual({
    status: 'unknown',
  });
});

test.each([
  ['resend', 401, { name: 'missing_api_key' }],
  ['brevo', 403, { code: 'permission_denied' }],
  [
    'mailjet',
    200,
    {
      Messages: [
        {
          Status: 'error',
          Errors: [
            {
              StatusCode: 403,
              ErrorCode: 'send-0008',
              ErrorRelatedTo: ['From'],
            },
          ],
        },
      ],
    },
  ],
  [
    'mailjet',
    400,
    { StatusCode: 400, ErrorMessage: 'Daily Send Limit has been reached' },
  ],
] as const)(
  'temporarily disables %s for an account-wide failure on HTTP %d',
  async (provider, httpStatus, body) => {
    respond(() => Response.json(body, { status: httpStatus }));
    const result = await deliverRadarEmail(
      provider,
      all.get(provider)!,
      message,
    );
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.retry).toBe(true);
      expect(result.blockedUntil).toBeGreaterThan(Date.now() + 59 * 60_000);
    }
  },
);

test.each([
  [
    'mailjet',
    {
      Messages: [
        {
          Status: 'error',
          Errors: [{ StatusCode: 403, ErrorRelatedTo: ['To[0].Email'] }],
        },
      ],
    },
  ],
] as const)(
  'isolates a %s recipient policy failure without disabling the sender',
  async (provider, body) => {
    respond(() => Response.json(body, { status: 403 }));
    expect(
      await deliverRadarEmail(provider, all.get(provider)!, message),
    ).toEqual({ status: 'rejected', retry: false });
  },
);

test('limits a Mailjet rate cooldown to five minutes even for a longer Retry-After', async () => {
  respond(() =>
    Response.json(
      { Messages: [{ Status: 'error', Errors: [{ StatusCode: 429 }] }] },
      { headers: { 'Retry-After': '99999' } },
    ),
  );
  const before = Date.now();
  const result = await deliverRadarEmail(
    'mailjet',
    all.get('mailjet')!,
    message,
  );
  expect(result.status).toBe('rejected');
  if (result.status === 'rejected') {
    expect(result.blockedUntil).toBeGreaterThanOrEqual(before + 5 * 60_000);
    expect(result.blockedUntil).toBeLessThanOrEqual(Date.now() + 5 * 60_000);
  }
});

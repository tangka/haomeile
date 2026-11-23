import type { RadarProvider } from './radar-email-capacity';
import { normalizeRadarEmail } from './radar-email-store';

type Environment = Record<string, string | undefined>;

export interface RadarMessage {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}

interface ProviderConfig {
  sender: string;
  url: string;
  headers: Record<string, string>;
}

type DeliveryResult =
  | { status: 'sent' | 'unknown' }
  | {
      status: 'rejected';
      retry: boolean;
      blockedUntil?: number;
    };

export function radarEmailProviders(values: Environment) {
  const providers = new Map<RadarProvider, ProviderConfig>();
  const add = (
    id: RadarProvider,
    from: string | undefined,
    url: string,
    headers: Record<string, string>,
  ) => {
    const mailbox = from?.trim();
    const address =
      mailbox?.match(/^[^<>\r\n]*<([^<>\r\n]+)>$/)?.[1] ?? mailbox;
    const sender = normalizeRadarEmail(address);
    if (sender) providers.set(id, { sender, url, headers });
  };
  const resend = values.RADAR_RESEND_API_KEY?.trim();
  if (resend?.startsWith('re_'))
    add('resend', values.RADAR_EMAIL_FROM, 'https://api.resend.com/emails', {
      Authorization: 'Bearer ' + resend,
    });
  const brevo = values.RADAR_BREVO_API_KEY?.trim();
  if (brevo)
    add(
      'brevo',
      values.RADAR_BREVO_FROM,
      'https://api.brevo.com/v3/smtp/email',
      {
        'api-key': brevo,
      },
    );
  const mailjet = values.RADAR_MAILJET_API_KEY?.trim();
  const secret = values.RADAR_MAILJET_SECRET_KEY?.trim();
  if (mailjet && secret)
    add(
      'mailjet',
      values.RADAR_MAILJET_FROM,
      'https://api.mailjet.com/v3.1/send',
      {
        Authorization:
          'Basic ' + Buffer.from(mailjet + ':' + secret).toString('base64'),
      },
    );
  return providers;
}

function payload(id: RadarProvider, email: string, message: RadarMessage) {
  const { to, subject, text } = message;
  const name = '号没了~重置雷达';
  const from = `${name} <${email}>`;
  switch (id) {
    case 'resend':
      return { from, to: [to], subject, text };
    case 'brevo':
      return {
        sender: { name, email },
        to: [{ email: to }],
        subject,
        textContent: text,
      };
    case 'mailjet':
      return {
        Messages: [
          {
            From: { Name: name, Email: email },
            To: [{ Email: to }],
            Subject: subject,
            TextPart: text,
          },
        ],
      };
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function nonempty(value: unknown) {
  return typeof value === 'string' && value.length > 0;
}

function receipt(
  id: RadarProvider,
  body: Record<string, unknown>,
): DeliveryResult {
  switch (id) {
    case 'resend':
      if (nonempty(body.id)) return { status: 'sent' };
      break;
    case 'brevo':
      if (nonempty(body.messageId)) return { status: 'sent' };
      break;
    case 'mailjet': {
      const message = Array.isArray(body.Messages)
        ? record(body.Messages[0])
        : {};
      if (
        message.Status === 'success' &&
        Array.isArray(message.To) &&
        nonempty(record(message.To[0]).MessageUUID)
      )
        return { status: 'sent' };
      if (message.Status === 'error')
        return { status: 'rejected', retry: false };
      break;
    }
  }
  return { status: 'unknown' };
}

function retryAt(response: Response, fallback: number, maximum: number) {
  const value = response.headers.get('Retry-After');
  const now = Date.now();
  const milliseconds =
    value && /^\d+$/.test(value)
      ? Number(value) * 1_000
      : Date.parse(value ?? '') - now;
  const wait =
    Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : fallback;
  return now + Math.max(1_000, Math.min(wait, maximum));
}

function rejectedDelivery(
  provider: RadarProvider,
  response: Response,
  body: Record<string, unknown>,
  receiptResult: DeliveryResult,
): DeliveryResult {
  const minute = 60_000;
  const hour = 60 * minute;
  let status = response.status;
  let message = String(body.message ?? '');
  let code = String(body.code ?? body.name ?? '');
  let recipientError = false;
  let explicitError = receiptResult.status === 'rejected';

  if (provider === 'mailjet') {
    const entry = Array.isArray(body.Messages) ? record(body.Messages[0]) : {};
    if (entry.Status === 'success') return { status: 'unknown' };
    const errors =
      entry.Status === 'error' && Array.isArray(entry.Errors)
        ? entry.Errors.map(record)
        : [body];
    const detail =
      errors.find((error) =>
        [401, 403, 429].includes(Number(error.StatusCode)),
      ) ??
      errors[0] ??
      {};
    code = String(detail.ErrorCode ?? '');
    message = String(detail.ErrorMessage ?? '');
    if (typeof detail.StatusCode === 'number') status = detail.StatusCode;
    recipientError =
      Array.isArray(detail.ErrorRelatedTo) &&
      detail.ErrorRelatedTo.some(
        (v) => typeof v === 'string' && /^(To|Cc|Bcc)(?:$|\b)/i.test(v),
      );
    explicitError ||=
      entry.Status === 'error' ||
      Boolean(code) ||
      (typeof detail.StatusCode === 'number' && detail.StatusCode >= 400);
  }
  if (response.ok && !explicitError) return { status: 'unknown' };
  if (
    !response.ok &&
    (response.status >= 500 || [408, 409].includes(response.status))
  )
    return { status: 'unknown' };

  recipientError ||=
    /(?:recipient|mailbox).*?(?:not (?:on|allowed)|suppress|blocklist|blocked|over quota|full|banned)|asked not to receive/i.test(
      message,
    );
  if (recipientError) return { status: 'rejected', retry: false };

  let blockedUntil: number | undefined;
  if (provider === 'resend' && code === 'daily_quota_exceeded') {
    blockedUntil = new Date().setUTCHours(24, 0, 0, 0);
  } else if (
    code === 'monthly_quota_exceeded' ||
    code === 'not_enough_credits' ||
    (/\b(?:daily|monthly) (?:send(?:ing)? |email )?(?:quota|limit|allowance)\b/i.test(
      message,
    ) &&
      /\b(?:exhausted|exceeded|reached)\b/i.test(message))
  ) {
    // Some quotas reset on the account billing cycle and may also be upgraded manually.
    blockedUntil = retryAt(response, hour, 24 * hour);
  } else if (status === 429) {
    blockedUntil = retryAt(response, minute, 5 * minute);
  } else if (
    status === 401 ||
    status === 403 ||
    (provider === 'mailjet' && /^(?:mj-0001|mj-0015|send-000[678])$/.test(code))
  ) {
    blockedUntil = Date.now() + hour;
  }
  if (blockedUntil) return { status: 'rejected', retry: true, blockedUntil };
  if (response.ok) return { status: 'rejected', retry: status >= 500 };
  return { status: 'rejected', retry: status !== 422 };
}

function resendQuota(headers: Headers) {
  function used(name: string) {
    const raw = headers.get(name);
    if (raw === null || !/^\d+$/.test(raw)) return null;
    const value = Number(raw);
    return Number.isSafeInteger(value) ? value : null;
  }
  const day = used('x-resend-daily-quota');
  const month = used('x-resend-monthly-quota');
  return day === null && month === null ? {} : { usage: { day, month } };
}

export async function deliverRadarEmail(
  provider: RadarProvider,
  config: ProviderConfig,
  message: RadarMessage,
): Promise<
  DeliveryResult & { usage?: { day: number | null; month: number | null } }
> {
  const headers = new Headers(config.headers);
  headers.set('Content-Type', 'application/json');
  if (provider === 'resend')
    headers.set('Idempotency-Key', message.idempotencyKey);
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload(provider, config.sender, message)),
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
    });
    const body = record(await response.json().catch(() => null));
    const usage = provider === 'resend' ? resendQuota(response.headers) : {};
    const result = receipt(provider, body);
    if (response.ok && result.status === 'sent') return { ...result, ...usage };
    console.warn(
      'Radar email delivery not accepted or unconfirmed',
      provider,
      response.status,
    );
    return { ...rejectedDelivery(provider, response, body, result), ...usage };
  } catch {
    console.warn('Radar email delivery unconfirmed', provider);
  }
  // After a timeout, bad receipt or gateway error the provider may still have accepted it.
  return { status: 'unknown' };
}

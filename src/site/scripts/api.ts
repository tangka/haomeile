import { currentLocale, tr } from '../../shared/i18n';
export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(tr(message));
    this.fields = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, tr(value)]),
    );
    this.name = 'ApiRequestError';
  }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  const credentials: RequestCredentials = path.startsWith('/api/admin/')
    ? 'same-origin'
    : 'omit';
  try {
    response = await fetch(
      path,
      body === undefined
        ? { credentials, headers: { 'Accept-Language': currentLocale() } }
        : {
            method: 'POST',
            credentials,
            headers: {
              'content-type': 'application/json',
              'Accept-Language': currentLocale(),
            },
            body: JSON.stringify(body),
          },
    );
  } catch {
    throw new ApiRequestError(
      'NETWORK',
      '没连上服务器。碑文还在，稍后再点一次提交。',
      0,
    );
  }
  let result: {
    ok: boolean;
    data: T;
    error?: { code: string; message: string; fields?: Record<string, string> };
  };
  try {
    result = await response.json();
  } catch {
    throw new ApiRequestError(
      'SERVER',
      '服务器出了点问题。过几分钟再试，碑文不会丢。',
      response.status,
    );
  }
  if (!result.ok || !response.ok)
    throw new ApiRequestError(
      result.error?.code || 'SERVER',
      result.error?.message || '服务器出了点问题。过几分钟再试，碑文不会丢。',
      response.status,
      result.error?.fields,
    );
  return result.data;
}

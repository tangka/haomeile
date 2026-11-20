import type { MiddlewareHandler, ErrorHandler } from 'hono';
import type { AppEnv } from './types';
import { ApiError } from './lib/errors';
import { basePath, requestLocale, tr } from '../shared/i18n';

export const security: MiddlewareHandler<AppEnv> = async (c, next) => {
  const path = basePath(c.req.path);
  c.set('locale', requestLocale(c.req.raw));
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (
    path.startsWith('/api/') ||
    path === '/admin' ||
    path === '/admin.html' ||
    path.startsWith('/admin/')
  ) {
    c.header('X-Robots-Tag', 'noindex, nofollow');
    c.header('Cache-Control', 'no-store');
  }
  const pathname = new URL(c.req.url).pathname;
  // A double slash could become an authority when passed to the asset URL resolver.
  if (pathname.includes('%') || pathname.includes('//')) {
    c.header('X-Robots-Tag', 'noindex, nofollow');
    c.header('Cache-Control', 'no-store');
    throw new ApiError('NOT_FOUND', '这里什么也没有。', 404);
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const expected =
      c.env.ENVIRONMENT === 'development'
        ? new URL(c.req.url).origin
        : 'https://haomeile.rip';
    if (c.req.header('Origin') !== expected)
      throw new ApiError('ORIGIN', '请求来源不正确，请回到本站后重试。', 403);
    if (
      c.req.header('Content-Type')?.split(';')[0].trim().toLowerCase() !==
      'application/json'
    )
      throw new ApiError('CONTENT_TYPE', '请以 JSON 格式提交。', 415);
    const length = Number(c.req.header('Content-Length') ?? '0');
    if (length > 16384)
      throw new ApiError('TOO_LARGE', '提交内容太长了，请删减后重试。', 413);
  }
  await next();
};
export const handleError: ErrorHandler<AppEnv> = (error, c) => {
  const locale = requestLocale(c.req.raw);
  if (error instanceof ApiError)
    return c.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: tr(error.message, locale),
          ...(error.fields
            ? {
                fields: Object.fromEntries(
                  Object.entries(error.fields).map(([key, value]) => [
                    key,
                    tr(value, locale),
                  ]),
                ),
              }
            : {}),
        },
      },
      error.status as 400,
    );
  // Do not log exception bodies: requests may contain private text or credentials.
  return c.json(
    {
      ok: false,
      error: {
        code: 'SERVER',
        message: tr(
          '服务器出了点问题。不是你的问题。过几分钟再试，碑文不会丢。',
          locale,
        ),
      },
    },
    500,
  );
};

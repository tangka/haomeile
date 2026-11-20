import type { MiddlewareHandler, ErrorHandler } from 'hono';
import type { AppEnv } from './types';
import { ApiError } from './lib/errors';

export const security: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (c.req.path.startsWith('/api/') || c.req.path === '/admin' || c.req.path.startsWith('/admin/')) {
    c.header('X-Robots-Tag', 'noindex, nofollow');
    c.header('Cache-Control', 'no-store');
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const expected = c.env.ENVIRONMENT === 'development' ? new URL(c.req.url).origin : 'https://haomeile.rip';
    if (c.req.header('Origin') !== expected) throw new ApiError('ORIGIN', '请求来源不正确，请回到本站后重试。', 403);
    if (c.req.header('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new ApiError('CONTENT_TYPE', '请以 JSON 格式提交。', 415);
    const length = Number(c.req.header('Content-Length') ?? '0');
    if (length > 16384) throw new ApiError('TOO_LARGE', '提交内容太长了，请删减后重试。', 413);
  }
  await next();
};
export const handleError: ErrorHandler<AppEnv> = (error, c) => {
  if (error instanceof ApiError) return c.json({ ok: false, error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } }, error.status as 400);
  // Do not log exception bodies: requests may contain private text or credentials.
  return c.json({ ok: false, error: { code: 'SERVER', message: '服务器出了点问题。不是你的问题。过几分钟再试，碑文不会丢。' } }, 500);
};

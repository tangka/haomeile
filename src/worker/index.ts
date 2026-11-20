import { Hono } from 'hono';
import type { AppEnv, Bindings } from './types';
import { publicRoutes } from './routes/public';
import { security, handleError } from './security';
import { servePage } from './render';
import { verifyAccess } from './lib/access';
import { adminRoutes } from './routes/admin';
import { ApiError } from './lib/errors';
import { cleanup } from './cleanup';
import { sitemapResponse } from './sitemap';

const app = new Hono<AppEnv>();
app.use('*', security);
app.onError(handleError);
app.use('*', async (c, next) => {
  const path = c.req.path;
  const protectedRoute =
    path === '/admin' ||
    path === '/admin.html' ||
    path.startsWith('/admin/') ||
    path === '/api/admin' ||
    path.startsWith('/api/admin/');
  if (!protectedRoute) return next();
  c.header('X-Robots-Tag', 'noindex, nofollow');
  c.header('Cache-Control', 'no-store');
  const identity = await verifyAccess(c.req.raw, c.env);
  if (!identity) throw new ApiError('FORBIDDEN', '请先通过站长身份验证。', 403);
  c.set('actor', identity.email);
  await next();
  c.header('Cache-Control', 'no-store');
  c.header('X-Robots-Tag', 'noindex, nofollow');
});
app.get('/api/health', (c) => c.json({ ok: true, data: { status: 'ok' } }));
app.route('/api', publicRoutes);
app.route('/api/admin', adminRoutes);
app.get(
  '/sitemap.xml',
  async (c) =>
    (await sitemapResponse(
      c.env.DB,
      new URL(c.req.url),
      c.env.CF_VERSION_METADATA?.timestamp,
    ))!,
);
app.get(
  '/sitemaps/:file',
  async (c) =>
    (await sitemapResponse(
      c.env.DB,
      new URL(c.req.url),
      c.env.CF_VERSION_METADATA?.timestamp,
    )) ?? servePage(c),
);
app.all('/api/*', (c) =>
  c.json(
    { ok: false, error: { code: 'NOT_FOUND', message: '没有这个接口。' } },
    404,
  ),
);
app.get('*', servePage);
export { app };
export default {
  fetch: app.fetch,
  scheduled: async (controller, env) =>
    cleanup(env, new Date(controller.scheduledTime)),
} satisfies ExportedHandler<Bindings>;

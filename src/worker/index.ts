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
import { basePath, localePath, requestLocale, tr } from '../shared/i18n';
import type { ReadRadarOverview } from '../shared/radar';

export interface AppOptions {
  verifyAdministrator?: typeof verifyAccess;
  basicChallenge?: boolean;
  readRadarOverview?: ReadRadarOverview;
}
/** Runtime-owned authentication strategy; Workers continue to require Access JWTs. */
export function createApp(options: AppOptions = {}) {
  const app = new Hono<AppEnv>();
  app.use('*', security);
  app.onError(handleError);
  app.use('*', async (c, next) => {
    const path = basePath(c.req.path);
    const protectedRoute =
      path === '/admin' ||
      path === '/admin.html' ||
      path.startsWith('/admin/') ||
      path === '/api/admin' ||
      path.startsWith('/api/admin/');
    if (!protectedRoute) return next();
    c.header('X-Robots-Tag', 'noindex, nofollow');
    c.header('Cache-Control', 'no-store');
    const identity = await (options.verifyAdministrator ?? verifyAccess)(
      c.req.raw,
      c.env,
    );
    if (!identity) {
      if (options.basicChallenge) {
        c.header(
          'WWW-Authenticate',
          'Basic realm="Haomeile admin", charset="UTF-8"',
        );
        return c.json(
          {
            ok: false,
            error: {
              code: 'UNAUTHORIZED',
              message: tr('请先通过站长身份验证。', requestLocale(c.req.raw)),
            },
          },
          401,
        );
      }
      throw new ApiError('FORBIDDEN', '请先通过站长身份验证。', 403);
    }
    c.set('actor', identity.email);
    await next();
    c.header('Cache-Control', 'no-store');
    c.header('X-Robots-Tag', 'noindex, nofollow');
  });
  app.use('*', async (c, next) => {
    const url = new URL(c.req.url);
    const path = url.pathname;
    // API, assets and internal templates are never language redirect targets.
    const documentRequest =
      ['GET', 'HEAD'].includes(c.req.method) &&
      !/^\/(?:api|assets|_astro|_templates|sitemaps)(?:\/|$)/.test(path) &&
      (!/\.[^/]+\/?$/.test(path) || /\.html\/?$/.test(path));
    if (!documentRequest) return next();
    if (/^\/rules(?:\/index\.html|\.html)?\/?$/.test(basePath(path))) {
      c.header('Vary', 'Accept-Language');
      c.header('Cache-Control', 'private, no-store');
      return c.redirect(
        localePath('/submit', requestLocale(c.req.raw)) + '#posting-rules',
        302,
      );
    }
    await next();
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
        c.env.SITE_ORIGIN,
      ))!,
  );
  app.get(
    '/sitemaps/:file',
    async (c) =>
      (await sitemapResponse(
        c.env.DB,
        new URL(c.req.url),
        c.env.CF_VERSION_METADATA?.timestamp,
        c.env.SITE_ORIGIN,
      )) ?? servePage(c),
  );
  app.all('/api/*', (c) =>
    c.json(
      {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: tr('没有这个接口。', requestLocale(c.req.raw)),
        },
      },
      404,
    ),
  );
  app.get('*', (c) => servePage(c, options.readRadarOverview));
  return app;
}
export const app = createApp();
export default {
  fetch: app.fetch,
  scheduled: async (controller, env) =>
    cleanup(env, new Date(controller.scheduledTime)),
} satisfies ExportedHandler<Bindings>;

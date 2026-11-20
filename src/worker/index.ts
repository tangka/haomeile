import { Hono } from 'hono';
import type { AppEnv } from './types';
import { publicRoutes } from './routes/public';
import { security, handleError } from './security';
import { servePage } from './render';

const app = new Hono<AppEnv>();
app.use('*', security);
app.onError(handleError);
app.get('/api/health', (c) => c.json({ ok: true, data: { status: 'ok' } }));
app.route('/api', publicRoutes);
app.all('/api/*', (c) => c.json({ ok: false, error: { code: 'NOT_FOUND', message: '没有这个接口。' } }, 404));
app.get('*', servePage);
export default app;

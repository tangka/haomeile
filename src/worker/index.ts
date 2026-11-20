import { Hono } from 'hono';

const app = new Hono<{ Bindings: { ASSETS: Fetcher } }>();
app.get('/api/health', (c) => c.json({ ok: true, data: { status: 'ok' } }));
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw));
export default app;

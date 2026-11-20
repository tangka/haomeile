import type { Bindings } from './types';
import { beijingDay, shiftDay } from './lib/time';
export async function cleanup(env: Pick<Bindings, 'DB'>, now = new Date()): Promise<void> {
  const cutoff = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
  const day = shiftDay(beijingDay(now), -2);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM tombstones WHERE status='rejected' AND updated_at<?").bind(cutoff(30)),
    env.DB.prepare('DELETE FROM reports WHERE resolved_at IS NOT NULL AND resolved_at<?').bind(cutoff(90)),
    env.DB.prepare('DELETE FROM rate_limits WHERE window_start<?').bind(day),
    env.DB.prepare('DELETE FROM flowers WHERE day<?').bind(day),
  ]);
}

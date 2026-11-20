import { sha256, requirePepper } from './crypto';
import { ApiError } from './errors';
import { beijingDay } from './time';
export interface RateReservation { key: string; window: string }
export async function reserveRate(db: D1Database, pepper: string, ip: string | null, action: string, maximum: number, hourly = false, now = new Date()): Promise<RateReservation> {
  requirePepper(pepper);
  const day = beijingDay(now);
  const key = action + ':' + await sha256((ip || 'unknown') + pepper + day);
  const window = hourly ? now.toISOString().slice(0, 13) : day;
  const row = await db.prepare('INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1) ON CONFLICT(key, window_start) DO UPDATE SET count=count+1 RETURNING count').bind(key, window).first<{ count: number }>();
  if (!row || row.count > maximum) {
    const message = action === 'submit' ? '今天立碑的次数到上限了。同一网络每天最多立 3 块，明天再来。' : action === 'auth' ? '凭据尝试次数过多，请一小时后再试。' : '今天操作的次数到上限了，明天再来。';
    throw new ApiError('RATE_LIMITED', message, 429);
  }
  return { key, window };
}
export async function releaseRate(db: D1Database, reservation: RateReservation): Promise<void> {
  await db.prepare('UPDATE rate_limits SET count=MAX(0,count-1) WHERE key=? AND window_start=?').bind(reservation.key, reservation.window).run();
}

export interface LifeDates {
  born_at: string | null;
  born_precision: string;
  died_at: string;
}
export function fmtDate(value: string | null | undefined): string {
  return value ? String(value).replaceAll('-', '.') : '';
}
export function daysBetween(from: string, to: string): number | null {
  const parse = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, (month || 1) - 1, day || 1);
  };
  const count = Math.round((parse(to) - parse(from)) / 86400000);
  return Number.isFinite(count) && count >= 0 ? count : null;
}
export function num(value: number): string {
  return Number(value).toLocaleString('zh-CN');
}
export function lifeLine(tomb: LifeDates): { days: string; range: string } {
  const died = fmtDate(tomb.died_at);
  if (tomb.born_precision === 'none' || !tomb.born_at)
    return { days: '存活天数不详', range: `卒于 ${died}` };
  const days = daysBetween(tomb.born_at, tomb.died_at);
  if (days === null) return { days: '存活天数不详', range: `卒于 ${died}` };
  return {
    days: `${tomb.born_precision === 'month' ? '存活约 ' : '存活 '}${num(days)} 天`,
    range: `${fmtDate(tomb.born_at)} 至 ${died}`,
  };
}
export function ago(value: string | number, now = Date.now()): string {
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} 天前`;
  return fmtDate(date.toISOString().slice(0, 10));
}

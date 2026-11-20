const DAY = 86_400_000;
export function beijingDay(now: Date | number = Date.now()): string {
  return new Date(Number(now) + 8 * 3_600_000).toISOString().slice(0, 10);
}
export function shiftDay(day: string, amount: number): string {
  return new Date(Date.parse(day + 'T00:00:00Z') + amount * DAY).toISOString().slice(0, 10);
}
export function beijingMidnight(day: string): string {
  return new Date(Date.parse(day + 'T00:00:00Z') - 8 * 3_600_000).toISOString();
}
export function validDate(value: string, precision: 'day' | 'month' = 'day'): boolean {
  if (!(precision === 'month' ? /^\d{4}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/).test(value)) return false;
  const full = precision === 'month' ? value + '-01' : value;
  const date = new Date(full + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === full;
}

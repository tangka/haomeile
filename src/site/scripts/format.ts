import type { Locale } from '../../shared/i18n';
export interface LifeDates {
  born_at: string | null;
  born_precision: string;
  died_at: string;
}
export function fmtDate(
  value: string | null | undefined,
  locale: Locale = 'zh',
): string {
  return value
    ? locale === 'en'
      ? String(value)
      : String(value).replaceAll('-', '.')
    : '';
}
export function daysBetween(from: string, to: string): number | null {
  const parse = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, (month || 1) - 1, day || 1);
  };
  const count = Math.round((parse(to) - parse(from)) / 86400000);
  return Number.isFinite(count) && count >= 0 ? count : null;
}
export function num(value: number, locale: Locale = 'zh'): string {
  return Number(value).toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN');
}
export function fmtMemorialNumber(value: number): string {
  return '#' + String(value).padStart(4, '0');
}
export function flowerPresentation(
  count: number,
  locale: Locale,
  pressed = false,
): { label: string; ariaLabel: string } {
  const english = locale === 'en';
  const name = english ? 'Flowers' : '献花';
  const label = count > 0 ? `${name} ${num(count, locale)}` : name;
  const action = english
    ? pressed
      ? 'You already left a flower today'
      : 'Leave a flower for this memorial'
    : pressed
      ? '今天已献过花'
      : '为这块碑献一朵花';
  return {
    label,
    ariaLabel: label + (english ? '. ' : '，') + action,
  };
}
export function lifeLine(
  tomb: LifeDates,
  locale: Locale = 'zh',
): { days: string; range: string } {
  const died = fmtDate(tomb.died_at, locale);
  const unknown = {
    days: locale === 'en' ? 'Lifespan unknown' : '存活天数不详',
    range: locale === 'en' ? `Died ${died}` : `卒于 ${died}`,
  };
  if (tomb.born_precision === 'none' || !tomb.born_at) return unknown;
  const days = daysBetween(tomb.born_at, tomb.died_at);
  if (days === null) return unknown;
  return {
    days:
      locale === 'en'
        ? `Lived ${tomb.born_precision === 'month' ? 'about ' : ''}${num(days, locale)} ${days === 1 ? 'day' : 'days'}`
        : `${tomb.born_precision === 'month' ? '存活约 ' : '存活 '}${num(days)} 天`,
    range: `${fmtDate(tomb.born_at, locale)} ${locale === 'en' ? 'to' : '至'} ${died}`,
  };
}
export function ago(
  value: string | number,
  now = Date.now(),
  locale: Locale = 'zh',
): string {
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 60) return locale === 'en' ? 'Just now' : '刚刚';
  if (locale === 'en') {
    if (seconds < 3600) {
      const count = Math.floor(seconds / 60);
      return `${count} ${count === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (seconds < 86400) {
      const count = Math.floor(seconds / 3600);
      return `${count} ${count === 1 ? 'hour' : 'hours'} ago`;
    }
    if (seconds < 7 * 86400) {
      const count = Math.floor(seconds / 86400);
      return `${count} ${count === 1 ? 'day' : 'days'} ago`;
    }
  }
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} 天前`;
  return fmtDate(date.toISOString().slice(0, 10), locale);
}

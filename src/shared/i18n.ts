import { EN_STATIC } from './en-static';
import { EN_DYNAMIC } from './en-dynamic';

export type Locale = 'zh' | 'en';
export function currentLocale(): Locale {
  const browser = globalThis as typeof globalThis & {
    document?: { documentElement?: { lang?: string } };
  };
  return browser.document?.documentElement?.lang?.startsWith('en')
    ? 'en'
    : 'zh';
}
export function routeLocale(path: string): Locale {
  return /^\/en(?:\/|$)/.test(path) ? 'en' : 'zh';
}
/** Match the browser's first preferred language, including regional Chinese. */
export function browserLocale(acceptLanguage: string | null): Locale {
  const preferred = (acceptLanguage || '')
    .split(',')
    .map((entry, index) => {
      const [tag, ...parameters] = entry.trim().toLowerCase().split(';');
      const quality = parameters.find((part) => part.trim().startsWith('q='));
      const weight =
        quality === undefined ? 1 : Number(quality.trim().slice(2));
      return { tag, weight, index };
    })
    .filter(
      ({ tag, weight }) =>
        /^[a-z]{1,8}(?:-[a-z0-9]{1,8})*$/.test(tag) &&
        weight > 0 &&
        weight <= 1,
    )
    .sort((a, b) => b.weight - a.weight || a.index - b.index)[0];
  return !preferred || /^zh(?:-|$)/.test(preferred.tag) ? 'zh' : 'en';
}
export function basePath(path: string): string {
  return routeLocale(path) === 'en' ? path.slice(3) || '/' : path;
}
export function localePath(
  path: string,
  locale: Locale = currentLocale(),
): string {
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    /^\/(?:api|assets|_astro)(?:\/|$)/.test(path)
  )
    return path;
  const base = basePath(path);
  return locale === 'en'
    ? '/en' + (base.startsWith('/') ? base : '/' + base)
    : base;
}
export function requestLocale(request: Request): Locale {
  const path = new URL(request.url).pathname;
  return routeLocale(path) === 'en'
    ? 'en'
    : browserLocale(request.headers.get('Accept-Language'));
}
export function normalizeText(source: string): string {
  return source.replace(/\s+/g, ' ').trim();
}
const messages = { ...EN_STATIC, ...EN_DYNAMIC };
const normalizedMessages = new Map(
  Object.entries(messages).map(([key, value]) => [normalizeText(key), value]),
);
const patterns = Object.entries(messages)
  .filter(([key]) => /\{\w+\}/.test(key))
  .map(([key, value]) => {
    const names: string[] = [];
    const source = normalizeText(key)
      .split(/(\{\w+\})/)
      .map((part) => {
        if (/^\{\w+\}$/.test(part)) {
          names.push(part.slice(1, -1));
          return '(.+?)';
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('');
    return { regex: new RegExp('^' + source + '$'), names, value };
  });
export function tr(
  source: string,
  locale: Locale = currentLocale(),
  english?: string,
): string {
  if (locale === 'zh') return source;
  if (english !== undefined) return english;
  const normalized = normalizeText(source);
  const direct = messages[source] ?? normalizedMessages.get(normalized);
  if (direct !== undefined) return direct;
  for (const { regex, names, value } of patterns) {
    const match = regex.exec(normalized);
    if (match)
      return value.replace(
        /\{(\w+)\}/g,
        (_, key: string) => match[names.indexOf(key) + 1] || '',
      );
  }
  return source;
}

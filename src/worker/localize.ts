import {
  basePath,
  localePath,
  requestLocale,
  tr,
  type Locale,
} from '../shared/i18n';
import {
  DEFAULT_SITE_ORIGIN,
  siteOrigin,
  templateSiteUrl,
} from '../shared/site';

const entities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};
export function decodeHtml(value: string): string {
  return value.replace(
    /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
    (whole, code: string) => {
      if (code.startsWith('#')) {
        const point =
          code[1].toLowerCase() === 'x'
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        return point > 0 && point <= 0x10ffff
          ? String.fromCodePoint(point)
          : whole;
      }
      return entities[code.toLowerCase()] ?? whole;
    },
  );
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        ch
      ]!,
  );
function translateJson(value: unknown, locale: Locale, site: string): unknown {
  if (typeof value === 'string') return tr(value, locale);
  if (Array.isArray(value))
    return value.map((entry) => translateJson(entry, locale, site));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        key === 'inLanguage' && locale === 'en'
          ? 'en'
          : [
                'url',
                'item',
                '@id',
                'image',
                'contentUrl',
                'thumbnailUrl',
              ].includes(key) &&
              typeof entry === 'string' &&
              templateSiteUrl(entry, site)
            ? site +
              localePath(new URL(entry).pathname, locale) +
              new URL(entry).search +
              new URL(entry).hash
            : translateJson(entry, locale, site),
      ]),
    );
  return value;
}
// Only trusted build templates enter this pass. User content is inserted afterwards.
export function localizeTemplate(
  html: string,
  locale: Locale,
  configuredOrigin = DEFAULT_SITE_ORIGIN,
): string {
  const site = siteOrigin(configuredOrigin);
  if (locale === 'zh' && site === DEFAULT_SITE_ORIGIN) return html;
  return html.replace(
    /<!--[^]*?-->|<script\b[^>]*>[^]*?<\/script\s*>|<style\b[^>]*>[^]*?<\/style\s*>|<(?:[^'">]|"[^"]*"|'[^']*')*>|[^<]+/gi,
    (token) => {
      if (/^<script\b/i.test(token)) {
        if (!/\btype=["']application\/ld\+json["']/i.test(token)) return token;
        return token.replace(
          /(>)([^]*)(<\/script\s*>)/i,
          (_, open, json: string, close) => {
            try {
              return (
                open +
                JSON.stringify(
                  translateJson(JSON.parse(json), locale, site),
                ).replace(/</g, '\\u003c') +
                close
              );
            } catch {
              return open + json + close;
            }
          },
        );
      }
      if (/^<(?:style\b|!--)/i.test(token)) return token;
      if (token.startsWith('<')) {
        // Never translate enum values, URLs, IDs, data attributes or scripts.
        return token.replace(
          /(\s(?:title|placeholder|alt|aria-label|content)\s*=\s*)(["'])([^]*?)\2/gi,
          (whole, prefix: string, quote: string, value: string) => {
            const decoded = decodeHtml(value),
              translated = tr(decoded, locale);
            return translated === decoded
              ? whole
              : prefix + quote + escape(translated) + quote;
          },
        );
      }
      const decoded = decodeHtml(token),
        translated = tr(decoded, locale);
      if (translated === decoded) return token;
      return (
        (token.match(/^\s*/)?.[0] || '') +
        escape(translated) +
        (token.match(/\s*$/)?.[0] || '')
      );
    },
  );
}

export function languageRewriter(
  request: Request,
  configuredOrigin = DEFAULT_SITE_ORIGIN,
): HTMLRewriter {
  const site = siteOrigin(configuredOrigin);
  const locale = requestLocale(request),
    url = new URL(request.url);
  const path =
    basePath(url.pathname)
      .replace(/\/index\.html$/, '/')
      .replace(/\.html$/, '')
      .replace(/\/$/, '') || '/';
  return new HTMLRewriter()
    .on('html', {
      element: (el) => {
        el.setAttribute('lang', locale === 'en' ? 'en' : 'zh-CN');
      },
    })
    .on('a[href]', {
      element: (el) => {
        const href = el.getAttribute('href') || '';
        const internal = templateSiteUrl(href, site);
        el.setAttribute(
          'href',
          internal
            ? site +
                localePath(internal.pathname, locale) +
                internal.search +
                internal.hash
            : localePath(href, locale),
        );
      },
    })
    .on('link[rel="canonical"],meta[property="og:url"]', {
      element: (el) => {
        const attribute = el.tagName === 'link' ? 'href' : 'content';
        el.setAttribute(attribute, site + localePath(path, locale));
      },
    })
    .on('meta[property="og:image"]', {
      element: (el) => {
        const original = el.getAttribute('content') || '';
        const internal = templateSiteUrl(original, site);
        if (internal)
          el.setAttribute(
            'content',
            site + internal.pathname + internal.search + internal.hash,
          );
      },
    })
    .on('meta[property="og:locale"]', {
      element: (el) => {
        el.setAttribute('content', locale === 'en' ? 'en_US' : 'zh_CN');
      },
    })
    .on('head', {
      element: (el) => {
        const href = (target: Locale) => site + localePath(path, target);
        el.append(
          `<link rel="alternate" hreflang="zh-CN" href="${escape(href('zh'))}"><link rel="alternate" hreflang="en" href="${escape(href('en'))}"><link rel="alternate" hreflang="x-default" href="${escape(href('zh'))}">`,
          { html: true },
        );
      },
    });
}

import {
  basePath,
  localePath,
  requestLocale,
  tr,
  type Locale,
} from '../shared/i18n';

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
function translateJson(value: unknown): unknown {
  if (typeof value === 'string') return tr(value, 'en');
  if (Array.isArray(value)) return value.map(translateJson);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        key === 'inLanguage'
          ? 'en'
          : key === 'url' &&
              typeof entry === 'string' &&
              entry.startsWith('https://haomeile.rip/')
            ? 'https://haomeile.rip' + localePath(new URL(entry).pathname, 'en')
            : translateJson(entry),
      ]),
    );
  return value;
}
// Only trusted build templates enter this pass. User content is inserted afterwards.
export function localizeTemplate(html: string, locale: Locale): string {
  if (locale === 'zh') return html;
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
                JSON.stringify(translateJson(JSON.parse(json))).replace(
                  /</g,
                  '\\u003c',
                ) +
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

export function languageRewriter(request: Request): HTMLRewriter {
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
        const target = el.getAttribute('data-locale-switch');
        if (target === 'en' || target === 'zh') {
          el.setAttribute('href', localePath(path, target) + url.search);
          el.setAttribute('hreflang', target === 'en' ? 'en' : 'zh-CN');
          if (target === locale) el.setAttribute('aria-current', 'page');
          else el.removeAttribute('aria-current');
        } else {
          const href = el.getAttribute('href') || '';
          el.setAttribute('href', localePath(href, locale));
        }
      },
    })
    .on('link[rel="canonical"],meta[property="og:url"]', {
      element: (el) => {
        const attribute = el.tagName === 'link' ? 'href' : 'content';
        const href = el.getAttribute(attribute);
        if (href?.startsWith('https://haomeile.rip')) {
          const canonical = new URL(href);
          canonical.pathname = localePath(canonical.pathname, locale);
          el.setAttribute(attribute, canonical.toString());
        }
      },
    })
    .on('meta[property="og:locale"]', {
      element: (el) => {
        el.setAttribute('content', locale === 'en' ? 'en_US' : 'zh_CN');
      },
    })
    .on('head', {
      element: (el) => {
        const href = (target: Locale) =>
          'https://haomeile.rip' + localePath(path, target);
        el.append(
          `<link rel="alternate" hreflang="zh-CN" href="${escape(href('zh'))}"><link rel="alternate" hreflang="en" href="${escape(href('en'))}"><link rel="alternate" hreflang="x-default" href="${escape(href('zh'))}">`,
          { html: true },
        );
      },
    });
}

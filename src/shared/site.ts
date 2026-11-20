export const DEFAULT_SITE_ORIGIN = 'https://haomeile.rip';

/** Deployment configuration is trusted only after it has been reduced to an origin. */
export function siteOrigin(value: string = DEFAULT_SITE_ORIGIN): string {
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error(
      'SITE_ORIGIN must be an HTTP(S) origin without credentials, path, query or fragment.',
    );
  return url.origin;
}

/** Recognize first-party URLs in trusted templates without rewriting external links. */
export function templateSiteUrl(
  value: string,
  configuredOrigin: string,
): URL | null {
  try {
    const url = new URL(value);
    return [DEFAULT_SITE_ORIGIN, configuredOrigin].includes(url.origin)
      ? url
      : null;
  } catch {
    return null;
  }
}

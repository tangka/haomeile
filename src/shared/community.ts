/** Public, direct discussion links only; never use this to fetch untrusted URLs. */
export function safeCommunitySource(
  value: string | null | undefined,
): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  const source = value.trim();
  if (
    !source ||
    source.includes('\\') ||
    source.includes('%') ||
    Array.from(source).some((character) => character.charCodeAt(0) <= 32)
  )
    return null;
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port)
    return null;
  const host = url.hostname.toLowerCase();
  if (host === 'github.com') {
    const match =
      /^\/([a-z\d][a-z\d-]{0,38})\/([a-z\d_.-]+)\/issues\/([1-9]\d*)\/?$/i.exec(
        url.pathname,
      );
    if (!match) return null;
    return `https://github.com/${match[1].toLowerCase()}/${match[2].toLowerCase()}/issues/${match[3]}`;
  }
  if (['reddit.com', 'www.reddit.com', 'old.reddit.com'].includes(host)) {
    const post =
      /^\/r\/[a-z\d_]+\/comments\/([a-z\d]+)(?:\/[^/]+)?\/?$/i.exec(
        url.pathname,
      ) || /^\/comments\/([a-z\d]+)(?:\/[^/]+)?\/?$/i.exec(url.pathname);
    if (!post) return null;
    return `https://www.reddit.com/comments/${post[1].toLowerCase()}/`;
  }
  if (
    [
      'x.com',
      'www.x.com',
      'twitter.com',
      'www.twitter.com',
      'mobile.twitter.com',
    ].includes(host)
  ) {
    const post =
      /^\/(?:[a-z\d_]{1,15}|i\/web)\/status\/([1-9]\d{0,19})\/?$/i.exec(
        url.pathname,
      );
    if (!post) return null;
    return `https://x.com/i/status/${post[1]}`;
  }
  if (host === 'discuss.ai.google.dev' || host === 'community.openai.com') {
    const match = /^\/t\/(?:[a-z\d][a-z\d-]*\/)?([1-9]\d*)\/?$/i.exec(
      url.pathname,
    );
    if (!match) return null;
    return `https://${host}/t/${match[1]}`;
  }
  return null;
}

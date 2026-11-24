import {
  BAIDU_PUSH_ENDPOINT,
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  WEBSUB_HUB,
  expandNotificationUrls,
} from '../shared/indexnow';
import type { RadarOverview } from '../shared/radar';
import { DEFAULT_SITE_ORIGIN, siteOrigin } from '../shared/site';

export interface SearchPushResult {
  skipped?: boolean;
  urls: number;
  indexNow?: { ok: boolean; status?: number };
  webSub?: { ok: boolean; statuses: number[] };
  baidu?: { ok: boolean; status?: number };
}

export interface SearchPushOptions {
  origin?: string;
  environment?: string;
  baiduToken?: string;
  fetchImpl?: typeof fetch;
}

const RADAR_HIGH_THRESHOLD = 80;
const RADAR_DELTA_THRESHOLD = 15;
const RADAR_COOLDOWN_MS = 6 * 60 * 60_000;

export interface RadarPushTracker {
  lastSnapshot: Map<string, number>;
  lastPushedAt: number;
}

export function createRadarPushTracker(): RadarPushTracker {
  return { lastSnapshot: new Map(), lastPushedAt: 0 };
}

/** Avoid spamming search engines on every 30-minute tick; notify on first read, >80% spikes, or >=15pt shifts after cooldown. */
export function shouldNotifyRadar(
  tracker: RadarPushTracker,
  overview: RadarOverview | null,
  now = Date.now(),
): boolean {
  if (!overview || overview.stale || !overview.platforms.length) return false;
  const current = new Map(
    overview.platforms.map((p) => [p.name, p.probability]),
  );
  if (tracker.lastSnapshot.size === 0) {
    tracker.lastSnapshot = current;
    tracker.lastPushedAt = now;
    return true;
  }
  let crossedHigh = false;
  let bigShift = false;
  for (const [name, prob] of current) {
    const prev = tracker.lastSnapshot.get(name) ?? 0;
    if (prev <= RADAR_HIGH_THRESHOLD && prob > RADAR_HIGH_THRESHOLD)
      crossedHigh = true;
    if (Math.abs(prob - prev) >= RADAR_DELTA_THRESHOLD) bigShift = true;
  }
  if (crossedHigh || (bigShift && now - tracker.lastPushedAt >= RADAR_COOLDOWN_MS)) {
    tracker.lastSnapshot = current;
    tracker.lastPushedAt = now;
    return true;
  }
  return false;
}

export async function notifySearchEngines(
  paths: readonly string[],
  options: SearchPushOptions = {},
): Promise<SearchPushResult> {
  const origin = siteOrigin(options.origin || DEFAULT_SITE_ORIGIN);
  const urls = expandNotificationUrls(paths, origin);
  const isProd =
    options.environment === 'production' && origin === DEFAULT_SITE_ORIGIN;
  if (!isProd || urls.length === 0) {
    return { skipped: true, urls: urls.length };
  }

  const doFetch = options.fetchImpl ?? fetch;
  const host = new URL(origin).hostname;
  const result: SearchPushResult = { urls: urls.length };

  // 1. IndexNow (Bing, Yandex, Naver, Seznam, Yep -> also feeds ChatGPT Search & Copilot)
  try {
    const res = await doFetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
        urlList: urls.slice(0, 10_000),
      }),
      signal: AbortSignal.timeout(5000),
    });
    result.indexNow = {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
    };
  } catch {
    result.indexNow = { ok: false };
  }

  // 2. WebSub / PubSubHubbub (notifies Google's hub & feed-subscribing crawlers/AI indexers)
  const feedUrls = [`${origin}/feed.xml`, `${origin}/en/feed.xml`];
  const webSubStatuses: number[] = [];
  for (const feedUrl of feedUrls) {
    try {
      const body = new URLSearchParams({
        'hub.mode': 'publish',
        'hub.url': feedUrl,
      });
      const res = await doFetch(WEBSUB_HUB, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(5000),
      });
      webSubStatuses.push(res.status);
    } catch {
      webSubStatuses.push(0);
    }
  }
  result.webSub = {
    ok: webSubStatuses.some((s) => s >= 200 && s < 300),
    statuses: webSubStatuses,
  };

  // 3. Baidu Search Push (optional; active only when BAIDU_PUSH_TOKEN is configured)
  const baiduToken = options.baiduToken?.trim();
  if (baiduToken) {
    try {
      const res = await doFetch(
        `${BAIDU_PUSH_ENDPOINT}?site=${encodeURIComponent(origin)}&token=${encodeURIComponent(baiduToken)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          body: urls.join('\n'),
          signal: AbortSignal.timeout(5000),
        },
      );
      result.baidu = {
        ok: res.status >= 200 && res.status < 300,
        status: res.status,
      };
    } catch {
      result.baidu = { ok: false };
    }
  }

  return result;
}

import {
  RADAR_PLATFORM_NAMES,
  type RadarOverview,
  type RadarPlatformId,
  type RadarTrendPoint,
} from '../shared/radar';

const SITE_OVERVIEW =
  'https://api.tangka.online/radar-api/integrations/haomeile/overview';
const POLL_MS = 5 * 60_000;
const STALE_MS = 45 * 60_000;
const MAX_AGE_MS = 3 * 60 * 60_000;
const MAX_RESPONSE_BYTES = 256 * 1024;
const HISTORY_WINDOW_MS = 24 * 60 * 60_000;
const MAX_HISTORY_POINTS = 49;
const PLATFORM_IDS = Object.keys(RADAR_PLATFORM_NAMES) as RadarPlatformId[];

function historyPoints(
  values: unknown,
  generatedAt: number,
): RadarTrendPoint[] {
  if (!Array.isArray(values)) return [];
  const points = new Map<number, number>();
  for (const value of values) {
    if (!value || typeof value !== 'object') continue;
    const { timestamp, probability } = value as Record<string, unknown>;
    if (typeof timestamp !== 'string') continue;
    const time = Date.parse(timestamp);
    if (
      Number.isFinite(time) &&
      time >= generatedAt - HISTORY_WINDOW_MS &&
      time <= generatedAt &&
      typeof probability === 'number' &&
      Number.isFinite(probability) &&
      probability >= 0 &&
      probability <= 100
    )
      points.set(time, probability);
  }
  return [...points]
    .sort(([a], [b]) => a - b)
    .slice(-MAX_HISTORY_POINTS)
    .map(([time, probability]) => ({ time, probability }));
}

function parseOverview(value: unknown): Omit<RadarOverview, 'stale'> | null {
  if (!value || typeof value !== 'object') return null;
  const { generatedAt, platforms, probabilityHistory24h } = value as Record<
    string,
    unknown
  >;
  if (typeof generatedAt !== 'string' || !Array.isArray(platforms)) return null;
  const timestamp = Date.parse(generatedAt);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 60_000)
    return null;

  const publicPlatforms = PLATFORM_IDS.flatMap((id) => {
    const entry = platforms.find(
      (item: unknown): item is Record<string, unknown> =>
        !!item && typeof item === 'object' && 'id' in item && item.id === id,
    );
    const probability = entry?.probability;
    return typeof probability === 'number' &&
      Number.isFinite(probability) &&
      probability >= 0 &&
      probability <= 100
      ? [
          {
            name: RADAR_PLATFORM_NAMES[id],
            probability: Math.round(probability),
          },
        ]
      : [];
  });
  if (!publicPlatforms.length) return null;
  const rawHistory =
    probabilityHistory24h && typeof probabilityHistory24h === 'object'
      ? (probabilityHistory24h as Record<string, unknown>)
      : {};
  const history = PLATFORM_IDS.flatMap((id) => {
    const points = historyPoints(rawHistory[id], timestamp);
    return points.length
      ? [{ id, name: RADAR_PLATFORM_NAMES[id], points }]
      : [];
  });
  return {
    generatedAt: new Date(timestamp).toISOString(),
    platforms: publicPlatforms,
    history,
  };
}

async function readOverview(response: Response) {
  if (!response.body) return null;
  if (
    !response.ok ||
    !response.headers.get('content-type')?.startsWith('application/json')
  ) {
    await response.body.cancel();
    return null;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let json = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return null;
      }
      json += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
  return parseOverview(JSON.parse(json + decoder.decode()));
}

export function createRadarOverview(key?: string, url = SITE_OVERVIEW) {
  const credential = key?.trim();
  if (!credential) return undefined;
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(credential) || url !== SITE_OVERVIEW) {
    console.warn(
      'Reset Radar overview disabled: invalid credential or endpoint',
    );
    return undefined;
  }

  let overview: Omit<RadarOverview, 'stale'> | null = null;
  let failed = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onRefresh: (() => void) | undefined;

  async function refresh() {
    let delay = POLL_MS;
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${credential}`,
        },
        redirect: 'error',
        signal: AbortSignal.timeout(3500),
      });
      if (response.status === 429) {
        const retrySeconds = Number(response.headers.get('retry-after'));
        if (Number.isFinite(retrySeconds))
          delay = Math.max(delay, Math.min(retrySeconds * 1000, 3_600_000));
      }
      const next = await readOverview(response);
      failed =
        !next || Boolean(overview && next.generatedAt < overview.generatedAt);
      if (next && !failed) overview = next;
    } catch {
      failed = true;
    } finally {
      if (running) {
        timer = setTimeout(() => void refresh(), delay);
        onRefresh?.();
      }
    }
  }

  return {
    start(afterRefresh?: () => void) {
      if (running) return;
      onRefresh = afterRefresh;
      running = true;
      void refresh();
    },
    stop() {
      running = false;
      clearTimeout(timer);
    },
    read(): RadarOverview | null {
      if (!overview) return null;
      const age = Date.now() - Date.parse(overview.generatedAt);
      return age < MAX_AGE_MS
        ? { ...overview, stale: failed || age >= STALE_MS }
        : null;
    },
  };
}

import type { RadarOverview } from '../shared/radar';

const SITE_OVERVIEW =
  'https://api.tangka.online/radar-api/integrations/haomeile/overview';
const POLL_MS = 5 * 60_000;
const STALE_MS = 45 * 60_000;
const MAX_AGE_MS = 3 * 60 * 60_000;
const MAX_RESPONSE_BYTES = 256 * 1024;
const PLATFORM_NAMES = { codex: 'Codex', claude: 'Claude Code' } as const;

function parseOverview(value: unknown): Omit<RadarOverview, 'stale'> | null {
  if (!value || typeof value !== 'object') return null;
  const { generatedAt, platforms } = value as Record<string, unknown>;
  if (typeof generatedAt !== 'string' || !Array.isArray(platforms)) return null;
  const timestamp = Date.parse(generatedAt);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 60_000)
    return null;

  const publicPlatforms = Object.entries(PLATFORM_NAMES).flatMap(
    ([id, name]) => {
      const entry = platforms.find(
        (item: unknown): item is Record<string, unknown> =>
          !!item && typeof item === 'object' && 'id' in item && item.id === id,
      );
      const probability = entry?.probability;
      return typeof probability === 'number' &&
        Number.isFinite(probability) &&
        probability >= 0 &&
        probability <= 100
        ? [{ name, probability: Math.round(probability) }]
        : [];
    },
  );
  return publicPlatforms.length
    ? {
        generatedAt: new Date(timestamp).toISOString(),
        platforms: publicPlatforms,
      }
    : null;
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
  if (
    !/^[A-Za-z0-9_-]{43,128}$/.test(credential) ||
    url !== SITE_OVERVIEW
  ) {
    console.warn(
      'Reset Radar overview disabled: invalid credential or endpoint',
    );
    return undefined;
  }

  let overview: Omit<RadarOverview, 'stale'> | null = null;
  let failed = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

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
      if (running) timer = setTimeout(() => void refresh(), delay);
    }
  }

  return {
    start() {
      if (running) return;
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

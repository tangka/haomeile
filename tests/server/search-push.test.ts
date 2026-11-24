import { describe, expect, test } from 'bun:test';
import {
  INDEXNOW_KEY,
  expandNotificationUrls,
} from '../../src/shared/indexnow';
import {
  createRadarPushTracker,
  notifySearchEngines,
  shouldNotifyRadar,
} from '../../src/server/search-push';
import type { RadarOverview } from '../../src/shared/radar';

function sampleOverview(
  codex: number,
  claude = 30,
  antigravity = 10,
  stale = false,
): RadarOverview {
  return {
    generatedAt: '2026-11-24T00:00:00.000Z',
    stale,
    platforms: [
      { id: 'codex', name: 'Codex', probability: codex },
      { id: 'claude', name: 'Claude Code', probability: claude },
      { id: 'antigravity', name: 'Antigravity', probability: antigravity },
    ],
    history: [],
  };
}

describe('multi-engine search and AI discovery push', () => {
  test('expands localized zh/en URLs, preserves non-localized endpoints, and drops foreign origins', () => {
    const urls = expandNotificationUrls([
      '/',
      '/radar',
      '/t/ABCDE23456',
      '/llms-full.txt',
      'https://haomeile.rip/appeal',
      'https://evil.example/phish',
      '//evil.example/x',
    ]);
    expect(urls).toEqual([
      'https://haomeile.rip/',
      'https://haomeile.rip/en/',
      'https://haomeile.rip/radar',
      'https://haomeile.rip/en/radar',
      'https://haomeile.rip/t/ABCDE23456',
      'https://haomeile.rip/en/t/ABCDE23456',
      'https://haomeile.rip/llms-full.txt',
      'https://haomeile.rip/appeal',
      'https://haomeile.rip/en/appeal',
    ]);
  });

  test('throttles routine radar updates while pushing initial reads, >80% spikes, and major shifts', () => {
    const tracker = createRadarPushTracker();
    const t0 = Date.parse('2026-11-24T00:00:00Z');
    expect(shouldNotifyRadar(tracker, null, t0)).toBe(false);
    expect(shouldNotifyRadar(tracker, sampleOverview(20, 30, 10, true), t0)).toBe(
      false,
    );
    expect(shouldNotifyRadar(tracker, sampleOverview(20, 30, 10), t0)).toBe(
      true,
    );
    // Routine small change within 30 minutes should not spam IndexNow.
    expect(
      shouldNotifyRadar(tracker, sampleOverview(25, 32, 12), t0 + 30 * 60_000),
    ).toBe(false);
    // Large shift within cooldown still throttled unless crossing >80%.
    expect(
      shouldNotifyRadar(tracker, sampleOverview(50, 30, 10), t0 + 60 * 60_000),
    ).toBe(false);
    // Crossing strictly above 80% pushes immediately even during cooldown.
    expect(
      shouldNotifyRadar(tracker, sampleOverview(85, 30, 10), t0 + 90 * 60_000),
    ).toBe(true);
    // Staying above 80% does not re-trigger repeatedly.
    expect(
      shouldNotifyRadar(tracker, sampleOverview(88, 30, 10), t0 + 120 * 60_000),
    ).toBe(false);
    // Big shift (>= 15pt) after 6h cooldown triggers again.
    expect(
      shouldNotifyRadar(
        tracker,
        sampleOverview(40, 30, 10),
        t0 + 90 * 60_000 + 6 * 60 * 60_000,
      ),
    ).toBe(true);
  });

  test('skips non-production pushes and sends IndexNow, WebSub, and optional Baidu in production', async () => {
    const devResult = await notifySearchEngines(['/radar'], {
      environment: 'development',
      origin: 'https://haomeile.rip',
    });
    expect(devResult.skipped).toBe(true);

    const calls: { url: string; method?: string; body?: string }[] = [];
    const mockFetch = (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(input),
        method: init?.method,
        body: init?.body ? String(init.body) : undefined,
      });
      return new Response('', { status: 202 });
    }) as typeof fetch;

    const prod = await notifySearchEngines(['/radar', '/llms-full.txt'], {
      environment: 'production',
      origin: 'https://haomeile.rip',
      baiduToken: 'test-baidu-token',
      fetchImpl: mockFetch,
    });

    expect(prod.skipped).toBeUndefined();
    expect(prod.urls).toBe(3);
    expect(prod.indexNow).toEqual({ ok: true, status: 202 });
    expect(prod.webSub).toEqual({ ok: true, statuses: [202, 202] });
    expect(prod.baidu).toEqual({ ok: true, status: 202 });

    expect(calls).toHaveLength(4);
    expect(calls[0]!.url).toBe('https://api.indexnow.org/indexnow');
    const indexNowBody = JSON.parse(calls[0]!.body!);
    expect(indexNowBody.host).toBe('haomeile.rip');
    expect(indexNowBody.key).toBe(INDEXNOW_KEY);
    expect(indexNowBody.keyLocation).toBe(
      `https://haomeile.rip/${INDEXNOW_KEY}.txt`,
    );
    expect(indexNowBody.urlList).toEqual([
      'https://haomeile.rip/radar',
      'https://haomeile.rip/en/radar',
      'https://haomeile.rip/llms-full.txt',
    ]);
    expect(calls[1]!.url).toBe('https://pubsubhubbub.appspot.com/');
    expect(calls[1]!.body).toContain('hub.mode=publish');
    expect(calls[1]!.body).toContain(
      encodeURIComponent('https://haomeile.rip/feed.xml'),
    );
    expect(calls[2]!.body).toContain(
      encodeURIComponent('https://haomeile.rip/en/feed.xml'),
    );
    expect(calls[3]!.url).toContain('data.zz.baidu.com/urls');
  });
});

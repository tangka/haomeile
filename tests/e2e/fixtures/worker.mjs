import worker, { createApp } from '../../../src/worker/index.ts';

// Production enables the subscription controls when its email adapter is ready.
// The browser tests serve the same markup and simulate the adapter responses.
const end = Date.parse('2026-11-24T12:00:00Z');
const hour = 3_600_000;
const app = createApp({
  radarEmailReady: true,
  readRadarOverview: () => ({
    generatedAt: new Date(end).toISOString(),
    stale: false,
    platforms: [{ id: 'codex', name: 'Codex', probability: 18 }],
    history: [
      {
        id: 'codex',
        name: 'Codex',
        points: [
          { time: end - 24 * hour, probability: 8 },
          { time: end, probability: 18 },
        ],
      },
    ],
    resetEvents: [
      { time: end - 12 * hour, platform: 'codex', kind: 'card' },
      { time: end - 12 * hour, platform: 'antigravity', kind: 'reset' },
    ],
  }),
});
export default { ...worker, fetch: app.fetch };

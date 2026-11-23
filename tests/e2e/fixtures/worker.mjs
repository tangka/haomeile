import worker, { createApp } from '../../../src/worker/index.ts';

// Production enables the subscription controls when its email adapter is ready.
// The browser tests serve the same markup and simulate the adapter responses.
export default { ...worker, fetch: createApp({ radarEmailReady: true }).fetch };

import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';

export default defineConfig({
  plugins: [cloudflareTest({
    wrangler: { configPath: './wrangler.toml' },
    miniflare: { bindings: {
      ENVIRONMENT: 'test', SITE_ORIGIN: 'https://haomeile.rip',
      PEPPER: 'test-only-pepper-not-used-by-real-environments',
      TURNSTILE_SECRET: 'test-only-turnstile-secret',
      TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      ACCESS_AUD: 'test-audience', ACCESS_TEAM_DOMAIN: 'test.cloudflareaccess.com',
      TEST_MIGRATIONS: await readD1Migrations('./migrations'),
    } },
  })],
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/api/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'], fileParallelism: false,
  },
});

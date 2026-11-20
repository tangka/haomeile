/// <reference types="@cloudflare/vitest-plugin/types" />
import type { Bindings } from '../src/worker/types';
declare global {
  namespace Cloudflare {
    interface Env extends Bindings {
      TEST_MIGRATIONS: import('cloudflare:test').D1Migration[];
    }
  }
}

# 实施决策

## M0 · 2026-11-20

- 按 PLAN.md 使用 Astro 静态构建、Hono Worker 与 D1。动态页面由 Worker 将数据库内容写入 Astro 模板，因此首屏与分页在无 JavaScript 时也包含真实内容。
- 本地统一在 http://127.0.0.1:8787 提供页面和 API；仅在本地复制官方 Turnstile 测试配置。生产配置不包含测试密钥和任何后台绕过。
- design/ 保持只读，生产环境不导入设计稿的示例数据。
- Cloudflare 官方已将计划中的 `@cloudflare/vitest-pool-workers` 更名为 `@cloudflare/vitest-plugin`，使用官方维护的新包和 Vitest 4.1，仍在真实 Workers 运行时测试（https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/）。

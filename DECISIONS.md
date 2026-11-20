# 实施决策

## M0 · 2026-11-20

- 按 PLAN.md 使用 Astro 静态构建、Hono Worker 与 D1。动态页面由 Worker 将数据库内容写入 Astro 模板，因此首屏与分页在无 JavaScript 时也包含真实内容。
- 本地统一在 http://127.0.0.1:8787 提供页面和 API；仅在本地复制官方 Turnstile 测试配置。生产配置不包含测试密钥和任何后台绕过。
- design/ 保持只读，生产环境不导入设计稿的示例数据。
- Cloudflare 官方已将计划中的 `@cloudflare/vitest-pool-workers` 更名为 `@cloudflare/vitest-plugin`，使用官方维护的新包和 Vitest 4.1，仍在真实 Workers 运行时测试（https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/）。

## M1 · 数据与接口

- 浏览器和 Worker 使用独立 TypeScript 配置，防止 Workers 的 `Element` 与浏览器 DOM 类型冲突；共享字段类型用模块形式导入数据库类型。
- 撤回严格执行只保留编号、状态、时间及审计的要求，连凭据哈希也清空。撤回的即时响应显示“已撤回”，之后旧凭据不能再查询；公开地址返回 410 的处理在 SEO 阶段完成。
- 举报按不同访客的未处理举报计数，重复举报不增加次数。三个不同访客触发隐藏；不将举报人数视为内容真实与否的结论。
- M1 验证：49 项单元/接口测试通过（真实 Workers 运行时与 D1），构建、严格类型检查、ESLint 通过。测试数据只存在于隔离测试数据库。

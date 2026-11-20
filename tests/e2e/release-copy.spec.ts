import { expect, test } from '@playwright/test';

test('public release information has no configuration placeholders', async ({
  page,
}) => {
  for (const prefix of ['', '/en']) {
    for (const route of ['/about', '/appeal', '/privacy', '/rules']) {
      const response = await page.goto(prefix + route);
      expect(response!.status()).toBe(200);
      await expect(page.locator('body')).not.toContainText(/TODO(?:_[A-Z]+)*/);
      if (route === '/appeal') {
        await expect(page.locator('.vendor h2')).toHaveText([
          'Claude',
          'Codex',
          'Antigravity',
        ]);
        await expect(page.locator('.vendor a')).toHaveCount(0);
      }
      if (route === '/about' || route === '/privacy') {
        await expect(page.locator('body')).toContainText(
          prefix ? 'Community summaries' : '社区整理',
        );
        await expect(page.locator('body')).toContainText(
          prefix ? 'do not automatically translate' : '不会自动翻译用户提交',
        );
      }
      if (route === '/privacy')
        await expect(page.locator('#stats + p')).toContainText(
          prefix ? 'Beijing time' : '北京时间',
        );
      if (route === '/privacy' || route === '/rules')
        await expect(page.locator('.updated time')).toHaveAttribute(
          'datetime',
          '2026-11-20',
        );
    }
    await page.goto(prefix + '/');
    await expect(page.locator('[data-ssr="community-tally"]')).toContainText(
      prefix ? 'Community summaries' : '社区整理',
    );
  }
});

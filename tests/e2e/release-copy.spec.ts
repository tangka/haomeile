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
      if (route === '/privacy' || route === '/rules')
        await expect(page.locator('.updated time')).toHaveAttribute(
          'datetime',
          '2026-11-20',
        );
    }
  }
});

import { expect, test } from '@playwright/test';

test('public release information has no configuration placeholders', async ({
  page,
}) => {
  for (const prefix of ['', '/en']) {
    for (const route of ['/about', '/appeal', '/privacy']) {
      const response = await page.goto(prefix + route);
      expect(response!.status()).toBe(200);
      await expect(page.locator('body')).not.toContainText(/TODO(?:_[A-Z]+)*/);
      if (route === '/appeal') {
        await expect(page.locator('.vendor h2')).toHaveText([
          'Claude',
          'Codex',
          'Antigravity',
        ]);
        const links = page.locator('.vendor a.btn-primary');
        await expect(links).toHaveText(
          prefix
            ? [
                'Appeal a Claude restriction',
                'OpenAI appeal form',
                'Antigravity appeal form',
              ]
            : ['Claude 账号申诉', 'OpenAI 申诉表单', 'Antigravity 申诉表单'],
        );
        await expect(links.nth(0)).toHaveAttribute(
          'href',
          'https://claude.ai/restricted',
        );
        await expect(links.nth(1)).toHaveAttribute(
          'href',
          'https://openai.com/form/appeal/',
        );
        await expect(links.nth(2)).toHaveAttribute(
          'href',
          'https://forms.gle/hGzM9MEUv2azZsrb9',
        );
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
      if (route === '/privacy')
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

test('the main menu opens the tips directory and its product shortcuts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const link = page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '使用小技巧' });
  await link.click();
  await expect(page).toHaveURL(/\/tips$/);
  await expect(link).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByRole('heading', { name: '使用小技巧', level: 1 }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: '按产品查看' })
    .getByRole('link', { name: 'Codex' })
    .click();
  await expect(page).toHaveURL(/\/tips#codex$/);
  await page.getByRole('link', { name: /个人号和工作号怎么切换/ }).click();
  await expect(page).toHaveURL(/\/tips\/codex-personal-work-accounts$/);
  await expect(
    page.getByRole('heading', { name: '个人号和工作号怎么切换', level: 1 }),
  ).toBeVisible();
  await expect(page.locator('article ol li').first()).toContainText(
    'Add account',
  );
  await expect(page.getByRole('link', { name: '查看 X 原帖' })).toHaveAttribute(
    'href',
    'https://x.com/adamhfry/status/2120244738880401697',
  );
  await page.getByRole('link', { name: '返回技巧目录' }).click();
  await expect(page).toHaveURL(/\/tips$/);
});

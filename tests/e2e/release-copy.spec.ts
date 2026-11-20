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

test('the tips directory shows one article per row and links to details', async ({
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
  await expect(
    page.getByRole('navigation', { name: '按产品查看' }),
  ).toHaveCount(0);
  await expect(page.locator('.tip-group h2')).toHaveText([
    'Claude',
    'Codex',
    'Antigravity',
  ]);
  await page.setViewportSize({ width: 1100, height: 812 });
  const rows = await page
    .locator('#claude + ul .tip-preview')
    .evaluateAll((links) =>
      links.map((link) => {
        const { left, top, bottom } = link.getBoundingClientRect();
        return { left, top, bottom };
      }),
    );
  expect(rows.length).toBeGreaterThan(1);
  for (let i = 1; i < rows.length; i++) {
    expect(rows[i].left).toBe(rows[0].left);
    expect(rows[i].top).toBeGreaterThanOrEqual(rows[i - 1].bottom);
  }

  const title = 'Codex 被停用，申诉时怎么交代任务背景';
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page).toHaveURL(/\/tips\/codex-appeal-task-context$/);
  await expect(
    page.getByRole('heading', { name: title, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '当事人的经历' }),
  ).toBeVisible();
  await expect(page.locator('article')).toContainText('749,441');
  await expect(page.getByRole('link', { name: '查看 X 原帖' })).toHaveAttribute(
    'href',
    'https://x.com/endpointarena/status/2075245286339846145',
  );
  await page.getByRole('link', { name: '返回技巧目录' }).click();
  await expect(page).toHaveURL(/\/tips$/);
});

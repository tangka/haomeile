import { expect, test } from '@playwright/test';
import { TIP_ARTICLES } from '../../src/shared/tips';

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
          '2026-11-23',
        );
    }
    await page.goto(prefix + '/');
    const appealLink = `a[href="${prefix}/appeal"]`;
    await expect(page.getByRole('banner').locator(appealLink)).toHaveCount(0);
    await expect(
      page.getByRole('contentinfo').locator(appealLink),
    ).toBeVisible();
    await expect(page.locator('[data-ssr="tally-section"]')).toBeHidden();
    await expect(page.locator('[data-ssr="timeline-section"]')).toBeHidden();
  }
});

test('the tips directory lists articles by date in one column and links to details', async ({
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
  const main = page.getByRole('main');
  await expect(main.getByRole('heading')).toHaveText(['使用小技巧']);
  const articles = [...TIP_ARTICLES].sort((a, b) =>
    b.sourcePublishedAt.localeCompare(a.sourcePublishedAt),
  );
  const titles = articles.map((tip) => tip.title);
  const list = main.locator('.tips');
  await expect(list).toHaveCount(1);
  await expect(main.getByRole('link')).toHaveCount(titles.length);
  const publishedTimes = list.locator('li > a > time');
  await expect(publishedTimes).toHaveCount(articles.length);
  const creditsPath = '/tips/google-ai-claim-cloud-credits';
  await expect(list.locator(`a[href="${creditsPath}"] time`)).toHaveText(
    '2026-11-17 20:48',
  );
  expect(
    await publishedTimes.evaluateAll((times) =>
      times.map((time) => time.getAttribute('datetime')),
    ),
  ).toEqual(articles.map((tip) => tip.sourcePublishedAt));

  await page.setViewportSize({ width: 1100, height: 812 });
  const articleLinks = list.locator(':scope > li > a.tip-preview');
  await expect(articleLinks.locator('.tip-title')).toHaveText(titles);
  const rows = await articleLinks.evaluateAll((links) =>
    links.map((link) => {
      const { left, top, bottom } = link.getBoundingClientRect();
      return { left, top, bottom };
    }),
  );
  for (let i = 1; i < rows.length; i++) {
    expect(rows[i].left).toBe(rows[0].left);
    expect(rows[i].top).toBeGreaterThanOrEqual(rows[i - 1].bottom);
  }

  const title =
    '拒绝代充！没有 iPhone 也能自己开通 Claude Pro，一张 Mastercard 亲测跑通';
  await main.getByRole('link', { name: title, exact: true }).click();
  await expect(page).toHaveURL(/\/tips\/claude-pro-web-subscription$/);
  await expect(
    page.getByRole('heading', { name: title, level: 1 }),
  ).toBeVisible();
  await expect(page.locator('article ol li')).toHaveCount(4);
  await expect(
    page.getByRole('link', { name: '打开 Claude 升级页' }),
  ).toHaveAttribute('href', 'https://claude.ai/upgrade');
  await expect(page.locator('article')).toContainText('@alin_zone');
  await expect(page.getByRole('link', { name: '阅读 X 长文' })).toHaveAttribute(
    'href',
    'https://x.com/i/article/2117217865128636416',
  );
  await page.getByRole('link', { name: '返回技巧目录' }).click();
  await expect(page).toHaveURL(/\/tips$/);

  await page.goto('/en/tips');
  const englishTitles = articles.map((tip) => tip.englishTitle);
  await expect(page.locator('.tips .tip-title')).toHaveText(englishTitles);
  await expect(
    page.locator(`.tips a[href="/en${creditsPath}"] time`),
  ).toHaveText('2026-11-17 20:48');
  const englishTitle =
    'How I subscribed to Claude Pro myself without an iPhone, using a Mastercard';
  await page.getByRole('link', { name: englishTitle, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    englishTitle,
  );
  await expect(page.locator('.tip-original-title')).toContainText(title);
});

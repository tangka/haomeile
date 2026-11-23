import { expect, test } from '@playwright/test';
import { stubTurnstileSdk } from './helpers';

for (const prefix of ['', '/en']) {
  test(`mobile memorial navigation in ${prefix ? 'English' : 'Chinese'} connects public posting and local cards`, async ({
    page,
  }) => {
    await stubTurnstileSdk(page);
    await page.setViewportSize({ width: 320, height: 750 });
    await page.goto(`${prefix}/`);
    const hero = page.getByRole('region', { name: '号没了', exact: true });
    await expect(hero.locator(`a[href="${prefix}/submit"]`)).toBeVisible();
    await expect(hero.locator(`a[href="${prefix}/epitaph"]`)).toHaveCount(0);
    const primary = page.getByRole('banner').getByRole('navigation');
    const links = primary.getByRole('link');
    expect(
      await links.evaluateAll((items) =>
        items.map((a) => a.getAttribute('href')),
      ),
    ).toEqual(['/', '/submit', '/tips', '/radar'].map((path) => prefix + path));
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 750 });
      const boxes = await links.evaluateAll((items) =>
        items.map((a) => {
          const { top, left, right, width, height } = a.getBoundingClientRect();
          return { top, left, right, width, height };
        }),
      );
      expect(new Set(boxes.map((box) => box.top)).size).toBe(1);
      for (const box of boxes) {
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(width);
      }
    }
    const create = primary.getByRole('link', {
      name: prefix ? 'Create' : '立碑制卡',
      exact: true,
    });
    await create.click();
    await expect(page).toHaveURL(`${prefix}/submit`);
    await expect(create).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#codename')).toBeVisible();

    const modes = page.getByRole('main').getByRole('navigation');
    const post = modes.getByRole('link', {
      name: prefix ? 'Post to the wall' : '公开立碑',
    });
    const card = modes.getByRole('link', {
      name: prefix ? 'Make a local card' : '本地制卡',
    });
    await expect(post).toHaveAttribute('aria-current', 'page');
    await card.click();
    await expect(page).toHaveURL(`${prefix}/epitaph`);
    await expect(page.locator('#card')).toBeVisible();
    await expect(create).toHaveAttribute('aria-current', 'location');
    await expect(card).toHaveAttribute('aria-current', 'page');
    await post.click();
    await expect(page).toHaveURL(`${prefix}/submit`);
  });
}

test('epitaph creation and PNG export stay entirely in the browser', async ({
  page,
}) => {
  const requests: { url: string; type: string }[] = [];
  page.on('request', (request) =>
    requests.push({ url: request.url(), type: request.resourceType() }),
  );
  await page.goto('/epitaph');
  await expect(page.locator('#card')).toBeVisible();
  const initial = await page.locator('#m-epitaph').inputValue();
  await page.locator('#m-name').fill('测试小号');
  await page.locator('#m-born').fill('2026-01-01');
  await page.locator('#m-shuffle').click();
  await expect(page.locator('#m-epitaph')).not.toHaveValue(initial);
  for (const style of ['cloud', 'star', 'flower'])
    await page.locator(`input[name="mstyle"][value="${style}"]`).check();
  await page.locator('input[name="mtime"][value="night"]').check();
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#m-download').click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('墓碑-测试小号.png');
  const bytes = await page
    .locator('#card')
    .evaluate((node: HTMLCanvasElement) => node.toDataURL('image/png'));
  expect(bytes).toMatch(/^data:image\/png;base64,/);
  expect(bytes.length).toBeGreaterThan(2000);
  const origin = new URL(page.url()).origin;
  expect(
    requests.filter(
      (request) =>
        new URL(request.url).origin !== origin ||
        ['fetch', 'xhr', 'websocket'].includes(request.type),
    ),
  ).toEqual([]);
});

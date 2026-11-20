import { expect, test } from '@playwright/test';
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

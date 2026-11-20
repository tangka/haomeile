import { expect, test } from '@playwright/test';
import { stubTurnstileSdk } from './helpers';

const products = ['claude', 'codex', 'antigravity'];
const names = ['Claude', 'Codex', 'Antigravity'];

test('the wall has no category controls and forms keep only the three actual products', async ({
  page,
}) => {
  await stubTurnstileSdk(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: '按产品', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: '按事件种类', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator('.filters, #chips-vendor, #chips-event'),
  ).toHaveCount(0);
  await page.goto('/submit');
  const submission = page.locator('#vendor');
  expect(
    await submission.locator('option').evaluateAll((options) =>
      options
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          text: option.textContent?.trim(),
        }))
        .filter((option) => option.value),
    ),
  ).toEqual(products.map((value, i) => ({ value, text: names[i] })));
  for (const key of ['codex', 'antigravity']) {
    await submission.selectOption(key);
    await expect(submission).toHaveValue(key);
  }
  await page.goto('/epitaph');
  const maker = page.locator('select#m-vendor');
  await expect(maker).toBeVisible();
  expect(
    await maker
      .locator('option')
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      ),
  ).toEqual(products);
  const card = page.locator('#card');
  for (const product of ['codex', 'antigravity']) {
    const before = await card.evaluate((element: HTMLCanvasElement) =>
      element.toDataURL(),
    );
    await maker.selectOption(product);
    await expect(maker).toHaveValue(product);
    await expect
      .poll(() =>
        card.evaluate((element: HTMLCanvasElement) => element.toDataURL()),
      )
      .not.toBe(before);
  }
  await page.goto('/appeal');
  const headings = await page.locator('main h2').allTextContents();
  expect(
    headings.filter((text) => /Claude|Codex|Antigravity/.test(text)),
  ).toHaveLength(3);
  expect(headings.join(' ')).not.toMatch(
    /ChatGPT|Gemini|Grok|DeepSeek|Kimi|豆包|通义/,
  );
});

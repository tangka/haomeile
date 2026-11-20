import { expect, test } from '@playwright/test';
import { stubTurnstileSdk } from './helpers';

test('plan choices follow the product and incompatible selections are cleared', async ({
  page,
}) => {
  await stubTurnstileSdk(page);
  await page.goto('/submit');
  const product = page.locator('#vendor');
  const plan = page.locator('#plan');
  const options = () =>
    plan
      .locator('option')
      .evaluateAll((items) =>
        items.map((item) => (item as HTMLOptionElement).value),
      );
  expect(await options()).toEqual(['unknown']);
  await product.selectOption('claude');
  expect(await options()).toEqual(['unknown', 'free', 'pro', 'max', 'ultra']);
  await plan.selectOption('max');
  await product.selectOption('codex');
  expect(await options()).toEqual(['unknown', 'free', 'go', 'plus', 'pro']);
  await expect(plan).toHaveValue('unknown');
  await plan.selectOption('plus');
  await product.selectOption('antigravity');
  expect(await options()).toEqual(['unknown', 'free', 'pro', 'ultra']);
  await expect(plan).toHaveValue('unknown');
  await plan.selectOption('pro');
  await product.selectOption('claude');
  await expect(plan).toHaveValue('pro');
  await product.selectOption('');
  expect(await options()).toEqual(['unknown']);
  await expect(plan).toHaveValue('unknown');
});

for (const [storedPlan, displayedPlan] of [
  ['max', 'max'],
  ['paid_personal', 'unknown'],
] as const) {
  test(`editing ${storedPlan} rebuilds valid tiers before filling the selection`, async ({
    page,
  }) => {
    await page.route('**/api/manage/status', (route) =>
      route.fulfill({
        json: {
          ok: true,
          data: {
            id: 'PLANAAAAAA',
            codename: '本地套餐编辑测试',
            nickname: '',
            vendor: 'claude',
            event_type: 'verification',
            plan: storedPlan,
            born_at: null,
            born_precision: 'none',
            died_at: '2026-11-18',
            story: '这是只用于验证套餐编辑预填的本地测试内容。',
            epitaph: '',
            appeal_status: 'none',
            card_style: 'flower',
            status: 'approved',
            pending_patch: null,
            flowers: 0,
            created_at: '2026-11-18T00:00:00Z',
            updated_at: '2026-11-18T00:00:00Z',
            approved_at: '2026-11-18T00:00:00Z',
          },
        },
      }),
    );
    await page.goto('/submit?mode=edit');
    await page.locator('#edit-id').fill('PLANAAAAAA');
    await page.locator('#edit-secret').fill('local-test-only-secret');
    await page.locator('#edit-credential-form button').click();
    await expect(page.locator('#tomb-form')).toBeVisible();
    await expect(page.locator('#vendor')).toHaveValue('claude');
    await expect(page.locator('#plan')).toHaveValue(displayedPlan);
    expect(
      await page
        .locator('#plan option')
        .evaluateAll((items) =>
          items.map((item) => (item as HTMLOptionElement).value),
        ),
    ).toEqual(['unknown', 'free', 'pro', 'max', 'ultra']);
    if (storedPlan === 'paid_personal')
      await expect(page.locator('#plan-hint')).toContainText('重新选择');
  });
}

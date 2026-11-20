import { expect, test } from '@playwright/test';
import { stubTurnstileSdk } from './helpers';

test('new submissions preserve explicit precision and never invent a registration day', async ({
  page,
}) => {
  await stubTurnstileSdk(page);
  await page.route('**/api/tombstones', (route) =>
    route.fulfill({
      json: {
        ok: false,
        error: { code: 'TEST_CAPTURE', message: '测试已捕获请求。' },
      },
    }),
  );
  await page.goto('/submit');
  const precision = page.locator('#born-precision');
  const born = page.locator('#born');
  await expect(precision).toHaveValue('none');
  await expect(born).toBeHidden();
  await expect(born).toBeDisabled();
  await precision.selectOption('month');
  await expect(born).toHaveAttribute('type', 'month');
  await born.fill('2025-09');
  await precision.selectOption('day');
  await expect(born).toHaveAttribute('type', 'date');
  await expect(born).toHaveValue('');
  await born.fill('2025-09-12');
  await precision.selectOption('month');
  await expect(born).toHaveValue('2025-09');
  await precision.selectOption('none');
  await expect(born).toHaveValue('');
  await precision.selectOption('day');
  await born.fill('2025-09-12');
  await page.locator('#codename').fill('本地日期测试');
  await page.locator('#vendor').selectOption('claude');
  await page.locator('#story').fill('这是测试表单日期精度的一段本地文字。');
  await page.locator('#agree').check();
  const request = page.waitForRequest(
    (item) =>
      item.url().endsWith('/api/tombstones') && item.method() === 'POST',
  );
  await page.locator('#submit-button').click();
  expect((await request).postDataJSON()).toMatchObject({
    born_at: '2025-09-12',
    born_precision: 'day',
  });
});

test('editing a day-precision record fills the date after changing the input type', async ({
  page,
}) => {
  await page.route('**/api/manage/status', (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: {
          id: 'K7Q2M9XW4T',
          codename: '本地编辑测试',
          nickname: '',
          vendor: 'claude',
          event_type: 'suspended',
          plan: 'unknown',
          born_at: '2025-09-12',
          born_precision: 'day',
          died_at: '2026-01-01',
          story: '用于验证编辑表单预填日期的本地测试内容。',
          epitaph: '',
          appeal_status: 'none',
          card_style: 'flower',
          status: 'approved',
          pending_patch: null,
          flowers: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          approved_at: '2026-01-01T00:00:00Z',
        },
      },
    }),
  );
  await page.goto('/submit?mode=edit');
  await page.locator('#edit-id').fill('K7Q2M9XW4T');
  await page.locator('#edit-secret').fill('test-only-local-fixture');
  await page.locator('#edit-credential-form button').click();
  await expect(page.locator('#tomb-form')).toBeVisible();
  await expect(page.locator('#born-precision')).toHaveValue('day');
  await expect(page.locator('#born')).toHaveAttribute('type', 'date');
  await expect(page.locator('#born')).toHaveValue('2025-09-12');
});

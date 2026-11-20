import { expect, test } from '@playwright/test';
import { stubTurnstileSdk } from './helpers';

test.beforeEach(async ({ page }) => {
  await stubTurnstileSdk(page);
});

test('opens posting rules on the form without losing the draft', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 670 });
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: '使用须知', exact: true }),
  ).toHaveCount(0);

  await page.goto('/submit');
  const story = page.locator('#story');
  const draft = '账号停用后，我通过官方渠道提交了申诉。';
  await story.fill(draft);
  const trigger = page.getByRole('button', { name: '使用须知' });
  await trigger.click();
  const rules = page.getByRole('dialog', { name: '使用须知' });
  await expect(rules).toBeVisible();
  await expect(rules.getByText('保存好凭据。')).toBeVisible();
  await expect(
    rules.getByRole('link', { name: '官方申诉入口' }),
  ).toHaveAttribute('href', '/appeal');
  await rules.getByRole('button', { name: '返回填写' }).click();
  await expect(rules).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(story).toHaveValue(draft);
  await expect(page).toHaveURL(/\/submit$/);
});

test('old English rules links open the localized form dialog', async ({
  page,
}) => {
  await page.goto('/en/rules');
  await expect(page).toHaveURL(/\/en\/submit#posting-rules$/);
  const rules = page.getByRole('dialog', { name: 'Rules' });
  await expect(rules.getByText('Save your credentials.')).toBeVisible();
  await expect(
    rules.getByRole('link', { name: 'Official appeals' }),
  ).toHaveAttribute('href', '/en/appeal');
  await page.keyboard.press('Escape');
  await expect(rules).toBeHidden();
  await expect(page).toHaveURL(/\/en\/submit$/);
});

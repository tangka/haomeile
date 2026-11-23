import { expect, test, type Page } from '@playwright/test';

// The E2E Worker has no email provider. Model its email responses while
// exercising the production pages, JavaScript, localization and navigation.
async function mockRadarMail(page: Page, existingSubscriber = false) {
  let remembered = false;
  let platformsOnFile = existingSubscriber ? ['codex'] : [];
  let pendingPlatforms: string[] = [];
  const intents: string[] = [];
  await page.context().route('**/api/radar/email/*', async (route) => {
    const request = route.request();
    const action = new URL(request.url()).pathname.split('/').pop();
    if (action === 'status' && request.method() === 'GET') {
      return route.fulfill({ json: { subscribed: remembered } });
    }
    expect(request.method()).toBe('POST');
    const {
      code,
      token,
      email,
      platforms,
      intent = 'subscribe',
    } = request.postDataJSON();
    if (action === 'subscribe') {
      intents.push(intent);
      if (
        email === 'reader@example.test' &&
        platformsOnFile.length &&
        (intent === 'subscribe' ||
          (remembered && platforms.join() === platformsOnFile.join()))
      ) {
        return route.fulfill({
          json: { ok: true, alreadySubscribed: true, remembered },
        });
      }
      pendingPlatforms = platforms;
      return route.fulfill({ status: 202, json: { ok: true } });
    }
    if (
      (action === 'confirm-code' && code === '234567') ||
      (action === 'confirm' && token === 'existing')
    ) {
      remembered = true;
      const preferencesChanged =
        action === 'confirm-code' &&
        pendingPlatforms.join() !== platformsOnFile.join();
      if (action === 'confirm-code') platformsOnFile = pendingPlatforms;
      return route.fulfill({
        json: { ok: true, alreadySubscribed: true, preferencesChanged },
      });
    }
    if (action === 'confirm-code' && code === '123456') {
      remembered = true;
      platformsOnFile = pendingPlatforms;
    } else if (action === 'confirm' && token === 'valid') remembered = true;
    else if (action === 'unsubscribe' && token === 'valid') remembered = false;
    else return route.fulfill({ status: 410, json: { ok: false } });
    return route.fulfill({ json: { ok: true } });
  });
  return intents;
}

const subscriptionStatus = '[data-radar-email-subscribed]';

test('verified codes remember the subscription on reload and across languages', async ({
  page,
}) => {
  await mockRadarMail(page);
  await page.goto('/radar');
  const signup = page.getByRole('button', {
    name: '订阅邮件提醒',
    exact: true,
  });
  await signup.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox', { name: 'Codex' }).check();
  await dialog.getByLabel('邮箱地址').fill('reader@example.test');
  await dialog.getByRole('button', { name: '订阅', exact: true }).click();
  const code = dialog.getByLabel('邮箱验证码');
  const confirm = dialog.getByRole('button', { name: '确认订阅' });
  await code.fill('000000');
  await confirm.click();
  await expect(code).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator(subscriptionStatus)).toBeHidden();
  await code.fill('123456');
  await confirm.click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(subscriptionStatus)).toContainText('已订阅');
  await expect(signup).toBeHidden();

  await page.reload();
  await expect(page.locator(subscriptionStatus)).toBeVisible();
  await page.goto('/en/radar');
  await expect(page.locator(subscriptionStatus)).toContainText('Subscribed');
  await expect(
    page.getByRole('button', { name: 'Get email alerts' }),
  ).toBeHidden();
  await page.locator('[data-radar-email-edit-subscription]').click();
  await expect(
    page.getByRole('dialog').getByLabel('Email address'),
  ).toBeVisible();
});

test('confirmation and unsubscribe links change the remembered state only on success', async ({
  page,
}) => {
  await mockRadarMail(page);
  const radar = await page.context().newPage();
  await radar.goto('/en/radar');
  const signup = radar.getByRole('button', { name: 'Get email alerts' });
  await expect(signup).toBeVisible();
  for (const [fragment, result, subscribed] of [
    ['confirm=expired', 'This link is invalid or expired', false],
    ['confirm=valid', 'Your subscription is confirmed', true],
    ['confirm=existing', 'This email is already subscribed.', true],
    ['unsubscribe=expired', 'This link is invalid or expired', true],
    ['unsubscribe=valid', 'You have unsubscribed', false],
  ] as const) {
    await page.goto('/en/radar/email#' + fragment);
    await page.locator('[data-radar-email-action]').click();
    await expect(page.locator('[data-radar-email-status]')).toContainText(
      result,
    );
    await expect(radar.locator(subscriptionStatus)).toBeVisible({
      visible: subscribed,
    });
    await expect(signup).toBeVisible({ visible: !subscribed });
  }
});

test('a repeat signup on a new browser shows the existing subscription before asking for a code', async ({
  page,
}) => {
  const intents = await mockRadarMail(page, true);
  await page.goto('/radar');
  await page.getByRole('button', { name: '订阅邮件提醒', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const enterAddress = async () => {
    // Even different platform choices must not turn an ordinary signup into an edit.
    await dialog.getByRole('checkbox', { name: 'Antigravity' }).check();
    await dialog.getByLabel('邮箱地址').fill('reader@example.test');
    await dialog
      .locator('[data-radar-email-signup] button[type=submit]')
      .click();
  };
  await enterAddress();
  const duplicateMessage = '这个邮箱已经订阅过了。';
  await expect(
    dialog.getByText(duplicateMessage, { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByLabel('邮箱验证码')).toBeHidden();
  await expect(page.locator(subscriptionStatus)).toBeHidden();
  expect(intents).toEqual(['subscribe']);

  await page.reload();
  await expect(page.locator(subscriptionStatus)).toBeHidden();
  await page.getByRole('button', { name: '订阅邮件提醒', exact: true }).click();
  await enterAddress();
  await dialog.getByRole('button', { name: '修改订阅', exact: true }).click();
  await expect(dialog.getByLabel('邮箱地址')).toHaveValue(
    'reader@example.test',
  );
  await expect(
    dialog.getByRole('checkbox', { name: 'Antigravity' }),
  ).toBeChecked();
  await expect(dialog.getByLabel('邮箱验证码')).toBeHidden();
  expect(intents).toEqual(['subscribe', 'subscribe']);
  await dialog.locator('[data-radar-email-signup] button[type=submit]').click();
  await dialog.getByLabel('邮箱验证码').fill('234567');
  await dialog.getByRole('button', { name: '确认修改' }).click();
  const already = page.locator('[data-radar-email-notice]');
  await expect(already).toHaveText('这个邮箱已经订阅过了。提醒设置已更新。');
  expect(intents).toEqual(['subscribe', 'subscribe', 'manage']);
  await page.reload();
  await page.locator('[data-radar-email-edit-subscription]').click();
  await enterAddress();
  await expect(dialog).toBeHidden();
  await expect(already).toHaveText(duplicateMessage);
  await expect(dialog.getByLabel('邮箱验证码')).toBeHidden();
});

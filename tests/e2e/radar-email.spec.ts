import { expect, test, type Page } from '@playwright/test';

// The E2E Worker has no email provider. Model its email responses while
// exercising the production pages, JavaScript, localization and navigation.
async function mockRadarMail(page: Page) {
  let subscribed = false;
  await page.context().route('**/api/radar/email/*', async (route) => {
    const request = route.request();
    const action = new URL(request.url()).pathname.split('/').pop();
    if (action === 'status' && request.method() === 'GET') {
      return route.fulfill({ json: { subscribed } });
    }
    expect(request.method()).toBe('POST');
    const { code, token, email, platforms } = request.postDataJSON();
    if (action === 'subscribe') {
      if (
        subscribed &&
        email === 'reader@example.test' &&
        platforms.join() === 'codex'
      ) {
        return route.fulfill({ json: { ok: true, alreadySubscribed: true } });
      }
      return route.fulfill({ status: 202, json: { ok: true } });
    }
    if (
      (action === 'confirm-code' && code === '234567') ||
      (action === 'confirm' && token === 'existing')
    ) {
      subscribed = true;
      return route.fulfill({ json: { ok: true, alreadySubscribed: true } });
    }
    if (action === 'confirm-code' && code === '123456') subscribed = true;
    else if (action === 'confirm' && token === 'valid') subscribed = true;
    else if (action === 'unsubscribe' && token === 'valid') subscribed = false;
    else return route.fulfill({ status: 410, json: { ok: false } });
    return route.fulfill({ json: { ok: true } });
  });
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
  await dialog.getByRole('button', { name: '发送验证码' }).click();
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

test('an existing subscriber proves ownership once on a new browser', async ({
  page,
}) => {
  await mockRadarMail(page);
  await page.goto('/radar');
  await page.getByRole('button', { name: '订阅邮件提醒', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const enterAddress = async () => {
    await dialog.getByRole('checkbox', { name: 'Codex' }).check();
    await dialog.getByLabel('邮箱地址').fill('reader@example.test');
    await dialog.getByRole('button', { name: '发送验证码' }).click();
  };
  await enterAddress();
  await dialog.getByLabel('邮箱验证码').fill('234567');
  await dialog.getByRole('button', { name: '确认订阅' }).click();
  const already = page.getByText('这个邮箱已经订阅过了。', { exact: true });
  await expect(already).toBeVisible();
  await page.reload();
  await page.locator('[data-radar-email-edit-subscription]').click();
  await enterAddress();
  await expect(already).toBeVisible();
  await expect(dialog.getByLabel('邮箱验证码')).toBeHidden();
});

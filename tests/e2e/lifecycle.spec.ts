import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  assertIsolatedOrigin,
  localSql,
  moderateFixture,
  resetIsolatedDatabase,
  stubTurnstileSdk,
} from './helpers';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async ({ page, baseURL }) => {
  assertIsolatedOrigin(baseURL);
  resetIsolatedDatabase();
  await stubTurnstileSdk(page);
});

test('submit, save credentials, publish, flower, edit and withdraw through the real local application', async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(90_000);
  const original =
    '端到端测试示例：账号在验证步骤停住了，这里只记录我亲眼看到的提示。';
  const revised =
    '端到端测试修改示例：补充了后续情况，依旧没有填写任何个人信息。';
  await page.goto('/submit');
  await expect(page.locator('#turnstile')).toHaveAttribute(
    'data-turnstile-sitekey',
    '1x00000000000000000000AA',
  );
  await expect(page.locator('#turnstile')).toHaveAttribute(
    'data-e2e-turnstile-ready',
    'true',
  );
  await page.locator('#codename').fill('端到端测试示例');
  await page.locator('#vendor').selectOption('claude');
  await page.locator('input[name="event"][value="verification"]').check();
  await page.locator('#story').fill(original);
  await page.locator('#agree').check();
  const submitted = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/tombstones' &&
      response.request().method() === 'POST',
  );
  await page.locator('#submit-button').click();
  expect((await submitted).status()).toBe(201);
  await expect(page.locator('#cred')).toBeVisible();
  await expect(page.locator('#close-cred')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('#cred')).toBeVisible();
  const id = (await page.locator('#credential-id').textContent())!.trim();
  const secret = (await page
    .locator('#credential-secret')
    .textContent())!.trim();
  expect(id).toMatch(/^[A-Z2-7]{10}$/);
  expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(
    await page.evaluate(() => localStorage.getItem('haomeile:credential')),
  ).toBeNull();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#dl-cred').click();
  const download = await downloadPromise;
  const credentialPath = testInfo.outputPath('local-test-credential.txt');
  await download.saveAs(credentialPath);
  const credentialFile = await readFile(credentialPath, 'utf8');
  expect(credentialFile).toContain(id);
  expect(credentialFile).toContain(secret);
  await page.locator('#saved').check();
  await page.locator('#remember').check();
  await expect(page.locator('#close-cred')).toBeEnabled();
  await page.locator('#close-cred').click();
  await expect(page.locator('#cred')).not.toBeVisible();
  const pendingStats = await (await request.get('/api/stats')).json();
  expect(pendingStats.data.total).toBe(0);
  expect((await request.get(`/t/${id}`)).status()).toBe(404);

  // Moderation is a local D1 fixture. Signed-JWT administrator authorization
  // and review actions are exercised separately by tests/api/admin.test.ts.
  moderateFixture(id);
  const wall = await page.goto('/');
  expect(await wall!.text()).toContain('端到端测试示例');
  const card = page.locator(`article.tomb[data-id="${id}"]`);
  await expect(card).toContainText(original);
  const flower = card.locator('.flower-btn');
  const flowerResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/api/tombstones/${id}/flower`,
  );
  await flower.click();
  expect((await flowerResponse).status()).toBe(200);
  await expect(flower).toHaveAttribute('data-count', '1');
  await expect(flower).toHaveAttribute('aria-pressed', 'true');
  await flower.click();
  await expect(
    page.getByText('今天已经给这块碑献过花了', { exact: true }),
  ).toBeVisible();
  await expect(flower).toHaveAttribute('data-count', '1');
  const duplicate = await page.evaluate(async (tombstoneId) => {
    const response = await fetch(`/api/tombstones/${tombstoneId}/flower`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        visitor_id: localStorage.getItem('haomeile:visitor'),
      }),
    });
    return response.json();
  }, id);
  expect(duplicate.data.flowers).toBe(1);

  await page.goto('/manage');
  await page.locator('#use-saved').click();
  await expect(page.locator('#pill')).toHaveText('已公开');
  await page.locator('#s-edit').click();
  await expect(page.locator('#edit-id')).toHaveValue(id);
  await page.getByRole('button', { name: '读取我的墓碑', exact: true }).click();
  await expect(page.locator('#tomb-form')).toBeVisible();
  await page.locator('#codename').fill('修改后的端到端测试示例');
  await page.locator('#story').fill(revised);
  await page.locator('#agree').check();
  const patchResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/manage/patch',
  );
  await page.locator('#submit-button').click();
  expect((await patchResponse).status()).toBe(200);
  await expect(page.locator('#submit-error')).toContainText('修改已提交');
  await page.goto('/manage');
  await page.locator('#use-saved').click();
  await expect(page.locator('#pill')).toHaveText('已公开，修改审核中');
  const unchanged = await request.get(`/t/${id}`);
  expect(await unchanged.text()).toContain(original);
  expect(await unchanged.text()).not.toContain(revised);
  moderateFixture(id, true);
  const changed = await request.get(`/t/${id}`);
  expect(await changed.text()).toContain(revised);
  expect(await changed.text()).not.toContain(original);

  await page.goto('/manage');
  await page.locator('#use-saved').click();
  await expect(page.locator('#pill')).toHaveText('已公开');
  await page.locator('#s-withdraw').click();
  const withdrawResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/manage/withdraw',
  );
  await page
    .locator('#withdraw')
    .getByRole('button', { name: '撤回这块碑', exact: true })
    .click();
  expect((await withdrawResponse).status()).toBe(200);
  await expect(page.locator('#pill')).toHaveText('已撤回');
  await expect(page.locator('#status-text')).toContainText('碑文已清空');
  expect((await request.get(`/t/${id}`)).status()).toBe(410);
  expect((await request.get(`/api/tombstones/${id}`)).status()).toBe(404);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).not.toContain(`/t/${id}`);
  const finalStats = await (await request.get('/api/stats')).json();
  expect(finalStats.data.total).toBe(0);
  const row = localSql(
    `SELECT status,codename,nickname,story,epitaph,secret_hash,pending_patch,flags,flowers FROM tombstones WHERE id='${id}'`,
  )[0];
  expect(row).toEqual({
    status: 'withdrawn',
    codename: null,
    nickname: null,
    story: null,
    epitaph: null,
    secret_hash: '',
    pending_patch: null,
    flags: null,
    flowers: 0,
  });
});

for (const [label, value, message] of [
  [
    'email',
    '端到端测试示例：我误填了 hello@example.com，需要在提交前删除。',
    '邮箱地址',
  ],
  [
    'phone',
    '端到端测试示例：我误填了 13800138000，需要在提交前删除。',
    '手机号',
  ],
] as const) {
  test(`blocks ${label} in the form before a business request is sent`, async ({
    page,
  }) => {
    let submissionRequests = 0;
    page.on('request', (request) => {
      if (
        new URL(request.url()).pathname === '/api/tombstones' &&
        request.method() === 'POST'
      )
        submissionRequests++;
    });
    await page.goto('/submit');
    await page.locator('#codename').fill('隐私拦截测试示例');
    await page.locator('#vendor').selectOption('other');
    await page.locator('#story').fill(value);
    await page.locator('#agree').check();
    await page.locator('#submit-button').click();
    await expect(page.locator('#error-story')).toContainText(message);
    await expect(page.locator('#story')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page.locator('#cred')).not.toBeVisible();
    expect(submissionRequests).toBe(0);
  });
}

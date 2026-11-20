import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { assertIsolatedOrigin, E2E_ORIGIN, localSql } from './helpers';

const fixtureId = 'BILINGUA22';
const userText = {
  codename: '使用须知',
  nickname: '管理我的墓碑',
  story: '写你看到了什么、做了什么。猜测请注明“猜测”。',
  epitaph: '回到纪念墙',
};

// Mock only Cloudflare's external browser SDK. These language checks do not
// submit business mutations or rely on a production account or captcha key.
async function languageSdk(page: Page): Promise<void> {
  await page.route(
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `window.turnstile = {
          render(container, options) {
            container.dataset.e2eLanguage = options.language;
            container.textContent = 'Local verification widget';
            options.callback('local-language-test-token');
            return 'local-language-widget';
          },
          getResponse() { return 'local-language-test-token'; },
          reset() {}
        };`,
      }),
  );
}

async function expectEnglishSystemCopy(page: Page): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const copy = await page.locator('body').evaluate((body) => {
    const clone = body.cloneNode(true) as HTMLElement;
    // User content and the Chinese brand intentionally remain unchanged.
    // Hidden first-party dialog text is checked too.
    clone
      .querySelectorAll(
        'script, style, .brand, #hero-title, .tomb-name, .tomb-epitaph, .tomb-story, .facts dd',
      )
      .forEach((node) => node.remove());
    return clone.textContent?.replaceAll('号没了', '') || '';
  });
  expect(copy).not.toMatch(/\p{Script=Han}/u);
  const attributes = await page
    .locator('[placeholder], [alt], [aria-label], meta[content]')
    .evaluateAll((elements) =>
      elements.flatMap((element) =>
        ['placeholder', 'alt', 'aria-label', 'content']
          .map((name) => element.getAttribute(name) || '')
          .map((value) => value.replaceAll('号没了', '')),
      ),
    );
  expect(attributes.join('\n')).not.toMatch(/\p{Script=Han}/u);
  expect((await page.title()).replaceAll('号没了', '')).not.toMatch(
    /\p{Script=Han}/u,
  );
}

test.beforeAll(({ baseURL }) => {
  assertIsolatedOrigin(baseURL);
  // These are exact dictionary source strings, so translating user content
  // accidentally would be observable rather than masked by unrelated wording.
  localSql(
    `INSERT OR REPLACE INTO tombstones (id,secret_hash,codename,nickname,vendor,event_type,plan,died_at,story,epitaph,status,created_at,updated_at,approved_at) VALUES ('${fixtureId}','non-usable-local-language-fixture','${userText.codename}','${userText.nickname}','claude','verification','max','2026-11-18','${userText.story}','${userText.epitaph}','approved','2026-11-18T00:00:00Z','2026-11-18T00:00:00Z','2026-11-18T00:00:00Z');`,
  );
});
test.afterAll(() => {
  localSql(`DELETE FROM tombstones WHERE id='${fixtureId}';`);
});
test.beforeEach(async ({ page }) => languageSdk(page));

test('Chinese browsers stay on the Chinese page without a language selector', async ({
  page,
}) => {
  await page.goto('/submit?mode=edit');
  await expect(page).toHaveURL(/\/submit\?mode=edit$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('#submit-title')).toHaveText('修改墓碑');
  await expect(
    page.locator('[data-locale-switch], .locale-switch'),
  ).toHaveCount(0);
});

for (const locale of ['en-US', 'fr-FR']) {
  test(`${locale} browsers automatically receive English and preserve edit queries`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ locale, baseURL });
    try {
      const page = await context.newPage();
      await languageSdk(page);
      const response = await page.goto('/submit?mode=edit');
      const redirect = await response!.request().redirectedFrom()!.response();
      expect(redirect!.status()).toBe(302);
      expect(redirect!.headers()['cache-control']).toContain('no-store');
      expect(redirect!.headers().vary).toMatch(/Accept-Language/i);
      await expect(page).toHaveURL(/\/en\/submit\?mode=edit$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('#submit-title')).toHaveText('Edit memorial');
      await expect(
        page.locator('[data-locale-switch], .locale-switch'),
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
}

test('Traditional Chinese browsers receive Chinese automatically', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ locale: 'zh-HK', baseURL });
  try {
    const page = await context.newPage();
    await languageSdk(page);
    const response = await page.goto('/submit');
    expect(response!.request().redirectedFrom()).toBeNull();
    await expect(page).toHaveURL(/\/submit$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page.locator('#turnstile')).toHaveAttribute(
      'data-e2e-language',
      'zh-cn',
    );
  } finally {
    await context.close();
  }
});

test('English browsers open shared memorial links automatically without translating user text', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ locale: 'en-US', baseURL });
  try {
    const page = await context.newPage();
    await languageSdk(page);
    await page.goto(`/t/${fixtureId}?source=shared`);
    await expect(page).toHaveURL(
      new RegExp(`/en/t/${fixtureId}\\?source=shared$`),
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const memorial = page.locator(`article.tomb[data-id="${fixtureId}"]`);
    await expect(memorial.locator('.tomb-name')).toHaveText(userText.codename);
    await expect(memorial.locator('.tomb-story')).toHaveText(userText.story);
    await expect(memorial.locator('.facts dd').first()).toHaveText(
      userText.nickname,
    );
    await expect(memorial.locator('.tag')).toHaveText([
      'Claude',
      'Verification blocked',
    ]);
  } finally {
    await context.close();
  }
});

for (const path of [
  '/en/',
  '/en/submit',
  '/en/submit?mode=edit',
  '/en/manage',
  '/en/epitaph',
  '/en/appeal',
  '/en/tips',
  '/en/tips/codex-personal-work-accounts',
  '/en/privacy',
  '/en/about',
  '/en/v/claude',
  '/en/not-a-page',
]) {
  test(`${path} translates system text, accessibility copy and metadata`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    expect(response!.status()).toBe(path.endsWith('not-a-page') ? 404 : 200);
    if (path === '/en/epitaph')
      await expect(page.locator('#m-name')).toHaveValue('Little Orange');
    await expectEnglishSystemCopy(page);
    await expect(page.locator('.brand')).toHaveAttribute('href', '/en/');
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      'content',
      'en_US',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(
        '^' + E2E_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/en(?:/|$)',
      ),
    );
  });
}

test('English plans, required-field errors and captcha language follow the page', async ({
  page,
}) => {
  await page.goto('/submit');
  await expect(page.locator('#turnstile')).toHaveAttribute(
    'data-e2e-language',
    'zh-cn',
  );
  await page.goto('/en/submit');
  await expect(page.locator('#turnstile')).toHaveAttribute(
    'data-e2e-language',
    'en',
  );
  const product = page.locator('#vendor');
  const plan = page.locator('#plan');
  await product.selectOption('claude');
  await expect(plan.locator('option')).toHaveText([
    'Unknown or prefer not to say',
    'Free',
    'Pro',
    'Max',
    'Ultra',
  ]);
  await plan.selectOption('max');
  await product.selectOption('codex');
  await expect(plan).toHaveValue('unknown');
  await expect(plan.locator('option')).toHaveText([
    'Unknown or prefer not to say',
    'Free',
    'Go',
    'Plus',
    'Pro',
  ]);
  await plan.selectOption('plus');
  await product.selectOption('antigravity');
  await expect(plan).toHaveValue('unknown');
  await expect(plan.locator('option')).toHaveText([
    'Unknown or prefer not to say',
    'Free',
    'Pro',
    'Ultra',
  ]);
  await page
    .getByRole('button', { name: 'Submit for review', exact: true })
    .click();
  await expect(page.locator('#codename')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.locator('#error-codename')).toHaveText(
    'This field is required.',
  );
  await expect(page.locator('#error-story')).toHaveText(
    'This field is required.',
  );
  await expect(page.locator('#error-consent')).toHaveText(
    'Agree to public posting before submitting.',
  );
  await expectEnglishSystemCopy(page);
});

test('English cards draw English labels and download a real PNG locally', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (
      text,
      x,
      y,
      maxWidth,
    ) {
      const drawn = JSON.parse(
        this.canvas.dataset.e2eDrawnText || '[]',
      ) as string[];
      drawn.push(text);
      this.canvas.dataset.e2eDrawnText = JSON.stringify(drawn);
      if (maxWidth === undefined) return original.call(this, text, x, y);
      return original.call(this, text, x, y, maxWidth);
    };
  });
  const outgoing: string[] = [];
  page.on('request', (request) => {
    if (['fetch', 'xhr', 'websocket'].includes(request.resourceType()))
      outgoing.push(request.url());
  });
  await page.goto('/en/epitaph');
  await expect(page.locator('#m-name')).toHaveValue('Little Orange');
  expect(await page.locator('#m-epitaph').inputValue()).not.toMatch(
    /\p{Script=Han}/u,
  );
  await page.locator('#m-name').fill('English Account');
  await page.locator('#m-epitaph').fill('It finished one last thought.');
  const canvas = page.locator('#card');
  await expect
    .poll(() => canvas.getAttribute('data-e2e-drawn-text'))
    .toContain('Cause: Account disabled');
  expect(await canvas.getAttribute('data-e2e-drawn-text')).not.toMatch(
    /\p{Script=Han}/u,
  );
  const downloadEvent = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download image', exact: true })
    .click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('Memorial-English Account.png');
  const bytes = await readFile((await download.path())!);
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(bytes.readUInt32BE(16)).toBe(760);
  expect(bytes.readUInt32BE(20)).toBe(960);
  expect(outgoing).toEqual([]);
});

test('English memorial pages retain every original user-written field', async ({
  page,
}) => {
  for (const path of ['/en/', `/en/t/${fixtureId}`]) {
    await page.goto(path);
    const memorial = page.locator(`article.tomb[data-id="${fixtureId}"]`);
    await expect(memorial.locator('.tomb-name')).toHaveText(userText.codename);
    await expect(memorial.locator('.tomb-story')).toHaveText(userText.story);
    await expect(memorial.locator('.tomb-epitaph')).toHaveText(
      userText.epitaph,
    );
    await expect(memorial.locator('.tag')).toHaveText([
      'Claude',
      'Verification blocked',
    ]);
    if (path.includes('/t/'))
      await expect(memorial.locator('.facts dd').first()).toHaveText(
        userText.nickname,
      );
    await expect(memorial.locator('.flower-btn')).toHaveAttribute(
      'aria-label',
      /^Flowers \d+\. Leave a flower/,
    );
  }
});

for (const width of [375, 1440]) {
  test(`English pages fit a ${width}px viewport`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/en/',
      '/en/submit',
      '/en/submit?mode=edit',
      '/en/epitaph',
      '/en/appeal',
      '/en/manage',
    ]) {
      await page.goto(path);
      const geometry = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(geometry.document, path).toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.body, path).toBeLessThanOrEqual(geometry.viewport);
      await expect(
        page.locator('[data-locale-switch], .locale-switch'),
      ).toHaveCount(0);
    }
    await page.screenshot({
      path: testInfo.outputPath('english-layout.png'),
      fullPage: true,
    });
  });
}

test('the English administrator route still requires authentication', async ({
  request,
}) => {
  const response = await request.get('/en/admin');
  expect(response.status()).toBe(403);
  expect((await response.json()).error.message).toBe(
    'Authenticate as the site administrator first.',
  );
});

import { expect, test } from '@playwright/test';
import { assertIsolatedOrigin, localSql, stubTurnstileSdk } from './helpers';

const fixtureId = 'RESPONSIV2';
const longFixtureId = 'LONGTEXT22';
const longContent = {
  codename: 'W'.repeat(32),
  nickname: 'W'.repeat(24),
  epitaph: 'W'.repeat(120),
  story: '示例：' + 'W'.repeat(600),
};
const longName = '本地示例' + 'A'.repeat(28);
const longEpitaph = '示例' + 'B'.repeat(118);
test.beforeAll(({ baseURL }) => {
  assertIsolatedOrigin(baseURL);
  localSql(
    `INSERT OR REPLACE INTO tombstones (id,secret_hash,codename,vendor,event_type,died_at,story,epitaph,status,created_at,updated_at,approved_at) VALUES ('${fixtureId}','non-usable-test-fixture','${longName}','antigravity','verification','2026-11-18','这是一段只用于本地响应式检查的示例经过。','${longEpitaph}','approved',strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));`,
  );
  localSql(
    `INSERT OR REPLACE INTO tombstones (id,secret_hash,codename,nickname,vendor,event_type,died_at,story,epitaph,status,created_at,updated_at,approved_at) VALUES ('${longFixtureId}','non-usable-test-fixture','${longContent.codename}','${longContent.nickname}','antigravity','verification','2026-11-18','${longContent.story}','${longContent.epitaph}','approved',strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));`,
  );
});
test.afterAll(() => {
  localSql(
    `DELETE FROM tombstones WHERE id IN ('${fixtureId}','${longFixtureId}');`,
  );
});

const routes = [
  '/',
  '/v/claude',
  `/t/${fixtureId}`,
  '/submit',
  '/submit?mode=edit',
  '/manage',
  '/epitaph',
  '/appeal',
  '/rules',
  '/privacy',
  '/about',
  '/not-a-page',
];
for (const colorScheme of ['light', 'dark'] as const) {
  for (const path of routes) {
    test(`${path} fits a 375px ${colorScheme} viewport`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await stubTurnstileSdk(page);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(path);
      expect(response!.status()).toBe(path === '/not-a-page' ? 404 : 200);
      await page.waitForLoadState('networkidle');
      const widths = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(widths.document).toBeLessThanOrEqual(widths.viewport);
      expect(widths.body).toBeLessThanOrEqual(widths.viewport);
      if (path === '/') {
        const title = page.locator('.scene-copy h2');
        await expect(title).toBeVisible();
        await expect(title).toHaveText('被封了、被停了、卡在验证了？');
        const bounds = await title.evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const text = range.getBoundingClientRect();
          return {
            left: text.left,
            right: text.right,
            height: text.height,
            viewport: innerWidth,
          };
        });
        expect(bounds.left).toBeGreaterThanOrEqual(16);
        expect(bounds.right).toBeLessThanOrEqual(bounds.viewport - 16);
        expect(bounds.height).toBeGreaterThan(0);
      }
      if (path === '/' || path.startsWith('/t/')) {
        const textBounds = await page
          .locator('.tomb-name,.tomb-epitaph,.tomb-story,.facts dd')
          .evaluateAll((elements) =>
            elements.map((element) => {
              const range = document.createRange();
              range.selectNodeContents(element);
              const bounds = range.getBoundingClientRect();
              return {
                left: bounds.left,
                right: bounds.right,
                width: innerWidth,
              };
            }),
          );
        for (const bounds of textBounds) {
          expect(bounds.left).toBeGreaterThanOrEqual(0);
          expect(bounds.right).toBeLessThanOrEqual(bounds.width);
        }
      }
      expect(errors).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath('mobile.png'),
        fullPage: true,
      });
    });
  }
  test(`long unbroken user text wraps within mobile tombstones in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const path of ['/', `/t/${longFixtureId}`]) {
      await page.goto(path);
      const card = page.locator(`article.tomb[data-id="${longFixtureId}"]`);
      await expect(card.locator('.tomb-name')).toHaveText(longContent.codename);
      await expect(card.locator('.tomb-epitaph')).toHaveText(
        longContent.epitaph,
      );
      const selectors = [
        '.tomb-name',
        '.tomb-epitaph',
        '.tomb-story',
        ...(path === '/' ? [] : ['.facts dd:first-of-type']),
      ];
      for (const selector of selectors) {
        const geometry = await card.locator(selector).evaluate((element) => {
          const box = element.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(element);
          const text = range.getBoundingClientRect();
          const face = element.closest('.tomb-face')!.getBoundingClientRect();
          return {
            box: { left: box.left, right: box.right, height: box.height },
            text: {
              left: text.left,
              right: text.right,
              top: text.top,
              bottom: text.bottom,
            },
            face: { top: face.top, bottom: face.bottom },
            overflow: element.scrollWidth > element.clientWidth,
          };
        });
        expect(geometry.text.left).toBeGreaterThanOrEqual(
          geometry.box.left - 1,
        );
        expect(geometry.text.right).toBeLessThanOrEqual(geometry.box.right + 1);
        expect(geometry.overflow).toBe(false);
        // Serif glyph ink may exceed an individual CSS line box. Check the
        // actual stone clipping boundary; only wall stories are intentionally clipped.
        if (selector !== '.tomb-story' || path !== '/') {
          expect(geometry.text.top).toBeGreaterThanOrEqual(geometry.face.top);
          expect(geometry.text.bottom).toBeLessThanOrEqual(
            geometry.face.bottom,
          );
        }
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}
test('keeps the administrator page and API protected without an Access assertion', async ({
  request,
  baseURL,
}) => {
  assertIsolatedOrigin(baseURL);
  expect((await request.get('/admin')).status()).toBe(403);
  expect((await request.get('/api/admin/queue?type=new')).status()).toBe(403);
});

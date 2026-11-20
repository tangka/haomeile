import { expect, test } from '@playwright/test';
import {
  assertIsolatedOrigin,
  E2E_ORIGIN,
  localSql,
  resetIsolatedDatabase,
} from './helpers';

const communityId = 'COMMUNITY2';
const communityTitle = '本地社区分页示例';
const communityEnglishTitle = 'Local curated pagination fixture';
const communityEnglishStory =
  'Local end-to-end fixture: the author reported unavailable account access. The exact incident date was not stated. This is an editorial summary.';
const source = 'https://discuss.ai.google.dev/t/199388';

test.beforeEach(({ baseURL }) => {
  assertIsolatedOrigin(baseURL);
  resetIsolatedDatabase();
  const submissions = Array.from({ length: 20 }, (_, index) => {
    const id = 'PAGINGAAA' + String.fromCharCode(65 + index);
    return `INSERT INTO tombstones (id,secret_hash,codename,vendor,event_type,died_at,story,status,created_at,updated_at,approved_at,origin) VALUES ('${id}','non-usable-local-pagination-fixture','本地投稿分页示例','claude','verification','2026-11-18','这是一段仅用于隔离端到端分页测试的本地示例。','approved','2026-11-20T03:00:00.000Z','2026-11-20T03:00:00.000Z','2026-11-20T03:00:00.000Z','submission');`;
  });
  // The curated fixture is older than every submission, so it must be appended
  // through the real pagination API and browser card renderer, not initial SSR.
  localSql(
    submissions.join('\n') +
      `INSERT INTO tombstones (id,secret_hash,codename,vendor,event_type,died_at,story,status,created_at,updated_at,approved_at,origin,source_url,source_platform,source_published_at,codename_en,story_en) VALUES ('${communityId}','','${communityTitle}','antigravity','suspended','','本地端到端示例：原帖称账号访问不可用，事件发生日期未说明。此处为编辑摘要。','approved','2026-11-19T03:00:00.000Z','2026-11-19T03:00:00.000Z','2026-11-19T03:00:00.000Z','community','${source}','Google AI Developers Forum','2026-11-10','${communityEnglishTitle}','${communityEnglishStory}');`,
  );
});

test.afterEach(({ baseURL }) => {
  assertIsolatedOrigin(baseURL);
  resetIsolatedDatabase();
});

test('English pagination appends a sourced community summary without treating it as an owner submission', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const first = await page.goto('/en/');
  expect(first!.status()).toBe(200);
  expect(await first!.text()).not.toContain(`data-id="${communityId}"`);
  await expect(page.locator('#rows article.tomb')).toHaveCount(20);
  await expect(page.locator('#more')).toBeVisible();
  await expect(page.locator('[data-ssr="tally"]')).toContainText(
    '20 public voluntary reports',
  );

  const nextPage = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.origin === E2E_ORIGIN &&
      url.pathname === '/api/tombstones' &&
      url.searchParams.has('cursor') &&
      response.request().method() === 'GET'
    );
  });
  await page.locator('#more').click();
  const response = await nextPage;
  expect(response.status()).toBe(200);
  expect((await response.json()).data.items).toEqual([
    expect.objectContaining({
      id: communityId,
      origin: 'community',
      codename_en: communityEnglishTitle,
      story_en: communityEnglishStory,
      died_at: '',
    }),
  ]);

  const curated = page.locator(`#rows article.tomb[data-id="${communityId}"]`);
  await expect(page.locator('#rows article.tomb')).toHaveCount(21);
  await expect(curated.locator('.tomb-name')).toHaveText(communityEnglishTitle);
  await expect(curated.locator('.tomb-story')).toHaveText(
    communityEnglishStory,
  );
  await expect(curated.locator('.tomb-days')).toHaveText(
    'Public community record',
  );
  await expect(curated.locator('.tomb-range')).toHaveText(
    'Incident date not stated',
  );
  await expect(curated.locator('.tomb-source a')).toHaveAttribute(
    'href',
    source,
  );
  await expect(curated.locator('.tomb-source a')).toHaveAttribute(
    'rel',
    /noopener/,
  );
  await expect(curated.locator('.tomb-source time')).toHaveAttribute(
    'datetime',
    '2026-11-10',
  );
  await expect(curated.locator('.tomb-unverified')).toHaveText(
    'Community summary, unverified',
  );
  await expect(curated).not.toContainText('User-submitted, unverified');
  await expect(page.locator('[data-ssr="community-tally"]')).toContainText(
    /\b1\b/,
  );
  await expect(page.locator('#more')).toBeHidden();

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);

  const detail = await page.goto(`/t/${communityId}`);
  expect(await detail!.text()).toContain(
    `<h1 class="tomb-name">${communityTitle}</h1>`,
  );
});

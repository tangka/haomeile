import { expect, test } from '@playwright/test';
test('submit loads Turnstile even when the container exposes a window named property', async ({
  page,
}) => {
  // #turnstile itself makes window.turnstile truthy before the SDK is loaded.
  // A small deterministic SDK stand-in verifies loading/rendering without CAPTCHA
  // availability or challenge completion affecting this application regression.
  await page.route(
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `window.turnstile = {
        render: function (container, options) {
          container.setAttribute('data-widget-rendered', 'true');
          options.callback('test-only-token');
          return 'test-widget';
        },
        getResponse: function () { return 'test-only-token'; },
        reset: function () {}
      };`,
      }),
  );
  await page.goto('/submit');
  await expect(page.locator('#turnstile')).toHaveAttribute(
    'data-widget-rendered',
    'true',
  );
  await expect(page.locator('#submit-error')).toBeHidden();
});

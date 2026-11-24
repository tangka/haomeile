import { expect, test } from '@playwright/test';

test('confirmed resets between samples have persistent platform-colored vertical lines', async ({
  page,
}) => {
  await page.goto('/en/radar');
  const markers = page.locator('[data-radar-event]');
  await expect(markers).toHaveCount(2);
  await expect(markers.nth(0)).toContainText('Codex reset card');
  await expect(markers.nth(1)).toContainText('Antigravity quota reset');
  const readout = page.locator('[data-radar-trend-readout]');
  await expect(readout).toBeEmpty();

  const chart = page.locator('canvas[data-radar-trend]');
  // Both records are exactly halfway through the 24-hour window, between samples.
  // Look for a tall column of each platform's pixels before there is a cursor.
  const coloredLines = () =>
    chart.evaluate((node) => {
      const canvas = node as HTMLCanvasElement;
      const { width, height } = canvas;
      const pixels = canvas
        .getContext('2d')!
        .getImageData(0, 0, width, height).data;
      return Array.from(document.querySelectorAll('[data-radar-event]')).map(
        (marker) => {
          const rgb = getComputedStyle(marker, '::before')
            .borderLeftColor.match(/\d+/g)!
            .map(Number);
          for (let x = Math.floor(width * 0.48); x <= width * 0.52; x++) {
            let matches = 0;
            for (let y = 0; y < height; y++) {
              const offset = 4 * (y * width + x);
              if (
                pixels[offset + 3] > 230 &&
                rgb.every((v, i) => Math.abs(v - pixels[offset + i]) <= 2)
              )
                matches++;
            }
            if (matches > height * 0.12) return true;
          }
          return false;
        },
      );
    });
  await expect.poll(coloredLines).toEqual([true, true]);
  await chart.focus();
  await chart.press('Home');
  await chart.press('ArrowRight');
  await expect(readout).toContainText('Codex reset card');
  await expect(readout).toContainText('Antigravity quota reset');
  await expect(readout).not.toContainText('%');
});

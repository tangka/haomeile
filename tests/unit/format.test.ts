import { describe, expect, it } from 'vitest';
import { ago, fmtDate, lifeLine, num } from '../../src/site/scripts/format';
describe('shared display formatting from the design', () => {
  it('formats a precise lifetime', () =>
    expect(
      lifeLine({
        born_at: '2026-09-12',
        born_precision: 'day',
        died_at: '2026-11-14',
      }),
    ).toEqual({ days: '存活 63 天', range: '2026.09.12 至 2026.11.14' }));
  it('marks month precision as approximate', () =>
    expect(
      lifeLine({
        born_at: '2025-09',
        born_precision: 'month',
        died_at: '2026-11-18',
      }),
    ).toEqual({ days: '存活约 443 天', range: '2025.09 至 2026.11.18' }));
  it('handles unknown dates', () =>
    expect(
      lifeLine({
        born_at: null,
        born_precision: 'none',
        died_at: '2026-11-15',
      }),
    ).toEqual({ days: '存活天数不详', range: '卒于 2026.11.15' }));
  it('does not show negative lifetimes', () =>
    expect(
      lifeLine({
        born_at: '2026-12-01',
        born_precision: 'day',
        died_at: '2026-11-15',
      }),
    ).toEqual({ days: '存活天数不详', range: '卒于 2026.11.15' }));
  it('formats numbers and dates consistently', () => {
    expect(num(1204)).toBe('1,204');
    expect(fmtDate('2026-11-18')).toBe('2026.11.18');
  });
  it('formats relative time', () => {
    const now = Date.UTC(2026, 10, 20);
    expect(ago(now - 11 * 60_000, now)).toBe('11 分钟前');
  });
});

import { describe, expect, it } from 'vitest';
import { getLabels, LABELS } from '../../src/site/scripts/labels';
import { ago, lifeLine } from '../../src/site/scripts/format';
import { getEpitaphs, EPITAPHS } from '../../src/site/scripts/epitaphs';
import { tr } from '../../src/shared/i18n';

describe('localized dynamic system text', () => {
  it('keeps Chinese labels and legacy plan meanings while exposing English labels', () => {
    expect(getLabels('zh')).toEqual(LABELS);
    const english = getLabels('en');
    expect(english.vendor.codex).toBe('Codex');
    expect(english.plan.paid_personal).toBe('Personal paid plan (legacy)');
    expect(english.status.pending).toBe('Awaiting review');
    expect(english.event_type.verification).toBe('Verification blocked');
  });

  it('distinguishes exact, approximate and unknown English lifetimes', () => {
    expect(
      lifeLine(
        { born_at: '2026-11-19', born_precision: 'day', died_at: '2026-11-20' },
        'en',
      ),
    ).toEqual({ days: 'Lived 1 day', range: '2026-11-19 to 2026-11-20' });
    expect(
      lifeLine(
        { born_at: '2026-11', born_precision: 'month', died_at: '2026-11-20' },
        'en',
      ).days,
    ).toBe('Lived about 19 days');
    expect(
      lifeLine(
        { born_at: null, born_precision: 'none', died_at: '2026-11-20' },
        'en',
      ),
    ).toEqual({ days: 'Lifespan unknown', range: 'Died 2026-11-20' });
  });

  it('formats relative time without leaking Chinese suffixes', () => {
    const now = Date.UTC(2026, 10, 20);
    expect(ago(now - 60_000, now, 'en')).toBe('1 minute ago');
    expect(ago(now - 2 * 86400_000, now, 'en')).toBe('2 days ago');
    expect(ago(now - 8 * 86400_000, now, 'en')).toBe('2026-11-12');
  });

  it('translates dynamic validation parameters and leaves unknown content unchanged', () => {
    expect(tr('这一项最多 800 个字。', 'en')).toBe(
      'This field must be 800 characters or fewer.',
    );
    expect(tr('献花 1,234，今天已献过花', 'en')).toBe(
      'Flowers 1,234. You already left a flower today',
    );
    expect(tr('我的自述原文', 'en')).toBe('我的自述原文');
  });

  it('offers an English counterpart for every random epitaph', () => {
    expect(getEpitaphs('zh')).toBe(EPITAPHS);
    expect(getEpitaphs('en')).toHaveLength(EPITAPHS.length);
    expect(
      getEpitaphs('en').every((text) => !/\p{Script=Han}/u.test(text)),
    ).toBe(true);
  });
});

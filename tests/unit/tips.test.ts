import { describe, expect, it } from 'vitest';
import { TIP_ARTICLES } from '../../src/shared/tips';

describe('guides compiled from other people’s posts', () => {
  it.each(TIP_ARTICLES.map((tip) => [tip.slug, tip] as const))(
    '%s never speaks as the original author',
    (_slug, tip) => {
      const copy = [
        tip.heading,
        tip.summary,
        tip.experience,
        ...tip.steps.map(({ text }) => text),
      ];
      for (const { zh, en } of copy) {
        expect(zh).not.toContain('我');
        // Apple's product name is the only allowed “My”.
        expect(en.replaceAll('Hide My Email', '')).not.toMatch(
          /\b(?:I|I[’'](?:m|d|ve|ll)|my|mine|me)\b/i,
        );
      }
      expect(tip.heading.zh).not.toBe(tip.sourceTitle);
      expect(tip.experience.zh).toContain(`原文作者 ${tip.sourceAuthor}`);
      expect(tip.experience.en).toContain(tip.sourceAuthor);
    },
  );

  it('does not repeat titles about evading reviews or region rules', () => {
    for (const tip of TIP_ARTICLES)
      if (/防封|风控|美区 Apple 礼品卡/.test(tip.sourceTitle))
        expect(tip.hideSourceTitle, tip.slug).toBe(true);
  });

  it('keeps unique headings and valid dates', () => {
    expect(new Set(TIP_ARTICLES.map((tip) => tip.heading.zh)).size).toBe(
      TIP_ARTICLES.length,
    );
    for (const tip of TIP_ARTICLES) {
      expect(Date.parse(tip.publishedAt)).toBeGreaterThan(
        Date.parse(tip.sourcePublishedAt),
      );
      expect(Date.parse(tip.modifiedAt)).toBeGreaterThanOrEqual(
        Date.parse(tip.publishedAt),
      );
    }
  });
});

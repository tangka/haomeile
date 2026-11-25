import { describe, expect, it } from 'vitest';
import cases from '../../docs/research/community-cases.json';
import { isThinCommunity } from '../../src/shared/community';

describe('community summaries', () => {
  it('treats a short editor summary as thin, and never a submission', () => {
    expect(isThinCommunity({ origin: 'community', story: '字'.repeat(99) })).toBe(
      true,
    );
    expect(
      isThinCommunity({ origin: 'community', story: '字'.repeat(100) }),
    ).toBe(false);
    expect(isThinCommunity({ origin: 'user', story: '短' })).toBe(false);
  });

  it('opens every summary in the third person and carries no identifiers', () => {
    for (const { story, story_en } of cases) {
      expect(story).toMatch(/^原帖作者说，/);
      expect(story_en).toMatch(/^The original poster says/);
      expect(story + story_en).not.toMatch(
        /@|\bTS-[0-9a-f]|\bC-[A-Za-z0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-/,
      );
    }
  });
});

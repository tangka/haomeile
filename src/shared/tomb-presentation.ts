import type { PublicTombstone } from '../worker/types';
import type { Locale } from './i18n';
import { safeCommunitySource } from './community';

/** Only editor-written community summaries have translated content. */
export function tombPresentation(tomb: PublicTombstone, locale: Locale) {
  const community = tomb.origin === 'community';
  return {
    community,
    codename:
      community && locale === 'en'
        ? tomb.codename_en || tomb.codename
        : tomb.codename,
    story:
      community && locale === 'en' ? tomb.story_en || tomb.story : tomb.story,
    source: community ? safeCommunitySource(tomb.source_url) : null,
  };
}

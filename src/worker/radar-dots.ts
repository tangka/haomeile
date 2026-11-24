import type { Locale } from '../shared/i18n';
import type { RadarOverview, RadarPlatformId } from '../shared/radar';

// Each platform keeps its own direction, so only the distance carries meaning.
const ANGLES: Record<RadarPlatformId, number> = {
  codex: -90,
  claude: 30,
  antigravity: 150,
};

/** Centre is 0%, edge is 100%. Only known ids and numbers reach the markup. */
export function renderRadarDots(
  platforms: RadarOverview['platforms'],
  locale: Locale,
): { html: string; label: string } {
  const values = platforms.map(({ id, name, probability }) => ({
    id,
    name,
    value: Math.max(0, Math.min(100, Number(probability) || 0)),
  }));
  const html = values
    .map(({ id, value }) => {
      const radians = (ANGLES[id] * Math.PI) / 180;
      const left = 50 + (value / 2) * Math.cos(radians);
      const top = 50 + (value / 2) * Math.sin(radians);
      return `<span class="radar-dot" data-radar-platform="${id}" style="left:${left.toFixed(1)}%;top:${top.toFixed(1)}%"></span>`;
    })
    .join('');
  const label =
    (locale === 'en' ? 'Centre 0%, edge 100%. ' : '中心 0%，边缘 100%。') +
    values
      .map(({ name, value }) => `${name} ${value}%`)
      .join(locale === 'en' ? ', ' : '，');
  return { html, label };
}

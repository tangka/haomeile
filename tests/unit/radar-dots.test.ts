import { describe, expect, it } from 'vitest';
import { renderRadarDots } from '../../src/worker/radar-dots';

const dots = (codex: number, claude = 0, antigravity = 0) =>
  renderRadarDots(
    [
      { id: 'codex', name: 'Codex', probability: codex },
      { id: 'claude', name: 'Claude Code', probability: claude },
      { id: 'antigravity', name: 'Antigravity', probability: antigravity },
    ],
    'zh',
  );

describe('radar dots', () => {
  it('puts 0% at the centre and 100% on the edge', () => {
    expect(dots(0).html).toContain('style="left:50.0%;top:50.0%"');
    expect(dots(50).html).toContain('style="left:50.0%;top:25.0%"');
    expect(dots(100).html).toContain('style="left:50.0%;top:0.0%"');
  });
  it('keeps out-of-range values on the radar and states every value in words', () => {
    expect(dots(250).html).toContain('top:0.0%');
    expect(dots(-5).html).toContain('left:50.0%;top:50.0%');
    expect(dots(22, 24, 5).label).toBe(
      '中心 0%，边缘 100%。Codex 22%，Claude Code 24%，Antigravity 5%',
    );
  });
});

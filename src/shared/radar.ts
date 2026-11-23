export const RADAR_PLATFORM_NAMES = {
  codex: 'Codex',
  claude: 'Claude Code',
  antigravity: 'Antigravity',
} as const;

export type RadarPlatformId = keyof typeof RADAR_PLATFORM_NAMES;

export interface RadarTrendPoint {
  time: number;
  probability: number;
}

export interface RadarTrendSeries {
  id: RadarPlatformId;
  name: string;
  points: RadarTrendPoint[];
}

export interface RadarTrendData {
  generatedAt: string;
  series: RadarTrendSeries[];
}

export interface RadarOverview {
  generatedAt: string;
  platforms: { name: string; probability: number }[];
  history: RadarTrendSeries[];
  stale: boolean;
}

export type ReadRadarOverview = () => RadarOverview | null;

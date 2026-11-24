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

export interface RadarResetEvent {
  platform: RadarPlatformId;
  time: number;
  kind: 'reset' | 'card';
}

export interface RadarTrendData {
  generatedAt: string;
  series: RadarTrendSeries[];
  resetEvents: RadarResetEvent[];
}

export interface RadarOverview {
  generatedAt: string;
  platforms: { id: RadarPlatformId; name: string; probability: number }[];
  history: RadarTrendSeries[];
  resetEvents?: RadarResetEvent[];
  stale: boolean;
}

export type ReadRadarOverview = () => RadarOverview | null;

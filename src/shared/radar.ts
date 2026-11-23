export interface RadarOverview {
  generatedAt: string;
  platforms: { name: string; probability: number }[];
  stale: boolean;
}

export type ReadRadarOverview = () => RadarOverview | null;

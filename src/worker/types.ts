import type { D1Database } from '@cloudflare/workers-types/index.ts';
import type { Locale } from '../shared/i18n';
export const VENDORS = ['claude', 'codex', 'antigravity'] as const;
export const EVENTS = [
  'suspended',
  'org_suspended',
  'region',
  'verification',
  'billing',
  'other',
] as const;
export const PLANS = [
  'unknown',
  'free',
  'go',
  'plus',
  'pro',
  'max',
  'ultra',
] as const;
export type Plan = (typeof PLANS)[number];
export const LEGACY_PLANS = ['paid_personal', 'paid_team', 'api'] as const;
export type LegacyPlan = (typeof LEGACY_PLANS)[number];
export const PRODUCT_PLANS = {
  claude: ['unknown', 'free', 'pro', 'max', 'ultra'],
  codex: ['unknown', 'free', 'go', 'plus', 'pro'],
  antigravity: ['unknown', 'free', 'pro', 'ultra'],
} as const satisfies Record<(typeof VENDORS)[number], readonly Plan[]>;
export const APPEALS = ['none', 'pending', 'rejected', 'restored'] as const;
export const STYLES = ['flower', 'cloud', 'star'] as const;
export const REPORT_REASONS = [
  'privacy',
  'abuse',
  'gray_market',
  'other',
] as const;
export type Vendor = (typeof VENDORS)[number];
export type TombStatus =
  'pending' | 'approved' | 'rejected' | 'hidden' | 'withdrawn';
export interface TombInput {
  codename: string;
  nickname: string;
  vendor: Vendor;
  event_type: (typeof EVENTS)[number];
  plan: Plan;
  born_at: string | null;
  born_precision: 'none' | 'month' | 'day';
  died_at: string;
  story: string;
  epitaph: string;
  appeal_status: (typeof APPEALS)[number];
  card_style: (typeof STYLES)[number];
  consent: true;
}
export interface StoredTombInput extends Omit<TombInput, 'plan'> {
  plan: Plan | LegacyPlan;
}
export interface CommunityMetadata {
  origin?: 'submission' | 'community';
  source_url?: string | null;
  source_platform?: string | null;
  source_published_at?: string | null;
  codename_en?: string | null;
  story_en?: string | null;
}
export interface TombstoneRow
  extends Omit<StoredTombInput, 'consent'>, CommunityMetadata {
  id: string;
  secret_hash: string;
  status: TombStatus;
  pending_patch: string | null;
  flags: string | null;
  flowers: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}
export type PublicTombstone = Omit<
  TombstoneRow,
  'secret_hash' | 'pending_patch' | 'flags'
> & { memorial_number: number };
export interface TombstonePage {
  items: PublicTombstone[];
  next_cursor: string | null;
}
export interface Stats {
  date: string;
  today: number;
  last7: number;
  total: number;
  community_total?: number;
  by_vendor: [string, number][];
  by_event: [string, number][];
  timeline: { date: string; reported: number; occurred: number }[];
}
export interface AssetBinding {
  fetch(request: Request): Promise<Response>;
}
export interface Bindings {
  CF_VERSION_METADATA?: { id: string; tag: string; timestamp: string };
  DB: D1Database;
  ASSETS: AssetBinding;
  PEPPER: string;
  TURNSTILE_SECRET: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_TEST_MODE?: string;
  CLOUDFLARE_WEB_ANALYTICS_TOKEN?: string;
  ACCESS_AUD: string;
  ACCESS_TEAM_DOMAIN: string;
  ENVIRONMENT: string;
  SITE_ORIGIN: string;
}
export interface AppEnv {
  Bindings: Bindings;
  Variables: { actor: string; locale: Locale };
}

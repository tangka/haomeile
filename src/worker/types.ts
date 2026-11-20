import type { D1Database, Fetcher } from '@cloudflare/workers-types/index.ts';
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
  'paid_personal',
  'paid_team',
  'api',
] as const;
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
  plan: (typeof PLANS)[number];
  born_at: string | null;
  born_precision: 'none' | 'month' | 'day';
  died_at: string;
  story: string;
  epitaph: string;
  appeal_status: (typeof APPEALS)[number];
  card_style: (typeof STYLES)[number];
  consent: true;
}
export interface TombstoneRow extends Omit<TombInput, 'consent'> {
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
>;
export interface TombstonePage {
  items: PublicTombstone[];
  next_cursor: string | null;
}
export interface Stats {
  date: string;
  today: number;
  last7: number;
  total: number;
  by_vendor: [string, number][];
  by_event: [string, number][];
  timeline: { date: string; reported: number; occurred: number }[];
}
export interface Bindings {
  CF_VERSION_METADATA?: { id: string; tag: string; timestamp: string };
  DB: D1Database;
  ASSETS: Fetcher;
  PEPPER: string;
  TURNSTILE_SECRET: string;
  TURNSTILE_SITE_KEY: string;
  ACCESS_AUD: string;
  ACCESS_TEAM_DOMAIN: string;
  ENVIRONMENT: string;
  SITE_ORIGIN: string;
}
export interface AppEnv {
  Bindings: Bindings;
  Variables: { actor: string };
}

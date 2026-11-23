import { describe, expect, it } from 'vitest';
import {
  radarCapacityReport,
  type RadarProviderUsage,
} from '../../src/shared/radar-email-report';

const resend: RadarProviderUsage = {
  provider: 'resend',
  enabled: true,
  dayLimit: 100,
  dayUsed: 0,
  monthLimit: 3000,
  monthUsed: 0,
  remaining: 100,
  contacts: 1,
  pending: 0,
  blockedUntil: null,
};

describe('operator radar email capacity report', () => {
  it('excludes unconfigured channels from current capacity and keeps healthy channels quiet', () => {
    const off = {
      ...resend,
      provider: 'mailjet' as const,
      enabled: false,
      contacts: 0,
    };
    expect(radarCapacityReport([resend, off])).toMatchObject({
      dayLimit: 100,
      remaining: 100,
      alerts: [],
    });
  });
  it('reports monthly exhaustion despite unused daily or other provider capacity', () => {
    const tight = {
      ...resend,
      provider: 'mailjet' as const,
      dayLimit: 200,
      monthLimit: 6000,
      monthUsed: 6000,
      remaining: 0,
    };
    expect(radarCapacityReport([tight, resend]).alerts).toEqual([
      { provider: 'mailjet', reason: 'month', level: 'critical' },
      { provider: 'mailjet', reason: 'remaining', level: 'critical' },
    ]);
  });
  it('warns before one more notification round or the daily threshold exhausts a channel', () => {
    const row = { ...resend, dayUsed: 80, remaining: 20, contacts: 16 };
    expect(radarCapacityReport([row]).alerts).toEqual([
      { provider: 'resend', reason: 'day', level: 'warning' },
      { provider: 'resend', reason: 'remaining', level: 'warning' },
    ]);
    expect(radarCapacityReport([{ ...row, enabled: false }]).alerts).toEqual([
      { provider: 'resend', reason: 'disabled', level: 'critical' },
    ]);
  });
});

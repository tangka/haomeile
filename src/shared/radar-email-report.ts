export interface RadarProviderUsage {
  provider: 'resend' | 'brevo' | 'smtp2go' | 'mailjet';
  enabled: boolean;
  dayLimit: number;
  dayUsed: number;
  monthLimit: number | null;
  monthUsed: number;
  contacts: number;
  pending: number;
  remaining: number;
  blockedUntil: number | null;
}

export interface RadarCapacityAlert {
  provider: RadarProviderUsage['provider'];
  reason: 'day' | 'month' | 'remaining' | 'blocked' | 'disabled';
  level: 'warning' | 'critical';
}

export function radarCapacityReport(providers: RadarProviderUsage[]) {
  let dayLimit = 0;
  let remaining = 0;
  const alerts: RadarCapacityAlert[] = [];
  for (const row of providers) {
    const add = (reason: RadarCapacityAlert['reason'], critical: boolean) =>
      alerts.push({
        provider: row.provider,
        reason,
        level: critical ? 'critical' : 'warning',
      });
    if (!row.enabled) {
      if (row.contacts > 0) add('disabled', true);
      continue;
    }
    dayLimit += row.dayLimit;
    remaining += row.remaining;
    if (row.blockedUntil && row.blockedUntil > Date.now()) add('blocked', true);
    if (row.dayUsed >= row.dayLimit * 0.8)
      add('day', row.dayUsed >= row.dayLimit);
    if (row.monthLimit !== null && row.monthUsed >= row.monthLimit * 0.8)
      add('month', row.monthUsed >= row.monthLimit);
    // An existing subscriber stays on this provider, even when others have room.
    if (row.contacts > 0 && row.contacts >= row.remaining * 0.8)
      add('remaining', row.contacts > row.remaining);
  }
  return { providers, dayLimit, remaining, alerts };
}

export type RadarCapacityReport = ReturnType<typeof radarCapacityReport>;

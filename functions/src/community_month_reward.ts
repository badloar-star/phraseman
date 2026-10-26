import { createHash } from 'node:crypto';

export function communityRewardId(monthId: string, packId: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthId) || !packId || packId.includes('/')) throw new Error('Invalid contest reward');
  return `community_month:${monthId}_${createHash('sha256').update(packId).digest('hex').slice(0, 32)}`;
}

/** Three calendar months, clamped to the last day; preserve existing longer grants. */
export function communityPlusExpiry(nowMs: number, currentUntilMs: number): number {
  const start = new Date(Math.max(nowMs, Number.isFinite(currentUntilMs) ? currentUntilMs : 0));
  const end = new Date(start);
  const day = start.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 3);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, last));
  return end.getTime();
}

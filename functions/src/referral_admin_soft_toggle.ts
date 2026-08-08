export type StoredReferralSoftToggleOperation = Readonly<{
  enabled?: unknown;
  softOffAtMs?: unknown;
  auditId?: unknown;
}>;

export function resolveReferralSoftOffAtMs(input: Readonly<{
  enabled: boolean;
  beforeEnabled: boolean;
  beforeSoftOffAtMs: number;
  nowMs: number;
}>): number {
  if (input.enabled) return 0;
  if (!input.beforeEnabled && input.beforeSoftOffAtMs > 0) return input.beforeSoftOffAtMs;
  return input.nowMs;
}

export function referralSoftToggleReplayResult(previous: StoredReferralSoftToggleOperation): Readonly<{
  ok: true;
  enabled: boolean;
  softOffAtMs: number;
  auditId: string;
  replayed: true;
}> {
  return {
    ok: true,
    enabled: previous.enabled === true,
    softOffAtMs: Math.max(0, Math.floor(Number(previous.softOffAtMs) || 0)),
    auditId: String(previous.auditId ?? ''),
    replayed: true,
  };
}

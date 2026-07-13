import { createHash } from 'crypto';

type Row = Record<string, unknown>;

function text(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function cloneJsonRecord(value: unknown): Row | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const encoded = JSON.stringify(value);
  if (!encoded || encoded.length > 50_000) throw new Error('leaderboard_snapshot_too_large');
  const parsed = JSON.parse(encoded) as unknown;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Row : null;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  const row = value as Row;
  return Object.fromEntries(Object.keys(row).sort().map((key) => [key, stableValue(row[key])]));
}

export function fingerprintLeaderboard(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stableValue(value ?? null))).digest('hex');
}

export type GlobalBanState = 'banned' | 'active' | 'unavailable';
export type BanProjectionState = 'consistent' | 'inconsistent' | 'unavailable';

export interface BanReconciliationInput {
  bannedDocumentExists: boolean | null;
  usersBanned: boolean | null;
  leaderboardPresent: boolean | null;
  chatRestricted: boolean | null;
}

export function buildBanReconciliation(input: BanReconciliationInput) {
  const usersBanned = booleanOrNull(input.usersBanned);
  const leaderboardPresent = booleanOrNull(input.leaderboardPresent);
  const chatRestricted = booleanOrNull(input.chatRestricted);
  if (input.bannedDocumentExists == null) {
    return Object.freeze({
      globalState: 'unavailable' as const,
      projectionState: 'unavailable' as const,
      mismatches: Object.freeze(['authoritative_source_unavailable']),
      usersBanned,
      leaderboardPresent,
      chatRestricted,
    });
  }

  const globalState: GlobalBanState = input.bannedDocumentExists ? 'banned' : 'active';
  const mismatches: string[] = [];
  let unavailable = false;
  if (usersBanned == null) {
    mismatches.push('users_projection_unavailable');
    unavailable = true;
  } else if (input.bannedDocumentExists && !usersBanned) mismatches.push('users_flag_missing');
  else if (!input.bannedDocumentExists && usersBanned) mismatches.push('users_flag_stale');

  if (input.bannedDocumentExists) {
    if (leaderboardPresent == null) {
      mismatches.push('leaderboard_projection_unavailable');
      unavailable = true;
    } else if (leaderboardPresent) mismatches.push('leaderboard_present_while_banned');
  }

  const ordered = mismatches.sort((a, b) => a.localeCompare(b));
  const projectionState: BanProjectionState = unavailable ? 'unavailable' : ordered.length ? 'inconsistent' : 'consistent';
  return Object.freeze({ globalState, projectionState, mismatches: Object.freeze(ordered), usersBanned, leaderboardPresent, chatRestricted });
}

export interface BuildBanWritesInput {
  uid: unknown;
  name?: unknown;
  reason: unknown;
  actorUid: unknown;
  nowMs: number;
  leaderboardBefore?: unknown;
  sourceReportId?: unknown;
  source?: unknown;
}

export function buildBanWrites(input: BuildBanWritesInput) {
  const uid = text(input.uid, 180);
  const reason = text(input.reason, 500);
  const actorUid = text(input.actorUid, 180);
  const nowMs = Math.max(0, Math.floor(Number(input.nowMs) || 0));
  if (!uid || !reason || !actorUid || !nowMs) throw new Error('ban_input_invalid');
  const sourceReportId = text(input.sourceReportId, 180);
  const leaderboardBefore = cloneJsonRecord(input.leaderboardBefore);
  return Object.freeze({
    bannedDocument: Object.freeze({
      uid,
      name: text(input.name, 160),
      reason,
      bannedAtMs: nowMs,
      bannedAt: new Date(nowMs).toISOString(),
      bannedBy: actorUid,
      source: text(input.source, 80) || 'manual',
      sourceReportId,
    }),
    userPatch: Object.freeze({ banned: true, bannedAtMs: nowMs, updatedAt: nowMs }),
    deleteLeaderboard: true,
    reportPatch: sourceReportId ? Object.freeze({ status: 'banned', reviewedAtMs: nowMs, reviewedBy: actorUid }) : null,
    history: Object.freeze({ leaderboardBefore, leaderboardFingerprint: fingerprintLeaderboard(leaderboardBefore) }),
  });
}

export interface BuildUnbanWritesInput {
  uid: unknown;
  actorUid: unknown;
  nowMs: number;
  leaderboardBefore?: unknown;
  leaderboardCurrent?: unknown;
}

export function buildUnbanWrites(input: BuildUnbanWritesInput) {
  const uid = text(input.uid, 180);
  const actorUid = text(input.actorUid, 180);
  const nowMs = Math.max(0, Math.floor(Number(input.nowMs) || 0));
  if (!uid || !actorUid || !nowMs) throw new Error('unban_input_invalid');
  const leaderboardBefore = cloneJsonRecord(input.leaderboardBefore);
  const leaderboardCurrent = cloneJsonRecord(input.leaderboardCurrent);
  const restoreState = !leaderboardBefore ? 'not_available' : leaderboardCurrent ? 'target_changed' : 'ready';
  return Object.freeze({
    deleteBannedDocument: true,
    userPatch: Object.freeze({ banned: false, unbannedAtMs: nowMs, updatedAt: nowMs }),
    restoreLeaderboard: restoreState === 'ready' ? leaderboardBefore : null,
    restoreState,
  });
}

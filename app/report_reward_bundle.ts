import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { emitAppEvent } from './events';
import { enqueueLevelSpinStarGrant } from './level_spin_star_grants';
import { grantLocalReportRewardSpins } from './local_level_spins';
import { commitConfirmedExternalShardEvent } from './shards_system';
import { getCanonicalUserId } from './user_id_policy';

export type ReportRewardSeverity = 'none' | 'minor' | 'serious' | 'critical' | 'legacy';
export type ReportRewardBundle = Readonly<{
  version: 1;
  severity: ReportRewardSeverity;
  spins: number;
  runes: number;
  pearls: number;
}>;

export const REPORT_REWARD_TIERS: Readonly<Record<ReportRewardSeverity, ReportRewardBundle>> = Object.freeze({
  none: Object.freeze({ version: 1, severity: 'none', spins: 0, runes: 0, pearls: 0 }),
  minor: Object.freeze({ version: 1, severity: 'minor', spins: 1, runes: 300, pearls: 1 }),
  serious: Object.freeze({ version: 1, severity: 'serious', spins: 2, runes: 600, pearls: 5 }),
  critical: Object.freeze({ version: 1, severity: 'critical', spins: 3, runes: 1000, pearls: 10 }),
  legacy: Object.freeze({ version: 1, severity: 'legacy', spins: 0, runes: 0, pearls: 1 }),
});

const PENDING_KEY_PREFIX = 'report_reward_bundle_claims_v1:';
const PENDING_CAP = 100;

type PendingClaim = {
  messageId: string;
  rewardBundle: ReportRewardBundle;
  serverConfirmed: boolean;
  pearlsCredited: boolean;
  runesCredited: boolean;
  spinsCredited: boolean;
  updatedAtMs: number;
};

export type ReportRewardClaimResult = Readonly<{
  status: 'claimed' | 'already_claimed';
  rewardBundle: ReportRewardBundle;
}>;

export function normalizeReportRewardBundle(value: unknown, legacyCoins: unknown = 0): ReportRewardBundle {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const input = value as Record<string, unknown>;
    const severity = String(input.severity ?? '').trim() as ReportRewardSeverity;
    const tier = REPORT_REWARD_TIERS[severity];
    if (tier
      && Number(input.version) === 1
      && Number(input.spins) === tier.spins
      && Number(input.runes) === tier.runes
      && Number(input.pearls) === tier.pearls) return tier;
    throw new Error('report_reward_bundle_invalid');
  }
  return Number(legacyCoins) === 1 ? REPORT_REWARD_TIERS.legacy : REPORT_REWARD_TIERS.none;
}

function hasReward(bundle: ReportRewardBundle): boolean {
  return bundle.spins > 0 || bundle.runes > 0 || bundle.pearls > 0;
}

function safeMessageId(value: unknown): string {
  return String(value ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 96);
}

function storageKey(owner: string): string {
  return `${PENDING_KEY_PREFIX}${encodeURIComponent(owner)}`;
}

function normalizePendingClaim(value: unknown): PendingClaim | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const messageId = safeMessageId(input.messageId);
  if (!messageId) return null;
  try {
    return {
      messageId,
      rewardBundle: normalizeReportRewardBundle(input.rewardBundle),
      serverConfirmed: input.serverConfirmed === true,
      pearlsCredited: input.pearlsCredited === true,
      runesCredited: input.runesCredited === true,
      spinsCredited: input.spinsCredited === true,
      updatedAtMs: Math.max(0, Math.trunc(Number(input.updatedAtMs) || 0)),
    };
  } catch {
    return null;
  }
}

async function readPending(owner: string): Promise<PendingClaim[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(owner));
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    if (!Array.isArray(parsed)) return [];
    const byId = new Map<string, PendingClaim>();
    parsed.forEach((row) => {
      const claim = normalizePendingClaim(row);
      if (claim) byId.set(claim.messageId, claim);
    });
    return [...byId.values()].slice(-PENDING_CAP);
  } catch {
    return [];
  }
}

async function writePending(owner: string, claims: readonly PendingClaim[]): Promise<void> {
  const next = claims.slice(-PENDING_CAP);
  if (next.length === 0) {
    await AsyncStorage.removeItem(storageKey(owner));
    return;
  }
  await AsyncStorage.setItem(storageKey(owner), JSON.stringify(next));
}

async function upsertPending(owner: string, claim: PendingClaim): Promise<void> {
  const current = await readPending(owner);
  await writePending(owner, [...current.filter((row) => row.messageId !== claim.messageId), claim]);
}

async function removePending(owner: string, messageId: string): Promise<void> {
  await writePending(owner, (await readPending(owner)).filter((row) => row.messageId !== messageId));
}

async function callClaim(messageId: string): Promise<{ rewardBundle: ReportRewardBundle; alreadyClaimed: boolean }> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) throw new Error('cloud_disabled');
  const { getApp } = require('@react-native-firebase/app');
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  const { initFirebaseAppCheckIfAvailable } = require('./app_check_init');
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'claimReportReward');
  const result = await fn({ messageId });
  const data = (result?.data ?? {}) as Record<string, unknown>;
  return {
    rewardBundle: normalizeReportRewardBundle(data.rewardBundle),
    alreadyClaimed: data.alreadyClaimed === true,
  };
}

function assertCurrent(token: AccountGenerationToken, owner: string): void {
  if (!isCurrentAccountGeneration(token, owner)) throw new Error('report_reward_account_changed');
}

async function creditRunes(messageId: string, bundle: ReportRewardBundle, token: AccountGenerationToken): Promise<void> {
  const requestId = `report_reward_${safeMessageId(messageId)}`.slice(0, 80);
  const gifts: ReadonlyArray<Readonly<{ lane: 'base' | 'premium'; giftId: string }>> = bundle.runes === 300
    ? [{ lane: 'base', giftId: 'stars_250' }, { lane: 'premium', giftId: 'stars_50' }]
    : bundle.runes === 600
      ? [{ lane: 'base', giftId: 'stars_500' }, { lane: 'premium', giftId: 'stars_100' }]
      : bundle.runes === 1000
        ? [{ lane: 'base', giftId: 'stars_1000' }]
        : [];
  for (const gift of gifts) {
    await enqueueLevelSpinStarGrant({ token, requestId, lane: gift.lane, giftId: gift.giftId }, { syncNow: true });
  }
  if (gifts.reduce((sum, gift) => sum + Number(gift.giftId.replace('stars_', '')), 0) !== bundle.runes) {
    throw new Error('report_reward_runes_invalid');
  }
}

/**
 * Replays the non-pearl part of an immutable server reward event. The cloud
 * external-event synchronizer calls this before writing its applied marker, so
 * a crash or reinstall can retry the exact rune/spin grants without duplication.
 */
export async function applyConfirmedReportRewardBundleExtrasFromEvent(
  messageId: string,
  rewardBundleInput: unknown,
  expectedOwnerStableId: string,
): Promise<void> {
  const cleanMessageId = safeMessageId(messageId);
  const rewardBundle = normalizeReportRewardBundle(rewardBundleInput);
  const token = captureAccountGeneration();
  const owner = token.stableId;
  if (!cleanMessageId || !owner || owner !== expectedOwnerStableId) {
    throw new Error('report_reward_account_changed');
  }
  assertCurrent(token, owner);
  if (rewardBundle.runes > 0) await creditRunes(cleanMessageId, rewardBundle, token);
  assertCurrent(token, owner);
  if (rewardBundle.spins > 0
      && !await grantLocalReportRewardSpins(cleanMessageId, rewardBundle.spins, token)) {
    throw new Error('report_reward_spins_failed');
  }
  assertCurrent(token, owner);
  emitAppEvent('app_messages_local_changed');
}

async function processClaim(claim: PendingClaim, token: AccountGenerationToken, owner: string): Promise<ReportRewardClaimResult> {
  assertCurrent(token, owner);
  let current = claim;
  let alreadyClaimed = false;
  if (!current.serverConfirmed) {
    const server = await callClaim(current.messageId);
    assertCurrent(token, owner);
    if (JSON.stringify(server.rewardBundle) !== JSON.stringify(current.rewardBundle)) {
      throw new Error('report_reward_server_mismatch');
    }
    alreadyClaimed = server.alreadyClaimed;
    current = { ...current, serverConfirmed: true, updatedAtMs: Date.now() };
    await upsertPending(owner, current);
  }
  if (!current.pearlsCredited && current.rewardBundle.pearls > 0) {
    const result = await commitConfirmedExternalShardEvent({
      source: 'report_reply',
      eventId: current.messageId,
      delta: current.rewardBundle.pearls,
      expectedOwnerStableId: owner,
      reason: 'report_reward_bundle_claim',
      grant: {
        kind: 'confirmed_report_reward_bundle',
        subjectId: current.messageId,
        payload: { messageId: current.messageId, rewardBundle: current.rewardBundle },
      },
    });
    if (result.status !== 'applied' && result.status !== 'already-applied') throw new Error('report_reward_pearls_failed');
    current = { ...current, pearlsCredited: true, updatedAtMs: Date.now() };
    await upsertPending(owner, current);
  }
  if (!current.runesCredited && current.rewardBundle.runes > 0) {
    await creditRunes(current.messageId, current.rewardBundle, token);
    current = { ...current, runesCredited: true, updatedAtMs: Date.now() };
    await upsertPending(owner, current);
  }
  if (!current.spinsCredited && current.rewardBundle.spins > 0) {
    if (!await grantLocalReportRewardSpins(current.messageId, current.rewardBundle.spins, token)) {
      throw new Error('report_reward_spins_failed');
    }
    current = { ...current, spinsCredited: true, updatedAtMs: Date.now() };
    await upsertPending(owner, current);
  }
  await removePending(owner, current.messageId);
  emitAppEvent('app_messages_local_changed');
  return { status: alreadyClaimed ? 'already_claimed' : 'claimed', rewardBundle: current.rewardBundle };
}

export async function claimReportRewardBundle(
  messageId: string,
  rewardBundleInput: unknown,
): Promise<ReportRewardClaimResult> {
  const cleanMessageId = safeMessageId(messageId);
  const rewardBundle = normalizeReportRewardBundle(rewardBundleInput);
  if (!cleanMessageId || !hasReward(rewardBundle)) throw new Error('report_reward_invalid');
  const token = captureAccountGeneration();
  const owner = token.stableId;
  if (!owner) throw new Error('report_reward_account_missing');
  assertCurrent(token, owner);
  if (await getCanonicalUserId().catch(() => null) !== owner) throw new Error('report_reward_account_changed');
  const existing = (await readPending(owner)).find((row) => row.messageId === cleanMessageId);
  if (existing && JSON.stringify(existing.rewardBundle) !== JSON.stringify(rewardBundle)) {
    throw new Error('report_reward_pending_conflict');
  }
  const claim = existing ?? {
    messageId: cleanMessageId,
    rewardBundle,
    serverConfirmed: false,
    pearlsCredited: false,
    runesCredited: rewardBundle.runes === 0,
    spinsCredited: rewardBundle.spins === 0,
    updatedAtMs: Date.now(),
  };
  await upsertPending(owner, claim);
  return processClaim(claim, token, owner);
}

export async function resumePendingReportRewardBundleClaims(): Promise<{ resolved: number; pending: number }> {
  const token = captureAccountGeneration();
  const owner = token.stableId;
  if (!owner || !isCurrentAccountGeneration(token, owner)) return { resolved: 0, pending: 0 };
  const claims = await readPending(owner);
  let resolved = 0;
  for (const claim of claims) {
    try {
      await processClaim(claim, token, owner);
      resolved += 1;
    } catch {
      // Durable intent remains for a later foreground retry.
    }
  }
  return { resolved, pending: Math.max(0, claims.length - resolved) };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

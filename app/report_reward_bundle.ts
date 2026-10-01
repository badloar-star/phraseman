import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { emitAppEvent } from './events';
import { enqueueLevelSpinStarGrant } from './level_spin_star_grants';
import { getCanonicalUserId } from './user_id_policy';
import { DebugLogger } from './debug-logger';

export type ReportRewardSeverity = 'none' | 'minor' | 'serious' | 'critical' | 'legacy';
export type ReportRewardTierSeverity = Exclude<ReportRewardSeverity, 'legacy'>;
/** v1 (до 01.10): спины + руны + жемчуг. Только для старых неполученных наград. */
export type ReportRewardBundleV1 = Readonly<{
  version: 1;
  severity: ReportRewardSeverity;
  spins: number;
  runes: number;
  pearls: number;
}>;
/** v2 (Q4, координатор 01.10): награда только в монетах. */
export type ReportRewardBundleV2 = Readonly<{
  version: 2;
  severity: ReportRewardTierSeverity;
  coins: number;
}>;
export type ReportRewardBundle = ReportRewardBundleV1 | ReportRewardBundleV2;

// зачем: Q4 (координатор 01.10) — награда за жалобу в монетах 300/600/1000;
// зеркало functions/src/report_replies.ts REPORT_REWARD_TIERS.
export const REPORT_REWARD_TIERS: Readonly<Record<ReportRewardTierSeverity, ReportRewardBundleV2>> = Object.freeze({
  none: Object.freeze({ version: 2, severity: 'none', coins: 0 }),
  minor: Object.freeze({ version: 2, severity: 'minor', coins: 300 }),
  serious: Object.freeze({ version: 2, severity: 'serious', coins: 600 }),
  critical: Object.freeze({ version: 2, severity: 'critical', coins: 1000 }),
});

// зачем: Q4 — точные v1-наборы читаются, чтобы старые неполученные награды
// (и уже лежащие в очереди claim) не падали на report_reward_bundle_invalid.
export const REPORT_REWARD_TIERS_V1: Readonly<Record<ReportRewardSeverity, ReportRewardBundleV1>> = Object.freeze({
  none: Object.freeze({ version: 1, severity: 'none', spins: 0, runes: 0, pearls: 0 }),
  minor: Object.freeze({ version: 1, severity: 'minor', spins: 1, runes: 300, pearls: 1 }),
  serious: Object.freeze({ version: 1, severity: 'serious', spins: 2, runes: 600, pearls: 5 }),
  critical: Object.freeze({ version: 1, severity: 'critical', spins: 3, runes: 1000, pearls: 10 }),
  legacy: Object.freeze({ version: 1, severity: 'legacy', spins: 0, runes: 0, pearls: 1 }),
});

/** Монеты набора: v2 — coins, v1 — руны (тот же кошелёк монет, PM-069). */
export function reportRewardCoins(bundle: ReportRewardBundle): number {
  return bundle.version === 2 ? bundle.coins : bundle.runes;
}

/** Жемчуг старого v1-набора (D70: не начисляется, только для показа истории). */
export function reportRewardPearls(bundle: ReportRewardBundle): number {
  return bundle.version === 1 ? bundle.pearls : 0;
}

/**
 * Есть ли что показать/забрать в интерфейсе (спины не считаются, PM-047).
 * зачем (01.10): жемчуг v1 не начисляется (D70/D104) — показывать его наградой («+1 монет»)
 * значит обещать то, чего человек не получит. Видимая награда — только монеты.
 */
export function reportRewardHasVisibleReward(bundle: ReportRewardBundle): boolean {
  return reportRewardCoins(bundle) > 0;
}

const PENDING_KEY_PREFIX = 'report_reward_bundle_claims_v1:';
const PENDING_CAP = 100;

type PendingClaim = {
  messageId: string;
  rewardBundle: ReportRewardBundle;
  serverConfirmed: boolean;
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
    const severity = String(input.severity ?? '').trim();
    const version = Number(input.version);
    if (version === 2 && Object.prototype.hasOwnProperty.call(REPORT_REWARD_TIERS, severity)) {
      const tier = REPORT_REWARD_TIERS[severity as ReportRewardTierSeverity];
      if (Number(input.coins) === tier.coins) return tier;
    }
    if (version === 1 && Object.prototype.hasOwnProperty.call(REPORT_REWARD_TIERS_V1, severity)) {
      const tier = REPORT_REWARD_TIERS_V1[severity as ReportRewardSeverity];
      if (Number(input.spins) === tier.spins
        && Number(input.runes) === tier.runes
        && Number(input.pearls) === tier.pearls) return tier;
    }
    throw new Error('report_reward_bundle_invalid');
  }
  return Number(legacyCoins) === 1 ? REPORT_REWARD_TIERS_V1.legacy : REPORT_REWARD_TIERS.none;
}

function hasReward(bundle: ReportRewardBundle): boolean {
  if (bundle.version === 2) return bundle.coins > 0;
  return bundle.spins > 0 || bundle.runes > 0 || bundle.pearls > 0;
}

function bundleSpins(bundle: ReportRewardBundle): number {
  return bundle.version === 1 ? bundle.spins : 0;
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
      runesCredited: input.runesCredited === true,
      spinsCredited: input.spinsCredited === true,
      updatedAtMs: Math.max(0, Math.trunc(Number(input.updatedAtMs) || 0)),
    };
  } catch (e) {
    DebugLogger.warn('report_reward_bundle:pending_invalid', `[REPORT-REWARD] pending claim dropped: invalid bundle op=${messageId} error=${String(e)}`);
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
  } catch (e) {
    DebugLogger.warn('report_reward_bundle:pending_read_failed', `[REPORT-REWARD] pending queue unreadable error=${String(e)}`);
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

// зачем: Q4 — монеты (v2 coins и v1 runes — один и тот же кошелёк) идут по
// существующему пути выдачи монет на телефон: level_spin_star_grants → stars_ledger.
async function creditRunes(messageId: string, bundle: ReportRewardBundle, token: AccountGenerationToken): Promise<void> {
  const requestId = `report_reward_${safeMessageId(messageId)}`.slice(0, 80);
  const coins = reportRewardCoins(bundle);
  DebugLogger.info('report_reward_bundle:credit', `[REPORT-REWARD] op=${safeMessageId(messageId)} v=${bundle.version} severity=${bundle.severity} coins=${coins}`);
  const gifts: ReadonlyArray<Readonly<{ lane: 'base' | 'premium'; giftId: string }>> = coins === 300
    ? [{ lane: 'base', giftId: 'stars_250' }, { lane: 'premium', giftId: 'stars_50' }]
    : coins === 600
      ? [{ lane: 'base', giftId: 'stars_500' }, { lane: 'premium', giftId: 'stars_100' }]
      : coins === 1000
        ? [{ lane: 'base', giftId: 'stars_1000' }]
        : [];
  for (const gift of gifts) {
    await enqueueLevelSpinStarGrant({
      token,
      requestId,
      lane: gift.lane,
      giftId: gift.giftId,
      promotionEligibility: 'excluded_compensation',
    }, { syncNow: true });
  }
  if (gifts.reduce((sum, gift) => sum + Number(gift.giftId.replace('stars_', '')), 0) !== coins) {
    throw new Error('report_reward_runes_invalid');
  }
}

// зачем (PM-289, D70/D109): повтор монетной части из облачного события
// (applyConfirmedReportRewardBundleExtrasFromEvent) удалён вместе с синхронизатором
// внешних событий жемчуга. Сервер такие события больше не пишет (report_replies.ts),
// а монеты за репорт (300/600/1000) идут единственным путём — claimReportRewardBundle.

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
  // зачем: D70/D104 — жемчужная часть набора (pearls) больше не начисляется;
  // монетная часть набора — runes ниже (300/600/1000). Поле pearls остаётся в
  // схеме только ради точного сравнения с уже отправленными сообщениями.
  if (reportRewardPearls(current.rewardBundle) > 0) {
    DebugLogger.info(
      'report_reward_bundle:pearls_retired',
      `[REPORT-REWARD] op=${current.messageId} pearls=${reportRewardPearls(current.rewardBundle)} action=not_credited reason=D70_D104`,
    );
  }
  if (!current.runesCredited && reportRewardCoins(current.rewardBundle) > 0) {
    await creditRunes(current.messageId, current.rewardBundle, token);
    current = { ...current, runesCredited: true, updatedAtMs: Date.now() };
    await upsertPending(owner, current);
  }
  if (!current.spinsCredited && bundleSpins(current.rewardBundle) > 0) {
    // зачем (PM-047): обещание спина отменено (механика снята) —
    // закрываем без начисления, иначе локальная
    // очередь claimReportRewardBundle ретраит вечно на первом же заходе.
    DebugLogger.info(
      'report_reward_bundle:spin_retired',
      `[SPIN-RETIRED] source=report_reward_claim op=${current.messageId}`
      + ` amount=${bundleSpins(current.rewardBundle)} promised=spins action=closed_no_credit`
      + ' reason=PM-047_spin_mechanic_retired',
    );
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
    runesCredited: reportRewardCoins(rewardBundle) === 0,
    spinsCredited: bundleSpins(rewardBundle) === 0,
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
    } catch (e) {
      // Durable intent remains for a later foreground retry.
      DebugLogger.error('report_reward_bundle:resolved', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  return { resolved, pending: Math.max(0, claims.length - resolved) };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

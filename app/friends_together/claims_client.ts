/**
 * «Вместе» — клеймы: уровень дружбы (звёзды) и сундук недели (XP-буст/щит/звёзды/аура).
 * Тот же паттерн requestId-идемпотентности, что nudge_client.ts / friend_gifts.ts.
 *
 * После успеха: обновляем ЛОКАЛЬНЫЙ снапшот пары (claimedLevel/claimedWeekKey) сразу
 * (optimistic — модалка не ждёт следующий refreshFriendsTogether), и патчим общий
 * app-снапшот звёзд (app_snapshot_store.patchAppSnapshot({ stars, starsEarnedTotal }))
 * если сервер вернул новый баланс — тот же путь, которым уже пользуется остальной
 * клиент (см. app/app_snapshot_store.ts:54 `stars?: number`), без отдельного listener'а.
 *
 * Источник: docs/plans/2026-08-16-friends-together-implementation.ru.md §1.1, §1.2, §4.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from '../account_generation';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { initFirebaseAppCheckIfAvailable } from '../app_check_init';
import { mergeLevelSpinServerStars } from '../level_spin_star_grants';
import { markFriendLevelClaimedLocally, markWeeklyChestClaimedLocally } from './together_store';
import { prepareTogetherSender } from './sender_identity';

const REGION = 'us-central1';

export type ClaimLevelErrorReason = 'not_friends' | 'not_reached' | 'claimed' | 'network' | 'unknown';
export type ClaimChestErrorReason = 'week_open' | 'own_days' | 'own_xp' | 'tier_zero' | 'claimed' | 'network' | 'unknown';

export type ClaimLevelResult =
  | { ok: true; starsGranted: number; stars?: number; starsEarnedTotal?: number; starsSeq?: number }
  | { ok: false; reason: ClaimLevelErrorReason };

export type ClaimChestResult =
  | { ok: true; rewards: Readonly<{ starsGranted: number; xpBoostMinutes: number; streakShield: boolean; aura: boolean }>; stars?: number; starsEarnedTotal?: number; starsSeq?: number }
  | { ok: false; reason: ClaimChestErrorReason };

function makeRequestId(prefix: string): string {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${now}_${rand}`;
}

function claimRequestStorageKey(stableId: string, semanticKey: string): string {
  return `friends_together_claim_request_v1::${stableId}::${semanticKey}`;
}

async function getOrCreateClaimRequestId(stableId: string, semanticKey: string, prefix: string): Promise<{ id: string; storageKey: string }> {
  const storageKey = claimRequestStorageKey(stableId, semanticKey);
  const existing = await AsyncStorage.getItem(storageKey).catch(() => null);
  if (existing && /^[A-Za-z0-9_-]{12,96}$/.test(existing)) return { id: existing, storageKey };
  const id = makeRequestId(prefix);
  await AsyncStorage.setItem(storageKey, id).catch(() => {});
  return { id, storageKey };
}

function errorText(error: unknown): string {
  const err = error as { code?: unknown; message?: unknown };
  return `${String(err?.code ?? '')} ${String(err?.message ?? error ?? '')}`.toLowerCase();
}

function classifyClaimLevelError(error: unknown): ClaimLevelErrorReason {
  const text = errorText(error);
  if (text.includes('not_friends')) return 'not_friends';
  if (text.includes('not_reached')) return 'not_reached';
  if (text.includes('already-exists') || text.includes('claimed')) return 'claimed';
  if (text.includes('network') || text.includes('unavailable') || text.includes('deadline-exceeded') || text.includes('timeout')) return 'network';
  return 'unknown';
}

function classifyClaimChestError(error: unknown): ClaimChestErrorReason {
  const text = errorText(error);
  if (text.includes('week_open')) return 'week_open';
  if (text.includes('own_days')) return 'own_days';
  if (text.includes('own_xp')) return 'own_xp';
  if (text.includes('tier_zero')) return 'tier_zero';
  if (text.includes('already-exists') || text.includes('claimed')) return 'claimed';
  if (text.includes('network') || text.includes('unavailable') || text.includes('deadline-exceeded') || text.includes('timeout')) return 'network';
  return 'unknown';
}

function isClaimContextCurrent(token: AccountGenerationToken, ownerStableId: string): boolean {
  return isCurrentAccountGeneration(token, ownerStableId);
}

async function patchStarsIfPresent(
  data: { stars?: unknown; starsEarnedTotal?: unknown; starsSeq?: unknown } | undefined,
  token: AccountGenerationToken,
  ownerStableId: string,
): Promise<boolean> {
  if (!isClaimContextCurrent(token, ownerStableId)) return false;
  if (!data) return true;
  const stars = Number(data.stars);
  const starsEarnedTotal = Number(data.starsEarnedTotal);
  const starsSeq = Number(data.starsSeq);
  const hasStars = Number.isFinite(stars);
  const hasEarned = Number.isFinite(starsEarnedTotal);
  const hasSeq = Number.isSafeInteger(starsSeq) && starsSeq >= 0;
  if (!hasStars && !hasEarned) return isClaimContextCurrent(token, ownerStableId);
  try {
    await mergeLevelSpinServerStars(token, {
      ...(hasStars ? { stars: Math.max(0, Math.trunc(stars)) } : {}),
      ...(hasEarned ? { starsEarnedTotal: Math.max(0, Math.trunc(starsEarnedTotal)) } : {}),
      ...(hasSeq ? { starsSeq } : {}),
    });
    return isClaimContextCurrent(token, ownerStableId);
  } catch {
    return false;
  }
}

type LevelClaimWireResponse = Readonly<{
  ok?: boolean;
  starsGranted?: unknown;
  starsAwarded?: unknown;
  stars?: unknown;
  starsBalance?: unknown;
  starsEarnedTotal?: unknown;
  starsSeq?: unknown;
}>;

type ChestRewardDrop = Readonly<{ kind?: unknown }>;
type ChestClaimWireResponse = Readonly<{
  ok?: boolean;
  starsGranted?: unknown;
  xpBoostMinutes?: unknown;
  streakShield?: unknown;
  aura?: unknown;
  stars?: unknown;
  starsBalance?: unknown;
  starsEarnedTotal?: unknown;
  starsSeq?: unknown;
  rewards?: Readonly<{ stars?: unknown; drops?: readonly ChestRewardDrop[] }>;
}>;

function finiteNonNegative(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : undefined;
}

/** Принимает и текущие алиасы callable, и старую форму уже сохранённых receipt/claim docs. */
export function normalizeLevelClaimResponse(data: LevelClaimWireResponse | undefined): Extract<ClaimLevelResult, { ok: true }> {
  const stars = finiteNonNegative(data?.stars ?? data?.starsBalance);
  const starsEarnedTotal = finiteNonNegative(data?.starsEarnedTotal);
  const starsSeq = finiteNonNegative(data?.starsSeq);
  return {
    ok: true,
    starsGranted: finiteNonNegative(data?.starsGranted ?? data?.starsAwarded) ?? 0,
    ...(stars !== undefined ? { stars } : {}),
    ...(starsEarnedTotal !== undefined ? { starsEarnedTotal } : {}),
    ...(starsSeq !== undefined ? { starsSeq } : {}),
  };
}

export function normalizeChestClaimResponse(data: ChestClaimWireResponse | undefined): Extract<ClaimChestResult, { ok: true }> {
  const drops = Array.isArray(data?.rewards?.drops) ? data.rewards.drops : [];
  const hasDrop = (kind: string) => drops.some((drop) => drop?.kind === kind);
  const stars = finiteNonNegative(data?.stars ?? data?.starsBalance);
  const starsEarnedTotal = finiteNonNegative(data?.starsEarnedTotal);
  const starsSeq = finiteNonNegative(data?.starsSeq);
  return {
    ok: true,
    rewards: {
      starsGranted: finiteNonNegative(data?.starsGranted ?? data?.rewards?.stars) ?? 0,
      xpBoostMinutes: finiteNonNegative(data?.xpBoostMinutes) ?? (hasDrop('xp_boost') ? 60 : 0),
      streakShield: data?.streakShield === true || hasDrop('streak_shield'),
      aura: data?.aura === true || hasDrop('avatar_aura'),
    },
    ...(stars !== undefined ? { stars } : {}),
    ...(starsEarnedTotal !== undefined ? { starsEarnedTotal } : {}),
    ...(starsSeq !== undefined ? { starsSeq } : {}),
  };
}

export async function claimFriendLevel(friendUid: string, level: number): Promise<ClaimLevelResult> {
  const uid = String(friendUid || '').trim();
  const lvl = Math.max(1, Math.floor(level));
  if (!uid) return { ok: false, reason: 'not_friends' };
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: false, reason: 'network' };
  const token = captureAccountGeneration();
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isClaimContextCurrent(token, ownerStableId)) return { ok: false, reason: 'network' };

  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    // зачем: сервер требует stableId (как friend_gifts) — без него invalid-argument.
    const sender = await prepareTogetherSender();
    if (!sender || sender.stableId !== ownerStableId || !isClaimContextCurrent(token, ownerStableId)) {
      return { ok: false, reason: 'network' };
    }
    const request = await getOrCreateClaimRequestId(sender.stableId, `level::${uid}::${lvl}`, 'ftcl');
    const fn = httpsCallable<
      { stableId: string; friendUid: string; level: number; requestId: string },
      LevelClaimWireResponse
    >(getFunctions(getApp(), REGION), 'friendsTogetherClaimLevel');
    const res = await fn({ stableId: sender.stableId, friendUid: uid, level: lvl, requestId: request.id });
    if (!isClaimContextCurrent(token, ownerStableId)) return { ok: false, reason: 'network' };
    const data = res.data;
    const normalized = normalizeLevelClaimResponse(data);
    const localCommitted = await withAccountTransitionLock(async () => {
      if (!isClaimContextCurrent(token, ownerStableId)) return false;
      await markFriendLevelClaimedLocally(uid, lvl);
      if (!isClaimContextCurrent(token, ownerStableId)) return false;
      await AsyncStorage.removeItem(request.storageKey).catch(() => {});
      return isClaimContextCurrent(token, ownerStableId);
    });
    if (!localCommitted || !await patchStarsIfPresent(normalized, token, ownerStableId)) {
      return { ok: false, reason: 'network' };
    }
    return normalized;
  } catch (error) {
    const reason = classifyClaimLevelError(error);
    // `claimed` означает, что серверная выдача уже состоялась (например ответ
    // потерялся после commit). Закрываем модалку и синхронизируем локальный кэш,
    // не пытаясь выдать награду повторно.
    if (reason === 'claimed') {
      const localCommitted = await withAccountTransitionLock(async () => {
        if (!isClaimContextCurrent(token, ownerStableId)) return false;
        await markFriendLevelClaimedLocally(uid, lvl);
        return isClaimContextCurrent(token, ownerStableId);
      });
      if (!localCommitted) return { ok: false, reason: 'network' };
      return { ok: true, starsGranted: 0 };
    }
    return { ok: false, reason };
  }
}

export async function claimWeeklyChest(weekKey: string): Promise<ClaimChestResult> {
  const key = String(weekKey || '').trim();
  if (!key) return { ok: false, reason: 'week_open' };
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: false, reason: 'network' };
  const token = captureAccountGeneration();
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isClaimContextCurrent(token, ownerStableId)) return { ok: false, reason: 'network' };

  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    // зачем: сервер требует stableId (как friend_gifts) — без него invalid-argument.
    const sender = await prepareTogetherSender();
    if (!sender || sender.stableId !== ownerStableId || !isClaimContextCurrent(token, ownerStableId)) {
      return { ok: false, reason: 'network' };
    }
    const request = await getOrCreateClaimRequestId(sender.stableId, `chest::${key}`, 'ftcc');
    const fn = httpsCallable<
      { stableId: string; weekKey: string; requestId: string },
      ChestClaimWireResponse
    >(getFunctions(getApp(), REGION), 'friendsClaimWeeklyChest');
    const res = await fn({ stableId: sender.stableId, weekKey: key, requestId: request.id });
    if (!isClaimContextCurrent(token, ownerStableId)) return { ok: false, reason: 'network' };
    const data = res.data;
    const normalized = normalizeChestClaimResponse(data);
    const localCommitted = await withAccountTransitionLock(async () => {
      if (!isClaimContextCurrent(token, ownerStableId)) return false;
      await markWeeklyChestClaimedLocally(key);
      if (!isClaimContextCurrent(token, ownerStableId)) return false;
      await AsyncStorage.removeItem(request.storageKey).catch(() => {});
      return isClaimContextCurrent(token, ownerStableId);
    });
    if (!localCommitted || !await patchStarsIfPresent(normalized, token, ownerStableId)) {
      return { ok: false, reason: 'network' };
    }
    return normalized;
  } catch (error) {
    return { ok: false, reason: classifyClaimChestError(error) };
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }

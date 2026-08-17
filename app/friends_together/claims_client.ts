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
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { initFirebaseAppCheckIfAvailable } from '../app_check_init';
import { patchAppSnapshot } from '../app_snapshot_store';
import { getFriendsTogetherSnapshot } from './together_store';

const REGION = 'us-central1';

export type ClaimLevelErrorReason = 'not_friends' | 'not_reached' | 'claimed' | 'network' | 'unknown';
export type ClaimChestErrorReason = 'week_open' | 'own_days' | 'own_xp' | 'tier_zero' | 'claimed' | 'network' | 'unknown';

export type ClaimLevelResult =
  | { ok: true; starsGranted: number; stars?: number; starsEarnedTotal?: number }
  | { ok: false; reason: ClaimLevelErrorReason };

export type ClaimChestResult =
  | { ok: true; rewards: Readonly<{ starsGranted: number; xpBoostMinutes: number; streakShield: boolean; aura: boolean }>; stars?: number; starsEarnedTotal?: number }
  | { ok: false; reason: ClaimChestErrorReason };

function makeRequestId(prefix: string): string {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${now}_${rand}`;
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

function patchStarsIfPresent(data: { stars?: unknown; starsEarnedTotal?: unknown } | undefined): void {
  if (!data) return;
  const stars = Number(data.stars);
  const starsEarnedTotal = Number(data.starsEarnedTotal);
  const hasStars = Number.isFinite(stars);
  const hasEarned = Number.isFinite(starsEarnedTotal);
  if (!hasStars && !hasEarned) return;
  // stars/starsEarnedTotal живут ВНУТРИ progress (AppSnapshotProgress), не на верхнем
  // уровне AppSnapshot — мержим функцией-патчем поверх текущего progress, чтобы не
  // затереть streak/shards/studyTarget/source/updatedAt случайным частичным объектом.
  patchAppSnapshot((current) => {
    if (!current.progress) return {};
    return {
      progress: {
        ...current.progress,
        ...(hasStars ? { stars: Math.max(0, Math.trunc(stars)) } : {}),
        ...(hasEarned ? { starsEarnedTotal: Math.max(0, Math.trunc(starsEarnedTotal)) } : {}),
      },
    };
  });
}

/**
 * Локально помечаем уровень как забранный — до следующего refreshFriendsTogether.
 * зачем: клеймed модалка должна закрыться сразу (optimistic), не дожидаясь пересчёта
 * снапшота из батча профилей + friend_pairs; together_store хранит снапшот в модульной
 * памяти, поэтому безопасно точечно патчим одну запись, не трогая остальной снапшот.
 */
function markLevelClaimedLocally(friendUid: string, level: number): void {
  const snap = getFriendsTogetherSnapshot();
  const pair = snap?.pairs[friendUid];
  if (!snap || !pair) return;
  const mutablePairs = snap.pairs as Record<string, typeof pair>;
  mutablePairs[friendUid] = { ...pair, claimedLevel: Math.max(pair.claimedLevel, level) };
}

export async function claimFriendLevel(friendUid: string, level: number): Promise<ClaimLevelResult> {
  const uid = String(friendUid || '').trim();
  const lvl = Math.max(1, Math.floor(level));
  if (!uid) return { ok: false, reason: 'not_friends' };
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: false, reason: 'network' };

  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const requestId = makeRequestId('ftcl');
    const fn = httpsCallable<
      { friendUid: string; level: number; requestId: string },
      { ok: boolean; starsGranted: number; stars?: number; starsEarnedTotal?: number }
    >(getFunctions(getApp(), REGION), 'friendsTogetherClaimLevel');
    const res = await fn({ friendUid: uid, level: lvl, requestId });
    const data = res.data;
    markLevelClaimedLocally(uid, lvl);
    patchStarsIfPresent(data);
    return { ok: true, starsGranted: Math.max(0, Math.floor(data?.starsGranted ?? 0)), stars: data?.stars, starsEarnedTotal: data?.starsEarnedTotal };
  } catch (error) {
    return { ok: false, reason: classifyClaimLevelError(error) };
  }
}

export async function claimWeeklyChest(weekKey: string): Promise<ClaimChestResult> {
  const key = String(weekKey || '').trim();
  if (!key) return { ok: false, reason: 'week_open' };
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: false, reason: 'network' };

  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const requestId = makeRequestId('ftcc');
    const fn = httpsCallable<
      { weekKey: string; requestId: string },
      {
        ok: boolean;
        starsGranted: number;
        xpBoostMinutes: number;
        streakShield: boolean;
        aura: boolean;
        stars?: number;
        starsEarnedTotal?: number;
      }
    >(getFunctions(getApp(), REGION), 'friendsClaimWeeklyChest');
    const res = await fn({ weekKey: key, requestId });
    const data = res.data;
    patchStarsIfPresent(data);
    return {
      ok: true,
      rewards: {
        starsGranted: Math.max(0, Math.floor(data?.starsGranted ?? 0)),
        xpBoostMinutes: Math.max(0, Math.floor(data?.xpBoostMinutes ?? 0)),
        streakShield: data?.streakShield === true,
        aura: data?.aura === true,
      },
      stars: data?.stars,
      starsEarnedTotal: data?.starsEarnedTotal,
    };
  } catch (error) {
    return { ok: false, reason: classifyClaimChestError(error) };
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }

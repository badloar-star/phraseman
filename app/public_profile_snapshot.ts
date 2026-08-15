import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureAuthoritativeIdentityForCloudMutation } from './cloud_sync';
import { USER_AVATAR_AURA_KEY, normalizeAvatarAuraId } from '../constants/avatar_auras';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import {
  PROFILE_CARD_LEGEND_NO_KEY,
  PROFILE_CARD_LEVEL_KEY,
  PROFILE_CARD_MOTION_KEY,
  PROFILE_CARD_PUBLIC_FOCUS_KEY,
  PROFILE_CARD_THEME_KEY,
  normalizeProfileCardLevel,
  normalizeProfileCardMotion,
  normalizeProfileCardPublicFocus,
  normalizeProfileCardTheme,
} from './profile_card_system';
import { readLifetimeProfileStatsCache } from './lifetime_profile_stats';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { accountScopeKey } from './account_scope_key';
import {
  loadSeasonCosmetics,
  SEASON1_FRAME_ID,
} from './season_cosmetics';

export const PUBLIC_PROFILE_SNAPSHOT_CACHE_KEY = 'public_profile_snapshot_v1';
export const PUBLIC_PROFILE_XP_TTL_MS = 24 * 60 * 60 * 1000;

type PublicProfileReason = 'daily_xp' | 'display_change' | 'entitlement_change';

type SnapshotInput = {
  reason: PublicProfileReason;
  name?: string;
  totalXp?: number;
  weekPoints?: number;
  lang?: string;
  avatar?: string | null;
  frame?: string | null;
  aura?: string | null;
  streak?: number | null;
  leagueId?: number | null;
  isPremium?: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
};

type SnapshotCache = {
  xpSyncedAt?: number;
  displayHash?: string;
  isPremium?: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
};

type QueuedSnapshotInput = SnapshotInput & {
  includesDailyXp: boolean;
};

type OwnerSyncState = {
  token: AccountGenerationToken;
  pending: QueuedSnapshotInput | null;
  drain: Promise<void> | null;
  dirty: boolean;
  cacheLoaded: boolean;
  cache: SnapshotCache;
};

const ownerSyncStates = new Map<string, OwnerSyncState>();

function isJestRuntime(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env.JEST_WORKER_ID);
}

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

type ProjectionResponse = {
  ok: boolean;
  stableUid: string;
  isPremium: boolean;
  isVip: boolean;
  isLifetime: boolean;
  progressAuthority: 'server' | 'unavailable';
};

function publicProfileProjectionCallable() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  const typed = httpsCallable as <Req, Res>(instance: unknown, name: string) => (
    data: Req,
  ) => Promise<{ data: Res }>;
  return typed<
    { stableId: string; reason: PublicProfileReason; profile: Record<string, unknown> },
    ProjectionResponse
  >(getFunctions(getApp(), 'us-central1'), 'publicProfileProjectMine');
}

async function readString(key: string): Promise<string> {
  try {
    return (await AsyncStorage.getItem(key)) ?? '';
  } catch {
    return '';
  }
}

function readNumber(raw: string | undefined | null, fallback = 0): number {
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function snapshotCacheKey(stableId: string): string {
  return `${PUBLIC_PROFILE_SNAPSHOT_CACHE_KEY}:${encodeURIComponent(stableId)}`;
}

async function readSnapshotCache(stableId: string): Promise<SnapshotCache> {
  try {
    const raw = await AsyncStorage.getItem(snapshotCacheKey(stableId));
    return raw ? JSON.parse(raw) as SnapshotCache : {};
  } catch {
    return {};
  }
}

async function writeSnapshotCache(stableId: string, cache: SnapshotCache): Promise<boolean> {
  try {
    await AsyncStorage.setItem(snapshotCacheKey(stableId), JSON.stringify(cache));
    return true;
  } catch {
    return false;
  }
}

const reasonPriority: Record<PublicProfileReason, number> = {
  daily_xp: 0,
  display_change: 1,
  entitlement_change: 2,
};

function mergeQueuedInput(
  current: QueuedSnapshotInput | null,
  next: SnapshotInput,
): QueuedSnapshotInput {
  const merged: QueuedSnapshotInput = current
    ? { ...current }
    : { reason: next.reason, includesDailyXp: false };
  for (const [key, value] of Object.entries(next)) {
    if (key !== 'reason' && value !== undefined) (merged as Record<string, unknown>)[key] = value;
  }
  if (!current || reasonPriority[next.reason] > reasonPriority[current.reason]) merged.reason = next.reason;
  merged.includesDailyXp = Boolean(current?.includesDailyXp || next.reason === 'daily_xp');
  return merged;
}

function pruneOwnerSyncStates(): void {
  for (const [key, state] of ownerSyncStates) {
    if (!isCurrentAccountGeneration(state.token)) ownerSyncStates.delete(key);
  }
}

function stableStringify(value: Record<string, unknown>): string {
  return JSON.stringify(Object.keys(value).sort().reduce<Record<string, unknown>>((out, key) => {
    out[key] = value[key];
    return out;
  }, {}));
}

async function syncPublicProfileSnapshotUnsafe(
  input: QueuedSnapshotInput,
  accountToken: AccountGenerationToken,
  ownerState: OwnerSyncState,
): Promise<void> {
  const isCurrent = () => isCurrentAccountGeneration(accountToken);
  if (!isCurrent()) return;
  if (!CLOUD_SYNC_ENABLED || isJestRuntime()) return;
  const db = getFirestore();
  if (!db) return;

  const now = Date.now();
  if (!ownerState.cacheLoaded) {
    ownerState.cache = await readSnapshotCache(accountToken.stableId!);
    ownerState.cacheLoaded = true;
  }
  const cache = ownerState.cache;
  if (!isCurrent()) return;
  const xpFresh = cache.xpSyncedAt !== undefined && now - cache.xpSyncedAt < PUBLIC_PROFILE_XP_TTL_MS;
  if (input.reason === 'daily_xp' && xpFresh && !ownerState.dirty) return;
  const [nameRaw, xpRaw, langRaw, avatarRaw, frameRaw, auraRaw, leagueRaw] = await Promise.all([
    input.name !== undefined ? Promise.resolve(input.name) : readString('user_name'),
    input.totalXp !== undefined ? Promise.resolve(String(input.totalXp)) : readString('user_total_xp'),
    input.lang !== undefined ? Promise.resolve(input.lang) : readString('app_lang'),
    input.avatar !== undefined ? Promise.resolve(input.avatar ?? '') : readString('user_avatar'),
    input.frame !== undefined ? Promise.resolve(input.frame ?? '') : readString('user_frame'),
    input.aura !== undefined ? Promise.resolve(input.aura ?? '') : readString(USER_AVATAR_AURA_KEY),
    input.leagueId !== undefined ? Promise.resolve(JSON.stringify({ leagueId: input.leagueId ?? 0 })) : readString('league_state_v3'),
  ]);
  if (!isCurrent()) return;

  const totalXp = Math.max(0, readNumber(xpRaw, 0));
  const level = getLevelFromXP(totalXp);
  const fallbackAvatar = String(getBestAvatarForLevel(level));
  const storedAvatar = String(avatarRaw || '').trim();
  const avatar = storedAvatar && !/^\d+$/.test(storedAvatar) ? storedAvatar : fallbackAvatar;
  const frame = String(frameRaw || '').trim() || null;
  const aura = normalizeAvatarAuraId(auraRaw) ?? null;
  const lang = String(langRaw || 'ru').trim() || 'ru';
  const name = String(nameRaw || '').trim();
  let leagueId = 0;
  try {
    leagueId = Math.max(0, readNumber(JSON.parse(leagueRaw || '{}')?.leagueId, 0));
  } catch {
    leagueId = 0;
  }

  const profilePairs = await AsyncStorage.multiGet([
    PROFILE_CARD_LEVEL_KEY,
    PROFILE_CARD_THEME_KEY,
    PROFILE_CARD_MOTION_KEY,
    PROFILE_CARD_PUBLIC_FOCUS_KEY,
    PROFILE_CARD_LEGEND_NO_KEY,
  ]).catch(() => [
    [PROFILE_CARD_LEVEL_KEY, null],
    [PROFILE_CARD_THEME_KEY, null],
    [PROFILE_CARD_MOTION_KEY, null],
    [PROFILE_CARD_PUBLIC_FOCUS_KEY, null],
    [PROFILE_CARD_LEGEND_NO_KEY, null],
  ] as [string, string | null][]);
  if (!isCurrent()) return;

  const rawProfileLevel = profilePairs[0]?.[1] ?? null;
  const rawTheme = profilePairs[1]?.[1] ?? null;
  const rawMotion = profilePairs[2]?.[1] ?? null;
  const rawFocus = profilePairs[3]?.[1] ?? null;
  const rawLegendNo = profilePairs[4]?.[1] ?? null;

  const profileCardLevel = normalizeProfileCardLevel(rawProfileLevel);
  const profileCardTheme = normalizeProfileCardTheme(rawTheme);
  const profileCardMotion = normalizeProfileCardMotion(rawMotion);
  const profileCardPublicFocus = normalizeProfileCardPublicFocus(rawFocus);
  const legendNoParsed = Math.floor(Number(rawLegendNo));
  const profileCardLegendNo = Number.isFinite(legendNoParsed) && legendNoParsed > 0 ? legendNoParsed : null;
  const lifetimeStats = profileCardLevel >= 2
    ? await readLifetimeProfileStatsCache().catch(() => null)
    : null;
  if (!isCurrent()) return;
  const cardStatsPayload = lifetimeStats
    ? {
        cardWordsLearned: Math.max(0, Math.floor(lifetimeStats.wordsLearned)),
        cardPhrasesLearned: Math.max(0, Math.floor(lifetimeStats.phrasesLearned)),
        cardAppDays: Math.max(0, Math.floor(lifetimeStats.appDaysUnion)),
        cardLongestStreak: Math.max(0, Math.floor(lifetimeStats.longestStreakDays)),
      }
    : {};
  const seasonProfileFrameId = (await loadSeasonCosmetics().catch(() => null))?.frames.includes(SEASON1_FRAME_ID)
    ? SEASON1_FRAME_ID
    : null;
  if (!isCurrent()) return;

  // Блоки статистики уровней II+ («Выучено»/«Путь») — денормализуем в публичный
  // профиль из локального lifetime-кэша, чтобы ЧУЖИЕ карточки могли их показать.
  // Кэш освежается экраном статистики и модалом собственной карточки; если его ещё
  // нет — поля не пишем (карточка у других просто не покажет строку, без вранья).
  // Pro-план (разовая «Навсегда») читаем прямо из локального премиум-плана, если
  // вызывающий не передал явно — так все точки вызова (покупка/VIP/деактивация)
  // автоматически денормализуют актуальный флаг без протаскивания его через каждый
  // вызов. Денормализуем только при активном премиум-доступе: истёкший lifetime не
  // должен оставлять «Pro»-плашку у чужих.
  // зачем: владелец (2026-08-03) — Pro бывает и безденежным (сертификат
  // «Pro — навсегда», промокод, бессрочная выдача), там isPremium=false.
  // Раньше гейт стоял только на isPremium и такой человек терял Pro-ауру
  // в чужих профилях. Истёкший доступ по-прежнему плашку не оставляет.
  const displayHash = stableStringify({
    name,
    lang,
    avatar,
    frame,
    aura,
    leagueId,
    profileCardLevel,
    profileCardTheme,
    profileCardMotion,
    profileCardPublicFocus,
    profileCardLegendNo,
    seasonProfileFrameId,
    ...cardStatsPayload,
  });

  if (input.reason === 'daily_xp' && xpFresh && cache.displayHash === displayHash) return;
  if (input.reason === 'display_change' && cache.displayHash === displayHash && (!input.includesDailyXp || xpFresh)) {
    ownerState.dirty = false;
    return;
  }

  const stableId = await ensureAnonUser();
  if (!stableId || !isCurrent() || (accountToken?.stableId && accountToken.stableId !== stableId)) return;
  const authoritativeIdentity = await ensureAuthoritativeIdentityForCloudMutation(stableId);
  if (!authoritativeIdentity.ok || authoritativeIdentity.stableUid !== stableId || !isCurrent()) return;

  try {
    const banDoc = await db.collection('banned_users').doc(stableId).get();
    if (banDoc.exists || !isCurrent()) return;
  } catch {}

  // nameLower ДОЛЖЕН обновляться вместе с name. Иначе при merge:true профиль
  // получает новое name, но старый nameLower (напр. name="Дладуд" +
  // nameLower="тлдь") — рассинхрон, из-за которого поиск/индекс не находят юзера.
  // Нормализуем так же, как серверный nameReserve → normalizeName: trim, ≤32, lower.
  const profile = {
    name,
    lang,
    avatar,
    frame,
    aura,
    leagueId,
    profileCardLevel,
    profileCardTheme,
    profileCardMotion,
    profileCardPublicFocus,
    seasonProfileFrameId,
    ...(profileCardLegendNo !== null ? { profileCardLegendNo } : {}),
    ...cardStatsPayload,
    displayHash,
  };

  if (!isCurrent()) return;
  const projected = await publicProfileProjectionCallable()({
    stableId,
    reason: input.reason,
    profile,
  });

  if (!isCurrent()) return;
  if (projected.data?.ok !== true || projected.data.stableUid !== stableId) return;
  const progressProjected = projected.data.progressAuthority === 'server';
  const nextCache = {
    displayHash,
    isPremium: projected.data.isPremium,
    isVip: projected.data.isVip,
    isLifetime: projected.data.isLifetime,
    xpSyncedAt: input.includesDailyXp && progressProjected ? now : cache.xpSyncedAt,
  };
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken)) return;
    const written = await writeSnapshotCache(stableId, nextCache);
    if (!written || !isCurrentAccountGeneration(accountToken)) return;
    ownerState.cache = nextCache;
    ownerState.cacheLoaded = true;
    ownerState.dirty = input.includesDailyXp && !progressProjected;
  });
}

/** Public profile mirroring is best-effort and must never reject into UI event handlers. */
export function syncPublicProfileSnapshot(
  input: SnapshotInput,
  accountToken?: AccountGenerationToken,
): Promise<void> {
  const operationToken = accountToken ?? captureAccountGeneration();
  if (!operationToken.stableId || !isCurrentAccountGeneration(operationToken)) return Promise.resolve();
  pruneOwnerSyncStates();
  const ownerKey = accountScopeKey(operationToken);
  if (!ownerKey) return Promise.resolve();
  let state = ownerSyncStates.get(ownerKey);
  if (!state) {
    state = {
      token: operationToken,
      pending: null,
      drain: null,
      dirty: false,
      cacheLoaded: false,
      cache: {},
    };
    ownerSyncStates.set(ownerKey, state);
  }
  state.pending = mergeQueuedInput(state.pending, input);
  if (input.reason !== 'daily_xp') state.dirty = true;
  if (state.drain) return state.drain;
  const ownerState = state;
  ownerState.drain = Promise.resolve().then(async () => {
    while (ownerState.pending && isCurrentAccountGeneration(operationToken)) {
      const next = ownerState.pending;
      ownerState.pending = null;
      try {
        await syncPublicProfileSnapshotUnsafe(next, operationToken, ownerState);
      } catch {
        ownerState.dirty = true;
      }
    }
  }).finally(() => {
    ownerState.drain = null;
  });
  return ownerState.drain;
}

export const __publicProfileSnapshotTestHooks = {
  cacheKey: snapshotCacheKey,
  resetRuntimeState: () => ownerSyncStates.clear(),
};

export default function __RouteShim() { return null; }

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureAuthoritativeIdentityForCloudMutation } from './cloud_sync';
import { readLifetimeProfileStatsCache } from './lifetime_profile_stats';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { DebugLogger } from './debug-logger';
import { readCoinRank } from './coin_rank_state_v1';
import { isValidCoinRank } from './coin_rank_table_v1';
import { readProfileCardProForProjection } from './profile_card_pro_state_v1';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export const PUBLIC_PROFILE_SNAPSHOT_CACHE_KEY = 'public_profile_snapshot_v1';
type PublicProfileReason = 'display_change' | 'entitlement_change';

type SnapshotInput = {
  reason: PublicProfileReason;
  name?: string;
  lang?: string;
  avatar?: string | null;
  frame?: string | null;
  aura?: string | null;
  streak?: number | null;
  isPremium?: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
};

type SnapshotCache = {
  displayHash?: string;
  isPremium?: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
};

type QueuedSnapshotInput = SnapshotInput & {
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
  } catch (error) {
    // зачем (аудит Optimistic UI Профиля, 13.10; «немого catch нет»): без Firestore проекция публичной карточки молча не уходила — теперь причина в журнале
    DebugLogger.warn('[PROFILE-CARD]', `public snapshot: Firestore недоступен (${error instanceof Error ? error.message : String(error)}) — проекция не уйдёт`);
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

/** Те же ключи, что пишет checkBanStatus в app/_layout.tsx (равенство сторожит тест). */
const BAN_STATUS_CACHE_KEY = 'ban_status_cached_v1';
const BAN_STATUS_CACHE_AT_KEY = 'ban_status_cached_at_v1';
const BAN_STATUS_CACHE_TRUST_MS = 6 * 60 * 60 * 1000;

async function readFreshBanStatusCache(): Promise<'banned' | 'clear' | 'unknown'> {
  try {
    const [[, raw], [, atRaw]] = await AsyncStorage.multiGet([BAN_STATUS_CACHE_KEY, BAN_STATUS_CACHE_AT_KEY]);
    const ageMs = Date.now() - (Number(atRaw) || 0);
    if ((raw !== '1' && raw !== '0') || ageMs < 0 || ageMs >= BAN_STATUS_CACHE_TRUST_MS) return 'unknown';
    return raw === '1' ? 'banned' : 'clear';
  } catch (error: unknown) {
    console.warn('[READ-TTL]', JSON.stringify({ area: 'profile_ban_check', source: 'cache', result: 'read_failed', message: error instanceof Error ? error.message.slice(0, 80) : String(error).slice(0, 80) })); // guard-ok: catch называет причину
    return 'unknown';
  }
}

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
  } catch (error) {
    DebugLogger.warn('[PROFILE-CARD]', `public snapshot: ключ ${key} не прочитался (${error instanceof Error ? error.message : String(error)})`);
    return '';
  }
}

function snapshotCacheKey(stableId: string): string {
  return `${PUBLIC_PROFILE_SNAPSHOT_CACHE_KEY}:${encodeURIComponent(stableId)}`;
}

async function readSnapshotCache(stableId: string): Promise<SnapshotCache> {
  try {
    const raw = await AsyncStorage.getItem(snapshotCacheKey(stableId));
    return raw ? JSON.parse(raw) as SnapshotCache : {};
  } catch (error) {
    DebugLogger.warn('[PROFILE-CARD]', `public snapshot: кэш проекции не прочитался или битый (${error instanceof Error ? error.message : String(error)}) — начнём с пустого`);
    return {};
  }
}

async function writeSnapshotCache(stableId: string, cache: SnapshotCache): Promise<boolean> {
  try {
    await AsyncStorage.setItem(snapshotCacheKey(stableId), JSON.stringify(cache));
    return true;
  } catch (error) {
    DebugLogger.warn('[PROFILE-CARD]', `public snapshot: кэш проекции не записался (${error instanceof Error ? error.message : String(error)})`);
    return false;
  }
}

const reasonPriority: Record<PublicProfileReason, number> = {
  display_change: 0,
  entitlement_change: 1,
};

function mergeQueuedInput(
  current: QueuedSnapshotInput | null,
  next: SnapshotInput,
): QueuedSnapshotInput {
  const merged: QueuedSnapshotInput = current
    ? { ...current }
    : { reason: next.reason };
  for (const [key, value] of Object.entries(next)) {
    if (key !== 'reason' && value !== undefined) (merged as Record<string, unknown>)[key] = value;
  }
  if (!current || reasonPriority[next.reason] > reasonPriority[current.reason]) merged.reason = next.reason;
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

  if (!ownerState.cacheLoaded) {
    ownerState.cache = await readSnapshotCache(accountToken.stableId!);
    ownerState.cacheLoaded = true;
  }
  const cache = ownerState.cache;
  if (!isCurrent()) return;
  const [nameRaw, langRaw, avatarRaw, frameRaw] = await Promise.all([
    input.name !== undefined ? Promise.resolve(input.name) : readString('user_name'),
    input.lang !== undefined ? Promise.resolve(input.lang) : readString('app_lang'),
    input.avatar !== undefined ? Promise.resolve(input.avatar ?? '') : readString('user_avatar'),
    input.frame !== undefined ? Promise.resolve(input.frame ?? '') : readString('user_frame'),
  ]);
  if (!isCurrent()) return;

  const storedAvatar = String(avatarRaw || '').trim();
  // зачем: D108 — купленные аватары («custom:…») и ауры удалены. Публичный профиль
  // публикует базовый аватар и явно aura: null, чтобы стереть старую ауру у друзей.
  const avatar = storedAvatar && !storedAvatar.startsWith('custom:') ? storedAvatar : '1';
  const frame = String(frameRaw || '').trim() || null;
  const aura = null;
  const lang = String(langRaw || 'ru').trim() || 'ru';
  const name = String(nameRaw || '').trim();
  const lifetimeStats = await readLifetimeProfileStatsCache().catch(noteSwallowedAs('public_profile_snapshot:promise_1', null));
  if (!isCurrent()) return;
  const cardStatsPayload = lifetimeStats
    ? {
        cardWordsLearned: Math.max(0, Math.floor(lifetimeStats.wordsLearned)),
        cardPhrasesLearned: Math.max(0, Math.floor(lifetimeStats.phrasesLearned)),
        cardAppDays: Math.max(0, Math.floor(lifetimeStats.appDaysUnion)),
        cardLongestStreak: Math.max(0, Math.floor(lifetimeStats.longestStreakDays)),
      }
    : {};
  const coinRankOwner = accountToken.stableId?.trim() ?? '';
  if (!coinRankOwner || !isCurrentAccountGeneration(accountToken, coinRankOwner)) return;
  const localCoinRank = await readCoinRank(coinRankOwner);
  if (!isCurrentAccountGeneration(accountToken, coinRankOwner)) return;
  const coinRankPayload = isValidCoinRank(localCoinRank) ? { coinRank: localCoinRank } : {};
  // зачем (D114): визитка «Про» и её стиль видны другим игрокам — проецируем флаг и
  // стиль из локального права (куплено за монеты этого аккаунта). Свой текст сюда
  // не входит: он пишется только profileCardBioSetMine с серверными проверками.
  const profileCardProPayload = await readProfileCardProForProjection(coinRankOwner);
  if (!isCurrentAccountGeneration(accountToken, coinRankOwner)) return;
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
    ...coinRankPayload,
    ...profileCardProPayload,
    ...cardStatsPayload,
  });

  if (input.reason === 'display_change' && cache.displayHash === displayHash) {
    ownerState.dirty = false;
    return;
  }

  const stableId = await ensureAnonUser();
  if (!stableId || !isCurrent() || (accountToken?.stableId && accountToken.stableId !== stableId)) return;
  const authoritativeIdentity = await ensureAuthoritativeIdentityForCloudMutation(stableId);
  if (!authoritativeIdentity.ok || authoritativeIdentity.stableUid !== stableId || !isCurrent()) return;

  // зачем (владелец 21.10, №45 шаг 6; Ревизор п.6): каждая публикация профиля читала banned_users — почти всегда
  // «нет документа». Ответ уже знает проверка бана на старте (_layout, кэш 30 мин, стирается при смене аккаунта):
  // свежий кэш < 6 ч решает без сети, иначе читаем как раньше.
  const cachedBan = await readFreshBanStatusCache();
  if (cachedBan === 'banned') {
    console.log('[READ-TTL]', JSON.stringify({ area: 'profile_ban_check', source: 'cache', result: 'banned' })); // guard-ok: ранний выход, без uid
    return;
  }
  if (cachedBan === 'clear') {
    console.log('[READ-TTL]', JSON.stringify({ area: 'profile_ban_check', source: 'cache', result: 'clear' })); // guard-ok: ветка решения, без uid
  } else {
    try {
      const banDoc = await db.collection('banned_users').doc(stableId).get();
      console.log('[READ-TTL]', JSON.stringify({ area: 'profile_ban_check', source: 'network', result: banDoc.exists ? 'banned' : 'clear' })); // guard-ok: ветка решения, без uid
      if (banDoc.exists || !isCurrent()) return;
    } catch (e) {
      DebugLogger.error('public_profile_snapshot:banDoc', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  if (!isCurrent()) return;

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
    ...coinRankPayload,
    ...profileCardProPayload,
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
  };
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken)) return;
    const written = await writeSnapshotCache(stableId, nextCache);
    if (!written || !isCurrentAccountGeneration(accountToken)) return;
    ownerState.cache = nextCache;
    ownerState.cacheLoaded = true;
    ownerState.dirty = !progressProjected;
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
  state.dirty = true;
  if (state.drain) return state.drain;
  const ownerState = state;
  ownerState.drain = Promise.resolve().then(async () => {
    while (ownerState.pending && isCurrentAccountGeneration(operationToken)) {
      const next = ownerState.pending;
      ownerState.pending = null;
      try {
        await syncPublicProfileSnapshotUnsafe(next, operationToken, ownerState);
      } catch (error) {
        // зачем (аудит Optimistic UI Профиля, 13.10): упала проекция («Про», стиль, ранг) — другие игроки не увидят изменения; причина должна быть в журнале, а не только флаг dirty
        DebugLogger.warn('[PROFILE-CARD]', `public snapshot: проекция упала (${error instanceof Error ? error.message : String(error)}) — публичная карточка останется старой до следующей отправки`);
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

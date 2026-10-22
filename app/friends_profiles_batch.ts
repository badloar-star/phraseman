/**
 * Пачковая загрузка профилей друзей через callable friendsGetProfiles
 * (заменяет 4-RTT цепочку fetchFriendProfileFromFirestore в friends.tsx:498-523).
 *
 * Было: до 4 последовательных Firestore-запросов на КАЖДОГО друга, concurrency 6 —
 * на 20 друзьях до 80 RTT в момент открытия таба. Стало: 1 callable на пачку
 * (до 100 uid), серверная сборка leaderboard + серверный кэш 60 c.
 *
 * Модульный TTL-кэш (30 мин для профилей, 5 мин для пустой записи после сбоя) переживает ремаунты экрана — как peekProfilesCache(),
 * но не дублирует его: friends.tsx продолжает вести свой ProfileCacheEntry-кэш,
 * этот модуль только снимает повторные сетевые вызовы внутри TTL.
 *
 * TODO(types): FriendProfile сейчас объявлен внутри friends.tsx. Возвращаем
 * FriendProfileBatchRecord и конвертируем на стороне diff'а (см. friends.tsx.diffs.md).
 * При декомпозиции friends.tsx вынести общий тип в app/friends_profile_types.ts.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { isReferralCloudEnabled } from './referral_flags';
import { noteSwallowed } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const REGION = 'us-central1';
const BATCH_CACHE_TTL_MS = 5 * 60 * 1000;
// зачем (смета Firebase 13.10, п. 5; координатор): ряд «Друзья на этой неделе» в Шпиле входит в кэш на 30 мин — рейтинг друзей не меняется ежеминутно,
// а каждый вход стоил 8 + 5 × F серверных чтений. С 18.10 (координатор, Firebase-экономия) это срок по умолчанию и для вкладки «Друзья»; `maxAgeMs` может его сократить.
export const FRIENDS_BATCH_LONG_TTL_MS = 30 * 60 * 1000;
const BATCH_CACHE_KEEP_MS = FRIENDS_BATCH_LONG_TTL_MS;
const BATCH_CACHE_MAX_ENTRIES = 256;
/** Размер пачки должен совпадать с MAX_UIDS_PER_CALL в functions/src/friends_profiles.ts. */
const BATCH_SIZE = 100;

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), REGION), name);
}

/** Публичный профиль друга — зеркало FriendPublicProfile из functions/src/friends_profiles.ts. */
export interface FriendProfileBatchRecord {
  uid: string;
  displayName: string;
  level: number;
  avatar: string;
  frame: string;
  aura: string;
  profileCardLevel: number;
  /** Публичный ранг 0..19; null/undefined = сервер не отдал подтверждённое значение. */
  coinRank?: number | null;
  /** null = сервер не знает цепочку. Карточка тогда не рисует «0», а прячет строку. */
  streak: number | null;
  isPremium: boolean;
  isVip: boolean;
  isLifetime: boolean;
  /** Настоящий Plus и срок (Ядро 22.10); старый ответ сервера без этих полей = кольца нет. */
  isPlus?: boolean | null;
  plusUntilMs?: number | null;
  // ── «Вместе» (friends_together): расширение сервера идёт параллельно в этой же
  // фазе — поля читаем tolerant-к-отсутствию (undefined/null → безопасный дефолт),
  // старый ответ callable без этих полей не должен ломать маппинг.
  /** Локальный день последней активности друга (YYYY-MM-DD), null = сервер не отдал. */
  lastActiveDate?: string | null;
  /** Кодированные активные дни друга — вход для together_days.daysTogether. */
  activeDays?: { anchor: string; bits: string } | null;
  /** legacy reward друга за ТЕКУЩУЮ неделю лиг (0, если сервер не отдал или неделя не совпала). */
  /** Настройки пуша «Позвать» друга — null, если сервер не знает/друг не настраивал. */
  friendsPush?: { enabled: boolean; tz: number } | null;
  // ── Шпиль (TOWER.md §4.5, PM-282): «Друзья на этой неделе». Едет тем же
  // батчевым callable, 0 доп. чтений на друга — сервер уже читал users/{uid}.
  /** Лучший этаж друга ЗА ТЕКУЩУЮ неделю среди всех языков. null = не играл / нет данных. */
  spireFloor?: number | null;
  /** Язык, на котором друг достиг spireFloor. null = нет данных. */
  spireLang?: string | null;
  /**
   * Начатые языки друга (progress.study_languages_started_v1) — «Дуэль — когда учите один язык» (идея 3, 1 · ЯДРО 22.10).
   * Тот же users/{uid}, 0 доп. чтений. Сырое поле сервера: разбирает parseStudyLanguagesStarted (friends_together/duel_eligibility).
   */
  studyLanguagesStarted?: unknown;
}

type ProfilesResponse = {
  ok?: boolean;
  profiles: Record<string, FriendProfileBatchRecord | null>;
};

interface CacheEntry {
  profile: FriendProfileBatchRecord | null;
  fetchedAt: number;
}

const batchCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<FriendProfileBatchRecord | null>>();

function pruneExpiredBatchCache(now: number): void {
  for (const [uid, entry] of batchCache) {
    // зачем: записи старше 5 мин, но моложе 30 мин, остаются — их ждёт вызывающий с длинным сроком (Шпиль).
    if (now - entry.fetchedAt >= BATCH_CACHE_KEEP_MS) batchCache.delete(uid);
  }
}

function setBatchCacheEntry(uid: string, entry: CacheEntry): void {
  // Map insertion order is the LRU order. Replacing first keeps repeated public
  // profiles hot without allowing friend/account churn to grow memory forever.
  batchCache.delete(uid);
  batchCache.set(uid, entry);
  while (batchCache.size > BATCH_CACHE_MAX_ENTRIES) {
    const oldestUid = batchCache.keys().next().value as string | undefined;
    if (oldestUid === undefined) break;
    batchCache.delete(oldestUid);
  }
}

async function fetchBatch(uids: string[]): Promise<Record<string, FriendProfileBatchRecord | null>> {
  const fn = callable<{ uids: string[] }, ProfilesResponse>('friendsGetProfiles');
  const res = await fn({ uids });
  return res.data?.profiles ?? {};
}

/** Сколько из uid лежат в кэше свежими при данном сроке (для журнала вызывающего; кэш не меняет). */
// зачем (координатор 18.10 08:22, Firebase-экономия владельца): вкладка «Друзья» тоже держит профили 30 мин (было 5) — пустая запись после сбоя по-прежнему 5 мин.
export function countFreshFriendProfiles(uids: readonly string[], maxAgeMs: number = FRIENDS_BATCH_LONG_TTL_MS): number {
  const now = Date.now();
  let fresh = 0;
  for (const uid of new Set(uids)) {
    const hit = batchCache.get(uid);
    if (!hit) continue;
    const ttl = hit.profile ? Math.max(BATCH_CACHE_TTL_MS, Math.min(maxAgeMs, BATCH_CACHE_KEEP_MS)) : BATCH_CACHE_TTL_MS;
    if (now - hit.fetchedAt < ttl) fresh += 1;
  }
  return fresh;
}

/** Инвалидировать кэш (например после принятия заявки — у нового друга профиль нужен свежий). */
export function invalidateFriendsProfilesBatchCache(uids?: string[]): void {
  if (!uids) {
    batchCache.clear();
    return;
  }
  for (const uid of uids) batchCache.delete(uid);
}

/**
 * Пачковая загрузка профилей: TTL-кэш + dedupe inflight + разбиение на чанки по 100.
 * Возвращает map uid → профиль (null — профиля нет/ошибка, вызывающий решает про fallback).
 * НИКОГДА не бросает: при сбое сети отдаёт то, что есть в кэше (null для промахов).
 */
export async function fetchFriendProfilesBatch(
  uids: string[],
  options: { force?: boolean; maxAgeMs?: number } = {},
): Promise<Record<string, FriendProfileBatchRecord | null>> {
  const unique = [...new Set(uids.map((u) => String(u ?? '').trim()).filter(Boolean))];
  const result: Record<string, FriendProfileBatchRecord | null> = {};
  if (unique.length === 0) return result;

  const now = Date.now();
  pruneExpiredBatchCache(now);
  const toFetch: string[] = [];
  for (const uid of unique) {
    const hit = batchCache.get(uid);
    // зачем: длинный срок только для записей с профилем — пустая запись (сбой вызова) живёт прежние 5 мин, иначе сбой спрятал бы друзей на 30 мин.
    // зачем (координатор 18.10 08:22): срок записи с профилем по умолчанию — 30 мин (и для вкладки «Друзья», не только для Шпиля)
    const ttl = hit?.profile ? Math.max(BATCH_CACHE_TTL_MS, Math.min(options.maxAgeMs ?? FRIENDS_BATCH_LONG_TTL_MS, BATCH_CACHE_KEEP_MS)) : BATCH_CACHE_TTL_MS;
    if (!options.force && hit && now - hit.fetchedAt < ttl) {
      batchCache.delete(uid);
      batchCache.set(uid, hit);
      result[uid] = hit.profile;
    } else {
      toFetch.push(uid);
    }
  }

  console.log(`[COST-CUT] friends profiles hit=${unique.length - toFetch.length} miss=${toFetch.length} force=${options.force === true}`); // guard-ok: экономия чтений, только числа
  // Dedupe: uid уже в полёте — ждём тот же промис.
  const waiters: Promise<void>[] = [];
  const owners: string[] = [];
  for (const uid of toFetch) {
    const existing = inFlight.get(uid);
    if (existing) {
      waiters.push(existing.then((p) => { result[uid] = p; }));
    } else {
      owners.push(uid);
    }
  }

  if (owners.length > 0) {
    if (!isReferralCloudEnabled()) {
      // Без облака (Expo Go) — кладём null в кэш, вызывающий уйдёт в legacy-путь.
      for (const uid of owners) {
        setBatchCacheEntry(uid, { profile: null, fetchedAt: now });
        result[uid] = null;
      }
    } else {
      const chunks: string[][] = [];
      for (let i = 0; i < owners.length; i += BATCH_SIZE) {
        chunks.push(owners.slice(i, i + BATCH_SIZE));
      }
      await Promise.all(
        chunks.map(async (chunk) => {
          const request = fetchBatch(chunk).catch((swallowedError: unknown): Record<string, FriendProfileBatchRecord | null> => { noteSwallowed('friends_profiles_batch:promise_1', swallowedError); return {}; });
          for (const uid of chunk) {
            const perUid = request.then((map) => {
              const profile = map[uid] ?? null;
              setBatchCacheEntry(uid, { profile, fetchedAt: Date.now() });
              return profile;
            });
            inFlight.set(uid, perUid);
            waiters.push(
              perUid
                .then((p) => { result[uid] = p; })
                .finally(() => { inFlight.delete(uid); }),
            );
          }
        }),
      );
    }
  }

  await Promise.all(waiters);
  return result;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }

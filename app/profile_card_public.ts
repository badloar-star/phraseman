// ═══ Визитка «Про»: чтение чужой визитки и запись своего текста ═══════════════
// зачем (владелец 2026-09-30): свой текст визитки «Про» видят другие игроки, когда
// открывают визитку. Пишется ТОЛЬКО через callable profileCardBioSetMine (правила
// Firestore запрещают клиенту писать public_profiles). Чтение чужой визитки — один
// документ public_profiles/{uid} по явному открытию визитки, с кэшем в памяти на
// 10 минут и склейкой одновременных запросов (Firebase-экономия: повторное
// открытие той же визитки не читает сеть).
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { InteractionManager } from 'react-native';

import { withCallableTimeout } from './callable_timeout';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';
import { isProfileCardProStyle, type ProfileCardProStyle } from './profile_card_styles';

const LOG = '[PROFILE-CARD]';
const REGION = 'us-central1';
const PUBLIC_CARD_TTL_MS = 10 * 60 * 1000;
const PUBLIC_CARD_CACHE_MAX = 128;

export const PROFILE_CARD_BIO_MAX_CHARS = 80;

export type PublicProfileCard = Readonly<{
  pro: boolean;
  style: ProfileCardProStyle | null;
  /** Текст показывается только при pro === true. */
  bio: string;
}>;

const EMPTY_CARD: PublicProfileCard = Object.freeze({ pro: false, style: null, bio: '' });

type CacheEntry = { card: PublicProfileCard; fetchedAt: number };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<PublicProfileCard>>();

// зачем (координатор 13.10, аудит Optimistic UI Профиля): карточка Pro-друга при первом открытии за запуск рисовалась «обычной» и потом перекрашивалась после чтения public_profiles.
// Последние прочитанные визитки лежат на диске (stale-while-revalidate): первый кадр берёт устаревшую копию, а свежесть и число чтений Firestore прежние — после TTL чтение, как и раньше, одно.
// Данные публичные (то, что любой игрок и так читает), хранится только то, что мы уже прочитали; новых запросов эта копия не делает.
export const PROFILE_CARD_PUBLIC_DISK_KEY = 'profile_card_public_v1'; // зачем: тот же ключ стирает выход/смена/удаление аккаунта (cloud_sync.ts, WIPE_ONLY_ACCOUNT_KEY_PREFIXES)
const DISK_KEY = PROFILE_CARD_PUBLIC_DISK_KEY;
const DISK_MAX = 64;
const DISK_SAVE_DEBOUNCE_MS = 2000;
const staleCards = new Map<string, PublicProfileCard>();
let diskLoad: Promise<void> | null = null;
let diskSaveTimer: ReturnType<typeof setTimeout> | null = null;
// Поколение копии: чистка аккаунта поднимает его, и всё, что стартовало ДО чистки (чтение сети, загрузка с диска, отложенная запись), результат уже не применяет.
let cacheEpoch = 0;

export function normalizePublicProfileCard(data: Record<string, unknown> | null | undefined): PublicProfileCard {
  if (!data) return EMPTY_CARD;
  const pro = data.profileCardPro === true;
  const style = pro && isProfileCardProStyle(data.profileCardStyle) ? data.profileCardStyle : null;
  const rawBio = typeof data.profileCardBio === 'string' ? data.profileCardBio : '';
  // Сервер уже проверил текст; здесь лишь страховка от старых/чужих записей.
  const bio = pro ? Array.from(rawBio.replace(/\s+/g, ' ').trim()).slice(0, PROFILE_CARD_BIO_MAX_CHARS).join('') : '';
  return Object.freeze({ pro, style, bio });
}

export function peekPublicProfileCard(uid: string): PublicProfileCard | null {
  const entry = cache.get(uid);
  if (!entry || Date.now() - entry.fetchedAt >= PUBLIC_CARD_TTL_MS) return null;
  return entry.card;
}

/** Синхронно: свежая копия, а если её нет — последняя известная (в т.ч. с диска). Только для первого кадра; освежение — fetchPublicProfileCard. */
export function peekPublicProfileCardOrStale(uid: string): PublicProfileCard | null {
  const fresh = peekPublicProfileCard(uid);
  if (fresh) return fresh;
  const stale = cache.get(uid)?.card ?? staleCards.get(uid) ?? null;
  if (stale) DebugLogger.info(LOG, `чужая визитка: первый кадр из устаревшей копии ${JSON.stringify({ uid, pro: stale.pro, style: stale.style, source: cache.has(uid) ? 'память' : 'диск' })}`);
  return stale;
}

function persistSoon(): void {
  if (diskSaveTimer) return;
  const epoch = cacheEpoch;
  diskSaveTimer = setTimeout(() => {
    diskSaveTimer = null;
    if (epoch !== cacheEpoch) {
      DebugLogger.info(LOG, 'чужая визитка: отложенная запись на диск отменена — аккаунт сменился');
      return;
    }
    const items: Record<string, PublicProfileCard> = {};
    const known = new Map<string, PublicProfileCard>(staleCards);
    cache.forEach((entry, uid) => known.set(uid, entry.card));
    [...known.entries()].slice(-DISK_MAX).forEach(([uid, card]) => { items[uid] = card; });
    AsyncStorage.setItem(DISK_KEY, JSON.stringify({ v: 1, items })).catch((error: unknown) => {
      DebugLogger.warn(LOG, `чужая визитка: копия на диск не записалась (${error instanceof Error ? error.message : String(error)})`);
    });
  }, DISK_SAVE_DEBOUNCE_MS);
}

/** Один раз за запуск, после анимаций: читает дисковую копию визиток в память (не блокирует первый кадр). Повторные вызовы возвращают тот же промис. */
export function loadPublicProfileCardDisk(): Promise<void> {
  if (diskLoad) return diskLoad;
  const epoch = cacheEpoch;
  diskLoad = new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      const startedAt = Date.now();
      AsyncStorage.getItem(DISK_KEY).then((raw) => {
        if (epoch !== cacheEpoch) {
          DebugLogger.info(LOG, 'чужая визитка: загрузка с диска отброшена — аккаунт сменился');
          return;
        }
        if (!raw) {
          DebugLogger.info(LOG, 'чужая визитка: дисковой копии ещё нет');
          return;
        }
        const parsed = JSON.parse(raw) as { v?: unknown; items?: Record<string, Record<string, unknown>> };
        if (parsed.v !== 1 || !parsed.items || typeof parsed.items !== 'object') {
          DebugLogger.warn(LOG, 'чужая визитка: дисковая копия чужой схемы — игнорируем');
          return;
        }
        let loaded = 0;
        for (const [uid, data] of Object.entries(parsed.items)) {
          // normalizePublicProfileCard принимает поля public_profiles; копия хранит уже нормализованный вид {pro, style, bio}
          const card = normalizePublicProfileCard({ profileCardPro: data.pro, profileCardStyle: data.style, profileCardBio: data.bio });
          if (!staleCards.has(uid)) { staleCards.set(uid, card); loaded += 1; }
        }
        DebugLogger.info(LOG, `чужая визитка: с диска загружено ${loaded} копий за ${Date.now() - startedAt}мс`);
      }).catch((error: unknown) => {
        DebugLogger.warn(LOG, `чужая визитка: дисковая копия не прочиталась (${error instanceof Error ? error.message : String(error)})`);
      }).finally(resolve);
    });
  });
  return diskLoad;
}

/**
 * Стереть все копии визиток друзей (память и диск) при выходе, смене и удалении аккаунта (cloud_sync.wipeLocalAccountData).
 * зачем (координатор 13.10): после смены аккаунта на телефоне не должно остаться визиток друзей прошлого аккаунта. Никогда не бросает — общую чистку не ломает.
 */
export async function clearPublicProfileCardCache(reason: string): Promise<void> {
  const before = { memory: cache.size, stale: staleCards.size, timer: diskSaveTimer !== null };
  cacheEpoch += 1;
  cache.clear();
  inFlight.clear();
  staleCards.clear();
  diskLoad = null;
  if (diskSaveTimer) { clearTimeout(diskSaveTimer); diskSaveTimer = null; }
  try {
    await AsyncStorage.removeItem(DISK_KEY);
    DebugLogger.info(LOG, `чужая визитка: копии стёрты (${reason}) ${JSON.stringify(before)}`);
  } catch (error) {
    DebugLogger.warn(LOG, `чужая визитка: диск не очистился (${reason}): ${error instanceof Error ? error.message : String(error)}`);
  }
}

function remember(uid: string, card: PublicProfileCard): void {
  cache.delete(uid);
  cache.set(uid, { card, fetchedAt: Date.now() });
  staleCards.set(uid, card);
  persistSoon();
  while (cache.size > PUBLIC_CARD_CACHE_MAX) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    cache.delete(oldest); // guard-ok: Map в памяти, не Firestore
  }
}

/** Визитка другого игрока. Никогда не бросает: сбой → обычная визитка без текста + лог. */
export function fetchPublicProfileCard(uid: string): Promise<PublicProfileCard> {
  const id = uid.trim();
  if (!id) {
    DebugLogger.info(LOG, 'чужая визитка: пустой uid — показываем обычную');
    return Promise.resolve(EMPTY_CARD);
  }
  const cached = peekPublicProfileCard(id);
  if (cached) return Promise.resolve(cached);
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    DebugLogger.info(LOG, `чужая визитка: облако выключено ${JSON.stringify({ uid: id, IS_EXPO_GO, CLOUD_SYNC_ENABLED })}`);
    return Promise.resolve(staleCards.get(id) ?? EMPTY_CARD);
  }
  const pending = inFlight.get(id);
  if (pending) return pending;
  const startedAt = Date.now();
  const epochAtStart = cacheEpoch;
  const run = (async () => {
    try {
      const snap = await firestore().collection('public_profiles').doc(id).get(); // guard-ok: один документ по id
      const data = snap.exists ? (snap.data() as Record<string, unknown> | undefined) ?? null : null;
      const card = normalizePublicProfileCard(data);
      DebugLogger.info(LOG, `чужая визитка: прочитана ${JSON.stringify({
        uid: id, exists: snap.exists, pro: card.pro, style: card.style, bioLength: card.bio.length, ms: Date.now() - startedAt,
      })}`);
      if (epochAtStart !== cacheEpoch) {
        DebugLogger.info(LOG, `чужая визитка: ответ ${id} пришёл после смены аккаунта — в копию не кладём`);
        return card;
      }
      remember(id, card);
      return card;
    } catch (error) {
      // зачем: сбой чтения не должен перекрасить Pro-друга в «обычного», если мы уже знали его визитку (память или диск)
      const known = cache.get(id)?.card ?? staleCards.get(id) ?? null;
      DebugLogger.warn(LOG, `чужая визитка: чтение упало — показываем ${known ? 'последнюю известную' : 'обычную'} ${JSON.stringify({ uid: id, error: String(error) })}`);
      return known ?? EMPTY_CARD;
    } finally {
      inFlight.delete(id);
    }
  })();
  inFlight.set(id, run);
  return run;
}

// ── Свой текст ──────────────────────────────────────────────────────────────

export type ProfileCardBioSaveFailure =
  | 'pro_required'
  | 'too_long'
  | 'line_break'
  | 'control_char'
  | 'profanity'
  | 'rate_limited'
  | 'offline'
  | 'failed';

export type ProfileCardBioSaveResult =
  | Readonly<{ ok: true; text: string }>
  | Readonly<{ ok: false; reason: ProfileCardBioSaveFailure; retryAfterMs?: number }>;

const LINE_BREAK_RE = /[\r\n]/;

/** Быстрая проверка до сети — те же правила, что на сервере (сервер всё равно решает). */
export function precheckProfileCardBio(text: string): ProfileCardBioSaveFailure | null {
  if (LINE_BREAK_RE.test(text)) return 'line_break';
  if (Array.from(text.trim()).length > PROFILE_CARD_BIO_MAX_CHARS) return 'too_long';
  return null;
}

function reasonFromError(error: unknown): { reason: ProfileCardBioSaveFailure; retryAfterMs?: number } {
  const e = error as { code?: unknown; message?: unknown; details?: unknown } | null;
  const details = (e?.details && typeof e.details === 'object') ? e.details as Record<string, unknown> : {};
  const raw = String(details.reason ?? e?.message ?? '');
  const known: readonly ProfileCardBioSaveFailure[] = [
    'pro_required', 'too_long', 'line_break', 'control_char', 'profanity', 'rate_limited',
  ];
  const hit = known.find((reason) => raw.includes(reason));
  if (hit) {
    const retry = Number(details.retryAfterMs);
    return Number.isFinite(retry) && retry > 0 ? { reason: hit, retryAfterMs: retry } : { reason: hit };
  }
  const code = String(e?.code ?? '');
  if (code.includes('unavailable') || code.includes('deadline') || code === 'callable_timeout') return { reason: 'offline' };
  return { reason: 'failed' };
}

export async function saveMyProfileCardBio(
  input: Readonly<{ stableId: string; text: string }>,
): Promise<ProfileCardBioSaveResult> {
  const startedAt = Date.now();
  DebugLogger.info(LOG, `свой текст: отправка ${JSON.stringify({ stableId: input.stableId, length: input.text.length })}`);
  const pre = precheckProfileCardBio(input.text);
  if (pre) {
    DebugLogger.info(LOG, `свой текст: отказ до сети ${JSON.stringify({ reason: pre })}`);
    return { ok: false, reason: pre };
  }
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    DebugLogger.info(LOG, `свой текст: облако выключено ${JSON.stringify({ IS_EXPO_GO, CLOUD_SYNC_ENABLED })}`);
    return { ok: false, reason: 'offline' };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    const fn = httpsCallable(getFunctions(getApp(), REGION), 'profileCardBioSetMine') as (
      data: { stableId: string; text: string },
    ) => Promise<{ data: { ok?: boolean; status?: string; text?: unknown } }>;
    const res = await withCallableTimeout(fn({ stableId: input.stableId, text: input.text }), 'profileCardBioSetMine');
    const text = typeof res.data?.text === 'string' ? res.data.text : input.text.trim();
    DebugLogger.info(LOG, `свой текст: сервер принял ${JSON.stringify({ status: res.data?.status ?? null, length: text.length, ms: Date.now() - startedAt })}`);
    return { ok: true, text };
  } catch (error) {
    const mapped = reasonFromError(error);
    DebugLogger.warn(LOG, `свой текст: сервер отказал ${JSON.stringify({
      ...mapped, code: (error as { code?: unknown })?.code ?? null, message: String((error as { message?: unknown })?.message ?? error), ms: Date.now() - startedAt,
    })}`);
    return { ok: false, ...mapped };
  }
}

export const __profileCardPublicTestHooks = {
  reset: (): void => {
    cache.clear(); inFlight.clear(); staleCards.clear(); diskLoad = null;
    if (diskSaveTimer) { clearTimeout(diskSaveTimer); diskSaveTimer = null; }
  },
  staleCards,
  remember,
};

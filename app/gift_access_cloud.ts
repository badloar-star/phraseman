/**
 * Серверная сторона 72-часовых подарков (intro / loyalty).
 *
 * Контекст: подарки (intro_full_access, loyalty_gift) хранились ТОЛЬКО в
 * AsyncStorage. Из-за этого:
 *   1) переустановка приложения сбрасывала AsyncStorage и пользователь получал
 *      подарок повторно («бесконечный intro 72ч на каждой переустановке»),
 *   2) серверные ИИ-функции не знали о подарке (читают только Firestore) и
 *      отказывали платным фичам — подаренный премиум был «декоративным».
 *
 * Этот модуль:
 *   - `claimIntroFullAccessOnCloud` requests the authenticated server grant,
 *   - `readGiftAccessFromCloud` читает их обратно для cloud-guard (защита от
 *     повторной выдачи после переустановки),
 *   - всё в одном файле, чтобы intro/loyalty не дублировали Firestore-логику.
 *
 * Серверный `functions/src/premium_status.ts:isGiftAccessActive` дополняет
 * `isPremiumAccessActive` чтением тех же полей — таким образом подаренный
 * премиум открывает ИИ-функции на сервере.
 */
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getCanonicalUserId } from './user_id_policy';
import { DebugLogger } from './debug-logger';
import { withCallableTimeout } from './callable_timeout';
import { rnfbInstance } from './rnfb_modular';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const FUNCTIONS_REGION = 'us-central1';

export type GiftKind = 'intro' | 'loyalty';

interface GiftFieldNames {
  untilKey: 'intro_access_until_ms' | 'loyalty_gift_until_ms';
  grantedAtKey: 'intro_access_granted_at_ms' | 'loyalty_gift_granted_at_ms';
}

function fieldNames(kind: GiftKind): GiftFieldNames {
  return kind === 'intro'
    ? { untilKey: 'intro_access_until_ms', grantedAtKey: 'intro_access_granted_at_ms' }
    : { untilKey: 'loyalty_gift_until_ms', grantedAtKey: 'loyalty_gift_granted_at_ms' };
}

export interface GiftAccessCloudState {
  /** Когда подарок был выдан (ms epoch). Если есть — подарок УЖЕ выдавался когда-то. */
  grantedAtMs: number | null;
  /** До какого момента подарок активен (ms epoch). Если > now — подарок ещё открыт. */
  endsAtMs: number | null;
}

export interface IntroFullAccessClaimResult {
  grantedAtMs: number;
  endsAtMs: number;
  alreadyGranted: boolean;
}

function lazyFirestore(): unknown {
  try {
    // Динамический require: на dev/Expo-Go модуль может отсутствовать.
    // зачем (координатор §67): модульный getFirestore() вместо .default() — старый путь
    // писал предупреждение «use getApp()» на КАЖДЫЙ вызов (гистограмма dev-старта).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return rnfbInstance(require('@react-native-firebase/firestore'), 'getFirestore');
  } catch {
    return null;
  }
}

function parsePositiveNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function parseClaimTimestamp(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Claims or replays the canonical account's server-authoritative intro grant. */
export async function claimIntroFullAccessOnCloud(): Promise<IntroFullAccessClaimResult> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    throw new Error('intro_full_access_cloud_unavailable');
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  const callable = httpsCallable(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'introFullAccessClaim',
  ) as (data: Record<string, never>) => Promise<{ data?: unknown }>;
  const response = await withCallableTimeout(callable({}), 'introFullAccessClaim');
  const data = response?.data && typeof response.data === 'object'
    ? response.data as Record<string, unknown>
    : {};
  const grantedAtMs = parseClaimTimestamp(data.grantedAtMs);
  const endsAtMs = parseClaimTimestamp(data.endsAtMs);
  if (
    grantedAtMs === null
    || endsAtMs === null
    || endsAtMs - grantedAtMs !== 72 * 60 * 60 * 1000
    || typeof data.alreadyGranted !== 'boolean'
  ) {
    throw new Error('intro_full_access_claim_invalid');
  }
  // Подарок только что выдан/подтверждён сервером — кэш чтения больше не правда.
  invalidateGiftAccessCache('intro_claim');
  return { grantedAtMs, endsAtMs, alreadyGranted: data.alreadyGranted };
}

// зачем (координатор §70, трасса [GIFT-ACCESS-READ] 2026-10-02): на одном холодном старте
// весь документ users/{uid} читался ~5 раз — три одновременных проверки доступа (кэш доступа
// пустой, пока сеть не ответила) и ещё по одной после каждого сброса кэша Premium сигналами
// гидратации. Подарок меняется редко, поэтому: одно чтение на вход + слияние одновременных
// запросов. Ошибку не кэшируем (следующий вызов повторит), смена аккаунта = другой uid =
// промах кэша. Срок 30 мин — чтобы выдача подарка из админки посреди сессии дошла без перезапуска.
const GIFT_ACCESS_CACHE_TTL_MS = 30 * 60 * 1000;

type GiftProgressSnapshot = Readonly<{ uid: string; progress: Record<string, unknown>; readAtMs: number }>;

let giftProgressCache: GiftProgressSnapshot | null = null;
let giftProgressInflight: { uid: string; promise: Promise<Record<string, unknown>> } | null = null;

/** Сбросить кэш подарков (после выдачи/смены аккаунта). Следующее чтение пойдёт в сеть. */
export function invalidateGiftAccessCache(reason: string): void {
  if (giftProgressCache || giftProgressInflight) {
    console.log(`[GIFT-ACCESS-READ] cache invalidated reason=${reason}`);
  }
  giftProgressCache = null;
  giftProgressInflight = null;
}

/**
 * Засеять кэш подарков из документа `users/{uid}`, который уже прочитало восстановление из облака.
 *
 * зачем (владелец 11.10, журнал 16; план §CORE-0165): восстановление читает тот же документ на старте — второе
 * чтение ради подарка было лишним и медленным (до 4,2 с на холодном соединении). Заодно сохраняем проверенную
 * локальную копию срока лояльности: со следующего запуска доступ виден с первого кадра.
 * Не перетираем свежее сетевое чтение, которое уже идёт для этого же аккаунта.
 */
export function seedGiftAccessCacheFromProgress(uid: string, progress: unknown): void {
  if (!uid || !progress || typeof progress !== 'object') {
    console.log(`[GIFT-ACCESS-READ] seed skip hasUid=${!!uid} hasProgress=${!!progress}`);
    return;
  }
  const record = progress as Record<string, unknown>;
  // зачем (ревью Opus): при идущем сетевом чтении кэш не перетираем, но копию срока пишем всегда — иначе
  // восстановление, начатое после потолка, не сохранило бы подарок до своего завершения.
  if (giftProgressInflight && giftProgressInflight.uid === uid) {
    console.log('[GIFT-ACCESS-READ] seed: сетевое чтение уже идёт — кэш не трогаем, копию срока пишем');
  } else {
    giftProgressCache = { uid, progress: record, readAtMs: Date.now() };
  }
  const loyaltyUntil = parsePositiveNumber(record.loyalty_gift_until_ms);
  console.log(`[GIFT-ACCESS-READ] seed from restore users/${uid.slice(0, 6)} loyaltyActive=${loyaltyUntil !== null && loyaltyUntil > Date.now()}`);
  if (loyaltyUntil !== null && loyaltyUntil > Date.now()) {
    void import('./gift_access_local_copy')
      .then((m) => m.rememberVerifiedLoyaltyGift(uid, loyaltyUntil))
      .catch(noteSwallowedAs('gift_access_cloud:seed_remember', undefined));
  }
}

function readGiftProgressFromNetwork(db: unknown, uid: string): Promise<Record<string, unknown>> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { doc, getDoc } = require('@react-native-firebase/firestore') as {
    doc: (parent: unknown, path: string, ...segments: string[]) => unknown;
    getDoc: (ref: unknown) => Promise<{ data?: () => unknown }>;
  };
  const startedAt = Date.now();
  const promise = getDoc(doc(db, 'users', uid)).then((snap) => {
    const data = (snap?.data?.() ?? {}) as { progress?: Record<string, unknown> };
    const progress = data.progress ?? {};
    // Поздний ответ после смены аккаунта не должен лечь в кэш нового.
    if (giftProgressInflight?.promise === promise) {
      giftProgressCache = { uid, progress, readAtMs: Date.now() };
    }
    console.log(`[GIFT-ACCESS-READ] network users/${uid.slice(0, 6)} ms=${Date.now() - startedAt}`);
    return progress;
  }).finally(() => {
    if (giftProgressInflight?.promise === promise) giftProgressInflight = null;
  });
  giftProgressInflight = { uid, promise };
  return promise;
}

/**
 * Прочитать состояние подарка из облака. Используется в start*-функциях:
 *   - если grantedAtMs уже есть в облаке → подарок выдавался ранее, повторно
 *     не выдаём; восстанавливаем endsAt в локальный AsyncStorage (если подарок
 *     ещё не истёк) — пользователь продолжит пользоваться оставшимся временем.
 *   - если read упал/offline → возвращаем null; новая intro-выдача всё равно
 *     требует успешный ответ callable и не создаётся локально.
 * Один документ отвечает за оба вида подарка — кэш общий для 'intro' и 'loyalty'.
 */
export async function readGiftAccessFromCloud(kind: GiftKind): Promise<GiftAccessCloudState | null> {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
    const uid = await getCanonicalUserId().catch(noteSwallowedAs('gift_access_cloud:promise_1', null));
    if (!uid) {
      console.log(`[GIFT-ACCESS-READ] exit no_uid kind=${kind}`);
      return null;
    }
    let progress: Record<string, unknown>;
    const cached = giftProgressCache;
    if (cached && cached.uid === uid && Date.now() - cached.readAtMs < GIFT_ACCESS_CACHE_TTL_MS) {
      progress = cached.progress;
    } else if (giftProgressInflight && giftProgressInflight.uid === uid) {
      progress = await giftProgressInflight.promise;
    } else {
      const db = lazyFirestore();
      if (!db) {
        console.log(`[GIFT-ACCESS-READ] exit no_firestore kind=${kind}`);
        return null;
      }
      progress = await readGiftProgressFromNetwork(db, uid);
    }
    const { untilKey, grantedAtKey } = fieldNames(kind);
    return {
      grantedAtMs: parsePositiveNumber(progress[grantedAtKey]),
      endsAtMs: parsePositiveNumber(progress[untilKey]),
    };
  } catch (e) {
    console.log(`[GIFT-ACCESS-READ] catch kind=${kind} reason=${String((e as Error)?.message ?? e)}`);
    DebugLogger.error('gift_access_cloud:read', e, 'warning');
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

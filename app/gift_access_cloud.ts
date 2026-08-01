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
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withCallableTimeout } from './callable_timeout';

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
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

  await initFirebaseAppCheckIfAvailable().catch(() => false);
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
  return { grantedAtMs, endsAtMs, alreadyGranted: data.alreadyGranted };
}

/**
 * Прочитать состояние подарка из облака. Используется в start*-функциях:
 *   - если grantedAtMs уже есть в облаке → подарок выдавался ранее, повторно
 *     не выдаём; восстанавливаем endsAt в локальный AsyncStorage (если подарок
 *     ещё не истёк) — пользователь продолжит пользоваться оставшимся временем.
 *   - если read упал/offline → возвращаем null; новая intro-выдача всё равно
 *     требует успешный ответ callable и не создаётся локально.
 */
export async function readGiftAccessFromCloud(kind: GiftKind): Promise<GiftAccessCloudState | null> {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
    const uid = await getCanonicalUserId().catch(() => null);
    if (!uid) return null;
    const db = lazyFirestore() as { collection: (n: string) => { doc: (id: string) => { get: () => Promise<{ data?: () => unknown }> } } } | null;
    if (!db) return null;
    const snap = await db.collection('users').doc(uid).get();
    const data = (snap?.data?.() ?? {}) as { progress?: Record<string, unknown> };
    const progress = data.progress ?? {};
    const { untilKey, grantedAtKey } = fieldNames(kind);
    return {
      grantedAtMs: parsePositiveNumber(progress[grantedAtKey]),
      endsAtMs: parsePositiveNumber(progress[untilKey]),
    };
  } catch (e) {
    DebugLogger.error('gift_access_cloud:read', e, 'warning');
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

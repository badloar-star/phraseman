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
 *   - `persistGiftAccessOnCloud` пишет `*_until_ms` и `*_granted_at_ms` в
 *     `users/{uid}.progress` (best-effort, без блокировки UI),
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

/**
 * Best-effort запись метки подарка в облако. Не блокирует UI — promise можно
 * не awaitить. Ошибки сети/прав молча проглатываются (локальный AsyncStorage
 * уже отметил подарок и так).
 */
export async function persistGiftAccessOnCloud(
  kind: GiftKind,
  grantedAtMs: number,
  endsAtMs: number,
): Promise<void> {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const uid = await getCanonicalUserId().catch(() => null);
    if (!uid) return;
    const db = lazyFirestore() as { collection: (n: string) => { doc: (id: string) => { set: (data: object, opts?: object) => Promise<void> } } } | null;
    if (!db) return;
    const { untilKey, grantedAtKey } = fieldNames(kind);
    await db.collection('users').doc(uid).set({
      progress: {
        [untilKey]: String(endsAtMs),
        [grantedAtKey]: String(grantedAtMs),
      },
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (e) {
    DebugLogger.error('gift_access_cloud:persist', e, 'warning');
  }
}

/**
 * Прочитать состояние подарка из облака. Используется в start*-функциях:
 *   - если grantedAtMs уже есть в облаке → подарок выдавался ранее, повторно
 *     не выдаём; восстанавливаем endsAt в локальный AsyncStorage (если подарок
 *     ещё не истёк) — пользователь продолжит пользоваться оставшимся временем.
 *   - если read упал/offline → возвращаем null-state, дальше идёт локальный путь.
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

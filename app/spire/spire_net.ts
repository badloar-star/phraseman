// ═══════════════════════════════════════════════════════════════════════════
// spire_net.ts — общие сетевые помощники игровой части Шпиля (только за воротами).
//
// зачем: три клиента (комната, пакет, итог недели) ходят в Firebase одинаково —
// ленивый импорт модулей Firebase (Expo Go / выключенный облачный sync остаются
// тихими, как в spire_config_client.ts) и одна классификация ошибок, чтобы
// экран различал «нет сети» (плашка, чужие цифры приглушены) и «сервер отказал».
// Каждая функция требует SpireLiveGate — без открытых ворот сюда не попасть.
// ═══════════════════════════════════════════════════════════════════════════
import { spireClassifyFlushError, type SpireFlushFailureKind } from '../../modules/spire/report_queue';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { DebugLogger } from '../debug-logger';
import { spireGateStillOpen, type SpireLiveGate } from './spire_live_gate';

const FUNCTIONS_REGION = 'us-central1';
const LOG = '[SPIRE]';

export type SpireNetFailure = SpireFlushFailureKind | 'paused' | 'cloud_off' | 'gate_closed';

/** Облако в принципе доступно (не Expo Go и sync включён). */
export function spireCloudAvailable(): boolean {
  return !IS_EXPO_GO && CLOUD_SYNC_ENABLED;
}

/**
 * Отказы миграции лиги из брифа (league_finalization_pending, spire_migration_paused)
 * — это «подождите», а не ошибка: экран показывает «Шпиль откроется чуть позже»
 * без красного текста и тихо повторит при следующем заходе.
 */
export function spireClassifyNetError(error: unknown): SpireNetFailure {
  const message = String((error as { message?: unknown } | null)?.message ?? error ?? '');
  if (/league_finalization_pending|spire_migration_paused/u.test(message)) return 'paused';
  // зачем (аудит «пропала сеть», 13.10, п.6): потолок вызова истёк — для человека это «нет сети»: кэш недели и понятное сообщение.
  const code = String((error as { code?: unknown } | null)?.code ?? '').replace(/^functions\//u, '');
  if (code === 'deadline-exceeded' || /deadline[-_ ]exceeded/iu.test(message)) return 'offline';
  return spireClassifyFlushError(error);
}

export function spireErrorText(error: unknown): string {
  const code = String((error as { code?: unknown } | null)?.code ?? '');
  const message = error instanceof Error ? error.message : String(error);
  return code ? `${code}: ${message}` : message;
}

/** Потолок одного callable Шпиля на телефоне (сервер — 15 с). */
export const SPIRE_CALLABLE_TIMEOUT_MS = 18_000;

/** Один callable. Бросает — вызывающий классифицирует через spireClassifyNetError. */
export async function spireCall<TReq extends Readonly<Record<string, unknown>>, TRes>(
  gate: SpireLiveGate,
  name: string,
  payload: TReq,
): Promise<TRes> {
  if (!spireGateStillOpen(gate, `call:${name}`)) throw new Error('spire_gate_closed');
  const { getApp } = await import('@react-native-firebase/app');
  const { getFunctions, httpsCallable } = await import('@react-native-firebase/functions');
  // зачем (аудит «пропала сеть», 13.10, п.6): без потолка вход в комнату ждал нативные ~60–70 с, и тап «Подняться» без кэша висел.
  // Сервер (HOT_CALLABLE_OPTIONS) работает до 15 с — ждём 18 с, дальше deadline-exceeded → 'offline' (spireClassifyNetError).
  const fn = httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name, { timeout: SPIRE_CALLABLE_TIMEOUT_MS });
  const startedAt = Date.now();
  try {
    const res = await fn(payload);
    DebugLogger.info(LOG, `call ${name}: ok за ${Date.now() - startedAt}мс`);
    return res.data;
  } catch (error) {
    DebugLogger.warn(LOG, `call ${name}: сбой за ${Date.now() - startedAt}мс (${spireErrorText(error)}) потолок=${SPIRE_CALLABLE_TIMEOUT_MS}мс`);
    throw error;
  }
}

/** Firestore или null (Expo Go / облако выключено / модуль не поднялся). */
export function spireFirestore(gate: SpireLiveGate, where: string): unknown | null {
  if (!spireGateStillOpen(gate, where)) return null;
  if (!spireCloudAvailable()) {
    DebugLogger.info(LOG, `${where}: облако выключено (expoGo=${IS_EXPO_GO} cloudSync=${CLOUD_SYNC_ENABLED})`);
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch (error) {
    DebugLogger.warn(LOG, `${where}: модуль firestore не поднялся (${spireErrorText(error)})`);
    return null;
  }
}

/** Потолок получения ID-токена (аудит «пропала сеть», 13.10): обновление токена на плохой сети не ограничено таймером пакета. */
export const SPIRE_ID_TOKEN_TIMEOUT_MS = 8_000;

/** ID-токен вошедшего (для скачивания пакета из Storage) или null с причиной в логе. */
export async function spireIdToken(gate: SpireLiveGate, where: string): Promise<string | null> {
  if (!spireGateStillOpen(gate, where) || !spireCloudAvailable()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('@react-native-firebase/auth').default;
    const user = auth()?.currentUser;
    if (!user) {
      DebugLogger.info(LOG, `${where}: нет вошедшего пользователя — токена нет`);
      return null;
    }
    // зачем (аудит «пропала сеть», Авторизация 13.10): getIdToken() вызывался ДО 20-секундного таймера пакета и сам потолка не имел —
    // «Готовим ступень…» на плохой сети тянулось дольше 20 с. По потолку — null с причиной (тот же путь, что «токена нет»).
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timedOut = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), SPIRE_ID_TOKEN_TIMEOUT_MS); });
    const token: unknown = await Promise.race([user.getIdToken(), timedOut]).finally(() => { if (timer) clearTimeout(timer); });
    if (token === 'timeout') {
      DebugLogger.warn(LOG, `${where}: токен не получен за ${SPIRE_ID_TOKEN_TIMEOUT_MS} мс — считаю «нет сети» (ждали ${Date.now() - startedAt} мс)`);
      return null;
    }
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch (error) {
    DebugLogger.warn(LOG, `${where}: токен не получен (${spireErrorText(error)})`);
    return null;
  }
}

/** Бакет Storage из настроек приложения или null (без выдуманных значений по умолчанию). */
export function spireStorageBucket(where: string): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    const bucket: unknown = getApp()?.options?.storageBucket;
    if (typeof bucket === 'string' && bucket.length > 0) return bucket;
    DebugLogger.warn(LOG, `${where}: в настройках Firebase нет storageBucket`);
    return null;
  } catch (error) {
    DebugLogger.warn(LOG, `${where}: настройки Firebase не прочитались (${spireErrorText(error)})`);
    return null;
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }

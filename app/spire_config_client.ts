// ═══════════════════════════════════════════════════════════════════════════
// spire_config_client.ts — читает config/spire_v1 (таймер/монеты/боты Шпиля,
// PM-283) с кэшем на AsyncStorage и TTL 6 часов, тем же принципом, что
// club_screen.tsx (CLUB_REMOTE_REFRESH_MS): чужие/редко меняемые цифры редки,
// свой прогресс живой и локальный (modules/spire/step_machine.ts). Читает
// конфиг ТОЛЬКО при заходе на экран Шпиля, не на каждый тик/ответ — движок
// ступени получает бюджет таймера один раз при старте плана, повторно
// конфиг не запрашивает.
//
// зачем (СПЕРВА ЛОГИ): единый префикс [SPIRE-CONFIG] на весь путь — вход,
// откуда взято значение (кэш/сеть), причина отказа при раннем выходе.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';
import {
  SPIRE_CONFIG_DEFAULTS,
  spireConfigStatus,
  type SpireConfigDoc,
} from '../modules/spire/config_contract';

const SPIRE_CONFIG_COLLECTION = 'config';
const SPIRE_CONFIG_DOC = 'spire_v1';
const SPIRE_CONFIG_CACHE_KEY = 'spire_config_cache_v1';
/** Тот же принцип, что club_screen.tsx: редко меняемые цифры — раз в 6 ч. */
const SPIRE_CONFIG_REFRESH_MS = 6 * 60 * 60 * 1000;

type CachedSpireConfig = Readonly<{ fetchedAtMs: number; config: SpireConfigDoc }>;

// зачем (аудит Optimistic UI Шпиля, координатор 13.10): вход на экран Шпиля рисовал пустой `spire-loading`, пока AsyncStorage отдавал конфиг. Последний настоящий
// конфиг (кэш или сеть, но не дефолт «выключен» при сбое) держим в памяти процесса — повторный заход рисует Шпиль в первом же кадре, а loadSpireConfig освежает фоном.
let configMemory: SpireConfigDoc | null = null;

/** Синхронно: последний настоящий конфиг Шпиля в этом процессе или null (первый заход — читаем кэш как раньше). */
export function peekSpireConfig(): SpireConfigDoc | null {
  return configMemory;
}

// Ленивый импорт держит Expo Go / выключенный облачный sync тихими —
// Тот же приём, что в прежнем сетевом клиенте лиг.
function getFirestore(): unknown | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch (error: unknown) {
    console.warn('[SPIRE-CONFIG] firestore недоступен —', error instanceof Error ? error.message : String(error)); // зачем: молчаливый null выглядел как «Шпиль выключен»
    return null;
  }
}

async function readCache(): Promise<CachedSpireConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(SPIRE_CONFIG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedSpireConfig>;
    if (typeof parsed.fetchedAtMs !== 'number' || !parsed.config) return null;
    return parsed as CachedSpireConfig;
  } catch (error) {
    // зачем: битый кэш не должен ронять экран Шпиля — честно логируем и едем дальше на дефолтах.
    DebugLogger.warn('[SPIRE-CONFIG]', `readCache: битый JSON, игнорируем (${String(error)})`);
    return null;
  }
}

async function writeCache(config: SpireConfigDoc): Promise<void> {
  try {
    const payload: CachedSpireConfig = { fetchedAtMs: Date.now(), config };
    await AsyncStorage.setItem(SPIRE_CONFIG_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    // зачем: неудачная запись кэша не должна прервать показ уже полученного конфига.
    DebugLogger.warn('[SPIRE-CONFIG]', `writeCache: не сохранилось, продолжаем без кэша (${String(error)})`);
  }
}

/**
 * Сбросить кэш конфига Шпиля — следующий loadSpireConfig пойдёт в сеть.
 * зачем (координатор 11.10): флаг вкладки сменился на сервере → старый «выключен» в кэше 6 ч держал бы заглушку.
 */
export async function invalidateSpireConfigCache(reason: string): Promise<void> {
  try {
    configMemory = null; // зачем: флаг сменился на сервере — память с прежним «выключен/включён» первым кадром не показываем
    await AsyncStorage.removeItem(SPIRE_CONFIG_CACHE_KEY);
    DebugLogger.info('[SPIRE-CONFIG]', `кэш конфига сброшен (${reason})`);
  } catch (error) {
    DebugLogger.warn('[SPIRE-CONFIG]', `кэш конфига не сбросился (${reason}): ${String(error)}`);
  }
}

/**
 * Отдаёт конфиг Шпиля для текущего экрана: из свежего кэша, иначе сеть
 * (и обновляет кэш), иначе честный дефолт (SPIRE_CONFIG_DEFAULTS — та же
 * функция сборки, что использует сервер, поэтому дефолт совместим по форме).
 *
 * force=true — только явный жест пользователя (pull-to-refresh на экране
 * Шпиля), как forceRemote в club_screen.tsx; обычный проход экрана его не
 * передаёт, иначе TTL 6 ч теряет смысл.
 */
export async function loadSpireConfig(options: { force?: boolean } = {}): Promise<SpireConfigDoc> {
  const cached = await readCache();
  const cacheFresh = cached !== null && (Date.now() - cached.fetchedAtMs) < SPIRE_CONFIG_REFRESH_MS;
  if (cacheFresh && !options.force) {
    DebugLogger.info('[SPIRE-CONFIG]', `loadSpireConfig: из кэша (возраст=${Date.now() - cached!.fetchedAtMs}мс)`);
    configMemory = cached!.config;
    return cached!.config;
  }

  const db = getFirestore();
  if (!db) {
    // зачем: Expo Go / облако выключено — не сеть недоступна временно, а её здесь нет в принципе.
    DebugLogger.info('[SPIRE-CONFIG]', `loadSpireConfig: firestore недоступен (expoGo=${IS_EXPO_GO}, cloudSync=${CLOUD_SYNC_ENABLED}), отдаём ${cached ? 'старый кэш' : 'дефолт'}`);
    if (cached) configMemory = cached.config;
    return cached?.config ?? SPIRE_CONFIG_DEFAULTS;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = await (db as any).collection(SPIRE_CONFIG_COLLECTION).doc(SPIRE_CONFIG_DOC).get(); // guard-ok: один документ по фиксированному id, не листинг коллекции
    const status = spireConfigStatus(snap?.exists ? snap.data() : null);
    DebugLogger.info('[SPIRE-CONFIG]', `loadSpireConfig: сеть ok, exists=${status.exists} valid=${status.valid} liveForPlayers=${status.liveForPlayers}`);
    configMemory = status.config;
    await writeCache(status.config);
    return status.config;
  } catch (error) {
    // зачем: сетевой сбой не должен блокировать вход на экран Шпиля — отдаём
    // старый кэш (пусть протухший), иначе дефолт. Причина отказа — в логе,
    // не проглочена.
    DebugLogger.warn('[SPIRE-CONFIG]', `loadSpireConfig: сетевой сбой (${String(error)}), отдаём ${cached ? 'старый кэш' : 'дефолт'}`);
    if (cached) configMemory = cached.config;
    return cached?.config ?? SPIRE_CONFIG_DEFAULTS;
  }
}

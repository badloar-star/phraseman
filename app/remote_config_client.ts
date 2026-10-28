// ═══════════════════════════════════════════════════════════════════════════
// remote_config_client.ts — fetches admin-managed config from Firestore and
// feeds it into the remote_flags layer.
//
// Source of truth doc: remote_config/app  →  { numbers: {...}, bools: {...} }
// Admin writes it from admin/index.html (Remote Config tab); clients read it.
//
// Mirrors the proven app_messages pattern: lazy @react-native-firebase import,
// graceful no-op on web / Expo Go / cloud-sync-off, AsyncStorage cache so the
// last known config survives offline launches and applies before the network
// round-trips.
// ═══════════════════════════════════════════════════════════════════════════
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { emitAppEvent } from './events';
import { withBackgroundNetworkLease } from './interactive_network_quiet';
import { applyRemoteConfigSnapshot, getRemoteBool } from './remote_flags';

// зачем (координатор 12.10): по журналам нельзя было сказать, включён ли Account V2 на клиенте. Одна строка на источник
// (кэш / сеть) за процесс: значение и откуда оно.
const accountsV2FlagLogged = new Set<string>();
function logAccountsV2ClientFlag(source: 'cache' | 'network'): void {
  const value = getRemoteBool('accounts_v2_client_enabled') === true;
  const key = `${source}:${String(value)}`;
  if (accountsV2FlagLogged.has(key)) return;
  accountsV2FlagLogged.add(key);
  console.log(`[ACCOUNT-V2] client_flag accounts_v2_client_enabled=${String(value)} source=${source}`);
}

// зачем (координатор 12.10, решение владельца к R1 «продавать или раздавать»): какие замки сейчас открыты в проде —
// значения флагов «Пульта» как они пришли (кэш / сеть), одна строка на источник за процесс, только dev. Флага нет в
// документе — `default` (действует значение по умолчанию в коде), чтобы не путать с явным false.
export const REMOTE_GATES_LOGGED_KEYS: readonly (readonly [string, string])[] = [
  ['lessons', 'gate_lessons_premium'],
  ['flashcards', 'gate_flashcards_premium'],
  ['dialog', 'gate_ai_dialog_premium'],
  ['energy', 'gate_energy_premium'],
  ['speaking', 'gate_speaking_premium'],
  ['stats', 'gate_stats_premium'],
  ['themes', 'gate_themes_premium'],
  ['mistakes', 'gate_mistake_practice_premium'],
  ['extra_languages', 'gate_extra_languages_premium'],
  ['spire_tab', 'spire_tab_enabled'],
  ['accounts_v2_client', 'accounts_v2_client_enabled'],
  ['boot_restore_defer', 'boot_restore_defer_enabled'],
];

/** Строка значений флагов: `lessons=true flashcards=default …`. Чистая функция. */
export function formatRemoteGates(bools: Readonly<Record<string, unknown>> | undefined): string {
  return REMOTE_GATES_LOGGED_KEYS
    .map(([label, key]) => {
      const value = bools?.[key];
      return `${label}=${typeof value === 'boolean' ? String(value) : 'default'}`;
    })
    .join(' ');
}

const remoteGatesLogged = new Set<string>();
function logRemoteGates(source: 'cache' | 'network', bools: Readonly<Record<string, unknown>> | undefined): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  const line = formatRemoteGates(bools);
  const key = `${source}:${line}`;
  if (remoteGatesLogged.has(key)) return;
  remoteGatesLogged.add(key);
  console.log(`[REMOTE-GATES] ${line} source=${source}`);
}
import { DebugLogger, reportSwallowed } from './debug-logger';

const REMOTE_CONFIG_COLLECTION = 'remote_config';
const REMOTE_CONFIG_DOC = 'app';
const REMOTE_CONFIG_CACHE_KEY = 'remote_config_cache_v1';
// Когда кэш выше в последний раз подтверждён сетью (мс эпохи, строкой).
const REMOTE_CONFIG_FETCHED_AT_KEY = 'remote_config_fetched_at_v1';
// зачем: Firebase-экономия (PM-210, владелец). Раньше `remote_config/app` читался на
// КАЖДОМ запуске, хотя кэш применяется до сети. Свежий кэш (моложе 6 ч) — сеть
// пропускаем. Почему 6 ч: живого опроса нет (снят PM-212), поэтому открытое
// приложение и так видит «Пульт» только после перезапуска; TTL ограничивает лишь
// частые перезапуски. Худший случай для рубильников (`phone_state_emergency_stop`,
// `force_update_enabled` + `min_app_version`, `accounts_v2_client_enabled`): кто уже запускал приложение в последние 6 ч, получит
// их не позже чем через 6 ч. Нужна мгновенность — `refreshRemoteConfigNow()`.
// 28.10 (владелец через координатора, «Пульт при каждом запуске»): холодный старт читает сеть ВСЕГДА — 1 чтение на запуск;
// константа осталась только для подписи возраста кэша в логе (fresh/expired).
export const REMOTE_CONFIG_NETWORK_TTL_MS = 6 * 60 * 60 * 1000;
const REMOTE_CONFIG_MAX_CACHE_BYTES = 64 * 1024;
const REMOTE_CONFIG_MAX_KEYS_PER_SECTION = 256;
const REMOTE_CONFIG_MAX_KEY_LENGTH = 100;
const REMOTE_CONFIG_MAX_TEXT_LENGTH = 4_096;
const REMOTE_CONFIG_NUMBER_ARRAY_KEYS = new Set(['friends_level_thresholds']);

type RawConfig = {
  numbers?: Record<string, unknown>;
  bools?: Record<string, unknown>;
  texts?: Record<string, unknown>;
};

type FirestoreFactory = () => {
  collection: (name: string) => {
    doc: (id: string) => {
      get: () => Promise<{ exists: boolean; data: () => RawConfig | undefined }>;
    };
  };
};

const boundedUtf8Bytes = (value: string, max: number): number => {
  if (value.length > max) throw new Error('remote_config_overflow');
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit <= 0x7f) bytes += 1;
    else if (unit <= 0x7ff) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff && index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
    if (bytes > max) throw new Error('remote_config_overflow');
  }
  return bytes;
};

async function getFirestoreModule(): Promise<FirestoreFactory | null> {
  if (Platform.OS === 'web' || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    const mod = await import('@react-native-firebase/firestore');
    return mod.default as unknown as FirestoreFactory;
  } catch (error) {
    reportSwallowed('remote_config_client:firestoreImport', error);
    return null;
  }
}

const dataRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  if (Object.getOwnPropertySymbols(value).length > 0) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors);
  if (keys.length > REMOTE_CONFIG_MAX_KEYS_PER_SECTION) return null;
  const record = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor?.enumerable || !('value' in descriptor) ||
      key.length === 0 || key.length > REMOTE_CONFIG_MAX_KEY_LENGTH ||
      key === '__proto__' || key === 'prototype' || key === 'constructor') return null;
    record[key] = descriptor.value;
  }
  return record;
};

function sanitizeRaw(raw: unknown): RawConfig {
  const top = dataRecord(raw);
  const numberInput = dataRecord(top?.numbers) ?? {};
  const boolInput = dataRecord(top?.bools) ?? {};
  const textInput = dataRecord(top?.texts) ?? {};
  const numbers: Record<string, unknown> = {};
  const bools: Record<string, boolean> = {};
  const texts: Record<string, string> = {};

  for (const [key, value] of Object.entries(numberInput)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      // Keep the persisted wire snapshot canonical too; remote_flags repeats
      // the clamp at consumption so malformed cache/network input cannot widen
      // the PhoneState cohort after restart.
      numbers[key] = key === 'phone_state_cutover_percent'
        ? Math.round(Math.max(0, Math.min(100, value)))
        : value;
    } else if (
      REMOTE_CONFIG_NUMBER_ARRAY_KEYS.has(key)
      && Array.isArray(value)
      && value.length > 0
      && value.length <= 10
      && value.every((item) => typeof item === 'number' && Number.isFinite(item))
    ) {
      // Эти две серверные ручки по контракту являются массивами. Сохраняем только
      // узкий allowlist; общий remote-config по-прежнему отбрасывает произвольные массивы.
      numbers[key] = [...value];
    }
  }
  for (const [key, value] of Object.entries(boolInput)) {
    if (typeof value === 'boolean') bools[key] = value;
  }
  for (const [key, value] of Object.entries(textInput)) {
    if (typeof value === 'string' && value.length <= REMOTE_CONFIG_MAX_TEXT_LENGTH) texts[key] = value;
  }

  return Object.freeze({
    numbers: Object.freeze(numbers),
    bools: Object.freeze(bools),
    texts: Object.freeze(texts),
  });
}

/**
 * Общий читатель remote_config_cache_v1 с зеркалом в памяти.
 *
 * зачем ([COLD-START-IO], store-release, слабый профиль, 02.10): кэш читали 6 раз за первые 15 с —
 * этот модуль, флаг вкладки Шпиля и конфиг «Вместе», каждый своим getItem в очередь AsyncStorage.
 * Пишет кэш ТОЛЬКО applyAndCache (проверено grep), ключ не привязан к аккаунту → одно чтение с диска,
 * запись обновляет зеркало сразу; поколение не даёт позднему ответу первого чтения затереть свежую
 * запись. Сбой чтения не кэшируется.
 */
let remoteConfigCacheMemory: Readonly<{ loaded: boolean; raw: string | null }> = { loaded: false, raw: null };
let remoteConfigCacheRead: Promise<string | null> | null = null;
let remoteConfigCacheGeneration = 0;

export function readRemoteConfigCacheRaw(): Promise<string | null> {
  if (remoteConfigCacheMemory.loaded) return Promise.resolve(remoteConfigCacheMemory.raw);
  if (remoteConfigCacheRead) return remoteConfigCacheRead;
  const generation = remoteConfigCacheGeneration;
  const pending = AsyncStorage.getItem(REMOTE_CONFIG_CACHE_KEY).then((raw) => {
    if (generation === remoteConfigCacheGeneration) remoteConfigCacheMemory = { loaded: true, raw };
    return raw;
  }).finally(() => {
    if (remoteConfigCacheRead === pending) remoteConfigCacheRead = null;
  });
  remoteConfigCacheRead = pending;
  return pending;
}

function rememberRemoteConfigCacheRaw(raw: string): void {
  remoteConfigCacheGeneration += 1;
  remoteConfigCacheRead = null;
  remoteConfigCacheMemory = { loaded: true, raw };
}

function applyAndCache(raw: RawConfig | undefined, fetchedAtMs: number = Date.now()): void {
  const clean = sanitizeRaw(raw);
  const encoded = JSON.stringify(clean);
  try { boundedUtf8Bytes(encoded, REMOTE_CONFIG_MAX_CACHE_BYTES); } catch (error) {
    DebugLogger.warn('[STARTUP-READS]', `remote_config: network doc rejected (overflow): ${String(error)}`);
    return;
  }
  applyRemoteConfigSnapshot(clean, { source: 'network', fetchedAtMs });
  logAccountsV2ClientFlag('network');
  logRemoteGates('network', clean.bools);
  // зачем (11.10, «Шпиль не виден»): зеркало кэша обновляется ДО события. Раньше событие уходило первым, и слушатели,
  // читающие кэш (флаг вкладки Шпиля, «Вместе»), синхронно получали из зеркала СТАРОЕ значение — вкладка не появлялась
  // до перезапуска, а при свежем кэше на диске — до 6 часов.
  rememberRemoteConfigCacheRaw(encoded);
  emitAppEvent('remote_config_changed');
  // зачем: метка свежести пишется ВМЕСТЕ с кэшем — кэш без метки снова гнал бы
  // сеть, а метка без кэша выдавала бы дефолты за «свежие».
  void AsyncStorage.multiSet([
    [REMOTE_CONFIG_CACHE_KEY, encoded],
    [REMOTE_CONFIG_FETCHED_AT_KEY, String(fetchedAtMs)],
  ]).catch((error: unknown) => reportSwallowed('remote_config_client:cacheWrite', error));
}

type RemoteConfigCacheAge =
  | Readonly<{ fresh: true; ageMs: number }>
  | Readonly<{ fresh: false; reason: string; ageMs: number | null }>;

async function readRemoteConfigCacheAge(nowMs: number, cacheApplied: boolean): Promise<RemoteConfigCacheAge> {
  if (!cacheApplied) return { fresh: false, reason: 'no_cache', ageMs: null };
  let rawFetchedAt: string | null = null;
  try {
    rawFetchedAt = await AsyncStorage.getItem(REMOTE_CONFIG_FETCHED_AT_KEY);
  } catch (error) {
    reportSwallowed('remote_config_client:fetchedAtRead', error);
    return { fresh: false, reason: 'fetched_at_read_failed', ageMs: null };
  }
  const fetchedAtMs = Number(rawFetchedAt);
  if (!rawFetchedAt || !Number.isFinite(fetchedAtMs) || fetchedAtMs <= 0) {
    return { fresh: false, reason: 'no_fetched_at', ageMs: null };
  }
  const ageMs = nowMs - fetchedAtMs;
  // Часы перевели назад: метке верить нельзя, идём в сеть.
  if (ageMs < 0) return { fresh: false, reason: 'clock_skew', ageMs };
  if (ageMs >= REMOTE_CONFIG_NETWORK_TTL_MS) return { fresh: false, reason: 'expired', ageMs };
  return { fresh: true, ageMs };
}

/**
 * Applies the persisted admin flags before route components take their first
 * visibility decision. Network refresh remains deliberately separate.
 */
export async function primeRemoteConfigCacheFromStorage(): Promise<void> {
  await applyRemoteConfigCacheFromStorage();
}

/** То же, но сообщает, применился ли кэш (нужно решению «идти ли в сеть»). */
async function applyRemoteConfigCacheFromStorage(): Promise<boolean> {
  try {
    const raw = await readRemoteConfigCacheRaw();
    if (!raw) {
      DebugLogger.info('[STARTUP-READS]', 'remote_config: no local cache');
      return false;
    }
    boundedUtf8Bytes(raw, REMOTE_CONFIG_MAX_CACHE_BYTES);
    const parsed = JSON.parse(raw) as RawConfig;
    const cleanFromCache = sanitizeRaw(parsed);
    applyRemoteConfigSnapshot(cleanFromCache, { source: 'cache' });
    logAccountsV2ClientFlag('cache');
    logRemoteGates('cache', cleanFromCache.bools);
    emitAppEvent('remote_config_changed');
    return true;
  } catch (e) {
      // Cache is best-effort.
      DebugLogger.error('remote_config_client:parsed', e instanceof Error ? e : new Error(String(e)), 'warning');
      return false;
    }
}

/**
 * One-shot load at startup: apply cache immediately (so flags are right before
 * the network responds), then fetch the live doc once on every cold start
 * (owner 28.10: Pult applies on each launch; no polling).
 * `force: true` always goes to the network. Safe to call always.
 */
export async function loadRemoteConfig(options: Readonly<{ force?: boolean; nowMs?: number }> = {}): Promise<void> {
  const force = options.force === true;
  if (startupLoadPromise) {
    if (!force) return startupLoadPromise;
    // Принудительный вызов не «прилипает» к стартовому, который мог пропустить
    // сеть по TTL: дожидаемся его и идём в сеть сами.
    await startupLoadPromise.catch((error: unknown) => reportSwallowed('remote_config_client:awaitStartup', error));
  }
  explicitRefreshDemand += 1;
  const loading = (async () => {
    try {
      const cacheApplied = await applyRemoteConfigCacheFromStorage();
      const nowMs = Number.isFinite(options.nowMs) ? Number(options.nowMs) : Date.now();
      if (!force) {
        // зачем (владелец 28.10 через координатора: «онбординг из Пульта должен применяться ПРИ КАЖДОМ ЗАПУСКЕ»): холодный старт всегда
        // читает документ один раз — пока чтение идёт, работает кэш, свежее значение применяется событием remote_config_changed.
        // Раньше (PM-210, 01.10) сеть пропускалась при кэше моложе 6 ч, и выключенный в Пульте раздел жил до 6 ч. Стоимость — 1 чтение
        // на холодный старт; опроса нет. Возраст кэша — только в лог.
        const age = await readRemoteConfigCacheAge(nowMs, cacheApplied);
        DebugLogger.info('[STARTUP-READS]', `remote_config: network read on cold start (cache=${age.fresh ? 'fresh' : age.reason}, ageMs=${age.ageMs ?? 'n/a'})`);
        console.log(`[ONB-FLAGS] cold start: cache=${cacheApplied ? 'applied' : 'none'} cacheAgeMin=${age.ageMs === null ? '—' : Math.round(age.ageMs / 60_000)} → network read`); // guard-ok: одна строка на холодный старт
      } else {
        DebugLogger.info('[STARTUP-READS]', 'remote_config: network read (reason=force)');
      }
      const raw = await refreshRemoteConfigFromNetwork(nowMs);
      DebugLogger.info('[STARTUP-READS]', `remote_config: network result=${raw ? 'applied' : 'empty_or_skipped'}`);
    } catch (e) {
      // Keep cache/defaults on any failure (offline, permission, or session deferral).
      DebugLogger.error('remote_config_client:loading', e instanceof Error ? e : new Error(String(e)), 'warning');
    } finally {
      explicitRefreshDemand = Math.max(0, explicitRefreshDemand - 1);
    }
  })().finally(() => {
    if (startupLoadPromise === loading) startupLoadPromise = null;
  });
  startupLoadPromise = loading;
  return loading;
}

// зачем: PM-212/PM-210 — живой 5-минутный опрос Remote Config снят (подписчиков
// больше нет: subscribeRemoteConfig() — заглушка). Вместе с ним ушли модульная
// подписка на AppState и участник «тихой сети», которые при ИМПОРТЕ файла
// вешались навсегда и держали мёртвый таймер-цикл. Остался только разовый
// loadRemoteConfig() при старте: сеть идёт лишь пока есть явный спрос.
const hasRemoteRefreshDemand = (): boolean => explicitRefreshDemand > 0;

async function readRemoteConfigFromNetwork(): Promise<RawConfig | null> {
  return withBackgroundNetworkLease('remote_config.load', async (lease) => {
    lease.assertCurrent();
    const factory = await getFirestoreModule();
    lease.assertCurrent();
    if (!factory) return null;
    const db = factory();
    lease.assertCurrent();
    // Recheck after the dynamic import and immediately before the native call.
    if (!hasRemoteRefreshDemand()) {
      DebugLogger.warn('[REMOTE-CONFIG]', 'network read skipped: no explicit demand');
      return null;
    }
    // Do not Promise.race a native Firestore read: a JS timeout would detach
    // still-live native traffic from the interactive-session fence.
    const snap = await db.collection(REMOTE_CONFIG_COLLECTION).doc(REMOTE_CONFIG_DOC).get();
    lease.assertCurrent();
    if (!hasRemoteRefreshDemand()) {
      DebugLogger.warn('[REMOTE-CONFIG]', 'network result dropped: demand ended');
      return null;
    }
    return snap.exists ? snap.data() ?? {} : null;
  });
}

let sharedNetworkRefreshPromise: Promise<RawConfig | null> | null = null;
let startupLoadPromise: Promise<void> | null = null;
let explicitRefreshDemand = 0;

const refreshRemoteConfigFromNetwork = (nowMs: number = Date.now()): Promise<RawConfig | null> => {
  if (sharedNetworkRefreshPromise) return sharedNetworkRefreshPromise;
  const refresh = readRemoteConfigFromNetwork().then((raw) => {
    if (raw && hasRemoteRefreshDemand()) applyAndCache(raw, nowMs);
    return raw;
  }).finally(() => {
    if (sharedNetworkRefreshPromise === refresh) sharedNetworkRefreshPromise = null;
  });
  sharedNetworkRefreshPromise = refresh;
  return refresh;
};

/** Принудительно перечитать `remote_config/app`, минуя TTL кэша (рубильник «сейчас»). */
export function refreshRemoteConfigNow(): Promise<void> {
  return loadRemoteConfig({ force: true });
}

export function subscribeRemoteConfig(): { remove: () => void } {
  // Retained only for source compatibility. Persistent Remote Config polling
  // is retired; startup uses the one-shot loadRemoteConfig() path instead.
  return { remove: () => {} };
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}

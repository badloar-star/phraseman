// ════════════════════════════════════════════════════════════════════════════
// paywall_variant.ts — выбор нового пейвола v3: A («Компакт») / B («Стори») /
// C («Атриум»). Старый v1 больше не является вариантом показа.
//
// КОНФИГ: Firestore doc `remote_config/paywall_ab` — НАМЕРЕННО отдельный от
// `remote_config/app`: вкладка Remote Config в админке сохраняет свой док через
// setDoc(merge:false) и затёрла бы чужие ключи. Отдельный док = изоляция.
//   { a_pct, b_pct, c_pct, salt, rating_x10, ratings_count, updatedAt, updatedBy }
//
// НАЗНАЧЕНИЕ ВАРИАНТА: детерминированный djb2-хэш `${stableId}:paywall_ab:${salt}`
// → доли A/B/C. Один юзер всегда видит один вариант
// (переустановка не сбивает — stableId переживает), НИКАКОЙ ротации по времени:
// time-based ротация смешивает когорты (день недели/промо) и портит тест.
// Смена `salt` в админке = осознанный пересев бакетов (новый эксперимент).
//
// ДЕФОЛТ (нет дока / оффлайн / первый запуск): РАВНЫЙ сплит A/B/C = 33/33/34.
// Так эксперимент работает «из коробки» — даже до первого захода в админку каждый
// вариант получает равную долю показов. В админке тот же пресет — «Поровну».
// Старый экран (v1) не показываем даже как fallback.
//
// СОЦДОКАЗАТЕЛЬСТВО: rating_x10 (50 → «5.0», 0 → скрыть) и ratings_count —
// только РЕАЛЬНЫЕ сторовые числа, обновляются из админки. Никаких хардкодов.
// ════════════════════════════════════════════════════════════════════════════
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getStableId, peekStableId } from './stable_id';

export type PaywallAbVariant = 'A' | 'B' | 'C';

export interface PaywallAbConfig {
  aPct: number;
  bPct: number;
  cPct: number;
  salt: string;
  ratingX10: number;
  ratingsCount: number;
}

const CONFIG_DOC_COLLECTION = 'remote_config';
const CONFIG_DOC_ID = 'paywall_ab';
const CONFIG_CACHE_KEY = 'paywall_ab_config_cache_v1';
const CONFIG_AUTH_TIMEOUT_MS = 2500;
/** Ключ старого A/B v1-vs-v2 (Math.random на устройство) — вычищаем. */
const LEGACY_VARIANT_KEY = 'paywall_variant';

const DEFAULT_CONFIG: PaywallAbConfig = {
  aPct: 33,
  bPct: 33,
  cPct: 34,
  salt: 'v3',
  ratingX10: 0,
  ratingsCount: 0,
};

let _config: PaywallAbConfig = { ...DEFAULT_CONFIG };
let _loadedOnce = false;
let _refreshInFlight: Promise<void> | null = null;

function clampPct(raw: unknown): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function sanitizeConfig(raw: unknown): PaywallAbConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const cfg: PaywallAbConfig = {
    aPct: clampPct(r.a_pct),
    bPct: clampPct(r.b_pct),
    cPct: clampPct(r.c_pct),
    salt: typeof r.salt === 'string' && r.salt.length > 0 && r.salt.length <= 40 ? r.salt : DEFAULT_CONFIG.salt,
    ratingX10: clampPct(r.rating_x10) > 50 ? 50 : clampPct(r.rating_x10),
    ratingsCount:
      typeof r.ratings_count === 'number' && Number.isFinite(r.ratings_count) && r.ratings_count >= 0
        ? Math.floor(r.ratings_count)
        : 0,
  };
  // Если админ ввёл суммарно >100 — пропорционально ужимаем.
  const sum = cfg.aPct + cfg.bPct + cfg.cPct;
  if (sum > 100) {
    cfg.aPct = Math.floor((cfg.aPct * 100) / sum);
    cfg.bPct = Math.floor((cfg.bPct * 100) / sum);
    cfg.cPct = Math.floor((cfg.cPct * 100) / sum);
  }
  return cfg;
}

type FirestoreFactory = () => {
  collection: (name: string) => {
    doc: (id: string) => {
      get: () => Promise<{ exists: boolean; data: () => unknown }>;
    };
  };
};

async function getFirestoreModule(): Promise<FirestoreFactory | null> {
  if (Platform.OS === 'web' || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    const mod = await import('@react-native-firebase/firestore');
    return mod.default as unknown as FirestoreFactory;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label = 'paywall_config_auth'): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
}

async function ensureFirebaseAuthForConfigRead(): Promise<void> {
  if (Platform.OS === 'web' || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  try {
    const mod = await import('@react-native-firebase/auth');
    const authFactory = mod.default as unknown as () => {
      currentUser?: unknown;
      signInAnonymously?: () => Promise<unknown>;
    };
    const auth = typeof authFactory === 'function' ? authFactory() : null;
    if (!auth || auth.currentUser || typeof auth.signInAnonymously !== 'function') return;
    await withTimeout(auth.signInAnonymously(), CONFIG_AUTH_TIMEOUT_MS);
  } catch {
    // If auth is unavailable/offline, the Firestore read below will fall back to cache/new C.
  }
}

async function applyCache(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
    if (raw) _config = sanitizeConfig(JSON.parse(raw));
  } catch {
    // best-effort
  }
}

async function refreshPaywallAbConfigFromNetwork(): Promise<void> {
  await ensureFirebaseAuthForConfigRead();
  const factory = await getFirestoreModule();
  if (factory) {
    try {
      const snap = await withTimeout(
        factory().collection(CONFIG_DOC_COLLECTION).doc(CONFIG_DOC_ID).get(),
        3000,
        'paywall_config',
      );
      if (snap.exists) {
        _config = sanitizeConfig(snap.data());
        void AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({
          a_pct: _config.aPct, b_pct: _config.bPct, c_pct: _config.cPct,
          salt: _config.salt, rating_x10: _config.ratingX10, ratings_count: _config.ratingsCount,
        })).catch(() => {});
      }
    } catch {
      // оффлайн/нет прав — остаёмся на кэше/дефолте (новый C)
    }
  }
}

export function refreshPaywallAbConfigInBackground(): void {
  if (_refreshInFlight) return;
  _refreshInFlight = refreshPaywallAbConfigFromNetwork()
    .catch(() => {})
    .finally(() => { _refreshInFlight = null; });
}

async function loadPaywallAbConfigCacheFirst(): Promise<PaywallAbConfig> {
  if (!_loadedOnce) {
    await applyCache();
    _loadedOnce = true;
  }
  return _config;
}

/**
 * Fresh load for diagnostics/admin QA. Normal paywall routing uses the fast
 * cache-first resolver below so the user never waits on Firestore/auth.
 */
export async function loadPaywallAbConfig(): Promise<PaywallAbConfig> {
  await loadPaywallAbConfigCacheFirst();
  await refreshPaywallAbConfigFromNetwork();
  return _config;
}

export function getPaywallAbConfigSync(): PaywallAbConfig {
  return _config;
}

/** djb2 → [0,1). Копия hashToUnit из remote_flags (не экспортирован там). */
export function hashToUnit(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return (h % 100000) / 100000;
}

/** Чистая функция выбора по точке [0,1) — отдельно ради тестируемости. */
export function pickVariantFromUnit(unit: number, cfg: PaywallAbConfig): PaywallAbVariant {
  const total = cfg.aPct + cfg.bPct + cfg.cPct;
  if (total <= 0) return 'C';
  const point = unit * total;
  if (point < cfg.aPct) return 'A';
  if (point < cfg.aPct + cfg.bPct) return 'B';
  return 'C';
}

/**
 * Главная точка входа диспетчера: свежий конфиг (кэш→сеть) + stableId → вариант.
 * Manage-режим подписки сюда не ходит: premium_modal открывает системную страницу подписок.
 */
export async function resolvePaywallAbVariant(): Promise<{ variant: PaywallAbVariant; stableId: string }> {
  const [cfg, stableId] = await Promise.all([loadPaywallAbConfigCacheFirst(), getStableId()]);
  refreshPaywallAbConfigInBackground();
  // Подчищаем ключ старого Math.random-эксперимента, чтобы не путал при отладке.
  void AsyncStorage.removeItem(LEGACY_VARIANT_KEY).catch(() => {});
  const unit = hashToUnit(`${stableId}:paywall_ab:${cfg.salt}`);
  return { variant: pickVariantFromUnit(unit, cfg), stableId };
}

/**
 * Синхронное решение варианта пейвола из кэша в памяти — БЕЗ await, чтобы пейвол открывался
 * мгновенно (без спиннера-диспетчера). Использует уже загруженный конфиг и закэшированный
 * stableId. Если stableId ещё не в памяти — берём детерминированный fallback-seed (вариант
 * всё равно почти всегда C при дефолтном сплите). A/B-конфиг при этом обновляется в фоне.
 */
export function resolvePaywallAbVariantSync(): { variant: PaywallAbVariant; stableId: string } {
  const cfg = _config;
  refreshPaywallAbConfigInBackground();
  const stableId = peekStableId() ?? 'pending';
  const unit = hashToUnit(`${stableId}:paywall_ab:${cfg.salt}`);
  return { variant: pickVariantFromUnit(unit, cfg), stableId };
}

/** Рейтинг для соцстроки: null = не показывать (нет подтверждённого числа). */
export function getPaywallSocialProof(): { rating: number | null; count: number | null } {
  const rating = _config.ratingX10 >= 10 ? _config.ratingX10 / 10 : null;
  const count = _config.ratingsCount > 0 ? _config.ratingsCount : null;
  return { rating, count };
}

/** Test-only. */
export function __setPaywallAbConfigForTest(raw: unknown): PaywallAbConfig {
  _config = sanitizeConfig(raw);
  _loadedOnce = true;
  return _config;
}
export function __resetPaywallAbForTest(): void {
  _config = { ...DEFAULT_CONFIG };
  _loadedOnce = false;
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// paywall_variant.ts — выбор пейвола эксперимента: A («Компакт») / B («Стори») /
// C («Атриум») / D («Плитки») / E («Один план») / F («Честный триал») /
// G («Приманка»). Старый v1 больше не является вариантом показа.
//
// КОНФИГ: Firestore doc `remote_config/paywall_ab` — НАМЕРЕННО отдельный от
// `remote_config/app`: вкладка Remote Config в админке сохраняет свой док через
// setDoc(merge:false) и затёрла бы чужие ключи. Отдельный док = изоляция.
//   { a_pct..g_pct, a_enabled..g_enabled, salt, rating_x10, ratings_count,
//     updatedAt, updatedBy }
// Старые доки без d_pct..g_pct / *_enabled: новые доли = 0, все флаги = true
// (поведение ровно как у сплита A/B/C). Выключенный вариант участвует с нулём.
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
import {
  normalizeExperimentPassport,
  type ExperimentAssignmentQuality,
  type ExperimentPassport,
} from './analytics_experiments';

export type PaywallAbVariant = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface PaywallAbConfig {
  aPct: number;
  bPct: number;
  cPct: number;
  dPct: number;
  ePct: number;
  fPct: number;
  gPct: number;
  aEnabled: boolean;
  bEnabled: boolean;
  cEnabled: boolean;
  dEnabled: boolean;
  eEnabled: boolean;
  fEnabled: boolean;
  gEnabled: boolean;
  salt: string;
  ratingX10: number;
  ratingsCount: number;
  experimentPassport?: ExperimentPassport | null;
  measurementStatus?: 'legacy_unmeasured' | 'governed';
}

const VARIANT_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;
type VariantLetter = (typeof VARIANT_LETTERS)[number];
const pctKey = (l: VariantLetter) => `${l}Pct` as const;
const enabledKey = (l: VariantLetter) => `${l}Enabled` as const;
const variantId = (l: VariantLetter): PaywallAbVariant => l.toUpperCase() as PaywallAbVariant;

/** Эффективная доля варианта: выключенный вариант участвует с нулём. */
function effectivePct(cfg: PaywallAbConfig, l: VariantLetter): number {
  return cfg[enabledKey(l)] ? cfg[pctKey(l)] : 0;
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
  dPct: 0,
  ePct: 0,
  fPct: 0,
  gPct: 0,
  aEnabled: true,
  bEnabled: true,
  cEnabled: true,
  dEnabled: true,
  eEnabled: true,
  fEnabled: true,
  gEnabled: true,
  salt: 'v3',
  ratingX10: 0,
  ratingsCount: 0,
  experimentPassport: null,
  measurementStatus: 'legacy_unmeasured',
};

let _config: PaywallAbConfig = { ...DEFAULT_CONFIG };
let _loadedOnce = false;
let _refreshInFlight: Promise<void> | null = null;
let _lastAssignment: { experimentId: string; variant: PaywallAbVariant; quality: ExperimentAssignmentQuality } | null = null;

function clampPct(raw: unknown): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Флаг включённости: старые доки без `*_enabled` трактуем как включённые. */
function parseEnabled(raw: unknown): boolean {
  return raw === undefined || raw === null ? true : raw === true;
}

function sanitizeConfig(raw: unknown): PaywallAbConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const passport = normalizeExperimentPassport(r.experiment_passport ?? r.experimentPassport);
  const cfg: PaywallAbConfig = {
    aPct: clampPct(r.a_pct),
    bPct: clampPct(r.b_pct),
    cPct: clampPct(r.c_pct),
    dPct: clampPct(r.d_pct),
    ePct: clampPct(r.e_pct),
    fPct: clampPct(r.f_pct),
    gPct: clampPct(r.g_pct),
    aEnabled: parseEnabled(r.a_enabled),
    bEnabled: parseEnabled(r.b_enabled),
    cEnabled: parseEnabled(r.c_enabled),
    dEnabled: parseEnabled(r.d_enabled),
    eEnabled: parseEnabled(r.e_enabled),
    fEnabled: parseEnabled(r.f_enabled),
    gEnabled: parseEnabled(r.g_enabled),
    salt: typeof r.salt === 'string' && r.salt.length > 0 && r.salt.length <= 40 ? r.salt : DEFAULT_CONFIG.salt,
    ratingX10: clampPct(r.rating_x10) > 50 ? 50 : clampPct(r.rating_x10),
    ratingsCount:
      typeof r.ratings_count === 'number' && Number.isFinite(r.ratings_count) && r.ratings_count >= 0
        ? Math.floor(r.ratings_count)
        : 0,
    experimentPassport: passport,
    measurementStatus: passport ? 'governed' : 'legacy_unmeasured',
  };
  // Если админ ввёл суммарно >100 по ЭФФЕКТИВНЫМ долям (выключенные = 0) —
  // пропорционально ужимаем включённые; выключенные доли не трогаем.
  const sum = VARIANT_LETTERS.reduce((acc, l) => acc + effectivePct(cfg, l), 0);
  if (sum > 100) {
    for (const l of VARIANT_LETTERS) {
      if (cfg[enabledKey(l)]) cfg[pctKey(l)] = Math.floor((cfg[pctKey(l)] * 100) / sum);
    }
  }
  if (cfg.experimentPassport) {
    const allocation = cfg.experimentPassport.allocation;
    // Паспорт управляет сплитом только если его allocation в точности совпадает
    // с эффективными долями конфига (отсутствующие в allocation варианты = 0).
    const allocationMatches = VARIANT_LETTERS.every(
      (l) => effectivePct(cfg, l) === (allocation[variantId(l)] ?? 0),
    );
    if (!allocationMatches || cfg.experimentPassport.assignmentSalt !== cfg.salt) {
      cfg.experimentPassport = null;
      cfg.measurementStatus = 'legacy_unmeasured';
    }
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
          d_pct: _config.dPct, e_pct: _config.ePct, f_pct: _config.fPct, g_pct: _config.gPct,
          a_enabled: _config.aEnabled, b_enabled: _config.bEnabled, c_enabled: _config.cEnabled,
          d_enabled: _config.dEnabled, e_enabled: _config.eEnabled, f_enabled: _config.fEnabled, g_enabled: _config.gEnabled,
          salt: _config.salt, rating_x10: _config.ratingX10, ratings_count: _config.ratingsCount,
          experiment_passport: _config.experimentPassport,
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
  const total = VARIANT_LETTERS.reduce((acc, l) => acc + effectivePct(cfg, l), 0);
  if (total <= 0) return 'C';
  const point = unit * total;
  let acc = 0;
  for (const l of VARIANT_LETTERS) {
    acc += effectivePct(cfg, l);
    if (point < acc) return variantId(l);
  }
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
  const experimentId = cfg.experimentPassport?.experimentId;
  const unit = hashToUnit(experimentId ? `${stableId}:${experimentId}:${cfg.salt}` : `${stableId}:paywall_ab:${cfg.salt}`);
  const variant = pickVariantFromUnit(unit, cfg);
  if (experimentId) _lastAssignment = { experimentId, variant, quality: 'frozen' };
  return { variant, stableId };
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
  const experimentId = cfg.experimentPassport?.experimentId;
  const unit = hashToUnit(experimentId ? `${stableId}:${experimentId}:${cfg.salt}` : `${stableId}:paywall_ab:${cfg.salt}`);
  const variant = pickVariantFromUnit(unit, cfg);
  if (experimentId) {
    _lastAssignment = {
      experimentId,
      variant,
      // Warehouse field: assignment_quality. Pending fallback is never causal.
      quality: stableId === 'pending' ? 'pending_fallback' : 'frozen',
    };
  }
  return { variant, stableId };
}

export function getPaywallExperimentMeasurementContext(variant: PaywallAbVariant): {
  passport: ExperimentPassport;
  assignmentQuality: ExperimentAssignmentQuality;
} | null {
  const passport = _config.experimentPassport;
  if (!passport || passport.status !== 'running' || !_lastAssignment
    || _lastAssignment.experimentId !== passport.experimentId || _lastAssignment.variant !== variant) return null;
  const now = Date.now();
  if (now < Date.parse(passport.startUtc) || now >= Date.parse(passport.endUtc)) return null;
  return { passport, assignmentQuality: _lastAssignment.quality };
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
  _lastAssignment = null;
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}

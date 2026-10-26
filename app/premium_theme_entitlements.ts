import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { useSyncExternalStore } from 'react';

import { captureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration } from './account_generation';
import { DebugLogger } from './debug-logger';
import {
  PREMIUM_THEME_IDS,
  PREMIUM_THEME_CONDITIONS,
  isPremiumThemeId,
  premiumThemeByCondition,
  type PremiumThemeId,
  type PremiumThemeProgress,
  type PremiumThemeProgressByCondition,
  type PremiumThemeUnlockCondition,
} from './premium_theme_catalog';

const REGION = 'us-central1';
const LOG = '[PREMIUM-THEMES]';

export type PremiumThemeEntitlementsSnapshot = Readonly<{
  ready: boolean;
  authoritative: boolean;
  ownerStableId: string | null;
  unlocked: ReadonlySet<PremiumThemeId>;
  progressByCondition: PremiumThemeProgressByCondition;
}>;

type ServerEnvelope = Readonly<{
  schemaVersion?: unknown;
  entitlements?: unknown;
  granted?: unknown;
  newlyGranted?: unknown;
  nearUnlockConditions?: unknown;
  progressByCondition?: unknown;
}>;

const EMPTY_SET = Object.freeze(new Set<PremiumThemeId>()) as ReadonlySet<PremiumThemeId>;
const EMPTY_PROGRESS = Object.freeze({}) as PremiumThemeProgressByCondition;
let snapshot: PremiumThemeEntitlementsSnapshot = Object.freeze({ ready: false, authoritative: false, ownerStableId: null, unlocked: EMPTY_SET, progressByCondition: EMPTY_PROGRESS });
let loadedOwner: string | null = null;
let loadPromise: Promise<void> | null = null;
let generationSubscribed = false;
const listeners = new Set<() => void>();

function owner(): string | null {
  const token = captureAccountGeneration();
  return token.phase === 'active' ? token.stableId?.trim() || null : null;
}

function parseServerEntitlements(value: unknown): ReadonlySet<PremiumThemeId> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY_SET;
  const ids = Object.entries(value as Record<string, unknown>)
    .filter(([themeId, atMs]) => isPremiumThemeId(themeId) && Number.isSafeInteger(Number(atMs)) && Number(atMs) > 0)
    .map(([themeId]) => themeId as PremiumThemeId);
  return Object.freeze(new Set(ids));
}

function publish(
  ownerStableId: string | null,
  unlocked: ReadonlySet<PremiumThemeId>,
  progressByCondition: PremiumThemeProgressByCondition = EMPTY_PROGRESS,
  ready = true,
  authoritative = true,
): void {
  snapshot = Object.freeze({ ready, authoritative, ownerStableId, unlocked, progressByCondition });
  listeners.forEach((listener) => listener());
}

function parseProgressByCondition(value: unknown): PremiumThemeProgressByCondition {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY_PROGRESS;
  const allowedConditions = new Set<PremiumThemeUnlockCondition>(PREMIUM_THEME_CONDITIONS);
  const allowedUnits = new Set(['purchase', 'rank', 'days', 'tier', 'hours', 'sessions']);
  const out: Partial<Record<PremiumThemeUnlockCondition, PremiumThemeProgress>> = {};
  for (const [conditionId, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!allowedConditions.has(conditionId as PremiumThemeUnlockCondition) || !raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const current = Number(row.current);
    const target = Number(row.target);
    const unit = row.unit;
    if (!Number.isSafeInteger(current) || !Number.isSafeInteger(target) || current < 0 || target <= 0 || current > target || typeof unit !== 'string' || !allowedUnits.has(unit)) continue;
    out[conditionId as PremiumThemeUnlockCondition] = Object.freeze({ current, target, unit: unit as PremiumThemeProgress['unit'] });
  }
  return Object.freeze(out);
}

function parseThemeIds(value: unknown): readonly PremiumThemeId[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze([...new Set(value.filter(isPremiumThemeId))]);
}

function parseConditions(value: unknown): readonly PremiumThemeUnlockCondition[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  const allowed = new Set<PremiumThemeUnlockCondition>(PREMIUM_THEME_CONDITIONS);
  return Object.freeze([...new Set(value.filter((entry): entry is PremiumThemeUnlockCondition => typeof entry === 'string' && allowed.has(entry as PremiumThemeUnlockCondition)))]);
}

async function applyServerSideEffects(envelope: ServerEnvelope): Promise<void> {
  const newlyGranted = parseThemeIds(envelope.newlyGranted);
  const nearUnlock = parseConditions(envelope.nearUnlockConditions)
    .map((entry) => premiumThemeByCondition(entry).id)
    .filter((themeId) => !snapshot.unlocked.has(themeId));
  if (newlyGranted.length === 0 && nearUnlock.length === 0) return;
  const [{ recordThemeUnlockStory }, { ensurePremiumThemePack }] = await Promise.all([
    import('../modules/story_events/story_event_sources'),
    import('./premium_theme_pack_cache'),
  ]);
  for (const themeId of newlyGranted) {
    void recordThemeUnlockStory(themeId);
    void ensurePremiumThemePack(themeId, 'unlock');
  }
  for (const themeId of nearUnlock) void ensurePremiumThemePack(themeId, 'near_unlock');
}

function ensureGenerationSubscription(): void {
  if (generationSubscribed) return;
  generationSubscribed = true;
  subscribeAccountGeneration(() => {
    loadedOwner = null;
    loadPromise = null;
    cachedAtMs = 0; // зачем (кэш 24.10): возраст кэша — свой у каждого аккаунта
    publish(null, EMPTY_SET, EMPTY_PROGRESS, false);
    void primePremiumThemeEntitlements();
  });
}

// зачем (11 · РЕВИЗОР 24.10, Firebase-экономия): функция + 3 чтения на КАЖДОМ холодном старте у всех — дорого; без сети заработанная тема откатывалась
// (публиковался пустой список). Последний серверный ответ хранится на телефоне по stableId: показывается сразу, сеть — не чаще раза в 24 ч и при входе в «Темы».
// Выдача прав по-прежнему только на сервере: кэш влияет лишь на показ на этом телефоне.
const CACHE_KEY_PREFIX = 'premium_theme_entitlements_v1:';
export const PREMIUM_THEME_ENTITLEMENTS_MAX_AGE_MS = 24 * 60 * 60 * 1000; // координатор 24.10: сервер — не чаще раза в сутки
let cachedAtMs = 0;

type CachedEntitlements = Readonly<{ atMs: number; unlocked: readonly string[]; progressByCondition: unknown }>;

async function readCache(stableId: string): Promise<CachedEntitlements | null> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem(CACHE_KEY_PREFIX + stableId);
    if (!raw) { console.log(`${LOG} cache miss`); return null; } // guard-ok: причина сетевого запроса
    const parsed = JSON.parse(raw) as CachedEntitlements;
    if (!Number.isSafeInteger(parsed?.atMs) || !Array.isArray(parsed?.unlocked)) { console.warn(`${LOG} cache unreadable — ignored`); return null; } // guard-ok
    return parsed;
  } catch (error) {
    console.warn(`${LOG} cache read failed`, String((error as Error)?.message ?? error)); // guard-ok: немой catch запрещён
    return null;
  }
}

async function writeCache(stableId: string, unlocked: ReadonlySet<PremiumThemeId>, progressByCondition: PremiumThemeProgressByCondition, atMs: number): Promise<void> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(CACHE_KEY_PREFIX + stableId, JSON.stringify({ atMs, unlocked: [...unlocked], progressByCondition }));
  } catch (error) {
    console.warn(`${LOG} cache write failed`, String((error as Error)?.message ?? error)); // guard-ok: немой catch запрещён
  }
}

/**
 * Права только из кэша телефона, без сети и без общей очереди загрузки.
 * зачем (скорость тем 26.10, Темы): заставка холодного старта ждёт права для премиальной сохранённой темы; общий prime при
 * устаревшем кэше ждёт сеть (а фоновый prime уже стоит в очереди) — тема держалась дольше потолка заставки, Главная потом
 * перекрашивалась. Здесь — только кэш любого возраста (заработанная тема не откатывается); свежесть догоняет фоновый prime.
 * Возвращает, нашёлся ли кэш: нет — вызывающий ждёт обычный prime (сеть), как прежде.
 */
export async function primePremiumThemeEntitlementsFromCache(): Promise<boolean> {
  ensureGenerationSubscription();
  const stableId = owner();
  if (!stableId) { console.log(`${LOG} boot cache: no owner`); return false; } // guard-ok: ранний выход пишет причину
  if (snapshot.ready && snapshot.ownerStableId === stableId) return true;
  const token = captureAccountGeneration();
  const cached = await readCache(stableId);
  if (!cached || !isCurrentAccountGeneration(token, stableId)) { console.log(`${LOG} boot cache: ${cached ? 'account changed' : 'miss'}`); return false; } // guard-ok
  if (snapshot.ready && snapshot.ownerStableId === stableId) return true; // фоновый prime успел раньше — его ответ свежее
  cachedAtMs = cached.atMs;
  publish(stableId, parseServerEntitlements(Object.fromEntries(cached.unlocked.map((id) => [id, 1]))), parseProgressByCondition(cached.progressByCondition));
  console.log(`${LOG} boot cache used`, JSON.stringify({ ageMin: Math.round((Date.now() - cached.atMs) / 60000), unlocked: cached.unlocked.length })); // guard-ok: откуда права на старте
  return true;
}

export async function primePremiumThemeEntitlements(options: Readonly<{ maxAgeMs?: number; nowMs?: number }> = {}): Promise<void> {
  ensureGenerationSubscription();
  const maxAgeMs = options.maxAgeMs ?? PREMIUM_THEME_ENTITLEMENTS_MAX_AGE_MS;
  const now = options.nowMs ?? Date.now();
  const stableId = owner();
  if (!stableId) { loadedOwner = null; publish(null, EMPTY_SET); return; }
  if (loadedOwner === stableId && snapshot.ready && now - cachedAtMs < maxAgeMs) return;
  if (loadPromise) return loadPromise;
  const token = captureAccountGeneration();
  loadPromise = (async () => {
    // кэш на телефоне: показать сразу; свежий — сеть не нужна
    let hadCache = snapshot.ready && snapshot.ownerStableId === stableId && cachedAtMs > 0;
    if (!hadCache) {
      const cached = await readCache(stableId);
      if (cached && isCurrentAccountGeneration(token, stableId)) {
        hadCache = true;
        cachedAtMs = cached.atMs;
        publish(stableId, parseServerEntitlements(Object.fromEntries(cached.unlocked.map((id) => [id, 1]))), parseProgressByCondition(cached.progressByCondition));
        if (now - cached.atMs < maxAgeMs) {
          loadedOwner = stableId;
          console.log(`${LOG} cache fresh — no network`, JSON.stringify({ ageMin: Math.round((now - cached.atMs) / 60000), unlocked: cached.unlocked.length })); // guard-ok
          return;
        }
      }
    }
    try {
      const callable = httpsCallable<Record<string, never>, ServerEnvelope>(getFunctions(getApp(), REGION), 'premiumThemeEntitlementsGet', { timeout: 15_000 });
      const response = await callable({});
      if (!isCurrentAccountGeneration(token, stableId) || response.data.schemaVersion !== 'premium-theme-entitlements.v1') return;
      loadedOwner = stableId;
      const unlocked = parseServerEntitlements(response.data.entitlements);
      const progress = parseProgressByCondition(response.data.progressByCondition);
      cachedAtMs = now;
      publish(stableId, unlocked, progress);
      void writeCache(stableId, unlocked, progress, now);
      void applyServerSideEffects(response.data);
    } catch (error) {
      if (!isCurrentAccountGeneration(token, stableId)) return;
      loadedOwner = null;
      // без сети при наличии кэша — оставляем показанное (заработанная тема не откатывается)
      if (!hadCache) publish(stableId, EMPTY_SET, EMPTY_PROGRESS, true, false);
      console.warn(`${LOG} server entitlement refresh unavailable`, JSON.stringify({ keptCache: hadCache, error: String((error as Error)?.message ?? error) })); // guard-ok
    }
  })().finally(() => { loadPromise = null; });
  return loadPromise;
}

export async function claimPremiumThemeCondition(condition: PremiumThemeUnlockCondition): Promise<Readonly<{ granted: boolean; themeId: PremiumThemeId | null }>> {
  const stableId = owner();
  const token = captureAccountGeneration();
  if (!stableId) return { granted: false, themeId: null };
  const before = snapshot.unlocked;
  try {
    const callable = httpsCallable<{ condition: PremiumThemeUnlockCondition }, ServerEnvelope>(getFunctions(getApp(), REGION), 'premiumThemeConditionClaim', { timeout: 15_000 });
    const response = await callable({ condition });
    if (!isCurrentAccountGeneration(token, stableId) || response.data.schemaVersion !== 'premium-theme-claim.v1') return { granted: false, themeId: null };
    loadedOwner = stableId;
    publish(stableId, parseServerEntitlements(response.data.entitlements), parseProgressByCondition(response.data.progressByCondition));
    const expected = premiumThemeByCondition(condition).id;
    const fresh = !before.has(expected) && snapshot.unlocked.has(expected);
    if (fresh) {
      const [{ recordThemeUnlockStory }, { ensurePremiumThemePack }] = await Promise.all([
        import('../modules/story_events/story_event_sources'),
        import('./premium_theme_pack_cache'),
      ]);
      void recordThemeUnlockStory(expected);
      void ensurePremiumThemePack(expected, 'unlock');
    }
    return { granted: fresh || response.data.granted === true, themeId: snapshot.unlocked.has(expected) ? expected : null };
  } catch (error) {
    DebugLogger.error(`${LOG}:claim:${condition}`, error instanceof Error ? error : new Error(String(error)), 'warning');
    return { granted: false, themeId: null };
  }
}

export function peekPremiumThemeEntitlements(): PremiumThemeEntitlementsSnapshot { return snapshot; }
export function subscribePremiumThemeEntitlements(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export function usePremiumThemeEntitlements(): PremiumThemeEntitlementsSnapshot {
  return useSyncExternalStore(subscribePremiumThemeEntitlements, peekPremiumThemeEntitlements, peekPremiumThemeEntitlements);
}
export function isPremiumThemeUnlocked(themeId: PremiumThemeId): boolean { return snapshot.unlocked.has(themeId); }

export function __resetPremiumThemeEntitlementsForTests(): void {
  snapshot = Object.freeze({ ready: false, authoritative: false, ownerStableId: null, unlocked: EMPTY_SET, progressByCondition: EMPTY_PROGRESS });
  loadedOwner = null;
  loadPromise = null;
  listeners.clear();
}

export const __premiumThemeEntitlementTestHooks = Object.freeze({ parseServerEntitlements, parseThemeIds, parseConditions, parseProgressByCondition, all: PREMIUM_THEME_IDS });


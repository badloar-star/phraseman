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
const LOG = '[PREMIUM-THEME]';

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
    publish(null, EMPTY_SET, EMPTY_PROGRESS, false);
    void primePremiumThemeEntitlements();
  });
}

export async function primePremiumThemeEntitlements(): Promise<void> {
  ensureGenerationSubscription();
  const stableId = owner();
  if (!stableId) { loadedOwner = null; publish(null, EMPTY_SET); return; }
  if (loadedOwner === stableId && snapshot.ready) return;
  if (loadPromise) return loadPromise;
  const token = captureAccountGeneration();
  loadPromise = (async () => {
    try {
      const callable = httpsCallable<Record<string, never>, ServerEnvelope>(getFunctions(getApp(), REGION), 'premiumThemeEntitlementsGet', { timeout: 15_000 });
      const response = await callable({});
      if (!isCurrentAccountGeneration(token, stableId) || response.data.schemaVersion !== 'premium-theme-entitlements.v1') return;
      loadedOwner = stableId;
      publish(stableId, parseServerEntitlements(response.data.entitlements), parseProgressByCondition(response.data.progressByCondition));
      void applyServerSideEffects(response.data);
    } catch (error) {
      if (!isCurrentAccountGeneration(token, stableId)) return;
      loadedOwner = null;
      publish(stableId, EMPTY_SET, EMPTY_PROGRESS, true, false);
      console.warn(`${LOG} server entitlement refresh unavailable`, String((error as Error)?.message ?? error));
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


import { useRef, useSyncExternalStore } from 'react';
import { getLevelFromXP } from '../constants/theme';
import type { FriendEntry, FriendRequestEntry } from './firestore_friend_requests';
import type { CustomizationSnapshot } from './customization_snapshot';

export const APP_SNAPSHOT_RESOURCE_LIMITS = {
  friendProfileMaxEntries: 240,
  friendProfileTtlMs: 30 * 24 * 60 * 60 * 1000,
  listSnapshotTtlMs: 24 * 60 * 60 * 1000,
  recentItemsMax: 60,
  leaderboardRowsMax: 100,
  serializedSnapshotBudgetBytes: 300 * 1024,
  refreshCooldownMs: 45 * 1000,
} as const;

export type AppSnapshotSource = 'storage' | 'memory' | 'live' | 'local';

export interface AppSnapshotMeta {
  source: AppSnapshotSource;
  updatedAt: number;
}

export interface AppSnapshotProfile extends AppSnapshotMeta {
  name: string;
  avatar: string;
  frame: string;
  aura?: string;
  totalXp: number;
  level: number;
  premiumActive: boolean;
  premiumPlan?: string;
  vipActive: boolean;
  /**
   * Активный VIP-грант без даты окончания (сертификат/промокод «навсегда»,
   * бессрочная выдача из админки) — такой доступ показывается как «Pro».
   * зачем: снапшот должен знать тир на первом кадре, иначе плашка моргает
   * «Plus» → «Pro» после reload().
   */
  vipLifetime?: boolean;
}

export interface AppSnapshotProgress extends AppSnapshotMeta {
  streak: number;
  shards: number;
  studyTarget: string;
}

export interface AppSnapshotLessons extends AppSnapshotMeta {
  primedCount: number;
  lastOpenedLesson: string | null;
}

export interface AppSnapshotFriendProfile {
  uid: string;
  name: string;
  totalXp: number;
  weeklyXp: number;
  streak: number;
  isPremium: boolean;
  avatar: string;
  frame: string;
  aura?: string;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
}

export interface AppSnapshotFriends extends AppSnapshotMeta {
  canonicalUid: string;
  friends: FriendEntry[];
  requests: FriendRequestEntry[];
  profiles: Record<string, AppSnapshotFriendProfile>;
}

export interface AppSnapshotSettings extends AppSnapshotMeta {
  autoCheck: boolean;
  voiceOut: boolean;
  uiSounds: boolean;
  speechRate: number;
  speechVoiceId: string;
  hardMode: boolean;
  autoAdvance: boolean;
  haptics: boolean;
  tapHaptics?: boolean;
  immediateCheck: boolean;
}

export interface AppSnapshot {
  profile?: AppSnapshotProfile;
  progress?: AppSnapshotProgress;
  lessons?: AppSnapshotLessons;
  friends?: AppSnapshotFriends;
  settings?: AppSnapshotSettings;
  customization?: CustomizationSnapshot;
  primedAt?: number;
}

type Listener = () => void;
type Patch = Partial<AppSnapshot> | ((current: Readonly<AppSnapshot>) => Partial<AppSnapshot>);

let snapshot: AppSnapshot = {};
const listeners = new Set<Listener>();

function emitSnapshotChanged(): void {
  listeners.forEach((listener) => listener());
}

function shallowPatchChanged(current: AppSnapshot, patch: Partial<AppSnapshot>): boolean {
  return Object.entries(patch).some(([key, value]) => current[key as keyof AppSnapshot] !== value);
}

function preserveNewerProfile(
  current: Readonly<AppSnapshot>,
  patch: Partial<AppSnapshot>,
): Partial<AppSnapshot> {
  const storageHydrationLostSameTick = Boolean(
    patch.profile
    && current.profile
    && patch.profile.updatedAt === current.profile.updatedAt
    && patch.profile.source === 'storage'
    && current.profile.source !== 'storage',
  );
  if (
    !patch.profile
    || !current.profile
    || (
      patch.profile.updatedAt >= current.profile.updatedAt
      && !storageHydrationLostSameTick
    )
  ) {
    return patch;
  }
  return { ...patch, profile: current.profile };
}

export function getAppSnapshot(): Readonly<AppSnapshot> {
  return snapshot;
}

export function resolveHydratedProfileName(
  hydrationStartedAt: number,
  hydratedName: string | null | undefined,
): string {
  const candidate = String(hydratedName ?? '').trim();
  const currentProfile = snapshot.profile;
  if (!currentProfile) return candidate;
  if (currentProfile.updatedAt >= hydrationStartedAt) {
    return currentProfile.name || candidate;
  }
  return candidate || currentProfile.name;
}

export function subscribeAppSnapshot(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function patchAppSnapshot(patchOrFn: Patch): void {
  const requestedPatch = typeof patchOrFn === 'function' ? patchOrFn(snapshot) : patchOrFn;
  const patch = requestedPatch ? preserveNewerProfile(snapshot, requestedPatch) : requestedPatch;
  if (!patch || !shallowPatchChanged(snapshot, patch)) return;
  snapshot = { ...snapshot, ...patch };
  emitSnapshotChanged();
}

const AUTHORITATIVE_TOTAL_XP_MAX = 1_000_000_000;
const AUTHORITATIVE_STREAK_MAX = 100_000;

function authoritativeNonNegativeInt(value: unknown, maximum: number): number | null | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maximum) return null;
  return parsed;
}

function authoritativeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Keeps the visible profile usable when AsyncStorage cannot persist a validated
 * server-authoritative restore (for example Android SQLITE_FULL). This is an
 * in-memory UI projection only; it never writes local storage or Firestore.
 */
export function patchAppSnapshotFromAuthoritativeCloudProgress(
  root: Record<string, unknown>,
  now: number = Date.now(),
): boolean {
  if (root.progressServerAuthoritative !== true) return false;
  const rawProgress = root.progress;
  if (!rawProgress || typeof rawProgress !== 'object' || Array.isArray(rawProgress)) return false;
  const progress = rawProgress as Record<string, unknown>;
  const totalXp = authoritativeNonNegativeInt(progress.user_total_xp, AUTHORITATIVE_TOTAL_XP_MAX);
  const streak = authoritativeNonNegativeInt(progress.streak_count, AUTHORITATIVE_STREAK_MAX);
  if (totalXp === null || streak === null) return false;
  if (totalXp === undefined && streak === undefined) return false;

  const currentProfile = snapshot.profile;
  const currentProgress = snapshot.progress;
  const patch: Partial<AppSnapshot> = {};
  if (totalXp !== undefined) {
    patch.profile = {
      source: 'live',
      updatedAt: now,
      name: authoritativeString(progress.user_name) || currentProfile?.name || '',
      avatar: authoritativeString(progress.user_avatar)
        || authoritativeString(root.user_avatar)
        || currentProfile?.avatar
        || '1',
      frame: authoritativeString(progress.user_avatar_frame)
        || authoritativeString(progress.user_frame)
        || authoritativeString(root.user_avatar_frame)
        || currentProfile?.frame
        || '',
      aura: currentProfile?.aura,
      totalXp,
      level: getLevelFromXP(totalXp),
      premiumActive: currentProfile?.premiumActive ?? false,
      premiumPlan: currentProfile?.premiumPlan,
      vipActive: currentProfile?.vipActive ?? false,
      vipLifetime: currentProfile?.vipLifetime,
    };
  }
  if (streak !== undefined) {
    patch.progress = {
      source: 'live',
      updatedAt: now,
      streak,
      shards: currentProgress?.shards ?? 0,
      studyTarget: currentProgress?.studyTarget ?? 'en',
    };
  }
  patchAppSnapshot(patch);
  return true;
}

export function resetAppSnapshotForAccountSwitch(): void {
  if (Object.keys(snapshot).length === 0) return;
  snapshot = {};
  emitSnapshotChanged();
}

export function useAppSnapshotSelector<T>(
  selector: (value: Readonly<AppSnapshot>) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const selectedRef = useRef<T>(selector(snapshot));

  return useSyncExternalStore(
    subscribeAppSnapshot,
    () => {
      const next = selector(snapshot);
      if (!isEqual(selectedRef.current, next)) {
        selectedRef.current = next;
      }
      return selectedRef.current;
    },
    () => selectedRef.current,
  );
}

export function limitArray<T>(items: readonly T[] | null | undefined, max: number): T[] {
  if (!Array.isArray(items) || max <= 0) return [];
  return items.slice(0, max);
}

export function pruneBoundedRecord<T>(
  record: Record<string, T> | null | undefined,
  options: {
    maxEntries: number;
    ttlMs?: number;
    nowMs?: number;
    retainKeys?: readonly string[];
    getTimestamp?: (entry: T) => number;
  },
): Record<string, T> {
  if (!record || options.maxEntries <= 0) return {};
  const now = options.nowMs ?? Date.now();
  const retain = new Set(options.retainKeys ?? []);
  const getTimestamp = options.getTimestamp ?? (() => 0);
  const entries = Object.entries(record)
    .filter(([key]) => key.length > 0)
    .filter(([key, entry]) => {
      if (retain.has(key) || !options.ttlMs) return true;
      const ts = Number(getTimestamp(entry)) || 0;
      return ts <= 0 || now - ts <= options.ttlMs;
    })
    .sort((a, b) => {
      const aPinned = retain.has(a[0]) ? 1 : 0;
      const bPinned = retain.has(b[0]) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return (Number(getTimestamp(b[1])) || 0) - (Number(getTimestamp(a[1])) || 0);
    });

  const out: Record<string, T> = {};
  for (const [key, entry] of entries) {
    if (Object.keys(out).length >= options.maxEntries && !retain.has(key)) continue;
    out[key] = entry;
  }
  return out;
}

export default function __RouteShim() { return null; }

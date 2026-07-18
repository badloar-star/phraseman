import { useRef, useSyncExternalStore } from 'react';
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
  vipActive: boolean;
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

export function getAppSnapshot(): Readonly<AppSnapshot> {
  return snapshot;
}

export function subscribeAppSnapshot(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function patchAppSnapshot(patchOrFn: Patch): void {
  const patch = typeof patchOrFn === 'function' ? patchOrFn(snapshot) : patchOrFn;
  if (!patch || !shallowPatchChanged(snapshot, patch)) return;
  snapshot = { ...snapshot, ...patch };
  emitSnapshotChanged();
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

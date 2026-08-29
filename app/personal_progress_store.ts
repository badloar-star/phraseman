import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { getLevelFromXP } from '../constants/theme';
import type { PersonalProgressProjection } from '../modules/phone-state/domains/progress_projection';
import { patchAppSnapshotFromPersonalProgress } from './app_snapshot_store';
import { DebugLogger } from './debug-logger';

export type PersonalProgressSnapshot = PersonalProgressProjection & Readonly<{
  hydrated: boolean;
  source: 'phone_state' | 'legacy';
}>;

export type PersonalProgressStoreDependencies = Readonly<{
  readPhoneState(): Promise<PersonalProgressProjection>;
  readLegacy(): Promise<PersonalProgressProjection>;
  usePhoneState(): boolean;
}>;

export type PersonalProgressStore = Readonly<{
  hydrate(): Promise<PersonalProgressSnapshot>;
  getSnapshot(): PersonalProgressSnapshot;
  subscribe(listener: () => void): () => void;
  publish(projection: PersonalProgressProjection, source: 'phone_state' | 'legacy'): void;
  reset(): void;
}>;

function emptySnapshot(): PersonalProgressSnapshot {
  return Object.freeze({
    totalXp: 0,
    level: 1,
    weeklyXp: 0,
    activityDates: Object.freeze([]),
    streakCount: 0,
    completedLessons: Object.freeze([]),
    passedExams: Object.freeze([]),
    unlockedLessons: Object.freeze([]),
    bestResults: Object.freeze({}),
    hydrated: false,
    source: 'legacy',
  });
}

function snapshotFrom(
  projection: PersonalProgressProjection,
  source: 'phone_state' | 'legacy',
): PersonalProgressSnapshot {
  return Object.freeze({
    ...projection,
    activityDates: Object.freeze([...projection.activityDates]),
    completedLessons: Object.freeze([...projection.completedLessons]),
    passedExams: Object.freeze([...projection.passedExams]),
    unlockedLessons: Object.freeze([...projection.unlockedLessons]),
    bestResults: Object.freeze({ ...projection.bestResults }),
    hydrated: true,
    source,
  });
}

export function createPersonalProgressStore(
  dependencies: PersonalProgressStoreDependencies,
): PersonalProgressStore {
  let snapshot = emptySnapshot();
  let revision = 0;
  const listeners = new Set<() => void>();
  const emit = (): void => listeners.forEach((listener) => listener());

  const publish: PersonalProgressStore['publish'] = (projection, source) => {
    revision += 1;
    snapshot = snapshotFrom(projection, source);
    emit();
  };

  const hydrate: PersonalProgressStore['hydrate'] = async () => {
    const startedAtRevision = revision;
    const usePhoneState = dependencies.usePhoneState();
    const projection = usePhoneState
      ? await dependencies.readPhoneState()
      : await dependencies.readLegacy();
    if (revision === startedAtRevision) publish(projection, usePhoneState ? 'phone_state' : 'legacy');
    return snapshot;
  };

  const reset = (): void => {
    revision += 1;
    snapshot = emptySnapshot();
    emit();
  };

  return Object.freeze({
    hydrate,
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    publish,
    reset,
  });
}

async function readLegacyProjection(): Promise<PersonalProgressProjection> {
  const pairs = new Map(await AsyncStorage.multiGet([
    'user_total_xp',
    'weekly_xp',
    'streak_count',
    'last_active_date',
    'unlocked_lessons',
  ]));
  const totalXp = Math.max(0, Number.parseInt(pairs.get('user_total_xp') ?? '0', 10) || 0);
  const weeklyXp = Math.max(0, Number.parseInt(pairs.get('weekly_xp') ?? '0', 10) || 0);
  const streakCount = Math.max(0, Number.parseInt(pairs.get('streak_count') ?? '0', 10) || 0);
  const activityDate = pairs.get('last_active_date');
  let unlockedLessons: string[] = [];
  try {
    const parsed: unknown = JSON.parse(pairs.get('unlocked_lessons') ?? '[]');
    if (Array.isArray(parsed)) unlockedLessons = parsed.map(String).sort();
  } catch (e) {
      // malformed legacy projection starts empty
      DebugLogger.error('personal_progress_store:activityDate', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return Object.freeze({
    totalXp,
    level: getLevelFromXP(totalXp),
    weeklyXp,
    activityDates: Object.freeze(activityDate ? [activityDate] : []),
    streakCount,
    completedLessons: Object.freeze([]),
    passedExams: Object.freeze([]),
    unlockedLessons: Object.freeze(unlockedLessons),
    bestResults: Object.freeze({}),
  });
}

const globalStore = createPersonalProgressStore({
  usePhoneState: () => {
    // Required lazily to keep this store independent from cutover routing at
    // module initialization and avoid a publish/router import cycle.
    const cutover = require('./phone_state_progress_cutover') as typeof import('./phone_state_progress_cutover');
    return cutover.isPhoneStateCutoverEnabled(
      require('./account_generation').captureAccountGeneration().stableId,
    );
  },
  readPhoneState: async () => {
    const cutover = await import('./phone_state_progress_cutover');
    const api = cutover.getPhoneStateProgressApi();
    if (!api) throw new Error('phone_state_progress_unavailable');
    return api.read();
  },
  readLegacy: readLegacyProjection,
});

export async function hydratePersonalProgress(): Promise<PersonalProgressSnapshot> {
  const result = await globalStore.hydrate();
  patchAppSnapshotFromPersonalProgress(result);
  return result;
}

export function publishPersonalProgressProjection(
  projection: PersonalProgressProjection,
  source: 'phone_state' | 'legacy' = 'phone_state',
): void {
  globalStore.publish(projection, source);
  patchAppSnapshotFromPersonalProgress(globalStore.getSnapshot());
}

export function getPersonalProgressSnapshot(): PersonalProgressSnapshot {
  return globalStore.getSnapshot();
}

export function subscribePersonalProgress(listener: () => void): () => void {
  return globalStore.subscribe(listener);
}

export function resetPersonalProgressForAccountTransition(): void {
  globalStore.reset();
}

export function usePersonalProgressSnapshot(): PersonalProgressSnapshot {
  return useSyncExternalStore(
    subscribePersonalProgress,
    getPersonalProgressSnapshot,
    getPersonalProgressSnapshot,
  );
}

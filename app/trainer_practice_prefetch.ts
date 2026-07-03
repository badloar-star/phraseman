import { computeFrenchPhraseAnalytics } from './french_phrase_analytics';
import { ensureFrenchRemotePersonalPractice } from './french_personal_practice_remote_runtime';
import { computePhraseAnalytics, type PhraseAnalyticsResult } from './phrase_analytics';
import { loadResolvedPersonalTrainings, type ResolvedPersonalTrainingsState } from './diagnosis_training_progress';
import { personalPracticeCoachEnabledForTarget } from './personal_practice_target_gate';
import { getVerifiedPremiumStatus } from './premium_guard';
import { getTrainerDashboard, type TrainerDashboard } from './trainer_store';
import { trainerSessionContentAvailableForTarget } from './trainer_target_gate';
import {
  storageSourceLocale,
  storageStudyTarget,
  type RuntimeSourceLocale,
  type RuntimeStudyTarget,
} from './target_storage_keys';

export interface TrainerPracticeSnapshot {
  dashboard: TrainerDashboard;
  hasPremium: boolean;
  analytics: PhraseAnalyticsResult | null;
  resolvedPersonalTrainings: ResolvedPersonalTrainingsState | null;
  createdAt: number;
}

interface TrainerPracticePrefetchParams {
  studyTarget?: RuntimeStudyTarget;
  sourceLocale?: RuntimeSourceLocale;
  force?: boolean;
}

const TRAINER_PRACTICE_SNAPSHOT_TTL_MS = 2 * 60 * 1000;
const snapshotCache = new Map<string, TrainerPracticeSnapshot>();
const inFlightSnapshots = new Map<string, Promise<TrainerPracticeSnapshot>>();

function trainerPracticeSnapshotKey(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): string {
  return `${storageStudyTarget(studyTarget)}::${storageSourceLocale(sourceLocale)}`;
}

export function getCachedTrainerPracticeSnapshot(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
  maxAgeMs = TRAINER_PRACTICE_SNAPSHOT_TTL_MS,
): TrainerPracticeSnapshot | null {
  const snapshot = snapshotCache.get(trainerPracticeSnapshotKey(studyTarget, sourceLocale));
  if (!snapshot) return null;
  if (Date.now() - snapshot.createdAt > maxAgeMs) return null;
  return snapshot;
}

async function loadTrainerPracticeAnalytics(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): Promise<PhraseAnalyticsResult | null> {
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return null;
  return storageStudyTarget(studyTarget) === 'fr'
    ? computeFrenchPhraseAnalytics({ sourceLocale }).catch(() => null)
    : computePhraseAnalytics().catch(() => null);
}

export async function prefetchTrainerPracticeSnapshot({
  studyTarget,
  sourceLocale,
  force = false,
}: TrainerPracticePrefetchParams): Promise<TrainerPracticeSnapshot> {
  const cacheKey = trainerPracticeSnapshotKey(studyTarget, sourceLocale);
  const inFlight = inFlightSnapshots.get(cacheKey);
  if (inFlight) return inFlight;

  if (!force) {
    const cached = getCachedTrainerPracticeSnapshot(studyTarget, sourceLocale);
    if (cached) return cached;
  }

  const normalizedSourceLocale = storageSourceLocale(sourceLocale);
  if (storageStudyTarget(studyTarget) === 'fr') {
    await ensureFrenchRemotePersonalPractice(normalizedSourceLocale).catch(() => {});
  }
  const analyticsPromise = loadTrainerPracticeAnalytics(studyTarget, normalizedSourceLocale);
  const snapshotPromise = Promise.all([
    getTrainerDashboard(studyTarget, normalizedSourceLocale, analyticsPromise),
    getVerifiedPremiumStatus().catch(() => false),
    analyticsPromise,
    personalPracticeCoachEnabledForTarget(studyTarget)
      ? loadResolvedPersonalTrainings({ studyTarget, sourceLocale: normalizedSourceLocale }).catch(() => null)
      : Promise.resolve(null),
  ]).then(([dashboard, hasPremium, analytics, resolvedPersonalTrainings]) => {
    const snapshot: TrainerPracticeSnapshot = {
      dashboard,
      hasPremium,
      analytics,
      resolvedPersonalTrainings,
      createdAt: Date.now(),
    };
    snapshotCache.set(cacheKey, snapshot);
    return snapshot;
  }).finally(() => {
    if (inFlightSnapshots.get(cacheKey) === snapshotPromise) {
      inFlightSnapshots.delete(cacheKey);
    }
  });

  inFlightSnapshots.set(cacheKey, snapshotPromise);
  return snapshotPromise;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

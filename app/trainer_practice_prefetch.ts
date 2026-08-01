import { computeFrenchPhraseAnalytics } from './french_phrase_analytics';
import { loadActivity365Analytics, type Activity365Day } from './activity_365_analytics';
import { computePhraseAnalytics, type PhraseAnalyticsResult } from './phrase_analytics';
import { loadResolvedPersonalTrainings, type ResolvedPersonalTrainingsState } from './diagnosis_training_progress';
import { personalPracticeCoachEnabledForTarget } from './personal_practice_target_gate';
import { getVerifiedPremiumStatus } from './premium_guard';
import { getTrainerDashboard, type TrainerDashboard } from './trainer_store';
import {
  peekRestoredTrainerPracticeSnapshot,
  rememberTrainerPracticeSnapshotOnDisk,
} from './trainer_practice_persist';
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
  activityDays: Activity365Day[];
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
  const key = trainerPracticeSnapshotKey(studyTarget, sourceLocale);
  const snapshot = snapshotCache.get(key);
  if (snapshot && Date.now() - snapshot.createdAt <= maxAgeMs) return snapshot;
  // зачем: snapshotCache живёт только в памяти процесса и всего 2 минуты, поэтому раздел
  // «Моя практика» открывался с нулями при холодном старте и даже при возврате через
  // 3 минуты. Дисковый снапшот прошлой сессии поднят бутстрапом — отдаём его для первого
  // кадра; loadData на фокусе всё равно вызывается с force и догонит свежие цифры.
  return peekRestoredTrainerPracticeSnapshot(key);
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
  const analyticsPromise = loadTrainerPracticeAnalytics(studyTarget, normalizedSourceLocale);
  const snapshotPromise = Promise.all([
    getTrainerDashboard(studyTarget, normalizedSourceLocale, analyticsPromise),
    getVerifiedPremiumStatus().catch(() => false),
    analyticsPromise,
    personalPracticeCoachEnabledForTarget(studyTarget)
      ? loadResolvedPersonalTrainings({ studyTarget, sourceLocale: normalizedSourceLocale }).catch(() => null)
      : Promise.resolve(null),
    loadActivity365Analytics(studyTarget).then((activity) => activity.days).catch(() => []),
  ]).then(([dashboard, hasPremium, analytics, resolvedPersonalTrainings, activityDays]) => {
    const snapshot: TrainerPracticeSnapshot = {
      dashboard,
      hasPremium,
      analytics,
      resolvedPersonalTrainings,
      activityDays,
      createdAt: Date.now(),
    };
    snapshotCache.set(cacheKey, snapshot);
    // зачем: зеркалим на диск, чтобы СЛЕДУЮЩЕЕ открытие «Моей практики» (в т.ч. первое
    // после холодного старта) рисовало цифры сразу. Запись фоновая — UI её не ждёт.
    rememberTrainerPracticeSnapshotOnDisk(cacheKey, snapshot);
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

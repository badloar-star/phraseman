import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiagnosisTrainingRuntimeState } from './diagnosis_training_types';
import type { WordCategory } from './pos_taxonomy';

const KEY_PREFIX = 'diagnosis_training_progress_v1:';
const FREE_ACCESS_KEY = 'diagnosis_training_free_access_v1';
const RESOLVED_PERSONAL_TRAININGS_KEY = 'resolved_personal_trainings_v1';

type FreeDiagnosisTrainingAccessState = {
  activeId?: string;
  coachCompletedAt?: number;
  completedAt?: number;
};

export type ResolvedPersonalTrainingsState = {
  categories: Partial<Record<WordCategory, number>>;
  diagnoses: Record<string, number>;
};

const emptyResolvedPersonalTrainingsState = (): ResolvedPersonalTrainingsState => ({
  categories: {},
  diagnoses: {},
});

async function loadFreeDiagnosisTrainingAccessState(): Promise<FreeDiagnosisTrainingAccessState> {
  try {
    const raw = await AsyncStorage.getItem(FREE_ACCESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveFreeDiagnosisTrainingAccessState(
  state: FreeDiagnosisTrainingAccessState,
): Promise<void> {
  await AsyncStorage.setItem(FREE_ACCESS_KEY, JSON.stringify(state));
}

export async function loadResolvedPersonalTrainings(): Promise<ResolvedPersonalTrainingsState> {
  try {
    const raw = await AsyncStorage.getItem(RESOLVED_PERSONAL_TRAININGS_KEY);
    if (!raw) return emptyResolvedPersonalTrainingsState();
    const parsed = JSON.parse(raw);
    return {
      categories: parsed?.categories && typeof parsed.categories === 'object' ? parsed.categories : {},
      diagnoses: parsed?.diagnoses && typeof parsed.diagnoses === 'object' ? parsed.diagnoses : {},
    };
  } catch {
    return emptyResolvedPersonalTrainingsState();
  }
}

async function saveResolvedPersonalTrainings(state: ResolvedPersonalTrainingsState): Promise<void> {
  await AsyncStorage.setItem(RESOLVED_PERSONAL_TRAININGS_KEY, JSON.stringify(state));
}

export async function markPersonalTrainingResolved(params: {
  category?: WordCategory;
  microDiagnosisId?: string;
  resolvedAt?: number;
}): Promise<void> {
  const resolvedAt = params.resolvedAt ?? Date.now();
  const microDiagnosisId = params.microDiagnosisId?.trim();
  if (!params.category && !microDiagnosisId) return;

  const state = await loadResolvedPersonalTrainings();
  await saveResolvedPersonalTrainings({
    categories: params.category
      ? { ...state.categories, [params.category]: resolvedAt }
      : state.categories,
    diagnoses: microDiagnosisId
      ? { ...state.diagnoses, [microDiagnosisId]: resolvedAt }
      : state.diagnoses,
  });
}

export function getPersonalTrainingResolvedAt(
  state: ResolvedPersonalTrainingsState,
  params: { category?: WordCategory; microDiagnosisId?: string },
): number {
  const categoryResolvedAt = params.category ? state.categories[params.category] ?? 0 : 0;
  const microResolvedAt = params.microDiagnosisId ? state.diagnoses[params.microDiagnosisId] ?? 0 : 0;
  return Math.max(categoryResolvedAt, microResolvedAt);
}

export async function saveDiagnosisTrainingProgress(
  id: string,
  state: DiagnosisTrainingRuntimeState,
): Promise<void> {
  await AsyncStorage.setItem(`${KEY_PREFIX}${id}`, JSON.stringify(state));
}

export async function loadDiagnosisTrainingProgress(
  id: string,
): Promise<DiagnosisTrainingRuntimeState | null> {
  try {
    const raw = await AsyncStorage.getItem(`${KEY_PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearDiagnosisTrainingProgress(id: string): Promise<void> {
  await AsyncStorage.removeItem(`${KEY_PREFIX}${id}`);
}

export async function reserveFreeDiagnosisTraining(id: string): Promise<boolean> {
  const normalizedId = id.trim();
  if (!normalizedId) return false;

  const state = await loadFreeDiagnosisTrainingAccessState();
  if (state.completedAt) return false;
  if (state.activeId && state.activeId !== normalizedId) return false;
  if (state.coachCompletedAt && state.activeId !== normalizedId) return false;

  await saveFreeDiagnosisTrainingAccessState({
    ...state,
    activeId: normalizedId,
  });
  return true;
}

export async function markFreeDiagnosisCoachCompleted(id: string): Promise<void> {
  const normalizedId = id.trim();
  if (!normalizedId) return;

  const state = await loadFreeDiagnosisTrainingAccessState();
  if (state.completedAt) return;
  if (state.activeId && state.activeId !== normalizedId) return;

  await saveFreeDiagnosisTrainingAccessState({
    ...state,
    activeId: normalizedId,
    coachCompletedAt: state.coachCompletedAt ?? Date.now(),
  });
}

export async function canUseFreeDiagnosisTrainingConsolidation(id: string): Promise<boolean> {
  const normalizedId = id.trim();
  if (!normalizedId) return false;

  const state = await loadFreeDiagnosisTrainingAccessState();
  return !state.completedAt && state.activeId === normalizedId;
}

export async function markFreeDiagnosisTrainingCompleted(id: string): Promise<void> {
  const normalizedId = id.trim();
  if (!normalizedId) return;

  const state = await loadFreeDiagnosisTrainingAccessState();
  if (state.activeId && state.activeId !== normalizedId) return;

  await saveFreeDiagnosisTrainingAccessState({
    ...state,
    activeId: normalizedId,
    coachCompletedAt: state.coachCompletedAt ?? Date.now(),
    completedAt: state.completedAt ?? Date.now(),
  });
}



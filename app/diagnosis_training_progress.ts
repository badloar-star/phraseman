import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiagnosisTrainingRuntimeState } from './diagnosis_training_types';
import type { WordCategory } from './pos_taxonomy';
import {
  personalPracticeFreeAccessKey,
  personalPracticeTrainingProgressKey,
  resolvedPersonalTrainingsKey,
  type RuntimeSourceLocale,
  type RuntimeStudyTarget,
} from './target_storage_keys';
import { personalPracticeCoachEnabledForTarget } from './personal_practice_target_gate';

type FreeDiagnosisTrainingAccessState = {
  activeId?: string;
  coachCompletedAt?: number;
  completedAt?: number;
};

type PersonalPracticeStorageScope = {
  studyTarget?: RuntimeStudyTarget;
  sourceLocale?: RuntimeSourceLocale;
};

export type ResolvedPersonalTrainingsState = {
  categories: Partial<Record<WordCategory, number>>;
  diagnoses: Record<string, number>;
};

const emptyResolvedPersonalTrainingsState = (): ResolvedPersonalTrainingsState => ({
  categories: {},
  diagnoses: {},
});

function personalPracticeMutationsAllowed(scope?: PersonalPracticeStorageScope): boolean {
  return personalPracticeCoachEnabledForTarget(scope?.studyTarget);
}

async function loadFreeDiagnosisTrainingAccessState(
  scope?: PersonalPracticeStorageScope,
): Promise<FreeDiagnosisTrainingAccessState> {
  try {
    const raw = await AsyncStorage.getItem(personalPracticeFreeAccessKey(scope?.studyTarget, scope?.sourceLocale));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveFreeDiagnosisTrainingAccessState(
  state: FreeDiagnosisTrainingAccessState,
  scope?: PersonalPracticeStorageScope,
): Promise<void> {
  await AsyncStorage.setItem(personalPracticeFreeAccessKey(scope?.studyTarget, scope?.sourceLocale), JSON.stringify(state));
}

export async function loadResolvedPersonalTrainings(
  scope?: PersonalPracticeStorageScope,
): Promise<ResolvedPersonalTrainingsState> {
  try {
    const raw = await AsyncStorage.getItem(resolvedPersonalTrainingsKey(scope?.studyTarget, scope?.sourceLocale));
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

async function saveResolvedPersonalTrainings(
  state: ResolvedPersonalTrainingsState,
  scope?: PersonalPracticeStorageScope,
): Promise<void> {
  await AsyncStorage.setItem(resolvedPersonalTrainingsKey(scope?.studyTarget, scope?.sourceLocale), JSON.stringify(state));
}

export async function markPersonalTrainingResolved(params: {
  category?: WordCategory;
  microDiagnosisId?: string;
  resolvedAt?: number;
} & PersonalPracticeStorageScope): Promise<boolean> {
  if (!personalPracticeMutationsAllowed(params)) return false;
  const resolvedAt = params.resolvedAt ?? Date.now();
  const microDiagnosisId = params.microDiagnosisId?.trim();
  if (!params.category && !microDiagnosisId) return false;

  const state = await loadResolvedPersonalTrainings(params);
  await saveResolvedPersonalTrainings({
    categories: params.category
      ? { ...state.categories, [params.category]: resolvedAt }
      : state.categories,
    diagnoses: microDiagnosisId
      ? { ...state.diagnoses, [microDiagnosisId]: resolvedAt }
      : state.diagnoses,
  }, params);
  return true;
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
  scope?: PersonalPracticeStorageScope,
): Promise<void> {
  if (!personalPracticeMutationsAllowed(scope)) return;
  await AsyncStorage.setItem(personalPracticeTrainingProgressKey(id, scope?.studyTarget, scope?.sourceLocale), JSON.stringify(state));
}

export async function loadDiagnosisTrainingProgress(
  id: string,
  scope?: PersonalPracticeStorageScope,
): Promise<DiagnosisTrainingRuntimeState | null> {
  if (!personalPracticeMutationsAllowed(scope)) return null;
  try {
    const raw = await AsyncStorage.getItem(personalPracticeTrainingProgressKey(id, scope?.studyTarget, scope?.sourceLocale));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearDiagnosisTrainingProgress(id: string, scope?: PersonalPracticeStorageScope): Promise<void> {
  if (!personalPracticeMutationsAllowed(scope)) return;
  await AsyncStorage.removeItem(personalPracticeTrainingProgressKey(id, scope?.studyTarget, scope?.sourceLocale));
}

export async function reserveFreeDiagnosisTraining(id: string, scope?: PersonalPracticeStorageScope): Promise<boolean> {
  if (!personalPracticeMutationsAllowed(scope)) return false;
  const normalizedId = id.trim();
  if (!normalizedId) return false;

  const state = await loadFreeDiagnosisTrainingAccessState(scope);
  if (state.completedAt) return false;
  if (state.activeId && state.activeId !== normalizedId) return false;
  if (state.coachCompletedAt && state.activeId !== normalizedId) return false;

  await saveFreeDiagnosisTrainingAccessState({
    ...state,
    activeId: normalizedId,
  }, scope);
  return true;
}

export async function markFreeDiagnosisCoachCompleted(id: string, scope?: PersonalPracticeStorageScope): Promise<void> {
  if (!personalPracticeMutationsAllowed(scope)) return;
  const normalizedId = id.trim();
  if (!normalizedId) return;

  const state = await loadFreeDiagnosisTrainingAccessState(scope);
  if (state.completedAt) return;
  if (state.activeId && state.activeId !== normalizedId) return;

  await saveFreeDiagnosisTrainingAccessState({
    ...state,
    activeId: normalizedId,
    coachCompletedAt: state.coachCompletedAt ?? Date.now(),
  }, scope);
}

export async function canUseFreeDiagnosisTrainingConsolidation(id: string, scope?: PersonalPracticeStorageScope): Promise<boolean> {
  if (!personalPracticeMutationsAllowed(scope)) return false;
  const normalizedId = id.trim();
  if (!normalizedId) return false;

  const state = await loadFreeDiagnosisTrainingAccessState(scope);
  return !state.completedAt && state.activeId === normalizedId;
}

export async function markFreeDiagnosisTrainingCompleted(id: string, scope?: PersonalPracticeStorageScope): Promise<void> {
  if (!personalPracticeMutationsAllowed(scope)) return;
  const normalizedId = id.trim();
  if (!normalizedId) return;

  const state = await loadFreeDiagnosisTrainingAccessState(scope);
  if (state.activeId && state.activeId !== normalizedId) return;

  await saveFreeDiagnosisTrainingAccessState({
    ...state,
    activeId: normalizedId,
    coachCompletedAt: state.coachCompletedAt ?? Date.now(),
    completedAt: state.completedAt ?? Date.now(),
  }, scope);
}

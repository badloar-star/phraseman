import type { Lang } from '../constants/i18n';
import {
  LEARNING_LANGUAGE_CONTOURS,
  LEARNING_LANGUAGE_TARGETS,
  isLearningLanguageTarget,
  type LearningLanguageTarget,
} from './learning_language_contour';

type AsyncStorageAdapter = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

type DeviceEventEmitterAdapter = {
  emit(event: string): void;
};

function getAsyncStorage(): AsyncStorageAdapter {
  return require('@react-native-async-storage/async-storage').default as AsyncStorageAdapter;
}

function getDeviceEventEmitter(): DeviceEventEmitterAdapter {
  return require('react-native').DeviceEventEmitter as DeviceEventEmitterAdapter;
}

export type StudyTarget = LearningLanguageTarget;
export type SourceLocale = 'ru' | 'uk';
export type ProductionStudyTarget = StudyTarget;

export const INTERNAL_STUDY_TARGETS = LEARNING_LANGUAGE_TARGETS;
export const STUDY_TARGETS = LEARNING_LANGUAGE_TARGETS;
export const SOURCE_LOCALES = ['ru', 'uk'] as const;
export const DEFAULT_STUDY_TARGET = 'en' as const;
export const STUDY_TARGET_STORAGE_KEY = 'study_target_v1';
export const STUDY_TARGET_CHANGED = 'study_target_changed';

export const STUDY_TARGET_META = Object.freeze(
  Object.fromEntries(
    LEARNING_LANGUAGE_TARGETS.map((target) => [
      target,
      Object.freeze({
        code: target,
        ttsLocale: LEARNING_LANGUAGE_CONTOURS[target].speechLocale,
        sourceLocales: SOURCE_LOCALES,
      }),
    ]),
  ),
) as Readonly<Record<StudyTarget, {
  code: StudyTarget;
  ttsLocale: 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE';
  sourceLocales: typeof SOURCE_LOCALES;
}>>;

export function isStudyTarget(value: unknown): value is StudyTarget {
  return isLearningLanguageTarget(value);
}

export function isProductionStudyTarget(value: unknown): value is ProductionStudyTarget {
  return isLearningLanguageTarget(value);
}

export function isStudyTargetSourceLocale(value: unknown): value is SourceLocale {
  return value === 'ru' || value === 'uk';
}

export function assertStudyTarget(value: unknown): StudyTarget {
  if (isStudyTarget(value)) return value;
  throw new Error('Unsupported StudyTarget: ' + String(value));
}

export function defaultStudyTarget(): typeof DEFAULT_STUDY_TARGET {
  return DEFAULT_STUDY_TARGET;
}

export function ttsLocaleForProductionStudyTarget(studyTarget: ProductionStudyTarget): 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE' {
  return STUDY_TARGET_META[studyTarget].ttsLocale;
}

export function studyTargetsForSourceLocale(_uiLang: Lang): readonly ProductionStudyTarget[] {
  return STUDY_TARGETS;
}

export function emitStudyTargetChanged(): void {
  getDeviceEventEmitter().emit(STUDY_TARGET_CHANGED);
}

export async function getStoredStudyTarget(uiLang: Lang): Promise<ProductionStudyTarget> {
  const AsyncStorage = getAsyncStorage();
  const raw = await AsyncStorage.getItem(STUDY_TARGET_STORAGE_KEY);
  if (isProductionStudyTarget(raw)) return raw;
  if (raw != null) await AsyncStorage.setItem(STUDY_TARGET_STORAGE_KEY, DEFAULT_STUDY_TARGET);
  return DEFAULT_STUDY_TARGET;
}

export async function setStoredStudyTarget(target: StudyTarget, uiLang: Lang): Promise<ProductionStudyTarget> {
  const next = isProductionStudyTarget(target)
    ? target
    : DEFAULT_STUDY_TARGET;
  const AsyncStorage = getAsyncStorage();
  await AsyncStorage.setItem(STUDY_TARGET_STORAGE_KEY, next);
  emitStudyTargetChanged();
  return next;
}

export default function __StudyTargetRouteShim() {
  return null;
}

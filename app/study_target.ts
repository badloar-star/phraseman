import type { Lang } from '../constants/i18n';

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

export type StudyTarget = 'en' | 'fr';
export type SourceLocale = 'ru' | 'uk';
export type ProductionStudyTarget = 'en';

export const INTERNAL_STUDY_TARGETS = ['en', 'fr'] as const;
export const STUDY_TARGETS = ['en'] as const;
export const SOURCE_LOCALES = ['ru', 'uk'] as const;
export const DEFAULT_STUDY_TARGET = 'en' as const;
export const STUDY_TARGET_STORAGE_KEY = 'study_target_v1';
export const STUDY_TARGET_CHANGED = 'study_target_changed';

export const STUDY_TARGET_META = {
  en: {
    code: 'en',
    ttsLocale: 'en-US',
    sourceLocales: SOURCE_LOCALES,
  },
  fr: {
    code: 'fr',
    ttsLocale: 'fr-FR',
    sourceLocales: SOURCE_LOCALES,
  },
} as const satisfies Record<StudyTarget, {
  code: StudyTarget;
  ttsLocale: 'en-US' | 'fr-FR';
  sourceLocales: typeof SOURCE_LOCALES;
}>;

export function isStudyTarget(value: unknown): value is StudyTarget {
  return typeof value === 'string' && INTERNAL_STUDY_TARGETS.includes(value as StudyTarget);
}

export function isProductionStudyTarget(value: unknown): value is ProductionStudyTarget {
  return value === DEFAULT_STUDY_TARGET;
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

export function ttsLocaleForProductionStudyTarget(studyTarget: ProductionStudyTarget): 'en-US' {
  return STUDY_TARGET_META[studyTarget].ttsLocale;
}

export function studyTargetsForSourceLocale(uiLang: Lang): readonly ProductionStudyTarget[] {
  return isStudyTargetSourceLocale(uiLang) ? STUDY_TARGETS : [DEFAULT_STUDY_TARGET];
}

export function emitStudyTargetChanged(): void {
  getDeviceEventEmitter().emit(STUDY_TARGET_CHANGED);
}

export async function getStoredStudyTarget(uiLang: Lang): Promise<ProductionStudyTarget> {
  if (!isStudyTargetSourceLocale(uiLang)) return DEFAULT_STUDY_TARGET;
  const AsyncStorage = getAsyncStorage();
  const raw = await AsyncStorage.getItem(STUDY_TARGET_STORAGE_KEY);
  if (isProductionStudyTarget(raw)) return raw;
  if (raw != null) await AsyncStorage.setItem(STUDY_TARGET_STORAGE_KEY, DEFAULT_STUDY_TARGET);
  return DEFAULT_STUDY_TARGET;
}

export async function setStoredStudyTarget(target: StudyTarget, uiLang: Lang): Promise<ProductionStudyTarget> {
  const next = isStudyTargetSourceLocale(uiLang) && isProductionStudyTarget(target)
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

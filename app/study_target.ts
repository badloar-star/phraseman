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

export type StudyTarget = string;
export type SourceLocale = 'ru' | 'uk';
export type ProductionStudyTarget = StudyTarget;

export const INTERNAL_STUDY_TARGETS = ['en', 'fr'] as const;
export const STUDY_TARGETS = ['en'] as const;
export const SOURCE_LOCALES = ['ru', 'uk'] as const;
export const DEFAULT_STUDY_TARGET = 'en' as const;
export const STUDY_TARGET_STORAGE_KEY = 'study_target_v1';
export const STUDY_TARGET_CHANGED = 'study_target_changed';

export const STUDY_TARGET_META: Readonly<Record<string, {
  code: string;
  ttsLocale: string;
  sourceLocales: typeof SOURCE_LOCALES;
}>> = {
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
} as const;

const runtimeTargetsBySource = new Map<SourceLocale, readonly ProductionStudyTarget[]>([
  ['ru', STUDY_TARGETS],
  ['uk', STUDY_TARGETS],
]);

export function isStudyTarget(value: unknown): value is StudyTarget {
  return typeof value === 'string' && /^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(value);
}

export function isProductionStudyTarget(value: unknown): value is ProductionStudyTarget {
  return isStudyTarget(value);
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

export function ttsLocaleForProductionStudyTarget(studyTarget: ProductionStudyTarget): string {
  return STUDY_TARGET_META[studyTarget]?.ttsLocale ?? studyTarget;
}

export function studyTargetsForSourceLocale(uiLang: Lang): readonly ProductionStudyTarget[] {
  return isStudyTargetSourceLocale(uiLang) ? runtimeTargetsBySource.get(uiLang) ?? STUDY_TARGETS : [DEFAULT_STUDY_TARGET];
}

export function setRuntimeStudyTargetCatalog(entries: readonly { studyTarget: string; learnerSourceLocale: string }[]): void {
  for (const sourceLocale of SOURCE_LOCALES) {
    const targets = entries
      .filter((entry) => entry.learnerSourceLocale === sourceLocale && isStudyTarget(entry.studyTarget))
      .map((entry) => entry.studyTarget);
    runtimeTargetsBySource.set(sourceLocale, Object.freeze([...new Set([DEFAULT_STUDY_TARGET, ...targets])].sort()));
  }
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

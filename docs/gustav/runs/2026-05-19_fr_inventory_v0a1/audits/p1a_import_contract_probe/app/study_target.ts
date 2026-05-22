export type StudyTarget = 'en' | 'fr';
export type SourceLocale = 'ru' | 'uk';

export const STUDY_TARGETS = ['en', 'fr'] as const;
export const SOURCE_LOCALES = ['ru', 'uk'] as const;
export const DEFAULT_STUDY_TARGET = 'en' as const;
export const STUDY_TARGET_STORAGE_KEY = 'study_target_v1';

export function isStudyTarget(value: unknown): value is StudyTarget {
  return value === 'en' || value === 'fr';
}

export function assertStudyTarget(value: unknown): StudyTarget {
  if (isStudyTarget(value)) return value;
  throw new Error('Unsupported StudyTarget');
}

export function defaultStudyTarget(): 'en' {
  return DEFAULT_STUDY_TARGET;
}

export default function __StudyTargetRouteShim() {
  return null;
}


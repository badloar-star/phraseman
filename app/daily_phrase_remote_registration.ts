import { ENABLE_DEV_STUDY_TARGET_LANG, IS_STORE_RELEASE } from './config';

export type DailyPhraseDevTarget = 'es' | 'de' | 'it';
export type DailyPhraseDevSourceLocale = 'ru' | 'uk';

export type DailyPhraseDevRemoteRegistration = {
  studyTarget: DailyPhraseDevTarget;
  sourceLocale: DailyPhraseDevSourceLocale;
  surface: 'daily_phrase';
  manifestUrl: string;
  rowUrl: (inPackPath: string) => string;
};

type DailyPhraseDevActivationResolver = () => boolean;

const STORAGE_HOST = 'https://firebasestorage.googleapis.com';
const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const SAFE_JSON_FILE = /^[A-Za-z0-9._-]+\.json$/;

export const DAILY_PHRASE_DEV_CONTENT_VERSION = '2026.10.04.editorial-accepted-dev-v1';

export function isDailyPhraseDevServerRuntimeEnabled(): boolean {
  return ENABLE_DEV_STUDY_TARGET_LANG && !IS_STORE_RELEASE;
}

export function normalizeDailyPhraseDevTarget(value: unknown): DailyPhraseDevTarget | null {
  return value === 'es' || value === 'de' || value === 'it' ? value : null;
}

export function normalizeDailyPhraseDevSourceLocale(value: unknown): DailyPhraseDevSourceLocale | null {
  return value === 'ru' || value === 'uk' ? value : null;
}

export function dailyPhraseDevObjectPrefix(
  studyTarget: DailyPhraseDevTarget,
  sourceLocale: DailyPhraseDevSourceLocale,
): string {
  return `course-packs/${studyTarget}/${sourceLocale}/daily_phrase/${DAILY_PHRASE_DEV_CONTENT_VERSION}`;
}

export function dailyPhraseDevStorageUrl(objectPath: string): string {
  return `${STORAGE_HOST}/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

export function sanitizeDailyPhraseDevInPackPath(inPackPath: string): string {
  if (typeof inPackPath !== 'string' || !SAFE_JSON_FILE.test(inPackPath)) {
    throw new Error('Daily Phrase dev in-pack path must be one safe JSON filename.');
  }
  return inPackPath;
}

export function getDailyPhraseDevServerPackRegistration(
  studyTargetInput: unknown,
  sourceLocaleInput: unknown,
  activationApproved: DailyPhraseDevActivationResolver = isDailyPhraseDevServerRuntimeEnabled,
): DailyPhraseDevRemoteRegistration | null {
  const studyTarget = normalizeDailyPhraseDevTarget(studyTargetInput);
  const sourceLocale = normalizeDailyPhraseDevSourceLocale(sourceLocaleInput);
  if (!studyTarget || !sourceLocale || !activationApproved()) return null;

  const prefix = dailyPhraseDevObjectPrefix(studyTarget, sourceLocale);
  return {
    studyTarget,
    sourceLocale,
    surface: 'daily_phrase',
    manifestUrl: dailyPhraseDevStorageUrl(`${prefix}/manifest.json`),
    rowUrl: (inPackPath: string) => dailyPhraseDevStorageUrl(
      `${prefix}/${sanitizeDailyPhraseDevInPackPath(inPackPath)}`,
    ),
  };
}

export default function __DailyPhraseRemoteRegistrationRouteShim() {
  return null;
}


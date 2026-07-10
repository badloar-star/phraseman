/**
 * Язык, который пользователь учит (целевой контент): только для dev-сборки.
 * Ключ не входит в cloud_sync — в проде не читается и не пишется.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import type { Lang } from '../constants/i18n';
import { ENABLE_DEV_STUDY_TARGET_LANG } from './config';
import type { StudyTarget } from './study_target';

export type StudyTargetLang = StudyTarget | 'es';
export type StudyTargetSourceUiLang = Extract<Lang, 'ru' | 'uk'>;

export const DEV_STUDY_TARGET_LANGS = ['en', 'es', 'fr'] as const satisfies readonly StudyTargetLang[];

const STORAGE_KEY = 'dev_study_target_lang';

/** Смена цели в настройках — обновить подписчиков (StudyTargetProvider). */
export const DEV_STUDY_TARGET_CHANGED = 'dev_study_target_changed';

export function emitDevStudyTargetChanged(): void {
  if (!ENABLE_DEV_STUDY_TARGET_LANG) return;
  DeviceEventEmitter.emit(DEV_STUDY_TARGET_CHANGED);
}

export function isStudyTargetSourceUiLang(uiLang: Lang): uiLang is StudyTargetSourceUiLang {
  return uiLang === 'ru' || uiLang === 'uk';
}

export function devStudyTargetsForUiLang(uiLang: Lang): readonly StudyTargetLang[] {
  if (isStudyTargetSourceUiLang(uiLang)) return DEV_STUDY_TARGET_LANGS;
  return ['en'];
}

const SOURCE_UI_STUDY_TARGET_LABELS: Record<StudyTargetSourceUiLang, Record<StudyTargetLang, string>> = {
  ru: {
    en: 'Английский',
    es: 'Испанский',
    fr: 'Французский',
  },
  uk: {
    en: 'Англійська',
    es: 'Іспанська',
    fr: 'Французька',
  },
};

export function studyTargetLabelForSourceUiLang(
  target: StudyTargetLang,
  uiLang: StudyTargetSourceUiLang,
): string {
  return SOURCE_UI_STUDY_TARGET_LABELS[uiLang][target] ?? target.toLocaleUpperCase();
}

function isAllowedForUiLang(value: unknown, uiLang: Lang): value is StudyTargetLang {
  return typeof value === 'string' && (devStudyTargetsForUiLang(uiLang) as readonly string[]).includes(value);
}

export async function getDevStudyTargetLang(uiLang: Lang): Promise<StudyTargetLang> {
  if (!ENABLE_DEV_STUDY_TARGET_LANG) return 'en';
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return isAllowedForUiLang(raw, uiLang) ? raw : 'en';
}

export async function setDevStudyTargetLang(
  target: StudyTargetLang,
  uiLang: Lang,
): Promise<void> {
  if (!ENABLE_DEV_STUDY_TARGET_LANG) return;
  await AsyncStorage.setItem(STORAGE_KEY, isAllowedForUiLang(target, uiLang) ? target : 'en');
}

/** При интерфейсе не RU/UK новый target не выбирается — только английский. */
export async function resetDevStudyTargetForSpanishUi(): Promise<void> {
  if (!ENABLE_DEV_STUDY_TARGET_LANG) return;
  await AsyncStorage.setItem(STORAGE_KEY, 'en');
}

/* expo-router: не регистрировать файл как экран */
export default function __StudyTargetLangDevRouteShim() {
  return null;
}

/**
 * Совместимый фасад для старых экранов, которые раньше хранили язык обучения
 * в отдельном dev-ключе. Новый выбор всегда идёт через единый канонический
 * `study_target_v1`: UI-сборка и dev-сборка должны показывать один контур.
 */
import { DeviceEventEmitter } from 'react-native';
import type { Lang } from '../constants/i18n';
import {
  getStoredStudyTarget,
  setStoredStudyTarget,
  STUDY_TARGETS,
  type StudyTarget,
} from './study_target';

export type StudyTargetLang = StudyTarget;
export type StudyTargetSourceUiLang = Extract<Lang, 'ru' | 'uk'>;

export const DEV_STUDY_TARGET_LANGS = STUDY_TARGETS;

/** Смена цели в настройках — обновить подписчиков (StudyTargetProvider). */
export const DEV_STUDY_TARGET_CHANGED = 'dev_study_target_changed';

export function emitDevStudyTargetChanged(): void {
  DeviceEventEmitter.emit(DEV_STUDY_TARGET_CHANGED);
}

export function isStudyTargetSourceUiLang(uiLang: Lang): uiLang is StudyTargetSourceUiLang {
  return uiLang === 'ru' || uiLang === 'uk';
}

export function devStudyTargetsForUiLang(uiLang: Lang): readonly StudyTargetLang[] {
  void uiLang;
  return DEV_STUDY_TARGET_LANGS;
}

const SOURCE_UI_STUDY_TARGET_LABELS: Record<StudyTargetSourceUiLang, Record<StudyTargetLang, string>> = {
  ru: {
    en: 'Английский',
    es: 'Испанский',
    fr: 'Французский',
    de: 'Немецкий',
  },
  uk: {
    en: 'Англійська',
    es: 'Іспанська',
    fr: 'Французька',
    de: 'Німецька',
  },
};

export function studyTargetLabelForSourceUiLang(
  target: StudyTargetLang,
  uiLang: StudyTargetSourceUiLang,
): string {
  return SOURCE_UI_STUDY_TARGET_LABELS[uiLang][target];
}

function isAllowedForUiLang(value: unknown, uiLang: Lang): value is StudyTargetLang {
  return typeof value === 'string' && (devStudyTargetsForUiLang(uiLang) as readonly string[]).includes(value);
}

export async function getDevStudyTargetLang(uiLang: Lang): Promise<StudyTargetLang> {
  return getStoredStudyTarget(uiLang);
}

export async function setDevStudyTargetLang(
  target: StudyTargetLang,
  uiLang: Lang,
): Promise<void> {
  await setStoredStudyTarget(isAllowedForUiLang(target, uiLang) ? target : 'en', uiLang);
}

/**
 * Язык интерфейса не должен менять изучаемый язык. Сохраняем no-op только для
 * старого вызова из LangContext, чтобы переход UI-языка не сбрасывал контур.
 */
export async function resetDevStudyTargetForSpanishUi(): Promise<void> {
  return Promise.resolve();
}

/* expo-router: не регистрировать файл как экран */
export default function __StudyTargetLangDevRouteShim() {
  return null;
}

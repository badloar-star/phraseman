/**
 * Язык, который пользователь учит (целевой контент): только для dev-сборки.
 * Ключ не входит в cloud_sync — в проде не читается и не пишется.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import type { Lang } from '../constants/i18n';
import { ENABLE_DEV_STUDY_TARGET_LANG } from './config';

export type StudyTargetLang = 'en' | 'es';

const STORAGE_KEY = 'dev_study_target_lang';

/** Смена цели в настройках — обновить подписчиков (StudyTargetProvider). */
export const DEV_STUDY_TARGET_CHANGED = 'dev_study_target_changed';

export function emitDevStudyTargetChanged(): void {
  if (!ENABLE_DEV_STUDY_TARGET_LANG) return;
  DeviceEventEmitter.emit(DEV_STUDY_TARGET_CHANGED);
}

export async function getDevStudyTargetLang(uiLang: Lang): Promise<StudyTargetLang> {
  if (!ENABLE_DEV_STUDY_TARGET_LANG) return 'en';
  if (uiLang === 'es') return 'en';
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === 'es') return 'es';
  return 'en';
}

export async function setDevStudyTargetLang(
  target: StudyTargetLang,
  uiLang: Lang,
): Promise<void> {
  if (!ENABLE_DEV_STUDY_TARGET_LANG) return;
  if (uiLang === 'es') {
    await AsyncStorage.setItem(STORAGE_KEY, 'en');
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, target);
}

/** При интерфейсе на испанском нельзя учить испанский — только английский. */
export async function resetDevStudyTargetForSpanishUi(): Promise<void> {
  if (!ENABLE_DEV_STUDY_TARGET_LANG) return;
  await AsyncStorage.setItem(STORAGE_KEY, 'en');
}

/* expo-router: не регистрировать файл как экран */
export default function __StudyTargetLangDevRouteShim() {
  return null;
}

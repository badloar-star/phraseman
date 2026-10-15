// Одноразовое окно «что нового» после релиза. Не смешиваем с Firebase broadcast.
//
// Новые установки после порога календаря не видят модалку (install_date задаётся на первом запуске).
// Перед выпуском: подстройте RELEASE_NOTES_NEW_USER_CUTOFF_MS (начало дня выкладки в стор).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppReleaseBuildId } from './app_build_id';
import { IS_EXPO_GO } from './config';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

/** Включатель текущей одноразовой кампании «что нового». */
// зачем (владелец 15.10, страховка Ревизора a5702f09b): в 2.0 никаких окон «что нового» — ни нового, ни старого 1.6.12;
// раньше старое держали только ворота 2.0 в _layout, теперь закрыто и здесь.
export const RELEASE_NOTES_MODAL_ENABLED = false;

/**
 * Тексты описывают возможности build 118. На более раннем билде окно нельзя
 * показывать: часть обещанного ещё отсутствует у пользователя.
 */
export const RELEASE_NOTES_MIN_BUILD_ID = 118;

/**
 * Установки с первого запуска в день выхода build 118 или позже уже начинают
 * с новыми правилами. Им ретроспективное объяснение только помешает.
 */
export const RELEASE_NOTES_NEW_USER_CUTOFF_MS = Date.UTC(2026, 7, 28, 0, 0, 0, 0);

/**
 * зачем: ключ привязан к конкретному релизу. Старый ключ означал бы, что все, кто
 * закрыл прошлогоднее окно «что нового», это окно уже не увидят.
 */
const DISMISS_KEY = 'release_notes_dismissed_2026_08_28_v1612';

export async function shouldOfferReleaseNotesModal(): Promise<boolean> {
  if (!RELEASE_NOTES_MODAL_ENABLED) return false;
  if (IS_EXPO_GO) return false;
  if (getAppReleaseBuildId() < RELEASE_NOTES_MIN_BUILD_ID) return false;

  const [dismissed, installRaw, onboarding] = await AsyncStorage.multiGet([
    DISMISS_KEY,
    'install_date',
    'onboarding_done',
  ]);
  if (dismissed[1] === '1') return false;
  if (onboarding[1] !== '1') return false;

  const installAt = parseInt(installRaw[1] || '0', 10);
  if (!Number.isFinite(installAt) || installAt <= 0) return false;
  if (installAt >= RELEASE_NOTES_NEW_USER_CUTOFF_MS) return false;

  return true;
}

export async function dismissReleaseNotesModalPermanently(): Promise<void> {
  await AsyncStorage.setItem(DISMISS_KEY, '1').catch(noteSwallowedHandler('release_notes_modal:promise_1'));
}

/* expo-router route shim */
export default function __RouteShim() {
  return null;
}

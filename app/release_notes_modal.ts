// Одноразовое окно «что нового» после релиза. Не смешиваем с Firebase broadcast.
//
// Новые установки после порога календаря не видят модалку (install_date задаётся на первом запуске).
// Перед выпуском: подстройте RELEASE_NOTES_NEW_USER_CUTOFF_MS (начало дня выкладки в стор).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppReleaseBuildId } from './app_build_id';
import { IS_EXPO_GO } from './config';

/** false — окно «что нового» не показываем (текст устарел / не нужен). */
export const RELEASE_NOTES_MODAL_ENABLED = true;
export const RELEASE_NOTES_MIN_BUILD_ID = 71;

/**
 * Установки с первого запуска не раньше этого момента (UTC) считаются «новыми» — окно не показываем.
 * Для текущего релиза берём сегодняшнюю дату: новые установки 16 мая 2026 и позже не видят окно.
 */
export const RELEASE_NOTES_NEW_USER_CUTOFF_MS = Date.UTC(2026, 4, 16, 0, 0, 0, 0);

const DISMISS_KEY = 'release_notes_dismissed_2026_05_15_premium_v1';

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
  await AsyncStorage.setItem(DISMISS_KEY, '1').catch(() => {});
}

/* expo-router route shim */
export default function __RouteShim() {
  return null;
}

// Одноразовое окно «что нового» после релиза. Не смешиваем с Firebase broadcast.
//
// Новые установки после порога календаря не видят модалку (install_date задаётся на первом запуске).
// Перед выпуском: подстройте RELEASE_NOTES_NEW_USER_CUTOFF_MS (начало дня выкладки в стор).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppReleaseBuildId } from './app_build_id';
import { IS_EXPO_GO } from './config';

/** false — окно «что нового» не показываем (текст устарел / не нужен). */
export const RELEASE_NOTES_MODAL_ENABLED = true;

/**
 * зачем: тексты окна описывают релиз 1.6.0 (переименование валюты и раздела,
 * снятие платы). На билдах до 104 этих изменений ещё нет — окно рассказало бы
 * о том, чего пользователь у себя не увидит.
 */
export const RELEASE_NOTES_MIN_BUILD_ID = 104;

/**
 * Установки с первого запуска не раньше этого момента (UTC) считаются «новыми» — окно не показываем.
 * Окно «что нового» видят ТОЛЬКО те, у кого приложение стояло ДО 26 июля 2026 (день выкладки
 * билда 104); установки 26 июля 2026 и позже — это новые юзеры, они застали уже переименованные
 * «жемчужины» и «Турнир», и рассказ про переезд их только запутает.
 */
export const RELEASE_NOTES_NEW_USER_CUTOFF_MS = Date.UTC(2026, 6, 26, 0, 0, 0, 0);

/**
 * зачем: ключ привязан к конкретному релизу. Старый ключ означал бы, что все, кто
 * закрыл прошлогоднее окно «что нового», это окно уже не увидят.
 */
const DISMISS_KEY = 'release_notes_dismissed_2026_07_26_v160';

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

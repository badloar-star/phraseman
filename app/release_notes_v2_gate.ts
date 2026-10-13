import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppReleaseBuildId } from './app_build_id';
import { IS_EXPO_GO } from './config';

export type ReleaseNotesV2Release = Readonly<{
  minBuildId: number;
  newUserCutoffMs: number;
}>;

const DISMISS_KEY = 'release_notes_v2_dismissed_v1';

// зачем (координатор 13.10, №34, сборка 16.10): окно «Что нового · 2.0» должно показаться ОДИН раз тем, кто обновился со старой версии (1.6.x), и не показаться новым
// установкам. minBuildId — versionCode/buildNumber сборки 16.10 (app.json = 132, appVersionSource local, автоинкремента нет: бамп только вверх, условие >= остаётся верным);
// newUserCutoffMs — начало дня выкладки 16.10 (UTC): install_date до него = «старый» пользователь, после — новичок. Ключ закрытия отдельный от кампании build-118.
export const RELEASE_2_0: ReleaseNotesV2Release = { minBuildId: 132, newUserCutoffMs: Date.UTC(2026, 9, 16) };

function configuredV2Release(): ReleaseNotesV2Release | null {
  return RELEASE_2_0;
}

export function isReleaseNotesV2ReleaseActive(): boolean {
  const release = configuredV2Release();
  return !!release && !IS_EXPO_GO && getAppReleaseBuildId() >= release.minBuildId;
}

export function isEligibleForReleaseNotesV2(
  release: ReleaseNotesV2Release | null,
  buildId: number,
  dismissed: boolean,
  onboardingDone: boolean,
  installedAt: number,
): boolean {
  return !!release
    && buildId >= release.minBuildId
    && !dismissed
    && onboardingDone
    && Number.isFinite(installedAt)
    && installedAt > 0
    && installedAt < release.newUserCutoffMs;
}

export async function shouldOfferReleaseNotesV2Modal(): Promise<boolean> {
  const release = configuredV2Release();
  if (!release || IS_EXPO_GO) return false;
  const [dismissed, installRaw, onboarding] = await AsyncStorage.multiGet([
    DISMISS_KEY,
    'install_date',
    'onboarding_done',
  ]);
  return isEligibleForReleaseNotesV2(
    release,
    getAppReleaseBuildId(),
    dismissed[1] === '1',
    onboarding[1] === '1',
    Number(installRaw[1]),
  );
}

export async function dismissReleaseNotesV2ModalPermanently(): Promise<void> {
  await AsyncStorage.setItem(DISMISS_KEY, '1');
}

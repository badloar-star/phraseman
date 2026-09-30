import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppReleaseBuildId } from './app_build_id';
import { IS_EXPO_GO } from './config';

export type ReleaseNotesV2Release = Readonly<{
  minBuildId: number;
  newUserCutoffMs: number;
}>;

const DISMISS_KEY = 'release_notes_v2_dismissed_v1';

/** Release 2.0 is not live. Supply its real build and rollout day only at release. */
function configuredV2Release(): ReleaseNotesV2Release | null {
  return null;
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

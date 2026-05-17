/* eslint-disable import/first */
jest.mock('../app/config', () => ({
  IS_EXPO_GO: false,
}));

const mockGetAppReleaseBuildId = jest.fn(() => 73);

jest.mock('../app/app_build_id', () => ({
  getAppReleaseBuildId: () => mockGetAppReleaseBuildId(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RELEASE_NOTES_NEW_USER_CUTOFF_MS,
  dismissReleaseNotesModalPermanently,
  shouldOfferReleaseNotesModal,
} from '../app/release_notes_modal';

const storage = AsyncStorage as typeof AsyncStorage & { __reset: () => void };

describe('release notes modal gate', () => {
  beforeEach(() => {
    storage.__reset();
    mockGetAppReleaseBuildId.mockReturnValue(73);
  });

  it('offers the modal to existing onboarded users on the release build', async () => {
    await AsyncStorage.multiSet([
      ['install_date', String(RELEASE_NOTES_NEW_USER_CUTOFF_MS - 1)],
      ['onboarding_done', '1'],
    ]);

    await expect(shouldOfferReleaseNotesModal()).resolves.toBe(true);
  });

  it('does not offer the modal to new users installed on or after the cutoff', async () => {
    await AsyncStorage.multiSet([
      ['install_date', String(RELEASE_NOTES_NEW_USER_CUTOFF_MS)],
      ['onboarding_done', '1'],
    ]);

    await expect(shouldOfferReleaseNotesModal()).resolves.toBe(false);
  });

  it('does not offer this modal again after dismissal', async () => {
    await AsyncStorage.multiSet([
      ['install_date', String(RELEASE_NOTES_NEW_USER_CUTOFF_MS - 1)],
      ['onboarding_done', '1'],
    ]);

    await dismissReleaseNotesModalPermanently();

    await expect(shouldOfferReleaseNotesModal()).resolves.toBe(false);
  });

  it('waits until the current build reaches the release build', async () => {
    mockGetAppReleaseBuildId.mockReturnValue(70);
    await AsyncStorage.multiSet([
      ['install_date', String(RELEASE_NOTES_NEW_USER_CUTOFF_MS - 1)],
      ['onboarding_done', '1'],
    ]);

    await expect(shouldOfferReleaseNotesModal()).resolves.toBe(false);
  });
});

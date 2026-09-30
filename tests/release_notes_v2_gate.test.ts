/* eslint-disable import/first */
jest.mock('../app/config', () => ({ IS_EXPO_GO: false }));
const mockBuildId = jest.fn(() => 118);
jest.mock('../app/app_build_id', () => ({ getAppReleaseBuildId: () => mockBuildId() }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  dismissReleaseNotesV2ModalPermanently,
  isEligibleForReleaseNotesV2,
  isReleaseNotesV2ReleaseActive,
  shouldOfferReleaseNotesV2Modal,
} from '../app/release_notes_v2_gate';

const storage = AsyncStorage as typeof AsyncStorage & { __reset: () => void };
const release = { minBuildId: 200, newUserCutoffMs: Date.UTC(2026, 9, 1) };

describe('release 2.0 notes gate', () => {
  beforeEach(() => {
    storage.__reset();
    mockBuildId.mockReturnValue(118);
  });

  it('stays off before the separate release is configured', async () => {
    expect(isReleaseNotesV2ReleaseActive()).toBe(false);
    await expect(shouldOfferReleaseNotesV2Modal()).resolves.toBe(false);
  });

  it('accepts only an older onboarded user on or after the configured build', () => {
    expect(isEligibleForReleaseNotesV2(release, 200, false, true, release.newUserCutoffMs - 1)).toBe(true);
    expect(isEligibleForReleaseNotesV2(release, 199, false, true, release.newUserCutoffMs - 1)).toBe(false);
    expect(isEligibleForReleaseNotesV2(release, 200, false, true, release.newUserCutoffMs)).toBe(false);
    expect(isEligibleForReleaseNotesV2(release, 200, false, false, release.newUserCutoffMs - 1)).toBe(false);
    expect(isEligibleForReleaseNotesV2(release, 200, true, true, release.newUserCutoffMs - 1)).toBe(false);
  });

  it('uses a dismissal key independent from the build-118 campaign', async () => {
    await dismissReleaseNotesV2ModalPermanently();
    await expect(AsyncStorage.getItem('release_notes_v2_dismissed_v1')).resolves.toBe('1');
    await expect(AsyncStorage.getItem('release_notes_dismissed_2026_08_28_v1612')).resolves.toBeNull();
  });
});

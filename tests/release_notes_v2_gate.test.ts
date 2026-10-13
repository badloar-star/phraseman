/* eslint-disable import/first */
jest.mock('../app/config', () => ({ IS_EXPO_GO: false }));
const mockBuildId = jest.fn(() => 118);
jest.mock('../app/app_build_id', () => ({ getAppReleaseBuildId: () => mockBuildId() }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RELEASE_2_0,
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

  it('is off on builds older than the 16.10 release (118 = 1.6.12 keeps the legacy campaign)', async () => {
    expect(isReleaseNotesV2ReleaseActive()).toBe(false);
    await expect(shouldOfferReleaseNotesV2Modal()).resolves.toBe(false);
  });

  // зачем (№34): окно показывается один раз обновившимся и не показывается новым установкам
  it('16.10 build: offers once to an onboarded user who installed before the rollout day, never to a new install, never again after dismissal', async () => {
    mockBuildId.mockReturnValue(132);
    expect(isReleaseNotesV2ReleaseActive()).toBe(true);
    await AsyncStorage.multiSet([['onboarding_done', '1'], ['install_date', String(Date.UTC(2026, 8, 1))]]);
    await expect(shouldOfferReleaseNotesV2Modal()).resolves.toBe(true);
    await dismissReleaseNotesV2ModalPermanently();
    await expect(shouldOfferReleaseNotesV2Modal()).resolves.toBe(false);
    storage.__reset();
    await AsyncStorage.multiSet([['onboarding_done', '1'], ['install_date', String(Date.UTC(2026, 9, 16, 8))]]);
    await expect(shouldOfferReleaseNotesV2Modal()).resolves.toBe(false);
    storage.__reset();
    await AsyncStorage.multiSet([['onboarding_done', '1']]);
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

  // зачем (координатор 13.10, №34): порог окна не должен уйти выше собираемой сборки — иначе окно молча не покажется на 16.10
  it('the release threshold never exceeds the build declared in app.json (Android versionCode and iOS buildNumber)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require('../app.json').expo;
    expect(RELEASE_2_0.minBuildId).toBeLessThanOrEqual(cfg.android.versionCode);
    expect(RELEASE_2_0.minBuildId).toBeLessThanOrEqual(parseInt(cfg.ios.buildNumber, 10));
  });
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

import {
  ANDROID_NAV_BAR_FALLBACK_INSET,
  normalizeSafeAreaBottomInset,
} from '../hooks/use-screen';

describe('normalizeSafeAreaBottomInset', () => {
  it('protects Android 3-button navigation when safe area reports zero', () => {
    expect(normalizeSafeAreaBottomInset(0, 'android')).toBe(ANDROID_NAV_BAR_FALLBACK_INSET);
  });

  it('keeps reported Android gesture/navigation inset when it exists', () => {
    expect(normalizeSafeAreaBottomInset(24, 'android')).toBe(24);
  });

  it('keeps zero inset on iOS devices without a bottom safe area', () => {
    expect(normalizeSafeAreaBottomInset(0, 'ios')).toBe(0);
  });
});

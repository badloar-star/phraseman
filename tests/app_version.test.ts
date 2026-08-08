import { getInstalledAppVersion } from '../app/app_version';

describe('getInstalledAppVersion', () => {
  it('uses the installed native app version instead of a potentially stale Expo manifest version', () => {
    expect(getInstalledAppVersion({
      nativeAppVersion: '1.5.63',
      expoConfig: { version: '1.5.41' },
    })).toBe('1.5.63');
  });

  it('falls back to the Expo config only when no native version exists', () => {
    expect(getInstalledAppVersion({ expoConfig: { version: '1.5.63' } })).toBe('1.5.63');
  });
});

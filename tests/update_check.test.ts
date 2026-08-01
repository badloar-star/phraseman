import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

jest.mock('../app/config', () => ({
  UPDATE_CHECK_URL: 'https://updates.example.test/version.json',
  STORE_URL_IOS: 'https://apps.apple.com/app/id6764800879',
  STORE_URL_ANDROID: 'https://play.google.com/store/apps/details?id=app.phraseman',
}));

import { checkForUpdate } from '../app/update_check';

const IOS_STORE_URL = 'https://apps.apple.com/app/id6764800879';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=app.phraseman';

declare const global: typeof globalThis & {
  __DEV__?: boolean;
  fetch: jest.Mock;
};

function setPlatform(os: 'ios' | 'android') {
  (Platform as unknown as { OS: 'ios' | 'android' }).OS = os;
}

function setBuildNumbers() {
  (Constants as unknown as { expoConfig: unknown }).expoConfig = {
    android: { versionCode: 75 },
    ios: { buildNumber: '75' },
  };
}

beforeEach(() => {
  global.__DEV__ = false;
  global.fetch = jest.fn();
  setPlatform('ios');
  setBuildNumbers();
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('checkForUpdate platform-specific version manifest', () => {
  it('checks the published version manifest instead of disabling update notices', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ versionCode: 76, message: 'Shared release' }),
    });

    await expect(checkForUpdate()).resolves.toEqual({
      available: true,
      storeUrl: IOS_STORE_URL,
      message: 'Shared release',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/badloar-star/phraseman-version/main/version.json',
      { cache: 'no-store' },
    );
  });

  it('shows an update on iOS when only the iOS manifest version is newer', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ios: { versionCode: 76, message: 'iOS ready' },
        android: { versionCode: 75, message: 'Android pending' },
      }),
    });

    await expect(checkForUpdate()).resolves.toEqual({
      available: true,
      storeUrl: IOS_STORE_URL,
      message: 'iOS ready',
    });
  });

  it('does not show an update on Android when only the iOS manifest version is newer', async () => {
    setPlatform('android');
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ios: { versionCode: 76, message: 'iOS ready' },
        android: { versionCode: 75, message: 'Android pending' },
      }),
    });

    await expect(checkForUpdate()).resolves.toBeNull();
  });

  it('keeps the legacy top-level manifest format working', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        versionCode: 76,
        message: 'Shared release',
      }),
    });

    await expect(checkForUpdate()).resolves.toEqual({
      available: true,
      storeUrl: IOS_STORE_URL,
      message: 'Shared release',
    });
  });

  it('uses the Android store link when the Android manifest version is newer', async () => {
    setPlatform('android');
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ios: { versionCode: 75, message: 'iOS current' },
        android: { versionCode: 76, message: 'Android ready' },
      }),
    });

    await expect(checkForUpdate()).resolves.toEqual({
      available: true,
      storeUrl: ANDROID_STORE_URL,
      message: 'Android ready',
    });
  });
});

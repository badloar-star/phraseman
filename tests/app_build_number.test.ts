// Жалобы 9/13 (25.10): app_errors писал buildNumber «unknown» у всех — номер берётся из конфигурации сборки.
import { resolveAppBuildNumberV1 } from '../app/app_build_number';

describe('app build number for crash reports', () => {
  it('native first, then platform config, then unknown', () => {
    expect(resolveAppBuildNumberV1({ nativeBuildVersion: '142', expoConfig: { ios: { buildNumber: '143' } } }, 'ios')).toBe('142');
    expect(resolveAppBuildNumberV1({ nativeBuildVersion: null, expoConfig: { ios: { buildNumber: '143' } } }, 'ios')).toBe('143');
    expect(resolveAppBuildNumberV1({ nativeBuildVersion: '', expoConfig: { android: { versionCode: 144 } } }, 'android')).toBe('144');
    expect(resolveAppBuildNumberV1({ expoConfig: null }, 'android')).toBe('unknown');
    expect(resolveAppBuildNumberV1({ expoConfig: { android: { versionCode: 144 } } }, 'web')).toBe('unknown');
  });
});

import { getInstalledAppVersion, getVersionForServerGate } from '../app/app_version';

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

describe('getVersionForServerGate', () => {
  it('passes a real version through untouched', () => {
    expect(getVersionForServerGate({ nativeAppVersion: '1.6.7' })).toBe('1.6.7');
    expect(getVersionForServerGate({ expoConfig: { version: '1.6' } })).toBe('1.6');
  });

  // Инцидент 2026-08-16: на Android nativeAppVersion пустой, аналитическая
  // функция отдавала 'unknown', сервер такую строку не разбирал и отвечал
  // «обнови приложение» — экран Арены показывал «не включена на сервере».
  it('never sends an unparsable version to the server gate', () => {
    for (const source of [
      { nativeAppVersion: null, expoConfig: null },
      { nativeAppVersion: '', expoConfig: { version: '' } },
      { nativeAppVersion: 'unknown' },
      { expoConfig: { version: 'dev-build' } },
    ]) {
      const version = getVersionForServerGate(source);
      expect(version).toBe('0.0.0');
      expect(version).toMatch(/^\d+(\.\d+)*$/);
    }
  });
});

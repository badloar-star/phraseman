import fs from 'fs';
import path from 'path';

jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  SPANISH_UI_LOCALE_ENABLED: false,
}));

import {
  coerceInterfaceLang,
  resolveBootstrapLocaleFromDeviceLocale,
} from '../constants/i18n';

const ROOT = path.resolve(__dirname, '..');

describe('bootstrap locale contract', () => {
  it('resolves only enabled startup interface languages', () => {
    expect(resolveBootstrapLocaleFromDeviceLocale('ru-RU')).toBe('ru');
    expect(resolveBootstrapLocaleFromDeviceLocale('uk-UA')).toBe('uk');
  });

  it('normalizes known aliases but falls back when a locale is not enabled', () => {
    expect(coerceInterfaceLang('pt_BR')).toBeNull();
    expect(resolveBootstrapLocaleFromDeviceLocale('pt_BR')).toBe('ru');
    expect(resolveBootstrapLocaleFromDeviceLocale('pt')).toBe('ru');
    expect(resolveBootstrapLocaleFromDeviceLocale('es-MX')).toBe('ru');
  });

  it('falls back safely for unknown or malformed device locales', () => {
    expect(resolveBootstrapLocaleFromDeviceLocale('en-US')).toBe('ru');
    expect(resolveBootstrapLocaleFromDeviceLocale('')).toBe('ru');
    expect(resolveBootstrapLocaleFromDeviceLocale(null)).toBe('ru');
  });

  it('does not add language or pack readiness to the native splash gate', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
    const match = layout.match(/const nativeSplashCanHide = ([^;]+);/);
    expect(match?.[1]).toBe('ready && (effectiveShowOnboarding || isBanned || firstContentReady)');
    expect(match?.[1]).not.toMatch(/lang|pack|manifest|download|network|hydrate/i);
  });

  it('does not read stored app_lang from the startup layout bootstrap path', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
    const bootstrapStart = layout.indexOf('const bootstrap = async () => {');
    const bootstrapReveal = layout.indexOf('clearTimeout(safetyTimer);', bootstrapStart);
    expect(bootstrapStart).toBeGreaterThan(-1);
    expect(bootstrapReveal).toBeGreaterThan(bootstrapStart);
    const bootstrapBeforeReveal = layout.slice(bootstrapStart, bootstrapReveal);
    expect(bootstrapBeforeReveal).not.toContain("AsyncStorage.getItem('app_lang')");
    expect(bootstrapBeforeReveal).not.toContain('AsyncStorage.getItem("app_lang")');
  });
});

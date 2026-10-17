// зачем (R119, координатор 17.10): после открытия английского существующая установка без явного выбора языка не должна
// сама переехать с русского на английский. Сторож: старая установка + de-DE → ru (записан и остаётся), новая + de-DE → en
// (ничего не пишем), uz-UZ → ru, pt-PT → pt-BR; перенос делается один раз; LangContext зовёт его, когда app_lang пуст.
import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockPersist = jest.fn(async (key: string, value: string) => { await AsyncStorage.setItem(key, value); });
jest.mock('../app/phone_state_preference_bridge', () => ({
  persistPortablePreference: (key: string, value: string) => mockPersist(key, value),
  readPortablePreference: async (key: string) => AsyncStorage.getItem(key),
}));
jest.mock('../app/config', () => ({ ...jest.requireActual('../app/config'), ENGLISH_UI_LOCALE_ENABLED: true }));
jest.mock('../app/dev_ui_lang', () => ({ ...jest.requireActual('../app/dev_ui_lang'), isDevUiLangEnOn: () => false }));

/* eslint-disable import/first -- seams are mocked first */
import { resolveBootstrapLocaleFromDeviceLocale, resolveLegacyBootstrapLocaleV1 } from '../constants/i18n';
import { UI_LANG_MIGRATION_DONE_KEY, isExistingInstallV1, migrateUiLangForExistingInstallOnce } from '../app/ui_lang_migration';
/* eslint-enable import/first */

describe('R119: язык существующих установок при открытии английского', () => {
  let log: jest.SpyInstance;
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockPersist.mockClear();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => log.mockRestore());

  test('старая установка + de-DE → ru записан в app_lang и остаётся', async () => {
    await AsyncStorage.setItem('onboarding_done', '1');
    const result = await migrateUiLangForExistingInstallOnce('de-DE');
    expect(result).toEqual({ lang: 'ru', reason: 'existing_install_kept_legacy' });
    expect(mockPersist).toHaveBeenCalledWith('app_lang', 'ru');
    expect(await AsyncStorage.getItem('app_lang')).toBe('ru');
    // второй запуск — уже сделано, ничего не перезаписывается
    const again = await migrateUiLangForExistingInstallOnce('de-DE');
    expect(again).toEqual({ lang: null, reason: 'already_done' });
    expect(mockPersist).toHaveBeenCalledTimes(1);
    expect(log.mock.calls.some(([tag, line]) => tag === '[UI-LANG-MIGRATE]' && String(line).includes('"wrote":"ru"'))).toBe(true);
  });

  test('новая установка + de-DE → новое правило (en), app_lang не пишется', async () => {
    const result = await migrateUiLangForExistingInstallOnce('de-DE');
    expect(result).toEqual({ lang: null, reason: 'new_install' });
    expect(mockPersist).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(UI_LANG_MIGRATION_DONE_KEY)).toBe('new_install');
    expect(resolveBootstrapLocaleFromDeviceLocale('de-DE')).toBe('en');
  });

  test('прогресс тоже признак существующей установки', () => {
    expect(isExistingInstallV1({ streak_count: '3' })).toBe(true);
    expect(isExistingInstallV1({ user_total_xp: '120' })).toBe(true);
    expect(isExistingInstallV1({ onboarding_completed_at_ms_v1: '1760000000000' })).toBe(true);
    expect(isExistingInstallV1({ onboarding_done: null, streak_count: '0' })).toBe(false);
  });

  test('uz-UZ → ru; pt-PT → pt-BR; старая установка с телефоном на нашем языке сохраняет его', async () => {
    expect(resolveBootstrapLocaleFromDeviceLocale('uz-UZ')).toBe('ru');
    expect(resolveBootstrapLocaleFromDeviceLocale('ka-GE')).toBe('ru');
    expect(resolveBootstrapLocaleFromDeviceLocale('ro-RO')).toBe('en');
    expect(resolveBootstrapLocaleFromDeviceLocale('pt-PT')).toBe('pt-BR');
    expect(resolveLegacyBootstrapLocaleV1('en-US')).toBe('ru');
    await AsyncStorage.setItem('onboarding_done', '1');
    expect(await migrateUiLangForExistingInstallOnce('pl-PL')).toEqual({ lang: 'pl', reason: 'existing_install_kept_legacy' });
  });

  test('LangContext зовёт перенос, только когда app_lang пуст, и не затирает выбор человека', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'LangContext.tsx'), 'utf8');
    expect(source).toContain("import { migrateUiLangForExistingInstallOnce } from '../app/ui_lang_migration';");
    expect(source).toMatch(/if \(typeof v === 'string'\) \{[\s\S]{0,200}?return;\s*\}[\s\S]{0,400}?return migrateUiLangForExistingInstallOnce\(\)/u);
    expect(source).toMatch(/if \(userChangedLangRef\.current\) \{\s*console\.log\(`\[UI-LANG-MIGRATE\] apply_skipped/u);
  });
});

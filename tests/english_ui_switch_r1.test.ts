// зачем (владелец п.76, координатор 12.10): английский интерфейс входит в R1. Сторож: при включённом флаге ENGLISH_UI_LOCALE_ENABLED
// (1) English есть в выборе языка Настроек в стор-сборке; (2) онбординг на телефоне с английской локалью стартует на английском
// (своего выбора языка интерфейса в онбординге нет — язык берётся из устройства, вид онбординга не меняем); (3) выбор в Настройках
// применяется сразу — состояние и снимок до записи на диск, без перезапуска. При выключенном флаге — прежнее поведение.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

function loadI18n(englishOn: boolean): typeof import('../constants/i18n') {
  let mod!: typeof import('../constants/i18n');
  jest.isolateModules(() => {
    jest.doMock('../app/config', () => ({
      ...jest.requireActual('../app/config'),
      ENGLISH_UI_LOCALE_ENABLED: englishOn,
      SPANISH_UI_LOCALE_ENABLED: true,
    }));
    jest.doMock('../app/dev_ui_lang', () => ({ isDevUiLangEnOn: () => false }));
    mod = require('../constants/i18n');
  });
  return mod;
}

describe('English interface in R1', () => {
  afterEach(() => { jest.dontMock('../app/config'); jest.dontMock('../app/dev_ui_lang'); });

  it('flag on: English is offered in the store language list and a device in English boots the onboarding in English', () => {
    const i18n = loadI18n(true);
    expect(i18n.getVisibleInterfaceLanguageOptions(true).map((o) => o.code)).toContain('en');
    expect(i18n.resolveBootstrapLocaleFromDeviceLocale('en-US')).toBe('en');
    expect(i18n.coerceInterfaceLang('en')).toBe('en');
    // зачем (координатор 17.10): язык телефона, которого у нас нет, → en; русскоязычный регион → ru
    expect(i18n.resolveBootstrapLocaleDecision('de-DE')).toEqual({ lang: 'en', reason: 'unknown_to_en' });
    expect(i18n.resolveBootstrapLocaleDecision('be-BY')).toEqual({ lang: 'ru', reason: 'ru_region' });
  });

  it('flag off: English stays hidden in the store and a device in English falls back to Russian', () => {
    const i18n = loadI18n(false);
    expect(i18n.getVisibleInterfaceLanguageOptions(true).map((o) => o.code)).not.toContain('en');
    expect(i18n.resolveBootstrapLocaleFromDeviceLocale('en-US')).toBe('ru');
    // пока английский закрыт, незнакомый язык телефона — прежний запасной ru
    expect(i18n.resolveBootstrapLocaleDecision('de-DE')).toEqual({ lang: 'ru', reason: 'unknown_to_ru_en_closed' });
  });

  it('a pick in Settings applies at once: state and peek before the disk write, then the change event', () => {
    const settings = read('app/settings_language.tsx');
    expect(settings).toContain('getVisibleInterfaceLanguageOptions(IS_STORE_RELEASE).map(');
    expect(settings).toContain('void setLang(interfaceCode);');
    const ctx = read('components/LangContext.tsx');
    const body = ctx.slice(ctx.indexOf('const setLang = useCallback(async (l: Lang) => {'));
    const apply = body.indexOf('setLangState(l);');
    expect(body.indexOf('writePeekAppLang(l);')).toBeLessThan(apply);
    expect(apply).toBeLessThan(body.indexOf('emitAppLangChanged(l, previous);'));
    expect(body.indexOf('emitAppLangChanged(l, previous);')).toBeLessThan(body.indexOf("await persistPortablePreference('app_lang', l);"));
  });
});

// Тесты готовности всех зарегистрированных языков интерфейса в проде.
// Проверяем: isInterfaceLangEnabled, coerceInterfaceLang и
// getVisibleInterfaceLanguageOptions с учётом store/dev сборки.
//
// зачем (2026-08-27): English UI активирован (ENGLISH_UI_LOCALE_ENABLED
// = true в app/config.ts) после подтверждённого 100% покрытия словаря —
// этот файл раньше фиксировал обратное («EN выключен»), теперь фиксирует
// активированное состояние.

jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  SPANISH_UI_LOCALE_ENABLED: true,
  ENGLISH_UI_LOCALE_ENABLED: true,
}));

import {
  INTERFACE_LANGS,
  INTERFACE_LANGUAGE_OPTIONS,
  INTERFACE_LANG_READY_FOR_PROD,
  coerceInterfaceLang,
  isInterfaceLangEnabled,
  getVisibleInterfaceLanguageOptions,
} from '../constants/i18n';
import { ACTIVE_INTERFACE_SOURCE_LOCALES } from '../app/source_locales';

const READY = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('гейт готовности интерфейса отделён от контентного охвата', () => {
  it('INTERFACE_LANGS остаётся 8 контентными source-локалями; English — чисто UI-язык сверху', () => {
    expect(INTERFACE_LANGS).toEqual(ACTIVE_INTERFACE_SOURCE_LOCALES);
    expect(INTERFACE_LANGS).toHaveLength(8);
    expect(INTERFACE_LANGS).not.toContain('en');
  });

  it('INTERFACE_LANG_READY_FOR_PROD содержит все 9 готовых к store UI-языков, включая English', () => {
    expect([...INTERFACE_LANG_READY_FOR_PROD].sort()).toEqual([...READY].sort());
  });

  it('контентные source-локали НЕ сужены (квизы/паки покрывают все 8, English туда не входит)', () => {
    // Критично: активация English UI не должна расширять контентный охват —
    // квизов/паков на английском нет и не планируется.
    expect([...ACTIVE_INTERFACE_SOURCE_LOCALES].sort()).toEqual(
      ['es', 'id', 'pl', 'pt-BR', 'ru', 'tr', 'uk', 'vi'].sort(),
    );
  });
});

describe('isInterfaceLangEnabled — все релизные языки включены', () => {
  it('все зарегистрированные языки включены', () => {
    for (const code of READY) {
      expect(isInterfaceLangEnabled(code)).toBe(true);
    }
  });
});

describe('coerceInterfaceLang — приводит все готовые языки', () => {
  it('все зарегистрированные языки проходят', () => {
    for (const code of READY) expect(coerceInterfaceLang(code)).toBe(code);
  });

  it('мусор и нестроки → null', () => {
    expect(coerceInterfaceLang('xx')).toBeNull();
    expect(coerceInterfaceLang(123)).toBeNull();
    expect(coerceInterfaceLang(null)).toBeNull();
    expect(coerceInterfaceLang(undefined)).toBeNull();
  });

  it('нормализует pt_BR → pt-BR', () => {
    expect(coerceInterfaceLang('pt_BR')).toBe('pt-BR');
  });
});

describe('getVisibleInterfaceLanguageOptions', () => {
  it('store-сборка: видны все готовые языки, включая English', () => {
    const visible = getVisibleInterfaceLanguageOptions(true).map((o) => o.code);
    expect([...visible].sort()).toEqual([...READY].sort());
  });

  it('dev-сборка: показывает те же 9 опций в фиксированном порядке', () => {
    const visible = getVisibleInterfaceLanguageOptions(false).map((o) => o.code);
    expect(visible).toEqual([
      'ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl',
    ]);
    expect(visible.length).toBe(INTERFACE_LANGUAGE_OPTIONS.length);
  });

  it('store-сборка не теряет порядок и native-названия', () => {
    const visible = getVisibleInterfaceLanguageOptions(true);
    expect(visible[0]).toEqual({ code: 'ru', native: 'Русский' });
    expect(visible[1]).toEqual({ code: 'uk', native: 'Українська' });
    expect(visible[2]).toEqual({ code: 'en', native: 'English' });
    expect(visible[3]).toEqual({ code: 'es', native: 'Español' });
  });
});

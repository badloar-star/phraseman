// Тесты для отключения неготовых языков интерфейса в проде (ru/uk only).
// Проверяем: isInterfaceLangEnabled, coerceInterfaceLang и
// getVisibleInterfaceLanguageOptions с учётом store/dev сборки.

jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  // ES выключен — как в проде после правки аудита.
  SPANISH_UI_LOCALE_ENABLED: false,
}));

import {
  INTERFACE_LANGUAGE_OPTIONS,
  INTERFACE_LANG_READY_FOR_PROD,
  coerceInterfaceLang,
  isInterfaceLangEnabled,
  getVisibleInterfaceLanguageOptions,
} from '../constants/i18n';
import { ACTIVE_INTERFACE_SOURCE_LOCALES } from '../app/source_locales';

const UNREADY = ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const READY = ['ru', 'uk'] as const;

describe('гейт готовности интерфейса отделён от контентного охвата', () => {
  it('INTERFACE_LANG_READY_FOR_PROD = только ru/uk', () => {
    expect([...INTERFACE_LANG_READY_FOR_PROD].sort()).toEqual(['ru', 'uk']);
  });

  it('контентные source-локали НЕ сужены (квизы/паки покрывают все 8)', () => {
    // Критично: скрытие языков в UI не должно ломать охват контента.
    expect([...ACTIVE_INTERFACE_SOURCE_LOCALES].sort()).toEqual(
      ['es', 'id', 'pl', 'pt-BR', 'ru', 'tr', 'uk', 'vi'].sort(),
    );
  });
});

describe('isInterfaceLangEnabled — неготовые выключены', () => {
  it('ru/uk включены', () => {
    for (const code of READY) {
      expect(isInterfaceLangEnabled(code)).toBe(true);
    }
  });

  it('es/pt-BR/vi/id/tr/pl выключены', () => {
    for (const code of UNREADY) {
      expect(isInterfaceLangEnabled(code)).toBe(false);
    }
  });
});

describe('coerceInterfaceLang — приводит только к готовым языкам', () => {
  it('ru/uk проходят', () => {
    expect(coerceInterfaceLang('ru')).toBe('ru');
    expect(coerceInterfaceLang('uk')).toBe('uk');
  });

  it('неготовые → null (нельзя выбрать)', () => {
    for (const code of UNREADY) {
      expect(coerceInterfaceLang(code)).toBeNull();
    }
  });

  it('мусор и нестроки → null', () => {
    expect(coerceInterfaceLang('xx')).toBeNull();
    expect(coerceInterfaceLang(123)).toBeNull();
    expect(coerceInterfaceLang(null)).toBeNull();
    expect(coerceInterfaceLang(undefined)).toBeNull();
  });

  it('нормализует pt_BR → pt-BR, но всё равно null (выключен)', () => {
    expect(coerceInterfaceLang('pt_BR')).toBeNull();
  });
});

describe('getVisibleInterfaceLanguageOptions', () => {
  it('store-сборка: видны только ru/uk (неготовые скрыты)', () => {
    const visible = getVisibleInterfaceLanguageOptions(true).map((o) => o.code);
    expect([...visible].sort()).toEqual(['ru', 'uk']);
  });

  it('dev-сборка: видны все 8 (неготовые останутся заблокированными)', () => {
    const visible = getVisibleInterfaceLanguageOptions(false).map((o) => o.code);
    expect(visible.length).toBe(INTERFACE_LANGUAGE_OPTIONS.length);
    expect(visible.length).toBe(8);
  });

  it('store-сборка не теряет порядок и native-названия готовых', () => {
    const visible = getVisibleInterfaceLanguageOptions(true);
    expect(visible[0]).toEqual({ code: 'ru', native: 'Русский' });
    expect(visible[1]).toEqual({ code: 'uk', native: 'Українська' });
  });
});

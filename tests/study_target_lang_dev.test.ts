const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => store[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
  },
}));

jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  ENABLE_DEV_STUDY_TARGET_LANG: true,
}));

import {
  devStudyTargetsForUiLang,
  getDevStudyTargetLang,
  isStudyTargetSourceUiLang,
  resetDevStudyTargetForSpanishUi,
  setDevStudyTargetLang,
  studyTargetLabelForSourceUiLang,
} from '../app/study_target_lang_dev';

beforeEach(() => {
  Object.keys(store).forEach((key) => delete store[key]);
});

describe('dev study target language guard', () => {
  it('keeps the existing Spanish button and adds French for Russian and Ukrainian source UI', async () => {
    expect(devStudyTargetsForUiLang('ru')).toEqual(['en', 'es', 'fr']);
    expect(devStudyTargetsForUiLang('uk')).toEqual(['en', 'es', 'fr']);
    expect(devStudyTargetsForUiLang('es')).toEqual(['en']);

    // зачем (PM-123): хранилище единое ('study_target_v1', без uiLang в ключе) —
    // так и задокументировано в study_target_lang_dev.ts («единый канонический
    // контур, UI-сборка и dev-сборка должны показывать один контур»). Тест
    // раньше ожидал изоляцию по uiLang, которой в текущей архитектуре нет;
    // isAllowedForUiLang по-прежнему откатывает недопустимый для uiLang target
    // на 'en' — это и проверяем ниже.
    await setDevStudyTargetLang('es', 'ru');
    expect(await getDevStudyTargetLang('ru')).toBe('es');

    await setDevStudyTargetLang('fr', 'ru');
    expect(await getDevStudyTargetLang('ru')).toBe('fr');

    await setDevStudyTargetLang('es', 'es');
    expect(await getDevStudyTargetLang('ru')).toBe('en');
  });

  it('keeps study target labels source-language-only, without French UI translation', () => {
    expect(isStudyTargetSourceUiLang('ru')).toBe(true);
    expect(isStudyTargetSourceUiLang('uk')).toBe(true);
    expect(isStudyTargetSourceUiLang('es')).toBe(false);

    expect(devStudyTargetsForUiLang('ru').map((target) => studyTargetLabelForSourceUiLang(target, 'ru')))
      .toEqual(['Английский', 'Испанский', 'Французский']);
    expect(devStudyTargetsForUiLang('uk').map((target) => studyTargetLabelForSourceUiLang(target, 'uk')))
      .toEqual(['Англійська', 'Іспанська', 'Французька']);

    const sourceUiLabels = [
      studyTargetLabelForSourceUiLang('fr', 'ru'),
      studyTargetLabelForSourceUiLang('fr', 'uk'),
    ].join(' ');
    expect(sourceUiLabels).not.toMatch(/Français|Francés|Francês|Fransızca|Francuski/);
  });

  it('reset helper is a documented no-op (UI language switch must not change study target)', async () => {
    await setDevStudyTargetLang('fr', 'uk');
    expect(await getDevStudyTargetLang('uk')).toBe('fr');

    // зачем (PM-123): resetDevStudyTargetForSpanishUi намеренно no-op с 2026 —
    // см. её собственный докблок в study_target_lang_dev.ts. Раньше она
    // реально сбрасывала target на 'en' при смене UI-языка, но это нарушало
    // более позднее правило «язык интерфейса не должен менять изучаемый
    // язык». Тест раньше проверял старое (ошибочное) поведение.
    await resetDevStudyTargetForSpanishUi();
    expect(await getDevStudyTargetLang('uk')).toBe('fr');
  });
});

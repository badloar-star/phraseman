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

    await setDevStudyTargetLang('es', 'ru');
    expect(await getDevStudyTargetLang('ru')).toBe('es');

    await setDevStudyTargetLang('fr', 'ru');
    expect(await getDevStudyTargetLang('ru')).toBe('fr');
    expect(await getDevStudyTargetLang('es')).toBe('en');

    await setDevStudyTargetLang('es', 'es');
    expect(await getDevStudyTargetLang('ru')).toBe('en');
    expect(await getDevStudyTargetLang('es')).toBe('en');
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

  it('reset helper forces the dev study target back to English', async () => {
    await setDevStudyTargetLang('fr', 'uk');
    expect(await getDevStudyTargetLang('uk')).toBe('fr');

    await resetDevStudyTargetForSpanishUi();
    expect(await getDevStudyTargetLang('uk')).toBe('en');
  });
});

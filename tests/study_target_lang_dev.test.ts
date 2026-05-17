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
  getDevStudyTargetLang,
  resetDevStudyTargetForSpanishUi,
  setDevStudyTargetLang,
} from '../app/study_target_lang_dev';

beforeEach(() => {
  Object.keys(store).forEach((key) => delete store[key]);
});

describe('dev study target language guard', () => {
  it('keeps Spanish UI tied to learning English, not studying Spanish', async () => {
    await setDevStudyTargetLang('es', 'ru');
    expect(await getDevStudyTargetLang('ru')).toBe('es');

    expect(await getDevStudyTargetLang('es')).toBe('en');

    await setDevStudyTargetLang('es', 'es');
    expect(await getDevStudyTargetLang('ru')).toBe('en');
    expect(await getDevStudyTargetLang('es')).toBe('en');
  });

  it('reset helper forces the dev study target back to English', async () => {
    await setDevStudyTargetLang('es', 'uk');
    expect(await getDevStudyTargetLang('uk')).toBe('es');

    await resetDevStudyTargetForSpanishUi();
    expect(await getDevStudyTargetLang('uk')).toBe('en');
  });
});

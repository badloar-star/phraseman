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

// Гейт-флаг remote_config покрыт feature_gates_premium_free.test.ts — здесь
// изолируем чистую логику лимита: замок работает ⇔ нет премиума.
jest.mock('../app/feature_gates', () => ({
  shouldGateFeature: jest.fn((_feature: string, hasPremiumAccess: boolean) => !hasPremiumAccess),
}));

jest.mock('../app/study_target_server_prefetch', () => ({
  prefetchAndRecordStudyTargetServerPack: jest.fn(async () => {}),
}));

import {
  FREE_STUDY_LANGUAGE_LIMIT,
  STUDY_LANGUAGES_STARTED_KEY,
  applyStudyLanguageSelection,
  getLanguageProfile,
  getStartedStudyLanguages,
  languageProfileKey,
  markStudyLanguageStarted,
  saveLanguageProfile,
  shouldGateExtraLanguage,
} from '../app/study_languages';
import { prefetchAndRecordStudyTargetServerPack } from '../app/study_target_server_prefetch';

beforeEach(() => {
  Object.keys(store).forEach((key) => delete store[key]);
  jest.clearAllMocks();
});

describe('study_languages — реестр начатых языков', () => {
  it('пустой список сидируется текущим языком (существующие пользователи не гейтятся)', async () => {
    expect(await getStartedStudyLanguages('en')).toEqual(['en']);
    expect(JSON.parse(store[STUDY_LANGUAGES_STARTED_KEY])).toEqual(['en']);
  });

  it('markStudyLanguageStarted добавляет язык идемпотентно', async () => {
    await markStudyLanguageStarted('en');
    await markStudyLanguageStarted('fr');
    await markStudyLanguageStarted('fr');
    expect(await getStartedStudyLanguages()).toEqual(['en', 'fr']);
  });

  it('мусор в сторадже нормализуется без падения', async () => {
    store[STUDY_LANGUAGES_STARTED_KEY] = JSON.stringify(['en', 'xx', 42, 'fr', 'en']);
    expect(await getStartedStudyLanguages()).toEqual(['en', 'fr']);
    store[STUDY_LANGUAGES_STARTED_KEY] = 'not-json';
    expect(await getStartedStudyLanguages()).toEqual([]);
  });
});

describe('study_languages — гейт «1 язык фри»', () => {
  it('лимит фри-аккаунта равен одному языку', () => {
    expect(FREE_STUDY_LANGUAGE_LIMIT).toBe(1);
  });

  it('первый язык бесплатен даже без премиума', () => {
    expect(shouldGateExtraLanguage({ target: 'en', startedLanguages: [], hasPremiumAccess: false })).toBe(false);
  });

  it('второй язык без премиума — пейвол', () => {
    expect(shouldGateExtraLanguage({ target: 'fr', startedLanguages: ['en'], hasPremiumAccess: false })).toBe(true);
  });

  it('уже начатый язык не гейтится (даунгрейд подписки не отбирает языки)', () => {
    expect(shouldGateExtraLanguage({ target: 'fr', startedLanguages: ['en', 'fr'], hasPremiumAccess: false })).toBe(false);
  });

  it('с премиумом новые языки свободны', () => {
    expect(shouldGateExtraLanguage({ target: 'fr', startedLanguages: ['en'], hasPremiumAccess: true })).toBe(false);
  });
});

describe('study_languages — профиль ответов по языку', () => {
  it('сохраняет и читает ответы мини-онбординга per-language', async () => {
    await saveLanguageProfile('fr', { goal: 'travel', level: 'a0' });
    const profile = await getLanguageProfile('fr');
    expect(profile?.goal).toBe('travel');
    expect(profile?.level).toBe('a0');
    expect(profile?.savedAt).toBeTruthy();
    expect(await getLanguageProfile('en')).toBeNull();
  });

  it('битый профиль возвращает null', async () => {
    store[languageProfileKey('fr')] = '{broken';
    expect(await getLanguageProfile('fr')).toBeNull();
  });
});

describe('study_languages — активация языка', () => {
  it('активация французского пишет study_target_v1, префетчит пак и отмечает язык начатым', async () => {
    await applyStudyLanguageSelection('fr', 'ru');
    expect(store['study_target_v1']).toBeUndefined();
    expect(store['dev_study_target_lang']).toBe('fr');
    expect(prefetchAndRecordStudyTargetServerPack).toHaveBeenCalledWith('fr', 'ru');
    expect(await getStartedStudyLanguages()).toEqual(['fr']);
  });

  it('активация английского не префетчит и тоже отмечает язык', async () => {
    await applyStudyLanguageSelection('en', 'uk');
    expect(store['study_target_v1']).toBe('en');
    expect(prefetchAndRecordStudyTargetServerPack).not.toHaveBeenCalled();
    expect(await getStartedStudyLanguages()).toEqual(['en']);
  });
});

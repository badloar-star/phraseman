// зачем (координатор 25.10: «Перевести» у каждого сообщения в сценарных): перевод первой реплики — из таблицы бандла вне пакета,
// только при дословном совпадении исходника с репликой пакета; иначе кнопки нет.
jest.mock('../shared/generated/dialogue_v2_opening_translations.ru.json', () => ({
  schemaVersion: 'dialogue-v2-opening-translations.v1',
  uiLang: 'ru',
  entries: {
    'en:social_01': { source: "Hi! Nice to meet you. I'm Mila. How are you today?", text: 'Привет! Рада познакомиться. Я Мила. Как ты сегодня?' },
  },
}));

import { dialogueV2OpeningTranslation, resetDialogueV2OpeningTranslationsForTests } from '../app/dialogue_v2_opening_translations';

const OPENING = "Hi! Nice to meet you. I'm Mila. How are you today?";

describe('перевод первой реплики сценария из таблицы', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    resetDialogueV2OpeningTranslationsForTests();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  it('исходник совпал — перевод', () => {
    expect(dialogueV2OpeningTranslation({ uiLang: 'ru', studyTarget: 'en', scenarioId: 'social_01', openingText: OPENING }))
      .toBe('Привет! Рада познакомиться. Я Мила. Как ты сегодня?');
  });

  it('реплика в пакете изменилась — перевода нет, причина в журнале', () => {
    expect(dialogueV2OpeningTranslation({ uiLang: 'ru', studyTarget: 'en', scenarioId: 'social_01', openingText: 'Hello there!' })).toBeNull();
    expect(warn).toHaveBeenCalledWith('[DIALOG-BUBBLE]', expect.stringContaining('opening_table_mismatch'));
  });

  it('нет записи, неизвестный язык, язык интерфейса = язык изучения — null', () => {
    expect(dialogueV2OpeningTranslation({ uiLang: 'ru', studyTarget: 'es', scenarioId: 'social_01', openingText: OPENING })).toBeNull();
    expect(dialogueV2OpeningTranslation({ uiLang: 'xx', studyTarget: 'en', scenarioId: 'social_01', openingText: OPENING })).toBeNull();
    expect(dialogueV2OpeningTranslation({ uiLang: 'en', studyTarget: 'en', scenarioId: 'social_01', openingText: OPENING })).toBeNull();
  });

  it('пустая таблица языка (пока Переводчик не дал перевод) — null без ошибок', () => {
    expect(dialogueV2OpeningTranslation({ uiLang: 'uk', studyTarget: 'en', scenarioId: 'social_01', openingText: OPENING })).toBeNull();
  });
});

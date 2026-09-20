/* eslint-disable import/first */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/xp_manager', () => ({
  registerXP: jest.fn(async () => ({ finalDelta: 50, multiplier: 1, isBonus: false })),
}));

import {
  DAILY_PHRASE_QUEST_XP,
  awardDailyPhraseQuestXpOnce,
  buildDailyPhraseQuestOptions,
  hasDailyPhraseQuestAnswered,
  hasDailyPhraseQuestXpAwarded,
  isDailyPhraseQuestAnswerCorrect,
  markDailyPhraseQuestAnswered,
  selectDailyPhraseQuestMarkerKeysToRemove,
} from '../app/daily_phrase_quest';
import { registerXP as registerXPMock } from '../app/xp_manager';
import type { DailyPhrase } from '../app/daily_phrase_system';

const registerXP = registerXPMock as jest.MockedFunction<typeof registerXPMock>;

const phrase = (id: string, meaning: string): DailyPhrase => ({
  id,
  studyTarget: 'en',
  english: `Phrase ${id}`,
  literal: `Literal ${id}`,
  meaning,
  text: `Text ${id}`,
  literal_uk: '',
  meaning_uk: '',
  text_uk: '',
  date: '2026-06-12',
  scheduledDate: '2026-06-12',
  allowSave: true,
  active: true,
});

describe('Daily Phrase Quest', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    registerXP.mockClear();
  });

  it('builds exactly three Russian meaning options with one correct answer', () => {
    const target = phrase('local-11', 'Удачи перед важным событием.');
    const options = buildDailyPhraseQuestOptions(target, [
      target,
      phrase('local-12', 'Перейти сразу к делу.'),
      phrase('local-13', 'Плохо себя чувствовать.'),
      phrase('local-14', 'Сделать неприятное, но нужное.'),
    ]);

    expect(options).toHaveLength(3);
    expect(options.filter((option) => option.correct)).toHaveLength(1);
    expect(options.map((option) => option.text)).toContain('Удачи перед важным событием.');
    expect(new Set(options.map((option) => option.text)).size).toBe(3);
  });

  it('builds Ukrainian meaning options when interface language is Ukrainian', () => {
    const target = { ...phrase('local-11', 'Правильный смысл.'), meaning_uk: 'Правильний сенс.' };
    const options = buildDailyPhraseQuestOptions(target, [
      target,
      { ...phrase('local-12', 'Неверный смысл 1.'), meaning_uk: 'Неправильний сенс 1.' },
      { ...phrase('local-13', 'Неверный смысл 2.'), meaning_uk: 'Неправильний сенс 2.' },
    ], 'uk');

    expect(options).toHaveLength(3);
    expect(options.some((option) => option.correct && option.text === 'Правильний сенс.')).toBe(true);
    expect(options.map((option) => option.text)).toEqual(
      expect.arrayContaining(['Неправильний сенс 1.', 'Неправильний сенс 2.']),
    );
    expect(options.map((option) => option.text).join(' ')).not.toContain('Правильный смысл');
  });

  it.each(['es', 'fr', 'de'] as const)(
    'builds %s options only from the authored localized quiz and attaches diagnostic feedback',
    (studyTarget) => {
      const target: DailyPhrase = {
        ...phrase('shared-row', 'Верный смысл.'),
        studyTarget,
        quiz_ru: {
          correctFeedback: 'Верно: это точный смысл.',
          distractors: [
            {
              id: 'literal-reading',
              text: 'Буквальное чтение.',
              misconceptionCode: 'literal_reading',
              feedback: 'Образ не нужно читать буквально.',
            },
            {
              id: 'scope-shift',
              text: 'Слишком широкий смысл.',
              misconceptionCode: 'scope_shift',
              feedback: 'Этот вариант меняет границы смысла.',
            },
          ],
        },
      };

      const options = buildDailyPhraseQuestOptions(
        target,
        [phrase('english-pool-row', 'POISON ENGLISH POOL MEANING')],
        'ru',
        studyTarget,
      );

      expect(options).toHaveLength(3);
      expect(options.map((option) => option.text)).not.toContain('POISON ENGLISH POOL MEANING');
      expect(options.find((option) => option.correct)).toMatchObject({
        text: 'Верный смысл.',
        feedback: 'Верно: это точный смысл.',
      });
      expect(options.filter((option) => !option.correct)).toEqual(expect.arrayContaining([
        expect.objectContaining({ misconceptionCode: 'literal_reading', feedback: expect.any(String) }),
        expect.objectContaining({ misconceptionCode: 'scope_shift', feedback: expect.any(String) }),
      ]));
      expect(buildDailyPhraseQuestOptions(target, [], 'ru', studyTarget)).toEqual(options);
    },
  );

  it('derives a non-English target from the phrase for legacy three-argument callers', () => {
    const target: DailyPhrase = {
      ...phrase('shared-row', 'Верный смысл.'),
      studyTarget: 'fr',
      quiz_ru: {
        correctFeedback: 'Верно.',
        distractors: [
          { id: 'a', text: 'Ошибка A.', misconceptionCode: 'literal', feedback: 'Буквальная ошибка.' },
          { id: 'b', text: 'Ошибка B.', misconceptionCode: 'scope', feedback: 'Сдвиг смысла.' },
        ],
      },
    };

    const options = buildDailyPhraseQuestOptions(target, [phrase('poison', 'ENGLISH POOL POISON')], 'ru');
    expect(options).toHaveLength(3);
    expect(options.map((option) => option.text)).not.toContain('ENGLISH POOL POISON');
  });

  it('fails closed when an explicit target disagrees with the phrase target', () => {
    const target: DailyPhrase = {
      ...phrase('shared-row', 'Верный смысл.'),
      studyTarget: 'fr',
      quiz_ru: {
        correctFeedback: 'Верно.',
        distractors: [
          { id: 'a', text: 'Ошибка A.', misconceptionCode: 'literal', feedback: 'Буквальная ошибка.' },
          { id: 'b', text: 'Ошибка B.', misconceptionCode: 'scope', feedback: 'Сдвиг смысла.' },
        ],
      },
    };

    expect(buildDailyPhraseQuestOptions(target, [phrase('pool', 'Pool meaning')], 'ru', 'en')).toEqual([]);
  });

  it.each([
    ['missing quiz', undefined],
    ['one distractor', {
      correctFeedback: 'Верно.',
      distractors: [{
        id: 'only-one',
        text: 'Один вариант.',
        misconceptionCode: 'literal_reading',
        feedback: 'Это буквальное чтение.',
      }],
    }],
  ] as const)('returns no non-English options for %s', (_label, quizRu) => {
    const target: DailyPhrase = { ...phrase('fr-row', 'Верный смысл.'), studyTarget: 'fr', quiz_ru: quizRu };
    expect(buildDailyPhraseQuestOptions(target, [
      phrase('pool-1', 'Пул 1'),
      phrase('pool-2', 'Пул 2'),
    ], 'ru', 'fr')).toEqual([]);
  });

  it('fails closed when the requested locale has no authored quiz schema', () => {
    const target: DailyPhrase = {
      ...phrase('fr-row', 'Верный смысл.'),
      studyTarget: 'fr',
      meaning_es: 'Significado correcto.',
      quiz_ru: {
        correctFeedback: 'Верно.',
        distractors: [
          { id: 'a', text: 'Ошибка A.', misconceptionCode: 'literal', feedback: 'Буквальная ошибка.' },
          { id: 'b', text: 'Ошибка B.', misconceptionCode: 'scope', feedback: 'Сдвиг смысла.' },
        ],
      },
    };

    expect(buildDailyPhraseQuestOptions(target, [], 'es', 'fr')).toEqual([]);
  });

  it.each([
    ['empty object', {}],
    ['null quiz', null],
    ['non-array distractors', { correctFeedback: 'Верно.', distractors: {} }],
    ['malformed row', { correctFeedback: 'Верно.', distractors: [null, { id: 'b' }] }],
  ])('returns no options without throwing for malformed authored quiz: %s', (_label, malformedQuiz) => {
    const target = {
      ...phrase('fr-row', 'Верный смысл.'),
      studyTarget: 'fr' as const,
      quiz_ru: malformedQuiz as unknown as DailyPhrase['quiz_ru'],
    };

    expect(() => buildDailyPhraseQuestOptions(target, [], 'ru', 'fr')).not.toThrow();
    expect(buildDailyPhraseQuestOptions(target, [], 'ru', 'fr')).toEqual([]);
  });

  it('preserves legacy English numeric distractor ids and deterministic ordering', () => {
    const target = phrase('local-11', 'Правильный смысл.');
    const options = buildDailyPhraseQuestOptions(target, [
      { id: 12, meaning: 'Ошибка 12.' },
      { id: 13, meaning: 'Ошибка 13.' },
      { id: 14, meaning: 'Ошибка 14.' },
    ]);

    expect(options.map((option) => option.id)).toEqual([
      'correct:local-11',
      'distractor:13',
      'distractor:12',
    ]);
  });

  it('returns no options for an unknown target and keeps authored ordering deterministic by target, row, and date', () => {
    const target: DailyPhrase = {
      ...phrase('shared-row', 'Верный смысл.'),
      studyTarget: 'fr',
      quiz_ru: {
        correctFeedback: 'Верно.',
        distractors: [
          { id: 'a', text: 'Ошибка A.', misconceptionCode: 'literal', feedback: 'Буквальная ошибка.' },
          { id: 'b', text: 'Ошибка B.', misconceptionCode: 'scope', feedback: 'Сдвиг смысла.' },
        ],
      },
    };

    expect(buildDailyPhraseQuestOptions(target, [], 'ru', 'xx')).toEqual([]);
    expect(buildDailyPhraseQuestOptions(target, [], 'ru', 'fr')).toEqual(
      buildDailyPhraseQuestOptions(target, [], 'ru', 'fr'),
    );
  });

  it('recognizes the selected correct answer by option id', () => {
    const options = buildDailyPhraseQuestOptions(phrase('local-11', 'Правильный смысл.'), [
      phrase('local-11', 'Правильный смысл.'),
      phrase('local-12', 'Неверный смысл 1.'),
      phrase('local-13', 'Неверный смысл 2.'),
    ]);
    const correct = options.find((option) => option.correct)!;
    const wrong = options.find((option) => !option.correct)!;

    expect(isDailyPhraseQuestAnswerCorrect(options, correct.id)).toBe(true);
    expect(isDailyPhraseQuestAnswerCorrect(options, wrong.id)).toBe(false);
  });

  it('awards 50 XP only once for the same phrase on the same date', async () => {
    await AsyncStorage.setItem('user_name', 'Navigator #1234');

    await expect(
      hasDailyPhraseQuestXpAwarded({ phraseId: 'local-11', date: '2026-06-12' }),
    ).resolves.toBe(false);

    await expect(
      awardDailyPhraseQuestXpOnce({ phraseId: 'local-11', date: '2026-06-12', lang: 'ru' }),
    ).resolves.toEqual({ awarded: true, finalDelta: DAILY_PHRASE_QUEST_XP });
    await expect(
      hasDailyPhraseQuestXpAwarded({ phraseId: 'local-11', date: '2026-06-12' }),
    ).resolves.toBe(true);
    await expect(
      awardDailyPhraseQuestXpOnce({ phraseId: 'local-11', date: '2026-06-12', lang: 'ru' }),
    ).resolves.toEqual({ awarded: false, finalDelta: 0 });

    expect(registerXP).toHaveBeenCalledTimes(1);
    expect(registerXP).toHaveBeenCalledWith(
      DAILY_PHRASE_QUEST_XP,
      'daily_phrase_quest',
      'Navigator #1234',
      'ru',
      undefined,
      expect.objectContaining({
        eventId: 'daily_phrase_quest:2026-06-12:local-11:award',
        payload: { phraseId: 'local-11', date: '2026-06-12' },
      }),
    );
  });

  it('records that the quest was answered without awarding XP', async () => {
    await expect(
      hasDailyPhraseQuestAnswered({ phraseId: 'local-11', date: '2026-06-12' }),
    ).resolves.toBe(false);

    await markDailyPhraseQuestAnswered({ phraseId: 'local-11', date: '2026-06-12' });

    await expect(
      hasDailyPhraseQuestAnswered({ phraseId: 'local-11', date: '2026-06-12' }),
    ).resolves.toBe(true);
    await expect(
      hasDailyPhraseQuestXpAwarded({ phraseId: 'local-11', date: '2026-06-12' }),
    ).resolves.toBe(false);
    expect(registerXP).not.toHaveBeenCalled();
  });

  it('treats an existing XP award as an answered quest for older app states', async () => {
    await awardDailyPhraseQuestXpOnce({ phraseId: 'local-11', date: '2026-06-12', lang: 'ru' });

    await expect(
      hasDailyPhraseQuestAnswered({ phraseId: 'local-11', date: '2026-06-12' }),
    ).resolves.toBe(true);
  });

  it('allows a new reward on a different daily phrase date', async () => {
    await awardDailyPhraseQuestXpOnce({ phraseId: 'local-11', date: '2026-06-12', lang: 'ru' });
    await awardDailyPhraseQuestXpOnce({ phraseId: 'local-11', date: '2026-06-13', lang: 'ru' });

    expect(registerXP).toHaveBeenCalledTimes(2);
  });

  it('separates answer and XP markers for English, Spanish, French, and German', async () => {
    const shared = { phraseId: 'shared-row', date: '2026-06-12' };
    await markDailyPhraseQuestAnswered({ ...shared, studyTarget: 'es' });
    await awardDailyPhraseQuestXpOnce({ ...shared, lang: 'ru', studyTarget: 'fr' });

    await expect(hasDailyPhraseQuestAnswered({ ...shared, studyTarget: 'en' })).resolves.toBe(false);
    await expect(hasDailyPhraseQuestAnswered({ ...shared, studyTarget: 'es' })).resolves.toBe(true);
    await expect(hasDailyPhraseQuestAnswered({ ...shared, studyTarget: 'fr' })).resolves.toBe(true);
    await expect(hasDailyPhraseQuestAnswered({ ...shared, studyTarget: 'de' })).resolves.toBe(false);
    await expect(hasDailyPhraseQuestXpAwarded({ ...shared, studyTarget: 'fr' })).resolves.toBe(true);
    await expect(hasDailyPhraseQuestXpAwarded({ ...shared, studyTarget: 'en' })).resolves.toBe(false);

    expect(registerXP).toHaveBeenCalledWith(
      DAILY_PHRASE_QUEST_XP,
      'daily_phrase_quest',
      '',
      'ru',
      undefined,
      expect.objectContaining({
        eventId: 'daily_phrase_quest:fr:2026-06-12:shared-row:award',
        payload: { phraseId: 'shared-row', date: '2026-06-12', studyTarget: 'fr' },
      }),
    );
  });

  it('selects stale quest marker keys for pruning while retaining the active key', () => {
    const retained = 'daily_phrase_quest_xp_awarded_v1:2026-01-01:old-but-active';
    const keys = [
      retained,
      ...Array.from({ length: 210 }, (_, i) => {
        const day = new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10);
        return `daily_phrase_quest_answered_v1:${day}:phrase-${i}`;
      }),
    ];

    const remove = selectDailyPhraseQuestMarkerKeysToRemove(
      keys,
      Date.parse('2026-07-31T00:00:00.000Z'),
      [retained],
    );

    expect(remove).not.toContain(retained);
    expect(remove.length).toBeGreaterThan(0);
    expect(keys.length - remove.length).toBeLessThanOrEqual(193);
  });
});

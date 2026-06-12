/* eslint-disable import/first */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/xp_manager', () => ({
  registerXP: jest.fn(async () => ({ finalDelta: 50, multiplier: 1, isBonus: false })),
}));

import {
  DAILY_PHRASE_QUEST_XP,
  awardDailyPhraseQuestXpOnce,
  buildDailyPhraseQuestOptions,
  isDailyPhraseQuestAnswerCorrect,
} from '../app/daily_phrase_quest';
import { registerXP as registerXPMock } from '../app/xp_manager';
import type { DailyPhrase } from '../app/daily_phrase_system';

const registerXP = registerXPMock as jest.MockedFunction<typeof registerXPMock>;

const phrase = (id: string, meaning: string): DailyPhrase => ({
  id,
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
      awardDailyPhraseQuestXpOnce({ phraseId: 'local-11', date: '2026-06-12', lang: 'ru' }),
    ).resolves.toEqual({ awarded: true, finalDelta: DAILY_PHRASE_QUEST_XP });
    await expect(
      awardDailyPhraseQuestXpOnce({ phraseId: 'local-11', date: '2026-06-12', lang: 'ru' }),
    ).resolves.toEqual({ awarded: false, finalDelta: 0 });

    expect(registerXP).toHaveBeenCalledTimes(1);
    expect(registerXP).toHaveBeenCalledWith(DAILY_PHRASE_QUEST_XP, 'daily_phrase_quest', 'Navigator #1234', 'ru');
  });

  it('allows a new reward on a different daily phrase date', async () => {
    await awardDailyPhraseQuestXpOnce({ phraseId: 'local-11', date: '2026-06-12', lang: 'ru' });
    await awardDailyPhraseQuestXpOnce({ phraseId: 'local-11', date: '2026-06-13', lang: 'ru' });

    expect(registerXP).toHaveBeenCalledTimes(2);
  });
});

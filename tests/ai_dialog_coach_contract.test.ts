/**
 * Контракт тренера в диалоге: парсер полей и правило появления помощника.
 *
 * зачем (владелец 2026-09-14, редизайн раздела «Диалоги»):
 *   • «почему так» обязано открываться мгновенно — значит поля приезжают вместе
 *     с репликой и разбираются чистой функцией без сети;
 *   • помощник показывается «только когда юзер уже три реплики не может сказать
 *     ничего адекватного» — правило считается локально, без модели.
 * Оба требования легко потерять при рефакторинге, поэтому они под тестом.
 */

import {
  EMPTY_COACH,
  hasCoachExplanation,
  isWeakLearnerReply,
  parseDialogCoach,
} from '../app/ai_dialog_coach';

describe('parseDialogCoach', () => {
  it('разбирает полный объект тренера', () => {
    const coach = parseDialogCoach({
      note: 'Так вежливее.',
      translation: 'Хотите горячий или со льдом?',
      suggestions: ['Hot, please.', 'Iced, please.'],
      userFix: { corrected: 'Do you have anything without sugar?', note: 'Нужно anything.' },
    });
    expect(coach.note).toBe('Так вежливее.');
    expect(coach.suggestions).toEqual(['Hot, please.', 'Iced, please.']);
    expect(coach.userFix).toEqual({
      corrected: 'Do you have anything without sugar?',
      note: 'Нужно anything.',
    });
  });

  it('любой мусор превращает в пустого тренера, не бросая', () => {
    expect(parseDialogCoach(null)).toEqual(EMPTY_COACH);
    expect(parseDialogCoach('строка')).toEqual(EMPTY_COACH);
    expect(parseDialogCoach(42)).toEqual(EMPTY_COACH);
    expect(parseDialogCoach({ note: 12, suggestions: 'нет' })).toEqual(EMPTY_COACH);
  });

  it('userFix без corrected отбрасывается — показывать нечего', () => {
    const coach = parseDialogCoach({ note: 'x', userFix: { note: 'только заметка' } });
    expect(coach.userFix).toBeNull();
  });

  it('держит не более трёх готовых ответов и выбрасывает пустые', () => {
    const coach = parseDialogCoach({ suggestions: ['a', '', '  ', 'b', 'c', 'd'] });
    expect(coach.suggestions).toEqual(['a', 'b', 'c']);
  });

  it('hasCoachExplanation: кнопка «почему так» появляется только при содержимом', () => {
    expect(hasCoachExplanation(EMPTY_COACH)).toBe(false);
    expect(hasCoachExplanation(parseDialogCoach({ note: 'почему' }))).toBe(true);
    expect(hasCoachExplanation(parseDialogCoach({ translation: 'перевод' }))).toBe(true);
    expect(hasCoachExplanation(parseDialogCoach({ suggestions: ['Hi'] }))).toBe(true);
    // Одна лишь поправка своей реплики не открывает шторку про реплику собеседника.
    expect(hasCoachExplanation(parseDialogCoach({ userFix: { corrected: 'Hi' } }))).toBe(false);
  });
});

describe('isWeakLearnerReply — три подряд включают помощника', () => {
  it('пустая строка и пробелы — слабая реплика', () => {
    expect(isWeakLearnerReply('')).toBe(true);
    expect(isWeakLearnerReply('   ')).toBe(true);
  });

  it('односложные подтверждения — слабые', () => {
    expect(isWeakLearnerReply('No.')).toBe(true);
    expect(isWeakLearnerReply('yes')).toBe(true);
    expect(isWeakLearnerReply('Ok…')).toBe(true);
    expect(isWeakLearnerReply('ага')).toBe(true);
  });

  it('ответ на родном языке — слабый (это не практика изучаемого)', () => {
    expect(isWeakLearnerReply('не знаю что сказать')).toBe(true);
  });

  it('фраза из трёх и более слов — нормальная реплика', () => {
    expect(isWeakLearnerReply('Hot please, no sugar')).toBe(false);
    expect(isWeakLearnerReply('I would like a coffee')).toBe(false);
  });

  it('два содержательных слова — не слабая', () => {
    expect(isWeakLearnerReply('Black coffee')).toBe(false);
  });

  it('счётчик подряд: три слабых включают помощника, нормальная сбрасывает', () => {
    const replies = ['No.', 'yes', 'Ok…'];
    let streak = 0;
    for (const reply of replies) {
      streak = isWeakLearnerReply(reply) ? streak + 1 : 0;
    }
    expect(streak).toBe(3);

    streak = isWeakLearnerReply('I would like a latte') ? streak + 1 : 0;
    expect(streak).toBe(0);
  });
});

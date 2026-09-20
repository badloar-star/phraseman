/**
 * Контракт клиента урока с Максом: разбор инструментов учителя.
 *
 * зачем: инструменты (доска, отметка фразы, шаг мастерства, домашка) — это и
 * есть «каркас MAX» на экране. Если разбор молча вернёт пустоту, урок
 * превратится в обычную переписку без доски и без прогресса, и заметить это
 * будет нечем: ошибок не будет, просто ничего не появится.
 */

import {
  EMPTY_TUTOR_TOOLS,
  parseTutorTurnResponse,
  parseTutorTools,
  tutorGoalTitle,
  type TutorGoalInfo,
} from '../app/ai_dialog_tutor_client';

const validTutorResponse = {
  ok: true,
  reply: 'Hola',
  tools: {},
  coach: null,
  goal: null,
  remainingQuota: 4,
  resetAtMs: Date.UTC(2026, 8, 21),
  quotaVersion: 9,
  model: 'tutor-model',
};

test('tutor response accepts only strict server quota numbers', () => {
  expect(parseTutorTurnResponse(validTutorResponse)).toMatchObject({
    remainingQuota: 4,
    resetAtMs: Date.UTC(2026, 8, 21),
    quotaVersion: 9,
  });
  expect(parseTutorTurnResponse({ ...validTutorResponse, remainingQuota: '4' })).toBeNull();
  expect(parseTutorTurnResponse({ ...validTutorResponse, resetAtMs: String(validTutorResponse.resetAtMs) })).toBeNull();
  expect(parseTutorTurnResponse({ ...validTutorResponse, quotaVersion: '9' })).toBeNull();
});

describe('parseTutorTools', () => {
  it('разбирает полный набор инструментов', () => {
    const tools = parseTutorTools({
      board: { text: "I'd like a table for two.", meaning: 'Мне столик на двоих.' },
      phraseResult: { text: "I'd like a table for two.", ok: true },
      goalMastery: 2,
      homework: ['The bill, please.', 'Could I see the menu?'],
      nextTopic: 'просим счёт',
      lessonComplete: true,
    });
    expect(tools.board).toEqual({ text: "I'd like a table for two.", meaning: 'Мне столик на двоих.' });
    expect(tools.phraseResult).toEqual({ text: "I'd like a table for two.", ok: true });
    expect(tools.goalMastery).toBe(2);
    expect(tools.homework).toHaveLength(2);
    expect(tools.lessonComplete).toBe(true);
  });

  it('мусор превращает в пустые инструменты, не бросая', () => {
    expect(parseTutorTools(null)).toEqual(EMPTY_TUTOR_TOOLS);
    expect(parseTutorTools('строка')).toEqual(EMPTY_TUTOR_TOOLS);
    expect(parseTutorTools({ board: 7, homework: 'нет' })).toEqual(EMPTY_TUTOR_TOOLS);
  });

  it('мастерство зажимается в 0..3 — лишний прогресс не показываем', () => {
    expect(parseTutorTools({ goalMastery: 11 }).goalMastery).toBe(3);
    expect(parseTutorTools({ goalMastery: -2 }).goalMastery).toBe(0);
    expect(parseTutorTools({ goalMastery: 'два' }).goalMastery).toBeNull();
  });

  it('доска без текста отбрасывается: пустую доску показывать нечем', () => {
    expect(parseTutorTools({ board: { meaning: 'только перевод' } }).board).toBeNull();
  });

  it('phraseResult без ok считается неуспешным — не хвалим за то, чего не было', () => {
    const tools = parseTutorTools({ phraseResult: { text: 'To go, please.' } });
    expect(tools.phraseResult).toEqual({ text: 'To go, please.', ok: false });
  });

  it('домашка ограничена тремя фразами', () => {
    expect(parseTutorTools({ homework: ['a', 'b', 'c', 'd'] }).homework).toHaveLength(3);
  });

  it('lessonComplete строго булев: любая правдоподобная строка не закрывает урок', () => {
    expect(parseTutorTools({ lessonComplete: 'true' }).lessonComplete).toBe(false);
    expect(parseTutorTools({ lessonComplete: 1 }).lessonComplete).toBe(false);
    expect(parseTutorTools({ lessonComplete: true }).lessonComplete).toBe(true);
  });
});

describe('tutorGoalTitle', () => {
  const goal: TutorGoalInfo = {
    id: 'a2_restaurant',
    level: 'A2',
    title: { en: 'Order a meal', ru: 'Заказать ужин' },
    mastery: 1,
  };

  it('берёт название на языке интерфейса', () => {
    expect(tutorGoalTitle(goal, 'ru')).toBe('Заказать ужин');
  });

  it('падает обратно на английский, если перевода нет', () => {
    expect(tutorGoalTitle(goal, 'vi')).toBe('Order a meal');
  });

  it('без цели возвращает пустую строку, а не «undefined»', () => {
    expect(tutorGoalTitle(null, 'ru')).toBe('');
  });
});

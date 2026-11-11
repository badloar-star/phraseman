/**
 * «Проверь себя» после ролика (решение владельца 11.11: неверные варианты — фразы того же ролика, ничего заранее не готовим).
 * Проверяем сборщик вопросов: он чистый, без сети и без случайности вне seed.
 */
import { buildVideoQuiz, canBuildVideoQuiz, VIDEO_QUIZ_OPTION_COUNT, VIDEO_QUIZ_QUESTION_COUNT } from '../app/video_quiz_core';
import type { VideoPhrase } from '../shared/video_phrases_contract';

function phrase(ordinal: number, text: string, translation: string, startSec?: number): VideoPhrase {
  return { id: `abcdefghijk:${ordinal}`, ordinal, phrase: text, translation, explanation: 'x', ...(startSec === undefined ? {} : { startSec }) };
}

const SEVEN: readonly VideoPhrase[] = [
  phrase(1, 'How’s it going?', 'Как дела?', 312),
  phrase(2, 'Not too bad.', 'Неплохо.', 326),
  phrase(3, 'Long time no see!', 'Давно не виделись!', 339),
  phrase(4, 'What have you been up to?', 'Чем занимался всё это время?', 351),
  phrase(5, 'Same old, same old.', 'Всё по-старому.', 364),
  phrase(6, 'That sounds great.', 'Звучит здорово.', 378),
  phrase(7, 'I’d better get going.', 'Мне пора идти.', 391),
];

describe('video_quiz_core', () => {
  it('собирает три вопроса с тремя вариантами, правильный ответ стоит на своём индексе', () => {
    const quiz = buildVideoQuiz(SEVEN, { seed: 7 });
    expect(quiz).toHaveLength(VIDEO_QUIZ_QUESTION_COUNT);
    for (const q of quiz) {
      expect(q.options).toHaveLength(VIDEO_QUIZ_OPTION_COUNT);
      expect(new Set(q.options).size).toBe(VIDEO_QUIZ_OPTION_COUNT);
      const source = SEVEN.find((p) => p.id === q.phraseId);
      expect(source).toBeDefined();
      const expected = q.kind === 'to_native' ? source?.translation : source?.phrase;
      expect(q.options[q.correctIndex]).toBe(expected);
    }
  });

  it('неверные варианты — только фразы или переводы того же ролика', () => {
    const phrases = new Set(SEVEN.map((p) => p.phrase));
    const translations = new Set(SEVEN.map((p) => p.translation));
    for (const q of buildVideoQuiz(SEVEN, { seed: 3 })) {
      const pool = q.kind === 'to_native' ? translations : phrases;
      for (const option of q.options) expect(pool.has(option)).toBe(true);
    }
  });

  it('вопросы — про разные фразы, виды вопросов не повторяются, пока фраз хватает', () => {
    const quiz = buildVideoQuiz(SEVEN, { seed: 11 });
    expect(new Set(quiz.map((q) => q.phraseId)).size).toBe(quiz.length);
    expect(new Set(quiz.map((q) => q.kind))).toEqual(new Set(['to_target', 'to_native', 'listen']));
  });

  it('один и тот же seed даёт один и тот же тест, другой seed — другой порядок', () => {
    expect(buildVideoQuiz(SEVEN, { seed: 42 })).toEqual(buildVideoQuiz(SEVEN, { seed: 42 }));
    const signatures = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => JSON.stringify(buildVideoQuiz(SEVEN, { seed }))));
    expect(signatures.size).toBeGreaterThan(1);
  });

  it('вопрос «на слух» задаётся только по фразе с таймкодом и несёт его', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const q of buildVideoQuiz(SEVEN, { seed })) {
        if (q.kind === 'listen') expect(typeof q.startSec).toBe('number');
        else expect(q.startSec).toBeUndefined();
      }
    }
  });

  it('без таймкодов вопроса «на слух» нет — он заменяется обычным', () => {
    const noTime = SEVEN.map((p) => phrase(p.ordinal, p.phrase, p.translation));
    const quiz = buildVideoQuiz(noTime, { seed: 5 });
    expect(quiz).toHaveLength(VIDEO_QUIZ_QUESTION_COUNT);
    expect(quiz.some((q) => q.kind === 'listen')).toBe(false);
  });

  it('меньше трёх разных фраз — теста нет', () => {
    expect(canBuildVideoQuiz(SEVEN.slice(0, 2))).toBe(false);
    expect(buildVideoQuiz(SEVEN.slice(0, 2), { seed: 1 })).toEqual([]);
    expect(canBuildVideoQuiz([])).toBe(false);
  });

  it('дубли фразы или перевода не считаются разными вариантами', () => {
    const dup = [phrase(1, 'Hello!', 'Привет!'), phrase(2, 'hello!', 'Здравствуй!'), phrase(3, 'Bye!', 'Привет!'), phrase(4, 'Thanks.', 'Спасибо.')];
    // разных и по фразе, и по переводу — только «Hello!» и «Thanks.»
    expect(canBuildVideoQuiz(dup)).toBe(false);
    const ok = [...dup, phrase(5, 'Sorry.', 'Извини.')];
    expect(canBuildVideoQuiz(ok)).toBe(true);
    for (const q of buildVideoQuiz(ok, { seed: 2 })) {
      expect(new Set(q.options.map((o) => o.trim().toLowerCase())).size).toBe(VIDEO_QUIZ_OPTION_COUNT);
    }
  });

  it('ровно три фразы — тест собирается, вопросов столько, сколько фраз', () => {
    const quiz = buildVideoQuiz(SEVEN.slice(0, 3), { seed: 9 });
    expect(quiz).toHaveLength(3);
  });
});

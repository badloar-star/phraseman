import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateDailyPhraseQuizContent, parseDailyPhraseQuizCliArgs } from '../scripts/daily_phrase_quiz_content_gate.mjs';

function validRow() {
  return {
    id: 'es-001',
    candidateStatus: 'CANDIDATE_PENDING_INDEPENDENT_REVIEW',
    meaning_ru: 'Выбирать самое большое ради размера, не думая о пользе.',
    meaning_uk: 'Обирати найбільше лише за розміром, не думаючи про користь.',
    quiz_ru: {
      correctFeedback: 'Верно: здесь высмеивают выбор размера ради показного впечатления без проверки пользы.',
      distractors: [
        {
          id: 'literal_horse',
          text: 'Хвалить сильную лошадь за быстрый ход.',
          misconceptionCode: 'literal_reading',
          feedback: 'Образ лошади подталкивает к буквальному чтению, но речь идёт о показном выборе самого большого предмета.',
        },
        {
          id: 'quality_reward',
          text: 'Всегда выбирать дорогую вещь как самую надёжную.',
          misconceptionCode: 'scope_shift',
          feedback: 'Цена может казаться признаком качества, однако пословица критикует размер и показность, а не советует покупать дороже.',
        },
      ],
    },
    quiz_uk: {
      correctFeedback: 'Так: вислів висміює вибір найбільшого заради враження без перевірки користі.',
      distractors: [
        {
          id: 'literal_horse',
          text: 'Хвалити сильного коня за швидкий біг.',
          misconceptionCode: 'literal_reading',
          feedback: 'Образ коня спонукає читати буквально, але йдеться про показний вибір найбільшого предмета.',
        },
        {
          id: 'quality_reward',
          text: 'Завжди купувати дорожчу річ як найнадійнішу.',
          misconceptionCode: 'scope_shift',
          feedback: 'Ціна може здаватися ознакою якості, однак приказка критикує розмір і показність, а не радить платити більше.',
        },
      ],
    },
  };
}

test('passes a native three-option quiz with two diagnostic distractors per locale', () => {
  const result = evaluateDailyPhraseQuizContent([validRow()]);
  assert.equal(result.verdict, 'PASS', JSON.stringify(result.issues, null, 2));
});

test('holds when a locale quiz is missing', () => {
  const row = validRow();
  delete row.quiz_uk;
  const result = evaluateDailyPhraseQuizContent([row]);
  assert.ok(result.issues.some((item) => item.code === 'uk.quiz_missing'));
});

test('holds unless there are exactly two distractors', () => {
  const row = validRow();
  row.quiz_ru.distractors.pop();
  const result = evaluateDailyPhraseQuizContent([row]);
  assert.ok(result.issues.some((item) => item.code === 'ru.distractor_count'));
});

test('holds equivalent and duplicate answer text after Unicode normalization', () => {
  const row = validRow();
  row.quiz_ru.distractors[0].text = '  ВЫБИРАТЬ САМОЕ БОЛЬШОЕ РАДИ РАЗМЕРА, НЕ ДУМАЯ О ПОЛЬЗЕ. ';
  row.quiz_uk.distractors[1].text = row.quiz_uk.distractors[0].text;
  const result = evaluateDailyPhraseQuizContent([row]);
  assert.ok(result.issues.some((item) => item.code === 'ru.answer_not_distinct'));
  assert.ok(result.issues.some((item) => item.code === 'uk.answer_not_distinct'));
});

test('holds distractors copied from another target-bank meaning', () => {
  const first = validRow();
  const second = validRow();
  second.id = 'es-002';
  second.meaning_ru = 'Слепо следовать за толпой.';
  second.meaning_uk = 'Сліпо йти за натовпом.';
  first.quiz_ru.distractors[0].text = second.meaning_ru;
  first.quiz_uk.distractors[0].text = second.meaning_uk;
  const result = evaluateDailyPhraseQuizContent([first, second]);
  assert.ok(result.issues.some((item) => item.rowId === 'es-001' && item.code === 'ru.target_pool_copy'));
  assert.ok(result.issues.some((item) => item.rowId === 'es-001' && item.code === 'uk.target_pool_copy'));
});

test('holds a checked row when its distractor copies an unselected row from the supplied target pool', () => {
  const checked = validRow();
  const unselected = validRow();
  unselected.id = 'es-002';
  unselected.meaning_ru = 'Слепо следовать за толпой.';
  unselected.meaning_uk = 'Сліпо йти за натовпом.';
  checked.quiz_ru.distractors[0].text = unselected.meaning_ru;
  checked.quiz_uk.distractors[0].text = unselected.meaning_uk;

  const result = evaluateDailyPhraseQuizContent([checked], { targetRows: [checked, unselected] });

  assert.ok(result.issues.some((item) => item.rowId === 'es-001' && item.code === 'ru.target_pool_copy'));
  assert.ok(result.issues.some((item) => item.rowId === 'es-001' && item.code === 'uk.target_pool_copy'));
});

test('holds distractors copied from the English Daily Phrase pool', () => {
  const row = validRow();
  row.quiz_ru.distractors[0].text = 'Удачи перед важным выступлением.';
  const result = evaluateDailyPhraseQuizContent([row], {
    englishRows: [{ meaning: 'Удачи перед важным выступлением.', meaning_uk: 'Удачі перед важливим виступом.' }],
  });
  assert.ok(result.issues.some((item) => item.code === 'ru.english_pool_copy'));
});

test('holds generic feedback that does not explain the misconception', () => {
  const row = validRow();
  row.quiz_ru.distractors[0].feedback = 'Неверно, попробуй ещё.';
  const result = evaluateDailyPhraseQuizContent([row]);
  assert.ok(result.issues.some((item) => item.code === 'ru.feedback_not_diagnostic'));
});

test('holds repeated misconception codes within one quiz', () => {
  const row = validRow();
  row.quiz_ru.distractors[1].misconceptionCode = 'literal_reading';
  const result = evaluateDailyPhraseQuizContent([row]);
  assert.ok(result.issues.some((item) => item.code === 'ru.misconception_not_distinct'));
});

test('holds empty or structurally invalid localized correct meanings', () => {
  const row = validRow();
  row.meaning_ru = '';
  row.meaning_uk = 'Коротко.';
  const result = evaluateDailyPhraseQuizContent([row]);
  assert.ok(result.issues.some((item) => item.code === 'ru.correct_meaning_shape'));
  assert.ok(result.issues.some((item) => item.code === 'uk.correct_meaning_shape'));
});

test('holds English learner copy and Latin contamination in localized quiz fields', () => {
  const row = validRow();
  row.meaning_ru = 'Choose the largest option without considering utility.';
  row.quiz_ru.correctFeedback = 'Correct: it rejects showy choice without utility.';
  row.quiz_uk.distractors[0].text = 'Literal horse reading is wrong.';
  row.quiz_uk.distractors[1].feedback = 'Це wrong, бо значення ширше за буквальний сюжет.';
  const result = evaluateDailyPhraseQuizContent([row]);
  assert.ok(result.issues.some((item) => item.code === 'ru.correct_meaning_script'));
  assert.ok(result.issues.some((item) => item.code === 'ru.correct_feedback_script'));
  assert.ok(result.issues.some((item) => item.code === 'uk.distractor_text_script'));
  assert.ok(result.issues.some((item) => item.code === 'uk.distractor_feedback_script'));
});

test('parses --ids without misreading it as an optional English baseline path', () => {
  assert.deepEqual(parseDailyPhraseQuizCliArgs(['bank.json', '--ids', 'es-001']), {
    bankPath: 'bank.json',
    englishPath: null,
    ids: ['es-001'],
  });
  assert.deepEqual(parseDailyPhraseQuizCliArgs(['bank.json', 'english.json', '--ids', 'es-001']), {
    bankPath: 'bank.json',
    englishPath: 'english.json',
    ids: ['es-001'],
  });
});

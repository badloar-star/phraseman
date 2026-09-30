import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

function repeatedLongestCorrectRow(id = 'fr-031') {
  const row = validRow();
  row.id = id;
  row.meaning_ru = 'Распоряжаться ожидаемым результатом и считать успех обеспеченным слишком рано.';
  row.meaning_uk = 'Розпоряджатися очікуваним результатом і вважати успіх гарантованим завчасно.';
  row.quiz_ru.distractors[0].text = 'Продать настоящую медвежью шкуру до охоты.';
  row.quiz_ru.distractors[1].text = 'Осторожно составить запасной план на случай неудачи.';
  row.quiz_uk.distractors[0].text = 'Продати справжню ведмежу шкуру до полювання.';
  row.quiz_uk.distractors[1].text = 'Обережно скласти запасний план на випадок невдачі.';
  return row;
}

const graphemeSegmenter = new Intl.Segmenter('und', { granularity: 'grapheme' });

function graphemeLength(value) {
  return [...graphemeSegmenter.segment(String(value).normalize('NFKC'))].length;
}

function padToGraphemeLength(value, target, filler) {
  let result = value;
  while (graphemeLength(result) < target) result += filler;
  return result;
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

test('holds localized distractor id drift for the same diagnostic pair', () => {
  const row = validRow();
  row.quiz_uk.distractors[1].id = 'different_quality_signal';
  const result = evaluateDailyPhraseQuizContent([row]);
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'locale.distractor_id_mismatch'));
});

test('holds localized misconception code drift for the same distractor id', () => {
  const row = validRow();
  row.quiz_uk.distractors[1].misconceptionCode = 'semantic_neighbor';
  const result = evaluateDailyPhraseQuizContent([row]);
  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'locale.misconception_code_mismatch'));
});

test('allows localized distractors in a different display order when ids and codes agree', () => {
  const row = validRow();
  row.quiz_uk.distractors.reverse();
  const result = evaluateDailyPhraseQuizContent([row]);
  assert.equal(result.verdict, 'PASS', JSON.stringify(result.issues, null, 2));
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

test('allows one quoted Latin i only inside a literal-reading distractor', () => {
  const row = validRow();
  row.quiz_ru.distractors[0].text = 'Аккуратно поставить точки над буквами «i» во французском тексте.';
  row.quiz_uk.distractors[0].text = 'Акуратно поставити крапки над літерами «i» у французькому тексті.';

  const result = evaluateDailyPhraseQuizContent([row]);

  assert.equal(result.verdict, 'PASS', JSON.stringify(result.issues, null, 2));
});

test('still rejects quoted Latin i outside a literal-reading distractor', () => {
  const row = validRow();
  row.quiz_ru.distractors[1].text = 'Аккуратно поставить точки над буквами «i» во французском тексте.';

  const result = evaluateDailyPhraseQuizContent([row]);

  assert.ok(result.issues.some((item) => item.code === 'ru.distractor_text_script'));
});

test('holds high-signal Russian and Ukrainian cross-locale contamination', () => {
  const row = validRow();
  row.quiz_ru.distractors[0].feedback = 'Нагоду важно заметить, но буквальный образ не объясняет точное значение этой пословицы.';
  row.quiz_uk.distractors[0].text = 'Каждый сильный конь заслуговує похвали за швидкий біг.';
  const result = evaluateDailyPhraseQuizContent([row]);
  assert.ok(result.issues.some((item) => item.code === 'ru.distractor_feedback_locale_contamination'));
  assert.ok(result.issues.some((item) => item.code === 'uk.distractor_text_locale_contamination'));
});

test('allows native Russian правильно while still rejecting Ukrainian markers', () => {
  const row = validRow();
  row.quiz_ru.correctFeedback = 'Правильно: здесь высмеивают показной выбор размера без проверки реальной пользы.';
  const result = evaluateDailyPhraseQuizContent([row]);
  assert.ok(!result.issues.some((item) => item.code === 'ru.correct_feedback_locale_contamination'));
});

test('holds a visible answer-length clue', () => {
  const row = validRow();
  row.meaning_ru = 'Выбирать самое большое только ради впечатления, совсем не думая о реальной пользе, условиях, последствиях и потребностях человека.';
  const result = evaluateDailyPhraseQuizContent([row]);
  assert.ok(result.issues.some((item) => item.code === 'ru.answer_length_clue'));
});

test('holds a repeated longest-correct visual clue across a bounded authoring batch', () => {
  const rows = Array.from({ length: 3 }, (_, index) => repeatedLongestCorrectRow(
    `fr-${String(index + 31).padStart(3, '0')}`,
  ));

  const result = evaluateDailyPhraseQuizContent(rows);

  assert.ok(result.issues.some((item) => item.code === 'ru.repeated_longest_correct'));
  assert.ok(result.issues.some((item) => item.code === 'uk.repeated_longest_correct'));
});

test('bounds the repeated-longest scan to packets of three through ten rows', () => {
  const twoRows = Array.from({ length: 2 }, (_, index) => repeatedLongestCorrectRow(`fr-${index + 1}`));
  const tenRows = Array.from({ length: 10 }, (_, index) => repeatedLongestCorrectRow(`fr-${index + 1}`));
  const elevenRows = Array.from({ length: 11 }, (_, index) => repeatedLongestCorrectRow(`fr-${index + 1}`));

  assert.ok(!evaluateDailyPhraseQuizContent(twoRows).issues.some((item) => item.code.endsWith('repeated_longest_correct')));
  assert.ok(evaluateDailyPhraseQuizContent(tenRows).issues.some((item) => item.code.endsWith('repeated_longest_correct')));
  assert.ok(!evaluateDailyPhraseQuizContent(elevenRows).issues.some((item) => item.code.endsWith('repeated_longest_correct')));
});

test('can scan repeated-longest clues across a complete accepted prefix', () => {
  const elevenRows = Array.from({ length: 11 }, (_, index) => repeatedLongestCorrectRow(`fr-${index + 1}`));

  const result = evaluateDailyPhraseQuizContent(elevenRows, {
    enforceRepeatedLongestAcrossAll: true,
  });

  assert.ok(result.issues.some((item) => item.code === 'ru.repeated_longest_correct'));
  assert.ok(result.issues.some((item) => item.code === 'uk.repeated_longest_correct'));
});

test('requires three consecutive longest-correct rows inside a bounded packet', () => {
  const rows = Array.from({ length: 5 }, (_, index) => repeatedLongestCorrectRow(`fr-${index + 1}`));
  rows[2].quiz_ru.distractors[0].text = 'Продать настоящую медвежью шкуру ещё до начала удачной охоты.';
  rows[2].quiz_ru.distractors[1].text = 'Заранее составить осторожный запасной план на случай возможной неудачи.';
  rows[2].quiz_uk.distractors[0].text = 'Продати справжню ведмежу шкуру ще до початку вдалого полювання.';
  rows[2].quiz_uk.distractors[1].text = 'Завчасно скласти обережний запасний план на випадок можливої невдачі.';

  const result = evaluateDailyPhraseQuizContent(rows);
  assert.ok(!result.issues.some((item) => item.code.endsWith('repeated_longest_correct')));
});

test('treats the twelve-character and 1.25-ratio boundaries as inclusive', () => {
  const correct = `${'А'.repeat(18)} ${'Б'.repeat(19)} ${'В'.repeat(21)}`;
  const firstDistractor = `${'Г'.repeat(14)} ${'Д'.repeat(15)} ${'Е'.repeat(17)}`;
  const secondDistractor = `${'Ж'.repeat(14)} ${'З'.repeat(15)} ${'И'.repeat(17)}`;
  assert.equal(correct.length, 60);
  assert.equal(firstDistractor.length, 48);

  const rows = Array.from({ length: 3 }, (_, index) => {
    const row = repeatedLongestCorrectRow(`fr-${index + 1}`);
    row.meaning_ru = correct;
    row.meaning_uk = correct;
    row.quiz_ru.distractors[0].text = firstDistractor;
    row.quiz_ru.distractors[1].text = secondDistractor;
    row.quiz_uk.distractors[0].text = firstDistractor;
    row.quiz_uk.distractors[1].text = secondDistractor;
    return row;
  });

  const result = evaluateDailyPhraseQuizContent(rows);
  assert.ok(result.issues.some((item) => item.code === 'ru.repeated_longest_correct'));
  assert.ok(result.issues.some((item) => item.code === 'uk.repeated_longest_correct'));
});

test('measures visible answer length in graphemes rather than UTF-16 code units', () => {
  const rows = Array.from({ length: 3 }, (_, index) => {
    const row = validRow();
    row.id = `fr-${index + 1}`;
    row.meaning_ru = `Точный смысл ${'😀'.repeat(20)} понятен без лишней подсказки.`;
    row.meaning_uk = `Точний зміст ${'😀'.repeat(20)} зрозумілий без зайвої підказки.`;
    const ruLength = graphemeLength(row.meaning_ru);
    const ukLength = graphemeLength(row.meaning_uk);
    row.quiz_ru.distractors[0].text = padToGraphemeLength('Буквальный образ описывает совсем другое действие', ruLength, 'а');
    row.quiz_ru.distractors[1].text = padToGraphemeLength('Соседний смысл предлагает иное решение ситуации', ruLength, 'б');
    row.quiz_uk.distractors[0].text = padToGraphemeLength('Буквальний образ описує зовсім іншу дію', ukLength, 'а');
    row.quiz_uk.distractors[1].text = padToGraphemeLength('Сусіднє значення пропонує інше рішення ситуації', ukLength, 'б');
    assert.equal(graphemeLength(row.quiz_ru.distractors[0].text), ruLength);
    assert.equal(graphemeLength(row.quiz_uk.distractors[0].text), ukLength);
    return row;
  });

  const result = evaluateDailyPhraseQuizContent(rows);
  assert.ok(!result.issues.some((item) => item.code.endsWith('repeated_longest_correct')));
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

test('quiz schema rejects non-string learner-facing scalar leaves', () => {
  const cases = [
    ['ru.correct_meaning_type', (row) => { row.meaning_ru = [row.meaning_ru]; }],
    ['uk.correct_meaning_type', (row) => { row.meaning_uk = [row.meaning_uk]; }],
    ['ru.correct_feedback_type', (row) => { row.quiz_ru.correctFeedback = [row.quiz_ru.correctFeedback]; }],
    ['ru.distractor_id_type', (row) => { row.quiz_ru.distractors[0].id = [row.quiz_ru.distractors[0].id]; }],
    ['ru.distractor_text_type', (row) => { row.quiz_ru.distractors[0].text = [row.quiz_ru.distractors[0].text]; }],
    ['ru.misconception_code_type', (row) => { row.quiz_ru.distractors[0].misconceptionCode = [row.quiz_ru.distractors[0].misconceptionCode]; }],
    ['ru.distractor_feedback_type', (row) => { row.quiz_ru.distractors[0].feedback = [row.quiz_ru.distractors[0].feedback]; }],
  ];

  for (const [expectedCode, mutate] of cases) {
    const row = validRow();
    mutate(row);
    const result = evaluateDailyPhraseQuizContent([row]);
    assert.equal(result.verdict, 'HOLD', expectedCode);
    assert.ok(result.issues.some((item) => item.code === expectedCode), expectedCode);
  }
});

test('stable distractor ids and misconception codes reject surrounding whitespace bytes', () => {
  const idDrift = validRow();
  idDrift.quiz_uk.distractors[0].id = ` ${idDrift.quiz_uk.distractors[0].id} `;
  const idResult = evaluateDailyPhraseQuizContent([idDrift]);
  assert.equal(idResult.verdict, 'HOLD');
  assert.ok(idResult.issues.some((item) => item.code === 'uk.invalid_distractor_id'));
  assert.ok(idResult.issues.some((item) => item.code === 'locale.distractor_id_mismatch'));

  const codeDrift = validRow();
  codeDrift.quiz_uk.distractors[0].misconceptionCode = ` ${codeDrift.quiz_uk.distractors[0].misconceptionCode} `;
  const codeResult = evaluateDailyPhraseQuizContent([codeDrift]);
  assert.equal(codeResult.verdict, 'HOLD');
  assert.ok(codeResult.issues.some((item) => item.code === 'uk.invalid_misconception_code'));
  assert.ok(codeResult.issues.some((item) => item.code === 'locale.misconception_code_mismatch'));
});

test('quiz batch rejects duplicate row ids', () => {
  const row = validRow();
  const result = evaluateDailyPhraseQuizContent([row, structuredClone(row)]);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'batch.duplicate_row_id'));
});

test('quiz batch rejects an array row id instead of coercing it to a string', () => {
  const row = validRow();
  row.id = ['es-001'];
  const result = evaluateDailyPhraseQuizContent([row]);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'batch.invalid_row_id_type'));
});

test('quiz CLI reports both a duplicate selected id and a missing requested id', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-phrase-quiz-ids-'));
  const bankPath = path.join(tempDir, 'bank.json');
  try {
    const row = validRow();
    fs.writeFileSync(bankPath, `${JSON.stringify({ rows: [row, structuredClone(row)] })}\n`);
    const result = spawnSync(process.execPath, [
      'scripts/daily_phrase_quiz_content_gate.mjs',
      bankPath,
      path.resolve('admin/daily_phrases_seed.json'),
      '--ids',
      'es-001,es-999',
    ], { cwd: process.cwd(), encoding: 'utf8' });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.notEqual(result.status, 0, output);
    assert.match(output, /duplicate[^\n]*es-001|es-001[^\n]*duplicate/iu);
    assert.match(output, /missing[^\n]*es-999|unknown[^\n]*es-999|es-999[^\n]*(?:missing|unknown)/iu);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('quiz CLI requires and enforces the canonical English baseline pool', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-phrase-quiz-baseline-'));
  const bankPath = path.join(tempDir, 'bank.json');
  const baselinePath = path.resolve('admin/daily_phrases_seed.json');
  try {
    const row = validRow();
    fs.writeFileSync(bankPath, `${JSON.stringify({ rows: [row] })}\n`);
    const missing = spawnSync(process.execPath, [
      'scripts/daily_phrase_quiz_content_gate.mjs', bankPath, '--ids', 'es-001',
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.notEqual(missing.status, 0, `${missing.stdout}\n${missing.stderr}`);
    assert.match(`${missing.stdout}\n${missing.stderr}`, /English.*baseline|baseline.*English/iu);

    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    row.quiz_ru.distractors[0].text = baseline[10].meaning;
    fs.writeFileSync(bankPath, `${JSON.stringify({ rows: [row] })}\n`);
    const copied = spawnSync(process.execPath, [
      'scripts/daily_phrase_quiz_content_gate.mjs', bankPath, baselinePath, '--ids', 'es-001',
    ], { cwd: process.cwd(), encoding: 'utf8' });
    const output = `${copied.stdout}\n${copied.stderr}`;
    assert.notEqual(copied.status, 0, output);
    assert.match(output, /english_pool_copy/u);

    const fakeBaselinePath = path.join(tempDir, 'fake-baseline.json');
    const fakeBaseline = Array.from({ length: 176 }, (_, index) => ({
      meaning: `Иное значение номер ${index + 1} для подменённого набора.`,
      meaning_uk: `Інше значення номер ${index + 1} для підміненого набору.`,
    }));
    fs.writeFileSync(fakeBaselinePath, `${JSON.stringify(fakeBaseline)}\n`);
    const substituted = spawnSync(process.execPath, [
      'scripts/daily_phrase_quiz_content_gate.mjs', bankPath, fakeBaselinePath, '--ids', 'es-001',
    ], { cwd: process.cwd(), encoding: 'utf8' });
    const substitutedOutput = `${substituted.stdout}\n${substituted.stderr}`;
    assert.notEqual(substituted.status, 0, substitutedOutput);
    assert.match(substitutedOutput, /english_baseline\.authority_mismatch/u);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

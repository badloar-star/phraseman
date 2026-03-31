/**
 * Unit tests for app/feedback_engine.ts
 *
 * Покрытие:
 *  1. Точный trigger match (одно слово в trigger)
 *  2. Trigger match по фразе
 *  3. Приоритет длинного trigger над коротким
 *  4. Fallback к generalRule при отсутствии совпадений
 *  5. null при errorTraps = null / undefined
 *  6. quizMode=true → lite если есть, иначе explanation
 *  7. Нечувствительность к регистру
 *  8. Нечувствительность к знакам препинания в конце ввода
 *  9. Пустой массив traps → generalRule
 * 10. quizMode=true + нет trigger match + generalRule > 100 символов → обрезка
 * 11. source и matchedTrigger проставлены верно
 * 12. Сокращения раскрываются перед сравнением (интеграция с contractions)
 */

import {
  findContextualExplanation,
  normalizeForComparison,
} from '../app/feedback_engine';
import type { PhraseErrorTraps } from '../app/types/feedback';

// ─── Фикстуры ──────────────────────────────────────────────────────────────────

const LONG_GENERAL_RULE = 'A'.repeat(120); // 120 символов — гарантированно > 100

/** Базовый трап: trigger=['i is'], есть lite */
const basicTraps: PhraseErrorTraps = {
  phraseIndex: 0,
  traps: [
    {
      trigger: ['i is'],
      explanation: 'Wrong verb: use "I am", not "I is".',
      lite: 'Use "I am".',
    },
  ],
  generalRule: 'Use "am/is/are" with subject pronouns.',
};

/**
 * Два трапа с перекрывающимися триггерами — проверка приоритета.
 *
 * ВАЖНО: sortTriggersByLengthDesc сортирует триггеры ВНУТРИ трапа,
 * но порядок самих трапов в массиве не изменяется.
 * Более специфичный трап ("not saw") должен стоять раньше общего ("saw").
 * Если "saw" стоит первым — он сработает раньше, и "not saw" не проверяется.
 * Это поведение зафиксировано в тестах-документации ниже.
 */
const priorityTrapsCorrectOrder: PhraseErrorTraps = {
  phraseIndex: 1,
  traps: [
    // Специфичный (длинный) трап — первым
    {
      trigger: ['not saw'],
      explanation: 'Long trigger: "not saw" matched.',
      lite: 'not-saw-lite',
    },
    // Общий (короткий) трап — вторым
    {
      trigger: ['saw'],
      explanation: 'Short trigger: "saw" matched.',
      lite: 'saw-lite',
    },
  ],
  generalRule: 'Past tense rules.',
};

/**
 * Трапы в «неправильном» порядке: короткий trigger стоит раньше длинного.
 * Документирует фактическое поведение — первый подходящий трап побеждает,
 * независимо от длины его триггера.
 */
const priorityTrapsWrongOrder: PhraseErrorTraps = {
  phraseIndex: 7,
  traps: [
    {
      trigger: ['saw'],
      explanation: 'Short trigger: "saw" matched.',
      lite: 'saw-lite',
    },
    {
      trigger: ['not saw'],
      explanation: 'Long trigger: "not saw" matched.',
      lite: 'not-saw-lite',
    },
  ],
  generalRule: 'Past tense rules.',
};

/** Трап без поля lite */
const noLiteTraps: PhraseErrorTraps = {
  phraseIndex: 2,
  traps: [
    {
      trigger: ['did not saw'],
      explanation: 'Use "did not see", not "did not saw".',
    },
  ],
  generalRule: 'General rule without lite.',
};

/** Пустой массив traps, только generalRule */
const emptyTraps: PhraseErrorTraps = {
  phraseIndex: 3,
  traps: [],
  generalRule: 'Fallback general rule.',
};

/** Пустой массив traps + длинное generalRule */
const longRuleTraps: PhraseErrorTraps = {
  phraseIndex: 4,
  traps: [],
  generalRule: LONG_GENERAL_RULE,
};

/** Нет generalRule вообще */
const noGeneralRuleTraps: PhraseErrorTraps = {
  phraseIndex: 5,
  traps: [],
  // generalRule не задан
};

// ─── normalizeForComparison ─────────────────────────────────────────────────────

describe('normalizeForComparison', () => {
  test('приводит к нижнему регистру', () => {
    expect(normalizeForComparison('I AM')).toBe('i am');
  });

  test('убирает знаки пунктуации в конце', () => {
    expect(normalizeForComparison('hello world.')).toBe('hello world');
    expect(normalizeForComparison('hello world!')).toBe('hello world');
    expect(normalizeForComparison('hello world?')).toBe('hello world');
  });

  test('убирает пунктуацию внутри строки', () => {
    // запятая в середине
    expect(normalizeForComparison('well, I am here')).toBe('well i am here');
  });

  test('схлопывает лишние пробелы', () => {
    expect(normalizeForComparison('  too   many   spaces  ')).toBe('too many spaces');
  });
});

// ─── findContextualExplanation ──────────────────────────────────────────────────

describe('findContextualExplanation', () => {

  // ── 5. null при отсутствующих errorTraps ─────────────────────────────────────

  describe('null / undefined errorTraps', () => {
    test('5a. errorTraps = null → возвращает null', () => {
      expect(findContextualExplanation('i is a teacher', null)).toBeNull();
    });

    test('5b. errorTraps = undefined → возвращает null', () => {
      expect(findContextualExplanation('i is a teacher', undefined)).toBeNull();
    });
  });

  // ── 1. Точный trigger match ───────────────────────────────────────────────────

  describe('Trigger matching', () => {
    test('1. Точный match: "i is a teacher" → trigger=["i is"]', () => {
      const result = findContextualExplanation('i is a teacher', basicTraps);
      expect(result).not.toBeNull();
      expect(result?.explanation).toBe('Wrong verb: use "I am", not "I is".');
    });

    // ── 2. Trigger match по фразе ───────────────────────────────────────────────

    test('2. Match по фразе: "i did not saw him" → trigger=["not saw"] (трап стоит первым)', () => {
      const result = findContextualExplanation('i did not saw him', priorityTrapsCorrectOrder);
      expect(result).not.toBeNull();
      expect(result?.explanation).toBe('Long trigger: "not saw" matched.');
    });

    // ── 3. Приоритет длинного trigger ──────────────────────────────────────────

    test('3. Длинный trigger побеждает когда его трап стоит раньше в массиве', () => {
      // priorityTrapsCorrectOrder: "not saw" трап стоит первым → побеждает
      const result = findContextualExplanation('i did not saw him', priorityTrapsCorrectOrder);
      expect(result?.explanation).toBe('Long trigger: "not saw" matched.');
      expect(result?.explanation).not.toBe('Short trigger: "saw" matched.');
    });

    test('3b. Трапы сортируются по длине наибольшего триггера → длинный trigger побеждает', () => {
      // Движок сортирует трапы по длине наибольшего триггера (от большего к меньшему).
      // Даже если "saw" стоит первым в массиве, "not saw" побеждает потому что длиннее.
      const result = findContextualExplanation('i did not saw him', priorityTrapsWrongOrder);
      expect(result?.explanation).toBe('Long trigger: "not saw" matched.');
    });

    test('Только короткий trigger присутствует → возвращает short match', () => {
      // "he saw me" — содержит "saw", но не "not saw"
      const result = findContextualExplanation('he saw me', priorityTrapsCorrectOrder);
      expect(result?.explanation).toBe('Short trigger: "saw" matched.');
    });

    test('Trigger совпадает в середине предложения, не только в начале', () => {
      const result = findContextualExplanation(
        'yesterday i not saw him clearly',
        priorityTrapsCorrectOrder,
      );
      expect(result?.explanation).toBe('Long trigger: "not saw" matched.');
    });

    // ── 11. source и matchedTrigger ─────────────────────────────────────────────

    test('11a. При trigger match: source = "trap"', () => {
      const result = findContextualExplanation('i is a teacher', basicTraps);
      expect(result?.source).toBe('trap');
    });

    test('11b. При trigger match: matchedTrigger содержит совпавший триггер', () => {
      const result = findContextualExplanation('i is a teacher', basicTraps);
      expect(result?.matchedTrigger).toBe('i is');
    });

    test('11c. При fallback к generalRule: source = "general_rule"', () => {
      const result = findContextualExplanation('she goes to school', basicTraps);
      expect(result?.source).toBe('general_rule');
    });

    test('11d. При fallback к generalRule: matchedTrigger = undefined', () => {
      const result = findContextualExplanation('she goes to school', basicTraps);
      expect(result?.matchedTrigger).toBeUndefined();
    });
  });

  // ── 4. Fallback к generalRule ─────────────────────────────────────────────────

  describe('Fallback behaviour', () => {
    test('4. Нет совпадений trigger → возвращает generalRule', () => {
      const result = findContextualExplanation('she goes to school', basicTraps);
      expect(result?.explanation).toBe('Use "am/is/are" with subject pronouns.');
    });

    test('9. Пустой traps → возвращает generalRule', () => {
      const result = findContextualExplanation('any input', emptyTraps);
      expect(result?.explanation).toBe('Fallback general rule.');
    });

    test('Нет trigger match и нет generalRule → возвращает null', () => {
      const result = findContextualExplanation('any input', noGeneralRuleTraps);
      expect(result).toBeNull();
    });
  });

  // ── 7. Нечувствительность к регистру ─────────────────────────────────────────

  describe('Case insensitivity', () => {
    test('7a. Верхний регистр ввода: "I IS A TEACHER" → матчит trigger=["i is"]', () => {
      const result = findContextualExplanation('I IS A TEACHER', basicTraps);
      expect(result?.explanation).toBe('Wrong verb: use "I am", not "I is".');
    });

    test('7b. Смешанный регистр: "I Is a teacher" → матчит trigger=["i is"]', () => {
      const result = findContextualExplanation('I Is a teacher', basicTraps);
      expect(result?.explanation).toBe('Wrong verb: use "I am", not "I is".');
    });
  });

  // ── 8. Нечувствительность к знакам препинания в конце ────────────────────────

  describe('Trailing punctuation insensitivity', () => {
    test('8a. Точка в конце: "i is a teacher." → матчит', () => {
      const result = findContextualExplanation('i is a teacher.', basicTraps);
      expect(result?.explanation).toBe('Wrong verb: use "I am", not "I is".');
    });

    test('8b. Вопросительный знак: "i is correct?" → матчит', () => {
      const result = findContextualExplanation('i is correct?', basicTraps);
      expect(result?.explanation).toBe('Wrong verb: use "I am", not "I is".');
    });

    test('8c. Восклицательный знак: "i is here!" → матчит', () => {
      const result = findContextualExplanation('i is here!', basicTraps);
      expect(result?.explanation).toBe('Wrong verb: use "I am", not "I is".');
    });
  });

  // ── 6. quizMode=true ──────────────────────────────────────────────────────────

  describe('quizMode = true', () => {
    test('6a. quizMode=true + есть lite → возвращает lite', () => {
      const result = findContextualExplanation('i is a teacher', basicTraps, true);
      expect(result?.explanation).toBe('Use "I am".');
    });

    test('6b. quizMode=true + нет lite + есть trigger match → возвращает explanation', () => {
      const result = findContextualExplanation('i did not saw him', noLiteTraps, true);
      expect(result?.explanation).toBe('Use "did not see", not "did not saw".');
    });

    test('6c. quizMode=true + нет trigger match → generalRule (≤100 символов)', () => {
      const result = findContextualExplanation('she goes to school', basicTraps, true);
      expect(result?.explanation).toBe('Use "am/is/are" with subject pronouns.');
      expect(result?.explanation.length).toBeLessThanOrEqual(100);
    });

    // ── 10. quizMode=true + длинный generalRule → обрезка ────────────────────

    test('10. quizMode=true + generalRule > 100 символов → обрезается до 100', () => {
      const result = findContextualExplanation('any input', longRuleTraps, true);
      expect(result).not.toBeNull();
      expect(result?.explanation.length).toBe(100);
      expect(result?.explanation).toBe(LONG_GENERAL_RULE.slice(0, 100));
    });

    test('quizMode=false (default) + generalRule > 100 символов → НЕ обрезается', () => {
      const result = findContextualExplanation('any input', longRuleTraps, false);
      expect(result?.explanation).toBe(LONG_GENERAL_RULE);
      expect(result?.explanation.length).toBe(120);
    });
  });

  // ── 12. Интеграция с contractions ─────────────────────────────────────────────

  describe('Contraction expansion (интеграция с normalize)', () => {
    const contractionsTraps: PhraseErrorTraps = {
      phraseIndex: 6,
      traps: [
        {
          trigger: ['did not see'],
          explanation: 'Correct form is "did not see".',
        },
      ],
      generalRule: 'Check past tense.',
    };

    test('12a. "didn\'t see" раскрывается до "did not see" → матчит trigger', () => {
      const result = findContextualExplanation("he didn't see it", contractionsTraps);
      expect(result?.explanation).toBe('Correct form is "did not see".');
    });

    test('12b. curly apostrophe (iOS) в сокращении → тоже матчит', () => {
      // \u2019 — right single quotation mark (автозамена iOS)
      const result = findContextualExplanation('he didn\u2019t see it', contractionsTraps);
      expect(result?.explanation).toBe('Correct form is "did not see".');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    test('Пустая строка ввода + нет trigger match → generalRule', () => {
      const result = findContextualExplanation('', basicTraps);
      expect(result?.explanation).toBe('Use "am/is/are" with subject pronouns.');
    });

    test('Пустая строка ввода + quizMode=true → generalRule ≤100 символов', () => {
      const result = findContextualExplanation('', basicTraps, true);
      expect(result?.explanation.length).toBeLessThanOrEqual(100);
    });

    test('Trigger полностью совпадает с вводом (без лишних слов)', () => {
      const result = findContextualExplanation('i is', basicTraps);
      expect(result?.explanation).toBe('Wrong verb: use "I am", not "I is".');
    });

    test('FeedbackResult иммутабелен — повторный вызов с теми же данными', () => {
      const r1 = findContextualExplanation('i is here', basicTraps);
      const r2 = findContextualExplanation('i is here', basicTraps);
      // Каждый вызов возвращает независимый объект
      expect(r1).not.toBe(r2);
      expect(r1?.explanation).toBe(r2?.explanation);
    });

    test('quizMode=true + нет traps + нет generalRule → null', () => {
      const result = findContextualExplanation('any input', noGeneralRuleTraps, true);
      expect(result).toBeNull();
    });
  });
});

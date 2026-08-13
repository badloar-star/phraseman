/**
 * cards-2.0 (E6): fuzzy-сравнение письменного ввода (app/flashcards/fuzzy_match.ts, §3.6).
 * Покрытие: нормализация ё/е, і/ї/є и латинская i, «;»/«/»-варианты правильного
 * ответа, Левенштейн ≤1 на словах ≥5 букв (короткие — строго), contractions
 * don't/do not сквозь fuzzy-пайплайн, пунктуация/дефисы.
 */
import {
  FUZZY_MIN_TYPO_WORD_LEN,
  isFuzzyCorrect,
  normalizeAnswer,
  splitAnswerVariants,
  withinLevenshtein1,
} from '../app/flashcards/fuzzy_match';

// ════════════════════════════════════════════════════════════════════════════
describe('normalizeAnswer', () => {
  it('ё → е (обе стороны сравнения)', () => {
    expect(normalizeAnswer('ещё')).toBe(normalizeAnswer('еще'));
    expect(normalizeAnswer('Всё хорошо!')).toBe(normalizeAnswer('все хорошо'));
  });

  it('укр. ї → і → латинская i; є → е', () => {
    expect(normalizeAnswer('їсти')).toBe(normalizeAnswer('істи'));
    // кириллическая і и латинская i становятся одним символом
    expect(normalizeAnswer('мій')).toBe(normalizeAnswer('мiй')); // латинская i внутри
    expect(normalizeAnswer('єдиний')).toBe(normalizeAnswer('единий'));
  });

  it('внутренняя пунктуация и дефисы снимаются, пробелы схлопываются', () => {
    expect(normalizeAnswer('ice-cream')).toBe(normalizeAnswer('ice cream'));
    expect(normalizeAnswer('Hello,   world!')).toBe(normalizeAnswer('hello world'));
    expect(normalizeAnswer('«так, точно»')).toBe(normalizeAnswer('так точно'));
  });

  it('contractions-слой внутри: don’t → do not, lowercase, trim', () => {
    expect(normalizeAnswer("  Don't give up  ")).toBe(normalizeAnswer('do not give up'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('splitAnswerVariants', () => {
  it('режет по «;» и «/», исходная строка всегда включена целиком', () => {
    expect(splitAnswerVariants('hello; hi')).toEqual(['hello; hi', 'hello', 'hi']);
    expect(splitAnswerVariants('he/she is')).toEqual(expect.arrayContaining(['he/she is', 'he', 'she is']));
  });

  it('пустая строка → нет вариантов; дубликаты убираются', () => {
    expect(splitAnswerVariants('')).toEqual([]);
    expect(splitAnswerVariants('   ')).toEqual([]);
    expect(splitAnswerVariants('hi; hi')).toEqual(['hi; hi', 'hi']);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('withinLevenshtein1', () => {
  it('равные строки и расстояние 1 (замена/вставка/удаление)', () => {
    expect(withinLevenshtein1('important', 'important')).toBe(true);
    expect(withinLevenshtein1('importent', 'important')).toBe(true); // замена
    expect(withinLevenshtein1('imporant', 'important')).toBe(true); // удаление
    expect(withinLevenshtein1('importaant', 'important')).toBe(true); // вставка
  });

  it('расстояние 2 — false (в т.ч. транспозиция)', () => {
    expect(withinLevenshtein1('imporent', 'important')).toBe(false);
    expect(withinLevenshtein1('improtant', 'important')).toBe(false); // перестановка = 2 правки
    expect(withinLevenshtein1('abc', 'abcde')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('isFuzzyCorrect — точные совпадения (exact)', () => {
  it("contractions: don't == do not в обе стороны (слой isCorrectAnswer не сломан)", () => {
    expect(isFuzzyCorrect("don't give up", 'do not give up')).toEqual({ ok: true, exact: true, typo: false });
    expect(isFuzzyCorrect('do not give up', "Don't give up")).toEqual({ ok: true, exact: true, typo: false });
  });

  it('ё/е и і/ї эквивалентны без пометки typo', () => {
    expect(isFuzzyCorrect('еще не поздно', 'ещё не поздно')).toEqual({ ok: true, exact: true, typo: false });
    expect(isFuzzyCorrect('їсти', 'істи')).toEqual({ ok: true, exact: true, typo: false });
    // латинская i в украинском слове с клавиатуры
    expect(isFuzzyCorrect('мiй дім', 'мій дім').ok).toBe(true);
  });

  it('варианты через «;»: любой из вариантов засчитывается', () => {
    expect(isFuzzyCorrect('hi', 'hello; hi').ok).toBe(true);
    expect(isFuzzyCorrect('hello', 'hello; hi').ok).toBe(true);
    expect(isFuzzyCorrect('hey', 'hello; hi').ok).toBe(false);
  });

  it('варианты через «/»: и часть, и исходное написание целиком', () => {
    expect(isFuzzyCorrect('she is', 'he/she is').ok).toBe(true);
    expect(isFuzzyCorrect('he/she is', 'he/she is').ok).toBe(true);
    // «he» — отдельный вариант после split
    expect(isFuzzyCorrect('he', 'he/she is').ok).toBe(true);
  });

  it('дефис/пунктуация: ice-cream == ice cream', () => {
    expect(isFuzzyCorrect('ice cream', 'ice-cream')).toEqual({ ok: true, exact: true, typo: false });
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('isFuzzyCorrect — опечатки (typo)', () => {
  it('Левенштейн ≤1 на слове ≥5 букв → ok с пометкой typo', () => {
    expect(FUZZY_MIN_TYPO_WORD_LEN).toBe(5);
    expect(isFuzzyCorrect('importent decision', 'important decision')).toEqual({
      ok: true,
      exact: false,
      typo: true,
    });
    expect(isFuzzyCorrect('aple', 'apple')).toEqual({ ok: true, exact: false, typo: true });
  });

  it('короткие слова (<5) — строго, без Левенштейна', () => {
    expect(isFuzzyCorrect('cot', 'cat').ok).toBe(false);
    expect(isFuzzyCorrect('melk', 'milk').ok).toBe(false);
    expect(isFuzzyCorrect('give ap', 'give up').ok).toBe(false);
  });

  it('две правки в одном слове — не засчитывается', () => {
    expect(isFuzzyCorrect('imporent', 'important').ok).toBe(false);
  });

  it('число слов должно совпадать', () => {
    expect(isFuzzyCorrect('important', 'important decision').ok).toBe(false);
    expect(isFuzzyCorrect('very important decision', 'important decision').ok).toBe(false);
  });

  it('contractions сквозь fuzzy: опечатка поверх раскрытого сокращения', () => {
    // doesn't → does not (слой 1) + 'understnd' ~ 'understand' (Левенштейн 1, ≥5 букв)
    expect(isFuzzyCorrect('she does not understnd', "she doesn't understand")).toEqual({
      ok: true,
      exact: false,
      typo: true,
    });
    expect(isFuzzyCorrect("she doesn't understnd", "she doesn't understand").typo).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('isFuzzyCorrect — граничные случаи', () => {
  it('пустой ввод / пустой ответ → не ok', () => {
    expect(isFuzzyCorrect('', 'hello')).toEqual({ ok: false, exact: false, typo: false });
    expect(isFuzzyCorrect('   ', 'hello').ok).toBe(false);
    expect(isFuzzyCorrect('hello', '').ok).toBe(false);
  });

  it('alternatives участвуют в сравнении', () => {
    expect(isFuzzyCorrect('begin', 'start', ['begin']).ok).toBe(true);
    expect(isFuzzyCorrect('beginn', 'start', ['begin']).typo).toBe(true);
  });
});

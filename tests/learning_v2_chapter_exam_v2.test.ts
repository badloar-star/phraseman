// Экзамен главы v2 (владелец 25.10, выбор кнопками): 10 заданий трёх типов — ситуация → сам говоришь/пишешь, ответ в мини-диалоге,
// найди и исправь ошибку; без подсказок, одна попытка; проверка офлайн — нормализация и допустимые варианты; не сдал → слабые темы
// → «Повторить эти темы» → пересдача сразу, без повторения — через час.
import {
  CHAPTER_EXAM_V2_PASS_CORRECT,
  CHAPTER_EXAM_V2_QUESTION_COUNT,
  CHAPTER_EXAM_V2_RETRY_DELAY_MS,
  chapterExamV2RetryAtMs,
  checkChapterExamV2Answer,
  normalizeChapterExamV2Answer,
  scoreChapterExamV2,
  selectChapterExamV2Items,
} from '../modules/learning-v2/exam/chapter_exam_v2';
import { CHAPTER_EXAM_V2_BANK_L01_C2 as bank } from '../modules/learning-v2/exam/banks/chapter_exam_v2_l01_c2';

const item = (id: string) => bank.items.find((i) => i.id === id)!;

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('экзамен главы v2: проверка ответа офлайн', () => {
  it('регистр, точки, апострофы и сокращения не валят верный ответ', () => {
    expect(normalizeChapterExamV2Answer('I’M NOT ready yet!')).toBe('i am not ready yet');
    expect(checkChapterExamV2Answer(item('l01c2-04'), 'i am not hungry').correct).toBe(true);
    expect(checkChapterExamV2Answer(item('l01c2-04'), "I'm not hungry").correct).toBe(true);
    expect(checkChapterExamV2Answer(item('l01c2-09'), "you aren't late").correct).toBe(true);
    expect(checkChapterExamV2Answer(item('l01c2-09'), 'You are not late.').correct).toBe(true);
  });

  it('неверное — неверно; переписанная без правки фраза с ошибкой — неверно', () => {
    expect(checkChapterExamV2Answer(item('l01c2-13'), 'She are at home.').correct).toBe(false);
    expect(checkChapterExamV2Answer(item('l01c2-02'), 'The coffee are cold.').correct).toBe(false);
    expect(checkChapterExamV2Answer(item('l01c2-04'), '').correct).toBe(false);
  });

  it('одна опечатка в длинном слове засчитывается, в коротком — нет', () => {
    const typo = checkChapterExamV2Answer(item('l01c2-04'), "I'm not hungyr.");
    expect(typo.correct).toBe(false);
    const oneEdit = checkChapterExamV2Answer(item('l01c2-04'), "I'm not hngry.");
    expect(oneEdit).toEqual(expect.objectContaining({ correct: true, typo: true }));
    expect(checkChapterExamV2Answer(item('l01c2-13'), 'She iz at home.').correct).toBe(false);
  });
});

describe('банк главы 2: только пройденная грамматика (эпизоды 1–16)', () => {
  it('в ответах нет «we / they» и вопросов; у каждой темы ≥ 3 заданий; ≥ 10 заданий с запасом', () => {
    expect(bank.items.length).toBeGreaterThan(CHAPTER_EXAM_V2_QUESTION_COUNT);
    for (const i of bank.items) {
      for (const a of i.accepted) {
        expect(a).not.toMatch(/(we|they|we're|they're)/iu);
        expect(a.trim().endsWith('?')).toBe(false);
      }
    }
    for (const point of bank.grammarPoints) {
      expect(bank.items.filter((i) => i.grammarPoint === point.id).length).toBeGreaterThanOrEqual(3);
      expect(point.episodeOrdinals.length).toBeGreaterThan(0);
    }
  });
});

describe('экзамен главы v2: подбор, итог, пересдача', () => {
  it('10 заданий, каждая тема с заданиями хотя бы раз, детерминированно по попытке', () => {
    const a = selectChapterExamV2Items(bank, { examKey: 'en:lesson-01:chapter-2', attempt: 1 });
    const b = selectChapterExamV2Items(bank, { examKey: 'en:lesson-01:chapter-2', attempt: 1 });
    expect(a).toHaveLength(CHAPTER_EXAM_V2_QUESTION_COUNT);
    expect(a?.map((i) => i.id)).toEqual(b?.map((i) => i.id));
    const pointsWithItems = new Set(bank.items.map((i) => i.grammarPoint));
    expect(new Set(a?.map((i) => i.grammarPoint))).toEqual(pointsWithItems);
  });

  it('сдал от 8 из 10; слабые темы — с ошибками, больше ошибок выше, с эпизодами для повторения', () => {
    expect(CHAPTER_EXAM_V2_PASS_CORRECT).toBe(8);
    const answers = bank.items.slice(0, 10).map((i, k) => ({ itemId: i.id, grammarPoint: i.grammarPoint, correct: k > 2 }));
    const result = scoreChapterExamV2(bank, answers);
    expect(result.correct).toBe(7);
    expect(result.passed).toBe(false);
    expect(result.weakPoints[0]).toEqual(expect.objectContaining({ grammarPoint: expect.any(String), errors: expect.any(Number) }));
    expect(result.weakPoints.find((w) => w.grammarPoint === 'l01c2_is')?.episodeOrdinals).toEqual([9, 16]);
  });

  it('пересдача: после «Повторить эти темы» — сразу, без повторения — через час', () => {
    expect(chapterExamV2RetryAtMs({ failedAtMs: 1000, reviewedAtMs: null })).toBe(1000 + CHAPTER_EXAM_V2_RETRY_DELAY_MS);
    expect(chapterExamV2RetryAtMs({ failedAtMs: 1000, reviewedAtMs: 5000 })).toBe(5000);
    expect(chapterExamV2RetryAtMs({ failedAtMs: 9000, reviewedAtMs: 5000 })).toBe(9000 + CHAPTER_EXAM_V2_RETRY_DELAY_MS);
  });
});

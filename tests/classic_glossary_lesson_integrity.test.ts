/**
 * Словарь урока: без дублей «слово / артикль+слово», без слов не из урока, слова заданий есть в словаре, без мусорных форм (Ревизор, 05.11.2026).
 *
 * зачем (дополнение владельца 09:05: «в уроке N только новые слова … каждое слово изучается ровно в одном уроке»; решение координатора 11:xx после перепрогона «Новичка»:
 * словари после «охвата слов» разрослись дублями, лишними и мусорными записями — понятность блока WORDS упала с 5/15 до 1/15). Эвристики — scripts/classic_glossary_integrity.cjs
 * (без морфологии: формы глаголов по основе из 4 букв). Красный до чистых данных; точную проверку делает агент-читатель.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { check } = require('../scripts/classic_glossary_integrity.cjs') as {
  check: (course: string) => { lemmas: number; D1: string[]; D2: string[]; D4: string[]; D3: Record<number, { missing: string[]; share: number }> };
};

const COURSES = ['en', 'es', 'fr', 'de', 'it'] as const;

describe.each(COURSES)('словарь урока %s', (course) => {
  const r = check(course);
  it('D1: нет дублей «слово» и «артикль + слово» (одно слово — один урок)', () => {
    expect(r.D1.slice(0, 8)).toEqual([]);
  });
  it('D2: слова словаря встречаются в материале своего урока (не более 1% «лишних»)', () => {
    expect(r.D2.length / r.lemmas).toBeLessThanOrEqual(0.01);
  });
  it('D4: нет мусорных форм (дефис в начале, цифры, тройные буквы, перевод без кириллицы)', () => {
    expect(r.D4.slice(0, 8)).toEqual([]);
  });
  it.each([1, 2, 3])('D3: урок %i — не менее 90% слов фраз есть в словаре уроков 1–N', (n) => {
    expect({ lesson: n, missing: r.D3[n].missing.slice(0, 20) }).toEqual({ lesson: n, missing: expect.anything() });
    expect(r.D3[n].share).toBeGreaterThanOrEqual(0.9);
  });
});

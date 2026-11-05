// зачем (координатор 05.11, правило владельца «прогресс не теряется никогда»): с переходом слов en на словарь курса
// прогресс «выученных слов» старого банка не должен уменьшиться.
import { projectEnglishWordCounts, EN_WORDS_REQUIRED } from '../app/en_words_switch';
import { classicLessonWordBank, classicWordsActiveFor } from '../app/classic_lesson_words';

const bankOf = (): Record<number, string[]> => {
  const out: Record<number, string[]> = {};
  for (let id = 1; id <= 32; id += 1) out[id] = classicLessonWordBank('en', id).map((w) => w.en);
  return out;
};
const learnedTotal = (m: Record<number, Record<string, number>>): number =>
  new Set(Object.values(m).flatMap((c) => Object.entries(c).filter(([, n]) => n >= EN_WORDS_REQUIRED).map(([w]) => w.toLocaleLowerCase()))).size;

describe('перенос прогресса слов en на словарь курса', () => {
  const bank = bankOf();

  test('en включён в слова курса и у каждого урока слова не повторяются между уроками', () => {
    expect(classicWordsActiveFor('en')).toBe(true);
    const seen = new Map<string, number>();
    for (let id = 1; id <= 32; id += 1) {
      for (const w of bank[id]!) {
        const k = w.toLocaleLowerCase();
        expect(seen.has(k) ? `${k}: l${seen.get(k)} и l${id}` : null).toBeNull();
        seen.set(k, id);
      }
    }
    expect(seen.size).toBeGreaterThan(800);
  });

  test('пользователь со старым прогрессом en: счёт выученных не уменьшился, слова переехали по тексту', () => {
    // прежний банк держал слово work в уроке 1, а в словаре курса оно в другом уроке; I — с большой буквы
    const lessonOfWork = Object.entries(bank).find(([, ws]) => ws.some((w) => w.toLocaleLowerCase() === 'work'));
    expect(lessonOfWork).toBeDefined();
    const stored = { 1: { I: 3, work: 3, door: 2 }, 2: { yes: 3 }, 5: { ghostword: 3 } } as Record<number, Record<string, number>>;
    const before = learnedTotal(stored);
    const res = projectEnglishWordCounts(stored, bank);
    expect(learnedTotal(res.next)).toBeGreaterThanOrEqual(before);
    // слово work теперь в своём уроке выучено на 3
    expect(res.next[Number(lessonOfWork![0])]!.work).toBe(3);
    // регистр: в словаре курса местоимение записано как есть в банке — оно получило счёт 3
    const iKey = bank[1]!.find((w) => w.toLocaleLowerCase() === 'i');
    if (iKey) expect(res.next[1]![iKey]).toBe(3);
    // ничего не удалено и не уменьшено
    for (const [lesson, counts] of Object.entries(stored)) {
      for (const [w, n] of Object.entries(counts)) expect(res.next[Number(lesson)]![w]).toBeGreaterThanOrEqual(n);
    }
    // слово, которого нет в словаре, сохранено как есть и названо несопоставленным
    expect(res.next[5]!.ghostword).toBe(3);
    expect(res.unmatched).toContain('ghostword');
  });

  test('повторный перенос ничего не меняет и пустой прогресс остаётся пустым', () => {
    const stored = { 1: { you: 3 }, 3: { start: 2 } } as Record<number, Record<string, number>>;
    const once = projectEnglishWordCounts(stored, bank);
    const twice = projectEnglishWordCounts(once.next, bank);
    expect(twice.changedLessons).toEqual([]);
    expect(twice.carried).toBe(0);
    const empty = projectEnglishWordCounts({}, bank);
    expect(empty.carried).toBe(0);
    expect(empty.changedLessons).toEqual([]);
  });
});

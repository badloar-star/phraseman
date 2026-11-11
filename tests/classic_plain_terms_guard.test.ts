/**
 * Теория и интро классики без грамматической «технички» и без шаблонного «Представь ситуацию» (Ревизор, 05.11.2026).
 *
 * зачем (слово владельца 05.11 08:50, стандарт docs/work/classic_plain_explanation_standard_2026-11-05.md): текст должен быть понятен
 * читателю, который не знает ни языка, ни грамматических слов («читал es урок 1 — ничего не понял»). Механическая часть шлюза:
 * в тексте ru и uk (теория + интро всех уроков всех курсов) нет запрещённых терминов, мета-блоков («что заучивать», «типичная ошибка», «выбор формы»)
 * и шаблона «Представь ситуацию / Уяви ситуацію». Смысловую часть («проверка пятилетнего читателя») делают независимые агенты — см.
 * docs/work/classic_child_reader_2026_11_05/. Расширить список — только вместе со стандартом.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { theoryTexts, introTexts } = require('../scripts/classic_plain_reader_extract.cjs') as {
  theoryTexts: (course: string, lesson: number, loc: string) => string[];
  introTexts: (course: string, lesson: number, loc: string) => string[];
};

const COURSES = ['en', 'es', 'fr', 'de', 'it'] as const;
const LESSONS = Array.from({ length: 32 }, (_, i) => i + 1);

const FORBIDDEN: Record<'ru' | 'uk', RegExp> = {
  ru: /подлежащ|сказуем|спряжен|вспомогательн|артикл|падеж|инфинитив|причасти|согласован|склонен|выбор форм|что заучивать|не заучивать|типичная ошибка|герунд|субъюнктив|сослагательн|наклонени|(?:страдательн|действительн)S* залог|залог (?:страдательн|действительн)|представь(те)? ситуацию/i,
  uk: /підмет|присудк|дієвідмін|відмінюванн|допоміжн|артикл|відмін(ок|ка|ки|ку)\b|інфінітив|дієприкметник|узгодж|вибір форми|що вчити|що не вчити|типова помилка|герунд|субʼюнктив|умовн(ий|ого) спосіб|уяви(ть)? ситуацію/i,
};

function hits(course: string, loc: 'ru' | 'uk', lessons: readonly number[]): string[] {
  const bad: string[] = [];
  for (const lesson of lessons) {
    for (const [kind, texts] of [['theory', theoryTexts(course, lesson, loc)], ['intro', introTexts(course, lesson, loc)]] as const) {
      for (const text of texts) {
        const m = text.match(FORBIDDEN[loc]);
        if (m) bad.push(`${course}:${lesson}:${kind}:${loc} «${m[0]}» в «${text.slice(0, 70)}»`);
      }
    }
  }
  return bad;
}

describe('теория и интро без техники и шаблонов — слово владельца 05.11 08:50', () => {
  it('самопроверка списка терминов', () => {
    for (const s of ['Это подлежащее', 'спряжение глагола', 'Что заучивать', 'Типичная ошибка', 'Представь ситуацию']) expect(FORBIDDEN.ru.test(s)).toBe(true);
    for (const s of ['Скажи: Estoy aquí', 'Друг стоит у двери', 'Я дома']) expect(FORBIDDEN.ru.test(s)).toBe(false);
    for (const s of ['Це підмет', 'Що вчити', 'Типова помилка', 'Уяви ситуацію']) expect(FORBIDDEN.uk.test(s)).toBe(true);
  });

  describe.each(COURSES)('%s', (course) => {
    it.each(['ru', 'uk'] as const)('уроки 1–3 (%s): запрещённых терминов нет', (loc) => {
      const bad = hits(course, loc, [1, 2, 3]);
      expect(bad.slice(0, 10)).toEqual([]);
    });
    it.each(['ru', 'uk'] as const)('все 32 урока (%s): запрещённых терминов нет', (loc) => {
      const bad = hits(course, loc, LESSONS);
      expect(bad.slice(0, 10)).toEqual([]);
      expect(bad.length).toBe(0);
    });
  });
});

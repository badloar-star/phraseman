// зачем (Теория 12, 05.11, владелец: «теория как для ребёнка»): новый формат теории (data[N].plain === true в theory.json) рисуется общим экраном
// TheoryLessonView: название главы → строки текста → карточки примеров (+ «Читается: …» для ru/uk) → образец/задания. Сторож по ИТОГОВЫМ данным
// theory.json (не по «исходнику писателя»): все фразы по id находятся в курсе, образцы показывают верный ответ, задания корректны.
import { getClassicPlainView, isClassicPlainLesson } from '../app/classic_theory_plain';
import { getClassicTheoryView } from '../app/classic_theory_view';
import type { TheoryDrill } from '../components/theory/TheoryLessonView';

const TARGETS = ['en', 'es', 'fr', 'de', 'it'] as const;
const LOCALES = ['ru', 'uk', 'en'] as const;

function plainLessons(target: string): number[] {
  const out: number[] = [];
  for (let n = 1; n <= 32; n += 1) if (isClassicPlainLesson(target, n)) out.push(n);
  return out;
}

describe('classic plain theory (new format): renders from theory.json', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => logSpy.mockRestore());

  it.each(TARGETS)('%s: every plain lesson resolves all phrases and gives a well-formed screen in ru/uk/en', (target) => {
    const lessons = plainLessons(target);
    expect(lessons.length).toBeGreaterThan(0); // урок 1 есть у всех пяти курсов
    for (const lessonId of lessons) {
      for (const locale of LOCALES) {
        const view = getClassicPlainView(target, lessonId, locale);
        expect([target, lessonId, locale, view !== null]).toEqual([target, lessonId, locale, true]);
        const v = view!;
        expect(v.title.length).toBeGreaterThan(0);
        expect(v.sections.length).toBeGreaterThanOrEqual(1);
        for (const section of v.sections) {
          expect(section.title.length).toBeGreaterThan(0);
          const kinds = new Set(section.blocks.map((b) => b.kind));
          // только простой текст, примеры, образец и задания — никаких «нюансов», «стратегий», таблиц
          expect([...kinds].filter((k) => !['body', 'examples', 'note', 'drill'].includes(k))).toEqual([]);
          expect(section.blocks.some((b) => b.kind === 'body')).toBe(true);
          for (const block of section.blocks) {
            if (block.kind === 'body') expect((block.text ?? '').includes('`')).toBe(false);
            if (block.kind === 'examples') {
              for (const e of block.examples ?? []) {
                expect(e.en.length).toBeGreaterThan(0);
                expect(e.translation.length).toBeGreaterThan(0);
                // «Читается» — только для русского/украинского интерфейса
                if (locale === 'en') expect(e.reading).toBeUndefined();
              }
            }
            if (block.kind === 'note') expect(block.text ?? '').toContain('→');
            if (block.kind === 'drill' && block.drill) checkDrill(block.drill as TheoryDrill);
          }
        }
      }
    }
    // фраза/задание, не найденные в курсе, были бы записаны в журнал как пропуск
    const skipped = logSpy.mock.calls.map((c) => String(c[0])).filter((l) => /пример без фразы|задание пропущено/.test(l));
    expect(skipped).toEqual([]);
  });

  it('Russian/Ukrainian interface gets the reading line of examples; the screen of non-English courses is served by the shared view', () => {
    for (const target of ['es', 'fr', 'de', 'it'] as const) {
      const view = getClassicTheoryView(target, 1, 'ru')!;
      const readings = view.sections.flatMap((s) => s.blocks.flatMap((b) => (b.kind === 'examples' ? (b.examples ?? []).map((e) => e.reading ?? '') : [])));
      expect(readings.some((r) => r.startsWith('Читается: '))).toBe(true);
      const uk = getClassicTheoryView(target, 1, 'uk')!;
      const ukReadings = uk.sections.flatMap((s) => s.blocks.flatMap((b) => (b.kind === 'examples' ? (b.examples ?? []).map((e) => e.reading ?? '') : [])));
      expect(ukReadings.some((r) => r.startsWith('Читається: '))).toBe(true);
    }
  });

  it('old (non-plain) lessons keep the previous path', () => {
    expect(isClassicPlainLesson('fr', 32)).toBe(false);
    expect(getClassicPlainView('fr', 32, 'ru')).toBeNull();
    expect(getClassicTheoryView('fr', 32, 'ru')).not.toBeNull();
  });
});

function checkDrill(d: TheoryDrill): void {
  if (d.type === 'binary') {
    expect(d.optionA).not.toBe(d.optionB);
    expect(['A', 'B']).toContain(d.correct);
  } else if (d.type === 'choice') {
    const options = d.options as string[];
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(new Set(options).size).toBe(options.length);
    expect(options).toContain(d.answer);
    expect(d.stacked).toBe(true);
  } else {
    throw new Error(`unexpected drill type ${String(d.type)}`);
  }
}

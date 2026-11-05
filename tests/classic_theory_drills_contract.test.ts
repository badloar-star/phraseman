// зачем (владелец 05.11: «как в английском курсе»): «Теория» fr/es/de/it — тот же экран с заданиями «Разделы n/m · задания k/N». Задания собираются
// из theory.json курса (по 20 на урок). Сторож: все 32 урока × 4 языка × языки интерфейса дают корректные задания всех 4 видов.
import fs from 'fs';
import path from 'path';

import { getClassicTheoryView } from '../app/classic_theory_view';
import { getClassicKnownWords, theoryTokens } from '../app/classic_theory';
import type { TheoryDrill } from '../components/theory/TheoryLessonView';

const TARGETS = ['fr', 'es', 'de', 'it'] as const;
const LOCALES = ['ru', 'en'] as const;

function drillsOf(view: NonNullable<ReturnType<typeof getClassicTheoryView>>): TheoryDrill[] {
  return view.sections.flatMap((section) => section.blocks.flatMap((block) => (block.kind === 'drill' && block.drill ? [block.drill] : [])));
}

describe('classic theory view: drills built from theory.json', () => {
  it.each(TARGETS)('%s: 32 lessons give sections, examples and valid drills of all 4 kinds', (target) => {
    const totals: Record<string, number> = {};
    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      for (const locale of LOCALES) {
        const view = getClassicTheoryView(target, lessonId, locale);
        expect([target, lessonId, locale, view !== null]).toEqual([target, lessonId, locale, true]);
        const v = view!;
        expect(v.sections.length).toBeGreaterThan(0);
        expect(v.sections.every((s) => s.title.length > 0 && s.blocks.length > 0)).toBe(true);
        const drills = drillsOf(v);
        // зачем (Ревизор 05.11): остаются только задания из слов, введённых теорией; на урок их может быть мало (до 0) — состав проверяем по курсу в целом
        expect(v.metrics.drills).toBe(drills.length);
        for (const d of drills) {
          totals[d.type] = (totals[d.type] ?? 0) + 1;
          if (d.type === 'choice') {
            const options = d.options as string[];
            expect(new Set(options).size).toBe(options.length);
            expect(options.length).toBeGreaterThanOrEqual(2);
            expect(options).toContain(d.answer);
            expect(String(d.before).length + String(d.after).length).toBeGreaterThan(0);
          } else if (d.type === 'binary') {
            expect(d.optionA).not.toBe(d.optionB);
            expect(['A', 'B']).toContain(d.correct);
          } else if (d.type === 'word_bank') {
            const answer = d.answer as string[];
            expect(answer.length).toBeGreaterThanOrEqual(2);
            const prompt = d.prompt as Record<string, string>;
            expect(prompt.ru.length).toBeGreaterThan(0);
            for (const extra of (d.distractors as string[])) expect(answer).not.toContain(extra);
          }
        }
      }
    }
    // только простые виды (владелец 05.11) и все три представлены по курсу в целом
    expect(Object.keys(totals).sort()).toEqual(['binary', 'choice', 'word_bank']);
    expect(Object.values(totals).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(60);
  });

  // зачем (Ревизор 05.11, P0): «задание урока N не содержит слов, которых человек ещё не видел» — только слова из теории этого (до раздела включительно)
  // и прошлых уроков; и ни одного слова словаря курса с firstLesson > N.
  const wordsOfDrill = (d: TheoryDrill): string[] => {
    const parts: string[] = [];
    if (d.type === 'choice') parts.push(String(d.before), String(d.after), ...(d.options as string[]));
    if (d.type === 'binary') parts.push(String(d.optionA), String(d.optionB));
    if (d.type === 'word_bank') parts.push(...(d.answer as string[]), ...(d.distractors as string[]));
    return parts.flatMap((p) => theoryTokens(p));
  };

  it.each(TARGETS)('%s: every drill uses only words already introduced by theory (this and earlier lessons) and no lemma with firstLesson > N', (target) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const glossary = require(`../modules/classic-courses/${target}/glossary.json`) as { lemmas: { lemma: string; firstLesson: number }[] };
    const firstLessonOf = new Map<string, number>();
    for (const l of glossary.lemmas) {
      const key = l.lemma.trim().toLocaleLowerCase();
      firstLessonOf.set(key, Math.min(firstLessonOf.get(key) ?? 99, l.firstLesson));
    }
    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      const view = getClassicTheoryView(target, lessonId, 'ru')!;
      view.sections.forEach((section, sectionIndex) => {
        const known = getClassicKnownWords(target, lessonId, sectionIndex);
        for (const block of section.blocks) {
          if (block.kind !== 'drill' || !block.drill) continue;
          for (const word of wordsOfDrill(block.drill)) {
            expect([target, lessonId, sectionIndex, word, known.has(word)]).toEqual([target, lessonId, sectionIndex, word, true]);
            const first = firstLessonOf.get(word);
            expect([target, lessonId, word, first === undefined || first <= lessonId]).toEqual([target, lessonId, word, true]);
          }
        }
      });
    }
  });

  it('commands are the owner-approved plain ones (classic_task_commands_9lang), not meta-instructions', () => {
    const view = getClassicTheoryView('fr', 2, 'en')!;
    const texts = view.sections.flatMap((section) => section.blocks.flatMap((b) => (b.kind === 'drill' && b.drill ? [String(((b.drill.instruction ?? b.drill.question) as Record<string, string>).en)] : [])));
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) expect(text).toMatch(/^(Choose how to say:|Build the sentence:|Find the right sentence:) “.+”/);
    const ru = getClassicTheoryView('fr', 2, 'ru')!;
    const ruTexts = ru.sections.flatMap((section) => section.blocks.flatMap((b) => (b.kind === 'drill' && b.drill ? [String(((b.drill.instruction ?? b.drill.question) as Record<string, string>).ru)] : [])));
    for (const text of ruTexts) expect(text).toMatch(/^(Выберите, как сказать:|Соберите фразу:|Найдите верную фразу:) «.+»/);
  });

  it('the English interface gets English phrase translations and English instructions, not Russian', () => {
    for (const target of TARGETS) {
      const view = getClassicTheoryView(target, 1, 'en')!;
      const examples = view.sections.flatMap((s) => s.blocks.flatMap((b) => (b.kind === 'examples' ? b.examples ?? [] : [])));
      expect(examples.length).toBeGreaterThan(0);
      expect(examples.every((e) => !/[А-Яа-яЁё]/.test(e.translation))).toBe(true);
      // задания остаются только из введённых слов — в первом уроке «выбери» может не быть, ищем в первых уроках
      const choice = [1, 2, 3, 4, 5, 6].flatMap((n) => drillsOf(getClassicTheoryView(target, n, 'en')!)).find((d) => d.type === 'choice')!;
      expect((choice.instruction as Record<string, string>).en).toMatch(/^Choose how to say: “.+”/);
    }
  });

  // зачем (владелец 05.11: «как ребёнку»): у каждого задания ОДНА понятная команда с переводом фразы; у первого в разделе — образец ответа;
  // на экране нет технических блоков (нюансы, стратегия, ошибка→верно, таблица форм).
  it.each(TARGETS)('%s: every drill has one plain instruction, first drill of a section has a sample, no technical blocks', (target) => {
    for (const locale of ['ru', 'en']) {
      const view = getClassicTheoryView(target, 1, locale)!;
      for (const section of view.sections) {
        const kinds = new Set(section.blocks.map((b) => b.kind));
        expect([...kinds].filter((k) => !['body', 'examples', 'drill'].includes(k))).toEqual([]);
        const drills = section.blocks.flatMap((b) => (b.kind === 'drill' && b.drill ? [b.drill] : []));
        drills.forEach((d, index) => {
          const instruction = (d.instruction ?? d.question) as Record<string, string>;
          const text = instruction[locale === 'ru' ? 'ru' : 'en'];
          expect(text.length).toBeGreaterThan(8);
          expect(/[«“„].+[»”“]/.test(text)).toBe(true); // команда содержит фразу-перевод
          const hasSample = text.includes('\n');
          expect([target, locale, section.num, index, hasSample]).toEqual([target, locale, section.num, index, index === 0 && section.blocks.some((b) => b.kind === 'examples')]);
        });
      }
    }
  });

  it('the help screen renders the shared theory view for non-English courses and rewards nothing', () => {
    const help = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_help.tsx'), 'utf8');
    expect(help).toContain('getClassicTheoryView(storageStudyTarget(studyTarget), lessonId, lang)');
    expect(help).toContain('<TheoryLessonView');
    const view = fs.readFileSync(path.join(__dirname, '..', 'app', 'classic_theory_view.ts'), 'utf8');
    expect(view).toContain('[THEORY-DRILLS]');
    expect(view).not.toMatch(/reward|coin|rune|shard/i);
    expect(getClassicTheoryView('en', 1, 'ru')).toBeNull();
  });
});

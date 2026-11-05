// зачем (владелец 05.11: «как в английском курсе»): «Теория» fr/es/de/it — тот же экран с заданиями «Разделы n/m · задания k/N». Задания собираются
// из theory.json курса (по 20 на урок). Сторож: все 32 урока × 4 языка × языки интерфейса дают корректные задания всех 4 видов.
import fs from 'fs';
import path from 'path';

import { getClassicTheoryView } from '../app/classic_theory_view';
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
        expect([target, lessonId, locale, drills.length >= 14]).toEqual([target, lessonId, locale, true]);
        expect(v.metrics.drills).toBe(drills.length);
        const kinds = new Set(drills.map((d) => d.type));
        expect([target, lessonId, [...kinds].sort()]).toEqual([target, lessonId, ['binary', 'choice', 'spot_slip', 'word_bank']]);
        for (const d of drills) {
          totals[d.type] = (totals[d.type] ?? 0) + 1;
          if (d.type === 'choice') {
            const options = d.options as string[];
            expect(new Set(options).size).toBe(options.length);
            expect(options.length).toBeGreaterThanOrEqual(2);
            expect(options).toContain(d.answer);
            expect(String(d.before).length + String(d.after).length).toBeGreaterThan(0);
          } else if (d.type === 'spot_slip') {
            const chips = d.chips as string[];
            expect(chips.length).toBeGreaterThanOrEqual(2);
            expect(Number(d.answerIndex)).toBeGreaterThanOrEqual(0);
            expect(Number(d.answerIndex)).toBeLessThan(chips.length);
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
    expect(Object.keys(totals).sort()).toEqual(['binary', 'choice', 'spot_slip', 'word_bank']);
  });

  it('the English interface gets English phrase translations and English hints, not Russian', () => {
    for (const target of TARGETS) {
      const view = getClassicTheoryView(target, 1, 'en')!;
      const examples = view.sections.flatMap((s) => s.blocks.flatMap((b) => (b.kind === 'examples' ? b.examples ?? [] : [])));
      expect(examples.length).toBeGreaterThan(0);
      expect(examples.every((e) => !/[А-Яа-яЁё]/.test(e.translation))).toBe(true);
      const spot = drillsOf(view).find((d) => d.type === 'spot_slip')!;
      expect((spot.hint as Record<string, string>).en).toBe('Find the wrong word');
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

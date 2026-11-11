/**
 * Сторож выдачи экзамена уровня: КАЖДОЕ задание «пропуск» получено правилом грамматики, его соблазны правилом же доказаны
 * как неверные, засчитывается ровно один вариант (владелец, U10 «Один подходящий ответ», 11.11.2026).
 * Правила и их крайние случаи — tests/level_exam_gap_rules.test.ts. Сработал — чинить отбор заданий, а не ослаблять сторожа.
 */
import { COURSE_LEVELS } from '../app/course_levels';
import { buildLevelExamBlueprint, LEVEL_EXAM_V5_MIX } from '../app/level_exam_blueprint';
import { GAP_RULE_ORDER, provableGapByRule } from '../app/level_exam_gap_rules';

const known = (): boolean => true;
const lower = (values: readonly string[]): string[] => values.map((value) => value.toLocaleLowerCase()).sort();

describe('выдача экзамена: каждый пропуск доказан правилом', () => {
  const SEEDS = ['u10-a', 'u10-b', 'u10-c', 'u10-d', 'u10-e'];

  // зачем (владелец 11.11.2026): с версии 5 число пропусков зависит от уровня (LEVEL_EXAM_V5_MIX) — их меньше, зато добавились новые механики.
  // Суть сторожа прежняя: КАЖДЫЙ выданный пропуск доказан правилом.
  it.each(COURSE_LEVELS)('%s: пропусков столько, сколько задано уровнем, у каждого один верный вариант', (level) => {
    for (const seed of SEEDS) {
      const blueprint = buildLevelExamBlueprint({ level, studyTarget: 'en', sourceLocale: 'ru', seed });
      const gaps = blueprint.tasks.filter((task) => task.format === 'fill_gap');
      expect(gaps).toHaveLength(LEVEL_EXAM_V5_MIX[level].classic.fill_gap);
      for (const task of gaps) {
        if (task.format !== 'fill_gap') continue;
        const sentence = task.explanation.split(' — ')[0]!;
        const answer = task.options.find((option) => option.id === task.correctOptionId)!.text;
        const distractors = task.options.filter((option) => option.id !== task.correctOptionId).map((option) => option.text);
        expect(task.acceptedOptionIds).toEqual([task.correctOptionId]);
        expect(task.prompt).toContain('___');
        // соблазны задания обязаны совпасть с доказанно неверными соблазнами хотя бы одного правила
        // для правила окончания -s сторожу нужен «словарь глаголов»: каждое слово задания вместе с парной формой (speak ↔ speaks)
        const verbForms = [answer, ...distractors].flatMap((word) => [word, `${word}s`, word.replace(/s$/u, ''), word.replace(/es$/u, '')]);
        const proven = GAP_RULE_ORDER.some((rule) => {
          const result = provableGapByRule(rule, { sentence, answer, category: 'verb', authored: distractors, categoryPool: verbForms, isKnown: known });
          return !!result && lower(result.distractors).join('|') === lower(distractors).join('|');
        });
        expect([`${level}/${seed}`, sentence, answer, distractors, proven]).toEqual([`${level}/${seed}`, sentence, answer, distractors, true]);
      }
    }
  });
});

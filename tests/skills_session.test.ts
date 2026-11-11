/** Прирост навыков за занятие для блока «Навыки растут»: показываем факт, только выросшие навыки. */
import { EMPTY_SKILL_TOTALS } from '../modules/skills/skill_levels';
import { skillGrowthRows } from '../modules/skills/skill_session';

it('возвращает только выросшие навыки, в порядке звезды', () => {
  const after = { ...EMPTY_SKILL_TOTALS, speed: 6, vocab: 4 };
  expect(skillGrowthRows(EMPTY_SKILL_TOTALS, after).map((r) => r.skill)).toEqual(['vocab', 'speed']);
  expect(skillGrowthRows(after, after)).toEqual([]);
});

it('считает полоску до и после и отмечает новый уровень', () => {
  const before = { ...EMPTY_SKILL_TOTALS, grammar: 30 };
  const [same] = skillGrowthRows(before, { ...before, grammar: 45 });
  expect(same).toMatchObject({ points: 15, levelBefore: 0, levelAfter: 0, ratioBefore: 0.5, ratioAfter: 0.75, leveledUp: false });
  const [up] = skillGrowthRows(before, { ...before, grammar: 60 + 35 });
  expect(up).toMatchObject({ levelBefore: 0, levelAfter: 1, ratioAfter: 0.5, leveledUp: true });
});

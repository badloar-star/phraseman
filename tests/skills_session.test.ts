/** Прирост навыков за занятие для блока «Навыки растут»: показываем факт, только выросшие навыки. */
jest.mock('../modules/skills/skill_store', () => ({ peekSkills: jest.fn(() => null) }));

import { EMPTY_SKILL_TOTALS } from '../modules/skills/skill_levels';
import { markSkillSessionStart, skillGrowthRows, takeSkillSessionStart } from '../modules/skills/skill_session';
import { peekSkills } from '../modules/skills/skill_store';

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

it('снимок начала занятия отдаётся один раз', () => {
  (peekSkills as jest.Mock).mockReturnValue({ totals: { ...EMPTY_SKILL_TOTALS, vocab: 7 } });
  markSkillSessionStart();
  expect(takeSkillSessionStart()?.vocab).toBe(7);
  expect(takeSkillSessionStart()).toBeNull();
});

it('без прочитанного хранилища снимка нет', () => {
  (peekSkills as jest.Mock).mockReturnValue(null);
  markSkillSessionStart();
  expect(takeSkillSessionStart()).toBeNull();
});

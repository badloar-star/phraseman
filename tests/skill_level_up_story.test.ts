/**
 * История «Новый уровень»: строится из факта (очки до и после), а не из сохранённой записи;
 * уровень не вырос — истории нет (правило владельца: празднование не durable).
 */
import { EMPTY_SKILL_TOTALS, type SkillTotals } from '../modules/skills/skill_levels';
import { buildSkillLevelUpStory, pickSkillLevelUpStory } from '../modules/skills/skill_level_up_story';

const totals = (patch: Partial<SkillTotals>): SkillTotals => ({ ...EMPTY_SKILL_TOTALS, ...patch });

// цены уровней: 0→1 — 60 очков, 1→2 — 70, 2→3 — 80
describe('история «Новый уровень»', () => {
  it('уровень вырос — история с числом «от и до», звездой и следующим уровнем', () => {
    const story = buildSkillLevelUpStory('vocab', totals({ vocab: 55 }), totals({ vocab: 67 }));
    expect(story).not.toBeNull();
    expect(story).toMatchObject({ skill: 'vocab', skillIndex: 2, fromLevel: 0, toLevel: 1 });
    // после уровня 1 набрано 7 из 70 очков следующего
    expect(story?.next).toEqual({ level: 2, ratio: 7 / 70, pointsLeft: 63 });
    expect(story?.starBefore).toHaveLength(6);
    expect(story?.starAfter[2]).toBeGreaterThan(story?.starBefore[2] ?? 1);
    // остальные лучи не двигаются
    expect(story?.starAfter[0]).toBe(story?.starBefore[0]);
  });

  it('очки выросли, а уровень нет — истории нет', () => {
    expect(buildSkillLevelUpStory('vocab', totals({ vocab: 10 }), totals({ vocab: 59 }))).toBeNull();
  });

  it('устаревший повод (итоги уже те же или меньше) истории не даёт', () => {
    const now = totals({ vocab: 67 });
    expect(buildSkillLevelUpStory('vocab', now, now)).toBeNull();
    expect(buildSkillLevelUpStory('vocab', totals({ vocab: 200 }), now)).toBeNull();
  });

  it('несколько уровней за раз — число считает через все', () => {
    const story = buildSkillLevelUpStory('speed', totals({ speed: 0 }), totals({ speed: 60 + 70 + 5 }));
    expect(story).toMatchObject({ fromLevel: 0, toLevel: 2 });
    expect(story?.next).toEqual({ level: 3, ratio: 5 / 80, pointsLeft: 75 });
  });

  it('последний уровень — второго кадра «до следующего» нет', () => {
    const story = buildSkillLevelUpStory('grammar', totals({ grammar: 0 }), totals({ grammar: 10_000_000 }));
    expect(story?.toLevel).toBe(30);
    expect(story?.next).toBeNull();
  });

  it('выбор одной истории: больше уровней за раз, затем выше новый уровень', () => {
    expect(pickSkillLevelUpStory(totals({}), totals({ vocab: 30 }))).toBeNull();
    const twoLevels = pickSkillLevelUpStory(totals({}), totals({ listening: 60, speed: 130 }));
    expect(twoLevels?.skill).toBe('speed');
    const higher = pickSkillLevelUpStory(totals({ listening: 0, grammar: 60 }), totals({ listening: 60, grammar: 130 }));
    expect(higher).toMatchObject({ skill: 'grammar', fromLevel: 1, toLevel: 2 });
  });
});

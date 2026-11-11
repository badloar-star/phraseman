import { addSkillPoints, awardSkillPoints, emptySkillDayLedger } from '../modules/skills/skill_award';
import {
  EMPTY_SKILL_TOTALS, SKILL_LEVEL_MAX, skillLevelCost, skillLevelUps, skillProgressFromPoints, weakestStudySkill,
} from '../modules/skills/skill_levels';
import { SKILL_POINT_RULES } from '../modules/skills/skill_points_table';

const DAY = '2026-11-11';

describe('таблица очков навыков (утверждена владельцем 11.11)', () => {
  it('несёт все строки утверждённой таблицы', () => {
    // 27 строк макета; сдвоенная строка «Поток» (+2 / +3 на высоком темпе) развёрнута в два действия
    expect(Object.keys(SKILL_POINT_RULES)).toHaveLength(28);
  });

  it('«Речь» растёт только от голосовых действий', () => {
    const speech = Object.entries(SKILL_POINT_RULES).filter(([, r]) => r.skill === 'speech').map(([a]) => a);
    expect(speech.sort()).toEqual(['dialog_voice_reply', 'speaking_clean']);
  });
});

describe('уровни', () => {
  it('цена уровня — 60 плюс 10 за каждый взятый', () => {
    expect(skillLevelCost(0)).toBe(60);
    expect(skillLevelCost(9)).toBe(150);
  });

  it('считает уровень и долю полоски из очков', () => {
    expect(skillProgressFromPoints(0)).toEqual({ level: 0, intoLevel: 0, levelCost: 60, ratio: 0 });
    expect(skillProgressFromPoints(59.5).level).toBe(0);
    expect(skillProgressFromPoints(60)).toEqual({ level: 1, intoLevel: 0, levelCost: 70, ratio: 0 });
    expect(skillProgressFromPoints(60 + 35)).toMatchObject({ level: 1, intoLevel: 35, ratio: 0.5 });
  });

  it('останавливается на 30-м уровне и не ломается на мусоре', () => {
    expect(skillProgressFromPoints(1e9)).toEqual({ level: SKILL_LEVEL_MAX, intoLevel: 0, levelCost: 0, ratio: 1 });
    expect(skillProgressFromPoints(6150).level).toBe(SKILL_LEVEL_MAX);
    expect(skillProgressFromPoints(6149).level).toBe(SKILL_LEVEL_MAX - 1);
    expect(skillProgressFromPoints(Number.NaN).level).toBe(0);
    expect(skillProgressFromPoints(-5).level).toBe(0);
  });

  it('находит поднявшиеся навыки по факту', () => {
    const after = addSkillPoints(EMPTY_SKILL_TOTALS, 'vocab', 130);
    expect(skillLevelUps(EMPTY_SKILL_TOTALS, after)).toEqual([{ skill: 'vocab', from: 0, to: 2 }]);
    expect(skillLevelUps(after, after)).toEqual([]);
  });

  it('«Подтянуть» не предлагает «Социальный», даже если он самый слабый', () => {
    const totals = { listening: 500, speech: 300, vocab: 900, grammar: 400, speed: 600, social: 0 };
    expect(weakestStudySkill(totals)).toBe('speech');
  });
});

describe('начисление', () => {
  it('даёт очки строки сразу за верный ответ', () => {
    const r = awardSkillPoints({ action: 'lesson_phrase_first_try', day: DAY, itemKey: 'p1' }, null);
    expect(r).toMatchObject({ skill: 'grammar', points: 3, skipped: null });
  });

  it('повтор за день: полные очки, половина, ноль; новый день — снова полные', () => {
    const a = awardSkillPoints({ action: 'recall_written', day: DAY, itemKey: 'w1' }, null);
    const b = awardSkillPoints({ action: 'recall_written', day: DAY, itemKey: 'w1' }, a.ledger);
    const c = awardSkillPoints({ action: 'recall_written', day: DAY, itemKey: 'w1' }, b.ledger);
    expect([a.points, b.points, c.points]).toEqual([2, 1, 0]);
    expect(c.skipped).toBe('repeat_exhausted');
    const next = awardSkillPoints({ action: 'recall_written', day: '2026-11-12', itemKey: 'w1' }, c.ledger);
    expect(next.points).toBe(2);
  });

  it('другая фраза в тот же день не гасится', () => {
    const a = awardSkillPoints({ action: 'blitz_correct', day: DAY, itemKey: 'w1' }, null);
    const b = awardSkillPoints({ action: 'blitz_correct', day: DAY, itemKey: 'w2' }, a.ledger);
    expect(b.points).toBe(1);
  });

  it('«Скорость» — только быстрее трёх секунд, и не съедает «Словарь» той же карточки', () => {
    const vocab = awardSkillPoints({ action: 'blitz_correct', day: DAY, itemKey: 'w1' }, null);
    const fast = awardSkillPoints({ action: 'blitz_fast', day: DAY, itemKey: 'w1', answerMs: 2999 }, vocab.ledger);
    expect(fast).toMatchObject({ skill: 'speed', points: 1, skipped: null });
    expect(awardSkillPoints({ action: 'blitz_fast', day: DAY, itemKey: 'w2', answerMs: 3000 }, null).skipped).toBe('too_slow');
    expect(awardSkillPoints({ action: 'flow_correct', day: DAY, itemKey: 'p1' }, null).skipped).toBe('too_slow');
  });

  it('бонус за ступень Пика порогу скорости не подчинён', () => {
    expect(awardSkillPoints({ action: 'peak_step_cleared', day: DAY }, null)).toMatchObject({ skill: 'speed', points: 5 });
  });

  it('строки с навыком «по виду задания» требуют допустимый навык', () => {
    expect(awardSkillPoints({ action: 'mistake_step_done', day: DAY }, null).skipped).toBe('skill_required');
    expect(awardSkillPoints({ action: 'mistake_step_done', day: DAY, skill: 'speech' }, null).skipped).toBe('skill_not_allowed');
    expect(awardSkillPoints({ action: 'mistake_step_done', day: DAY, skill: 'vocab' }, null)).toMatchObject({ skill: 'vocab', points: 2 });
    expect(awardSkillPoints({ action: 'peak_task', day: DAY, skill: 'social' }, null).skipped).toBe('skill_not_allowed');
  });

  it('сердечки: не больше пяти в день', () => {
    let ledger = emptySkillDayLedger(DAY);
    const points: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const r = awardSkillPoints({ action: 'social_heart_given', day: DAY }, ledger);
      points.push(r.points);
      ledger = r.ledger;
    }
    expect(points).toEqual([1, 1, 1, 1, 1, 0]);
  });

  it('неизвестное действие не даёт очков и не падает', () => {
    const r = awardSkillPoints({ action: 'nope' as never, day: DAY }, null);
    expect(r).toMatchObject({ points: 0, skipped: 'unknown_action' });
  });

  it('не меняет входные объекты', () => {
    const ledger = Object.freeze({ day: DAY, itemHits: Object.freeze({}), actionHits: Object.freeze({}) });
    expect(() => awardSkillPoints({ action: 'blitz_correct', day: DAY, itemKey: 'w1' }, ledger)).not.toThrow();
    expect(addSkillPoints(EMPTY_SKILL_TOTALS, 'vocab', 2)).not.toBe(EMPTY_SKILL_TOTALS);
    expect(EMPTY_SKILL_TOTALS.vocab).toBe(0);
  });
});

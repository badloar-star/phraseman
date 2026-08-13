import { checkPlanContentGate } from '../app/plan_content_gate_check';
import type { PlanContentDay, PlanContentPhrase } from '../app/plan_content_schema';

function phrase(id: string, constructions: string[]): PlanContentPhrase {
  return {
    id,
    english: 'x',
    meaning: { ru: 'x' },
    constructions,
    explanation: {
      title: { ru: 't' }, rule: { ru: 'r' }, why: { ru: 'w' }, commonMistake: { ru: 'm' },
    },
    words: [{ text: 'x', partOfSpeech: 'noun', distractors: ['a', 'b', 'c', 'zz4', 'zz5'] }],
  };
}

function day(dayIndex: number, phrases: PlanContentPhrase[]): PlanContentDay {
  return {
    planId: 'voyazh',
    dayIndex,
    topic: { ru: 't' },
    outcome: { ru: 'o' },
    level: 'A1',
    prerequisiteLessons: [1],
    intro: [{ kind: 'why', title: { ru: 't' }, body: { ru: 'b' } }],
    phrases,
    vocabulary: [],
  };
}

describe('plan content gate check', () => {
  it('reports a day fully within its gate as clean', () => {
    const report = checkPlanContentGate(day(1, [phrase('p1', ['to-be']), phrase('p2', ['present-simple'])]));
    expect(report.withinGate).toBe(true);
    expect(report.warnings).toEqual([]);
  });

  it('warns when a day-1 phrase uses grammar above the gate', () => {
    const report = checkPlanContentGate(day(1, [phrase('p1', ['gerund'])]));
    expect(report.withinGate).toBe(false);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0].phraseId).toBe('p1');
    expect(report.warnings[0].aboveGateConstructions).toContain('gerund');
    expect(report.warnings[0].introducedByLessons).toContain(22);
  });

  it('does not warn for the same grammar on a later day', () => {
    const report = checkPlanContentGate(day(60, [phrase('p1', ['gerund'])]));
    expect(report.withinGate).toBe(true);
  });

  it('ignores thematic (non-grammar) tags', () => {
    const report = checkPlanContentGate(day(1, [phrase('p1', ['airport-help', 'to-be'])]));
    expect(report.withinGate).toBe(true);
  });

  it('aggregates recommended lessons across the day grammar', () => {
    const report = checkPlanContentGate(day(1, [phrase('p1', ['present-perfect']), phrase('p2', ['to-be'])]));
    expect(report.recommendedLessons).toContain(24); // present-perfect
    expect(report.recommendedLessons).toContain(1); // to-be
  });
});

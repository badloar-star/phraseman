import { VOYAZH_DAY_1, VOYAZH_CONTENT_DAYS } from '../app/plan_content_voyazh';
import { validatePlanContentDay } from '../app/plan_content_schema';
import { checkPlanContentGate } from '../app/plan_content_gate_check';
import {
  contentDayToLessonPhrases,
  contentVocabularyToRuntimeCards,
} from '../app/plan_content_runtime_adapter';

describe('voyazh generated content (etalon)', () => {
  it('day 1 passes the content contract with zero issues', () => {
    expect(validatePlanContentDay(VOYAZH_DAY_1)).toEqual([]);
  });

  it('day 1 stays within its grammar gate (no construction above day-1 lessons)', () => {
    const gate = checkPlanContentGate(VOYAZH_DAY_1);
    expect(gate.withinGate).toBe(true);
  });

  it('day 1 maps cleanly to runtime phrases with all three locales', () => {
    const phrases = contentDayToLessonPhrases(VOYAZH_DAY_1);
    expect(phrases).toHaveLength(6);
    expect(phrases.every((p) => p.russian && p.ukrainian && p.spanish)).toBe(true);
  });

  it('day 1 produces 6 key vocabulary cards with a real part of speech each', () => {
    const cards = contentVocabularyToRuntimeCards(VOYAZH_DAY_1);
    expect(cards).toHaveLength(6);
    expect(cards.every((c) => c.partOfSpeech && c.partOfSpeech !== 'other' && c.translationRu)).toBe(true);
  });

  it('every generated voyazh day is valid', () => {
    for (const day of VOYAZH_CONTENT_DAYS) {
      expect(validatePlanContentDay(day)).toEqual([]);
      expect(checkPlanContentGate(day).withinGate).toBe(true);
    }
  });
});

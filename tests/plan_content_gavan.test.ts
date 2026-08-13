import { GAVAN_CONTENT_DAYS } from '../app/plan_content_gavan';
import { validatePlanContentDay } from '../app/plan_content_schema';
import { checkPlanContentGate } from '../app/plan_content_gate_check';
import {
  contentDayToLessonPhrases,
  contentVocabularyToRuntimeCards,
} from '../app/plan_content_runtime_adapter';

describe('gavan generated content', () => {
  it('has at least the first authored week', () => {
    expect(GAVAN_CONTENT_DAYS.length).toBeGreaterThanOrEqual(7);
  });

  it('every generated gavan day is valid and within its grammar gate', () => {
    for (const day of GAVAN_CONTENT_DAYS) {
      expect(validatePlanContentDay(day)).toEqual([]);
      expect(checkPlanContentGate(day).withinGate).toBe(true);
    }
  });

  it('every gavan day maps cleanly to runtime phrases with all three locales', () => {
    for (const day of GAVAN_CONTENT_DAYS) {
      const phrases = contentDayToLessonPhrases(day);
      expect(phrases.length).toBeGreaterThanOrEqual(5);
      expect(phrases.every((p) => p.russian && p.ukrainian && p.spanish)).toBe(true);
    }
  });

  it('every gavan day produces vocabulary cards with a real part of speech each', () => {
    for (const day of GAVAN_CONTENT_DAYS) {
      const cards = contentVocabularyToRuntimeCards(day);
      expect(cards.length).toBeGreaterThanOrEqual(5);
      expect(cards.every((c) => c.partOfSpeech && c.translationRu)).toBe(true);
    }
  });
});

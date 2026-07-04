// Read-only resolver: the phrases scheduled for a given plan day, as display
// text. Powers the "вернуться к дню / список фраз по дням" review sheet on the
// plan stats screen. Pure content lookup (registry accessors, Performance-Bible
// safe) — it writes nothing and never touches progress state.
//
// Mirrors the private phrasesForDay() in personal_plan_quality.ts, but exported
// and reduced to the display fields the review UI needs.

import type { PlanDay } from './personal_plan_catalog';
import type { LessonPhrase } from './lesson_data_types';
import { getLessonData } from './lesson_data_all';
import { getPersonalPlanPhraseLesson } from './personal_plan_phrase_lessons';

export type PlanDayPhrase = {
  id: string;
  english: string;
  russian: string;
};

function toDisplayPhrase(phrase: LessonPhrase): PlanDayPhrase {
  return {
    id: String(phrase.id),
    english: (phrase.english ?? '').trim(),
    russian: (phrase.russian ?? '').trim(),
  };
}

/**
 * All phrases a plan day teaches/practices, de-duplicated by English text, in
 * schedule order. Empty array if the day has no phrase-bearing tasks (e.g. a
 * pure quiz/trainer day) — the caller shows a neutral empty state.
 */
export function phrasesForPlanDay(day: PlanDay): PlanDayPhrase[] {
  const out: PlanDayPhrase[] = [];
  const seen = new Set<string>();

  const push = (phrase: LessonPhrase) => {
    const display = toDisplayPhrase(phrase);
    if (!display.english) return;
    const dedupeKey = display.english.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    out.push(display);
  };

  for (const task of day.tasks) {
    const { destination } = task;
    if (destination.type === 'lesson' && typeof destination.lessonId === 'number') {
      const required = new Set(destination.requiredPhraseIds ?? []);
      const lessonPhrases = getLessonData(destination.lessonId);
      for (const phrase of lessonPhrases) {
        if (required.size === 0 || required.has(String(phrase.id))) push(phrase);
      }
    }
    if (destination.type === 'plan_phrase_lesson' || destination.type === 'plan_phrase_recall') {
      const lesson = getPersonalPlanPhraseLesson(destination.lessonId);
      const phrases = lesson?.phrases.slice(0, destination.requiredPhrases) ?? [];
      for (const phrase of phrases) push(phrase);
    }
  }

  return out;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}

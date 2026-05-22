import type { LessonPhrase } from './lesson_data_types';
import { assertFrenchLessonAppSeedApproved } from './french_content_source_gate';

type FrenchPhraseSeed = Pick<LessonPhrase, 'french' | 'wordsFr' | 'alternativesFr'>;

const APPROVED_FRENCH_LESSON_SEEDS: Record<number, Record<string, FrenchPhraseSeed>> = {};

function lessonIdFromPhraseId(id: LessonPhrase['id']): number | null {
  const match = /^lesson(\d+)_phrase_\d+$/.exec(String(id));
  return match ? Number(match[1]) : null;
}

export function applyFrenchSeedToPhrase(phrase: LessonPhrase): LessonPhrase {
  const lessonId = lessonIdFromPhraseId(phrase.id);
  if (lessonId === null) return phrase;
  const seed = APPROVED_FRENCH_LESSON_SEEDS[lessonId]?.[String(phrase.id)];
  if (!seed) return phrase;
  assertFrenchLessonAppSeedApproved(lessonId);
  return {
    ...phrase,
    ...seed,
  };
}

export function hasFrenchSeed(phrase: LessonPhrase): boolean {
  const lessonId = lessonIdFromPhraseId(phrase.id);
  if (lessonId === null) return false;
  return !!APPROVED_FRENCH_LESSON_SEEDS[lessonId]?.[String(phrase.id)];
}

export function hasFrenchDraftSeed(phrase: LessonPhrase): boolean {
  const lessonId = lessonIdFromPhraseId(phrase.id);
  if (lessonId === null) return false;
  return false;
}

export default function __LessonDataFrSeedRouteShim() {
  return null;
}

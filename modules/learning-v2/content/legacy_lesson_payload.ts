// зачем: это узкий versioned source payload первого настоящего V2-среза.
// Он не копирует и не генерирует курс: связывает уже существующие данные Lesson 1
// (фразы, интро, теория и слова) в один неизменяемый объект для compiler/runtime.
import { LESSON_1_PHRASES } from '../../../app/lesson_data_1_8_phrases_source';
import { LESSON_1_INTRO_SCREENS } from '../../../app/lesson_intro_screens_lesson1_v2';
import { LESSON1_THEORY, type L1Theory } from '../../../app/theory_content_lesson1';
import type { LessonIntroScreen } from '../../../app/lesson_data_types';
import type { V2ContentItem } from './content_item';
import { adaptLegacyLessonPhrasesToV2Content } from './legacy_lesson_adapter';

export interface V2LegacyLessonVocabularyItem {
  readonly surface: string;
  readonly category: string;
  readonly sourcePhraseIds: readonly string[];
}

export interface V2LegacyLessonSourcePayload {
  readonly schemaVersion: 'v2-legacy-lesson-source-payload.v1';
  readonly version: 1;
  readonly lessonId: 1;
  readonly episodeId: 'ep-lesson-01';
  readonly contentItems: readonly V2ContentItem[];
  readonly introScreens: readonly LessonIntroScreen[];
  readonly theory: L1Theory;
  readonly vocabulary: readonly V2LegacyLessonVocabularyItem[];
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function buildVocabulary(): readonly V2LegacyLessonVocabularyItem[] {
  const words = new Map<string, { surface: string; category: string; sourcePhraseIds: Set<string> }>();
  for (const phrase of LESSON_1_PHRASES) {
    for (const word of phrase.words) {
      const surface = word.correct.trim();
      const category = word.category?.trim() || 'token';
      const key = `${surface.toLocaleLowerCase('en')}\u0000${category}`;
      const current = words.get(key) ?? { surface, category, sourcePhraseIds: new Set<string>() };
      current.sourcePhraseIds.add(String(phrase.id));
      words.set(key, current);
    }
  }
  return Object.freeze([...words.values()]
    .map((word) => Object.freeze({
      surface: word.surface,
      category: word.category,
      sourcePhraseIds: Object.freeze([...word.sourcePhraseIds].sort()),
    }))
    .sort((a, b) => a.surface.localeCompare(b.surface, 'en')));
}

/** Returns the real, non-demo Lesson 1 data in a versioned V2 source envelope. */
export function buildLesson1LegacyV2SourcePayload(): Readonly<V2LegacyLessonSourcePayload> {
  return deepFreeze({
    schemaVersion: 'v2-legacy-lesson-source-payload.v1',
    version: 1,
    lessonId: 1,
    episodeId: 'ep-lesson-01',
    contentItems: adaptLegacyLessonPhrasesToV2Content({
      episodeId: 'ep-lesson-01',
      objectiveId: 'obj-lesson-01-to-be-statements',
      targetLanguage: 'en',
      sourceLocale: 'ru',
      phrases: LESSON_1_PHRASES,
    }),
    introScreens: LESSON_1_INTRO_SCREENS,
    theory: LESSON1_THEORY,
    vocabulary: buildVocabulary(),
  } satisfies V2LegacyLessonSourcePayload);
}

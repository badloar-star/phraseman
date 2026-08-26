import AsyncStorage from "@react-native-async-storage/async-storage";
import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import type { LearningV2CourseSessionNewWordEncounterV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";

export type LearningV2UnlockedLessonWordV1 = Readonly<{
  targetLanguage: string;
  lessonOrdinal: number;
  lexicalItemId: string;
  sourceSessionOrdinal: number;
  firstEncounteredAt: string;
  encounter: LearningV2CourseSessionNewWordEncounterV1;
}>;

type Scope = Readonly<{
  targetLanguage: string;
  lessonOrdinal: number;
}>;

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
const TARGET_LANGUAGE_RE = /^[a-z]{2,3}(?:-[A-Z]{2})?$/u;
const ID_RE = /^[\p{L}\p{N}][\p{L}\p{N}._:-]{0,159}$/u;

function fail(): never {
  throw new Error("learning_v2_unlocked_lesson_words_invalid");
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isLocalizedText(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const localized = value as Record<string, unknown>;
  return LEARNING_V2_INTERFACE_LOCALES.every(
    (locale) =>
      typeof localized[locale] === "string" && localized[locale].trim().length > 0,
  );
}

function isValidEncounter(
  value: unknown,
  lexicalItemId: string,
  targetLanguage: string,
): value is LearningV2CourseSessionNewWordEncounterV1 {
  if (!value || typeof value !== "object") return false;
  const encounter = value as LearningV2CourseSessionNewWordEncounterV1;
  const save = encounter.save;
  return (
    encounter.lexicalItemId === lexicalItemId &&
    typeof encounter.transcription === "string" &&
    encounter.transcription.trim().length > 0 &&
    isLocalizedText(encounter.playfulMeaningByLocale) &&
    (encounter.motionVariant === "lesson_hero_b" ||
      encounter.motionVariant === "premium_a") &&
    encounter.presentation === "blocking_task_overlay" &&
    encounter.dismissal === "continue_only" &&
    encounter.saveControl === "bookmark_icon" &&
    isPositiveInteger(encounter.orderWithinSession) &&
    Boolean(save) &&
    save.available === true &&
    typeof save.savablePhraseRef === "string" &&
    save.savablePhraseRef.trim().length > 0 &&
    save.targetLanguage === targetLanguage &&
    typeof save.targetText === "string" &&
    save.targetText.trim().length > 0 &&
    isLocalizedText(save.meaningByLocale) &&
    typeof save.sourceTextFingerprint === "string" &&
    /^[a-f0-9]{64}$/u.test(save.sourceTextFingerprint) &&
    save.contentOrigin === "learner_safe_release_projection"
  );
}

function isValidItem(value: unknown): value is LearningV2UnlockedLessonWordV1 {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<LearningV2UnlockedLessonWordV1>;
  return (
    typeof item.targetLanguage === "string" &&
    TARGET_LANGUAGE_RE.test(item.targetLanguage) &&
    isPositiveInteger(item.lessonOrdinal) &&
    typeof item.lexicalItemId === "string" &&
    item.lexicalItemId === item.lexicalItemId.normalize("NFC") &&
    ID_RE.test(item.lexicalItemId) &&
    isPositiveInteger(item.sourceSessionOrdinal) &&
    typeof item.firstEncounteredAt === "string" &&
    Number.isFinite(Date.parse(item.firstEncounteredAt)) &&
    isValidEncounter(item.encounter, item.lexicalItemId, item.targetLanguage)
  );
}

function identity(item: LearningV2UnlockedLessonWordV1): string {
  return `${item.targetLanguage}\u0000${item.lessonOrdinal}\u0000${item.lexicalItemId}`;
}

function validateScope(scope: Scope): void {
  if (
    !TARGET_LANGUAGE_RE.test(scope.targetLanguage) ||
    !isPositiveInteger(scope.lessonOrdinal)
  ) {
    fail();
  }
}

export function learningV2UnlockedLessonWordsKeyV1(
  targetLanguage: string,
  lessonOrdinal: number,
): string {
  validateScope({ targetLanguage, lessonOrdinal });
  return `learning-v2:unlocked-words:v1:${targetLanguage}:lesson:${lessonOrdinal}`;
}

export function parseLearningV2UnlockedLessonWordsV1(
  raw: string | null,
): readonly LearningV2UnlockedLessonWordV1[] {
  if (!raw) return Object.freeze([]);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((item) => !isValidItem(item))) {
      return Object.freeze([]);
    }
    return Object.freeze(
      parsed.map((item) => Object.freeze({ ...item })),
    );
  } catch {
    return Object.freeze([]);
  }
}

export function mergeLearningV2UnlockedLessonWordV1(
  current: readonly LearningV2UnlockedLessonWordV1[],
  next: LearningV2UnlockedLessonWordV1,
): readonly LearningV2UnlockedLessonWordV1[] {
  if (!isValidItem(next) || current.some((item) => !isValidItem(item))) fail();
  const nextIdentity = identity(next);
  const existingIndex = current.findIndex(
    (item) => identity(item) === nextIdentity,
  );
  if (existingIndex >= 0) return Object.freeze([...current]);
  return Object.freeze([...current, Object.freeze({ ...next })]);
}

function emit(key: string): void {
  for (const listener of listeners.get(key) ?? []) listener();
}

export function subscribeLearningV2UnlockedLessonWordsV1(
  scope: Scope,
  listener: Listener,
): () => void {
  const key = learningV2UnlockedLessonWordsKeyV1(
    scope.targetLanguage,
    scope.lessonOrdinal,
  );
  const scoped = listeners.get(key) ?? new Set<Listener>();
  scoped.add(listener);
  listeners.set(key, scoped);
  return () => {
    scoped.delete(listener);
    if (scoped.size === 0) listeners.delete(key);
  };
}

export async function loadLearningV2UnlockedLessonWordsV1(
  scope: Scope,
): Promise<readonly LearningV2UnlockedLessonWordV1[]> {
  const key = learningV2UnlockedLessonWordsKeyV1(
    scope.targetLanguage,
    scope.lessonOrdinal,
  );
  return parseLearningV2UnlockedLessonWordsV1(await AsyncStorage.getItem(key));
}

export async function markLearningV2LessonWordUnlockedV1(
  item: LearningV2UnlockedLessonWordV1,
): Promise<readonly LearningV2UnlockedLessonWordV1[]> {
  if (!isValidItem(item)) fail();
  const scope = {
    targetLanguage: item.targetLanguage,
    lessonOrdinal: item.lessonOrdinal,
  };
  const key = learningV2UnlockedLessonWordsKeyV1(
    scope.targetLanguage,
    scope.lessonOrdinal,
  );
  const current = await loadLearningV2UnlockedLessonWordsV1(scope);
  const merged = mergeLearningV2UnlockedLessonWordV1(current, item);
  if (merged.length !== current.length) {
    await AsyncStorage.setItem(key, JSON.stringify(merged));
    emit(key);
  }
  return merged;
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import type { LearningV2CourseSessionWordEncounterPresentationV1 } from "../modules/learning-v2/runtime/course_session_word_encounter_presentation_v1";
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from "./account_generation";
import { deriveLocalOfflineProgressAccountScopeHash } from "../modules/learning-v2/progress/progress_account_scope";

export type LearningV2UnlockedLessonWordV1 = Readonly<{
  targetLanguage: string;
  lessonOrdinal: number;
  lexicalItemId: string;
  sourceSessionOrdinal: number;
  firstEncounteredAt: string;
  encounter: LearningV2CourseSessionWordEncounterPresentationV1;
}>;

export type LearningV2UnlockedLessonWordsAccountScopeV1 = Readonly<{
  accountScopeHash: string;
  accountGeneration: number;
}>;

type Scope = LearningV2UnlockedLessonWordsAccountScopeV1 & Readonly<{
  targetLanguage: string;
  lessonOrdinal: number;
}>;

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
const TARGET_LANGUAGE_RE = /^[a-z]{2,3}(?:-[A-Z]{2})?$/u;
const ID_RE = /^[\p{L}\p{N}][\p{L}\p{N}._:-]{0,159}$/u;
const ACCOUNT_HASH_RE = /^[a-f0-9]{64}$/u;

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
): value is LearningV2CourseSessionWordEncounterPresentationV1 {
  if (!value || typeof value !== "object") return false;
  const encounter = value as LearningV2CourseSessionWordEncounterPresentationV1;
  const save = encounter.save;
  return (
    encounter.lexicalItemId === lexicalItemId &&
    (encounter.transcription === null || (typeof encounter.transcription === "string" && encounter.transcription.trim().length > 0)) &&
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
    !ACCOUNT_HASH_RE.test(scope.accountScopeHash) ||
    !Number.isSafeInteger(scope.accountGeneration) ||
    scope.accountGeneration < 1 ||
    !TARGET_LANGUAGE_RE.test(scope.targetLanguage) ||
    !isPositiveInteger(scope.lessonOrdinal)
  ) {
    fail();
  }
}

export function learningV2UnlockedLessonWordsAccountScopeV1(
  token: AccountGenerationToken = captureAccountGeneration(),
): LearningV2UnlockedLessonWordsAccountScopeV1 | null {
  if (token.phase !== "active" || !token.stableId ||
    !isCurrentAccountGeneration(token, token.stableId)) return null;
  return Object.freeze({
    accountScopeHash: deriveLocalOfflineProgressAccountScopeHash(token.stableId),
    accountGeneration: token.generation,
  });
}

function isCurrentScope(scope: LearningV2UnlockedLessonWordsAccountScopeV1): boolean {
  const token = captureAccountGeneration();
  if (token.phase !== "active" || !token.stableId ||
    token.generation !== scope.accountGeneration ||
    !isCurrentAccountGeneration(token, token.stableId)) return false;
  return deriveLocalOfflineProgressAccountScopeHash(token.stableId) ===
    scope.accountScopeHash;
}

export function learningV2UnlockedLessonWordsKeyV1(
  account: LearningV2UnlockedLessonWordsAccountScopeV1,
  targetLanguage: string,
  lessonOrdinal: number,
): string {
  validateScope({ ...account, targetLanguage, lessonOrdinal });
  return `learning-v2:unlocked-words:v2:${account.accountScopeHash}:${targetLanguage}:lesson:${lessonOrdinal}`;
}

export function learningV2AuthoringPreviewUnlockedLessonWordsKeyV1(
  account: LearningV2UnlockedLessonWordsAccountScopeV1,
  targetLanguage: string,
  lessonOrdinal: number,
): string {
  validateScope({ ...account, targetLanguage, lessonOrdinal });
  return `learning-v2:authoring-preview-unlocked-words:v2:${account.accountScopeHash}:${targetLanguage}:lesson:${lessonOrdinal}`;
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

export function mergeLearningV2UnlockedLessonWordListsV1(
  ...lists: readonly (readonly LearningV2UnlockedLessonWordV1[])[]
): readonly LearningV2UnlockedLessonWordV1[] {
  const chronological = lists
    .flat()
    .slice()
    .sort(
      (left, right) =>
        Date.parse(left.firstEncounteredAt) - Date.parse(right.firstEncounteredAt),
    );
  return chronological.reduce<readonly LearningV2UnlockedLessonWordV1[]>(
    (current, item) => mergeLearningV2UnlockedLessonWordV1(current, item),
    Object.freeze([]),
  );
}

function emit(key: string): void {
  for (const listener of listeners.get(key) ?? []) listener();
}

export function subscribeLearningV2UnlockedLessonWordsV1(
  scope: Scope,
  listener: Listener,
): () => void {
  const key = learningV2UnlockedLessonWordsKeyV1(
    scope,
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

export function subscribeLearningV2AuthoringPreviewUnlockedLessonWordsV1(
  scope: Scope,
  listener: Listener,
): () => void {
  const key = learningV2AuthoringPreviewUnlockedLessonWordsKeyV1(
    scope,
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

/**
 * Подписка на изменения слов ЛЮБОГО из перечисленных уроков.
 *
 * зачем: словарь курса показывает 32 урока сразу, а `emit` бьёт по ключу
 * одного урока. Без этой подписки слово, открытое в уроке 3, не появилось бы
 * в уже открытой шторке — молчаливое расхождение, которое человек прочитал бы
 * как «словарь не работает».
 */
export function subscribeLearningV2CourseUnlockedWordsV1(
  account: LearningV2UnlockedLessonWordsAccountScopeV1,
  targetLanguage: string,
  lessonOrdinals: readonly number[],
  includeAuthoringPreview: boolean,
  listener: Listener,
): () => void {
  const unsubscribes: (() => void)[] = [];
  for (const lessonOrdinal of lessonOrdinals) {
    if (!isPositiveInteger(lessonOrdinal)) continue;
    const scope = { ...account, targetLanguage, lessonOrdinal };
    unsubscribes.push(subscribeLearningV2UnlockedLessonWordsV1(scope, listener));
    if (includeAuthoringPreview) {
      unsubscribes.push(
        subscribeLearningV2AuthoringPreviewUnlockedLessonWordsV1(scope, listener),
      );
    }
  }
  return () => {
    for (const unsubscribe of unsubscribes) unsubscribe();
  };
}

export async function loadLearningV2UnlockedLessonWordsV1(
  scope: Scope,
): Promise<readonly LearningV2UnlockedLessonWordV1[]> {
  const key = learningV2UnlockedLessonWordsKeyV1(
    scope,
    scope.targetLanguage,
    scope.lessonOrdinal,
  );
  return withAccountTransitionLock(async () => {
    if (!isCurrentScope(scope)) return Object.freeze([]);
    const raw = await AsyncStorage.getItem(key);
    if (!isCurrentScope(scope)) return Object.freeze([]);
    return parseLearningV2UnlockedLessonWordsV1(raw);
  });
}

export async function loadLearningV2AuthoringPreviewUnlockedLessonWordsV1(
  scope: Scope,
): Promise<readonly LearningV2UnlockedLessonWordV1[]> {
  const key = learningV2AuthoringPreviewUnlockedLessonWordsKeyV1(
    scope,
    scope.targetLanguage,
    scope.lessonOrdinal,
  );
  return withAccountTransitionLock(async () => {
    if (!isCurrentScope(scope)) return Object.freeze([]);
    const raw = await AsyncStorage.getItem(key);
    if (!isCurrentScope(scope)) return Object.freeze([]);
    return parseLearningV2UnlockedLessonWordsV1(raw);
  });
}

export async function loadLearningV2VisibleUnlockedLessonWordsV1(
  scope: Scope,
  includeAuthoringPreview: boolean,
): Promise<readonly LearningV2UnlockedLessonWordV1[]> {
  const learner = await loadLearningV2UnlockedLessonWordsV1(scope);
  if (!includeAuthoringPreview) return learner;
  const preview = await loadLearningV2AuthoringPreviewUnlockedLessonWordsV1(scope);
  return mergeLearningV2UnlockedLessonWordListsV1(learner, preview);
}

/**
 * Слова ВСЕХ уроков курса одним заходом.
 *
 * зачем: владелец 21.09 выбрал «все открытые слова курса» — словарь в шапке
 * карты больше не про один урок. Слова лежат по ключу НА УРОК, поэтому курс
 * это 32 ключа (или 64 с превью автора). Читаем их одним `multiGet`, а не
 * циклом из 32 `getItem`: на слабом телефоне цикл — это 32 моста в натив
 * подряд, прямо в момент открытия шторки.
 *
 * Проверка поколения аккаунта берётся ровно та же (`isCurrentScope`) и стоит
 * ДО и ПОСЛЕ чтения: если человек успел переключить аккаунт, пока читали, —
 * отдаём пусто, а не чужие слова.
 */
export async function loadLearningV2CourseUnlockedWordsV1(
  account: LearningV2UnlockedLessonWordsAccountScopeV1,
  targetLanguage: string,
  lessonOrdinals: readonly number[],
  includeAuthoringPreview: boolean,
): Promise<readonly LearningV2UnlockedLessonWordV1[]> {
  const ordinals = lessonOrdinals.filter(isPositiveInteger);
  if (ordinals.length === 0) return Object.freeze([]);
  const keys: string[] = [];
  for (const lessonOrdinal of ordinals) {
    keys.push(learningV2UnlockedLessonWordsKeyV1(account, targetLanguage, lessonOrdinal));
    if (includeAuthoringPreview) {
      keys.push(
        learningV2AuthoringPreviewUnlockedLessonWordsKeyV1(account, targetLanguage, lessonOrdinal),
      );
    }
  }
  return withAccountTransitionLock(async () => {
    if (!isCurrentScope(account)) return Object.freeze([]);
    const rows = await AsyncStorage.multiGet(keys);
    if (!isCurrentScope(account)) return Object.freeze([]);
    const lists = rows.map(([, raw]) => parseLearningV2UnlockedLessonWordsV1(raw));
    return mergeLearningV2UnlockedLessonWordListsV1(...lists);
  });
}

async function markAtKey(
  item: LearningV2UnlockedLessonWordV1,
  key: string,
  account: LearningV2UnlockedLessonWordsAccountScopeV1,
): Promise<readonly LearningV2UnlockedLessonWordV1[]> {
  return withAccountTransitionLock(async () => {
    if (!isCurrentScope(account)) return Object.freeze([]);
    const current = parseLearningV2UnlockedLessonWordsV1(
      await AsyncStorage.getItem(key),
    );
    if (!isCurrentScope(account)) return Object.freeze([]);
    const merged = mergeLearningV2UnlockedLessonWordV1(current, item);
    if (merged.length !== current.length) {
      await AsyncStorage.setItem(key, JSON.stringify(merged));
      if (!isCurrentScope(account)) return Object.freeze([]);
      emit(key);
    }
    return merged;
  });
}

export async function markLearningV2LessonWordUnlockedV1(
  item: LearningV2UnlockedLessonWordV1,
): Promise<readonly LearningV2UnlockedLessonWordV1[]> {
  if (!isValidItem(item)) fail();
  const account = learningV2UnlockedLessonWordsAccountScopeV1();
  if (!account) return Object.freeze([]);
  const scope = {
    ...account,
    targetLanguage: item.targetLanguage,
    lessonOrdinal: item.lessonOrdinal,
  };
  const key = learningV2UnlockedLessonWordsKeyV1(
    account,
    scope.targetLanguage,
    scope.lessonOrdinal,
  );
  return markAtKey(item, key, account);
}

export async function markLearningV2AuthoringPreviewWordUnlockedV1(
  item: LearningV2UnlockedLessonWordV1,
): Promise<readonly LearningV2UnlockedLessonWordV1[]> {
  if (!isValidItem(item)) fail();
  const account = learningV2UnlockedLessonWordsAccountScopeV1();
  if (!account) return Object.freeze([]);
  const key = learningV2AuthoringPreviewUnlockedLessonWordsKeyV1(
    account,
    item.targetLanguage,
    item.lessonOrdinal,
  );
  return markAtKey(item, key, account);
}

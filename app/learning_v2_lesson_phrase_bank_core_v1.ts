// зачем (владелец 25.10, «классический режим» после урока V2; координатор): фразы нового урока должны
// быть под рукой на устройстве, когда урок пройден, — занятия V2 приходят с сервера, кэш держит только 6.
// Чистое ядро банка фраз урока: проверка, проекция из задания «Сборка фразы», слияние, разбор и ключ.
// Без React Native и без AsyncStorage — тестируется в node. Хранение — learning_v2_lesson_phrase_bank_v1.ts.

/** Один вопрос банка: фраза, перевод по локалям, слова в правильном порядке и лишние слова. */
export type LearningV2LessonBankPhraseV1 = Readonly<{
  targetPhrase: string;
  meaning: Readonly<Record<string, string>>;
  tokens: readonly string[];
  distractors: readonly string[];
  sourceSessionOrdinal: number;
}>;

export const LEARNING_V2_LESSON_BANK_MAX_PHRASES_V1 = 480; // 56 занятий × ~8 сборок + запас
const MAX_TOKENS = 24;
const MAX_DISTRACTORS = 12;
const MAX_TEXT = 200;
const MAX_LOCALES = 12;
const ACCOUNT_HASH_RE = /^[a-f0-9]{64}$/u;
const TARGET_LANGUAGE_RE = /^[a-z]{2,3}(?:-[A-Z]{2})?$/u;

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_TEXT;
}

function isTextList(value: unknown, max: number, allowEmpty: boolean): value is readonly string[] {
  return Array.isArray(value)
    && value.length <= max
    && (allowEmpty || value.length > 0)
    && value.every(isText);
}

function isMeaning(value: unknown): value is Readonly<Record<string, string>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length > 0
    && entries.length <= MAX_LOCALES
    && entries.every(([locale, text]) => locale.length > 0 && locale.length <= 8 && isText(text));
}

export function isLearningV2LessonBankPhraseV1(value: unknown): value is LearningV2LessonBankPhraseV1 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return isText(v.targetPhrase)
    && isMeaning(v.meaning)
    && isTextList(v.tokens, MAX_TOKENS, false)
    && isTextList(v.distractors, MAX_DISTRACTORS, true)
    && Number.isSafeInteger(v.sourceSessionOrdinal)
    && (v.sourceSessionOrdinal as number) > 0;
}

/** Один и тот же вопрос в разных занятиях — одна запись (регистр и пробелы не различают). */
export function learningV2LessonBankIdentityV1(phrase: Pick<LearningV2LessonBankPhraseV1, 'targetPhrase'>): string {
  return phrase.targetPhrase.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en');
}

export type LearningV2LessonBankProjectionV1 =
  | Readonly<{ ok: true; phrase: LearningV2LessonBankPhraseV1 }>
  | Readonly<{ ok: false; reason: string }>;

/**
 * Берёт из learner-версии задания «Сборка фразы» ровно то, что нужно режиму. Другие виды заданий
 * и неполные данные отвергаются с причиной (причина идёт в журнал [CLASSIC-BANK], молчать нельзя).
 * Правильный порядок слов learner-у и так известен (иначе плитки не собрать) — новых данных не раскрываем.
 */
export function projectLearningV2LessonBankPhraseV1(
  modePayload: unknown,
  sourceSessionOrdinal: number,
): LearningV2LessonBankProjectionV1 {
  if (typeof modePayload !== 'object' || modePayload === null) return { ok: false, reason: 'no_payload' };
  const p = modePayload as Record<string, unknown>;
  if (p.family !== 'phrase_builder') return { ok: false, reason: `family_${String(p.family)}` };
  const candidate = {
    targetPhrase: p.targetPhrase,
    meaning: p.localizedMeaning,
    tokens: p.orderedTokens,
    distractors: p.authoredDistractorTokens,
    sourceSessionOrdinal,
  };
  if (!isLearningV2LessonBankPhraseV1(candidate)) {
    return {
      ok: false,
      reason: `invalid_shape tokens=${Array.isArray(p.orderedTokens) ? p.orderedTokens.length : 'x'} distractors=${Array.isArray(p.authoredDistractorTokens) ? p.authoredDistractorTokens.length : 'x'}`,
    };
  }
  // свои копии: банк не должен держать ссылки на объекты занятия
  return {
    ok: true,
    phrase: { ...candidate, meaning: { ...candidate.meaning }, tokens: [...candidate.tokens], distractors: [...candidate.distractors] },
  };
}

export type LearningV2LessonBankMergeV1 = Readonly<{
  phrases: readonly LearningV2LessonBankPhraseV1[];
  result: 'added' | 'duplicate' | 'full';
}>;

export function mergeLearningV2LessonBankPhraseV1(
  current: readonly LearningV2LessonBankPhraseV1[],
  next: LearningV2LessonBankPhraseV1,
): LearningV2LessonBankMergeV1 {
  const id = learningV2LessonBankIdentityV1(next);
  if (current.some((row) => learningV2LessonBankIdentityV1(row) === id)) return { phrases: current, result: 'duplicate' };
  if (current.length >= LEARNING_V2_LESSON_BANK_MAX_PHRASES_V1) return { phrases: current, result: 'full' };
  return { phrases: [...current, next], result: 'added' };
}

/** Битая запись в хранилище не должна ронять режим: невалидные строки отбрасываются, остальное живёт. */
export function parseLearningV2LessonBankV1(raw: string | null): readonly LearningV2LessonBankPhraseV1[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('[CLASSIC-BANK] parse_not_array', JSON.stringify({ rawLength: raw.length }));
      return [];
    }
    return parsed.filter(isLearningV2LessonBankPhraseV1).slice(0, LEARNING_V2_LESSON_BANK_MAX_PHRASES_V1);
  } catch (error: unknown) {
    console.warn('[CLASSIC-BANK] parse_failed', JSON.stringify({ reason: error instanceof Error ? error.message : String(error), rawLength: raw.length }));
    return [];
  }
}

export function learningV2LessonBankKeyV1(accountScopeHash: string, targetLanguage: string, lessonOrdinal: number): string {
  if (!ACCOUNT_HASH_RE.test(accountScopeHash) || !TARGET_LANGUAGE_RE.test(targetLanguage)
    || !Number.isSafeInteger(lessonOrdinal) || lessonOrdinal < 1) {
    throw new Error('learning_v2_lesson_bank_key_invalid');
  }
  return `learning-v2:phrase-bank:v1:${accountScopeHash}:${targetLanguage}:lesson:${lessonOrdinal}`;
}

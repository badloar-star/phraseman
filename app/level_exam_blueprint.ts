import { COURSE_LEVEL_RANGES } from './course_levels';
import { DebugLogger } from './debug-logger';
import { getLessonData } from './lesson_data_all';
import { expandedCorrectText } from '../modules/expanded-formats/grade';
import { authoredExamItems, buildAuthoredExamDraft, type AuthoredFormat } from './level_exam_authored_bank';
import { buildExpandedExamDraft, EXPANDED_SEED_NEEDS, swapPhraseWord, type ExpandedSeed, type ExpandedSeedGap, type PhraseBuiltFormat } from './level_exam_expanded_builder';
import { GAP_RULE_ORDER, provableGapByRule } from './level_exam_gap_rules';
import type { LessonPhrase, LessonWord } from './lesson_data_types';
import { createLevelExamRng, shuffled } from './level_exam_rng';
import type { SourceLocale } from './source_locales';
import type { StudyTargetLang } from './study_target_lang_dev';
import {
  CURRENT_LEVEL_EXAM_BLUEPRINT_VERSION,
  levelExamPassScore,
  type BuildLevelExamBlueprintInput,
  type LevelExamBlueprint,
  type LevelExamChoiceTask,
  type LevelExamExpandedTask,
  type LevelExamLevel,
  type LevelExamStudyTarget,
  type LevelExamPhraseBuilderTask,
  type LevelExamSpeedMatchPair,
  type LevelExamTask,
} from './level_exam_types';

const EXAM_DURATION_MS = { A1: 12 * 60_000, A2: 13 * 60_000, B1: 14 * 60_000, B2: 15 * 60_000 } as const;
const SINGLE_TASKS_PER_MODE = 6;

/**
 * зачем (владелец 11.11.2026): «соответствующую сложность для каждого экзамена» и новые механики Пика.
 * С версии 5 состав зависит от уровня: A1 — узнавание (выбор, пары), A2 — сборка и поиск лишнего, B1 — исправление
 * и ввод слова, B2 — ввод слов и перевод целой фразы. В каждом уровне 30 баллов: `classic` + 6 быстрых пар + `expanded`.
 * До версии 5 — прежние 6 заданий каждого из четырёх видов.
 *
 * В составе только семь механик, которые честно строятся из ОДНОЙ фразы урока. Остальным пяти (ответ в диалоге, порядок
 * реплик, пары вопрос–ответ, разложи по группам, найди подтверждение) нужны диалоги и тексты; владелец 11.11.2026:
 * «писать отдельно, но используя грамматику или слова, которые юзер уже разбирал». Они войдут в состав вместе с авторским банком.
 */
type ClassicCounts = Readonly<{ guess_phrase: number; fill_gap: number; find_oddity: number; translate_build: number }>;
type LevelMix = Readonly<{
  classic: ClassicCounts;
  /** Механики из фраз уроков. */
  expanded: readonly (readonly [PhraseBuiltFormat, number])[];
  /** Механики из авторского банка диалогов и текстов; нет банка для уровня — задание заменяется механикой из фраз. */
  authored: readonly (readonly [AuthoredFormat, number])[];
}>;
const LEGACY_MIX: LevelMix = {
  classic: { guess_phrase: SINGLE_TASKS_PER_MODE, fill_gap: SINGLE_TASKS_PER_MODE, find_oddity: SINGLE_TASKS_PER_MODE, translate_build: SINGLE_TASKS_PER_MODE },
  expanded: [],
  authored: [],
};
export const LEVEL_EXAM_V5_MIX: Readonly<Record<LevelExamLevel, LevelMix>> = {
  A1: {
    classic: { guess_phrase: 4, fill_gap: 4, find_oddity: 3, translate_build: 3 },
    expanded: [['multi_select', 2], ['sentence_build_noise', 2], ['remove_intruder', 1]],
    authored: [['context_choice', 1], ['dialogue_order', 1], ['reply_pairs', 1], ['classify_function', 1], ['evidence_choice', 1]],
  },
  A2: {
    classic: { guess_phrase: 3, fill_gap: 4, find_oddity: 3, translate_build: 3 },
    expanded: [['sentence_build_noise', 2], ['remove_intruder', 2], ['multi_select', 1], ['word_repair', 1]],
    authored: [['context_choice', 1], ['dialogue_order', 1], ['reply_pairs', 1], ['classify_function', 1], ['evidence_choice', 1]],
  },
  B1: {
    classic: { guess_phrase: 2, fill_gap: 3, find_oddity: 2, translate_build: 2 },
    expanded: [['word_repair', 3], ['remove_intruder', 1], ['sentence_build_noise', 1], ['linked_gaps', 2], ['multi_select', 1], ['typed_word', 2]],
    authored: [['context_choice', 1], ['dialogue_order', 1], ['reply_pairs', 1], ['classify_function', 1], ['evidence_choice', 1]],
  },
  B2: {
    classic: { guess_phrase: 1, fill_gap: 2, find_oddity: 2, translate_build: 0 },
    expanded: [['word_repair', 3], ['typed_word', 4], ['sentence_transform', 3], ['linked_gaps', 2], ['sentence_build_noise', 1], ['multi_select', 1]],
    authored: [['context_choice', 1], ['dialogue_order', 1], ['reply_pairs', 1], ['classify_function', 1], ['evidence_choice', 1]],
  },
};
/** Чем заменить механику, если из фраз уровня её не собрать: сначала близкая, в конце — выбор перевода (ему хватает одного правила). */
const EXPANDED_FALLBACK: Readonly<Partial<Record<PhraseBuiltFormat, readonly PhraseBuiltFormat[]>>> = {
  linked_gaps: ['typed_word', 'word_repair'],
  sentence_transform: ['typed_word'],
  remove_intruder: ['word_repair'],
  sentence_build_noise: ['word_repair'],
  multi_select: ['word_repair'],
  typed_word: ['word_repair'],
  word_repair: ['remove_intruder'],
};
const EXPANDED_LAST_RESORT: PhraseBuiltFormat = 'word_repair';
/** Чем заменить авторское задание, пока банка для уровня или языка нет. */
const AUTHORED_SUBSTITUTE: PhraseBuiltFormat = 'multi_select';
const EXPANDED_BUILD_TRIES = 8;
const LOG = '[EXAM-VOCAB]';

// зачем (слово владельца af62e0821 через координатора, 05.11): в экзамене уровня — только слова и фразы из ПРОЙДЕННЫХ уроков.
// Соблазны плиток (word.distractors) — слова класса, их легко взять из будущих уроков (сторож Ревизора: en A1 1078, A2 205, B1 102, B2 5).
// Словарь уровня = слова фраз и допустимых ответов уроков 1..последний урок уровня; соблазн вне словаря отбрасывается,
// не хватает — добираем близким по классу (category) словом из того же словаря.
type LevelVocab = { tokens: ReadonlySet<string>; byCategory: ReadonlyMap<string, readonly string[]> };
type VocabStats = { filtered: number; backfilled: number };
type VocabContext = { vocab: LevelVocab; stats: VocabStats };
const GRAMMAR_CATEGORIES = ['article', 'articulo', 'to-be', 'verbo_ser', 'verbo_estar', 'pronoun', 'pronombre', 'verb', 'verbo', 'verbs'];

function wordTokens(value: string): string[] {
  return value.toLocaleLowerCase().replace(/[’`]/g, "'").split(/[\s/]+/u)
    .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
}

const vocabCache = new Map<string, LevelVocab>();

/**
 * зачем (владелец 11.11.2026: «в экзаменах — фразы, которые встречались в уроках»): урок показывает фразы КЛАССИЧЕСКОГО курса
 * (getLessonData(урок, язык)), а экзамен до версии 5 читал прежний набор фраз без языка — ученик видел на экзамене
 * фразы, которых в его уроках нет. С версии 5 экзамен читает те же фразы, что и урок. Версии 3 и 4 читают прежний набор:
 * начатая попытка обязана восстановиться теми же заданиями.
 */
function lessonPhrases(lessonId: number, courseTarget: StudyTargetLang | undefined): LessonPhrase[] {
  return courseTarget ? getLessonData(lessonId, courseTarget) : getLessonData(lessonId);
}

/** Словарь уроков 1..toLesson; один раз на последний урок уровня и источник фраз. */
function levelVocab(toLesson: number, courseTarget: StudyTargetLang | undefined): LevelVocab {
  const cacheKey = `${courseTarget ?? 'legacy'}:${toLesson}`;
  const cached = vocabCache.get(cacheKey);
  if (cached) return cached;
  const tokens = new Set<string>();
  const byCategory = new Map<string, string[]>();
  for (let lessonId = 1; lessonId <= toLesson; lessonId += 1) {
    for (const phrase of lessonPhrases(lessonId, courseTarget)) {
      wordTokens(phrase.english).forEach((token) => tokens.add(token));
      for (const alt of phrase.alternatives || []) wordTokens(alt).forEach((token) => tokens.add(token));
      for (const word of targetWords(phrase)) {
        wordTokens(word.text).forEach((token) => tokens.add(token));
        const category = String(word.category ?? '').trim().toLocaleLowerCase();
        const text = word.text.trim();
        if (category && /^[A-Za-z']+$/u.test(text)) {
          const list = byCategory.get(category) || [];
          if (!list.some((value) => normalized(value) === normalized(text))) list.push(text);
          byCategory.set(category, list);
        }
      }
    }
  }
  const vocab: LevelVocab = { tokens, byCategory };
  vocabCache.set(cacheKey, vocab);
  return vocab;
}

function isKnownWord(ctx: VocabContext, value: string): boolean {
  const parts = wordTokens(value);
  return parts.length > 0 && parts.every((token) => ctx.vocab.tokens.has(token));
}

/** Оставляет только соблазны из словаря пройденных уроков; считает отброшенные. */
function knownOnly(ctx: VocabContext, values: readonly string[]): string[] {
  const kept = values.filter((value) => isKnownWord(ctx, value));
  ctx.stats.filtered += values.length - kept.length;
  return kept;
}

function stableIndex(seed: string, size: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return size > 0 ? hash % size : 0;
}

/** Добор близкими по классу словами из словаря уровня (детерминированно по слову-ответу). */
function backfillByCategory(ctx: VocabContext, word: LessonWord, taken: readonly string[], need: number): string[] {
  if (need <= 0) return [];
  const category = String(word.category ?? '').trim().toLocaleLowerCase();
  const pool = (ctx.vocab.byCategory.get(category) || []).filter((value) => !taken.some((used) => normalized(used) === normalized(value)));
  if (pool.length === 0) return [];
  const start = stableIndex(word.text, pool.length);
  const picked: string[] = [];
  for (let offset = 0; offset < pool.length && picked.length < need; offset += 1) picked.push(pool[(start + offset) % pool.length]);
  ctx.stats.backfilled += picked.length;
  return picked;
}

type PhraseReference = { lessonId: number; phraseId: string; phrase: LessonPhrase; sourceText: string };
type GapCandidate = { reference: PhraseReference; word: LessonWord; gap: string; options: string[] };
type OddityCandidate = { reference: PhraseReference; wrong: string };

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[.!?]+$/u, '').replace(/\s+/g, ' ');
}

function explicitSourceText(phrase: LessonPhrase, locale: SourceLocale): string {
  if (locale === 'ru') return phrase.russian.trim();
  if (locale === 'uk') return phrase.ukrainian?.trim() || '';
  if (locale === 'es') return phrase.spanish?.trim() || phrase.sourceLocales?.es?.trim() || '';
  return phrase.sourceLocales?.[locale]?.trim() || '';
}

function targetWords(phrase: LessonPhrase): LessonWord[] {
  return (phrase.wordsEn?.length ? phrase.wordsEn : phrase.words).filter((word) => word.text.trim());
}

function replaceUniqueWord(sentence: string, word: string, replacement: string): string | null {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`(^|\\s)(${escaped})(?=\\s|[.,!?;:]|$)`, 'giu');
  const matches = [...sentence.matchAll(matcher)];
  if (matches.length !== 1) return null;
  return sentence.replace(matcher, (_whole, prefix: string) => `${prefix}${replacement}`);
}

function grammarCompatibleGapOptions(sentence: string, word: LessonWord, options: readonly string[]): string[] {
  const category = String(word.category ?? '').trim().toLocaleLowerCase();
  const tokens = sentence.match(/[A-Za-z']+/g) || [];
  const answerIndex = tokens.findIndex((token) => normalized(token) === normalized(word.text));
  if (answerIndex < 0) return [];
  const previous = normalized(tokens[answerIndex - 1] || '');
  const next = normalized(tokens[answerIndex + 1] || '');
  const isSingular = ['he', 'she', 'it'].includes(previous);
  const isPlural = ['i', 'you', 'we', 'they'].includes(previous);
  return options.filter((option) => {
    const value = normalized(option);
    if (['article', 'articulo'].includes(category)) {
      return value === (/^[aeiou]/u.test(next) ? 'an' : 'a');
    }
    if (['to-be', 'verbo_ser', 'verbo_estar'].includes(category)) {
      return value === (previous === 'i' ? 'am' : isPlural ? 'are' : isSingular ? 'is' : '');
    }
    if (['pronoun', 'pronombre'].includes(category)) {
      const be = next;
      return be === 'am' ? value === 'i'
        : be === 'is' ? ['he', 'she', 'it'].includes(value)
          : be === 'are' ? ['you', 'we', 'they'].includes(value) : false;
    }
    if (['verb', 'verbo', 'verbs'].includes(category)) {
      return isSingular ? /(?:s|es)$/u.test(value) : isPlural ? !/(?:s|es)$/u.test(value) : false;
    }
    return false;
  });
}

/**
 * зачем (владелец, U10 «Один подходящий ответ», 11.11): с версии 4 засчитывается только один вариант, поэтому в пропуск обязан
 * подходить ровно один. Соблазны плитки и добор «тем же классом» этого не гарантируют («Are you ___?» → free / okay / tired),
 * поэтому пропуск строится только по правилам грамматики из level_exam_gap_rules — там же объяснено, почему именно так.
 * Обход «правило → слово»: сначала ищем во фразе содержательное правило (время, артикль), местоимение — в последнюю очередь.
 */
function provableGapCandidate(reference: PhraseReference, ctx: VocabContext): GapCandidate | null {
  const sentence = reference.phrase.english.trim();
  const words = targetWords(reference.phrase);
  for (const rule of GAP_RULE_ORDER) {
    for (const word of words) {
      const category = String(word.category ?? '').trim().toLocaleLowerCase();
      const found = provableGapByRule(rule, {
        sentence,
        answer: word.text,
        category,
        authored: word.distractors || [],
        categoryPool: ctx.vocab.byCategory.get(category) || [],
        isKnown: (value) => isKnownWord(ctx, value),
      });
      if (!found) continue;
      const gap = replaceUniqueWord(sentence, found.answer, '___');
      if (gap) return { reference, word, gap, options: [found.answer, ...found.distractors] };
    }
  }
  return null;
}

/** Все доказуемые пропуски фразы — по одному на слово; из них строятся задания новых механик (ошибка только доказуемая). */
function provableGapsOf(reference: PhraseReference, ctx: VocabContext): ExpandedSeedGap[] {
  const sentence = reference.phrase.english.trim();
  const found: ExpandedSeedGap[] = [];
  for (const rule of GAP_RULE_ORDER) {
    for (const word of targetWords(reference.phrase)) {
      const category = String(word.category ?? '').trim().toLocaleLowerCase();
      const result = provableGapByRule(rule, {
        sentence,
        answer: word.text,
        category,
        authored: word.distractors || [],
        categoryPool: ctx.vocab.byCategory.get(category) || [],
        isKnown: (value) => isKnownWord(ctx, value),
      });
      if (!result || found.some((gap) => normalized(gap.answer) === normalized(result.answer))) continue;
      if (replaceUniqueWord(sentence, result.answer, '___')) found.push({ answer: result.answer, distractors: result.distractors });
    }
  }
  return found;
}

/**
 * Пропуски фразы курса, у которого нет своих правил грамматики (испанский, немецкий, французский, итальянский).
 *
 * зачем: правила «доказуемого пропуска» написаны только для английского. У остальных курсов неверные варианты берутся из
 * плитки урока — это те же соблазны, на которых ученик собирал эту фразу в уроке. Правила отбора — те, что уже выверены
 * в банке итогового экзамена (classic_final_exam_bank): слово стоит во фразе целым словом ровно один раз; из неверных
 * убраны слова, которые встречаются в принятых вариантах фразы («qui / qua», «Estoy / Yo estoy») — иначе «неверный» верен;
 * неверные — только из слов уже пройденных уроков.
 */
function tileGapsOf(reference: PhraseReference, ctx: VocabContext): ExpandedSeedGap[] {
  const sentence = reference.phrase.english.trim();
  const alsoCorrect = new Set(wordTokens(sentence));
  for (const alternative of reference.phrase.alternatives || []) wordTokens(alternative).forEach((token) => alsoCorrect.add(token));
  for (const sequence of reference.phrase.classic?.accepted || []) for (const token of sequence) wordTokens(token).forEach((part) => alsoCorrect.add(part));
  const found: ExpandedSeedGap[] = [];
  for (const word of targetWords(reference.phrase)) {
    const answer = (word.correct || word.text || '').trim();
    if (!answer || /\s/u.test(answer) || found.some((gap) => normalized(gap.answer) === normalized(answer))) continue;
    if (!replaceUniqueWord(sentence, answer, '___')) continue;
    const seen = new Set([normalized(answer)]);
    const wrong: string[] = [];
    for (const raw of knownOnly(ctx, (word.distractors || []).map((value) => value.trim()).filter(Boolean))) {
      const key = normalized(raw);
      if (/\s/u.test(raw) || seen.has(key) || alsoCorrect.has(key)) continue;
      seen.add(key);
      wrong.push(raw);
    }
    if (wrong.length >= 3) found.push({ answer, distractors: wrong.slice(0, 3) });
  }
  return found;
}

/**
 * Перевод фразы на язык ученика. Если интерфейс совпал с языком курса (испанский курс при испанском интерфейсе),
 * «перевод» был бы самой фразой — тогда берётся английский, затем русский перевод курса.
 */
function sourceTextFor(phrase: LessonPhrase, locale: SourceLocale, studyTarget: LevelExamStudyTarget): string {
  if ((locale as string) !== studyTarget) return explicitSourceText(phrase, locale);
  return phrase.classic?.sourceLocales?.en?.trim() || phrase.russian.trim();
}

/** provable=false — прежний отбор версии 3 (там засчитывается любой вариант смыслового пропуска); его не трогаем, чтобы начатые попытки восстанавливались. */
function safeGapCandidate(reference: PhraseReference, ctx: VocabContext, provable: boolean): GapCandidate | null {
  if (provable) return provableGapCandidate(reference, ctx);
  for (const word of targetWords(reference.phrase)) {
    const answer = word.text.trim();
    if (!/^[A-Za-z']+$/u.test(answer)) continue;
    const known = knownOnly(ctx, (word.distractors || []).map((value) => value.trim()).filter((value) => /^[A-Za-z']+$/u.test(value)));
    const base = [answer, ...known];
    const uniqueBase = [...new Map(base.map((value) => [normalized(value), value])).values()];
    const unique = [...uniqueBase, ...backfillByCategory(ctx, word, uniqueBase, 4 - uniqueBase.length)];
    if (unique.length < 4) continue;
    const category = String(word.category ?? '').trim().toLocaleLowerCase();
    const grammarCategory = ['article', 'articulo', 'to-be', 'verbo_ser', 'verbo_estar', 'pronoun', 'pronombre', 'verb', 'verbo', 'verbs'].includes(category);
    if (grammarCategory) {
      const valid = grammarCompatibleGapOptions(reference.phrase.english.trim(), word, unique);
      if (valid.length !== 1 || normalized(valid[0]) !== normalized(answer)) continue;
    }
    const gap = replaceUniqueWord(reference.phrase.english.trim(), answer, '___');
    if (gap) {
      return { reference, word, gap, options: unique.slice(0, 4) };
    }
  }
  return null;
}

/** Only make an oddity when the altered token has one unambiguous grammar rule.
 * This deliberately rejects lexical substitutions: they were the source of the
 * old nonsensical "tap the wrong word" tasks. */
function safeOddityCandidate(reference: PhraseReference, ctx: VocabContext): OddityCandidate | null {
  const sentence = reference.phrase.english.trim();
  const tokens = sentence.match(/[A-Za-z']+/g) || [];
  for (const word of targetWords(reference.phrase)) {
    const original = word.text.trim();
    const tokenIndex = tokens.findIndex((token) => normalized(token) === normalized(original));
    if (tokenIndex < 0 || tokens.filter((token) => normalized(token) === normalized(original)).length !== 1) continue;
    const category = String(word.category ?? '').trim().toLocaleLowerCase();
    const traps = knownOnly(ctx, (word.distractors || []).map((value) => value.trim()));
    let replacement = '';
    if (['article', 'articulo'].includes(category) && ['a', 'an'].includes(normalized(original))) {
      const next = normalized(tokens[tokenIndex + 1] || '');
      const expected = /^[aeiou]/u.test(next) ? 'an' : 'a';
      if (normalized(original) !== expected) continue;
      replacement = traps.find((value) => normalized(value) === (expected === 'a' ? 'an' : 'a')) || '';
    } else if (['to-be', 'verbo_ser', 'verbo_estar'].includes(category)) {
      const subject = normalized(tokens[tokenIndex - 1] || '');
      const expected = subject === 'i' ? 'am' : ['you', 'we', 'they'].includes(subject) ? 'are' : ['he', 'she', 'it'].includes(subject) ? 'is' : '';
      if (!expected || normalized(original) !== expected) continue;
      replacement = traps.find((value) => ['am', 'is', 'are'].includes(normalized(value)) && normalized(value) !== expected) || '';
    } else if (['pronoun', 'pronombre'].includes(category)) {
      const be = normalized(tokens[tokenIndex + 1] || '');
      const expected = be === 'am' ? 'i' : be === 'is' ? 'he|she|it' : be === 'are' ? 'you|we|they' : '';
      if (!expected || !expected.split('|').includes(normalized(original))) continue;
      replacement = traps.find((value) => !expected.split('|').includes(normalized(value)) && /^[A-Za-z]+$/u.test(value)) || '';
    } else if (['verb', 'verbo', 'verbs'].includes(category) && tokenIndex > 0) {
      const subject = normalized(tokens[tokenIndex - 1] || '');
      const singular = ['he', 'she', 'it'].includes(subject);
      const plural = ['i', 'you', 'we', 'they'].includes(subject);
      const originalKey = normalized(original);
      if (singular && /s$/u.test(originalKey)) {
        const stems = [originalKey.replace(/es$/u, ''), originalKey.replace(/s$/u, '')];
        replacement = traps.find((value) => stems.includes(normalized(value))) || '';
      } else if (plural && !/s$/u.test(originalKey)) {
        replacement = traps.find((value) => [
          `${originalKey}s`, `${originalKey}es`,
        ].includes(normalized(value))) || '';
      }
    }
    if (!replacement) continue;
    const wrong = replaceUniqueWord(sentence, original, replacement);
    if (wrong) return { reference, wrong };
  }
  return null;
}

function choiceOptions(taskId: string, correctText: string, alternatives: readonly string[], seed: string) {
  const used = new Set([normalized(correctText)]);
  const distractors: string[] = [];
  for (const value of shuffled(alternatives, createLevelExamRng(`${seed}:${taskId}:distractors`))) {
    const key = normalized(value);
    if (!key || used.has(key)) continue;
    used.add(key);
    distractors.push(value.trim());
    if (distractors.length === 3) break;
  }
  if (distractors.length !== 3) throw new Error(`level_exam_distractors_missing:${taskId}`);
  const correctOptionId = `${taskId}:correct`;
  return {
    correctOptionId,
    options: shuffled([
      { id: correctOptionId, text: correctText },
      ...distractors.map((text, index) => ({ id: `${taskId}:d${index}`, text })),
    ], createLevelExamRng(`${seed}:${taskId}:options`)),
  };
}

function shuffledWithoutIdentity<T extends { id: string }>(values: readonly T[], seed: string): T[] {
  const result = shuffled(values, createLevelExamRng(seed));
  return result.length > 1 && result.every((value, index) => value.id === values[index].id)
    ? [...result.slice(1), result[0]]
    : result;
}

function builderTokens(reference: PhraseReference, taskId: string, seed: string, ctx: VocabContext, wordPattern: RegExp): {
  tokens: { id: string; text: string; isDistractor?: boolean }[];
  correctTokenIds: string[];
} {
  const canonical = targetWords(reference.phrase).map((word, tokenIndex) => ({
    id: `${taskId}:t${tokenIndex}`,
    text: word.text,
  }));
  const correctText = new Set(canonical.map((token) => normalized(token.text)));
  const decoys = knownOnly(ctx, targetWords(reference.phrase)
    .flatMap((word) => word.distractors || [])
    .map((text) => text.trim())
    .filter((text) => wordPattern.test(text) && !correctText.has(normalized(text))));
  const uniqueDecoys = [...new Map(decoys.map((text) => [normalized(text), text])).values()].slice(0, 2);
  if (uniqueDecoys.length < 2) {
    // зачем: не хватило соблазнов из пройденных уроков — берём близкие по классу слова того же словаря (грамматические классы не трогаем: подмена даёт вторую верную фразу)
    const wordForBackfill = targetWords(reference.phrase).find((word) => word.category && !GRAMMAR_CATEGORIES.includes(String(word.category).trim().toLocaleLowerCase()));
    if (wordForBackfill) {
      const taken = [...correctText, ...uniqueDecoys];
      uniqueDecoys.push(...backfillByCategory(ctx, wordForBackfill, taken, 2 - uniqueDecoys.length));
    }
  }
  return {
    tokens: shuffledWithoutIdentity([
      ...canonical,
      ...uniqueDecoys.map((text, index) => ({ id: `${taskId}:d${index}`, text, isDistractor: true })),
    ], `${seed}:${taskId}:tokens`),
    correctTokenIds: canonical.map((token) => token.id),
  };
}

function hasBuilderDistractor(reference: PhraseReference, ctx: VocabContext, wordPattern: RegExp): boolean {
  const correctText = new Set(targetWords(reference.phrase).map((word) => normalized(word.text)));
  return targetWords(reference.phrase).some((word) => (word.distractors || []).some((text) => (
    wordPattern.test(text.trim()) && !correctText.has(normalized(text)) && isKnownWord(ctx, text)
  )));
}

export function buildLevelExamBlueprint(input: BuildLevelExamBlueprintInput): LevelExamBlueprint {
  const blueprintVersion = input.blueprintVersion ?? CURRENT_LEVEL_EXAM_BLUEPRINT_VERSION;
  const [fromLesson, toLesson] = COURSE_LEVEL_RANGES[input.level];
  // зачем: loud считает отброшенное/добранное только для РЕАЛЬНО выданных заданий; quiet — для проб кандидатов (иначе счёт раздувается)
  const target = input.studyTarget;
  // зачем: до версии 5 движок знал только английский; у остальных курсов прежних попыток этого движка не бывает
  if (target !== 'en' && blueprintVersion < 5) throw new Error(`level_exam_version_unsupported:${target}:${blueprintVersion}`);
  // зачем: слова с диакритикой (está, über, déjà) английской маской [A-Za-z] отбрасывались бы; английскую маску не трогаем — от неё зависят прежние версии
  const wordPattern = target === 'en' ? /^[A-Za-z']+$/u : /^[\p{L}'’-]+$/u;
  const courseTarget: StudyTargetLang | undefined = blueprintVersion >= 5 ? target : undefined;
  const vocab = levelVocab(toLesson, courseTarget);
  const loud: VocabContext = { vocab, stats: { filtered: 0, backfilled: 0 } };
  const quiet: VocabContext = { vocab, stats: { filtered: 0, backfilled: 0 } };
  const references: PhraseReference[] = [];
  for (let lessonId = fromLesson; lessonId <= toLesson; lessonId += 1) {
    for (const phrase of lessonPhrases(lessonId, courseTarget)) {
      const sourceText = sourceTextFor(phrase, input.sourceLocale, target);
      if (phrase.english.trim() && sourceText) references.push({ lessonId, phraseId: String(phrase.id), phrase, sourceText });
    }
  }
  if (references.length < 30) throw new Error(`level_exam_locale_content_missing:${input.level}:${input.sourceLocale}`);
  const seededReferences = shuffled(references, createLevelExamRng(`${input.seed}:catalog`));

  const lessonCount = toLesson - fromLesson + 1;
  const used = new Set<string>();
  let cursor = 0;
  const next = (predicate: (reference: PhraseReference) => boolean = () => true): PhraseReference => {
    for (let scan = 0; scan < references.length * 2; scan += 1) {
      const desiredLesson = fromLesson + (cursor % lessonCount);
      const start = Math.floor(cursor / lessonCount);
      cursor += 1;
      const lessonRefs = seededReferences.filter((item) => item.lessonId === desiredLesson && predicate(item));
      for (let offset = 0; offset < lessonRefs.length; offset += 1) {
        const candidate = lessonRefs[(start + offset) % lessonRefs.length];
        const key = `${candidate.lessonId}:${candidate.phraseId}`;
        if (!used.has(key)) { used.add(key); return candidate; }
      }
    }
    throw new Error(`level_exam_candidate_missing:${input.level}`);
  };

  const tasks: LevelExamTask[] = [];
  const englishByLesson = new Map<number, string[]>();
  for (const reference of references) {
    const list = englishByLesson.get(reference.lessonId) || [];
    list.push(reference.phrase.english.trim());
    englishByLesson.set(reference.lessonId, list);
  }

  const mix = blueprintVersion >= 5 ? LEVEL_EXAM_V5_MIX[input.level] : LEGACY_MIX;
  const gapCache = new Map<string, ExpandedSeedGap[]>();
  const gapsOf = (reference: PhraseReference): ExpandedSeedGap[] => {
    const key = `${reference.lessonId}:${reference.phraseId}`;
    const cached = gapCache.get(key);
    if (cached) return cached;
    const gaps = target === 'en' ? provableGapsOf(reference, quiet) : tileGapsOf(reference, quiet);
    gapCache.set(key, gaps);
    return gaps;
  };
  /**
   * зачем: «найди ошибку» до версии 5 искала ошибку по разметке класса слова, а в фразах курса, который проходит ученик,
   * такой разметки нет — кандидатов не находилось вовсе. С версии 5 ошибочная фраза строится так же, как пропуск:
   * слово заменяется соблазном, который ДОКАЗУЕМО неверен в этом месте по правилу грамматики.
   */
  const oddityOf = (reference: PhraseReference, ctx: VocabContext): OddityCandidate | null => {
    if (blueprintVersion < 5) return safeOddityCandidate(reference, ctx);
    const gap = gapsOf(reference)[0];
    if (!gap) return null;
    const wrong = swapPhraseWord(reference.phrase.english.trim(), gap.answer, gap.distractors[0]);
    return wrong ? { reference, wrong } : null;
  };

  for (let index = 0; index < mix.classic.guess_phrase; index += 1) {
    const reference = next();
    const id = `${input.level}:guess_phrase:${reference.lessonId}:${reference.phraseId}`;
    tasks.push({
      id, scoreUnitId: id, lessonId: reference.lessonId, phraseId: reference.phraseId,
      format: 'guess_phrase', prompt: reference.sourceText,
      explanation: `${reference.phrase.english.trim()} — ${reference.sourceText}`,
      ...choiceOptions(id, reference.phrase.english.trim(), englishByLesson.get(reference.lessonId) || [], input.seed),
    } satisfies LevelExamChoiceTask);
  }

  for (let index = 0; index < mix.classic.fill_gap; index += 1) {
    // зачем (сторож level_exam_active_attempt_compatibility): версия 4 обязана давать те же задания, что версия 3 — иначе попытка,
    // начатая на версии 4, после обновления восстановится с другими заданиями. Доказуемые пропуски (U10) меняют отбор фраз,
    // поэтому живут только в версии 5; версия 4 сохраняет прежний отбор, подсказку-перевод и один засчитываемый вариант.
    const provableGaps = blueprintVersion >= 5;
    // зачем: у курса без правил грамматики пропуск берётся из плитки урока (tileGapsOf); у английского — прежний путь
    const gapCandidateOf = (item: PhraseReference, ctx: VocabContext): GapCandidate | null => {
      if (target === 'en') return safeGapCandidate(item, ctx, provableGaps);
      const gap = gapsOf(item)[0];
      const cut = gap ? replaceUniqueWord(item.phrase.english.trim(), gap.answer, '___') : null;
      return gap && cut ? { reference: item, word: { text: gap.answer, correct: gap.answer, distractors: [...gap.distractors] }, gap: cut, options: [gap.answer, ...gap.distractors] } : null;
    };
    const reference = next((item) => gapCandidateOf(item, quiet) !== null);
    const candidate = gapCandidateOf(reference, loud)!;
    const id = `${input.level}:fill_gap:${reference.lessonId}:${reference.phraseId}`;
    const choices = choiceOptions(id, candidate.word.text.trim(), candidate.options.slice(1), input.seed);
    const category = String(candidate.word.category ?? '').trim().toLocaleLowerCase();
    const grammarCategory = ['article', 'articulo', 'to-be', 'verbo_ser', 'verbo_estar', 'pronoun', 'pronombre', 'verb', 'verbo', 'verbs'].includes(category);
    tasks.push({
      id, scoreUnitId: id, lessonId: reference.lessonId, phraseId: reference.phraseId,
      format: 'fill_gap', prompt: blueprintVersion >= 4 ? `${reference.sourceText}\n${candidate.gap}` : candidate.gap,
      explanation: `${reference.phrase.english.trim()} — ${reference.sourceText}`,
      ...choices,
      acceptedOptionIds: blueprintVersion >= 4 || grammarCategory
        ? [choices.correctOptionId]
        : choices.options.map((option) => option.id),
    } satisfies LevelExamChoiceTask);
  }

  for (let index = 0; index < mix.classic.find_oddity; index += 1) {
    const reference = next((item) => oddityOf(item, quiet) !== null);
    const candidate = oddityOf(reference, loud)!;
    const id = `${input.level}:find_oddity:${reference.lessonId}:${reference.phraseId}`;
    tasks.push({
      id, scoreUnitId: id, lessonId: reference.lessonId, phraseId: reference.phraseId,
      format: 'find_oddity', prompt: 'Which sentence is not correct?',
      explanation: `${reference.phrase.english.trim()} — ${reference.sourceText}`,
      ...choiceOptions(id, candidate.wrong, (englishByLesson.get(reference.lessonId) || [])
        .filter((value) => normalized(value) !== normalized(reference.phrase.english)), input.seed),
    } satisfies LevelExamChoiceTask);
  }

  for (let index = 0; index < mix.classic.translate_build; index += 1) {
    const reference = next((item) => targetWords(item.phrase).length >= 2 && hasBuilderDistractor(item, quiet, wordPattern));
    const id = `${input.level}:translate_build:${reference.lessonId}:${reference.phraseId}`;
    const tokenData = builderTokens(reference, id, input.seed, loud, wordPattern);
    tasks.push({
      id, scoreUnitId: id, lessonId: reference.lessonId, phraseId: reference.phraseId,
      format: 'translate_build', prompt: reference.sourceText,
      explanation: `${reference.phrase.english.trim()} — ${reference.sourceText}`,
      ...tokenData,
    } satisfies LevelExamPhraseBuilderTask);
  }

  // ── двенадцать новых механик (версия 5): задание собирается из фраз уроков уровня ──
  const seedOf = (reference: PhraseReference): ExpandedSeed => ({
    lessonId: reference.lessonId,
    phraseId: reference.phraseId,
    english: reference.phrase.english.trim(),
    sourceText: reference.sourceText,
    // принятые в уроке варианты: и готовые фразы, и последовательности плиток курса
    alternatives: [
      ...(reference.phrase.alternatives || []),
      ...(reference.phrase.classic?.accepted || []).map((sequence) => sequence.join(' ')),
    ].map((value) => value.trim()).filter(Boolean),
    gaps: gapsOf(reference),
  });
  const release = (picked: readonly PhraseReference[]): void => {
    for (const reference of picked) used.delete(`${reference.lessonId}:${reference.phraseId}`);
  };
  let expandedFallbacks = 0;
  const tryExpanded = (format: PhraseBuiltFormat, serial: number): LevelExamExpandedTask | null => {
    const need = EXPANDED_SEED_NEEDS[format];
    for (let attemptIndex = 0; attemptIndex < EXPANDED_BUILD_TRIES; attemptIndex += 1) {
      const picked: PhraseReference[] = [];
      try {
        for (let slot = 0; slot < need.seeds; slot += 1) picked.push(next((item) => gapsOf(item).length >= need.gaps));
      } catch (error) {
        // зачем: фраз с нужным числом доказуемых пропусков больше нет — эту механику из уровня не собрать, берём запасную
        DebugLogger.warn(LOG, `expanded no candidates level=${input.level} format=${format} need=${need.seeds}x${need.gaps} reason=${error instanceof Error ? error.message : String(error)}`);
        release(picked);
        return null;
      }
      const draft = buildExpandedExamDraft(format, picked.map(seedOf), `${input.seed}:${format}:${serial}:${attemptIndex}`, input.sourceLocale, target);
      if (draft) {
        const main = picked[0];
        const id = `${input.level}:${format}:${main.lessonId}:${main.phraseId}`;
        return {
          id, scoreUnitId: id, lessonId: main.lessonId, phraseId: main.phraseId,
          format, instruction: draft.instruction, prompt: draft.prompt, context: draft.context,
          explanation: `${main.phrase.english.trim()} — ${main.sourceText}`,
          exercise: draft.exercise,
        };
      }
      // зачем: из этих фраз честное задание не вышло (слово повторяется, варианты совпали) — фразы возвращаются в общий запас
      release(picked);
    }
    return null;
  };
  let expandedSerial = 0;
  for (const [format, count] of mix.expanded) {
    for (let index = 0; index < count; index += 1) {
      expandedSerial += 1;
      const chain: PhraseBuiltFormat[] = [format, ...(EXPANDED_FALLBACK[format] || []), EXPANDED_LAST_RESORT];
      let task: LevelExamExpandedTask | null = null;
      for (const candidate of chain) {
        task = tryExpanded(candidate, expandedSerial);
        if (task) {
          if (candidate !== format) expandedFallbacks += 1;
          break;
        }
      }
      if (!task) throw new Error(`level_exam_expanded_missing:${input.level}:${format}`);
      tasks.push(task);
    }
  }

  // ── пять механик из авторского банка диалогов и текстов ──
  const authoredPool = shuffled(authoredExamItems(input.studyTarget, input.level), createLevelExamRng(`${input.seed}:authored`));
  const authoredUsed = new Set<string>();
  let authoredSubstituted = 0;
  for (const [format, count] of mix.authored) {
    for (let index = 0; index < count; index += 1) {
      expandedSerial += 1;
      let task: LevelExamExpandedTask | null = null;
      for (const item of authoredPool) {
        if (item.format !== format || authoredUsed.has(item.id)) continue;
        const draft = buildAuthoredExamDraft(item, input.seed, input.sourceLocale, target);
        if (!draft) {
          DebugLogger.warn(LOG, `authored item rejected id=${item.id} format=${format}`);
          continue;
        }
        authoredUsed.add(item.id);
        const id = `${input.level}:${format}:${item.lessonId}:${item.id}`;
        task = {
          id, scoreUnitId: id, lessonId: item.lessonId, phraseId: item.id,
          format, instruction: draft.instruction, prompt: draft.prompt, context: draft.context,
          explanation: expandedCorrectText(draft.exercise), exercise: draft.exercise,
        };
        break;
      }
      if (!task) {
        // зачем: банка для этого уровня/языка ещё нет — баллов всё равно 30, место занимает механика из фраз уроков
        authoredSubstituted += 1;
        for (const candidate of [AUTHORED_SUBSTITUTE, EXPANDED_LAST_RESORT]) {
          task = tryExpanded(candidate, expandedSerial);
          if (task) break;
        }
      }
      if (!task) throw new Error(`level_exam_authored_missing:${input.level}:${format}`);
      tasks.push(task);
    }
  }

  const pairs: LevelExamSpeedMatchPair[] = Array.from({ length: 6 }, () => {
    const reference = next();
    return {
      scoreUnitId: `${input.level}:speed_match:${reference.lessonId}:${reference.phraseId}`,
      lessonId: reference.lessonId, phraseId: reference.phraseId,
      source: reference.sourceText, target: reference.phrase.english.trim(),
    };
  });
  tasks.push({ id: `${input.level}:speed_match`, format: 'speed_match', pairs: shuffled(pairs, createLevelExamRng(`${input.seed}:pairs`)) });

  const orderedTasks = shuffled(tasks, createLevelExamRng(`${input.seed}:tasks`));
  // зачем (сперва логи): сколько соблазнов вне пройденных уроков отброшено и сколько добрано близкими по классу
  DebugLogger.info(LOG, `lang=${target} level=${input.level} lessons=1-${toLesson} locale=${input.sourceLocale} vocab=${vocab.tokens.size} filtered=${loud.stats.filtered} backfilled=${loud.stats.backfilled} tasks=${tasks.length} v=${blueprintVersion} course=${courseTarget ?? 'legacy'} expandedFallbacks=${expandedFallbacks} authoredSubstituted=${authoredSubstituted}`);
  return {
    version: blueprintVersion, level: input.level, studyTarget: target, sourceLocale: input.sourceLocale, seed: input.seed,
    tasks: orderedTasks,
    scoredUnitIds: orderedTasks.flatMap((task) => task.format === 'speed_match' ? task.pairs.map((pair) => pair.scoreUnitId) : [task.scoreUnitId]),
    durationMs: EXAM_DURATION_MS[input.level], passScore: levelExamPassScore(input.level, blueprintVersion),
  };
}

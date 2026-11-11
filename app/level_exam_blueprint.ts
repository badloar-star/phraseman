import { COURSE_LEVEL_RANGES } from './course_levels';
import { DebugLogger } from './debug-logger';
import { getLessonData } from './lesson_data_all';
import { GAP_RULE_ORDER, provableGapByRule } from './level_exam_gap_rules';
import type { LessonPhrase, LessonWord } from './lesson_data_types';
import { createLevelExamRng, shuffled } from './level_exam_rng';
import type { SourceLocale } from './source_locales';
import {
  CURRENT_LEVEL_EXAM_BLUEPRINT_VERSION,
  type BuildLevelExamBlueprintInput,
  type LevelExamBlueprint,
  type LevelExamChoiceTask,
  type LevelExamPhraseBuilderTask,
  type LevelExamSpeedMatchPair,
  type LevelExamTask,
} from './level_exam_types';

const EXAM_DURATION_MS = { A1: 12 * 60_000, A2: 13 * 60_000, B1: 14 * 60_000, B2: 15 * 60_000 } as const;
const SINGLE_TASKS_PER_MODE = 6;
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

const vocabCache = new Map<number, LevelVocab>();

/** Словарь уроков 1..toLesson; один раз на последний урок уровня. */
function levelVocab(toLesson: number): LevelVocab {
  const cached = vocabCache.get(toLesson);
  if (cached) return cached;
  const tokens = new Set<string>();
  const byCategory = new Map<string, string[]>();
  for (let lessonId = 1; lessonId <= toLesson; lessonId += 1) {
    for (const phrase of getLessonData(lessonId)) {
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
  vocabCache.set(toLesson, vocab);
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

function builderTokens(reference: PhraseReference, taskId: string, seed: string, ctx: VocabContext): {
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
    .filter((text) => /^[A-Za-z']+$/u.test(text) && !correctText.has(normalized(text))));
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

function hasBuilderDistractor(reference: PhraseReference, ctx: VocabContext): boolean {
  const correctText = new Set(targetWords(reference.phrase).map((word) => normalized(word.text)));
  return targetWords(reference.phrase).some((word) => (word.distractors || []).some((text) => (
    /^[A-Za-z']+$/u.test(text.trim()) && !correctText.has(normalized(text)) && isKnownWord(ctx, text)
  )));
}

export function buildLevelExamBlueprint(input: BuildLevelExamBlueprintInput): LevelExamBlueprint {
  const blueprintVersion = input.blueprintVersion ?? CURRENT_LEVEL_EXAM_BLUEPRINT_VERSION;
  const [fromLesson, toLesson] = COURSE_LEVEL_RANGES[input.level];
  // зачем: loud считает отброшенное/добранное только для РЕАЛЬНО выданных заданий; quiet — для проб кандидатов (иначе счёт раздувается)
  const vocab = levelVocab(toLesson);
  const loud: VocabContext = { vocab, stats: { filtered: 0, backfilled: 0 } };
  const quiet: VocabContext = { vocab, stats: { filtered: 0, backfilled: 0 } };
  const references: PhraseReference[] = [];
  for (let lessonId = fromLesson; lessonId <= toLesson; lessonId += 1) {
    for (const phrase of getLessonData(lessonId)) {
      const sourceText = explicitSourceText(phrase, input.sourceLocale);
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

  for (let index = 0; index < SINGLE_TASKS_PER_MODE; index += 1) {
    const reference = next();
    const id = `${input.level}:guess_phrase:${reference.lessonId}:${reference.phraseId}`;
    tasks.push({
      id, scoreUnitId: id, lessonId: reference.lessonId, phraseId: reference.phraseId,
      format: 'guess_phrase', prompt: reference.sourceText,
      explanation: `${reference.phrase.english.trim()} — ${reference.sourceText}`,
      ...choiceOptions(id, reference.phrase.english.trim(), englishByLesson.get(reference.lessonId) || [], input.seed),
    } satisfies LevelExamChoiceTask);
  }

  for (let index = 0; index < SINGLE_TASKS_PER_MODE; index += 1) {
    const provableGaps = blueprintVersion >= 4;
    const reference = next((item) => safeGapCandidate(item, quiet, provableGaps) !== null);
    const candidate = safeGapCandidate(reference, loud, provableGaps)!;
    const id = `${input.level}:fill_gap:${reference.lessonId}:${reference.phraseId}`;
    const choices = choiceOptions(id, candidate.word.text.trim(), candidate.options.slice(1), input.seed);
    const category = String(candidate.word.category ?? '').trim().toLocaleLowerCase();
    const grammarCategory = ['article', 'articulo', 'to-be', 'verbo_ser', 'verbo_estar', 'pronoun', 'pronombre', 'verb', 'verbo', 'verbs'].includes(category);
    tasks.push({
      id, scoreUnitId: id, lessonId: reference.lessonId, phraseId: reference.phraseId,
      format: 'fill_gap', prompt: blueprintVersion === 4 ? `${reference.sourceText}\n${candidate.gap}` : candidate.gap,
      explanation: `${reference.phrase.english.trim()} — ${reference.sourceText}`,
      ...choices,
      acceptedOptionIds: blueprintVersion === 4 || grammarCategory
        ? [choices.correctOptionId]
        : choices.options.map((option) => option.id),
    } satisfies LevelExamChoiceTask);
  }

  for (let index = 0; index < SINGLE_TASKS_PER_MODE; index += 1) {
    const reference = next((item) => safeOddityCandidate(item, quiet) !== null);
    const candidate = safeOddityCandidate(reference, loud)!;
    const id = `${input.level}:find_oddity:${reference.lessonId}:${reference.phraseId}`;
    tasks.push({
      id, scoreUnitId: id, lessonId: reference.lessonId, phraseId: reference.phraseId,
      format: 'find_oddity', prompt: 'Which sentence is not correct?',
      explanation: `${reference.phrase.english.trim()} — ${reference.sourceText}`,
      ...choiceOptions(id, candidate.wrong, (englishByLesson.get(reference.lessonId) || [])
        .filter((value) => normalized(value) !== normalized(reference.phrase.english)), input.seed),
    } satisfies LevelExamChoiceTask);
  }

  for (let index = 0; index < SINGLE_TASKS_PER_MODE; index += 1) {
    const reference = next((item) => targetWords(item.phrase).length >= 2 && hasBuilderDistractor(item, quiet));
    const id = `${input.level}:translate_build:${reference.lessonId}:${reference.phraseId}`;
    const tokenData = builderTokens(reference, id, input.seed, loud);
    tasks.push({
      id, scoreUnitId: id, lessonId: reference.lessonId, phraseId: reference.phraseId,
      format: 'translate_build', prompt: reference.sourceText,
      explanation: `${reference.phrase.english.trim()} — ${reference.sourceText}`,
      ...tokenData,
    } satisfies LevelExamPhraseBuilderTask);
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
  DebugLogger.info(LOG, `lang=en level=${input.level} lessons=1-${toLesson} locale=${input.sourceLocale} vocab=${vocab.tokens.size} filtered=${loud.stats.filtered} backfilled=${loud.stats.backfilled} tasks=${tasks.length}`);
  return {
    version: blueprintVersion, level: input.level, studyTarget: 'en', sourceLocale: input.sourceLocale, seed: input.seed,
    tasks: orderedTasks,
    scoredUnitIds: orderedTasks.flatMap((task) => task.format === 'speed_match' ? task.pairs.map((pair) => pair.scoreUnitId) : [task.scoreUnitId]),
    durationMs: EXAM_DURATION_MS[input.level], passScore: 21,
  };
}

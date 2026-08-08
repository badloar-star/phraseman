import { COURSE_LEVEL_RANGES } from './course_levels';
import { getLessonData } from './lesson_data_all';
import type { LessonPhrase, LessonWord } from './lesson_data_types';
import { createLevelExamRng, shuffled } from './level_exam_rng';
import type { SourceLocale } from './source_locales';
import type {
  BuildLevelExamBlueprintInput,
  LevelExamBlueprint,
  LevelExamChoiceTask,
  LevelExamPhraseBuilderTask,
  LevelExamSpeedMatchPair,
  LevelExamTask,
} from './level_exam_types';

const EXAM_DURATION_MS = { A1: 12 * 60_000, A2: 13 * 60_000, B1: 14 * 60_000, B2: 15 * 60_000 } as const;
const SINGLE_TASKS_PER_MODE = 6;

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

function safeGapCandidate(reference: PhraseReference): GapCandidate | null {
  for (const word of targetWords(reference.phrase)) {
    const answer = word.text.trim();
    if (!/^[A-Za-z']+$/u.test(answer)) continue;
    const options = [answer, ...(word.distractors || [])]
      .map((value) => value.trim())
      .filter((value) => /^[A-Za-z']+$/u.test(value));
    const unique = [...new Map(options.map((value) => [normalized(value), value])).values()];
    if (unique.length < 4) continue;
    const gap = replaceUniqueWord(reference.phrase.english.trim(), answer, '___');
    if (gap) return { reference, word, gap, options: unique.slice(0, 4) };
  }
  return null;
}

/** Only make an oddity when the altered token has one unambiguous grammar rule.
 * This deliberately rejects lexical substitutions: they were the source of the
 * old nonsensical "tap the wrong word" tasks. */
function safeOddityCandidate(reference: PhraseReference): OddityCandidate | null {
  const sentence = reference.phrase.english.trim();
  const tokens = sentence.match(/[A-Za-z']+/g) || [];
  for (const word of targetWords(reference.phrase)) {
    const original = word.text.trim();
    const tokenIndex = tokens.findIndex((token) => normalized(token) === normalized(original));
    if (tokenIndex < 0 || tokens.filter((token) => normalized(token) === normalized(original)).length !== 1) continue;
    const category = String(word.category ?? '').trim().toLocaleLowerCase();
    const traps = (word.distractors || []).map((value) => value.trim());
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

export function buildLevelExamBlueprint(input: BuildLevelExamBlueprintInput): LevelExamBlueprint {
  const [fromLesson, toLesson] = COURSE_LEVEL_RANGES[input.level];
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
  const allEnglish = references.map((item) => item.phrase.english.trim());

  for (let index = 0; index < SINGLE_TASKS_PER_MODE; index += 1) {
    const reference = next();
    const id = `${input.level}:guess_phrase:${reference.lessonId}:${reference.phraseId}`;
    tasks.push({
      id, scoreUnitId: id, lessonId: reference.lessonId, phraseId: reference.phraseId,
      format: 'guess_phrase', prompt: reference.sourceText,
      explanation: `${reference.phrase.english.trim()} — ${reference.sourceText}`,
      ...choiceOptions(id, reference.phrase.english.trim(), allEnglish, input.seed),
    } satisfies LevelExamChoiceTask);
  }

  for (let index = 0; index < SINGLE_TASKS_PER_MODE; index += 1) {
    const reference = next((item) => safeGapCandidate(item) !== null);
    const candidate = safeGapCandidate(reference)!;
    const id = `${input.level}:fill_gap:${reference.lessonId}:${reference.phraseId}`;
    tasks.push({
      id, scoreUnitId: id, lessonId: reference.lessonId, phraseId: reference.phraseId,
      format: 'fill_gap', prompt: candidate.gap,
      explanation: `${reference.phrase.english.trim()} — ${reference.sourceText}`,
      ...choiceOptions(id, candidate.word.text.trim(), candidate.options.slice(1), input.seed),
    } satisfies LevelExamChoiceTask);
  }

  for (let index = 0; index < SINGLE_TASKS_PER_MODE; index += 1) {
    const reference = next((item) => safeOddityCandidate(item) !== null);
    const candidate = safeOddityCandidate(reference)!;
    const id = `${input.level}:find_oddity:${reference.lessonId}:${reference.phraseId}`;
    tasks.push({
      id, scoreUnitId: id, lessonId: reference.lessonId, phraseId: reference.phraseId,
      format: 'find_oddity', prompt: 'Which sentence is not correct?',
      explanation: `${reference.phrase.english.trim()} — ${reference.sourceText}`,
      ...choiceOptions(id, candidate.wrong, allEnglish.filter((value) => normalized(value) !== normalized(reference.phrase.english)), input.seed),
    } satisfies LevelExamChoiceTask);
  }

  for (let index = 0; index < SINGLE_TASKS_PER_MODE; index += 1) {
    const reference = next((item) => targetWords(item.phrase).length >= 2);
    const id = `${input.level}:translate_build:${reference.lessonId}:${reference.phraseId}`;
    const canonical = targetWords(reference.phrase).map((word, tokenIndex) => ({ id: `${id}:t${tokenIndex}`, text: word.text }));
    tasks.push({
      id, scoreUnitId: id, lessonId: reference.lessonId, phraseId: reference.phraseId,
      format: 'translate_build', prompt: reference.sourceText,
      explanation: `${reference.phrase.english.trim()} — ${reference.sourceText}`,
      tokens: shuffledWithoutIdentity(canonical, `${input.seed}:${id}:tokens`),
      correctTokenIds: canonical.map((token) => token.id),
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
  return {
    version: 3, level: input.level, studyTarget: 'en', sourceLocale: input.sourceLocale, seed: input.seed,
    tasks: orderedTasks,
    scoredUnitIds: orderedTasks.flatMap((task) => task.format === 'speed_match' ? task.pairs.map((pair) => pair.scoreUnitId) : [task.scoreUnitId]),
    durationMs: EXAM_DURATION_MS[input.level], passScore: 21,
  };
}

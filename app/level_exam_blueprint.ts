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
  LevelExamSpotErrorTask,
  LevelExamTask,
  LevelExamToken,
} from './level_exam_types';

const SINGLE_FORMAT_COUNTS = {
  context_choice: 8,
  phrase_builder: 8,
  meaning_choice: 6,
  spot_error: 4,
} as const;

const EXAM_DURATION_MS = {
  A1: 12 * 60_000,
  A2: 13 * 60_000,
  B1: 14 * 60_000,
  B2: 15 * 60_000,
} as const;

type PhraseReference = {
  lessonId: number;
  phraseId: string;
  phrase: LessonPhrase;
  sourceText: string;
};

type ErrorMutation = {
  tokens: LevelExamToken[];
  errorTokenId: string;
  correction: string;
};

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function sourceTextForPhrase(phrase: LessonPhrase, locale: SourceLocale): string {
  if (locale === 'ru') return phrase.russian.trim();
  if (locale === 'uk') return (phrase.ukrainian || phrase.russian).trim();
  if (locale === 'es') return (phrase.spanish || phrase.sourceLocales?.es || phrase.russian).trim();
  return (phrase.sourceLocales?.[locale] || phrase.russian || phrase.ukrainian).trim();
}

function targetWordsForPhrase(phrase: LessonPhrase): LessonWord[] {
  const words = phrase.wordsEn?.length ? phrase.wordsEn : phrase.words;
  return words.filter((word) => word.text.trim() !== '');
}

function mutationForPhrase(phrase: LessonPhrase, seed: string): ErrorMutation | null {
  const words = targetWordsForPhrase(phrase);
  const candidates = words.flatMap((word, index) => {
    const correction = (word.correct || word.text).trim();
    const distractors = word.distractors.filter((value) => {
      const candidate = value.trim();
      return candidate !== ''
        && normalized(candidate) !== normalized(correction)
        && /[\p{L}\p{N}]/u.test(candidate);
    });
    return distractors.length > 0 ? [{ index, correction, distractors }] : [];
  });
  if (candidates.length === 0) return null;
  const rng = createLevelExamRng(seed);
  const selected = candidates[Math.floor(rng() * candidates.length)];
  const incorrect = selected.distractors[Math.floor(rng() * selected.distractors.length)];
  const tokens = words.map((word, index) => ({
    id: `${seed}:token:${index}`,
    text: index === selected.index ? incorrect : word.text,
  }));
  return {
    tokens,
    errorTokenId: tokens[selected.index].id,
    correction: selected.correction,
  };
}

function shuffledWithoutIdentity<T extends { id: string }>(values: readonly T[], seed: string): T[] {
  const result = shuffled(values, createLevelExamRng(seed));
  if (result.length > 1 && result.every((value, index) => value.id === values[index].id)) {
    return [...result.slice(1), result[0]];
  }
  return result;
}

export function buildLevelExamBlueprint(
  input: BuildLevelExamBlueprintInput,
): LevelExamBlueprint {
  const [fromLesson, toLesson] = COURSE_LEVEL_RANGES[input.level];
  const lessonCount = toLesson - fromLesson + 1;
  const referencesByLesson = new Map<number, PhraseReference[]>();
  const allReferences: PhraseReference[] = [];

  for (let lessonId = fromLesson; lessonId <= toLesson; lessonId += 1) {
    const references = getLessonData(lessonId).flatMap((phrase): PhraseReference[] => {
      const phraseId = String(phrase.id).trim();
      const sourceText = sourceTextForPhrase(phrase, input.sourceLocale);
      return phraseId && phrase.english.trim() && sourceText
        ? [{ lessonId, phraseId, phrase, sourceText }]
        : [];
    });
    if (references.length === 0) throw new Error(`level_exam_lesson_empty:${lessonId}`);
    referencesByLesson.set(lessonId, references);
    allReferences.push(...references);
  }

  const tasks: LevelExamTask[] = [];
  let unitIndex = 0;

  const nextReference = (
    accepts: (reference: PhraseReference) => boolean = () => true,
  ): PhraseReference => {
    const currentIndex = unitIndex;
    const lessonId = fromLesson + (currentIndex % lessonCount);
    unitIndex += 1;
    const references = (referencesByLesson.get(lessonId) || []).filter(accepts);
    if (references.length === 0) throw new Error(`level_exam_candidate_missing:${lessonId}`);
    const occurrence = Math.floor(currentIndex / lessonCount);
    return references[occurrence % references.length];
  };

  const choiceOptions = (
    taskId: string,
    correct: PhraseReference,
    format: 'context_choice' | 'meaning_choice',
  ) => {
    const optionText = (reference: PhraseReference) => (
      format === 'context_choice' ? reference.phrase.english.trim() : reference.sourceText
    );
    const correctText = optionText(correct);
    const used = new Set([normalized(correctText)]);
    const distractors: PhraseReference[] = [];
    const pool = shuffled(allReferences, createLevelExamRng(`${input.seed}:${taskId}:distractors`));
    for (const reference of pool) {
      const text = optionText(reference);
      const key = normalized(text);
      if (!key || used.has(key)) continue;
      used.add(key);
      distractors.push(reference);
      if (distractors.length === 3) break;
    }
    if (distractors.length !== 3) throw new Error(`level_exam_distractors_missing:${taskId}`);
    const correctOptionId = `${taskId}:option:correct`;
    const options = [
      { id: correctOptionId, text: correctText },
      ...distractors.map((reference, index) => ({
        id: `${taskId}:option:${index + 1}:${reference.lessonId}:${reference.phraseId}`,
        text: optionText(reference),
      })),
    ];
    return {
      correctOptionId,
      options: shuffled(options, createLevelExamRng(`${input.seed}:${taskId}:options`)),
    };
  };

  Object.entries(SINGLE_FORMAT_COUNTS).forEach(([format, count]) => {
    for (let index = 0; index < count; index += 1) {
      const reference = nextReference((candidate) => {
        if (format === 'phrase_builder') return targetWordsForPhrase(candidate.phrase).length >= 2;
        if (format === 'spot_error') {
          return mutationForPhrase(candidate.phrase, `${input.seed}:probe:${candidate.lessonId}:${candidate.phraseId}`) !== null;
        }
        return true;
      });
      const id = `${input.level}:${format}:${reference.lessonId}:${reference.phraseId}`;
      const base = {
        id,
        scoreUnitId: id,
        lessonId: reference.lessonId,
        phraseId: reference.phraseId,
        prompt: format === 'meaning_choice' ? reference.phrase.english.trim() : reference.sourceText,
        explanation: `${reference.phrase.english.trim()} — ${reference.sourceText}`,
      };

      if (format === 'context_choice' || format === 'meaning_choice') {
        const optionData = choiceOptions(id, reference, format);
        const task: LevelExamChoiceTask = { ...base, format, ...optionData };
        tasks.push(task);
      } else if (format === 'phrase_builder') {
        const canonicalTokens = targetWordsForPhrase(reference.phrase).map((word, tokenIndex) => ({
          id: `${id}:token:${tokenIndex}`,
          text: word.text,
        }));
        const task: LevelExamPhraseBuilderTask = {
          ...base,
          format,
          tokens: shuffledWithoutIdentity(canonicalTokens, `${input.seed}:${id}:tokens`),
          correctTokenIds: canonicalTokens.map((token) => token.id),
        };
        tasks.push(task);
      } else {
        const mutation = mutationForPhrase(reference.phrase, `${input.seed}:${id}:error`);
        if (!mutation) throw new Error(`level_exam_error_mutation_missing:${id}`);
        const task: LevelExamSpotErrorTask = {
          ...base,
          format: 'spot_error',
          ...mutation,
        };
        tasks.push(task);
      }
    }
  });

  const usedMatchSources = new Set<string>();
  const usedMatchTargets = new Set<string>();
  const pairs: LevelExamSpeedMatchPair[] = Array.from({ length: 4 }, () => {
    const reference = nextReference((candidate) => (
      !usedMatchSources.has(normalized(candidate.sourceText))
      && !usedMatchTargets.has(normalized(candidate.phrase.english))
    ));
    const scoreUnitId = `${input.level}:speed_match:${reference.lessonId}:${reference.phraseId}`;
    usedMatchSources.add(normalized(reference.sourceText));
    usedMatchTargets.add(normalized(reference.phrase.english));
    return {
      scoreUnitId,
      lessonId: reference.lessonId,
      phraseId: reference.phraseId,
      source: reference.sourceText,
      target: reference.phrase.english.trim(),
    };
  });
  tasks.push({
    id: `${input.level}:speed_match`,
    format: 'speed_match',
    pairs: shuffled(pairs, createLevelExamRng(`${input.seed}:speed-match`)),
  });

  const orderedTasks = shuffled(tasks, createLevelExamRng(`${input.seed}:tasks`));
  const orderedScoredUnitIds = orderedTasks.flatMap((task) => (
    task.format === 'speed_match'
      ? task.pairs.map((pair) => pair.scoreUnitId)
      : [task.scoreUnitId]
  ));

  return {
    version: 2,
    level: input.level,
    studyTarget: input.studyTarget,
    sourceLocale: input.sourceLocale,
    seed: input.seed,
    tasks: orderedTasks,
    scoredUnitIds: orderedScoredUnitIds,
    durationMs: EXAM_DURATION_MS[input.level],
    passScore: 21,
  };
}

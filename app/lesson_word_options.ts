import { buildSmartVocabularyOptions, type SmartDistractorCandidate } from './smart_distractors';

export interface LessonWordOptionInput {
  en: string;
  pos: string;
}

export interface LessonWordOptionBuildConfig {
  blockedValues?: ReadonlySet<string>;
}

export function buildLessonWordOptions(
  correct: LessonWordOptionInput,
  lessonWords: LessonWordOptionInput[],
  allWords: LessonWordOptionInput[],
  config: LessonWordOptionBuildConfig = {},
): string[] {
  const blockedValues = config.blockedValues ?? new Set<string>();
  const notMe = (word: LessonWordOptionInput) => word.en !== correct.en;
  const allowed = (word: LessonWordOptionInput) => !blockedValues.has(word.en);
  const toCandidate = (source: SmartDistractorCandidate['source']) => (
    word: LessonWordOptionInput,
  ): SmartDistractorCandidate => ({
    value: word.en,
    pos: word.pos,
    source,
  });

  const lessonCandidates = lessonWords
    .filter((word) => notMe(word) && allowed(word))
    .map(toCandidate('lesson'));
  const crossCandidates = allWords
    .filter((word) => notMe(word) && allowed(word) && !lessonWords.some((local) => local.en === word.en))
    .map(toCandidate('crossLesson'));
  const fallbackCandidates = [...lessonWords, ...allWords]
    .filter((word) => notMe(word) && allowed(word))
    .map(toCandidate('reserve'));

  return buildSmartVocabularyOptions(
    { value: correct.en, pos: correct.pos, source: 'lesson' },
    [...lessonCandidates, ...crossCandidates, ...fallbackCandidates],
    { pos: correct.pos, optionCount: 6 },
  );
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

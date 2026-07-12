export type LessonWordLike = { en: string; pos: string };

export type LessonWordSenseException = {
  key: string;
  firstLesson: number;
  laterLesson: number;
  reason: 'new_sense';
};

export type LessonWordBankDiagnostic = {
  lessonId: number;
  rawCount: number;
  runtimeCount: number;
  duplicatesRemoved: number;
  filteredCount: number;
};

export function lessonWordSemanticKey(lemma: string, pos: string): string {
  return `${lemma.trim().toLowerCase()}::${pos.trim().toLowerCase()}`;
}

export function buildLessonWordBankCore<T extends LessonWordLike>(options: {
  raw: Record<number, T[]>;
  canonicalize: (word: T) => T;
  isAllowed: (word: T) => boolean;
  exceptions?: readonly LessonWordSenseException[];
}): {
  wordsByLesson: Record<number, T[]>;
  diagnostics: LessonWordBankDiagnostic[];
  consumedExceptions: LessonWordSenseException[];
} {
  const lessonIds = Object.keys(options.raw).map(Number).sort((a, b) => a - b);
  const firstLessonByKey = new Map<string, number>();
  const consumed = new Set<LessonWordSenseException>();
  const wordsByLesson: Record<number, T[]> = {};
  const diagnostics: LessonWordBankDiagnostic[] = [];

  for (const lessonId of lessonIds) {
    const rawWords = options.raw[lessonId] ?? [];
    const runtimeWords: T[] = [];
    let duplicatesRemoved = 0;
    let filteredCount = 0;
    const posByLemmaInLesson = new Map<string, string>();
    for (const rawWord of rawWords) {
      const word = options.canonicalize(rawWord);
      if (!options.isAllowed(word)) {
        filteredCount++;
        continue;
      }
      const key = lessonWordSemanticKey(word.en, word.pos);
      const firstLesson = firstLessonByKey.get(key);
      if (firstLesson != null) {
        const exception = options.exceptions?.find((entry) => !consumed.has(entry) &&
          entry.key === key && entry.firstLesson === firstLesson && entry.laterLesson === lessonId,
        );
        if (exception) consumed.add(exception);
        else {
          duplicatesRemoved++;
          continue;
        }
      } else {
        firstLessonByKey.set(key, lessonId);
      }
      const lemma = word.en.trim().toLowerCase();
      const normalizedPos = word.pos.trim().toLowerCase();
      const firstPosInLesson = posByLemmaInLesson.get(lemma);
      if (firstPosInLesson && firstPosInLesson !== normalizedPos) {
        throw new Error(`Cross-POS lesson word homograph: lemma=${lemma} lesson=L${lessonId} POS=${firstPosInLesson}/${normalizedPos}`);
      }
      posByLemmaInLesson.set(lemma, normalizedPos);
      runtimeWords.push(word);
    }
    wordsByLesson[lessonId] = runtimeWords;
    diagnostics.push({ lessonId, rawCount: rawWords.length, runtimeCount: runtimeWords.length, duplicatesRemoved, filteredCount });
  }

  const unused = (options.exceptions ?? []).filter((entry) => !consumed.has(entry));
  if (unused.length) {
    const entry = unused[0]!;
    throw new Error(`Unconsumed lesson word sense exception: key=${entry.key} first=L${entry.firstLesson} later=L${entry.laterLesson}`);
  }
  return { wordsByLesson, diagnostics, consumedExceptions: [...consumed] };
}

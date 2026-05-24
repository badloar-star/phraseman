import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const failures = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) failures.push(message);
}

const lessonWords = read('app/lesson_words.tsx');
requireIncludes(
  lessonWords,
  'function isValidTrainingCard',
  'lesson_words must validate cards before shuffling/rendering',
);
requireIncludes(
  lessonWords,
  'arr.filter(isValidTrainingCard)',
  'lesson_words shuffleNoConsecutive must drop invalid cards before indexing .word',
);
requireIncludes(
  lessonWords,
  'const currentCard = result[i];',
  'lesson_words shuffleNoConsecutive must guard every result[i] read inside the loop',
);
requireIncludes(
  lessonWords,
  'isValidTrainingCard(currentCard)',
  'lesson_words shuffleNoConsecutive must re-check loop cards before reading .word',
);
requireIncludes(
  lessonWords,
  'deferLessonWordsStateUpdateAfterAnimation',
  'lesson_words XP animation completion must defer setState outside animation callback',
);
requireIncludes(
  lessonWords,
  'function makeFastTrainingQueueState',
  'lesson_words training must render from a small fast queue before building the full queue',
);
if (lessonWords.includes('() => makeTrainingQueueState(words, initialLearned, initialCounts, lang)')) {
  failures.push('lesson_words must not build the full training queue synchronously in initial render');
}
requireIncludes(
  lessonWords,
  'function refillTrainingQueueAfterAnswer',
  'lesson_words must refill a depleted fast queue instead of showing all-learned early',
);
requireIncludes(
  lessonWords,
  'refillTrainingQueueAfterAnswer(words, newCounts, lang)',
  'lesson_words must use the refill queue when a fast queue is depleted after an answer',
);
requireIncludes(
  lessonWords,
  'ws.learnedOf(progressMetrics.fullyLearned, progressMetrics.totalWords)',
  'lesson_words completion screen must show real learned count, not words.length/words.length unconditionally',
);
if (lessonWords.includes('if (finalQ.length === 0) {\n            setLearnedCnt(newLearned); setQueue(finalQ); setAllDone(true);')) {
  failures.push('lesson_words must not show all-learned just because the current fast queue is empty');
}

const lessonWordOptions = read('app/lesson_word_options.ts');
requireIncludes(
  lessonWordOptions,
  'const lessonWordSet = new Set',
  'lesson word option builder must use a Set for lesson membership instead of nested scans',
);

const irregular = read('app/lesson_irregular_verbs.tsx');
requireIncludes(
  irregular,
  'function normalizeIrregularOptions',
  'irregular verbs must normalize options to four visible non-empty answers',
);
requireIncludes(
  irregular,
  'const safeOptions = useMemo',
  'irregular verbs render must use normalized options, not raw options state',
);
requireIncludes(
  irregular,
  'deferIrregularStateUpdateAfterAnimation',
  'irregular verbs XP animation completion must defer setState outside animation callback',
);

const audio = read('hooks/use-audio.ts');
requireIncludes(
  audio,
  'retrySpeechWithoutVoice',
  'useAudio must retry speech without a saved voice when the selected TTS voice fails',
);
requireIncludes(
  audio,
  'safeSpeechStop',
  'useAudio must tolerate Speech.stop failures so replay audio cannot silently die',
);

const lessonBootstrap = read('app/lesson_screen_bootstrap.ts');
requireIncludes(
  lessonBootstrap,
  'new Set(value).size === value.length',
  'lesson stored phrase order must reject duplicate cells so a lesson cannot repeat one phrase forever',
);

const lessonScreen = read('app/lesson1.tsx');
requireIncludes(
  lessonScreen,
  'function isValidLessonPhraseOrder',
  'lesson screen must validate in-memory phrase order before using it',
);
requireIncludes(
  lessonScreen,
  'repairLessonPhraseOrderIfNeeded',
  'lesson screen must repair corrupted in-memory phrase order instead of falling back to phrase 1',
);
if (lessonScreen.includes('findNextDistinctLessonCell')) {
  failures.push('lesson next navigation must keep the old simple cell order; repair phraseOrder instead of skipping cells ad hoc');
}

if (failures.length) {
  console.error('Training integrity audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Training integrity audit passed.');

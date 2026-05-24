import fs from 'fs';
import path from 'path';

describe('lesson words training queue guard', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_words.tsx'), 'utf8');

  it('normalizes training queues before delayed answer transitions', () => {
    expect(source).toContain('const sanitizeTrainingQueue');
    expect(source).toContain('const newQueue = sanitizeTrainingQueue(queueRef.current);');
    expect(source).not.toContain('const newQueue = [...queue];');
  });

  it('does not read word from queue entries without a training-card guard', () => {
    expect(source).toContain('newQueue.filter(c => isTrainingCard(c) && c.word.en !== current.word.en)');
    expect(source).not.toContain('newQueue.filter(c => c.word.en');
  });

  it('marks a word learned on any correct answer', () => {
    expect(source).not.toContain('FAST_LEARN_MS');
    expect(source).not.toContain('answeredFast');
    expect(source).toContain('if (isRight) {');
    expect(source).toContain('const newCount = REQUIRED;');
    expect(source).not.toContain('const newCount = prevCount >= REQUIRED ? prevCount : REQUIRED;');
  });

  it('derives completion from the current lesson word bank, not raw storage keys', () => {
    expect(source).toContain('const scopedCounts = Object.fromEntries(');
    expect(source).toContain('const dueWords = words.filter(w => scopedCounts[w.en] < REQUIRED);');
    expect(source).toContain('learnedCnt: words.filter(w => scopedCounts[w.en] >= REQUIRED).length');
    expect(source).toContain('const newLearned = countLearnedWords(words, newCounts);');
    expect(source).not.toContain('learnedCnt + 1');
    expect(source).not.toContain('pool = notLearned.length > 0 ? notLearned : words');
  });

  it('keeps delayed answer transitions on live session refs', () => {
    expect(source).toContain('const countsRef = useRef(counts);');
    expect(source).toContain('const queueRef = useRef(queue);');
    expect(source).toContain('const qIdxRef = useRef(qIdx);');
    expect(source).toContain('const liveIndex = clampQueueIndex(qIdxRef.current, newQueue.length);');
    expect(source).not.toContain('useState(initialLearned.length)');
    expect(source).not.toContain('const prevCount = counts[wordEn] ?? 0;');
  });

  it('keeps training queue light and builds answer options lazily', () => {
    expect(source).toContain('interface TrainingQueueItem');
    expect(source).toContain('const currentItem: TrainingQueueItem | undefined');
    expect(source).toContain('currentItem ? buildCard(currentItem.word, currentItem.roundIndex, words, lang) : undefined');
    expect(source).toContain('const cards = dueWords.map(w => buildQueueItem(w, scopedCounts[w.en] ?? 0));');
    expect(source).not.toContain('const cards = dueWords.map(w => buildCard(w, scopedCounts[w.en] ?? 0, words, lang));');
  });

  it('puts wrong answers back into the queue twice', () => {
    expect(source).toContain('const firstInsert = insertTrainingCardLater(newQueue, currentNext, resetCard);');
    expect(source).toContain('const secondInsert = insertTrainingCardLater(firstInsert.queue, firstInsert.index, resetCard);');
  });

  it('uses the same scoped vocabulary progress key as the lesson menu', () => {
    expect(source).toContain('lessonWordsKey(lessonId, studyTarget)');
    expect(source).toContain('lessonWordsShardsGrantedKey(lessonId, studyTarget)');
    expect(source).toContain('AsyncStorage.getItem(storageKey)');
    expect(source).toContain('AsyncStorage.setItem(storageKey, JSON.stringify(newCounts))');
    expect(source).not.toContain("storageKey + '_words'");
    expect(source).not.toContain('`${storageKey}_words_shards_granted`');
  });

  it('keeps an app-launch cache for instant vocabulary entry', () => {
    expect(source).toContain('const lessonWordsProgressCache = new Map');
    expect(source).toContain('export async function primeAllLessonWordsFromStorageOnAppLaunch');
    expect(source).toContain('AsyncStorage.multiGet(keys)');
    expect(source).toContain('const cachedInitialCounts = lessonWordsProgressCache.get(storageKey) ?? {};');
  });

  it('waits for stored progress before mounting vocabulary training', () => {
    expect(source).toContain('const [wordProgressReady, setWordProgressReady] = useState(false);');
    expect(source).toContain('setWordProgressReady(false);');
    expect(source).toContain('setWordProgressReady(true);');
    expect(source).toContain('!wordProgressReady ? (');
    expect(source).toContain('testID="lesson-words-training-progress-loading"');
    expect(source).not.toContain('wordProgressVersion');
    expect(source).not.toContain('AsyncStorage догнал');
  });
});

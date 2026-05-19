import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import { getAllItems, getTrainerItems, getTrainerModeCounts, markReviewed as markRecallReviewed, recordMistake as recordRecallMistake, SESSION_LIMIT } from '../app/active_recall';
import {
  activateWordForTrainer,
  getTrainerDashboard,
  getTrainerPremiumItems,
  markTrainerResult,
  recordPhraseMistake,
  recordWordMistake,
  trainerTranslationForLang,
  type TrainerItem,
} from '../app/trainer_store';
import {
  consumeTrainerSessionEntry,
  getFreeSessionsLeftToday,
  reserveTrainerSessionEntry,
} from '../app/trainer_session';
import {
  compactMistakeLog,
  logMistake,
  loadMistakeLog,
  getMistakeLogDebugSnapshot,
  getTopMistakePhrases,
  clearMistakeLog,
  getWeakPhrases,
  flushMistakeLog,
  getTopMistakePhraseDetails,
} from '../app/mistake_log';
import {
  checkCoachToastNeeded,
  checkCoachToastNeededWithAnalytics,
  coachToastDecisionFromRouteParams,
  coachToastDecisionToRouteParams,
} from '../app/coach_toast_trigger';
import { getDiagnosisTraining } from '../app/diagnosis_trainings';
import {
  applyDiagnosisAnswer,
  createDiagnosisTrainingState,
  feedbackForAnswer,
  getStepDepth,
  isDiagnosisTrainingMastered,
} from '../app/diagnosis_training_engine';
import { markPersonalTrainingResolved } from '../app/diagnosis_training_progress';
import { auditPhrasePosCoverage, buildPosCoverageAuditFailure, computePhraseAnalytics, getTopCategoryForPhrases } from '../app/phrase_analytics';
import { buildAnalyticsTrainerRouteParams } from '../app/phrase_analytics_navigation';
import { normalizeWordCategory, type WordCategory } from '../app/pos_taxonomy';
import { resolveChoiceMistakeToken, resolvePhraseMistakeToken, resolveSlotMistake } from '../app/mistake_token_resolver';
import {
  buildPosDrillPlan,
  clearPosMastery,
  getPosMasterySnapshot,
  getPosDrillOptions,
  getPosWorkoutProfile,
  getStrongestWeakPos,
  makePosSlotPrompt,
  recordPosWorkoutResult,
  resolveTrainerItemPosCategory,
  USER_FACING_POS_CATEGORIES,
} from '../app/pos_workout_engine';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const NOW = Date.now();
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.multiGet as jest.Mock).mockImplementation((keys: string[]) =>
    Promise.resolve(keys.map((key) => [key, mockStorage[key] ?? null])),
  );
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { mockStorage[key] = value; });
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
    delete mockStorage[k];
    return Promise.resolve();
  });
});

// ── Helper: seed recall items ─────────────────────────────────────────────────
const MS_DAY = 24 * 60 * 60 * 1000;

const makeItem = (override: Partial<{
  phrase: string; lessonId: number; easeFactor: number; errorCount: number;
  nextDue: number; createdAt: number; repetitions: number;
}>) => ({
  phrase: override.phrase ?? 'test phrase',
  correctAnswer: 'тестовая фраза',
  lessonId: override.lessonId ?? 1,
  source: 'lesson' as const,
  errorCount: override.errorCount ?? 0,
  repetitions: override.repetitions ?? 0,
  interval: 1,
  easeFactor: override.easeFactor ?? 2.5,
  createdAt: override.createdAt ?? NOW - 10 * MS_DAY,
  lastReviewed: NOW - 5 * MS_DAY,
  nextDue: override.nextDue ?? NOW + MS_DAY,
});

const seedItems = (items: ReturnType<typeof makeItem>[]) => {
  mockStorage.active_recall_items = JSON.stringify(items);
};

const makeTrainerStoreItem = (override: Partial<TrainerItem>): TrainerItem => ({
  key: override.key ?? 'test',
  queue: override.queue ?? 'phrases',
  translationRu: override.translationRu ?? 'тест',
  translationUk: override.translationUk ?? 'тест',
  translationEs: override.translationEs,
  lessonId: override.lessonId ?? 1,
  mistakeCount: override.mistakeCount ?? 1,
  correctStreak: override.correctStreak ?? 0,
  nextDue: override.nextDue ?? NOW - 1000,
  createdAt: override.createdAt ?? NOW - MS_DAY,
  archived: override.archived ?? false,
  errorWord: override.errorWord,
  arenaQuestion: override.arenaQuestion,
  category: override.category,
  grammarTag: override.grammarTag,
});

const seedTrainerStore = (items: TrainerItem[]) => {
  mockStorage.trainer_store_v1 = JSON.stringify(items);
};

const POS_SAMPLE_DRILLS: Partial<Record<WordCategory, { phrase: string; token: string; translation?: string }>> = {
  verb: { phrase: 'She went home yesterday', token: 'went', translation: 'She went home yesterday' },
  noun: { phrase: 'The weather is nice today', token: 'weather', translation: 'Weather sentence' },
  pronoun: { phrase: 'I called her yesterday', token: 'her', translation: 'I called her yesterday' },
  adjective: { phrase: 'This room is better now', token: 'better', translation: 'This room is better now' },
  adverb: { phrase: 'She speaks quickly', token: 'quickly', translation: 'She speaks quickly' },
  modifier: { phrase: 'This coffee is too hot', token: 'too', translation: 'This coffee is too hot' },
  preposition: { phrase: 'I went to school', token: 'to', translation: 'I went to school' },
  syntax: { phrase: 'Give it to me', token: 'it to me', translation: 'Give it to me' },
  article: { phrase: 'I am a teacher', token: 'a', translation: 'I am a teacher' },
  determiner: { phrase: 'I have some time today', token: 'some', translation: 'I have some time today' },
  existential: { phrase: 'There is a book', token: 'There is', translation: 'There is a book' },
  'to-be': { phrase: 'He is ready', token: 'is', translation: 'He is ready' },
  conjunction: { phrase: 'I stayed home because it rained', token: 'because', translation: 'I stayed home because it rained' },
  modal: { phrase: 'You should rest today', token: 'should', translation: 'You should rest today' },
  phrasal_particle: { phrase: 'Please pick up the box', token: 'up', translation: 'Please pick up the box' },
};

// ── Trainer mode tests ────────────────────────────────────────────────────────
describe('trainerTranslationForLang', () => {
  it('uses Spanish source copy for Spanish UI and keeps safe fallbacks', () => {
    const item = makeTrainerStoreItem({
      translationRu: 'RU copy',
      translationUk: 'UK copy',
      translationEs: 'ES copy',
    });

    expect(trainerTranslationForLang(item, 'es')).toBe('ES copy');
    expect(trainerTranslationForLang(item, 'uk')).toBe('UK copy');
    expect(trainerTranslationForLang({ ...item, translationEs: undefined }, 'es')).toBe('RU copy');
  });
});

describe('getTrainerItems — due mode', () => {
  it('returns only items due today (nextDue ≤ end of today)', async () => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    seedItems([
      makeItem({ phrase: 'due_now', nextDue: NOW - 1000 }),
      makeItem({ phrase: 'future', nextDue: NOW + 48 * MS_DAY }),
    ]);
    const items = await getTrainerItems('due', 10);
    expect(items.map((i) => i.phrase)).toContain('due_now');
    expect(items.map((i) => i.phrase)).not.toContain('future');
  });

  it('respects session limit', async () => {
    seedItems(Array.from({ length: 20 }, (_, i) => makeItem({ phrase: `phrase_${i}`, nextDue: NOW - 1000 })));
    const items = await getTrainerItems('due', SESSION_LIMIT);
    expect(items.length).toBeLessThanOrEqual(SESSION_LIMIT);
  });
});

describe('getTrainerItems — fresh mode', () => {
  it('returns recently added items with low repetitions', async () => {
    const recent = makeItem({ phrase: 'fresh_one', createdAt: NOW - 2 * MS_DAY, repetitions: 0 });
    const old = makeItem({ phrase: 'old_one', createdAt: NOW - 30 * MS_DAY, repetitions: 0 });
    seedItems([recent, old]);
    const items = await getTrainerItems('fresh', 10);
    expect(items.map((i) => i.phrase)).toContain('fresh_one');
    expect(items.map((i) => i.phrase)).not.toContain('old_one');
  });
});

describe('getTrainerItems — weak mode', () => {
  it('returns items with easeFactor ≤ 1.7, sorted ASC', async () => {
    seedItems([
      makeItem({ phrase: 'weak_1', easeFactor: 1.3 }),
      makeItem({ phrase: 'strong', easeFactor: 2.5 }),
      makeItem({ phrase: 'weak_2', easeFactor: 1.6 }),
    ]);
    const items = await getTrainerItems('weak', 10);
    const phrases = items.map((i) => i.phrase);
    expect(phrases).toContain('weak_1');
    expect(phrases).toContain('weak_2');
    expect(phrases).not.toContain('strong');
    // Sorted ASC by easeFactor
    if (phrases.includes('weak_1') && phrases.includes('weak_2')) {
      expect(phrases.indexOf('weak_1')).toBeLessThan(phrases.indexOf('weak_2'));
    }
  });
});

describe('getTrainerItems — hard mode', () => {
  it('returns items with errorCount ≥ 3', async () => {
    seedItems([
      makeItem({ phrase: 'hard', errorCount: 5 }),
      makeItem({ phrase: 'easy', errorCount: 1 }),
    ]);
    const items = await getTrainerItems('hard', 10);
    expect(items.map((i) => i.phrase)).toContain('hard');
    expect(items.map((i) => i.phrase)).not.toContain('easy');
  });
});

describe('getTrainerItems — by_topic mode', () => {
  it('filters by lessonId', async () => {
    seedItems([
      makeItem({ phrase: 'lesson5', lessonId: 5 }),
      makeItem({ phrase: 'lesson7', lessonId: 7 }),
    ]);
    const items = await getTrainerItems('by_topic', 10, 5);
    expect(items.map((i) => i.phrase)).toContain('lesson5');
    expect(items.map((i) => i.phrase)).not.toContain('lesson7');
  });
});

describe('getTrainerModeCounts', () => {
  it('returns counts for all modes', async () => {
    seedItems([
      makeItem({ phrase: 'due_item', nextDue: NOW - 1000 }),
      makeItem({ phrase: 'fresh_item', createdAt: NOW - 1 * MS_DAY, repetitions: 0 }),
      makeItem({ phrase: 'weak_item', easeFactor: 1.4 }),
    ]);
    const counts = await getTrainerModeCounts();
    expect(counts.due).toBeGreaterThanOrEqual(1);
    expect(counts.fresh).toBeGreaterThanOrEqual(1);
    expect(typeof counts.weak).toBe('number');
    expect(typeof counts.smart_mix).toBe('number');
  });
});

describe('trainer — free session limit', () => {
  it('starts with 1 session available', async () => {
    await expect(getFreeSessionsLeftToday()).resolves.toBe(1);
  });

  it('returns 0 after session marked used today', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockStorage.trainer_free_session_v1 = JSON.stringify({ date: today, count: 1 });
    await expect(getFreeSessionsLeftToday()).resolves.toBe(0);
  });

  it('resets to 1 on a new day', async () => {
    mockStorage.trainer_free_session_v1 = JSON.stringify({ date: '2000-01-01', count: 1 });
    await expect(getFreeSessionsLeftToday()).resolves.toBe(1);
  });

  it('requires a reserved entry for non-premium direct session access', async () => {
    mockStorage.tester_no_premium = 'true';
    await expect(consumeTrainerSessionEntry('/trainer_words_session')).resolves.toBe(false);
  });

  it('does not spend the free session while only reserving navigation', async () => {
    mockStorage.tester_no_premium = 'true';
    await expect(reserveTrainerSessionEntry('/trainer_words_session', false)).resolves.toBe(true);
    await expect(getFreeSessionsLeftToday()).resolves.toBe(1);
  });

  it('consumes a reserved free entry once and marks the daily session used', async () => {
    mockStorage.tester_no_premium = 'true';
    await expect(reserveTrainerSessionEntry('/trainer_words_session', false)).resolves.toBe(true);
    await expect(getFreeSessionsLeftToday()).resolves.toBe(1);
    await expect(consumeTrainerSessionEntry('/trainer_words_session')).resolves.toBe(true);
    await expect(getFreeSessionsLeftToday()).resolves.toBe(0);
    await expect(consumeTrainerSessionEntry('/trainer_words_session')).resolves.toBe(false);
  });

  it('rejects a reserved entry for a different trainer route', async () => {
    mockStorage.tester_no_premium = 'true';
    await expect(reserveTrainerSessionEntry('/trainer_words_session', false)).resolves.toBe(true);
    await expect(consumeTrainerSessionEntry('/trainer_phrases_session')).resolves.toBe(false);
    await expect(getFreeSessionsLeftToday()).resolves.toBe(1);
  });
});

describe('trainer_store premium modes', () => {
  it('weak mode prioritizes low streak and repeated mistakes', async () => {
    seedTrainerStore([
      makeTrainerStoreItem({ key: 'stable', correctStreak: 4, mistakeCount: 1, nextDue: NOW + MS_DAY }),
      makeTrainerStoreItem({ key: 'weak_low_streak', correctStreak: 0, mistakeCount: 1, nextDue: NOW + MS_DAY }),
      makeTrainerStoreItem({ key: 'weak_repeated', correctStreak: 2, mistakeCount: 3, nextDue: NOW + MS_DAY }),
    ]);

    const items = await getTrainerPremiumItems('weak', 10);
    const keys = items.map((i) => i.key);
    expect(keys.slice(0, 2)).toEqual(expect.arrayContaining(['weak_low_streak', 'weak_repeated']));
  });

  it('weak premium mode uses POS analytics priority when no category is forced', async () => {
    seedTrainerStore([
      makeTrainerStoreItem({ key: 'run', queue: 'words', category: 'verb', mistakeCount: 2, correctStreak: 0, nextDue: NOW + MS_DAY }),
      makeTrainerStoreItem({ key: 'I am a teacher', queue: 'phrases', category: 'article', errorWord: 'a', mistakeCount: 2, correctStreak: 0, nextDue: NOW + MS_DAY }),
    ]);
    logMistake('I am a teacher', 1, 'lesson', 'wrong_pick', {
      tokenText: 'a',
      rawCategory: 'article',
    });
    await flushMistakeLog();

    const items = await getTrainerPremiumItems('weak', 2);
    expect(items[0]).toEqual(expect.objectContaining({
      key: 'I am a teacher',
      category: 'article',
    }));
  });

  it('hard mode puts high-mistake cards first', async () => {
    seedTrainerStore([
      makeTrainerStoreItem({ key: 'minor', mistakeCount: 1 }),
      makeTrainerStoreItem({ key: 'hardest', mistakeCount: 7 }),
      makeTrainerStoreItem({ key: 'hard', mistakeCount: 3 }),
    ]);

    const items = await getTrainerPremiumItems('hard', 10);
    expect(items[0]?.key).toBe('hardest');
    expect(items.map((i) => i.key)).toContain('hard');
  });

  it('smart mix combines due, weak and fresh material without duplicates', async () => {
    seedTrainerStore([
      makeTrainerStoreItem({ key: 'due_phrase', queue: 'phrases', nextDue: NOW - 1000, mistakeCount: 1 }),
      makeTrainerStoreItem({ key: 'weak_word', queue: 'words', nextDue: NOW + MS_DAY, mistakeCount: 2, correctStreak: 0 }),
      makeTrainerStoreItem({ key: 'fresh_arena', queue: 'arena', nextDue: NOW + MS_DAY, createdAt: NOW - 1000, arenaQuestion: { question: 'Q', correct: 'A', options: ['A', 'B', 'C', 'D'] } }),
    ]);

    const items = await getTrainerPremiumItems('smart_mix', 10);
    const ids = items.map((i) => `${i.queue}:${i.key}`);
    expect(ids).toContain('phrases:due_phrase');
    expect(ids).toContain('words:weak_word');
    expect(ids).toContain('arena:fresh_arena');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('dashboard exposes hardest POS category and POS mastery XP', async () => {
    seedTrainerStore([
      makeTrainerStoreItem({ key: 'I am a teacher', queue: 'phrases', errorWord: 'a', mistakeCount: 5 }),
      makeTrainerStoreItem({ key: 'run', queue: 'words', category: 'verb', mistakeCount: 2 }),
    ]);
    await recordPosWorkoutResult('article', true);

    const dashboard = await getTrainerDashboard();
    expect(dashboard.hardestCategory).toBe('article');
    expect(dashboard.hardestCategoryMistakes).toBe(5);
    expect(dashboard.posMasteryXp).toBe(16);
    expect(dashboard.posMasteryTop[0]).toEqual(expect.objectContaining({
      category: 'article',
      xp: 16,
    }));
  });

  it('dashboard hardest POS follows analytics priority before raw store totals', async () => {
    seedTrainerStore([
      makeTrainerStoreItem({ key: 'run', queue: 'words', category: 'verb', mistakeCount: 8 }),
      makeTrainerStoreItem({ key: 'I am a teacher', queue: 'phrases', category: 'article', errorWord: 'a', mistakeCount: 1 }),
    ]);
    logMistake('I am a teacher', 1, 'lesson', 'wrong_pick', {
      tokenText: 'a',
      rawCategory: 'article',
    });
    await flushMistakeLog();

    const dashboard = await getTrainerDashboard();
    expect(dashboard.hardestCategory).toBe('article');
    expect(dashboard.hardestCategoryMistakes).toBe(1);
    expect(dashboard.hardestCategoryPriority).toBeGreaterThan(0);
  });

  it('wrong smart-trainer results raise item priority', async () => {
    seedTrainerStore([
      makeTrainerStoreItem({ key: 'fragile phrase', queue: 'phrases', mistakeCount: 2, correctStreak: 3 }),
    ]);

    await markTrainerResult('fragile phrase', 'phrases', false);
    const stored = JSON.parse(mockStorage.trainer_store_v1) as TrainerItem[];
    expect(stored[0]).toEqual(expect.objectContaining({
      mistakeCount: 3,
      correctStreak: 0,
    }));
    expect(stored[0].nextDue).toBeGreaterThan(NOW);
  });

  it('stores normalized POS metadata from raw lesson categories', async () => {
    await recordWordMistake('team', 'team ru', 'team uk', 1, 'sustantivo');
    await activateWordForTrainer('team', 'team ru', 'team uk', 1, 'sustantivo');
    await recordPhraseMistake('I am a teacher', 'ru', 'uk', 1, 'a', 'articulo');

    const stored = JSON.parse(mockStorage.trainer_store_v1) as TrainerItem[];
    expect(stored.find(item => item.queue === 'words' && item.key === 'team')).toEqual(expect.objectContaining({
      category: 'noun',
      mistakeCount: 2,
    }));
    expect(stored.find(item => item.queue === 'phrases' && item.key === 'I am a teacher')).toEqual(expect.objectContaining({
      category: 'article',
      errorWord: 'a',
    }));
  });
});

describe('pos_workout_engine', () => {
  it('covers every user-facing POS category with profiles and drills', () => {
    for (const category of USER_FACING_POS_CATEGORIES) {
      const profile = getPosWorkoutProfile(category);
      const sample = POS_SAMPLE_DRILLS[category];

      expect(profile).toEqual(expect.objectContaining({ category }));
      expect(sample).toBeDefined();

      const drill = buildPosDrillPlan({
        category,
        phrase: sample!.phrase,
        token: sample!.token,
        translation: sample!.translation,
        lang: 'ru',
      });

      expect(drill).toEqual(expect.objectContaining({
        correct: sample!.token,
        drillType: profile!.drillType,
        method: expect.any(String),
        instruction: expect.any(String),
        answerLabel: expect.any(String),
      }));
      expect(drill!.options).toContain(sample!.token);
      expect(drill!.options.length).toBeGreaterThanOrEqual(2);
      expect(drill!.focusChips.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('assigns distinct workout profiles to POS categories', () => {
    expect(getPosWorkoutProfile('article')).toEqual(expect.objectContaining({
      category: 'article',
      drillType: 'slot_anchor',
    }));
    expect(getPosWorkoutProfile('verb')).toEqual(expect.objectContaining({
      category: 'verb',
      drillType: 'form_choice',
    }));
    expect(getPosWorkoutProfile('other')).toBeNull();
  });

  it('builds category-specific slot drills', () => {
    expect(makePosSlotPrompt('I am a teacher', 'a')).toBe('I am ___ teacher');
    expect(makePosSlotPrompt('They are waiting for us', 'waiting')).toBe('They are ___ for us');

    expect(getPosDrillOptions('article', 'a')).toEqual(['a', 'an', 'the', 'no article']);
    expect(getPosDrillOptions('to-be', 'is')).toEqual(['is', 'am', 'are', 'was']);
    expect(getPosDrillOptions('preposition', 'to', ['for', 'from'])).toEqual(['to', 'for', 'from', 'in']);
  });

  it('builds distinct drill plans by POS workout method', () => {
    const article = buildPosDrillPlan({
      category: 'article',
      phrase: 'I am a teacher',
      token: 'a',
      lang: 'ru',
    });
    expect(article).toEqual(expect.objectContaining({
      drillType: 'slot_anchor',
      prompt: 'I am ___ teacher',
      correct: 'a',
    }));

    const noun = buildPosDrillPlan({
      category: 'noun',
      phrase: 'The weather is nice today',
      token: 'weather',
      translation: 'Weather sentence',
      lang: 'ru',
    });
    expect(noun).toEqual(expect.objectContaining({
      drillType: 'meaning_map',
      correct: 'weather',
    }));
    expect(noun?.prompt).toContain('Weather sentence');
    expect(noun?.prompt).toContain('The ___ is nice today');

    const conjunction = buildPosDrillPlan({
      category: 'conjunction',
      phrase: 'I stayed home because it rained',
      token: 'because',
      lang: 'ru',
    });
    expect(conjunction).toEqual(expect.objectContaining({
      drillType: 'order_rebuild',
      method: 'connector_bridge',
      prompt: 'I stayed home ___ it rained',
    }));

    const verb = buildPosDrillPlan({
      category: 'verb',
      phrase: 'She went home yesterday',
      token: 'went',
      lang: 'ru',
    });
    const modal = buildPosDrillPlan({
      category: 'modal',
      phrase: 'You should rest today',
      token: 'should',
      lang: 'ru',
    });
    expect(article?.method).toBe('missing_slot');
    expect(verb?.method).toBe('form_agreement');
    expect(noun?.method).toBe('semantic_anchor');
    expect(modal?.method).toBe('rule_contrast');
    expect(new Set([
      article?.method,
      verb?.method,
      noun?.method,
      conjunction?.method,
      modal?.method,
    ]).size).toBe(5);
  });

  it('resolves trainer item POS and finds the weakest session category', () => {
    expect(resolveTrainerItemPosCategory(makeTrainerStoreItem({
      key: 'I am a teacher',
      queue: 'phrases',
      errorWord: 'a',
    }))).toBe('article');

    expect(getStrongestWeakPos([
      { category: 'article', correct: false },
      { category: 'article', correct: false },
      { category: 'verb', correct: false },
      { category: 'article', correct: true },
    ])).toBe('article');
  });

  it('records POS mastery rewards separately from trainer items', async () => {
    await clearPosMastery();
    const first = await recordPosWorkoutResult('article', false);
    const second = await recordPosWorkoutResult('article', true);
    const snapshot = await getPosMasterySnapshot();

    expect(first).toEqual(expect.objectContaining({ xpDelta: 6, leveledUp: false }));
    expect(second).toEqual(expect.objectContaining({ xpDelta: 16, leveledUp: false }));
    expect(snapshot[0]).toEqual(expect.objectContaining({
      category: 'article',
      xp: 22,
      correct: 1,
      wrong: 1,
      streak: 1,
    }));
  });

});

describe('mistake_log analytics', () => {
  beforeEach(async () => { await clearMistakeLog(); });

  it('logMistake stores entries and getTopMistakePhrases returns them', async () => {
    logMistake('pick up', 5, 'lesson', 'wrong_pick');
    logMistake('pick up', 5, 'quiz', 'wrong_pick');
    logMistake('let down', 3, 'lesson', 'wrong_pick');
    await flushMistakeLog();
    const top = await getTopMistakePhrases(5);
    const phrases = top.map((t) => t.phrase);
    expect(phrases).toContain('pick up');
    expect(top.find((t) => t.phrase === 'pick up')?.count).toBe(2);
  });

  it('getWeakPhrases filters by minCount', async () => {
    logMistake('once', 1, 'lesson', 'wrong_pick');
    logMistake('twice', 1, 'lesson', 'wrong_pick');
    logMistake('twice', 1, 'quiz', 'wrong_pick');
    await flushMistakeLog();
    const weak = await getWeakPhrases(10, 2);
    expect(weak).toContain('twice');
    expect(weak).not.toContain('once');
  });

  it('getTopMistakePhraseDetails keeps exact POS counts per phrase', async () => {
    logMistake('I am a teacher', 1, 'lesson', 'wrong_pick', {
      tokenText: 'I',
      rawCategory: 'pronoun',
    });
    logMistake('I am a teacher', 1, 'lesson', 'wrong_pick', {
      tokenText: 'a',
      rawCategory: 'article',
    });
    await flushMistakeLog();

    const details = await getTopMistakePhraseDetails(5, 1);
    const phrase = details.find((item) => item.phrase === 'I am a teacher');
    expect(phrase).toEqual(expect.objectContaining({ count: 2 }));
    expect(phrase?.categoryCounts.pronoun).toBe(1);
    expect(phrase?.categoryCounts.article).toBe(1);
    expect(phrase?.exactCategoryCounts.pronoun).toBe(1);
    expect(phrase?.exactCategoryCounts.article).toBe(1);
  });

  it('active recall mistakes mode uses exact POS before phrase-level fallback', async () => {
    seedItems([
      makeItem({ phrase: 'I am a teacher', easeFactor: 1.3, errorCount: 3 }),
    ]);
    logMistake('I am a teacher', 1, 'lesson', 'wrong_pick', {
      tokenText: 'I',
      rawCategory: 'pronoun',
    });
    await flushMistakeLog();

    const articleItems = await getTrainerItems('mistakes', 10, undefined, 'article');
    const pronounItems = await getTrainerItems('mistakes', 10, undefined, 'pronoun');

    expect(articleItems.map((item) => item.phrase)).not.toContain('I am a teacher');
    expect(pronounItems.map((item) => item.phrase)).toContain('I am a teacher');
  });

  it('active recall items persist the exact mistaken POS token', async () => {
    await recordRecallMistake(
      'I am a teacher',
      'я учитель',
      1,
      undefined,
      'lesson',
      undefined,
      { tokenText: 'a', rawCategory: 'article', tokenIndex: 2 },
    );

    const items = await getAllItems();
    expect(items[0]).toEqual(expect.objectContaining({
      phrase: 'I am a teacher',
      errorWord: 'a',
      category: 'article',
      grammarTag: 'article',
      tokenIndex: 2,
    }));
  });

  it('markReviewed updates active recall POS metadata after a repeated review miss', async () => {
    await recordRecallMistake(
      'I am a teacher',
      'я учитель',
      1,
      undefined,
      'lesson',
      undefined,
      { tokenText: 'a', rawCategory: 'article', tokenIndex: 2 },
    );

    await markRecallReviewed('I am a teacher', false, {
      tokenText: 'I',
      rawCategory: 'pronoun',
      tokenIndex: 0,
    });

    const items = await getAllItems();
    expect(items[0]).toEqual(expect.objectContaining({
      errorWord: 'I',
      category: 'pronoun',
      grammarTag: 'pronoun',
      tokenIndex: 0,
      errorCount: 2,
      repetitions: 0,
    }));
  });

  it('token-level analytics counts only the mistaken part of speech', async () => {
    logMistake('I am a teacher', 1, 'lesson', 'wrong_pick', {
      tokenText: 'a',
      expected: 'a',
      rawCategory: 'article',
    });
    await flushMistakeLog();

    const analytics = await computePhraseAnalytics();
    expect(analytics.totalMistakes).toBe(1);
    expect(analytics.categoryStats).toEqual([
      expect.objectContaining({ category: 'article', mistakeCount: 1, pct: 100 }),
    ]);
    expect(analytics.categoryStats.some((stat) => stat.category === 'pronoun')).toBe(false);
    expect(analytics.categoryStats.some((stat) => stat.category === 'to-be')).toBe(false);
  });

  it('does not spread legacy phrase-only mistakes across every POS in the phrase', async () => {
    logMistake('I am a teacher', 1, 'lesson', 'wrong_pick');
    await flushMistakeLog();

    const analytics = await computePhraseAnalytics();
    expect(analytics.totalMistakes).toBe(1);
    expect(analytics.categoryStats).toEqual([]);
    expect(getTopCategoryForPhrases(['I am a teacher'], 1)).toBeNull();
  });

  it('counts diagnostic token mistakes without rendering them as lesson zero', async () => {
    logMistake('She is a teacher', 0, 'diagnostic', 'wrong_pick', {
      tokenText: 'is',
      expected: 'is',
      rawCategory: 'To Be',
    });
    await flushMistakeLog();

    const analytics = await computePhraseAnalytics();
    expect(analytics.totalMistakes).toBe(1);
    expect(analytics.lessonStats).toEqual([]);
    expect(analytics.categoryStats).toEqual([
      expect.objectContaining({ category: 'to-be', mistakeCount: 1, pct: 100 }),
    ]);
  });

  it('counts coach exercise misses as POS analytics without lesson zero noise', async () => {
    logMistake('The meeting is on Monday.', 0, 'coach', 'wrong_pick', {
      tokenText: 'on',
      expected: 'on',
      picked: 'in',
      rawCategory: 'preposition',
      category: 'preposition',
    });
    await flushMistakeLog();

    const analytics = await computePhraseAnalytics();
    expect(analytics.totalMistakes).toBe(1);
    expect(analytics.lessonStats).toEqual([]);
    expect(analytics.categoryStats).toEqual([
      expect.objectContaining({ category: 'preposition', mistakeCount: 1, pct: 100 }),
    ]);
  });

  it('exposes a debug snapshot for token-level POS events', async () => {
    logMistake('I booked a hotel', 1, 'lesson', 'wrong_pick', {
      tokenText: 'a',
      expected: 'a',
      picked: 'the',
      rawCategory: 'article',
    });
    logMistake('Legacy only phrase', 1, 'lesson', 'wrong_pick');
    await flushMistakeLog();

    const debug = await getMistakeLogDebugSnapshot(5);
    expect(debug.total).toBe(2);
    expect(debug.exact).toBe(1);
    expect(debug.legacy).toBe(1);
    expect(debug.unresolved).toBe(1);
    expect(debug.exactCoveragePct).toBe(50);
    expect(debug.byMode).toEqual([expect.objectContaining({ mode: 'lesson', count: 2 })]);
    expect(debug.byCategory).toEqual([expect.objectContaining({ category: 'article', count: 1 })]);
    expect(debug.bySource).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'stored', count: 1 }),
      expect.objectContaining({ source: 'unknown', count: 1 }),
    ]));
    expect(debug.events[0]).toEqual(expect.objectContaining({
      phrase: expect.any(String),
      mode: 'lesson',
      exactSignal: expect.any(Boolean),
      categorySource: expect.any(String),
      confidence: expect.any(Number),
      ageDays: expect.any(Number),
    }));
    expect(debug.events.some((event) => event.tokenText === 'a' && event.resolvedCategory === 'article')).toBe(true);
  });

  it('lowers analytics priority after successful POS practice', async () => {
    logMistake('I am a teacher', 1, 'lesson', 'wrong_pick', {
      tokenText: 'a',
      expected: 'a',
      rawCategory: 'article',
    });
    await flushMistakeLog();

    const before = await computePhraseAnalytics();
    const beforeArticle = before.categoryStats.find((stat) => stat.category === 'article');
    expect(beforeArticle).toEqual(expect.objectContaining({
      weaknessScore: expect.any(Number),
      priorityScore: expect.any(Number),
      recoveryScore: 0,
      masteryXp: 0,
    }));
    expect(beforeArticle?.priorityScore).toBe(beforeArticle?.weaknessScore);

    await recordPosWorkoutResult('article', true);
    await recordPosWorkoutResult('article', true);
    await recordPosWorkoutResult('article', true);

    const after = await computePhraseAnalytics();
    const afterArticle = after.categoryStats.find((stat) => stat.category === 'article');
    expect(afterArticle).toEqual(expect.objectContaining({
      masteryXp: 48,
      masteryStreak: 3,
      practiceCorrect: 3,
      recoveryScore: expect.any(Number),
    }));
    expect(afterArticle?.recoveryScore).toBeGreaterThan(0);
    expect(afterArticle?.priorityScore).toBeLessThan(afterArticle?.weaknessScore ?? 0);
  });

  it('hides resolved personal training mistakes until the user misses that category again', async () => {
    logMistake('I am a teacher', 1, 'lesson', 'wrong_pick', {
      tokenText: 'a',
      expected: 'a',
      rawCategory: 'article',
    });
    await flushMistakeLog();

    const before = await computePhraseAnalytics();
    expect(before.totalMistakes).toBe(1);
    expect(before.categoryStats).toEqual([
      expect.objectContaining({ category: 'article', mistakeCount: 1 }),
    ]);
    expect(before.lessonStats).toEqual([
      expect.objectContaining({ lessonId: 1 }),
    ]);
    expect(before.topMistakePhrases).toEqual([
      expect.objectContaining({ phrase: 'i am a teacher' }),
    ]);

    await markPersonalTrainingResolved({ category: 'article' });

    const resolved = await computePhraseAnalytics();
    expect(resolved.totalMistakes).toBe(0);
    expect(resolved.categoryStats).toEqual([]);
    expect(resolved.lessonStats).toEqual([]);
    expect(resolved.topMistakePhrases).toEqual([]);

    await new Promise((resolve) => setTimeout(resolve, 5));
    logMistake('He bought a car', 7, 'lesson', 'wrong_pick', {
      tokenText: 'a',
      expected: 'a',
      picked: 'an',
      rawCategory: 'article',
      category: 'article',
    });
    await flushMistakeLog();

    const reopened = await computePhraseAnalytics();
    expect(reopened.totalMistakes).toBe(1);
    expect(reopened.categoryStats).toEqual([
      expect.objectContaining({ category: 'article', mistakeCount: 1 }),
    ]);
    expect(reopened.lessonStats).toEqual([
      expect.objectContaining({ lessonId: 7 }),
    ]);
    expect(reopened.topMistakePhrases).toEqual([
      expect.objectContaining({ phrase: 'he bought a car' }),
    ]);
  });

  it('does not expose other as a user-facing analytics category', async () => {
    logMistake('Unknown training fragment', 1, 'lesson', 'wrong_pick', {
      tokenText: '???',
      rawCategory: 'punctuation',
    });
    await flushMistakeLog();

    const analytics = await computePhraseAnalytics();
    expect(analytics.categoryStats.some((stat) => stat.category === 'other')).toBe(false);
    expect(getTopCategoryForPhrases([
      { phrase: 'Unknown training fragment', tokenText: '???', rawCategory: 'punctuation' },
    ])).toBeNull();
  });

  it('normalizes localized grammar topic labels into stable POS categories', () => {
    expect(normalizeWordCategory('Present Simple — утверждение', 'She speaks French.').category).toBe('verb');
    expect(normalizeWordCategory('Отрицание To Be', 'I am not ready.').category).toBe('to-be');
    expect(normalizeWordCategory('Preposiciones de tiempo', 'at').category).toBe('preposition');
    expect(normalizeWordCategory('demonstrative', 'this').category).toBe('determiner');
    expect(normalizeWordCategory('existential there is', 'There is').category).toBe('existential');
  });

  it('toast category trigger can use exact token-level mistakes', () => {
    const top = getTopCategoryForPhrases([
      { phrase: 'I am a teacher', tokenText: 'a', rawCategory: 'article' },
      { phrase: 'You are a doctor', tokenText: 'a', rawCategory: 'article' },
      { phrase: 'He is an engineer', tokenText: 'an', rawCategory: 'article' },
    ], 3);
    expect(top).toEqual(expect.objectContaining({
      category: 'article',
      count: 3,
      exactCount: 3,
    }));
    expect(top?.weaknessScore).toBeGreaterThanOrEqual(70);
  });

  it('coach toast waits for three exact mistakes before diagnosing a POS pattern', () => {
    expect(checkCoachToastNeeded([
      { phrase: 'I am a teacher', tokenText: 'a', rawCategory: 'article' },
      { phrase: 'You are a doctor', tokenText: 'a', rawCategory: 'article' },
    ]).show).toBe(false);

    const exactDecision = checkCoachToastNeeded([
      { phrase: 'I am a teacher', tokenText: 'a', rawCategory: 'article' },
      { phrase: 'You are a doctor', tokenText: 'a', rawCategory: 'article' },
      { phrase: 'He is an engineer', tokenText: 'an', rawCategory: 'article' },
    ]);

    expect(exactDecision).toEqual(expect.objectContaining({
      show: true,
      category: 'article',
      mistakeCount: 3,
      microDiagnosisId: 'article_a_an',
      diagnosisEvidenceCount: 3,
    }));
    if (exactDecision.show) {
      expect(exactDecision.weaknessScore).toBeGreaterThanOrEqual(70);
      expect(exactDecision.microLabelRu).toContain('a/an');
    }

    expect(checkCoachToastNeeded(['I am a teacher', 'You are a doctor']).show).toBe(false);
    expect(checkCoachToastNeeded(['It costs a dollar', 'They drive a car', 'We order a taxi']).show).toBe(false);
  });

  it('coach toast does not turn phrase-only context into a mixed diagnosis', () => {
    expect(checkCoachToastNeeded([
      { phrase: 'I wake up at 7', tokenText: 'at', rawCategory: 'preposition' },
      'She was born on Monday',
      'He was born in 1990',
    ]).show).toBe(false);

    const decision = checkCoachToastNeeded([
      { phrase: 'I wake up at 7', tokenText: 'at', rawCategory: 'preposition' },
      'She was born on Monday',
      'He was born in 1990',
      'We meet at night',
    ]);

    expect(decision.show).toBe(false);
  });

  it('keeps coach toast payload intact across lesson completion route params', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I am a teacher', tokenText: 'a', rawCategory: 'article' },
      { phrase: 'You are a doctor', tokenText: 'a', rawCategory: 'article' },
      { phrase: 'He is an engineer', tokenText: 'an', rawCategory: 'article' },
    ]);

    const restored = coachToastDecisionFromRouteParams(coachToastDecisionToRouteParams(decision));

    expect(restored).toEqual(expect.objectContaining({
      show: true,
      category: 'article',
      mistakeCount: 3,
      weaknessScore: expect.any(Number),
      focusWords: expect.arrayContaining(['a', 'an']),
      microDiagnosisId: 'article_a_an',
      microLabelRu: expect.stringContaining('a/an'),
      diagnosisEvidenceCount: 3,
    }));
  });

  it('coach toast can use persistent analytics priority after three exact stored mistakes', async () => {
    logMistake('I am a teacher', 1, 'lesson', 'wrong_pick', {
      tokenText: 'a',
      rawCategory: 'article',
    });
    logMistake('You are a doctor', 1, 'lesson', 'wrong_pick', {
      tokenText: 'a',
      rawCategory: 'article',
    });
    logMistake('He is an engineer', 1, 'lesson', 'wrong_pick', {
      tokenText: 'an',
      rawCategory: 'article',
    });
    await flushMistakeLog();

    const syncDecision = checkCoachToastNeeded([
      { phrase: 'I am a teacher', tokenText: 'a', rawCategory: 'article' },
    ]);
    const analyticsDecision = await checkCoachToastNeededWithAnalytics([
      { phrase: 'I am a teacher', tokenText: 'a', rawCategory: 'article' },
    ]);

    expect(syncDecision.show).toBe(false);
    expect(analyticsDecision).toEqual(expect.objectContaining({
      show: true,
      category: 'article',
      priorityScore: expect.any(Number),
      focusWords: expect.arrayContaining(['a']),
      microDiagnosisId: 'article_a_an',
    }));
  });

  it('diagnoses Present Simple question and negative mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'Does she work here?', tokenText: 'does', picked: 'do', rawCategory: 'Present Simple question', category: 'verb' },
      { phrase: 'She does not drink coffee.', tokenText: 'drink', picked: 'drinks', rawCategory: 'Present Simple negative', category: 'verb' },
      { phrase: 'What does she do?', tokenText: 'do', picked: 'does', rawCategory: 'Present Simple question', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'verb_present_simple_negative_question',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses third-person Present Simple statement mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'She works at home.', tokenText: 'works', picked: 'work', rawCategory: 'third person singular', category: 'verb' },
      { phrase: 'He goes to the gym.', tokenText: 'goes', picked: 'go', rawCategory: 'third person singular', category: 'verb' },
      { phrase: 'My daughter studies English.', tokenText: 'studies', picked: 'study', rawCategory: 'verb agreement', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'verb_third_person',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses Present Simple statement habits and facts as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I work every day.', tokenText: 'work', picked: 'am work', rawCategory: 'Present Simple statement habit be plus base', category: 'verb' },
      { phrase: 'They live in Dublin.', tokenText: 'live', picked: 'lives', rawCategory: 'Present Simple statement stable fact', category: 'verb' },
      { phrase: 'The shop opens at 9.', tokenText: 'opens', picked: 'open', rawCategory: 'Present Simple statement schedule', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'verb_present_simple_statement',
    }));
    expect((decision as any).diagnosisEvidenceCount).toBeGreaterThanOrEqual(2);
  });

  it('diagnoses Present Continuous be + -ing mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I am working now.', tokenText: 'am working', picked: 'working', rawCategory: 'Present Continuous missing be before ing', category: 'verb' },
      { phrase: 'She is studying at the moment.', tokenText: 'is studying', picked: 'studies', rawCategory: 'Present Continuous at the moment', category: 'verb' },
      { phrase: 'Are you working now?', tokenText: 'Are', picked: 'Do', rawCategory: 'Present Continuous question now', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'verb_present_continuous_basic',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses Present Simple vs Continuous contrast mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I work every day / I am working now', tokenText: 'work', picked: 'am working', rawCategory: 'Present Simple vs Continuous habit vs now', category: 'verb' },
      { phrase: 'She usually studies, but she is studying right now.', tokenText: 'studies', picked: 'is studying', rawCategory: 'Simple vs Continuous usually vs now', category: 'verb' },
      { phrase: 'He usually works at night, but he is sleeping now.', tokenText: 'is sleeping', picked: 'sleeps', rawCategory: 'tense contrast simple continuous', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'verb_present_simple_vs_continuous',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses Past Simple regular and irregular mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I worked yesterday.', tokenText: 'worked', picked: 'work', rawCategory: 'Past Simple regular past marker', category: 'verb' },
      { phrase: 'They went home after work.', tokenText: 'went', picked: 'goed', rawCategory: 'Past Simple irregular past', category: 'verb' },
      { phrase: 'Yesterday, I went to the shop.', tokenText: 'went', picked: 'go', rawCategory: 'Past Simple yesterday', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'verb_past_simple_regular_irregular',
      diagnosisEvidenceCount: 3,
    }));
  });

  it("diagnoses Past Simple did/didn't question and negative mistakes as a specific verb training", () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'Did you go home yesterday?', tokenText: 'go', picked: 'went', rawCategory: 'Past Simple negative question did plus past', category: 'verb' },
      { phrase: "I didn't buy anything.", tokenText: 'buy', picked: 'bought', rawCategory: 'past_simple_negative_question didnt_plus_past', category: 'verb' },
      { phrase: 'What did you buy?', tokenText: 'did', picked: 'do', rawCategory: 'question word no did do instead of did', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'verb_past_simple_negative_question',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses Present Perfect mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I have seen this film.', tokenText: 'seen', picked: 'saw', rawCategory: 'present perfect have plus past simple irregular error', category: 'verb' },
      { phrase: 'She has finished the lesson.', tokenText: 'has', picked: 'have', rawCategory: 'present_perfect have_has_agreement', category: 'verb' },
      { phrase: "I haven't finished the task yet.", tokenText: 'yet', picked: 'already', rawCategory: 'present perfect already yet confusion', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'verb_present_perfect_basic',
    }));
    expect((decision as any).diagnosisEvidenceCount).toBeGreaterThanOrEqual(2);
  });

  it('diagnoses Present Perfect vs Past Simple contrast mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I have seen him yesterday.', tokenText: 'have seen', picked: 'saw', rawCategory: 'present perfect vs past simple present perfect with finished time', category: 'verb' },
      { phrase: 'Have you ever tried sushi?', tokenText: 'Have', picked: 'Did', rawCategory: 'past simple instead of experience ever', category: 'verb' },
      { phrase: 'I have lost my keys. I cannot find them.', tokenText: 'have lost', picked: 'lost', rawCategory: 'past simple instead of result now', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'present_perfect_vs_past_simple',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses Present Perfect question and negative mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'Have you finished the lesson?', tokenText: 'Have', picked: 'Did', rawCategory: 'present perfect question did instead of have', category: 'verb' },
      { phrase: "She hasn't seen the message.", tokenText: 'seen', picked: 'see', rawCategory: 'present_perfect_negative haven_t_plus_base', category: 'verb' },
      { phrase: 'Have you ever been there?', tokenText: 'ever', picked: 'yet', rawCategory: 'present perfect questions negatives ever question', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'present_perfect_questions_negatives',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses Present Perfect for/since mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I have lived here for three years.', tokenText: 'for', picked: 'since', rawCategory: 'present perfect for since since duration error', category: 'verb' },
      { phrase: 'I have lived here since 2021.', tokenText: 'since', picked: 'for', rawCategory: 'for_starting_point present_perfect_for_since', category: 'verb' },
      { phrase: 'How long have you lived here?', tokenText: 'have', picked: 'did', rawCategory: 'how long continuing situation present perfect for since', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'present_perfect_for_since',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses Past Continuous mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I was working at 8 yesterday.', tokenText: 'was working', picked: 'working', rawCategory: 'past continuous missing be at 8 yesterday', category: 'verb' },
      { phrase: 'They were waiting outside.', tokenText: 'were waiting', picked: 'they waiting', rawCategory: 'past_continuous missing_was_were', category: 'verb' },
      { phrase: 'She was sleeping.', tokenText: 'sleeping', picked: 'sleep', rawCategory: 'past continuous was_were_plus_base', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'past_continuous_basic',
    }));
    expect((decision as any).diagnosisEvidenceCount).toBeGreaterThanOrEqual(2);
  });

  it('diagnoses Past Simple vs Past Continuous contrast mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I was working at 8 yesterday.', tokenText: 'was working', picked: 'worked', rawCategory: 'past_simple_vs_past_continuous at 8 yesterday process vs fact', category: 'verb' },
      { phrase: 'She was sleeping when I called.', tokenText: 'was sleeping', picked: 'slept', rawCategory: 'background action when interrupted action confusion', category: 'verb' },
      { phrase: 'The phone rang while I was sleeping.', tokenText: 'rang', picked: 'was ringing', rawCategory: 'past continuous instead of past simple short event while background', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'past_simple_vs_past_continuous',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses used to mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I used to smoke.', tokenText: 'used to', picked: 'use to', rawCategory: 'used_to_basic past habit not true now', category: 'verb' },
      { phrase: "I didn't use to like coffee.", tokenText: 'use to', picked: 'used to', rawCategory: "didnt_used_to didn't use to error", category: 'verb' },
      { phrase: 'I am used to working at night.', tokenText: 'am used to working', picked: 'used to work', rawCategory: 'be_used_to_confusion accustomed used to plus ing', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'used_to_basic',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses future Present Continuous arrangements as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I am meeting John tomorrow.', tokenText: 'am meeting', picked: 'meet', rawCategory: 'future_present_continuous_arrangements tomorrow arrangement', category: 'verb' },
      { phrase: 'We are having dinner tonight.', tokenText: 'are having', picked: 'having', rawCategory: 'missing_be_future_arrangement future marker tonight', category: 'verb' },
      { phrase: 'I am seeing my doctor at 3 tomorrow.', tokenText: 'am seeing', picked: 'will see', rawCategory: 'will_instead_of_arrangement arranged plan at 3 tomorrow', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'future_present_continuous_arrangements',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses was/were past be mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I was tired yesterday.', tokenText: 'was', picked: 'were', rawCategory: 'was were subject agreement past be', category: 'verb' },
      { phrase: 'They were busy yesterday.', tokenText: 'were', picked: 'was', rawCategory: 'past be was were plural subject', category: 'verb' },
      { phrase: 'She was at home last night.', tokenText: 'was', picked: 'is', rawCategory: 'present be with past marker was were', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'verb_was_were',
    }));
    expect((decision as any).diagnosisEvidenceCount).toBeGreaterThanOrEqual(2);
  });

  it('diagnoses future will/going to mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: "Don't worry. I will help you.", tokenText: 'will', picked: 'will to', rawCategory: 'future will promise will to error', category: 'verb' },
      { phrase: 'I am going to study tonight.', tokenText: 'am going to', picked: 'going to', rawCategory: 'future going to missing be plan', category: 'verb' },
      { phrase: 'Look at the clouds. It is going to rain.', tokenText: 'is going to', picked: 'will', rawCategory: 'future evidence going to prediction vs evidence', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'future_will_going_to',
    }));
    expect((decision as any).diagnosisEvidenceCount).toBeGreaterThanOrEqual(2);
  });

  it('diagnoses infinitive vs gerund mistakes as a specific verb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I want to learn English.', tokenText: 'to learn', picked: 'learning', rawCategory: 'infinitive vs gerund want gerund error', category: 'verb' },
      { phrase: 'I enjoy learning new words.', tokenText: 'learning', picked: 'to learn', rawCategory: 'gerund infinitive enjoy to error', category: 'verb' },
      { phrase: 'Avoid making the same mistake.', tokenText: 'making', picked: 'to make', rawCategory: 'verb-ing avoid to required verb pattern', category: 'verb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'verb',
      microDiagnosisId: 'infinitive_vs_gerund_basic',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('routes past to-be was/were signals away from the broad to-be fallback', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I was tired yesterday.', tokenText: 'was', picked: 'were', rawCategory: 'past to be was were', category: 'to-be' },
      { phrase: 'They were busy yesterday.', tokenText: 'were', picked: 'was', rawCategory: 'past to be plural', category: 'to-be' },
      { phrase: 'He was late yesterday.', tokenText: 'was', picked: 'is', rawCategory: 'past to be present be with past marker', category: 'to-be' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'to-be',
      microDiagnosisId: 'verb_was_were',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses present to-be agreement mistakes as a specific training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I am ready.', tokenText: 'am', picked: 'is', rawCategory: 'to be present adjective', category: 'to-be' },
      { phrase: 'She is tired.', tokenText: 'is', picked: 'are', rawCategory: 'to be present adjective', category: 'to-be' },
      { phrase: 'They are at home.', tokenText: 'are', picked: 'is', rawCategory: 'to be present place', category: 'to-be' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'to-be',
      microDiagnosisId: 'to_be_present_agreement',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses modal base-form mistakes as a specific modal training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'They will visit us.', tokenText: 'visit', picked: 'to visit', rawCategory: 'modal base form after modal', category: 'modal' },
      { phrase: 'I would help you.', tokenText: 'help', picked: 'helps', rawCategory: 'modal base form', category: 'modal' },
      { phrase: 'We shall start now.', tokenText: 'start', picked: 'started', rawCategory: 'after modal structure', category: 'modal' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'modal',
      microDiagnosisId: 'modal_base_form',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses should/must/have to mistakes as a specific modal training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'You should rest.', tokenText: 'should', picked: 'must', rawCategory: 'modal_should_must_have_to should advice', category: 'modal' },
      { phrase: "You don't have to come.", tokenText: "don't have to", picked: "mustn't", rawCategory: "dont_have_to_mustnt_confusion no obligation", category: 'modal' },
      { phrase: 'She has to leave early.', tokenText: 'has to', picked: 'have to', rawCategory: 'have_to_agreement has to', category: 'modal' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'modal',
      microDiagnosisId: 'modal_should_must_have_to',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses can/could ability and request mistakes as a specific modal training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I can speak English.', tokenText: 'can', picked: 'could', rawCategory: 'modal_can_could_ability_request present ability', category: 'modal' },
      { phrase: 'I could swim when I was a child.', tokenText: 'could', picked: 'can', rawCategory: 'can_for_past_ability past ability', category: 'modal' },
      { phrase: 'Could you help me?', tokenText: 'help', picked: 'to help', rawCategory: 'could_to_error polite request', category: 'modal' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'modal',
      microDiagnosisId: 'modal_can_could_ability_request',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses may/might probability mistakes as a specific modal training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'It may rain tomorrow.', tokenText: 'may', picked: 'can', rawCategory: 'modal_may_might_probability can_probability_confusion', category: 'modal' },
      { phrase: 'She may know the answer.', tokenText: 'know', picked: 'knows', rawCategory: 'may probability modal_plus_s_error', category: 'modal' },
      { phrase: 'It might not work.', tokenText: 'might not', picked: "doesn't might", rawCategory: 'might_not do_with_modal_error', category: 'modal' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'modal',
      microDiagnosisId: 'modal_may_might_probability',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses subject/object pronoun case mistakes as a specific pronoun training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I called him yesterday.', tokenText: 'I', picked: 'Me', rawCategory: 'pronoun case subject object', category: 'pronoun' },
      { phrase: 'He called me yesterday.', tokenText: 'me', picked: 'I', rawCategory: 'pronoun case after verb', category: 'pronoun' },
      { phrase: 'This message is for me.', tokenText: 'me', picked: 'I', rawCategory: 'pronoun case after preposition', category: 'pronoun' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'pronoun',
      microDiagnosisId: 'pronoun_case',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses possessive pronoun mistakes as a specific pronoun training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'This is my phone.', tokenText: 'my', picked: 'mine', rawCategory: 'possessive determiner before noun', category: 'pronoun' },
      { phrase: 'This phone is mine.', tokenText: 'mine', picked: 'my', rawCategory: 'possessive pronoun standalone', category: 'pronoun' },
      { phrase: "The dog lost its toy.", tokenText: 'its', picked: "it's", rawCategory: 'possessive its apostrophe', category: 'pronoun' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'pronoun',
      microDiagnosisId: 'pronoun_possessive',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses adjective comparison mistakes as a specific adjective training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'This bag is cheaper than mine.', tokenText: 'cheaper', picked: 'more cheaper', rawCategory: 'comparative adjective', category: 'adjective' },
      { phrase: 'This hotel is more expensive than the last one.', tokenText: 'more expensive', picked: 'expensiver', rawCategory: 'comparative adjective', category: 'adjective' },
      { phrase: 'This option is better than the other one.', tokenText: 'better', picked: 'gooder', rawCategory: 'irregular comparative', category: 'adjective' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'adjective',
      microDiagnosisId: 'adjective_comparison',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses adjective/adverb form mistakes as a specific adverb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'She teaches very well.', tokenText: 'well', picked: 'good', rawCategory: 'adverb manner adjective vs adverb', category: 'adverb' },
      { phrase: 'He answered very quickly.', tokenText: 'quickly', picked: 'quick', rawCategory: 'adverb manner adjective vs adverb', category: 'adverb' },
      { phrase: 'This sounds strange.', tokenText: 'strange', picked: 'strangely', rawCategory: 'linking verb adjective', category: 'adverb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'adverb',
      microDiagnosisId: 'adjective_vs_adverb',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses frequency adverb position mistakes as a specific adverb training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I always drink coffee.', tokenText: 'always', picked: 'drink always', rawCategory: 'frequency adverb position', category: 'adverb' },
      { phrase: 'She is always late.', tokenText: 'always', picked: 'always is', rawCategory: 'frequency adverb position', category: 'adverb' },
      { phrase: 'I have never seen it.', tokenText: 'never', picked: "don't never", rawCategory: 'frequency adverb position', category: 'adverb' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'adverb',
      microDiagnosisId: 'adverb_frequency_position',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses too/enough modifier mistakes as a specific modifier training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'This coffee is too hot.', tokenText: 'too', picked: 'enough', rawCategory: 'modifier too enough meaning confusion', category: 'modifier' },
      { phrase: 'This answer is good enough.', tokenText: 'good enough', picked: 'enough good', rawCategory: 'modifier enough before adjective', category: 'modifier' },
      { phrase: 'There are too many people here.', tokenText: 'too many', picked: 'too much', rawCategory: 'modifier too much many plural countable', category: 'modifier' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'modifier',
      microDiagnosisId: 'too_enough',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses very/really/quite modifier mistakes as a specific modifier training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'This lesson is very useful.', tokenText: 'very', picked: 'very much', rawCategory: 'modifier very really quite intensifier position', category: 'modifier' },
      { phrase: 'I am really tired.', tokenText: 'really', picked: 'really much', rawCategory: 'modifier really position emotional strength', category: 'modifier' },
      { phrase: 'The lesson was quite good.', tokenText: 'quite', picked: 'too', rawCategory: 'modifier quite meaning moderate strength', category: 'modifier' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'modifier',
      microDiagnosisId: 'modifier_very_really_quite',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses conjunction logic mistakes as a specific conjunction training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I was tired, but I kept working.', tokenText: 'but', picked: 'because', rawCategory: 'connector contrast', category: 'conjunction' },
      { phrase: 'I stayed home because I was sick.', tokenText: 'because', picked: 'so', rawCategory: 'connector cause', category: 'conjunction' },
      { phrase: 'If it rains, we will stay inside.', tokenText: 'if', picked: 'when', rawCategory: 'connector condition', category: 'conjunction' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'conjunction',
      microDiagnosisId: 'conjunction_logic',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses some/any quantifier mistakes as a specific determiner training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I have some free time.', tokenText: 'some', picked: 'any', rawCategory: 'quantifier positive statement', category: 'determiner' },
      { phrase: "I don't have any money.", tokenText: 'any', picked: 'some', rawCategory: 'quantifier negative', category: 'determiner' },
      { phrase: 'Would you like some coffee?', tokenText: 'some', picked: 'any', rawCategory: 'quantifier offer', category: 'determiner' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'determiner',
      microDiagnosisId: 'quantifier_some_any',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses this/that/these/those mistakes as a specific determiner training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'This book is useful.', tokenText: 'This', picked: 'These', rawCategory: 'demonstrative determiner singular near', category: 'determiner' },
      { phrase: 'These books are useful.', tokenText: 'These', picked: 'This', rawCategory: 'demonstrative determiner plural near', category: 'determiner' },
      { phrase: 'Those shoes are expensive.', tokenText: 'Those', picked: 'That', rawCategory: 'demonstrative determiner plural far', category: 'determiner' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'determiner',
      microDiagnosisId: 'determiner_this_that_these_those',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses there is/there are mistakes as a specific existential training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'There is a book on the table.', tokenText: 'There is', picked: 'There are', rawCategory: 'existential singular there is', category: 'existential' },
      { phrase: 'There are two chairs in the room.', tokenText: 'There are', picked: 'There is', rawCategory: 'existential plural there are', category: 'existential' },
      { phrase: 'Are there any questions?', tokenText: 'Are there', picked: 'Is there', rawCategory: 'existential question plural', category: 'existential' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'existential',
      microDiagnosisId: 'there_is_are',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses singular/plural noun mistakes as a specific noun training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I have two books.', tokenText: 'books', picked: 'book', rawCategory: 'noun plural number after two', category: 'noun' },
      { phrase: 'There are many questions.', tokenText: 'questions', picked: 'question', rawCategory: 'noun plural after many', category: 'noun' },
      { phrase: 'I need information.', tokenText: 'information', picked: 'informations', rawCategory: 'noun uncountable plural error', category: 'noun' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'noun',
      microDiagnosisId: 'noun_singular_plural_basic',
      diagnosisEvidenceCount: 3,
    }));
  });

  it("diagnoses possessive apostrophe noun mistakes as a specific noun training", () => {
    const decision = checkCoachToastNeeded([
      { phrase: "This is John's phone.", tokenText: "John's", picked: 'John', rawCategory: 'noun possessive apostrophe s missing apostrophe', category: 'noun' },
      { phrase: "The students' answers were correct.", tokenText: "students'", picked: "student's", rawCategory: 'noun plural possessive apostrophe position', category: 'noun' },
      { phrase: "The children's toys are everywhere.", tokenText: "children's", picked: "childrens'", rawCategory: 'noun irregular plural possessive', category: 'noun' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'noun',
      microDiagnosisId: 'noun_possessive_apostrophe_s',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses in/on/at time mistakes as a specific preposition time training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'The lesson starts at 8.', tokenText: 'at', picked: 'in', rawCategory: 'preposition time', category: 'preposition' },
      { phrase: 'I will call you on Monday.', tokenText: 'on', picked: 'in', rawCategory: 'preposition time', category: 'preposition' },
      { phrase: 'She was born in 1998.', tokenText: 'in', picked: 'at', rawCategory: 'preposition time', category: 'preposition' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'preposition',
      microDiagnosisId: 'preposition_time_in_on_at',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses in/on/at place mistakes as a specific preposition place training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'She is in the room.', tokenText: 'in', picked: 'at', rawCategory: 'preposition place', category: 'preposition' },
      { phrase: 'The keys are on the table.', tokenText: 'on', picked: 'in', rawCategory: 'preposition place', category: 'preposition' },
      { phrase: 'Meet me at the station.', tokenText: 'at', picked: 'in', rawCategory: 'preposition place', category: 'preposition' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'preposition',
      microDiagnosisId: 'preposition_place_in_on_at',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses combined in/on/at time-place mistakes as a specific preposition training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I am in the room.', tokenText: 'in', picked: 'on', rawCategory: 'preposition_time_place on_with_enclosed_place_error', category: 'preposition' },
      { phrase: 'I work on Monday.', tokenText: 'on', picked: 'in', rawCategory: 'preposition_time_place in_with_day_error', category: 'preposition' },
      { phrase: 'The meeting starts at 8.', tokenText: 'at', picked: 'on', rawCategory: 'preposition_time_place on_with_exact_time_error', category: 'preposition' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'preposition',
      microDiagnosisId: 'preposition_time_place',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses for/since duration mistakes as a specific preposition duration training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I have lived here for three years.', tokenText: 'for', picked: 'since', rawCategory: 'preposition duration', category: 'preposition' },
      { phrase: 'I have lived here since 2021.', tokenText: 'since', picked: 'for', rawCategory: 'preposition duration', category: 'preposition' },
      { phrase: 'We waited for two hours.', tokenText: 'for', picked: 'during', rawCategory: 'preposition duration', category: 'preposition' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'preposition',
      microDiagnosisId: 'preposition_duration_for_since',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses to/into/from/out of mistakes as a specific preposition direction training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'She walked into the room.', tokenText: 'into', picked: 'to', rawCategory: 'preposition direction movement into', category: 'preposition' },
      { phrase: 'He came from work late.', tokenText: 'from', picked: 'to', rawCategory: 'preposition source movement', category: 'preposition' },
      { phrase: 'Take it out of the bag.', tokenText: 'out of', picked: 'from', rawCategory: 'preposition outside movement from inside', category: 'preposition' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'preposition',
      microDiagnosisId: 'preposition_direction_to_into_from',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses broad direction-preposition mistakes as the direction bucket training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I came home late.', tokenText: 'home', picked: 'to home', rawCategory: 'preposition direction to_home_error', category: 'preposition' },
      { phrase: 'Put the phone onto the table.', tokenText: 'onto', picked: 'on', rawCategory: 'preposition direction onto_on_confusion', category: 'preposition' },
      { phrase: 'Get out of the car.', tokenText: 'out of', picked: 'out from', rawCategory: 'preposition direction out_from_error', category: 'preposition' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'preposition',
      microDiagnosisId: 'preposition_direction',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses common verb + preposition mistakes as a specific preposition training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I listen to music every day.', tokenText: 'to', picked: '-', rawCategory: 'preposition fixed verb pattern listen to', category: 'preposition' },
      { phrase: 'Please wait for me.', tokenText: 'for', picked: 'to', rawCategory: 'preposition verb + preposition wait for', category: 'preposition' },
      { phrase: 'It depends on the weather.', tokenText: 'on', picked: 'from', rawCategory: 'preposition common verb pattern depend on', category: 'preposition' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'preposition',
      microDiagnosisId: 'preposition_common_verb_patterns',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses two-object order mistakes as a specific syntax training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'Give it to me.', tokenText: 'it to me', picked: 'me it', rawCategory: 'syntax object order give me it', category: 'syntax' },
      { phrase: 'Send it to her.', tokenText: 'it to her', picked: 'her it', rawCategory: 'syntax double object pronoun order', category: 'syntax' },
      { phrase: 'Buy it for me.', tokenText: 'for', picked: 'to', rawCategory: 'syntax object order to for confusion buy it for me', category: 'syntax' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'syntax',
      microDiagnosisId: 'object_order_give_me_it',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses basic statement word-order mistakes as a specific syntax training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'I like coffee.', tokenText: 'I like coffee', picked: 'Coffee I like', rawCategory: 'syntax basic word order object first', category: 'syntax' },
      { phrase: 'Every morning, he drinks tea.', tokenText: 'he drinks tea', picked: 'drinks he tea', rawCategory: 'syntax word order verb before subject after time', category: 'syntax' },
      { phrase: 'I usually work at home.', tokenText: 'usually work', picked: 'work usually', rawCategory: 'syntax word order adverb frequency position', category: 'syntax' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'syntax',
      microDiagnosisId: 'word_order_basic_statement',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses basic question word-order mistakes as a specific syntax training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'Where do you live?', tokenText: 'Where do you live?', picked: 'Where you live?', rawCategory: 'syntax question word order question word no aux', category: 'syntax' },
      { phrase: 'Does she speak English?', tokenText: 'Does she speak English?', picked: 'Does she speaks English?', rawCategory: 'syntax question order does plus s', category: 'syntax' },
      { phrase: 'Did you go home yesterday?', tokenText: 'Did you go', picked: 'Did you went', rawCategory: 'syntax basic question order did plus past', category: 'syntax' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'syntax',
      microDiagnosisId: 'word_order_basic_question',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses imperative mistakes as a specific syntax training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'Open the door.', tokenText: 'Open', picked: 'You open', rawCategory: 'imperative_basic unnecessary_you_imperative_error', category: 'syntax' },
      { phrase: "Don't touch it.", tokenText: "Don't", picked: 'No', rawCategory: 'negative imperative no_instead_of_dont_error', category: 'syntax' },
      { phrase: "Let's start now.", tokenText: 'start', picked: 'to start', rawCategory: 'lets_to_error imperative', category: 'syntax' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'syntax',
      microDiagnosisId: 'imperative_basic',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses zero/first conditional mistakes as a specific syntax training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'If it rains tomorrow, I will stay home.', tokenText: 'rains', picked: 'will rain', rawCategory: 'condition_zero_first will_in_if_clause_error', category: 'syntax' },
      { phrase: 'If you heat water, it boils.', tokenText: 'boils', picked: 'will boil', rawCategory: 'zero conditional first_conditional_instead_of_zero_error', category: 'syntax' },
      { phrase: 'Unless you hurry, you will be late.', tokenText: 'Unless', picked: 'If', rawCategory: 'unless meaning condition_zero_first', category: 'syntax' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'syntax',
      microDiagnosisId: 'condition_zero_first',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses second conditional mistakes as a specific syntax training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'If I had money, I would buy a house.', tokenText: 'had', picked: 'would have', rawCategory: 'condition_second_basic would_in_if_clause_error', category: 'syntax' },
      { phrase: 'If I were you, I would wait.', tokenText: 'were', picked: 'was', rawCategory: 'second conditional if_i_was_instead_of_were_error', category: 'syntax' },
      { phrase: 'If I knew his number, I would call him.', tokenText: 'would call', picked: 'would to call', rawCategory: 'would_to_error second conditional', category: 'syntax' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'syntax',
      microDiagnosisId: 'condition_second_basic',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses relative clause mistakes as a specific syntax training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'The phone which broke was new.', tokenText: 'which', picked: 'who', rawCategory: 'relative_clauses_who_which_that who_for_thing_error', category: 'syntax' },
      { phrase: 'The man who called you is here.', tokenText: 'who called', picked: 'who he called', rawCategory: 'relative clause duplicate_subject_error', category: 'syntax' },
      { phrase: 'I know a woman whose son lives in Cork.', tokenText: 'whose', picked: 'who', rawCategory: 'whose_confusion_error relative pronoun', category: 'syntax' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'syntax',
      microDiagnosisId: 'relative_clauses_who_which_that',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnoses reported speech mistakes as a specific syntax training', () => {
    const decision = checkCoachToastNeeded([
      { phrase: 'He said that he was tired.', tokenText: 'he was', picked: 'I am', rawCategory: 'reported_speech_basic missing_pronoun_shift_error missing_backshift_error', category: 'syntax' },
      { phrase: 'She asked where I lived.', tokenText: 'where I lived', picked: 'where did I live', rawCategory: 'reported question did_in_reported_question_error', category: 'syntax' },
      { phrase: 'He told me that he needed help.', tokenText: 'told me', picked: 'told', rawCategory: 'reported speech told_without_object_error', category: 'syntax' },
    ]);

    expect(decision).toEqual(expect.objectContaining({
      show: true,
      category: 'syntax',
      microDiagnosisId: 'reported_speech_basic',
      diagnosisEvidenceCount: 3,
    }));
  });

  it('diagnosis training has unique wrong feedback and adaptive depth', () => {
    const training = getDiagnosisTraining('article_a_an')!;
    const hourStep = training.steps.find((step) => step.id === 'a_an_contrast_001')!;
    const aFeedback = feedbackForAnswer(hourStep, 'a', 1);
    const theFeedback = feedbackForAnswer(hourStep, 'the', 1);

    expect(aFeedback.correct).toBe(false);
    expect(theFeedback.correct).toBe(false);
    expect(aFeedback.feedback.ru).not.toBe(theFeedback.feedback.ru);
    expect(aFeedback.feedback.ru).toContain('h');

    const state = {
      ...createDiagnosisTrainingState(),
      stepIndex: training.steps.findIndex((step) => step.id === hourStep.id),
    };
    const afterWrong = applyDiagnosisAnswer(training, state, 'a');
    expect(getStepDepth(afterWrong, hourStep)).toBe(2);
    const afterSecondWrong = applyDiagnosisAnswer(training, afterWrong, 'a');
    expect(getStepDepth(afterSecondWrong, hourStep)).toBe(3);
  });

  it('article a/an diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('article_a_an')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'article_a_an',
      category: 'article',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 1,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 9,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'article_a_an',
      contrastSet: ['a', 'an'],
      minItems: 12,
      recommendedItems: 18,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('article the/specific diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('article_the_specific')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'article_the_specific',
      category: 'article',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 2,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['a', 'an', 'the', 'no article']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'article_the_specific',
      contrastSet: ['a', 'an', 'the', 'no article'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const secondMentionStep = training.steps.find((step) => step.id === 'the_easy_001')!;
    expect(feedbackForAnswer(secondMentionStep, 'a', 1).feedback.ru).toContain('новая');
    expect(feedbackForAnswer(secondMentionStep, 'no article', 1).feedback.ru).toContain('артикл');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('article zero diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('article_zero')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'article_zero',
      category: 'article',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 3,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['a', 'an', 'the', 'no article']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'article_zero',
      contrastSet: ['a', 'an', 'the', 'no article'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const musicStep = training.steps.find((step) => step.id === 'zero_contrast_001')!;
    expect(feedbackForAnswer(musicStep, 'the', 1).feedback.ru).toContain('музыка вообще');
    expect(feedbackForAnswer(musicStep, 'a', 1).feedback.ru).toContain('Music');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('preposition time in/on/at diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('preposition_time_in_on_at')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'preposition_time_in_on_at',
      category: 'preposition',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 4,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['in', 'on', 'at']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'preposition_time_in_on_at',
      contrastSet: ['in', 'on', 'at'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const exactTimeStep = training.steps.find((step) => step.id === 'time_easy_001')!;
    expect(feedbackForAnswer(exactTimeStep, 'in', 1).feedback.ru).toContain('точная точка');
    expect(feedbackForAnswer(exactTimeStep, 'on', 1).feedback.ru).toContain('дней и дат');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('preposition place in/on/at diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('preposition_place_in_on_at')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'preposition_place_in_on_at',
      category: 'preposition',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 5,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['in', 'on', 'at']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'preposition_place_in_on_at',
      contrastSet: ['in', 'on', 'at'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const roomStep = training.steps.find((step) => step.id === 'place_easy_001')!;
    expect(feedbackForAnswer(roomStep, 'on', 1).feedback.ru).toContain('поверх');
    const addressStep = training.steps.find((step) => step.id === 'place_mixed_002')!;
    expect(feedbackForAnswer(addressStep, 'on', 1).feedback.ru).toContain('улиц');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('preposition time/place diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('preposition_time_place')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'preposition_time_place',
      category: 'preposition',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 54,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual([
      'in + enclosed place',
      'on + surface',
      'at + point/location',
      'in + month/year/period',
      'on + day/date',
      'at + exact time',
      'time vs place scale',
      'fixed expressions',
    ]);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'preposition_time_place',
      category: 'preposition',
      contrastSet: [
        'in + enclosed place',
        'on + surface',
        'at + point/location',
        'in + period',
        'on + day/date',
        'at + exact time',
        'fixed expressions',
      ],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const roomStep = training.steps.find((step) => step.id === 'prep_tp_easy_001')!;
    expect(feedbackForAnswer(roomStep, 'on', 1).feedback.ru).toContain('in the room');
    const mondayStep = training.steps.find((step) => step.id === 'prep_tp_contrast_001')!;
    expect(feedbackForAnswer(mondayStep, 'in', 1).feedback.ru).toContain('on');
    const exactTimeStep = training.steps.find((step) => step.id === 'prep_tp_contrast_002')!;
    expect(feedbackForAnswer(exactTimeStep, 'on', 1).feedback.ru).toContain('at');
    const mixedStep = training.steps.find((step) => step.id === 'prep_tp_mixed_006')!;
    expect(feedbackForAnswer(mixedStep, 'I live at Dublin, work in Mondays, and start on 8.', 1).feedback.ru).toContain('in Dublin, on Mondays, at 8');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('preposition duration for/since diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('preposition_duration_for_since')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'preposition_duration_for_since',
      category: 'preposition',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 6,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['for', 'since']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'preposition_duration_for_since',
      contrastSet: ['for', 'since'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const durationStep = training.steps.find((step) => step.id === 'duration_easy_001')!;
    expect(feedbackForAnswer(durationStep, 'since', 1).feedback.ru).toContain('Two hours');
    const startStep = training.steps.find((step) => step.id === 'duration_contrast_001')!;
    expect(feedbackForAnswer(startStep, 'for', 1).feedback.ru).toContain('2020');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('preposition direction to/into/from/out of diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('preposition_direction_to_into_from')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'preposition_direction_to_into_from',
      category: 'preposition',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 28,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['to', 'into', 'from', 'out of', 'towards', 'in', 'direction', 'source']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'preposition_direction_to_into_from',
      category: 'preposition',
      contrastSet: ['to', 'into', 'from', 'out of', 'towards', 'in', 'direction', 'source'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const destinationStep = training.steps.find((step) => step.id === 'prep_dir_easy_001')!;
    expect(feedbackForAnswer(destinationStep, 'into', 1).feedback.ru).toContain('to work');
    const inIntoStep = training.steps.find((step) => step.id === 'prep_dir_contrast_003')!;
    expect(feedbackForAnswer(inIntoStep, 'in', 1).feedback.ru).toContain('I am in the room');
    const outOfStep = training.steps.find((step) => step.id === 'prep_dir_mixed_001')!;
    expect(feedbackForAnswer(outOfStep, 'into', 1).feedback.ru).toContain('out of');
    const correctionStep = training.steps.find((step) => step.id === 'prep_dir_mixed_006')!;
    expect(feedbackForAnswer(correctionStep, 'She came out of work and went to the room.', 1).feedback.ru).toContain('from work / into the room');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('preposition direction diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('preposition_direction')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'preposition_direction',
      category: 'preposition',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 55,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual([
      'to + destination',
      'into + inside movement',
      'onto + surface movement',
      'from + origin',
      'out of + leaving inside',
      'movement vs location',
      'go to',
      'come from',
      'get into/out of',
    ]);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'preposition_direction',
      category: 'preposition',
      contrastSet: [
        'to + destination',
        'into + inside movement',
        'onto + surface movement',
        'from + origin',
        'out of + leaving inside',
        'movement vs location',
      ],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const homeStep = training.steps.find((step) => step.id === 'prep_dir_easy_003')!;
    expect(feedbackForAnswer(homeStep, 'to home', 1).feedback.ru).toContain('home');
    const intoRoomStep = training.steps.find((step) => step.id === 'prep_dir_contrast_001')!;
    expect(feedbackForAnswer(intoRoomStep, 'in', 1).feedback.ru).toContain('into');
    const ontoTableStep = training.steps.find((step) => step.id === 'prep_dir_contrast_004')!;
    expect(feedbackForAnswer(ontoTableStep, 'into', 1).feedback.ru).toContain('onto');
    const correctionStep = training.steps.find((step) => step.id === 'prep_dir_mixed_006')!;
    expect(feedbackForAnswer(correctionStep, 'He got out from the car, went on the room, and put the phone at the table.', 1).feedback.ru).toContain('out of the car, into the room, onto the table');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('preposition common verb patterns diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('preposition_common_verb_patterns')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'preposition_common_verb_patterns',
      category: 'preposition',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 29,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['listen to', 'wait for', 'depend on', 'look at', 'talk to', 'think about', 'ask for', 'believe in']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'preposition_common_verb_patterns',
      category: 'preposition',
      contrastSet: ['listen to', 'wait for', 'depend on', 'look at', 'talk to', 'think about', 'ask for', 'believe in'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const listenStep = training.steps.find((step) => step.id === 'verb_prep_easy_001')!;
    expect(feedbackForAnswer(listenStep, 'for', 1).feedback.ru).toContain('listen to music');
    const waitStep = training.steps.find((step) => step.id === 'verb_prep_easy_002')!;
    expect(feedbackForAnswer(waitStep, 'to', 1).feedback.ru).toContain('wait for me');
    const dependStep = training.steps.find((step) => step.id === 'verb_prep_contrast_001')!;
    expect(feedbackForAnswer(dependStep, 'from', 1).feedback.ru).toContain('depend on');
    const lookStep = training.steps.find((step) => step.id === 'verb_prep_contrast_002')!;
    expect(feedbackForAnswer(lookStep, 'for', 1).feedback.ru).toContain('Look for');
    const correctionStep = training.steps.find((step) => step.id === 'verb_prep_mixed_006')!;
    expect(feedbackForAnswer(correctionStep, 'I listened him, waited him, and talked him.', 1).feedback.ru).toContain('to, for, to');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('object order diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('object_order_give_me_it')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'object_order_give_me_it',
      category: 'syntax',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 30,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['verb + person + thing', 'verb + thing + to + person', 'verb + thing + for + person', 'give it to me', 'send it to her', 'buy it for him']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'object_order_give_me_it',
      category: 'syntax',
      contrastSet: ['verb + person + thing', 'verb + thing + to + person', 'verb + thing + for + person', 'give it to me', 'send it to her', 'buy it for him'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const personThingStep = training.steps.find((step) => step.id === 'object_order_easy_001')!;
    expect(feedbackForAnswer(personThingStep, 'to me', 1).feedback.ru).toContain('give me the book');
    const itStep = training.steps.find((step) => step.id === 'object_order_contrast_004')!;
    expect(feedbackForAnswer(itStep, 'me it', 1).feedback.ru).toContain('give it to me');
    const buyStep = training.steps.find((step) => step.id === 'object_order_mixed_001')!;
    expect(feedbackForAnswer(buyStep, 'it to me', 1).feedback.ru).toContain('buy it for me');
    const pairStep = training.steps.find((step) => step.id === 'object_order_mixed_005')!;
    expect(feedbackForAnswer(pairStep, 'Send it for her / Buy it to her', 1).feedback.ru).toContain('Send it to her');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('basic statement word order diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('word_order_basic_statement')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'word_order_basic_statement',
      category: 'syntax',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 31,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['subject', 'verb', 'object', 'place', 'time', 'adverb position', 'source-language flexible order']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'word_order_basic_statement',
      category: 'syntax',
      contrastSet: ['subject', 'verb', 'object', 'place', 'time', 'adverb position'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const objectFirstStep = training.steps.find((step) => step.id === 'word_order_easy_001')!;
    expect(feedbackForAnswer(objectFirstStep, 'Coffee I like.', 1).feedback.ru).toContain('I like coffee');
    const placeStep = training.steps.find((step) => step.id === 'word_order_contrast_001')!;
    expect(feedbackForAnswer(placeStep, 'I read at home books.', 1).feedback.ru).toContain('I read books at home');
    const beAdverbStep = training.steps.find((step) => step.id === 'word_order_mixed_002')!;
    expect(feedbackForAnswer(beAdverbStep, 'She always is busy.', 1).feedback.ru).toContain('She is always busy');
    const correctionStep = training.steps.find((step) => step.id === 'word_order_mixed_006')!;
    expect(feedbackForAnswer(correctionStep, 'Yesterday I from work sent her the file.', 1).feedback.ru).toContain('I sent her the file');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('basic question word order diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('word_order_basic_question')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'word_order_basic_question',
      category: 'syntax',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 32,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['do questions', 'does questions', 'did questions', 'be questions', 'modal questions', 'question words', 'subject-auxiliary inversion']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'word_order_basic_question',
      category: 'syntax',
      contrastSet: ['do questions', 'does questions', 'did questions', 'be questions', 'modal questions', 'question words'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const statementOrderStep = training.steps.find((step) => step.id === 'q_order_easy_003')!;
    expect(feedbackForAnswer(statementOrderStep, 'You speak English?', 1).feedback.ru).toContain('Do you speak English');
    const doesStep = training.steps.find((step) => step.id === 'q_order_contrast_002')!;
    expect(feedbackForAnswer(doesStep, 'Does he likes coffee?', 1).feedback.ru).toContain('Does he like');
    const didStep = training.steps.find((step) => step.id === 'q_order_contrast_005')!;
    expect(feedbackForAnswer(didStep, 'What did you bought?', 1).feedback.ru).toContain('buy');
    const beStep = training.steps.find((step) => step.id === 'q_order_mixed_005')!;
    expect(feedbackForAnswer(beStep, 'Where do you are?', 1).feedback.ru).toContain('Where are you');
    const modalStep = training.steps.find((step) => step.id === 'q_order_mixed_006')!;
    expect(feedbackForAnswer(modalStep, 'What do you can do?', 1).feedback.ru).toContain('What can you do');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('imperative diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('imperative_basic')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'imperative_basic',
      category: 'syntax',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 49,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['base verb imperative', "don't + base verb", 'please', "let's", 'negative imperative', 'instructions', 'commands', 'requests']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'imperative_basic',
      category: 'syntax',
      contrastSet: ['base verb imperative', "don't + base verb", 'please', "let's", 'negative imperative', 'instructions', 'commands'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const openStep = training.steps.find((step) => step.id === 'imperative_easy_001')!;
    expect(feedbackForAnswer(openStep, 'You open', 1).feedback.ru).toContain('Open the door');
    const dontStep = training.steps.find((step) => step.id === 'imperative_contrast_001')!;
    expect(feedbackForAnswer(dontStep, 'No', 1).feedback.ru).toContain("Don't touch it");
    const beStep = training.steps.find((step) => step.id === 'imperative_contrast_006')!;
    expect(feedbackForAnswer(beStep, 'to be', 1).feedback.ru).toContain("Don't be");
    const letsStep = training.steps.find((step) => step.id === 'imperative_mixed_003')!;
    expect(feedbackForAnswer(letsStep, 'to start', 1).feedback.ru).toContain("Let's start");

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('zero/first conditional diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('condition_zero_first')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'condition_zero_first',
      category: 'syntax',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 50,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['if + present simple, present simple', 'if + present simple, will + base verb', 'zero conditional', 'first conditional', 'general truth', 'real future possibility', 'if clause', 'main clause']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'condition_zero_first',
      category: 'syntax',
      contrastSet: ['zero conditional', 'first conditional', 'if + present', 'will + base verb', 'unless', 'when'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const waterStep = training.steps.find((step) => step.id === 'cond_zero_first_easy_001')!;
    expect(feedbackForAnswer(waterStep, 'will boil', 1).feedback.ru).toContain('boils');
    const rainStep = training.steps.find((step) => step.id === 'cond_zero_first_contrast_004')!;
    expect(feedbackForAnswer(rainStep, 'If it will rain tomorrow, I will stay home.', 1).feedback.ru).toContain('If it rains');
    const finishStep = training.steps.find((step) => step.id === 'cond_zero_first_contrast_006')!;
    expect(feedbackForAnswer(finishStep, 'will finish', 1).feedback.ru).toContain('if I finish');
    const whenStep = training.steps.find((step) => step.id === 'cond_zero_first_mixed_002')!;
    expect(feedbackForAnswer(whenStep, 'will get', 1).feedback.ru).toContain('when I get');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('second conditional diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('condition_second_basic')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'condition_second_basic',
      category: 'syntax',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 51,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['if + past simple', 'would + base verb', 'unreal present', 'unlikely future', 'if I were', 'if I had', "wouldn't", 'first vs second conditional']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'condition_second_basic',
      category: 'syntax',
      contrastSet: ['if + past simple', 'would + base verb', 'unreal present', 'unlikely future', 'if I were', 'if I had', "wouldn't"],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const studyStep = training.steps.find((step) => step.id === 'cond_second_easy_001')!;
    expect(feedbackForAnswer(studyStep, 'will study', 1).feedback.ru).toContain('would study');
    const moneyStep = training.steps.find((step) => step.id === 'cond_second_contrast_001')!;
    expect(feedbackForAnswer(moneyStep, 'If I would have money, I would buy a house.', 1).feedback.ru).toContain('If I had money');
    const wouldStep = training.steps.find((step) => step.id === 'cond_second_contrast_004')!;
    expect(feedbackForAnswer(wouldStep, 'to go', 1).feedback.ru).toContain('would go');
    const wereStep = training.steps.find((step) => step.id === 'cond_second_mixed_001')!;
    expect(feedbackForAnswer(wereStep, 'was', 1).feedback.ru).toContain('If I were you');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('relative clauses who/which/that diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('relative_clauses_who_which_that')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'relative_clauses_who_which_that',
      category: 'syntax',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 52,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['who for people', 'which for things', 'that for people or things', 'subject relative clause', 'object relative clause', 'relative pronoun omission', 'defining relative clause']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'relative_clauses_who_which_that',
      category: 'syntax',
      contrastSet: ['who for people', 'which for things', 'that for people or things', 'whose', 'relative clause word order', 'object omission'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const manStep = training.steps.find((step) => step.id === 'relative_easy_001')!;
    expect(feedbackForAnswer(manStep, 'which', 1).feedback.ru).toContain('who');
    const phoneStep = training.steps.find((step) => step.id === 'relative_contrast_002')!;
    expect(feedbackForAnswer(phoneStep, 'who', 1).feedback.ru).toContain('Phone');
    const duplicateStep = training.steps.find((step) => step.id === 'relative_mixed_001')!;
    expect(feedbackForAnswer(duplicateStep, 'The man who he called you is here.', 1).feedback.ru).toContain('he');
    const whoseStep = training.steps.find((step) => step.id === 'relative_mixed_004')!;
    expect(feedbackForAnswer(whoseStep, 'who', 1).feedback.ru).toContain('whose son');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('reported speech diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('reported_speech_basic')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'reported_speech_basic',
      category: 'syntax',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 53,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['said that', 'told someone that', 'asked if', 'asked what', 'pronoun shift', 'tense backshift', 'reported question', 'direct speech']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'reported_speech_basic',
      category: 'syntax',
      contrastSet: ['said that', 'told someone that', 'asked if', 'asked what', 'pronoun shift', 'tense backshift', 'reported question'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const tiredStep = training.steps.find((step) => step.id === 'reported_easy_001')!;
    expect(feedbackForAnswer(tiredStep, 'I am', 1).feedback.ru).toContain('he was');
    const toldStep = training.steps.find((step) => step.id === 'reported_contrast_001')!;
    expect(feedbackForAnswer(toldStep, 'told', 1).feedback.ru).toContain('told me');
    const busyStep = training.steps.find((step) => step.id === 'reported_contrast_004')!;
    expect(feedbackForAnswer(busyStep, 'if was I', 1).feedback.ru).toContain('if I was');
    const whereStep = training.steps.find((step) => step.id === 'reported_mixed_001')!;
    expect(feedbackForAnswer(whereStep, 'did live', 1).feedback.ru).toContain('where I lived');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('verb present simple negative/question diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('verb_present_simple_negative_question')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'verb_present_simple_negative_question',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 7,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['do', 'does', "don't", "doesn't", 'base verb', 'verb+s']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'verb_present_simple_negative_question',
      contrastSet: ['do', 'does', "don't", "doesn't", 'base verb', 'verb+s'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const doesStep = training.steps.find((step) => step.id === 'do_does_contrast_002')!;
    expect(feedbackForAnswer(doesStep, 'knows', 1).feedback.ru).toContain('does');
    const theyStep = training.steps.find((step) => step.id === 'do_does_easy_002')!;
    expect(feedbackForAnswer(theyStep, "doesn't", 1).feedback.ru).toContain('They');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('verb third-person diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('verb_third_person')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'verb_third_person',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 8,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['base verb', 'verb+s', 'verb+es', 'has', 'does']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'verb_third_person',
      contrastSet: ['base verb', 'verb+s', 'verb+es', 'has', 'does'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const watchesStep = training.steps.find((step) => step.id === 'third_s_contrast_005')!;
    expect(feedbackForAnswer(watchesStep, 'watchs', 1).feedback.ru).toContain('-ch');
    const doesBoundaryStep = training.steps.find((step) => step.id === 'third_s_mixed_002')!;
    expect(feedbackForAnswer(doesBoundaryStep, 'studies', 1).feedback.ru).toContain('does');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('verb Present Simple statement diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('verb_present_simple_statement')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'verb_present_simple_statement',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 22,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['base verb', 'verb+s', 'habit', 'fact', 'routine', 'schedule', 'present continuous']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'verb_present_simple_statement',
      category: 'verb',
      contrastSet: ['base verb', 'verb+s', 'habit', 'fact', 'routine', 'schedule', 'present continuous'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const iStep = training.steps.find((step) => step.id === 'ps_statement_easy_001')!;
    expect(feedbackForAnswer(iStep, 'am work', 1).feedback.ru).toContain('I work');
    const heStep = training.steps.find((step) => step.id === 'ps_statement_contrast_001')!;
    expect(feedbackForAnswer(heStep, 'like', 1).feedback.ru).toContain('likes');
    const shopStep = training.steps.find((step) => step.id === 'ps_statement_mixed_001')!;
    expect(feedbackForAnswer(shopStep, 'open', 1).feedback.ru).toContain('opens');
    const pairStep = training.steps.find((step) => step.id === 'ps_statement_mixed_004')!;
    expect(pairStep.correctAnswerId).toBe('I work / She works');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('verb Present Continuous basic diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('verb_present_continuous_basic')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'verb_present_continuous_basic',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 23,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['am + verb-ing', 'is + verb-ing', 'are + verb-ing', 'now', 'right now', 'at the moment', 'present simple']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'verb_present_continuous_basic',
      category: 'verb',
      contrastSet: ['am + verb-ing', 'is + verb-ing', 'are + verb-ing', 'now', 'right now', 'at the moment', 'present simple'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const iStep = training.steps.find((step) => step.id === 'pc_basic_easy_001')!;
    expect(feedbackForAnswer(iStep, 'is', 1).feedback.ru).toContain('am');
    const missingBeStep = training.steps.find((step) => step.id === 'pc_basic_contrast_004')!;
    expect(feedbackForAnswer(missingBeStep, 'I working now.', 1).feedback.ru).toContain('I am working');
    const studyStep = training.steps.find((step) => step.id === 'pc_basic_contrast_005')!;
    expect(feedbackForAnswer(studyStep, 'She studies at the moment.', 1).feedback.ru).toContain('is studying');
    const questionStep = training.steps.find((step) => step.id === 'pc_basic_mixed_002')!;
    expect(feedbackForAnswer(questionStep, 'You are', 1).feedback.ru).toContain('Are you working');
    const signalStep = training.steps.find((step) => step.id === 'pc_basic_mixed_005')!;
    expect(feedbackForAnswer(signalStep, 'I am working every day / I work now', 1).feedback.ru).toContain('Every day');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('verb Present Simple vs Continuous diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('verb_present_simple_vs_continuous')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'verb_present_simple_vs_continuous',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 24,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['present simple', 'present continuous', 'habit', 'current action', 'state verbs', 'temporary situation', 'time markers']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'verb_present_simple_vs_continuous',
      category: 'verb',
      contrastSet: ['present simple', 'present continuous', 'habit', 'current action', 'state verbs', 'temporary situation', 'time markers'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const habitStep = training.steps.find((step) => step.id === 'ps_pc_easy_001')!;
    expect(feedbackForAnswer(habitStep, 'am working', 1).feedback.ru).toContain('Every day');
    const nowStep = training.steps.find((step) => step.id === 'ps_pc_easy_002')!;
    expect(feedbackForAnswer(nowStep, 'work', 1).feedback.ru).toContain('Now');
    const stateStep = training.steps.find((step) => step.id === 'ps_pc_contrast_004')!;
    expect(feedbackForAnswer(stateStep, 'is liking', 1).feedback.ru).toContain('likes');
    const scheduleStep = training.steps.find((step) => step.id === 'ps_pc_mixed_006')!;
    expect(feedbackForAnswer(scheduleStep, 'The bus is leaving at 8, but we wait now.', 1).feedback.ru).toContain('are waiting');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('verb Past Simple regular and irregular diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('verb_past_simple_regular_irregular')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'verb_past_simple_regular_irregular',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 25,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['regular + ed', 'irregular past', 'y -> ied', 'double consonant + ed', 'past time marker', 'present simple']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'verb_past_simple_regular_irregular',
      category: 'verb',
      contrastSet: ['regular + ed', 'irregular past', 'y -> ied', 'double consonant + ed', 'past time marker', 'present simple'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const workedStep = training.steps.find((step) => step.id === 'past_simple_easy_001')!;
    expect(feedbackForAnswer(workedStep, 'work', 1).feedback.ru).toContain('worked');
    const wentStep = training.steps.find((step) => step.id === 'past_simple_contrast_001')!;
    expect(feedbackForAnswer(wentStep, 'goed', 1).feedback.ru).toContain('went');
    const studiedStep = training.steps.find((step) => step.id === 'past_simple_contrast_005')!;
    expect(feedbackForAnswer(studiedStep, 'studyed', 1).feedback.ru).toContain('studied');
    const didStep = training.steps.find((step) => step.id === 'past_simple_mixed_002')!;
    expect(feedbackForAnswer(didStep, 'I did went home.', 1).feedback.ru).toContain('did go');
    const correctionStep = training.steps.find((step) => step.id === 'past_simple_mixed_006')!;
    expect(feedbackForAnswer(correctionStep, 'Yesterday, I goed to the shop and buyed some milk.', 1).feedback.ru).toContain('bought');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("verb Past Simple did/didn't diagnosis training follows the MVP content contract", () => {
    const training = getDiagnosisTraining('verb_past_simple_negative_question')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'verb_past_simple_negative_question',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 37,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['did + base verb', "didn't + base verb", 'past statement', 'past question', 'past negative', 'did vs do', 'base verb after did']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'verb_past_simple_negative_question',
      category: 'verb',
      contrastSet: ['did + base verb', "didn't + base verb", 'past statement', 'past question', 'past negative', 'did vs do'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const didStep = training.steps.find((step) => step.id === 'past_neg_q_contrast_004')!;
    expect(feedbackForAnswer(didStep, 'Did you went to the shop?', 1).feedback.ru).toContain('Did you went');
    const didntStep = training.steps.find((step) => step.id === 'past_neg_q_contrast_006')!;
    expect(feedbackForAnswer(didntStep, 'bought', 1).feedback.ru).toContain("Didn't bought");
    const whereStep = training.steps.find((step) => step.id === 'past_neg_q_mixed_002')!;
    expect(feedbackForAnswer(whereStep, 'went', 1).feedback.ru).toContain('Where did she went');
    const mixedStep = training.steps.find((step) => step.id === 'past_neg_q_mixed_006')!;
    expect(feedbackForAnswer(mixedStep, "I didn't bought the phone, but did you bought it?", 1).feedback.ru).toContain('buy');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('verb Present Perfect diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('verb_present_perfect_basic')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'verb_present_perfect_basic',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 38,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['have + V3', 'has + V3', 'past participle', 'already', 'yet', 'ever', 'never', 'result now', 'life experience', 'past simple']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'verb_present_perfect_basic',
      category: 'verb',
      contrastSet: ['have + V3', 'has + V3', 'past participle', 'already', 'yet', 'ever', 'never', 'result now', 'past simple'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const seenStep = training.steps.find((step) => step.id === 'present_perfect_contrast_001')!;
    expect(feedbackForAnswer(seenStep, 'saw', 1).feedback.ru).toContain('seen');
    const hasStep = training.steps.find((step) => step.id === 'present_perfect_easy_002')!;
    expect(feedbackForAnswer(hasStep, 'have', 1).feedback.ru).toContain('has');
    const yetStep = training.steps.find((step) => step.id === 'present_perfect_contrast_005')!;
    expect(feedbackForAnswer(yetStep, 'already', 1).feedback.ru).toContain('yet');
    const yesterdayStep = training.steps.find((step) => step.id === 'present_perfect_mixed_005')!;
    expect(feedbackForAnswer(yesterdayStep, 'I have lost my keys yesterday.', 1).feedback.ru).toContain('Past Simple');
    const mixedStep = training.steps.find((step) => step.id === 'present_perfect_mixed_006')!;
    expect(feedbackForAnswer(mixedStep, 'I have already did it, but she hasn’t seen the result already.', 1).feedback.ru).toContain('done');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('Present Perfect vs Past Simple diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('present_perfect_vs_past_simple')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'present_perfect_vs_past_simple',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 39,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['present perfect', 'past simple', 'result now', 'life experience', 'finished time', 'yesterday', 'last week', 'ago', 'ever', 'never']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'present_perfect_vs_past_simple',
      category: 'verb',
      contrastSet: ['present perfect', 'past simple', 'result now', 'life experience', 'finished time', 'yesterday', 'last week', 'ago', 'ever', 'never'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const yesterdayStep = training.steps.find((step) => step.id === 'pp_vs_past_easy_002')!;
    expect(feedbackForAnswer(yesterdayStep, 'have lost', 1).feedback.ru).toContain('Past Simple');
    const everStep = training.steps.find((step) => step.id === 'pp_vs_past_contrast_001')!;
    expect(feedbackForAnswer(everStep, 'Did', 1).feedback.ru).toContain('Have you ever tried');
    const lastWeekStep = training.steps.find((step) => step.id === 'pp_vs_past_contrast_004')!;
    expect(feedbackForAnswer(lastWeekStep, 'has finished', 1).feedback.ru).toContain('finished');
    const mixedStep = training.steps.find((step) => step.id === 'pp_vs_past_mixed_006')!;
    expect(feedbackForAnswer(mixedStep, 'I have never was to London, but I have went to Dublin in 2020.', 1).feedback.ru).toContain('went');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('Present Perfect questions/negatives diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('present_perfect_questions_negatives')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'present_perfect_questions_negatives',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 40,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['have you + V3', 'has she + V3', "haven't + V3", "hasn't + V3", 'yet', 'ever', 'already', 'did vs have']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'present_perfect_questions_negatives',
      category: 'verb',
      contrastSet: ['have you + V3', 'has she + V3', "haven't + V3", "hasn't + V3", 'yet', 'ever', 'already', 'did vs have'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const questionStep = training.steps.find((step) => step.id === 'pp_qn_easy_001')!;
    expect(feedbackForAnswer(questionStep, 'Did', 1).feedback.ru).toContain('Have you finished');
    const hasStep = training.steps.find((step) => step.id === 'pp_qn_contrast_001')!;
    expect(feedbackForAnswer(hasStep, 'Have', 1).feedback.ru).toContain('has');
    const seenStep = training.steps.find((step) => step.id === 'pp_qn_contrast_006')!;
    expect(feedbackForAnswer(seenStep, 'see', 1).feedback.ru).toContain('seen');
    const mixedStep = training.steps.find((step) => step.id === 'pp_qn_mixed_006')!;
    expect(feedbackForAnswer(mixedStep, "Have you ever saw it? I haven't see it yet.", 1).feedback.ru).toContain('seen');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('Present Perfect for/since diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('present_perfect_for_since')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'present_perfect_for_since',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 41,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['for + duration', 'since + starting point', 'have been', 'has lived', 'how long', 'started in past and continues now', 'present perfect', 'past simple']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'present_perfect_for_since',
      category: 'verb',
      contrastSet: ['for + duration', 'since + starting point', 'have been', 'has lived', 'how long', 'started in past and continues now'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const durationStep = training.steps.find((step) => step.id === 'pp_for_since_easy_001')!;
    expect(feedbackForAnswer(durationStep, 'since', 1).feedback.ru).toContain('for three years');
    const startStep = training.steps.find((step) => step.id === 'pp_for_since_contrast_001')!;
    expect(feedbackForAnswer(startStep, 'for', 1).feedback.ru).toContain('since');
    const howLongStep = training.steps.find((step) => step.id === 'pp_for_since_mixed_001')!;
    expect(feedbackForAnswer(howLongStep, 'did', 1).feedback.ru).toContain('have you lived');
    const mixedStep = training.steps.find((step) => step.id === 'pp_for_since_mixed_006')!;
    expect(feedbackForAnswer(mixedStep, 'She has worked here for 2020, and I have known her since five years.', 1).feedback.ru).toContain('2020');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('Past Continuous diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('past_continuous_basic')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'past_continuous_basic',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 42,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['was + verb-ing', 'were + verb-ing', 'at 8 yesterday', 'while', 'past process', 'past simple', 'interrupted action']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'past_continuous_basic',
      category: 'verb',
      contrastSet: ['was + verb-ing', 'were + verb-ing', 'at 8 yesterday', 'while', 'past process', 'past simple'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const wasStep = training.steps.find((step) => step.id === 'past_cont_easy_001')!;
    expect(feedbackForAnswer(wasStep, 'were', 1).feedback.ru).toContain('was');
    const missingStep = training.steps.find((step) => step.id === 'past_cont_contrast_004')!;
    expect(feedbackForAnswer(missingStep, 'I working at that moment.', 1).feedback.ru).toContain('was');
    const baseStep = training.steps.find((step) => step.id === 'past_cont_contrast_005')!;
    expect(feedbackForAnswer(baseStep, 'They were wait when I arrived.', 1).feedback.ru).toContain('were waiting');
    const processStep = training.steps.find((step) => step.id === 'past_cont_mixed_005')!;
    expect(feedbackForAnswer(processStep, 'I was working yesterday / I worked at 8 yesterday', 1).feedback.ru).toContain('At 8');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('Past Simple vs Past Continuous diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('past_simple_vs_past_continuous')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'past_simple_vs_past_continuous',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 43,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['past simple', 'past continuous', 'completed action', 'background action', 'interrupted action', 'when', 'while', 'at that moment']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'past_simple_vs_past_continuous',
      category: 'verb',
      contrastSet: ['past simple', 'past continuous', 'completed action', 'background action', 'interrupted action', 'when', 'while', 'at that moment'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const factStep = training.steps.find((step) => step.id === 'past_simple_cont_easy_001')!;
    expect(feedbackForAnswer(factStep, 'was working', 1).feedback.ru).toContain('worked');
    const processStep = training.steps.find((step) => step.id === 'past_simple_cont_easy_002')!;
    expect(feedbackForAnswer(processStep, 'worked', 1).feedback.ru).toContain('was working');
    const eventStep = training.steps.find((step) => step.id === 'past_simple_cont_contrast_002')!;
    expect(feedbackForAnswer(eventStep, 'was ringing', 1).feedback.ru).toContain('rang');
    const mixedStep = training.steps.find((step) => step.id === 'past_simple_cont_mixed_005')!;
    expect(feedbackForAnswer(mixedStep, 'I entered the room, and they watched TV.', 1).feedback.ru).toContain('were watching');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('used to diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('used_to_basic')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'used_to_basic',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 44,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['used to + base verb', 'past habit', 'past state', 'not true now', "didn't use to", 'did you use to', 'be used to + noun/ing', 'past simple']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'used_to_basic',
      category: 'verb',
      contrastSet: ['used to + base verb', 'past habit', 'past state', 'not true now', "didn't use to", 'did you use to', 'be used to + noun/ing'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const smokeStep = training.steps.find((step) => step.id === 'used_to_easy_001')!;
    expect(feedbackForAnswer(smokeStep, 'use to', 1).feedback.ru).toContain('used to');
    const playStep = training.steps.find((step) => step.id === 'used_to_easy_002')!;
    expect(feedbackForAnswer(playStep, 'playing', 1).feedback.ru).toContain('used to play');
    const didntStep = training.steps.find((step) => step.id === 'used_to_contrast_004')!;
    expect(feedbackForAnswer(didntStep, 'used to', 1).feedback.ru).toContain("didn't use to");
    const currentStep = training.steps.find((step) => step.id === 'used_to_mixed_003')!;
    expect(feedbackForAnswer(currentStep, 'used to work', 1).feedback.ru).toContain('work');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('future Present Continuous arrangements diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('future_present_continuous_arrangements')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'future_present_continuous_arrangements',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 45,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['am/is/are + verb-ing', 'future arrangement', 'tomorrow', 'on Monday', 'tonight', 'next week', 'going to', 'will', 'present continuous now']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'future_present_continuous_arrangements',
      category: 'verb',
      contrastSet: ['am/is/are + verb-ing', 'future arrangement', 'tomorrow', 'on Monday', 'tonight', 'next week', 'going to', 'will'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const meetingStep = training.steps.find((step) => step.id === 'future_pc_easy_001')!;
    expect(feedbackForAnswer(meetingStep, 'meeting', 1).feedback.ru).toContain('am meeting');
    const flyingStep = training.steps.find((step) => step.id === 'future_pc_contrast_001')!;
    expect(feedbackForAnswer(flyingStep, 'are flying', 1).feedback.ru).toContain('is');
    const questionStep = training.steps.find((step) => step.id === 'future_pc_contrast_004')!;
    expect(feedbackForAnswer(questionStep, 'Will', 1).feedback.ru).toContain('Are you working');
    const willStep = training.steps.find((step) => step.id === 'future_pc_mixed_002')!;
    expect(feedbackForAnswer(willStep, 'am answering', 1).feedback.ru).toContain('will answer');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('verb was/were diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('verb_was_were')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'verb_was_were',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 26,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['was', 'were', 'am/is/are', "wasn't", "weren't", 'was there', 'were there']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'verb_was_were',
      category: 'verb',
      contrastSet: ['was', 'were', 'am/is/are', "wasn't", "weren't", 'was there', 'were there'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const iStep = training.steps.find((step) => step.id === 'was_were_easy_001')!;
    expect(feedbackForAnswer(iStep, 'were', 1).feedback.ru).toContain('was');
    const theyStep = training.steps.find((step) => step.id === 'was_were_contrast_001')!;
    expect(feedbackForAnswer(theyStep, 'was', 1).feedback.ru).toContain('were');
    const markerStep = training.steps.find((step) => step.id === 'was_were_contrast_004')!;
    expect(feedbackForAnswer(markerStep, 'is', 1).feedback.ru).toContain('was');
    const negativeStep = training.steps.find((step) => step.id === 'was_were_mixed_001')!;
    expect(feedbackForAnswer(negativeStep, "weren't", 1).feedback.ru).toContain("wasn't");
    const questionStep = training.steps.find((step) => step.id === 'was_were_mixed_003')!;
    expect(feedbackForAnswer(questionStep, 'Did', 1).feedback.ru).toContain('was/were');
    const correctionStep = training.steps.find((step) => step.id === 'was_were_mixed_006')!;
    expect(feedbackForAnswer(correctionStep, 'She was worked at home, but they were worked at work.', 1).feedback.ru).toContain('worked');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('future will/going to diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('future_will_going_to')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'future_will_going_to',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 27,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['will', 'going to', 'instant decision', 'promise', 'prediction', 'plan', 'intention', 'evidence']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'future_will_going_to',
      category: 'verb',
      contrastSet: ['will', 'going to', 'instant decision', 'promise', 'prediction', 'plan', 'intention', 'evidence'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const promiseStep = training.steps.find((step) => step.id === 'future_easy_001')!;
    expect(feedbackForAnswer(promiseStep, 'will to', 1).feedback.ru).toContain('will help');
    const planStep = training.steps.find((step) => step.id === 'future_contrast_001')!;
    expect(feedbackForAnswer(planStep, 'going to', 1).feedback.ru).toContain('I am going to study');
    const baseStep = training.steps.find((step) => step.id === 'future_contrast_004')!;
    expect(feedbackForAnswer(baseStep, 'to call', 1).feedback.ru).toContain('will call');
    const evidenceStep = training.steps.find((step) => step.id === 'future_mixed_001')!;
    expect(feedbackForAnswer(evidenceStep, 'will', 1).feedback.ru).toContain('видимые признаки');
    const correctionStep = training.steps.find((step) => step.id === 'future_mixed_006')!;
    expect(feedbackForAnswer(correctionStep, 'I will calling you later, but I am going to studying tonight.', 1).feedback.ru).toContain('base verb');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('infinitive vs gerund diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('infinitive_vs_gerund_basic')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'infinitive_vs_gerund_basic',
      category: 'verb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 33,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['to + base verb', 'verb-ing', 'want to', 'need to', 'decide to', 'enjoy doing', 'finish doing', 'avoid doing']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'infinitive_vs_gerund_basic',
      category: 'verb',
      contrastSet: ['to + base verb', 'verb-ing', 'want to', 'need to', 'decide to', 'enjoy doing', 'finish doing', 'avoid doing'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const wantStep = training.steps.find((step) => step.id === 'inf_ger_easy_001')!;
    expect(feedbackForAnswer(wantStep, 'learning', 1).feedback.ru).toContain('want');
    const toIngStep = training.steps.find((step) => step.id === 'inf_ger_easy_001')!;
    expect(feedbackForAnswer(toIngStep, 'to learning', 1).feedback.ru).toContain('to learn');
    const enjoyStep = training.steps.find((step) => step.id === 'inf_ger_contrast_004')!;
    expect(feedbackForAnswer(enjoyStep, 'to learn', 1).feedback.ru).toContain('learning');
    const finishStep = training.steps.find((step) => step.id === 'inf_ger_contrast_005')!;
    expect(feedbackForAnswer(finishStep, 'to work', 1).feedback.ru).toContain('verb-ing');
    const correctionStep = training.steps.find((step) => step.id === 'inf_ger_mixed_006')!;
    expect(feedbackForAnswer(correctionStep, 'I want improving, but I avoid to make the same mistakes.', 1).feedback.ru).toContain('want to improve');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('to-be present agreement diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('to_be_present_agreement')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'to_be_present_agreement',
      category: 'to-be',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 9,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['am', 'is', 'are', 'no be']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'to_be_present_agreement',
      contrastSet: ['am', 'is', 'are', 'no be'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const sheStep = training.steps.find((step) => step.id === 'be_present_easy_002')!;
    expect(feedbackForAnswer(sheStep, 'no be', 1).feedback.ru).toContain('She');
    const questionStep = training.steps.find((step) => step.id === 'be_present_mixed_002')!;
    expect(feedbackForAnswer(questionStep, 'Does', 1).feedback.ru).toContain('Ready');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('modal base-form diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('modal_base_form')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'modal_base_form',
      category: 'modal',
      version: '1.0.0',
      status: 'active',
      priority: 10,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['can help', 'can to help', 'can helps', 'can helping', 'should be']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'modal_base_form',
      contrastSet: ['can help', 'can to help', 'can helps', 'can helping', 'should be'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const canStep = training.steps.find((step) => step.id === 'modal_base_easy_001')!;
    expect(feedbackForAnswer(canStep, 'to help', 1).feedback.ru).toContain('can');
    const beStep = training.steps.find((step) => step.id === 'modal_base_mixed_001')!;
    expect(feedbackForAnswer(beStep, 'are', 1).feedback.ru).toContain('be');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('should/must/have to diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('modal_should_must_have_to')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'modal_should_must_have_to',
      category: 'modal',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 46,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['should + base verb', 'must + base verb', 'have to + base verb', 'has to', "don't have to", "mustn't", 'advice', 'obligation', 'external necessity']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'modal_should_must_have_to',
      category: 'modal',
      contrastSet: ['should + base verb', 'must + base verb', 'have to + base verb', 'has to', "don't have to", "mustn't", 'advice', 'obligation'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const adviceStep = training.steps.find((step) => step.id === 'modal_smh_easy_001')!;
    expect(feedbackForAnswer(adviceStep, 'must', 1).feedback.ru).toContain('should');
    const baseStep = training.steps.find((step) => step.id === 'modal_smh_easy_002')!;
    expect(feedbackForAnswer(baseStep, 'to call', 1).feedback.ru).toContain('should call');
    const prohibitionStep = training.steps.find((step) => step.id === 'modal_smh_contrast_003')!;
    expect(feedbackForAnswer(prohibitionStep, "don't have to", 1).feedback.ru).toContain("mustn't");
    const questionStep = training.steps.find((step) => step.id === 'modal_smh_contrast_006')!;
    expect(feedbackForAnswer(questionStep, 'Have', 1).feedback.ru).toContain('Do you have to work');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('can/could diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('modal_can_could_ability_request')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'modal_can_could_ability_request',
      category: 'modal',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 47,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['can + base verb', 'could + base verb', 'present ability', 'past ability', 'polite request', 'permission', "can't", "couldn't"]);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'modal_can_could_ability_request',
      category: 'modal',
      contrastSet: ['can + base verb', 'could + base verb', 'present ability', 'past ability', 'polite request', 'permission', "can't", "couldn't"],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const abilityStep = training.steps.find((step) => step.id === 'modal_can_could_easy_001')!;
    expect(feedbackForAnswer(abilityStep, 'could', 1).feedback.ru).toContain('can');
    const baseStep = training.steps.find((step) => step.id === 'modal_can_could_contrast_002')!;
    expect(feedbackForAnswer(baseStep, 'to help', 1).feedback.ru).toContain('could help');
    const pastStep = training.steps.find((step) => step.id === 'modal_can_could_contrast_004')!;
    expect(feedbackForAnswer(pastStep, 'can', 1).feedback.ru).toContain('could');
    const negativeStep = training.steps.find((step) => step.id === 'modal_can_could_contrast_005')!;
    expect(feedbackForAnswer(negativeStep, "can't", 1).feedback.ru).toContain("couldn't");

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('may/might diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('modal_may_might_probability')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'modal_may_might_probability',
      category: 'modal',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 48,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['may + base verb', 'might + base verb', 'possibility', 'probability', 'uncertainty', 'may not', 'might not', 'can vs may', 'will vs may']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'modal_may_might_probability',
      category: 'modal',
      contrastSet: ['may + base verb', 'might + base verb', 'possibility', 'probability', 'uncertainty', 'may not', 'might not', 'can vs may', 'will vs may'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const probabilityStep = training.steps.find((step) => step.id === 'modal_may_might_easy_001')!;
    expect(feedbackForAnswer(probabilityStep, 'can', 1).feedback.ru).toContain('may rain');
    const baseStep = training.steps.find((step) => step.id === 'modal_may_might_contrast_004')!;
    expect(feedbackForAnswer(baseStep, 'knows', 1).feedback.ru).toContain('may know');
    const negativeStep = training.steps.find((step) => step.id === 'modal_may_might_mixed_002')!;
    expect(feedbackForAnswer(negativeStep, "doesn't might", 1).feedback.ru).toContain('might not work');
    const maybeStep = training.steps.find((step) => step.id === 'modal_may_might_mixed_003')!;
    expect(feedbackForAnswer(maybeStep, 'She maybe come.', 1).feedback.ru).toContain('She might come');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('pronoun case diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('pronoun_case')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'pronoun_case',
      category: 'pronoun',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 11,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['I/me', 'he/him', 'she/her', 'we/us', 'they/them', 'you']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'pronoun_case',
      contrastSet: ['I/me', 'he/him', 'she/her', 'we/us', 'they/them', 'you'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const prepositionStep = training.steps.find((step) => step.id === 'pronoun_case_contrast_004')!;
    expect(feedbackForAnswer(prepositionStep, 'I', 1).feedback.ru).toContain('for');
    const compoundStep = training.steps.find((step) => step.id === 'pronoun_case_mixed_001')!;
    expect(feedbackForAnswer(compoundStep, 'me', 1).feedback.ru).toContain('You and I');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('pronoun possessive diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('pronoun_possessive')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'pronoun_possessive',
      category: 'pronoun',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 12,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['my/mine', 'your/yours', 'his', 'her/hers', 'our/ours', 'their/theirs', 'its']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'pronoun_possessive',
      contrastSet: ['my/mine', 'your/yours', 'his', 'her/hers', 'our/ours', 'their/theirs', "its/it's"],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const myStep = training.steps.find((step) => step.id === 'possessive_easy_001')!;
    expect(feedbackForAnswer(myStep, 'mine', 1).feedback.ru).toContain('mine phone');
    const itsStep = training.steps.find((step) => step.id === 'possessive_mixed_004')!;
    expect(feedbackForAnswer(itsStep, "it's", 1).feedback.ru).toContain('it is');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('adjective comparison diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('adjective_comparison')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'adjective_comparison',
      category: 'adjective',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 13,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['adjective+er', 'more + adjective', 'than', 'better', 'worse', 'as ... as']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'adjective_comparison',
      contrastSet: ['adjective+er', 'more + adjective', 'than', 'better', 'worse', 'as ... as'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const bigStep = training.steps.find((step) => step.id === 'comparison_contrast_001')!;
    expect(feedbackForAnswer(bigStep, 'biger', 1).feedback.ru).toContain('bigger');
    const longStep = training.steps.find((step) => step.id === 'comparison_easy_003')!;
    expect(feedbackForAnswer(longStep, 'expensiver', 1).feedback.ru).toContain('more expensive');
    const asStep = training.steps.find((step) => step.id === 'comparison_mixed_003')!;
    expect(feedbackForAnswer(asStep, 'better / than', 1).feedback.ru).toContain('as good as');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('adjective vs adverb diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('adjective_vs_adverb')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'adjective_vs_adverb',
      category: 'adverb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 14,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['adjective', 'adverb', 'good/well', '-ly adverbs', 'linking verbs']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'adjective_vs_adverb',
      category: 'adverb',
      contrastSet: ['adjective', 'adverb', 'good/well', '-ly adverbs', 'linking verbs'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const goodStep = training.steps.find((step) => step.id === 'adj_adv_easy_001')!;
    expect(feedbackForAnswer(goodStep, 'well', 1).feedback.ru).toContain('good');
    const actionStep = training.steps.find((step) => step.id === 'adj_adv_contrast_005')!;
    expect(feedbackForAnswer(actionStep, 'careful', 1).feedback.ru).toContain('carefully');
    const linkingStep = training.steps.find((step) => step.id === 'adj_adv_mixed_001')!;
    expect(feedbackForAnswer(linkingStep, 'strangely', 1).feedback.ru).toContain('strange');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('adverb frequency position diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('adverb_frequency_position')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'adverb_frequency_position',
      category: 'adverb',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 15,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['before main verb', 'after be', 'between auxiliary and main verb', 'sometimes flexible']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'adverb_frequency_position',
      category: 'adverb',
      contrastSet: ['before main verb', 'after be', 'between auxiliary and main verb', 'sometimes flexible'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const mainVerbStep = training.steps.find((step) => step.id === 'freq_easy_001')!;
    expect(feedbackForAnswer(mainVerbStep, 'drink always', 1).feedback.ru).toContain('always drink');
    const beStep = training.steps.find((step) => step.id === 'freq_contrast_001')!;
    expect(feedbackForAnswer(beStep, 'always is', 1).feedback.ru).toContain('is always');
    const neverStep = training.steps.find((step) => step.id === 'freq_mixed_003')!;
    expect(feedbackForAnswer(neverStep, "doesn't never", 1).feedback.ru).toContain('двойное');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('too/enough diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('too_enough')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'too_enough',
      category: 'modifier',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 34,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['too + adjective', 'adjective + enough', 'enough + noun', 'too much', 'too many', 'not enough', 'too ... to']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'too_enough',
      category: 'modifier',
      contrastSet: ['too + adjective', 'adjective + enough', 'enough + noun', 'too much', 'too many', 'not enough', 'too ... to'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const tooStep = training.steps.find((step) => step.id === 'too_enough_easy_001')!;
    expect(feedbackForAnswer(tooStep, 'enough', 1).feedback.ru).toContain('too hot');
    const enoughAdjectiveStep = training.steps.find((step) => step.id === 'too_enough_contrast_001')!;
    expect(feedbackForAnswer(enoughAdjectiveStep, 'enough good', 1).feedback.ru).toContain('good enough');
    const enoughNounStep = training.steps.find((step) => step.id === 'too_enough_contrast_004')!;
    expect(feedbackForAnswer(enoughNounStep, 'time enough', 1).feedback.ru).toContain('enough time');
    const manyStep = training.steps.find((step) => step.id === 'too_enough_mixed_001')!;
    expect(feedbackForAnswer(manyStep, 'too much', 1).feedback.ru).toContain('too many people');
    const mixedStep = training.steps.find((step) => step.id === 'too_enough_mixed_006')!;
    expect(feedbackForAnswer(mixedStep, "The room is too much small, and we don't have many enough chairs.", 1).feedback.ru).toContain('too small / enough chairs');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('very/really/quite diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('modifier_very_really_quite')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'modifier_very_really_quite',
      category: 'modifier',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 35,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(['very + adjective', 'really + adjective', 'quite + adjective', 'gradable adjective', 'strong adjective', 'intensifier position', 'too vs very']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'modifier_very_really_quite',
      category: 'modifier',
      contrastSet: ['very + adjective', 'really + adjective', 'quite + adjective', 'gradable adjective', 'strong adjective', 'intensifier position', 'too vs very'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const veryStep = training.steps.find((step) => step.id === 'modifier_vrq_easy_001')!;
    expect(feedbackForAnswer(veryStep, 'very much', 1).feedback.ru).toContain('very useful');
    const reallyStep = training.steps.find((step) => step.id === 'modifier_vrq_contrast_001')!;
    expect(feedbackForAnswer(reallyStep, 'really much', 1).feedback.ru).toContain('really tired');
    const quiteStep = training.steps.find((step) => step.id === 'modifier_vrq_contrast_004')!;
    expect(feedbackForAnswer(quiteStep, 'too', 1).feedback.ru).toContain('quite good');
    const veryTooStep = training.steps.find((step) => step.id === 'modifier_vrq_mixed_001')!;
    expect(feedbackForAnswer(veryTooStep, 'too', 1).feedback.ru).toContain('very hot');
    const mixedStep = training.steps.find((step) => step.id === 'modifier_vrq_mixed_006')!;
    expect(feedbackForAnswer(mixedStep, 'The course is really much useful, but the last test was quite much difficult.', 1).feedback.ru).toContain('really useful / quite difficult');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('conjunction logic diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('conjunction_logic')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'conjunction_logic',
      category: 'conjunction',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 16,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['and', 'but', 'because', 'so', 'if', 'when', 'although']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'conjunction_logic',
      category: 'conjunction',
      contrastSet: ['and', 'but', 'because', 'so', 'if', 'when', 'although'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const becauseStep = training.steps.find((step) => step.id === 'conj_contrast_001')!;
    expect(feedbackForAnswer(becauseStep, 'so', 1).feedback.ru).toContain('because');
    const soStep = training.steps.find((step) => step.id === 'conj_contrast_002')!;
    expect(feedbackForAnswer(soStep, 'because', 1).feedback.ru).toContain('so');
    const whenStep = training.steps.find((step) => step.id === 'conj_contrast_005')!;
    expect(feedbackForAnswer(whenStep, 'If', 1).feedback.ru).toContain('when');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('some/any quantifier diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('quantifier_some_any')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'quantifier_some_any',
      category: 'determiner',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 18,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['some', 'any', 'no', 'not any', 'someone/anyone', 'something/anything']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'quantifier_some_any',
      category: 'determiner',
      contrastSet: ['some', 'any', 'no', 'not any', 'something', 'anything'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const negativeStep = training.steps.find((step) => step.id === 'some_any_easy_003')!;
    expect(feedbackForAnswer(negativeStep, 'some', 1).feedback.ru).toContain('any money');
    const offerStep = training.steps.find((step) => step.id === 'some_any_contrast_004')!;
    expect(feedbackForAnswer(offerStep, 'any', 1).feedback.ru).toContain('some');
    const choiceStep = training.steps.find((step) => step.id === 'some_any_mixed_001')!;
    expect(feedbackForAnswer(choiceStep, 'some', 1).feedback.ru).toContain('any');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id !== step.correctAnswerId) {
          expect(step.wrongFeedbackByOption[option.id]?.ru).toBeTruthy();
        }
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('this/that/these/those diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('determiner_this_that_these_those')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'determiner_this_that_these_those',
      category: 'determiner',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 19,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['this', 'that', 'these', 'those', 'singular', 'plural', 'near', 'far']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'determiner_this_that_these_those',
      category: 'determiner',
      contrastSet: ['this', 'that', 'these', 'those', 'singular', 'plural', 'near', 'far'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const pluralNearStep = training.steps.find((step) => step.id === 'demo_contrast_001')!;
    expect(feedbackForAnswer(pluralNearStep, 'This', 1).feedback.ru).toContain('these');
    const pluralFarStep = training.steps.find((step) => step.id === 'demo_contrast_002')!;
    expect(feedbackForAnswer(pluralFarStep, 'That', 1).feedback.ru).toContain('those');
    const standalonePluralStep = training.steps.find((step) => step.id === 'demo_mixed_002')!;
    expect(feedbackForAnswer(standalonePluralStep, 'This', 1).feedback.ru).toContain('these are');
    const timeStep = training.steps.find((step) => step.id === 'demo_mixed_004')!;
    expect(feedbackForAnswer(timeStep, 'that', 1).feedback.ru).toContain('this week');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id === step.correctAnswerId) continue;
        expect(step.wrongFeedbackByOption[option.id]).toBeTruthy();
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('there is/there are diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('there_is_are')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'there_is_are',
      category: 'existential',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 20,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['there is', 'there are', "there isn't", "there aren't", 'is there', 'are there', 'have/has']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'there_is_are',
      category: 'existential',
      contrastSet: ['there is', 'there are', "there isn't", "there aren't", 'is there', 'are there', 'have/has'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const singularStep = training.steps.find((step) => step.id === 'there_easy_001')!;
    expect(feedbackForAnswer(singularStep, 'There are', 1).feedback.ru).toContain('there is');
    const pluralStep = training.steps.find((step) => step.id === 'there_easy_003')!;
    expect(feedbackForAnswer(pluralStep, 'There is', 1).feedback.ru).toContain('there are');
    const questionStep = training.steps.find((step) => step.id === 'there_contrast_002')!;
    expect(feedbackForAnswer(questionStep, 'There is', 1).feedback.ru).toContain('Are there');
    const uncountableStep = training.steps.find((step) => step.id === 'there_contrast_004')!;
    expect(feedbackForAnswer(uncountableStep, 'There are', 1).feedback.ru).toContain('there is');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id === step.correctAnswerId) continue;
        expect(step.wrongFeedbackByOption[option.id]).toBeTruthy();
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('singular/plural noun diagnosis training follows the MVP content contract', () => {
    const training = getDiagnosisTraining('noun_singular_plural_basic')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'noun_singular_plural_basic',
      category: 'noun',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 21,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk', 'es']);
    expect(training.contrastSet).toEqual(['singular noun', 'plural noun', '-s plural', '-es plural', '-ies plural', 'irregular plural', 'uncountable noun']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'noun_singular_plural_basic',
      category: 'noun',
      contrastSet: ['singular noun', 'plural noun', '-s plural', '-es plural', '-ies plural', 'irregular plural', 'uncountable noun'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const singularStep = training.steps.find((step) => step.id === 'noun_plural_easy_001')!;
    expect(feedbackForAnswer(singularStep, 'books', 1).feedback.ru).toContain('a book');
    const pluralStep = training.steps.find((step) => step.id === 'noun_plural_easy_002')!;
    expect(feedbackForAnswer(pluralStep, 'book', 1).feedback.ru).toContain('books');
    const esStep = training.steps.find((step) => step.id === 'noun_plural_contrast_004')!;
    expect(feedbackForAnswer(esStep, 'boxs', 1).feedback.ru).toContain('boxes');
    const uncountableStep = training.steps.find((step) => step.id === 'noun_plural_mixed_003')!;
    expect(feedbackForAnswer(uncountableStep, 'informations', 1).feedback.ru).toContain('uncountable');

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id === step.correctAnswerId) continue;
        expect(step.wrongFeedbackByOption[option.id]).toBeTruthy();
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("possessive apostrophe noun diagnosis training follows the MVP content contract", () => {
    const training = getDiagnosisTraining('noun_possessive_apostrophe_s')!;

    expect(training).toEqual(expect.objectContaining({
      id: 'noun_possessive_apostrophe_s',
      category: 'noun',
      version: '1.0.0',
      status: expect.stringMatching(/^(ready_for_mvp_review|active)$/),
      priority: 36,
    }));
    expect(training.supportedLocales).toEqual(['ru', 'uk']);
    expect(training.contrastSet).toEqual(["'s singular possessive", "plural possessive s'", 'of-phrase', 'apostrophe position', 'possessive adjective', 'is contraction']);
    expect(training.examples?.length).toBeGreaterThanOrEqual(6);
    expect(training.steps.length).toBeGreaterThanOrEqual(12);
    expect(training.masteryRules).toEqual(expect.objectContaining({
      minCorrect: 10,
      minCorrectStreak: 4,
      requireCorrectAfterWrong: true,
      requireMixedReview: true,
      unlockSmartTrainerAfterMastery: true,
    }));
    expect(training.smartTrainerConfig).toEqual(expect.objectContaining({
      source: 'diagnosis_training',
      microDiagnosisId: 'noun_possessive_apostrophe_s',
      category: 'noun',
      contrastSet: ["'s singular possessive", "plural possessive s'", 'of-phrase', 'apostrophe position', 'possessive adjective', 'is contraction'],
      minItems: 12,
      recommendedItems: 20,
    }));
    expect(training.guidedMode).toEqual(expect.objectContaining({ enabled: true }));
    expect(training.qualityChecklist?.hasDistractorSpecificFeedback).toBe(true);

    const johnStep = training.steps.find((step) => step.id === 'poss_s_easy_001')!;
    expect(feedbackForAnswer(johnStep, 'John', 1).feedback.ru).toContain("John's phone");
    const friendsStep = training.steps.find((step) => step.id === 'poss_s_contrast_002')!;
    expect(feedbackForAnswer(friendsStep, "friend's", 1).feedback.ru).toContain("friends'");
    const childrenStep = training.steps.find((step) => step.id === 'poss_s_mixed_001')!;
    expect(feedbackForAnswer(childrenStep, "childrens'", 1).feedback.ru).toContain("children's");
    const mixedStep = training.steps.find((step) => step.id === 'poss_s_mixed_006')!;
    expect(feedbackForAnswer(mixedStep, 'My friend car is near my parents house.', 1).feedback.ru).toContain("friend's car");

    for (const step of training.steps) {
      for (const option of step.answerOptions) {
        if (option.id === step.correctAnswerId) continue;
        expect(step.wrongFeedbackByOption[option.id]).toBeTruthy();
      }
      expect(step.retryFeedback.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('diagnosis mastery requires a mini-series, not one lucky answer', () => {
    const training = getDiagnosisTraining('article_the_specific')!;
    let state = createDiagnosisTrainingState();

    state = applyDiagnosisAnswer(training, state, 'the');
    expect(isDiagnosisTrainingMastered(training, state)).toBe(false);

    expect(isDiagnosisTrainingMastered(training, {
      ...state,
      correctCount: 10,
      correctStreak: 4,
      correctAfterWrong: true,
      mixedReviewPassed: false,
    })).toBe(false);

    expect(isDiagnosisTrainingMastered(training, {
      ...state,
      correctCount: 10,
      correctStreak: 4,
      correctAfterWrong: true,
      mixedReviewPassed: true,
    })).toBe(true);
  });

  it('uses diagnosis training only when a microdiagnosis has training content', () => {
    expect(Boolean(getDiagnosisTraining('preposition_time_place'))).toBe(true);
    expect(getDiagnosisTraining('preposition_time_place')).toEqual(expect.objectContaining({ id: 'preposition_time_place' }));
    expect(Boolean(getDiagnosisTraining('article_a_an'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('article_zero'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('preposition_time_in_on_at'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('preposition_place_in_on_at'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('preposition_duration_for_since'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('preposition_direction_to_into_from'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('preposition_direction'))).toBe(true);
    expect(getDiagnosisTraining('preposition_direction')).toEqual(expect.objectContaining({ id: 'preposition_direction' }));
    expect(Boolean(getDiagnosisTraining('preposition_common_verb_patterns'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('object_order_give_me_it'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('word_order_basic_statement'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('word_order_basic_question'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('imperative_basic'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('condition_zero_first'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('condition_second_basic'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('relative_clauses_who_which_that'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('reported_speech_basic'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('verb_present_simple_negative_question'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('verb_present_continuous_basic'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('verb_present_simple_vs_continuous'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('verb_past_simple_regular_irregular'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('verb_past_simple_negative_question'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('verb_present_perfect_basic'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('present_perfect_vs_past_simple'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('present_perfect_questions_negatives'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('present_perfect_for_since'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('past_continuous_basic'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('past_simple_vs_past_continuous'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('used_to_basic'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('future_present_continuous_arrangements'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('verb_was_were'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('future_will_going_to'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('infinitive_vs_gerund_basic'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('too_enough'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('verb_present_simple_statement'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('verb_third_person'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('to_be_present_agreement'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('modal_may_might_probability'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('modal_can_could_ability_request'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('modal_should_must_have_to'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('modal_base_form'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('pronoun_case'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('pronoun_possessive'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('adjective_comparison'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('adjective_vs_adverb'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('adverb_frequency_position'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('conjunction_logic'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('quantifier_some_any'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('determiner_this_that_these_those'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('there_is_are'))).toBe(true);
    expect(Boolean(getDiagnosisTraining('noun_singular_plural_basic'))).toBe(true);
  });

  it('does not mount coach toast prompts during exams', () => {
    const exam = fs.readFileSync('app/exam.tsx', 'utf8');
    const levelExam = fs.readFileSync('app/level_exam.tsx', 'utf8');

    expect(exam).not.toContain('CoachToast');
    expect(exam).not.toContain('checkCoachToastNeeded');
    expect(levelExam).not.toContain('CoachToast');
    expect(levelExam).not.toContain('checkCoachToastNeeded');
  });

  it('analytics trainer CTA preserves category, focus words, priority, and recovery', () => {
    expect(buildAnalyticsTrainerRouteParams({
      category: 'article',
      mistakeCount: 3,
      weaknessScore: 72,
      priorityScore: 61,
      recoveryScore: 11,
      exactMistakeCount: 3,
      recentMistakeCount: 2,
      masteryLevel: 2,
      masteryXp: 32,
      masteryStreak: 2,
      practiceCorrect: 4,
      practiceWrong: 1,
      pct: 40,
      topWords: ['a', 'the', 'an', ' ', 'extra'],
    })).toEqual({
      mode: 'weak',
      source: 'analytics',
      category: 'article',
      focusWords: 'a,the,an,extra',
      priority: '61',
      recovery: '11',
    });

    expect(buildAnalyticsTrainerRouteParams(null)).toEqual({
      mode: 'weak',
      source: 'analytics',
    });
  });

  it('resolves concrete mistaken tokens from typed and slot answers', () => {
    expect(resolvePhraseMistakeToken('He is my friend', 'He my friend')).toEqual(
      expect.objectContaining({ tokenText: 'is', tokenIndex: 1 }),
    );
    expect(resolveSlotMistake('I am a teacher', 2, 'teacher')).toEqual(
      expect.objectContaining({ tokenText: 'a', tokenIndex: 2, picked: 'teacher' }),
    );
  });

  it('resolves choice4 mistakes by grammar target instead of first sentence diff', () => {
    expect(resolveChoiceMistakeToken(
      'She speaks French.',
      'He work every day.',
      'Present Simple — утверждение',
    )).toEqual(expect.objectContaining({ tokenText: 'speaks', tokenIndex: 1 }));

    expect(resolveChoiceMistakeToken(
      'He works at night.',
      'She arrived in Monday.',
      'Предлоги времени (at/in/on)',
    )).toEqual(expect.objectContaining({ tokenText: 'at', tokenIndex: 2 }));

    expect(resolveChoiceMistakeToken(
      'He is an honest man.',
      'She is a engineer.',
      'Артикли (a/an/the)',
    )).toEqual(expect.objectContaining({ tokenText: 'an', tokenIndex: 2, picked: 'a' }));

    expect(resolveChoiceMistakeToken(
      'She gave up smoking.',
      'She give up to smoke.',
      'Фразовые глаголы',
    )).toEqual(expect.objectContaining({ tokenText: 'up', tokenIndex: 2 }));
  });

  it('keeps lesson POS coverage release-ready without unknown or low-confidence tokens', () => {
    const audit = auditPhrasePosCoverage();
    expect(audit.totalTokens).toBeGreaterThan(0);
    if (!audit.releaseReady) {
      throw new Error(buildPosCoverageAuditFailure(audit));
    }
    expect(audit.unresolvedTokens).toBe(0);
    expect(audit.unknownSourceTokens).toBe(0);
    expect(audit.lowConfidenceTokens).toBe(0);
    expect(audit.resolvedPct).toBe(100);
  });

  it('normalizes multilingual and legacy POS labels', () => {
    expect(normalizeWordCategory('pronombre', 'I').category).toBe('pronoun');
    expect(normalizeWordCategory('sustantivo', 'teacher').category).toBe('noun');
    expect(normalizeWordCategory('preposicion', 'to').category).toBe('preposition');
    expect(normalizeWordCategory('irregular_verbs', 'went').category).toBe('verb');
    expect(normalizeWordCategory('verbo_continuo', 'working').category).toBe('verb');
    expect(normalizeWordCategory('infinitive_vs_gerund', 'to learn').category).toBe('verb');
    expect(normalizeWordCategory('modifier too enough', 'too').category).toBe('modifier');
    expect(normalizeWordCategory('adjectives', 'near').category).toBe('adjective');
    expect(normalizeWordCategory('verbs', 'can').category).toBe('modal');
    expect(normalizeWordCategory(undefined, 'can').category).toBe('modal');
    expect(normalizeWordCategory('determiner', 'some').category).toBe('determiner');
    expect(normalizeWordCategory('quantifier', 'any').category).toBe('determiner');
    expect(normalizeWordCategory(undefined, 'these').category).toBe('determiner');
    expect(normalizeWordCategory('existencial', 'there are').category).toBe('existential');
    expect(normalizeWordCategory('syntax object order', 'it to me').category).toBe('syntax');
    expect(normalizeWordCategory('syntax basic word order', 'Coffee I like').category).toBe('syntax');
    expect(normalizeWordCategory('syntax question word order', 'Where you live').category).toBe('syntax');
  });

  it('compacts the mistake log without letting phrase-only legacy entries displace exact signals', async () => {
    const oldEntry = {
      phrase: 'Old phrase',
      lessonId: 1,
      mode: 'lesson',
      what: 'wrong_pick',
      ts: NOW - 40 * MS_DAY,
    };
    const legacyEntries = Array.from({ length: 400 }, (_, i) => ({
      phrase: `Legacy phrase ${i}`,
      lessonId: 1,
      mode: 'lesson',
      what: 'wrong_pick',
      ts: NOW - MS_DAY + i,
    }));
    const exactEntries = Array.from({ length: 1900 }, (_, i) => ({
      phrase: `Exact phrase ${i}`,
      lessonId: 1,
      mode: 'lesson',
      what: 'wrong_pick',
      tokenText: 'a',
      expected: 'a',
      rawCategory: 'article',
      category: 'article',
      version: 2,
      ts: NOW - MS_DAY + 500 + i,
    }));
    mockStorage.mistake_log_v1 = JSON.stringify([oldEntry, ...legacyEntries, ...exactEntries]);

    await compactMistakeLog();

    const entries = await loadMistakeLog();
    const legacyCount = entries.filter((entry) => !entry.tokenText && !entry.expected && !entry.rawCategory && !entry.category).length;
    expect(entries.length).toBeLessThanOrEqual(2000);
    expect(entries.some((entry) => entry.phrase === 'Old phrase')).toBe(false);
    expect(entries.filter((entry) => entry.tokenText === 'a').length).toBe(1900);
    expect(legacyCount).toBeLessThanOrEqual(100);
  });
});

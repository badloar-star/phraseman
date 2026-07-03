import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';
import {
  countDueItemsToday,
  getDueItems,
  getAllItems,
  getStats,
  getTrainerItems,
  getTrainerModeCounts,
  recordMistake as recordRecallMistake,
  seedAdminTestReviewSession,
} from '../app/active_recall';
import { activeRecallItemsKey } from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

const ROOT = path.join(__dirname, '..');
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStorage[key] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  });
});

describe('Gustav SRS review target isolation', () => {
  it('keeps review session reads, writes, and coach decisions on the active study target', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'review.tsx'), 'utf8');

    expect(source).toContain('const { studyTarget } = useStudyTarget()');
    expect(source).toContain('getDueItems(SESSION_LIMIT, { commitSessionOverflow: true }, studyTarget)');
    expect(source).toContain('getTrainerItems(trainerMode, SESSION_LIMIT, trainerLessonId, trainerCategory, studyTarget)');
    expect(source).toContain("logMistake(item.phrase, item.lessonId, 'trainer', 'wrong_pick', tokenMeta, studyTarget)");
    expect(source).toContain('markReviewed(item.phrase, ok, tokenMeta, studyTarget)');
    expect(source).toContain('removeItem(item.phrase, studyTarget)');
    expect(source).toContain('checkCoachToastNeededWithAnalytics(wrongPhrasesRef.current, studyTarget, lang)');
  });

  it('does not label French recall typing as English practice', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'review.tsx'), 'utf8');

    expect(source).toContain("import { storageStudyTarget } from './target_storage_keys'");
    expect(source).toContain("if (storageStudyTarget(studyTarget) === 'fr')");
    expect(source).toContain('Вспомните и напишите по-французски');
    expect(source).toContain('Згадайте і напишіть французькою');
    expect(source).toContain('recallCueInstruction(pageMode, lang, studyTarget)');
  });

  it('keeps legacy English SRS phrase corrections out of the French recall container', async () => {
    await recordRecallMistake('The train arrives at seven AM', 'Поезд прибывает в семь утра', 1);
    await recordRecallMistake('The train arrives at seven AM', 'Поезд прибывает в семь утра', 1, undefined, 'lesson', undefined, undefined, 'fr');

    expect((await getAllItems()).map((item) => item.phrase)).toEqual([
      'The train arrives at seven fifteen AM',
    ]);
    expect((await getAllItems('fr')).map((item) => item.phrase)).toEqual([
      'The train arrives at seven AM',
    ]);
    expect(mockStorage[activeRecallItemsKey('fr')]).toContain('The train arrives at seven AM');
    expect(mockStorage[activeRecallItemsKey('fr')]).not.toContain('seven fifteen');
  });

  it('blocks the English admin SRS bench from seeding the French recall container', async () => {
    await expect(seedAdminTestReviewSession('fr')).resolves.toBe(false);

    expect(mockStorage[activeRecallItemsKey('fr')]).toBeUndefined();
    expect(mockStorage.active_recall_items).toBeUndefined();

    await expect(seedAdminTestReviewSession('es')).resolves.toBe(true);

    expect(mockStorage.active_recall_items).toContain('He is in the kitchen');
    expect(mockStorage[activeRecallItemsKey('fr')]).toBeUndefined();
  });

  it('opens French SRS UI/session reads from isolated storage', async () => {
    await recordRecallMistake('Je suis ici', 'Я здесь', 1, 'Я тут', 'lesson', undefined, undefined, 'fr');

    expect((await getAllItems('fr')).map((item) => item.phrase)).toEqual(['Je suis ici']);
    await expect(getDueItems(7, { commitSessionOverflow: true }, 'fr')).resolves.toEqual([]);
    await expect(getTrainerItems('fresh', 7, undefined, undefined, 'fr')).resolves.toHaveLength(1);
    await expect(countDueItemsToday('fr')).resolves.toBe(0);
    await expect(getTrainerModeCounts('fr')).resolves.toMatchObject({
      due: 0,
      fresh: 1,
      by_topic: 1,
    });
    await expect(getStats('fr')).resolves.toEqual({
      total: 1,
      dueTodayCount: 0,
      learnedCount: 0,
      hardestPhrases: expect.arrayContaining([expect.objectContaining({ phrase: 'Je suis ici' })]),
    });
  });
});

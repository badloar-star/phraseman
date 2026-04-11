import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isLessonUnlocked,
  unlockLesson,
  tryUnlockNextLesson,
  getLessonLockInfo,
  getLockMessageText,
  tryUnlockLevelExam,
  tryUnlockLingmanExam,
  isLingmanExamAvailable,
} from '../../app/lesson_lock_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../app/medal_utils', () => ({
  CEFR_RANGES: {
    A1: [1, 8],
    A2: [9, 16],
    B1: [17, 24],
    B2: [25, 32],
  },
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockMultiGet = AsyncStorage.multiGet as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockSetItem.mockResolvedValue(undefined);
  mockMultiGet.mockResolvedValue([]);
});

describe('isLessonUnlocked', () => {
  it('lesson 1 is always unlocked', async () => {
    const result = await isLessonUnlocked(1);
    expect(result).toBe(true);
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it('returns true when lesson is in unlocked list', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify([2, 3, 5]));
    expect(await isLessonUnlocked(3)).toBe(true);
  });

  it('returns false when lesson is not in unlocked list', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify([2, 3]));
    expect(await isLessonUnlocked(5)).toBe(false);
  });

  it('returns false when storage is empty', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await isLessonUnlocked(2)).toBe(false);
  });

  it('returns false on storage error', async () => {
    mockGetItem.mockRejectedValue(new Error('storage error'));
    expect(await isLessonUnlocked(2)).toBe(false);
  });
});

describe('unlockLesson', () => {
  it('adds lesson to empty list', async () => {
    mockGetItem.mockResolvedValue(null);
    await unlockLesson(2);
    expect(mockSetItem).toHaveBeenCalledWith('unlocked_lessons', JSON.stringify([2]));
  });

  it('appends to existing list', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify([2, 3]));
    await unlockLesson(4);
    expect(mockSetItem).toHaveBeenCalledWith('unlocked_lessons', JSON.stringify([2, 3, 4]));
  });

  it('does not add duplicate', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify([2, 3]));
    await unlockLesson(2);
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});

describe('tryUnlockNextLesson', () => {
  it('unlocks next lesson when score >= 2.5', async () => {
    mockGetItem.mockResolvedValue(null); // next lesson not unlocked yet
    const result = await tryUnlockNextLesson(5, 3.0);
    expect(result).toBe(true);
    expect(mockSetItem).toHaveBeenCalled();
  });

  it('does not unlock when score < 2.5', async () => {
    const result = await tryUnlockNextLesson(5, 2.0);
    expect(result).toBe(false);
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('does not unlock lesson 33 (past last lesson)', async () => {
    const result = await tryUnlockNextLesson(32, 5.0);
    expect(result).toBe(false);
  });

  it('returns false if next lesson already unlocked', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify([6]));
    const result = await tryUnlockNextLesson(5, 5.0);
    expect(result).toBe(false);
  });

  it('unlocks with minimum passing score 2.5', async () => {
    mockGetItem.mockResolvedValue(null);
    const result = await tryUnlockNextLesson(1, 2.5);
    expect(result).toBe(true);
  });
});

describe('getLessonLockInfo', () => {
  it('returns correct info for locked lesson', async () => {
    mockGetItem.mockResolvedValue(null);
    const info = await getLessonLockInfo(5);
    expect(info.isUnlocked).toBe(false);
    expect(info.prevLessonId).toBe(4);
    expect(info.requiredScore).toBe(2.5);
  });
});

describe('getLockMessageText', () => {
  const info = { isUnlocked: false, prevLessonId: 3, prevScore: 0, requiredScore: 2.5 };

  it('returns Russian message', () => {
    const msg = getLockMessageText(info, 'ru');
    expect(msg).toContain('3');
    expect(msg).toContain('2.5');
  });

  it('returns Ukrainian message', () => {
    const msg = getLockMessageText(info, 'uk');
    expect(msg).toContain('3');
    expect(msg).toContain('2.5');
  });
});

describe('tryUnlockLevelExam', () => {
  it('returns null for lesson outside CEFR ranges', async () => {
    const result = await tryUnlockLevelExam(99);
    expect(result).toBeNull();
  });

  it('returns null if exam already unlocked', async () => {
    mockGetItem.mockResolvedValue('1');
    const result = await tryUnlockLevelExam(5);
    expect(result).toBeNull();
  });

  it('returns null if not all lessons have score >= 4.5', async () => {
    mockGetItem.mockResolvedValueOnce(null); // alreadyKey
    mockMultiGet.mockResolvedValue([
      ['lesson1_best_score', '5.0'],
      ['lesson2_best_score', '4.0'], // below threshold
      ['lesson3_best_score', '5.0'],
      ['lesson4_best_score', '5.0'],
      ['lesson5_best_score', '5.0'],
      ['lesson6_best_score', '5.0'],
      ['lesson7_best_score', '5.0'],
      ['lesson8_best_score', '5.0'],
    ]);
    const result = await tryUnlockLevelExam(5);
    expect(result).toBeNull();
  });

  it('unlocks exam when all lessons >= 4.5', async () => {
    mockGetItem.mockResolvedValueOnce(null); // alreadyKey not set
    mockMultiGet.mockResolvedValueOnce(
      Array.from({ length: 8 }, (_, i) => [`lesson${i + 1}_best_score`, '5.0'])
    );
    const result = await tryUnlockLevelExam(5);
    expect(result).toBe('A1');
    expect(mockSetItem).toHaveBeenCalledWith('level_exam_A1_available', '1');
  });
});

describe('tryUnlockLingmanExam', () => {
  it('returns false if already unlocked', async () => {
    mockGetItem.mockResolvedValue('1');
    expect(await tryUnlockLingmanExam()).toBe(false);
  });

  it('returns false if not all 32 lessons are perfect', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    mockMultiGet
      .mockResolvedValueOnce(
        Array.from({ length: 32 }, (_, i) => [`lesson${i + 1}_best_score`, i === 0 ? '4.5' : '5.0'])
      )
      .mockResolvedValueOnce([]);
    expect(await tryUnlockLingmanExam()).toBe(false);
  });

  it('returns false if not all exams passed', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    mockMultiGet
      .mockResolvedValueOnce(Array.from({ length: 32 }, (_, i) => [`lesson${i + 1}_best_score`, '5.0']))
      .mockResolvedValueOnce([
        ['level_exam_A1_passed', '1'],
        ['level_exam_A2_passed', '1'],
        ['level_exam_B1_passed', null],
        ['level_exam_B2_passed', '1'],
      ]);
    expect(await tryUnlockLingmanExam()).toBe(false);
  });

  it('unlocks exam when all conditions met', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    mockMultiGet
      .mockResolvedValueOnce(Array.from({ length: 32 }, (_, i) => [`lesson${i + 1}_best_score`, '5.0']))
      .mockResolvedValueOnce([
        ['level_exam_A1_passed', '1'],
        ['level_exam_A2_passed', '1'],
        ['level_exam_B1_passed', '1'],
        ['level_exam_B2_passed', '1'],
      ]);
    expect(await tryUnlockLingmanExam()).toBe(true);
    expect(mockSetItem).toHaveBeenCalledWith('lingman_exam_available', '1');
  });
});

describe('isLingmanExamAvailable', () => {
  it('returns false if any lesson below 5.0', async () => {
    mockMultiGet
      .mockResolvedValueOnce(Array.from({ length: 32 }, (_, i) => [`lesson${i + 1}_best_score`, i < 31 ? '5.0' : '4.9']))
      .mockResolvedValueOnce([
        ['level_exam_A1_passed', '1'],
        ['level_exam_A2_passed', '1'],
        ['level_exam_B1_passed', '1'],
        ['level_exam_B2_passed', '1'],
      ]);
    expect(await isLingmanExamAvailable()).toBe(false);
  });

  it('returns true when all conditions met', async () => {
    mockMultiGet
      .mockResolvedValueOnce(Array.from({ length: 32 }, (_, i) => [`lesson${i + 1}_best_score`, '5.0']))
      .mockResolvedValueOnce([
        ['level_exam_A1_passed', '1'],
        ['level_exam_A2_passed', '1'],
        ['level_exam_B1_passed', '1'],
        ['level_exam_B2_passed', '1'],
      ]);
    expect(await isLingmanExamAvailable()).toBe(true);
  });
});

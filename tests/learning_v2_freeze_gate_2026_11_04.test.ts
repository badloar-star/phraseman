// Заморозка Learning V2 (владелец 04.11, «хотя бы 1 завершённое занятие»): V2 виден только тем, у кого завершено не меньше V2_UNLOCK_MIN_COMPLETED_EPISODES занятий.
// Новый пользователь — V2 закрыт и планировщик досылки не нужен; с завершённым занятием — вход открыт; фильтр отчётов отсекает источник learning_v2.
const store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, store.get(key) ?? null])),
  },
}));

import * as visibility from '../app/learning_v2_visibility_switch';
import {
  V2_UNLOCK_MIN_COMPLETED_EPISODES,
  meetsV2UnlockThreshold,
  peekLearningV2ProgressFootprint,
  refreshLearningV2ProgressGate,
  resetLearningV2ProgressGateForTests,
} from '../app/learning_v2_progress_gate';
import { isLearningV2ReportSource } from '../app/learning_v2_report_filter';
import { LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1, packCourseMasksV1 } from '../modules/learning-v2/progress/course_progress_masks_v1';
import { learningV2LanguageScopedStorageKeyV1 } from '../modules/learning-v2/progress/course_local_progress_v1';

const STABLE_ID = 'stable-uid-freeze-test';
const range = (from: number, count: number): number[] => Array.from({ length: count }, (_, i) => from + i);
const putMasks = (completed: number[], language: 'en' | 'es' = 'en') => {
  store.set(
    learningV2LanguageScopedStorageKeyV1(LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1, language),
    packCourseMasksV1({ completed: new Set(completed), opened: new Set<number>() }),
  );
};

beforeEach(() => {
  store.clear();
  resetLearningV2ProgressGateForTests();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('порог открытия V2 — одно завершённое занятие (решение владельца 04.11)', () => {
  it('константа равна 1: ноль занятий — закрыто, одно — открыто', () => {
    expect(V2_UNLOCK_MIN_COMPLETED_EPISODES).toBe(1);
    expect(meetsV2UnlockThreshold(0)).toBe(false);
    expect(meetsV2UnlockThreshold(1)).toBe(true);
    expect(meetsV2UnlockThreshold(1, 2)).toBe(false);
  });
});

describe('проверка прогресса открывает или закрывает V2', () => {
  it('новый пользователь: V2 закрыт, следа нет, подписчики не будятся', async () => {
    const listener = jest.fn();
    const unsubscribe = visibility.subscribeLearningV2Visibility(listener);
    const footprint = await refreshLearningV2ProgressGate(STABLE_ID, 'test_new_user');
    expect(footprint).toEqual({ completedSessions: 0, unlocked: false });
    expect(visibility.LEARNING_V2_HIDDEN).toBe(true);
    expect(peekLearningV2ProgressFootprint().completedSessions).toBe(0);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('завершено одно занятие: V2 открывается живой привязкой и будит подписчиков один раз', async () => {
    putMasks([56 * 3 + 7]);
    const listener = jest.fn();
    const unsubscribe = visibility.subscribeLearningV2Visibility(listener);
    const footprint = await refreshLearningV2ProgressGate(STABLE_ID, 'test_one_episode');
    expect(footprint).toEqual({ completedSessions: 1, unlocked: true });
    expect(visibility.LEARNING_V2_HIDDEN).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    await refreshLearningV2ProgressGate(STABLE_ID, 'test_one_episode_again');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('много занятий: V2 открыт, след посчитан для планировщика досылки', async () => {
    putMasks(range(0, 20));
    const footprint = await refreshLearningV2ProgressGate(STABLE_ID, 'test_many');
    expect(footprint).toEqual({ completedSessions: 20, unlocked: true });
    expect(visibility.LEARNING_V2_HIDDEN).toBe(false);
  });

  it('испанский курс считается так же', async () => {
    putMasks([3], 'es');
    await refreshLearningV2ProgressGate(STABLE_ID, 'test_es');
    expect(visibility.LEARNING_V2_HIDDEN).toBe(false);
  });

  it('смена аккаунта на пустой закрывает V2; без аккаунта V2 закрыт', async () => {
    putMasks([0]);
    await refreshLearningV2ProgressGate(STABLE_ID, 'test_open');
    expect(visibility.LEARNING_V2_HIDDEN).toBe(false);
    await refreshLearningV2ProgressGate(null, 'test_no_account');
    expect(visibility.LEARNING_V2_HIDDEN).toBe(true);
    expect(peekLearningV2ProgressFootprint().completedSessions).toBe(0);
  });
});

describe('клиентские отчёты: источник learning_v2 не уходит владельцу', () => {
  it('отсекает экраны, id данных и контексты V2', () => {
    for (const parts of [
      { screen: 'learning_v2_session' },
      { screen: 'learning_v2_intro' },
      { dataId: 'lv2:l1:s2:speed_match:lesson-01:session:02:i10' },
      { context: 'learning_v2_completion_background_scheduler:flush' },
      { feature: 'learning-v2' },
    ]) {
      expect(isLearningV2ReportSource(parts)).toBe(true);
    }
  });

  it('обычные отчёты не трогает', () => {
    for (const parts of [
      { screen: 'lesson_menu' },
      { screen: 'settings_support' },
      { dataId: 'dialogue_v2:de:work_01' },
      { context: 'cloud_sync:restore', feature: 'cloud_sync' },
      {},
    ]) {
      expect(isLearningV2ReportSource(parts)).toBe(false);
    }
  });
});

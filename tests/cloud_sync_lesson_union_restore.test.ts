import { readFileSync } from 'fs';
import { join } from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __cloudSyncTestHooks, getRuntimeSyncKeys } from '../app/cloud_sync';
import {
  achievementLessonPerfectPassesKey,
  lessonBestScoreKey,
  lessonPassCountKey,
  lessonProgressKey,
  levelExamKey,
  unlockedLessonsKey,
} from '../app/target_storage_keys';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

const { isMonotonicLessonRestoreKey, mergeLessonRestoreValue } = __cloudSyncTestHooks;
const makeCloudUserDoc = (progress: Record<string, unknown>) => ({
  exists: true,
  data: () => ({ progress }),
});

// #11 multi-device: уроки должны доезжать до второго устройства даже когда
// локальный XP ≥ облачного (активный юзер на двух девайсах). XP-гейт restore
// (cloud_sync.ts shouldRestoreCloudProgress) в этом случае запрещает полный
// merge — поэтому sticky-ветка подмешивает уроковые ключи, чей merge строго
// монотонен (union/max/OR/лучшее качество): применить их нельзя откатить
// прогресс ни на одном устройстве.
//
// Этот тест — двойной контракт:
//  1) isMonotonicLessonRestoreKey классифицирует ровно монотонные семьи;
//  2) для КАЖДОГО классифицированного семейства mergeLessonRestoreValue
//     действительно имеет монотонную ветку (локальное лучшее значение не
//     проигрывает облачному худшему). Если паттерны в merge-функции и в
//     классификаторе разъедутся — поведенческие проверки падают.
//
// НОВЫЙ ТИП КОНТЕНТА (напр. Learning V2): добавь семью ключей одной строкой
// в isMonotonicLessonRestoreKey + ветку стратегии в mergeLessonRestoreValue
// и расширь этот тест. НЕ-монотонные ключи (cellIndex, даты, стрики, weekly)
// в sticky-merge не добавлять.

describe('isMonotonicLessonRestoreKey — классификация семей (#11 multi-device)', () => {
  it('классифицирует en-уроковые ключи как монотонные', () => {
    expect(isMonotonicLessonRestoreKey('unlocked_lessons')).toBe(true);
    expect(isMonotonicLessonRestoreKey('lesson5_best_score')).toBe(true);
    expect(isMonotonicLessonRestoreKey('lesson12_pass_count')).toBe(true);
    expect(isMonotonicLessonRestoreKey('lesson3_progress')).toBe(true);
    expect(isMonotonicLessonRestoreKey('achievement_lesson_7_perfect_passes_v1')).toBe(true);
  });

  it('классифицирует fr-scoped варианты тех же семей', () => {
    expect(isMonotonicLessonRestoreKey(unlockedLessonsKey('fr'))).toBe(true);
    expect(isMonotonicLessonRestoreKey(lessonBestScoreKey(5, 'fr'))).toBe(true);
    expect(isMonotonicLessonRestoreKey(lessonPassCountKey(5, 'fr'))).toBe(true);
    expect(isMonotonicLessonRestoreKey(lessonProgressKey(5, 'fr'))).toBe(true);
    expect(isMonotonicLessonRestoreKey(achievementLessonPerfectPassesKey(5, 'fr'))).toBe(true);
    // scoped числовой id прогресса урока (lesson_progress_v2::fr::5)
    expect(isMonotonicLessonRestoreKey('lesson_progress_v2::fr::5')).toBe(true);
  });

  it('классифицирует экзамены уровней (оба таргета)', () => {
    for (const field of ['passed', 'available', 'pct', 'best_pct', 'pass_count', 'attempt_count', 'medal_tier'] as const) {
      expect(isMonotonicLessonRestoreKey(levelExamKey('A1', field, 'en'))).toBe(true);
      expect(isMonotonicLessonRestoreKey(levelExamKey('B2', field, 'fr'))).toBe(true);
    }
  });

  it('не пропускает неизвестное поле экзамена без отдельной monotonic-стратегии', () => {
    expect(isMonotonicLessonRestoreKey('level_exam_A1_last_viewed_at')).toBe(false);
    expect(isMonotonicLessonRestoreKey('level_exams_v2::fr::level_exam_A1_last_viewed_at')).toBe(false);
    expect(isMonotonicLessonRestoreKey('level_exam_A1_completed_at')).toBe(false);
    expect(isMonotonicLessonRestoreKey('level_exams_v2::fr::level_exam_A1_completed_at')).toBe(false);
  });

  it('НЕ классифицирует не-монотонные ключи', () => {
    // cellIndex — текущая позиция в уроке, может законно уменьшаться
    expect(isMonotonicLessonRestoreKey('lesson5_cellIndex')).toBe(false);
    // скаляры, которые могут падать/сбрасываться
    expect(isMonotonicLessonRestoreKey('streak_count')).toBe(false);
    expect(isMonotonicLessonRestoreKey('weekly_xp')).toBe(false);
    expect(isMonotonicLessonRestoreKey('user_total_xp')).toBe(false);
    expect(isMonotonicLessonRestoreKey('last_active_date')).toBe(false);
    // служебные/премиум
    expect(isMonotonicLessonRestoreKey('premium_plan')).toBe(false);
    expect(isMonotonicLessonRestoreKey('app_version')).toBe(false);
    expect(isMonotonicLessonRestoreKey('daily_tasks_progress_2026-07-21')).toBe(false);
  });

  it('монотонные семьи реально присутствуют в runtime sync-ключах', () => {
    const runtime = new Set(getRuntimeSyncKeys());
    expect(runtime.has('unlocked_lessons')).toBe(true);
    expect(runtime.has('lesson1_best_score')).toBe(true);
    expect(runtime.has('lesson1_pass_count')).toBe(true);
    expect(runtime.has('lesson1_progress')).toBe(true);
  });

});

describe('monotonic lesson merge — никогда не откатывает прогресс (#11 multi-device)', () => {
  it('unlocked_lessons: union в обе стороны', () => {
    expect(mergeLessonRestoreValue('unlocked_lessons', '[1,2,5]', '[2,3]'))
      .toBe(JSON.stringify([1, 2, 3, 5]));
    // локальный список шире облачного (девайс впереди) — не откатывается
    expect(mergeLessonRestoreValue('unlocked_lessons', '[1,2]', '[1,2,7]'))
      .toBe(JSON.stringify([1, 2, 7]));
  });

  it('unlocked_lessons: девайс без локального значения забирает облачное', () => {
    expect(mergeLessonRestoreValue('unlocked_lessons', '[4,8]', null)).toBe('[4,8]');
  });

  it('lesson{N}_best_score: max float, локальный лучший не проигрывает', () => {
    expect(mergeLessonRestoreValue('lesson5_best_score', '0.7', '0.9')).toBe('0.9');
    expect(mergeLessonRestoreValue('lesson5_best_score', '0.9', '0.7')).toBe('0.9');
    expect(mergeLessonRestoreValue('lesson5_best_score', '0.85', null)).toBe('0.85');
  });

  it('lesson{N}_pass_count: max int', () => {
    expect(mergeLessonRestoreValue('lesson5_pass_count', '2', '6')).toBe('6');
    expect(mergeLessonRestoreValue('lesson5_pass_count', '6', '2')).toBe('6');
  });

  it('lesson{N}_progress: побеждает лучшее качество ответов (не слепое облако)', () => {
    const better = JSON.stringify(['correct', 'correct', 'wrong']);
    const worse = JSON.stringify(['correct', 'wrong', 'wrong']);
    expect(mergeLessonRestoreValue('lesson3_progress', worse, better)).toBe(better);
    expect(mergeLessonRestoreValue('lesson3_progress', better, worse)).toBe(better);
  });

  it('level_exam passed: OR (однажды сдан — сдан везде)', () => {
    expect(mergeLessonRestoreValue('level_exam_A1_passed', 'true', 'false')).toBe('true');
    expect(mergeLessonRestoreValue('level_exam_A1_passed', 'false', 'true')).toBe('true');
  });

  it('level_exam pct: max', () => {
    expect(mergeLessonRestoreValue('level_exam_A2_pct', '80', '95')).toBe('95');
    expect(mergeLessonRestoreValue('level_exam_A2_pct', '95', '80')).toBe('95');
  });

  it('achievement perfect passes: union множеств', () => {
    expect(mergeLessonRestoreValue('achievement_lesson_4_perfect_passes_v1', '[1,2]', '[2,3]'))
      .toBe(JSON.stringify([1, 2, 3]));
  });

  it('не-монотонный ключ по-прежнему cloud-wins (поведение не изменилось)', () => {
    expect(mergeLessonRestoreValue('streak_count', '3', '40')).toBe('3');
  });
});

describe('sticky-ветка restore подмешивает уроковые ключи (контракт по исходнику)', () => {
  const source = readFileSync(join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');

  it('sticky-ветка (localXP ≥ cloudXP) содержит монотонный уроковый merge', () => {
    const gateIdx = source.indexOf('if (!shouldRestoreCloudProgress)');
    const writeIdx = source.indexOf('await AsyncStorage.multiSet(sanitizeStoragePairs(stickyPairs))');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(writeIdx).toBeGreaterThan(gateIdx);
    const stickyBranch = source.slice(gateIdx, writeIdx);
    expect(stickyBranch).toContain('getRuntimeSyncKeys().filter(isMonotonicLessonRestoreKey)');
    expect(stickyBranch).toContain('mergeLessonRestoreValue(key, cloudProgressStorageValue(key, cloudVal), localLessonStickyMap[key])');
  });

  it('классификатор и merge-функция связаны комментарием о синхронности', () => {
    expect(source).toContain('Держать СИНХРОННЫМ с монотонными ветками mergeLessonRestoreValue');
  });
});

describe('sticky lesson restore — local XP не блокирует уроки с другого устройства', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('при localXP выше cloudXP добавляет облачный урок и сохраняет локально лучший результат', async () => {
    const localProgress = JSON.stringify(['correct', 'correct', 'wrong']);
    const cloudProgress = JSON.stringify(['correct', 'wrong', 'wrong']);
    await AsyncStorage.multiSet([
      ['user_total_xp', '200'],
      ['streak_count', '0'],
      ['unlocked_lessons', JSON.stringify([1, 2])],
      ['lesson3_best_score', '0.9'],
      ['lesson3_pass_count', '4'],
      ['lesson3_progress', localProgress],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '100',
      streak_count: '0',
      unlocked_lessons: JSON.stringify([1, 4]),
      lesson3_best_score: '0.7',
      lesson3_pass_count: '2',
      lesson3_progress: cloudProgress,
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('unlocked_lessons')).resolves.toBe(JSON.stringify([1, 2, 4]));
    await expect(AsyncStorage.getItem('lesson3_best_score')).resolves.toBe('0.9');
    await expect(AsyncStorage.getItem('lesson3_pass_count')).resolves.toBe('4');
    await expect(AsyncStorage.getItem('lesson3_progress')).resolves.toBe(localProgress);
  });
});

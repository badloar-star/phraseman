/**
 * Сторож правила доступа к основному курсу.
 *
 * ВНИМАНИЕ: до 2026-09-20 этот файл охранял ПРОТИВОПОЛОЖНОЕ правило — «все 32
 * урока открыты всем». Теперь Free получает 1–3, Plus — старты разделов и
 * последовательный прогресс; только активный Plus может купить закрытый урок
 * за 100 жемчужин. Сторож отменённого правила чинится как тест, а не
 * удаляется — иначе следующая сессия «откроет всё» одной строкой (именно так
 * класс бага и возник).
 */
jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumAccessStatus: jest.fn(async () => false),
  getVerifiedPremiumStatus: jest.fn(async () => false),
  isTesterNoLimitsActive: jest.fn(async () => false),
}));
jest.mock('../app/legacy_free_lesson_access', () => ({ readLegacyFreeLessonCap: jest.fn(async () => 0) }));
jest.mock('../app/remote_flags', () => ({
  ...jest.requireActual('../app/remote_flags'),
  getFreeLessonLimit: () => 3,
  getFreeLessonsExtra: () => new Set(),
  getPremiumLessonsExtra: () => new Set(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildPremiumLessonUnlocks,
  buildSequentialFreeLessonUnlocks,
  isFreeLesson,
  requiresPremiumForLesson,
  resolveLessonAccess,
} from '../app/monetization_policy';
import {
  isLessonUnlockedByEarnedProgress,
  resolveLastAvailableLessonId,
} from '../app/lesson_lock_system';
import { resolveLessonRuntimeGate } from '../app/lesson_premium_gate';
import { isAlwaysOpenLesson, isMainCourseLesson } from '../app/main_course_access';
import { LESSON_PEARL_UNLOCK_PRICE } from '../app/lessons_pearl_unlock';
import { purchasedLessonsKey } from '../app/lessons_pearl_unlock_storage';
import { lessonBestScoreKey } from '../app/target_storage_keys';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('owner 2026-09-20: Free получает 3 урока, дальше нужен Plus', () => {
  it.each([0, -1, 1.5, 33, Number.NaN, Number.POSITIVE_INFINITY])(
    'не считает курсовым уроком неверный id %s',
    (lessonId) => {
      expect(isMainCourseLesson(lessonId)).toBe(false);
    },
  );

  // ВНИМАНИЕ: до 2026-09-20 здесь требовалось, чтобы уроки 2 и 3 были открыты
  // без прогресса — т.е. сторож охранял мёртвый замок. Владелец 2026-09-20:
  // безусловен только урок 1. Чинится как тест, а не удаляется.
  it('без прогресса у Free открыт только первый урок', async () => {
    const unlocked = buildSequentialFreeLessonUnlocks({ scores: [], persistedUnlocked: [] });
    expect(unlocked.slice(0, 3)).toEqual([true, false, false]);
    expect(unlocked.slice(3).some(Boolean)).toBe(false);

    expect(await isLessonUnlockedByEarnedProgress(1)).toBe(true);
    expect(await resolveLessonRuntimeGate(1)).toBe('available');
    for (const lessonId of [2, 3, 4, 5, 9, 19, 29, 32]) {
      expect(await isLessonUnlockedByEarnedProgress(lessonId)).toBe(false);
      expect(await resolveLessonRuntimeGate(lessonId)).not.toBe('available');
    }
  });

  it('бронза ★2.5 на первом уроке открывает второй без Plus', async () => {
    await AsyncStorage.setItem(lessonBestScoreKey(1), '2.5');
    expect(await isLessonUnlockedByEarnedProgress(2)).toBe(true);
    expect(await resolveLessonRuntimeGate(2)).toBe('available');
    // Урок 3 всё ещё закрыт — покупка/бронза открывают РОВНО один урок.
    expect(await isLessonUnlockedByEarnedProgress(3)).toBe(false);
  });

  it('низкая оценка на первом не открывает второй', async () => {
    await AsyncStorage.setItem(lessonBestScoreKey(1), '2.4');
    expect(await isLessonUnlockedByEarnedProgress(2)).toBe(false);
  });

  it('старый прогресс не снимает Plus-пейвол у Free', () => {
    const scores = new Array(32).fill(0);
    scores[3] = 5;
    scores[8] = 5;
    expect(buildSequentialFreeLessonUnlocks({ scores })[3]).toBe(false);
    expect(buildSequentialFreeLessonUnlocks({ scores })[8]).toBe(false);
  });

  it('Plus сразу открывает старты A1/A2/B1/B2, но не весь раздел', () => {
    const unlocked = buildPremiumLessonUnlocks({ scores: new Array(32).fill(0) });
    expect(unlocked[0]).toBe(true);
    expect(unlocked[8]).toBe(true);
    expect(unlocked[18]).toBe(true);
    expect(unlocked[28]).toBe(true);
    expect(unlocked[9]).toBe(false);
    expect(unlocked[19]).toBe(false);
    expect(unlocked[29]).toBe(false);
  });

  it('купленный за жемчуг урок открыт, но НЕ открывает следующий', async () => {
    const scores = new Array(32).fill(0);
    const unlocked = buildSequentialFreeLessonUnlocks({ scores, purchasedLessons: [7] });
    expect(unlocked[6]).toBe(true);
    // Владелец: покупка открывает РОВНО один урок и не считается прохождением.
    expect(unlocked[7]).toBe(false);

    await AsyncStorage.setItem(purchasedLessonsKey(), JSON.stringify([7]));
    expect(await isLessonUnlockedByEarnedProgress(7)).toBe(true);
    expect(await isLessonUnlockedByEarnedProgress(8)).toBe(false);
    expect(await resolveLessonRuntimeGate(7)).toBe('available');
  });

  it('точно купленный урок остаётся доступен после возврата на Free', () => {
    const unlocked = buildSequentialFreeLessonUnlocks({
      scores: new Array(32).fill(0),
      purchasedLessons: [32],
    });
    expect(unlocked[31]).toBe(true);
    // Урок 2 больше не подарок: без бронзы на первом он закрыт.
    expect(unlocked[1]).toBe(false);
  });

  it('цена урока — 100 жемчужин', () => {
    expect(LESSON_PEARL_UNLOCK_PRICE).toBe(100);
  });

  it('после третьего урока Free видит Plus, а Plus — обычный замок прогресса', () => {
    for (const lessonId of [4, 9, 19, 32]) {
      expect(isFreeLesson(lessonId)).toBe(false);
      expect(requiresPremiumForLesson(lessonId)).toBe(true);
    }
    expect(resolveLessonAccess({ lessonId: 5, unlocked: false, isPremium: false })).toBe('premium_required');
    expect(resolveLessonAccess({ lessonId: 5, unlocked: false, isPremium: true })).toBe('progress_required');
  });

  it('первый урок открыт безусловно и не продаётся', () => {
    expect(isAlwaysOpenLesson(1)).toBe(true);
    expect(isAlwaysOpenLesson(2)).toBe(false);
    expect(resolveLessonAccess({ lessonId: 1, unlocked: false, isPremium: false })).toBe('available');
  });

  // ВНИМАНИЕ: до 2026-09-20 ждалось 3 — уроки 2–3 считались открытыми без прогресса.
  // Теперь бронза только на уроке 1 открывает РОВНО урок 2.
  it('кнопка «Урок» на Главной спускается к реально доступному уроку', async () => {
    await AsyncStorage.setItem(lessonBestScoreKey(1), '5');
    expect(await resolveLastAvailableLessonId(20)).toBe(2);
    expect(await resolveLastAvailableLessonId(1)).toBe(1);
  });

  it('без прогресса кнопка «Урок» возвращает к первому уроку', async () => {
    expect(await resolveLastAvailableLessonId(3)).toBe(1);
  });

  it('купленный урок достижим с Главной без Plus', async () => {
    await AsyncStorage.setItem(purchasedLessonsKey(), JSON.stringify([7]));
    expect(await resolveLastAvailableLessonId(7)).toBe(7);
  });

  describe('старые открытия не обходят новый Free-пейвол', () => {
    it('свой старый прогресс не открывает урок Free', async () => {
      await AsyncStorage.setItem(lessonBestScoreKey(15), '5');
      expect(await isLessonUnlockedByEarnedProgress(15)).toBe(false);
      expect(await resolveLessonRuntimeGate(15)).toBe('premium_required');
    });

    it('Главная возвращает Free к первому уроку, а не к тройке', async () => {
      // Чужой старый прогресс на 15-м не даёт ничего: урок 1 не пройден.
      await AsyncStorage.setItem(lessonBestScoreKey(15), '5');
      expect(await resolveLastAvailableLessonId(15)).toBe(1);
    });
  });
});

/**
 * Сторож правила доступа к основному курсу.
 *
 * ВНИМАНИЕ: до 2026-09-17 этот файл охранял ПРОТИВОПОЛОЖНОЕ правило — «все 32
 * урока открыты всем» (решение владельца 2026-09-08). Решением 2026-09-17 оно
 * ОТМЕНЕНО: курс снова открывается по мере прохождения, а закрытый урок можно
 * открыть за 100 жемчужин. Сторож отменённого правила чинится как тест, а не
 * удаляется — иначе следующая сессия «откроет всё» одной строкой (именно так
 * класс бага и возник).
 */
jest.mock('../app/premium_guard', () => ({
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

describe('owner 2026-09-17: курс открывается по порядку, а не весь сразу', () => {
  it.each([0, -1, 1.5, 33, Number.NaN, Number.POSITIVE_INFINITY])(
    'не считает курсовым уроком неверный id %s',
    (lessonId) => {
      expect(isMainCourseLesson(lessonId)).toBe(false);
    },
  );

  it('без прогресса открыт ТОЛЬКО первый урок', async () => {
    const unlocked = buildSequentialFreeLessonUnlocks({ scores: [], persistedUnlocked: [] });
    expect(unlocked[0]).toBe(true);
    expect(unlocked.slice(1).some(Boolean)).toBe(false);

    expect(await isLessonUnlockedByEarnedProgress(1)).toBe(true);
    for (const lessonId of [2, 5, 9, 19, 29, 32]) {
      expect(await isLessonUnlockedByEarnedProgress(lessonId)).toBe(false);
      expect(await resolveLessonRuntimeGate(lessonId)).not.toBe('available');
    }
  });

  it('урок открывается бронзой ★2.5 на предыдущем, и не раньше', () => {
    const scores = new Array(32).fill(0);
    scores[0] = 2.4;
    expect(buildSequentialFreeLessonUnlocks({ scores })[1]).toBe(false);
    scores[0] = 2.5;
    expect(buildSequentialFreeLessonUnlocks({ scores })[1]).toBe(true);
  });

  it('уроки 9/19/29 требуют сданного зачёта, бронзы недостаточно', () => {
    // Сами границы НЕ пройдены (scores[8]=scores[18]=scores[28]=0), иначе
    // сработает миграционная ветка «пройденный урок не отбираем» — она стоит
    // выше зачёта и это осознанно (см. describe ниже).
    const scores = new Array(32).fill(5);
    scores[8] = 0;
    scores[18] = 0;
    scores[28] = 0;
    const noExams = buildSequentialFreeLessonUnlocks({ scores });
    expect(noExams[8]).toBe(false);
    expect(noExams[18]).toBe(false);
    expect(noExams[28]).toBe(false);

    const withA1 = buildSequentialFreeLessonUnlocks({ scores, passedExams: { A1: true } });
    expect(withA1[8]).toBe(true);
    expect(withA1[18]).toBe(false);
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

  it('купить можно любой закрытый урок, не только следующий по порядку', () => {
    const unlocked = buildSequentialFreeLessonUnlocks({
      scores: new Array(32).fill(0),
      purchasedLessons: [32],
    });
    expect(unlocked[31]).toBe(true);
    expect(unlocked[1]).toBe(false);
  });

  it('цена урока — 100 жемчужин', () => {
    expect(LESSON_PEARL_UNLOCK_PRICE).toBe(100);
  });

  it('это НЕ пейвол: уроки остаются бесплатными и не просят Plus', () => {
    for (const lessonId of [1, 9, 19, 32]) {
      expect(isFreeLesson(lessonId)).toBe(true);
      expect(requiresPremiumForLesson(lessonId)).toBe(false);
    }
    // Закрытый урок сообщает про прогресс, а не про подписку.
    expect(resolveLessonAccess({ lessonId: 5, unlocked: false, isPremium: false })).toBe('progress_required');
    expect(resolveLessonAccess({ lessonId: 5, unlocked: false, isPremium: true })).toBe('progress_required');
  });

  it('первый урок открыт безусловно и не продаётся', () => {
    expect(isAlwaysOpenLesson(1)).toBe(true);
    expect(isAlwaysOpenLesson(2)).toBe(false);
    expect(resolveLessonAccess({ lessonId: 1, unlocked: false, isPremium: false })).toBe('available');
  });

  it('кнопка «Урок» на Главной спускается к реально доступному уроку', async () => {
    await AsyncStorage.setItem(lessonBestScoreKey(1), '5');
    // Пройден только урок 1 → доступен урок 2, а запрошенный 20 недостижим.
    expect(await resolveLastAvailableLessonId(20)).toBe(2);
    expect(await resolveLastAvailableLessonId(1)).toBe(1);
  });

  // ─── Обратная совместимость (аудит 2026-09-17) ────────────────────────────
  // С 2026-09-08 по 2026-09-17 курс был открыт весь. Человек мог пройти урок
  // 15 или 9, не трогая предыдущий и не сдав зачёт. Закрыть ему уже пройденный
  // урок — значит отобрать сделанную работу.
  describe('уже пройденный урок не отбирается', () => {
    it('урок со своим прогрессом открыт, хотя предыдущий не пройден', async () => {
      // Слабый результат (★1): своего урока хватает, чтобы его не отобрать,
      // но бронзы (★2.5) соседу он НЕ даёт — миграция не открывает курс целиком.
      await AsyncStorage.setItem(lessonBestScoreKey(15), '1');
      expect(await isLessonUnlockedByEarnedProgress(15)).toBe(true);
      expect(await resolveLessonRuntimeGate(15)).toBe('available');
      expect(await isLessonUnlockedByEarnedProgress(16)).toBe(false);
      // Предыдущий урок остаётся закрытым: миграция не задним числом.
      expect(await isLessonUnlockedByEarnedProgress(14)).toBe(false);
    });

    it('граница уровня со своим прогрессом открыта даже без зачёта', async () => {
      await AsyncStorage.setItem(lessonBestScoreKey(9), '3');
      expect(await isLessonUnlockedByEarnedProgress(9)).toBe(true);
    });

    it('карточка списка не расходится с экраном урока', () => {
      const scores = new Array(32).fill(0);
      scores[14] = 1; // урок 15 пройден слабо: открыт сам, бронзы соседу не даёт
      scores[8] = 1;  // урок 9 (граница уровня) пройден слабо
      const unlocked = buildSequentialFreeLessonUnlocks({ scores });
      expect(unlocked[14]).toBe(true);
      expect(unlocked[8]).toBe(true);
      expect(unlocked[15]).toBe(false);
      expect(unlocked[13]).toBe(false);
    });

    it('быстрый путь Главной согласован с медленным', async () => {
      await AsyncStorage.setItem(lessonBestScoreKey(15), '4');
      // Урок 15 пройден → именно он и остаётся доступным при запросе 15.
      expect(await resolveLastAvailableLessonId(15)).toBe(15);
    });
  });
});

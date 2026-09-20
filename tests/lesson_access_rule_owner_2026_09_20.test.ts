/**
 * Сторож сквозного правила доступа к урокам (владелец 2026-09-20).
 *
 * Проверяет НЕ отдельные хелперы, а ТО, ЧТО УВИДИТ ЧЕЛОВЕК — итоговый
 * вердикт resolveLessonRuntimeGate, на котором строится экран уроков.
 *
 * Правило владельца дословно:
 *  • уроки 2 и 3 НЕ должны быть доступны по дефолту;
 *  • урок открывает ★2.5 на предыдущем ИЛИ 100 жемчужин;
 *  • Plus снимает ПЕЙВОЛ, но НЕ замок прогресса;
 *  • у Plus сразу открыт первый урок каждого уровня (1/9/19/29).
 *
 * Сработал — чинить логику доступа, а НЕ ослаблять этот сторож.
 * История: до 20.09 уроки 1–3 были открыты безусловно, и isFreeSampleLesson
 * коротко замыкал ВЫШЕ проверки бронзы в шести местах — весь замок на 2–3
 * был физически недостижим и модалка «Ещё рано» никогда не показывалась.
 */
jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumAccessStatus: jest.fn(async () => false),
  getVerifiedPremiumStatus: jest.fn(async () => (globalThis as Record<string, unknown>).__PLUS__ === true),
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
import { resolveLessonRuntimeGate } from '../app/lesson_premium_gate';
import { lessonBestScoreKey } from '../app/target_storage_keys';
import { purchasedLessonsKey } from '../app/lessons_pearl_unlock_storage';

beforeEach(async () => { await AsyncStorage.clear(); (globalThis as any).__PLUS__ = false; });

describe('СКВОЗНОЕ: что реально увидит человек', () => {
  it('FREE, новый аккаунт: открыт только урок 1', async () => {
    expect(await resolveLessonRuntimeGate(1)).toBe('available');
    expect(await resolveLessonRuntimeGate(2)).toBe('progress_required');
    expect(await resolveLessonRuntimeGate(3)).toBe('progress_required');
    expect(await resolveLessonRuntimeGate(4)).toBe('premium_required');
  });
  it('FREE прошёл урок 1 на 2.5 → открылся урок 2, но не 3', async () => {
    await AsyncStorage.setItem(lessonBestScoreKey(1), '2.5');
    expect(await resolveLessonRuntimeGate(2)).toBe('available');
    expect(await resolveLessonRuntimeGate(3)).toBe('progress_required');
  });
  it('FREE прошёл 1 и 2 → открыт 3, но 4 требует Plus', async () => {
    await AsyncStorage.setItem(lessonBestScoreKey(1), '3');
    await AsyncStorage.setItem(lessonBestScoreKey(2), '3');
    expect(await resolveLessonRuntimeGate(3)).toBe('available');
    expect(await resolveLessonRuntimeGate(4)).toBe('premium_required');
  });
  it('PLUS, новый аккаунт: открыты 1/9/19/29, а 2 и 3 заперты прогрессом', async () => {
    (globalThis as any).__PLUS__ = true;
    for (const id of [1, 9, 19, 29]) expect(await resolveLessonRuntimeGate(id)).toBe('available');
    for (const id of [2, 3, 10, 20, 30]) expect(await resolveLessonRuntimeGate(id)).toBe('progress_required');
  });
  it('PLUS: бронза открывает ровно следующий', async () => {
    (globalThis as any).__PLUS__ = true;
    await AsyncStorage.setItem(lessonBestScoreKey(9), '2.5');
    expect(await resolveLessonRuntimeGate(10)).toBe('available');
    expect(await resolveLessonRuntimeGate(11)).toBe('progress_required');
  });
  it('покупка за 100 жемчужин открывает РОВНО один урок', async () => {
    (globalThis as any).__PLUS__ = true;
    await AsyncStorage.setItem(purchasedLessonsKey(), JSON.stringify([15]));
    expect(await resolveLessonRuntimeGate(15)).toBe('available');
    expect(await resolveLessonRuntimeGate(16)).toBe('progress_required');
  });
  it('купленный урок переживает отмену Plus', async () => {
    await AsyncStorage.setItem(purchasedLessonsKey(), JSON.stringify([15]));
    expect(await resolveLessonRuntimeGate(15)).toBe('available');
  });
});

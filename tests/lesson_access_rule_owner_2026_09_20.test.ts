/**
 * Сторож сквозного правила доступа к урокам (владелец 2026-09-20).
 *
 * Проверяет НЕ отдельные хелперы, а ТО, ЧТО УВИДИТ ЧЕЛОВЕК — итоговый
 * вердикт resolveLessonRuntimeGate, на котором строится экран уроков.
 *
 * Правило владельца дословно:
 *  • уроки 2 и 3 НЕ должны быть доступны по дефолту;
 *  • урок открывает 2★ на предыдущем (D121, 30.09: от 60% = LESSON_UNLOCK_SCORE;
 *    до этого D71 — 2 из 5, ещё раньше 2.5) ИЛИ исторически купленный за жемчуг
 *    урок (жемчуг убран D70, покупки прошлого сохраняются);
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
import { legacyFreeLessonCapKey, lessonBestScoreKey } from '../app/target_storage_keys';
import { purchasedLessonsKey } from '../app/lessons_pearl_unlock_storage';
import { LESSON_UNLOCK_SCORE } from '../app/lesson_star_scale';

beforeEach(async () => { await AsyncStorage.clear(); (globalThis as any).__PLUS__ = false; });

describe('СКВОЗНОЕ: что реально увидит человек', () => {
  it('FREE, новый аккаунт: открыт только урок 1', async () => {
    expect(await resolveLessonRuntimeGate(1)).toBe('available');
    expect(await resolveLessonRuntimeGate(2)).toBe('progress_required');
    expect(await resolveLessonRuntimeGate(3)).toBe('progress_required');
    expect(await resolveLessonRuntimeGate(4)).toBe('premium_required');
  });
  it('FREE прошёл урок 1 на 2★ (порог D121) → открылся урок 2, но не 3', async () => {
    await AsyncStorage.setItem(lessonBestScoreKey(1), String(LESSON_UNLOCK_SCORE));
    expect(await resolveLessonRuntimeGate(2)).toBe('available');
    expect(await resolveLessonRuntimeGate(3)).toBe('progress_required');
  });
  it('FREE: ниже порога D121 (бывшие 2.5 из 5 = 50%) урок 2 остаётся закрытым', async () => {
    await AsyncStorage.setItem(lessonBestScoreKey(1), '2.5');
    expect(await resolveLessonRuntimeGate(2)).toBe('progress_required');
  });
  it('FREE прошёл 1 и 2 → открыт 3, но 4 требует Plus', async () => {
    await AsyncStorage.setItem(lessonBestScoreKey(1), '3');
    await AsyncStorage.setItem(lessonBestScoreKey(2), '3');
    expect(await resolveLessonRuntimeGate(3)).toBe('available');
    expect(await resolveLessonRuntimeGate(4)).toBe('premium_required');
  });
  // ЗАМОК ВЛАДЕЛЬЦА 28.10 ~21:05 («Plus открывает все 32», отменяет последовательную матрицу Plus 20.09): у Plus открыты ВСЕ 32 с первого дня.
  it('PLUS, новый аккаунт: открыты все 32 урока (замок владельца 28.10)', async () => {
    (globalThis as any).__PLUS__ = true;
    for (let id = 1; id <= 32; id++) expect(await resolveLessonRuntimeGate(id)).toBe('available');
  });
  it('PLUS: 2★ не нужны — следующий урок открыт и без них (замок владельца 28.10)', async () => {
    (globalThis as any).__PLUS__ = true;
    await AsyncStorage.setItem(lessonBestScoreKey(9), String(LESSON_UNLOCK_SCORE));
    expect(await resolveLessonRuntimeGate(10)).toBe('available');
    expect(await resolveLessonRuntimeGate(11)).toBe('available');
  });
  // Покупка за жемчуг — правило Free (у Plus открыты все 32): без Plus открывает РОВНО один урок.
  it('покупка за 100 жемчужин открывает РОВНО один урок (без Plus)', async () => {
    (globalThis as any).__PLUS__ = false;
    await AsyncStorage.setItem(purchasedLessonsKey(), JSON.stringify([15]));
    expect(await resolveLessonRuntimeGate(15)).toBe('available');
    expect(await resolveLessonRuntimeGate(16)).toBe('premium_required');
  });
  it('FREE со старым бесплатным потолком 5 (D122): уроки 4–5 открыты, 6 требует Plus', async () => {
    await AsyncStorage.setItem(legacyFreeLessonCapKey(), '5');
    expect(await resolveLessonRuntimeGate(4)).toBe('available');
    expect(await resolveLessonRuntimeGate(5)).toBe('available');
    expect(await resolveLessonRuntimeGate(6)).toBe('premium_required');
  });
  it('купленный урок переживает отмену Plus', async () => {
    await AsyncStorage.setItem(purchasedLessonsKey(), JSON.stringify([15]));
    expect(await resolveLessonRuntimeGate(15)).toBe('available');
  });
});

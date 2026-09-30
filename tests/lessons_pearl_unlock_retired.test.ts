import { getVerifiedPremiumAccessStatus } from '../app/premium_guard';
import { buyLessonWithPearls } from '../app/lessons_pearl_unlock';
import { commitShardCompositeOperation, semanticShardOperationId } from '../app/shards_system';
import { LESSON_PEARL_UNLOCK_ENABLED } from '../app/lessons_pearl_unlock_flag';

// зачем (PM-148): покупка урока за жемчуг выведена из эксплуатации. Пока флаг выключен, прямой вызов
// ядра (мимо UI) обязан отказать ДО проверки Plus и ДО любого дебета/grant — иначе жемчуг можно
// было бы потратить в обход экрана. Чтение исторических unlocks (PM-148-A2) остаётся экспортом.
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumAccessStatus: jest.fn() }));
jest.mock('../app/shards_system', () => ({
  commitShardCompositeOperation: jest.fn(),
  semanticShardOperationId: jest.fn(),
}));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/lesson_lock_system', () => ({ isLessonUnlockedByPremiumCourse: jest.fn() }));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: jest.fn(),
  isCurrentAccountGeneration: jest.fn(),
}));

describe('lesson pearl purchase is retired', () => {
  it('keeps the kill switch off', () => {
    expect(LESSON_PEARL_UNLOCK_ENABLED).toBe(false);
  });

  it.each([2, 4, 9])('refuses lesson %i before Plus check, debit or grant', async (lessonId) => {
    await expect(buyLessonWithPearls({ lessonId })).resolves.toEqual({ ok: false, reason: 'retired' });
    expect(getVerifiedPremiumAccessStatus).not.toHaveBeenCalled();
    expect(semanticShardOperationId).not.toHaveBeenCalled();
    expect(commitShardCompositeOperation).not.toHaveBeenCalled();
  });

  it('still exports the historical unlock readers', () => {
    const mod = require('../app/lessons_pearl_unlock');
    expect(typeof mod.readPurchasedLessons).toBe('function');
    expect(typeof mod.isLessonPurchasedWithPearls).toBe('function');
    expect(typeof mod.purchasedLessonsKey).toBe('function');
  });
});

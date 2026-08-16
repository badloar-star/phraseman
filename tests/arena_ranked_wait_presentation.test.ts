import {
  ARENA_RANKED_CALM_STATE_MS,
  ARENA_RANKED_QUICK_OFFER_MS,
  arenaRankedElapsedMs,
  arenaRankedWaitPresentation,
} from '../modules/arena/matchmaking_state';

/**
 * Пороги ожидания в рейтинге. Тестов на них не было вовсе — значения меняли
 * вслепую. Владелец 2026-08-16: предлагать быстрый матч через минуту, а не
 * через полминуты, и поиск при этом НЕ прерывать.
 */
describe('arena ranked wait presentation', () => {
  it('offers quick match after a minute, not half of it', () => {
    // Полминуты — ещё нормальное ожидание живого соперника. Предложение уйти
    // в быстрый матч здесь читается как «никого нет» и уводит из рейтинга.
    expect(ARENA_RANKED_QUICK_OFFER_MS).toBe(60_000);
    expect(arenaRankedWaitPresentation(30_000)).toBe('searching');
    expect(arenaRankedWaitPresentation(59_999)).toBe('searching');
    expect(arenaRankedWaitPresentation(60_000)).toBe('quick_offer');
  });

  it('keeps the calm state well after the offer, never before it', () => {
    expect(ARENA_RANKED_CALM_STATE_MS).toBeGreaterThan(ARENA_RANKED_QUICK_OFFER_MS);
    expect(arenaRankedWaitPresentation(ARENA_RANKED_CALM_STATE_MS - 1)).toBe('quick_offer');
    expect(arenaRankedWaitPresentation(ARENA_RANKED_CALM_STATE_MS)).toBe('calm');
  });

  it('never reads a negative wait as a finished one', () => {
    // Часы телефона могут отстать от серверного joinedAtMs.
    expect(arenaRankedWaitPresentation(-5_000)).toBe('searching');
    expect(arenaRankedElapsedMs(1_000, 5_000)).toBe(0);
  });

  it('counts from the server ticket, not from the screen mount', () => {
    // Экран могли перемонтировать; очередь на сервере при этом не начиналась
    // заново, и ожидание не должно обнуляться.
    expect(arenaRankedElapsedMs(70_000, 60_000, 10_000)).toBe(60_000);
    // Явный перезапуск показа («продолжить поиск») ожидание обнуляет.
    expect(arenaRankedElapsedMs(70_000, 60_000, 10_000, 65_000)).toBe(5_000);
  });
});

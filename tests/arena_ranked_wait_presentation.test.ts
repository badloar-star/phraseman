import {
  ARENA_REPLACEMENT_BOT_MAX_MS,
  ARENA_REPLACEMENT_BOT_MIN_MS,
  arenaReplacementBotDelayMs,
  arenaRankedElapsedMs,
  arenaRankedWaitPresentation,
} from '../modules/arena/matchmaking_state';

/**
 * Владелец 2026-08-21: экран больше никогда не меняет поиск на предложения,
 * «никого нет» или другие сообщения. Поиск живёт до назначения соперника.
 */
describe('arena ranked wait presentation', () => {
  it('never replaces searching, however long matchmaking takes', () => {
    for (const elapsed of [-5_000, 0, 30_000, 60_000, 150_000, 60 * 60_000]) {
      expect(arenaRankedWaitPresentation(elapsed)).toBe('searching');
    }
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

  it('schedules a replacement bot roughly one minute after a cancelled assignment', () => {
    expect(ARENA_REPLACEMENT_BOT_MIN_MS).toBe(50_000);
    expect(ARENA_REPLACEMENT_BOT_MAX_MS).toBe(70_000);
    expect(arenaReplacementBotDelayMs(-1)).toBe(ARENA_REPLACEMENT_BOT_MIN_MS);
    expect(arenaReplacementBotDelayMs(0.5)).toBe(60_000);
    expect(arenaReplacementBotDelayMs(2)).toBe(ARENA_REPLACEMENT_BOT_MAX_MS);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Страж: клиентская и серверная копии реестра персонажей обязаны совпадать.
//
// зачем (владелец 2026-08-04): app/ и functions/ не делят код, поэтому реестр
// существует в двух файлах. Если они разойдутся хоть на константу, один и тот
// же персонаж покажет РАЗНЫЙ опыт и уровень в лиге и в турнире — ровно тот
// баг, ради устранения которого реестр и заводился («будет неправильно, если
// они будут замечены в двух разных местах с разным опытом и уровнем»).
//
// Обычные тесты этого НЕ ловят: каждая копия по отдельности самосогласована.
// ═══════════════════════════════════════════════════════════════════════════

import * as client from '../constants/synthetic_residents';
import * as server from '../functions/src/synthetic_residents';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('реестр персонажей: клиент и сервер считают одинаково', () => {
  it('константы совпадают', () => {
    expect(client.RESIDENT_EPOCH_MS).toBe(server.RESIDENT_EPOCH_MS);
    expect(client.RESIDENT_TICK_MS).toBe(server.RESIDENT_TICK_MS);
    expect(client.RESIDENT_TICK_MIN_XP).toBe(server.RESIDENT_TICK_MIN_XP);
    expect(client.RESIDENT_TICK_MAX_XP).toBe(server.RESIDENT_TICK_MAX_XP);
    expect(client.RESIDENT_IDLE_CHANCE).toBe(server.RESIDENT_IDLE_CHANCE);
    expect(client.RESIDENT_MAX_LEVEL).toBe(server.RESIDENT_MAX_LEVEL);
  });

  it('темп персонажа одинаков', () => {
    for (let index = 0; index < 50; index++) {
      expect(client.residentPace(index)).toBeCloseTo(server.residentPace(index), 12);
    }
  });

  it('прибавка за тик совпадает до единицы опыта', () => {
    for (let index = 0; index < 25; index++) {
      for (let tick = 0; tick < 40; tick++) {
        expect(client.residentTickGain(index, tick)).toBe(server.residentTickGain(index, tick));
      }
    }
  });

  it('накопленный опыт совпадает на любую дату', () => {
    for (const days of [0, 1, 7, 30, 90, 365, 900]) {
      const at = server.RESIDENT_EPOCH_MS + days * DAY_MS;
      for (let index = 0; index < 20; index++) {
        expect(client.residentTotalXpAt(index, at)).toBe(server.residentTotalXpAt(index, at));
      }
    }
  });

  it('уровень и аватар совпадают — персонаж выглядит одинаково везде', () => {
    for (const days of [3, 45, 200, 800]) {
      const at = server.RESIDENT_EPOCH_MS + days * DAY_MS;
      for (let index = 0; index < 20; index++) {
        const onClient = client.residentProfileAt(index, at);
        const onServer = server.residentProfileAt(index, at);
        expect(onClient.totalXp).toBe(onServer.totalXp);
        expect(onClient.level).toBe(onServer.level);
        expect(onClient.avatar).toBe(onServer.avatar);
        expect(onClient.streak).toBe(onServer.streak);
      }
    }
  });

  it('формула уровня совпадает на границах', () => {
    for (const xp of [0, 1, 399, 400, 401, 5000, 100_000, 476_669, 1_000_000]) {
      expect(client.residentLevelFromXp(xp)).toBe(server.residentLevelFromXp(xp));
    }
  });
});

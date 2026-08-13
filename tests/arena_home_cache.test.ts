import * as fs from 'fs';
import * as path from 'path';
import {
  ARENA_HOME_CACHE_TTL_MS,
  arenaHomeWarmSanitize,
  arenaHomeWarmUsable,
  arenaLoadHomeWarm,
  arenaPeekHomeWarm,
  arenaRememberHomeWarm,
  arenaResetHomeWarm,
} from '../modules/arena/home_cache';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';

/**
 * Владелец (2026-08-13, дословно): «не должно быть видимой никогда нигде
 * загрузки, всё сразу загружено должно быть».
 *
 * Экран Арены открывался пустым и писал «Загрузка…», пока отвечал сервер.
 * Теперь первый кадр рисуется прошлым снимком, а свежее приезжает молча.
 */

function fakeStore(): ArenaKeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  };
}

describe('тёплый снимок главного экрана', () => {
  it('память отдаёт снимок синхронно — первый кадр уже с данными', () => {
    arenaResetHomeWarm();
    expect(arenaPeekHomeWarm(1_000)).toBeNull();
    arenaRememberHomeWarm({ home: { profile: { rating: 700 } }, wallNowMs: 1_000 });
    expect(arenaPeekHomeWarm(1_500)?.home).toEqual({ profile: { rating: 700 } });
  });

  /**
   * Активный матч и очередь живут секундами. Показать их из вчерашнего снимка
   * значит позвать игрока в матч, которого давно нет.
   */
  it('из снимка вычищено всё, что нельзя показывать устаревшим', () => {
    const clean = arenaHomeWarmSanitize({
      profile: { rating: 700 },
      activeMatch: { matchId: 'm1' },
      activeQueue: { status: 'waiting' },
    });
    expect(clean).toEqual({ profile: { rating: 700 } });
  });

  it('снимок старше суток не показывается', () => {
    expect(arenaHomeWarmUsable({
      schemaVersion: 'arena-home-warm.v1', savedAtWallMs: 0, home: {}, expansion: null,
    }, ARENA_HOME_CACHE_TTL_MS + 1)).toBeNull();
  });

  it('снимок из будущего не показывается — часы переведены', () => {
    expect(arenaHomeWarmUsable({
      schemaVersion: 'arena-home-warm.v1', savedAtWallMs: 10_000_000, home: {}, expansion: null,
    }, 1_000)).toBeNull();
  });

  it('чужая схема отбрасывается целиком', () => {
    expect(arenaHomeWarmUsable({ schemaVersion: 'arena-home-warm.v0' }, 1_000)).toBeNull();
    expect(arenaHomeWarmUsable('не объект', 1_000)).toBeNull();
  });

  it('обновление одной половины не стирает вторую', () => {
    arenaResetHomeWarm();
    arenaRememberHomeWarm({ home: { a: 1 }, wallNowMs: 1_000 });
    arenaRememberHomeWarm({ expansion: { b: 2 }, wallNowMs: 1_100 });
    const warm = arenaPeekHomeWarm(1_200);
    expect(warm?.home).toEqual({ a: 1 });
    expect(warm?.expansion).toEqual({ b: 2 });
  });

  it('после перезапуска снимок поднимается с диска', async () => {
    const store = fakeStore();
    arenaResetHomeWarm();
    arenaRememberHomeWarm({ home: { profile: { rating: 900 } }, wallNowMs: 1_000, store });
    // Память очищена — как после холодного старта приложения.
    arenaResetHomeWarm();
    expect(arenaPeekHomeWarm(2_000)).toBeNull();
    const restored = await arenaLoadHomeWarm(store, 2_000);
    expect(restored?.home).toEqual({ profile: { rating: 900 } });
    // И дальше он снова доступен синхронно.
    expect(arenaPeekHomeWarm(2_000)?.home).toEqual({ profile: { rating: 900 } });
  });

  it('битый снимок на диске не роняет экран', async () => {
    const store = fakeStore();
    arenaResetHomeWarm();
    store.data.set('arena.home.warm.v1', '{ это не json');
    expect(await arenaLoadHomeWarm(store, 1_000)).toBeNull();
  });
});

describe('экран Арены пользуется снимком', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena.tsx'), 'utf8');

  it('первый кадр берётся из памяти, а не из пустоты', () => {
    expect(source).toContain('arenaPeekHomeWarm');
    expect(source).toContain('arenaRememberHomeWarm');
  });

  it('слово «Загрузка» на главном экране Арены больше не показывается', () => {
    expect(source).not.toContain('<ArenaStateCard state="loading"');
  });

  it('погашенные кнопки объяснены, а не молчат', () => {
    expect(source).toContain("'arenaNotDeployed'");
    expect(source).toContain("'arenaNotDeployedHint'");
  });
});

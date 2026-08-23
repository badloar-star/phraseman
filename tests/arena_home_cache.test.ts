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
  arenaWarmDayKey,
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

  /**
   * Самая опасная часть снимка: дневные счётчики. Вчерашние «сыграно 3» и
   * «побед 2» под сегодняшней датой — это ложь про сегодняшний день, и она
   * закрывает игроку дневные цели, которых он не выполнял.
   */
  it('дневные счётчики за прошлые сутки выбрасываются, остальное остаётся', () => {
    const day1 = Date.UTC(2026, 7, 12, 20, 0);
    const day2 = Date.UTC(2026, 7, 13, 9, 0);
    const stored = {
      schemaVersion: 'arena-home-warm.v2',
      savedAtWallMs: day1,
      savedDayKey: arenaWarmDayKey(day1),
      home: { profile: { rating: 700, dailyMatches: 3, dailyWins: 2, dailyFirstAnswers: 9 } },
      expansion: null,
    };
    const sameDay = arenaHomeWarmUsable(stored, day1 + 60_000);
    expect((sameDay?.home as { profile: Record<string, unknown> }).profile.dailyMatches).toBe(3);

    const nextDay = arenaHomeWarmUsable(stored, day2);
    const profile = (nextDay?.home as { profile: Record<string, unknown> }).profile;
    // Ранг за ночь не портится, а «сыграно сегодня» — портится.
    expect(profile.rating).toBe(700);
    expect(profile.dailyMatches).toBeUndefined();
    expect(profile.dailyWins).toBeUndefined();
    expect(profile.dailyFirstAnswers).toBeUndefined();
  });

  it('снимок без ключа суток считается вчерашним', () => {
    const parsed = arenaHomeWarmUsable({
      schemaVersion: 'arena-home-warm.v2',
      savedAtWallMs: 1_000,
      home: { profile: { rating: 500, dailyMatches: 4 } },
      expansion: null,
    }, 2_000);
    expect((parsed?.home as { profile: Record<string, unknown> }).profile.dailyMatches).toBeUndefined();
  });

  it('снимок старше суток не показывается', () => {
    expect(arenaHomeWarmUsable({
      schemaVersion: 'arena-home-warm.v2', savedAtWallMs: 0, home: {}, expansion: null,
    }, ARENA_HOME_CACHE_TTL_MS + 1)).toBeNull();
  });

  it('снимок из будущего не показывается — часы переведены', () => {
    expect(arenaHomeWarmUsable({
      schemaVersion: 'arena-home-warm.v2', savedAtWallMs: 10_000_000, home: {}, expansion: null,
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

  it('частичные обновления в те же сутки сохраняют дневные данные второй половины', () => {
    const morning = Date.UTC(2026, 7, 20, 9, 0);
    arenaResetHomeWarm();
    arenaRememberHomeWarm({
      home: { profile: { rating: 700, dailyMatches: 2 } },
      expansion: { today: { completedTasks: 1 }, activeRun: { runId: 'run-1' }, season: { stars: 5 } },
      wallNowMs: morning,
    });

    arenaRememberHomeWarm({
      home: { profile: { rating: 710, dailyMatches: 3 } },
      wallNowMs: morning + 1_000,
    });
    expect(arenaPeekHomeWarm(morning + 2_000)?.expansion).toEqual({
      today: { completedTasks: 1 },
      activeRun: { runId: 'run-1' },
      season: { stars: 5 },
    });

    arenaRememberHomeWarm({
      expansion: { today: { completedTasks: 2 }, season: { stars: 6 } },
      wallNowMs: morning + 3_000,
    });
    expect(arenaPeekHomeWarm(morning + 4_000)?.home).toEqual({
      profile: { rating: 710, dailyMatches: 3 },
    });
  });

  it('частичное обновление после смены суток не переносит вчерашние дневные данные', () => {
    const day1 = Date.UTC(2026, 7, 20, 23, 59);
    const day2 = Date.UTC(2026, 7, 21, 0, 1);
    arenaResetHomeWarm();
    arenaRememberHomeWarm({
      home: { profile: { rating: 700, dailyMatches: 2 } },
      expansion: { today: { completedTasks: 1 }, activeRun: { runId: 'old-run' }, season: { stars: 5 } },
      wallNowMs: day1,
    });

    arenaRememberHomeWarm({
      home: { profile: { rating: 705, dailyMatches: 0 } },
      wallNowMs: day2,
    });
    expect(arenaPeekHomeWarm(day2 + 1_000)?.expansion).toEqual({ season: { stars: 5 } });
  });

  it('записи снимка на диск выполняются по порядку и не откатывают более свежий снимок', async () => {
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    const first = new Promise<void>((resolve) => { resolveFirst = resolve; });
    const second = new Promise<void>((resolve) => { resolveSecond = resolve; });
    const writes: string[] = [];
    const store: ArenaKeyValueStore = {
      getItem: async () => null,
      setItem: jest.fn(async (_key: string, value: string) => {
        writes.push(value);
        if (writes.length === 1) await first;
        else await second;
      }),
      removeItem: async () => {},
    };
    arenaResetHomeWarm();

    arenaRememberHomeWarm({ home: { profile: { rating: 700 } }, wallNowMs: 1_000, store });
    arenaRememberHomeWarm({ home: { profile: { rating: 710 } }, wallNowMs: 2_000, store });
    await Promise.resolve();
    expect(store.setItem).toHaveBeenCalledTimes(1);

    resolveFirst();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(store.setItem).toHaveBeenCalledTimes(2);
    resolveSecond();
    await new Promise<void>((resolve) => setImmediate(resolve));

    const latest = JSON.parse(writes[1]) as { home: { profile: { rating: number } } };
    expect(latest.home.profile.rating).toBe(710);
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
    store.data.set('arena.home.warm.v2', '{ это не json');
    expect(await arenaLoadHomeWarm(store, 1_000)).toBeNull();
  });
});

describe('экран Арены пользуется снимком', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'components/arena/ArenaHubSurface.tsx'), 'utf8');

  it('первый кадр берётся из памяти, а не из пустоты', () => {
    expect(source).toContain('arenaPeekHomeWarm');
    expect(source).toContain('arenaRememberHomeWarm');
  });

  it('слово «Загрузка» на главном экране Арены больше не показывается', () => {
    expect(source).not.toContain('<ArenaStateCard state="loading"');
  });

  it('первый кадр — нейтральный хаб без скелетона, а снимок не вытесняет свежий ответ', () => {
    expect(source).toContain('createArenaHubHydrationController');
    expect(source).toContain('initialHome: warm?.home');
    expect(source).toContain('initialExpansion: warm?.expansion');
    expect(source).toContain('hydrationController.hydrate(stored)');
    expect(source).not.toContain('ArenaHubSkeleton');
    expect(source).not.toContain('SkeletonSwap');
    expect(source).not.toContain('hubLoading');
  });

  it('даже без данных рисуются живые блоки и карточка Today с честным неизвестным прогрессом', () => {
    expect(source).toContain('<ArenaHubSummary model={hub} />');
    expect(source).toContain('<ArenaDailyGoals model={hub.goals} />');
    expect(source).toContain('value={today?.completedTasks ?? null}');
    expect(source).not.toMatch(/\{\s*home\s*\?\s*<ArenaHubSummary/);
    expect(source).not.toMatch(/\{\s*home\s*\?\s*<ArenaDailyGoals/);
    expect(source).not.toMatch(/\{\s*today\s*\?\s*<V2Card/);
  });

  it('сетевой сбой показывает компактное офлайн-сообщение, а серверный — прежнюю карточку', () => {
    expect(source).toContain('hydration.failure.home');
    expect(source).toContain('hydration.failure.expansion');
    expect(source).toContain('ArenaConnectionNotice');
    expect(source).toContain("baseFailure?.kind === 'offline'");
    expect(source).toContain("baseFailure?.kind === 'server'");
    expect(source).toContain("expansionFailure?.kind === 'server'");
  });

  it('повтор не скрывает отказ, пока его не сменит успешный ответ', () => {
    expect(source).toContain('const generation = hydrationController.refresh();');
    expect(source).toContain('if (generation === null) return;');
    expect(source).toContain('hydrationController.current(generation)');
  });

  it('погашенные кнопки объяснены, а не молчат', () => {
    expect(source).toContain("'arenaNotDeployed'");
    expect(source).toContain("'arenaNotDeployedHint'");
  });
});

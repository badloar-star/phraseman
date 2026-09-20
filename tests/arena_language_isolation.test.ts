import {
  arenaHomeCacheKey,
  arenaLoadHomeWarmForTarget,
  arenaHomeWarmUsable,
  arenaHomeWarmUsableForTarget,
  arenaPeekHomeWarmForTarget,
  arenaRememberHomeWarmForTarget,
  arenaResetHomeWarm,
} from '../modules/arena/home_cache';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';

describe('Arena language isolation', () => {
  beforeEach(() => arenaResetHomeWarm());

  it('uses a different warm-cache namespace for every study target', () => {
    expect(new Set(['en', 'es', 'fr', 'de'].map(arenaHomeCacheKey)).size).toBe(4);
  });

  it('does not expose an English home snapshot inside a Spanish contour', () => {
    const english = arenaRememberHomeWarmForTarget({
      studyTarget: 'en', home: { profile: { rating: 800 } }, wallNowMs: 1_000,
    });
    expect(arenaHomeWarmUsableForTarget(english, 1_100, 'es')).toBeNull();
  });

  it('keeps an explicitly scoped snapshot reusable only by that same target', () => {
    const spanish = arenaRememberHomeWarmForTarget({
      studyTarget: 'es', home: { profile: { rating: 800 } }, wallNowMs: 1_000,
    });
    expect(arenaHomeWarmUsableForTarget(spanish, 1_100, 'es')?.studyTarget).toBe('es');
    expect(arenaHomeWarmUsableForTarget(spanish, 1_100, 'fr')).toBeNull();
  });

  it('does not inherit a missing half of a snapshot from the previous target', () => {
    arenaRememberHomeWarmForTarget({
      studyTarget: 'en',
      home: { profile: { rating: 800 } },
      expansion: { season: { stars: 12 } },
      wallNowMs: 1_000,
    });

    const spanish = arenaRememberHomeWarmForTarget({
      studyTarget: 'es',
      home: { profile: { rating: 300 } },
      wallNowMs: 1_100,
    });

    expect(spanish.home).toEqual({ profile: { rating: 300 } });
    expect(spanish.expansion).toBeNull();
    expect(arenaPeekHomeWarmForTarget(1_200, 'en')).toBeNull();
    expect(arenaPeekHomeWarmForTarget(1_200, 'es')?.studyTarget).toBe('es');
  });

  it('restores a scoped snapshot from only the matching target key', async () => {
    const data = new Map<string, string>();
    const store: ArenaKeyValueStore = {
      getItem: async (key) => data.get(key) ?? null,
      setItem: async (key, value) => { data.set(key, value); },
      removeItem: async (key) => { data.delete(key); },
    };
    arenaRememberHomeWarmForTarget({
      studyTarget: 'de', home: { profile: { rating: 500 } }, wallNowMs: 1_000, store,
    });
    await Promise.resolve();
    arenaResetHomeWarm();

    expect(await arenaLoadHomeWarmForTarget(store, 1_100, 'fr')).toBeNull();
    expect((await arenaLoadHomeWarmForTarget(store, 1_100, 'de'))?.studyTarget).toBe('de');
  });

  it('never reuses a legacy snapshot with no target inside a language contour', () => {
    const legacy = arenaHomeWarmUsable({
      schemaVersion: 'arena-home-warm.v2',
      savedAtWallMs: 1_000,
      savedDayKey: '1970-01-01',
      home: { profile: { rating: 800 } },
      expansion: null,
    }, 1_100);
    expect(legacy?.studyTarget).toBeUndefined();
    expect(arenaHomeWarmUsableForTarget(legacy, 1_100, 'en')).toBeNull();
  });
});

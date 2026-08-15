import * as fs from 'fs';
import * as path from 'path';
import {
  ARENA_WARM_TTL_MS,
  arenaLoadWarm,
  arenaPeekWarm,
  arenaRememberWarm,
  arenaResetWarm,
  arenaWarmStorageKey,
  arenaWarmUsable,
} from '../modules/arena/warm_cache';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';

/**
 * Владелец (2026-08-13): «не должно быть видимой никогда нигде загрузки».
 *
 * История, топы и разбор открывались пустыми и писали «Загрузка…». Теперь
 * первый кадр рисуется прошлым снимком, а свежее приезжает молча.
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

describe('тёплые снимки списков', () => {
  it('память отдаёт снимок синхронно — первый кадр уже со строками', () => {
    arenaResetWarm();
    expect(arenaPeekWarm('history', 1_000)).toBeUndefined();
    arenaRememberWarm({ key: 'history', value: [{ matchId: 'm1' }], wallNowMs: 1_000 });
    expect(arenaPeekWarm('history', 1_500)).toEqual([{ matchId: 'm1' }]);
  });

  it('ключи не путаются между экранами', () => {
    arenaResetWarm();
    arenaRememberWarm({ key: 'history', value: ['h'], wallNowMs: 1_000 });
    arenaRememberWarm({ key: 'tops', value: ['t'], wallNowMs: 1_000 });
    expect(arenaPeekWarm('history', 1_000)).toEqual(['h']);
    expect(arenaPeekWarm('tops', 1_000)).toEqual(['t']);
    expect(arenaPeekWarm('review', 1_000)).toBeUndefined();
  });

  it('снимок старше суток не показывается', () => {
    expect(arenaWarmUsable(
      { schemaVersion: 'arena-warm-list.v1', savedAtWallMs: 0, value: ['x'] },
      ARENA_WARM_TTL_MS + 1,
    )).toBeNull();
  });

  it('снимок из будущего не показывается — часы переведены', () => {
    expect(arenaWarmUsable(
      { schemaVersion: 'arena-warm-list.v1', savedAtWallMs: 9_000_000, value: ['x'] },
      1_000,
    )).toBeNull();
  });

  it('чужая схема отбрасывается целиком', () => {
    expect(arenaWarmUsable({ schemaVersion: 'arena-warm-list.v0', savedAtWallMs: 1, value: 1 }, 2)).toBeNull();
    expect(arenaWarmUsable('не объект', 2)).toBeNull();
  });

  it('после перезапуска снимок поднимается с диска', async () => {
    const store = fakeStore();
    arenaResetWarm();
    arenaRememberWarm({ key: 'tops', value: ['row'], wallNowMs: 1_000, store });
    arenaResetWarm();
    expect(arenaPeekWarm('tops', 2_000)).toBeUndefined();
    expect(await arenaLoadWarm(store, 'tops', 2_000)).toEqual(['row']);
    // И дальше снова доступен синхронно.
    expect(arenaPeekWarm('tops', 2_000)).toEqual(['row']);
  });

  it('битый снимок на диске не роняет экран', async () => {
    const store = fakeStore();
    arenaResetWarm();
    store.data.set(arenaWarmStorageKey('history'), '{ это не json');
    expect(await arenaLoadWarm(store, 'history', 1_000)).toBeUndefined();
  });
});

describe('экраны действительно пользуются снимками', () => {
  const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

  const SCREENS: readonly string[] = [
    'app/arena_history.tsx',
    'app/arena_tops.tsx',
    'app/arena_review.tsx',
  ];

  it('каждый берёт первый кадр из снимка и сохраняет свежий', () => {
    for (const screen of SCREENS) {
      const source = read(screen);
      expect(source).toContain('arenaPeekWarm');
      expect(source).toContain('arenaRememberWarm');
    }
  });

  /**
   * Магазин и партнёрства меняются днями, а открывались пустыми. Снимок здесь
   * почти всегда правда, а свежее приезжает той же секундой; покупку он не
   * решает — цену и остаток проверяет сервер.
   */
  it('магазин и партнёр тоже открываются снимком', () => {
    for (const screen of ['app/arena_star_wallet.tsx', 'app/arena_partner.tsx']) {
      const source = read(screen);
      expect(source).toContain('arenaPeekWarm');
      expect(source).toContain('arenaRememberWarm');
      // Загрузка не выставляется поверх уже нарисованного снимка.
      expect(source).toContain("current === 'ready' ? current : 'loading'");
    }
  });

  /**
   * Владелец (2026-08-13): «не должно быть видимой никогда нигде загрузки».
   * Список экранов перечислен поимённо, чтобы слово не вернулось на новый.
   */
  it('слова «Загрузка» нет НИ НА ОДНОМ экране Арены', () => {
    for (const screen of [
      ...SCREENS, 'app/arena.tsx', 'app/arena_ranks.tsx', 'app/arena_match.tsx',
      'app/arena_results.tsx', 'app/arena_season_pass.tsx', 'app/arena_star_wallet.tsx',
      'app/arena_partner.tsx', 'app/arena_today.tsx', 'app/arena_matchmaking.tsx',
    ]) {
      expect(read(screen)).not.toContain("arenaText(lang, 'loading')");
      expect(read(screen)).not.toContain("arenaExpansionText(lang, 'loading')");
    }
  });

  /** Конец матча — не загрузка: считать уже нечего, счёт на экране. */
  it('после матча написано, что идёт отправка итога', () => {
    expect(read('app/arena_match.tsx')).toContain("'sendingResult'");
  });

  /**
   * Разбор — единственный экран, где снимок опасен: он про КОНКРЕТНЫЙ матч.
   * Показать прошлый разбор под новым матчем хуже пустого экрана — цифры
   * выглядят настоящими.
   */
  it('разбор проверяет, что снимок про тот же матч', () => {
    expect(read('app/arena_review.tsx')).toContain('readReviewWarm');
    expect(read('app/arena_review.tsx')).toContain("matchId?: unknown }).matchId !== matchId");
  });

  it('ранги берут ранг из снимка главного экрана, а не пишут «Загрузка»', () => {
    const source = read('app/arena_ranks.tsx');
    expect(source).toContain('arenaPeekHomeWarm');
    expect(source).not.toContain("arenaText(lang, homeFailed ? 'loadFailed' : 'loading')");
  });
});

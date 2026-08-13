import * as fs from 'fs';
import * as path from 'path';
import { arenaRankScreen, arenaTierRows } from '../modules/arena/rank_view';
import { ARENA_TIER_COUNT } from '../modules/arena/rank_engine';
import { arenaText } from '../modules/arena/copy';
import type { Lang } from '../constants/i18n';

/**
 * Экран рангов.
 *
 * Владелец (D-04): вместо плоского списка на 48 строк — человеческий экран.
 * Плоский список плох не длиной, а тем, что не отвечает ни на один вопрос,
 * который игрок задаёт, глядя на ранг: сколько мне до следующего, цел ли щит,
 * иду ли я в серии, какой тир уже забран насовсем. Здесь проверяются ответы.
 */

describe('список тиров', () => {
  it('строк ровно столько, сколько тиров', () => {
    expect(arenaTierRows({ tierIndex: 0, seasonBestTierIndex: 0 }).length)
      .toBe(ARENA_TIER_COUNT);
  });

  it('текущий тир ровно один', () => {
    const rows = arenaTierRows({ tierIndex: 3, seasonBestTierIndex: 3 });
    expect(rows.filter((row) => row.current).length).toBe(1);
    expect(rows.find((row) => row.current)!.tierIndex).toBe(3);
  });

  it('следующий тир есть всегда — игроку понятно, куда идти', () => {
    for (let tierIndex = 0; tierIndex < ARENA_TIER_COUNT - 1; tierIndex += 1) {
      const rows = arenaTierRows({ tierIndex, seasonBestTierIndex: tierIndex });
      expect(rows.filter((row) => row.next).length).toBe(1);
    }
  });

  /**
   * Тир — награда, а не текущее положение. Иначе неудачная серия матчей
   * стирала бы достижение, которое уже случилось.
   */
  it('взятый тир остаётся взятым, даже когда ранг просел', () => {
    const rows = arenaTierRows({ tierIndex: 1, seasonBestTierIndex: 4 });
    expect(rows.filter((row) => row.earned).map((row) => row.tierIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(rows[4].locked).toBe(false);
  });

  it('недостижимые тиры заперты, текущий и следующий — нет', () => {
    const rows = arenaTierRows({ tierIndex: 1, seasonBestTierIndex: 1 });
    expect(rows[1].locked).toBe(false);
    expect(rows[2].locked).toBe(false);
    expect(rows[3].locked).toBe(true);
    expect(rows[7].locked).toBe(true);
  });

  it('диапазоны очков идут подряд и не пересекаются', () => {
    const rows = arenaTierRows({ tierIndex: 0, seasonBestTierIndex: 0 });
    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index].minRp).toBeGreaterThan(rows[index - 1].minRp);
      expect(rows[index].minRp).toBeGreaterThan(rows[index - 1].maxRp);
    }
  });

  it('на последнем тире «следующий» не уезжает за шкалу', () => {
    const rows = arenaTierRows({ tierIndex: ARENA_TIER_COUNT - 1, seasonBestTierIndex: 7 });
    expect(rows.every((row) => row.tierIndex < ARENA_TIER_COUNT)).toBe(true);
    expect(rows.filter((row) => row.next).length).toBe(0);
  });
});

describe('экран целиком', () => {
  it('новичок: бронза III, полоса пуста, щит цел', () => {
    const screen = arenaRankScreen({ rp: 0 });
    expect(screen.tierKey).toBe('bronze');
    expect(screen.division).toBe(3);
    expect(screen.progress).toBe(0);
  });

  it('полоса показывает долю до следующего деления', () => {
    expect(arenaRankScreen({ rp: 150 }).progress).toBeCloseTo(0.5, 3);
    expect(arenaRankScreen({ rp: 150 }).rpToNextRank).toBe(50);
  });

  it('полоса не выходит за границы ни при каких очках', () => {
    for (const rp of [-500, 0, 99, 100, 1_234, 2_399, 2_400, 999_999, NaN]) {
      const screen = arenaRankScreen({ rp });
      expect(screen.progress).toBeGreaterThanOrEqual(0);
      expect(screen.progress).toBeLessThanOrEqual(1);
      expect(screen.rpToNextRank).toBeGreaterThanOrEqual(0);
    }
  });

  /** Наверху шкалы копить не к чему, и «осталось 100» было бы враньём. */
  it('на вершине не обещает следующего деления', () => {
    const screen = arenaRankScreen({ rp: 999_999 });
    expect(screen.top).toBe(true);
    expect(screen.rpToNextRank).toBe(0);
    expect(screen.progress).toBe(1);
  });

  /** Иначе у нового игрока подсветка не совпадёт с тем, где он стоит. */
  it('текущий тир всегда считается взятым', () => {
    const screen = arenaRankScreen({ rp: 1_500, seasonBestTierIndex: 0 });
    expect(screen.seasonBestTierIndex).toBeGreaterThanOrEqual(screen.tierIndex);
    expect(screen.tiers[screen.tierIndex].earned).toBe(true);
  });

  it('процентиль показывается только когда он есть', () => {
    expect(arenaRankScreen({ rp: 500 }).percentileAbove).toBeNull();
    expect(arenaRankScreen({ rp: 500, percentileAbove: 72 }).percentileAbove).toBe(72);
    expect(arenaRankScreen({ rp: 500, percentileAbove: 150 }).percentileAbove).toBe(99);
    expect(arenaRankScreen({ rp: 500, percentileAbove: -5 }).percentileAbove).toBe(0);
  });

  it('битое состояние ранга не роняет экран', () => {
    const screen = arenaRankScreen({
      rp: NaN,
      seasonBestTierIndex: 99,
      percentileAbove: NaN,
    });
    expect(screen.rp).toBe(0);
    expect(screen.tiers.length).toBe(ARENA_TIER_COUNT);
    expect(screen.seasonBestTierIndex).toBeLessThan(ARENA_TIER_COUNT);
  });
});

/**
 * Таблица друзей на экране рангов просто ИСЧЕЗАЛА при отказе загрузки: игрок
 * видел пустое место и решал, что друзей у него нет. И то же самое место
 * показывалось, когда сравнивать действительно не с кем — два разных повода
 * выглядели одинаково.
 */
describe('таблица друзей различает отказ и отсутствие друзей', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_ranks.tsx'), 'utf8');

  it('состояние считается общим модулем, а не длиной массива', () => {
    expect(source).toContain('arenaLoadState');
    expect(source).toContain('friendsState');
    // Старая единственная развилка по длине больше не решает судьбу блока.
    expect(source).not.toContain('{friends.length > 1 ? (');
  });

  it('отказ отделён от пустоты и оба объяснены', () => {
    expect(source).toContain("'loadFailed'");
    expect(source).toContain("'friendsBoardEmpty'");
    expect(source).toContain("'friendsBoardEmptyHint'");
  });

  it('строки пустой таблицы переведены на восемь языков', () => {
    for (const lang of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as Lang[]) {
      expect(arenaText(lang, 'friendsBoardEmpty').length).toBeGreaterThan(0);
      expect(arenaText(lang, 'friendsBoardEmptyHint').length).toBeGreaterThan(0);
      expect(arenaText(lang, 'friendsBoardEmpty')).not.toBe(arenaText(lang, 'loadFailed'));
    }
  });
});

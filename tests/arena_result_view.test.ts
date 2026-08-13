import {
  arenaResultAnnounce,
  arenaResultHasAnnounce,
  arenaTierKeyForRating,
} from '../modules/arena/result_view';
import { ARENA_TIER_KEYS } from '../modules/arena/rank_engine';
import * as fs from 'fs';
import * as path from 'path';
import { arenaText } from '../modules/arena/copy';
import type { Lang } from '../constants/i18n';

/**
 * Что объявить после матча.
 *
 * Экран результата умел только ЗВУЧАТЬ: повышение тира и выданную косметику он
 * проигрывал звуком и не показывал. Игрок, взявший тир, слышал фанфару и не
 * видел ничего — то есть не узнавал ни что случилось, ни что он получил.
 *
 * Главное правило здесь: молчать, а не выдумывать. Ложное «ты поднялся в тир»
 * хуже молчания — игрок пойдёт проверять и не найдёт подтверждения.
 */

const reward = (over: Record<string, unknown> = {}) => ({
  starsEarned: 12,
  xpEarned: 40,
  ratingDelta: 20,
  rankEvent: 'tier_up',
  rankTierBefore: 0,
  rankTierAfter: 1,
  ...over,
});

describe('повышение и понижение', () => {
  it('подъём в тир объявляется с названием тира', () => {
    const announce = arenaResultAnnounce(reward());
    expect(announce.rank.kind).toBe('tier_up');
    expect(announce.rank.kind === 'tier_up' && announce.rank.tierKey).toBe(ARENA_TIER_KEYS[1]);
  });

  it('падение из тира объявляется отдельно', () => {
    const announce = arenaResultAnnounce(reward({ rankEvent: 'tier_down', rankTierAfter: 0 }));
    expect(announce.rank.kind).toBe('tier_down');
  });

  it('смена деления внутри тира — своё событие, не подмена тира', () => {
    expect(arenaResultAnnounce(reward({ rankEvent: 'rank_up' })).rank.kind).toBe('rank_up');
    expect(arenaResultAnnounce(reward({ rankEvent: 'rank_down' })).rank.kind).toBe('rank_down');
  });

  it('без события ранга — молчим', () => {
    expect(arenaResultAnnounce(reward({ rankEvent: 'none' })).rank.kind).toBe('none');
    expect(arenaResultAnnounce(reward({ rankEvent: undefined })).rank.kind).toBe('none');
  });

  /** Назвать тир наугад значит соврать. */
  it('событие есть, а тир за шкалой — молчим, а не выдумываем', () => {
    for (const value of [99, -1, null, 'золото', NaN]) {
      expect(arenaResultAnnounce(reward({ rankTierAfter: value })).rank.kind).toBe('none');
    }
  });

  it('отменённое событие серии больше не объявляется', () => {
    // Промо-серий нет (D-40): их событие не должно превращаться в подъём.
    expect(arenaResultAnnounce(reward({ rankEvent: 'promo_won' })).rank.kind).toBe('none');
  });
});

describe('выданная косметика', () => {
  it('перечисляется по предметам', () => {
    const announce = arenaResultAnnounce(reward({
      tierRewards: [{ tierIndex: 1, itemId: 'title_rising_challenger' }],
    }));
    expect(announce.unlockedItemIds).toEqual(['title_rising_challenger']);
  });

  it('несколько тиров за раз дают несколько предметов', () => {
    const announce = arenaResultAnnounce(reward({
      tierRewards: [
        { tierIndex: 1, itemId: 'a' },
        { tierIndex: 2, itemId: 'b' },
      ],
    }));
    expect(announce.unlockedItemIds).toEqual(['a', 'b']);
  });

  it('битые записи выпадают, целые остаются', () => {
    const announce = arenaResultAnnounce(reward({
      tierRewards: [null, { tierIndex: 1 }, 'мусор', { itemId: 'ok' }],
    }));
    expect(announce.unlockedItemIds).toEqual(['ok']);
  });

  it('ничего не выдано — пустой список, а не выдуманный предмет', () => {
    expect(arenaResultAnnounce(reward()).unlockedItemIds).toEqual([]);
    expect(arenaResultAnnounce(reward({ tierRewards: 'нет' })).unlockedItemIds).toEqual([]);
  });
});

describe('числа', () => {
  it('очки ранга берутся со знаком — потерю скрывать нельзя', () => {
    expect(arenaResultAnnounce(reward({ ratingDelta: -24 })).ratingDelta).toBe(-24);
    expect(arenaResultAnnounce(reward({ ratingDelta: 20 })).ratingDelta).toBe(20);
  });

  it('звёзды и опыт отрицательными не бывают', () => {
    const announce = arenaResultAnnounce(reward({ starsEarned: -5, xpEarned: -10 }));
    expect(announce.starsEarned).toBe(0);
    expect(announce.xpEarned).toBe(0);
  });

  it('мусор вместо награды не роняет экран', () => {
    for (const value of [null, undefined, 'строка', [], 42]) {
      const announce = arenaResultAnnounce(value);
      expect(announce.rank.kind).toBe('none');
      expect(announce.unlockedItemIds).toEqual([]);
      expect(announce.ratingDelta).toBe(0);
    }
  });
});

describe('есть ли что объявлять', () => {
  it('нечего — не показываем блок вовсе', () => {
    expect(arenaResultHasAnnounce(arenaResultAnnounce({
      starsEarned: 5, xpEarned: 10, ratingDelta: 0,
    }))).toBe(false);
  });

  it('любое из трёх — показываем', () => {
    expect(arenaResultHasAnnounce(arenaResultAnnounce(reward()))).toBe(true);
    expect(arenaResultHasAnnounce(arenaResultAnnounce({ ratingDelta: -16 }))).toBe(true);
    expect(arenaResultHasAnnounce(arenaResultAnnounce({
      tierRewards: [{ itemId: 'x' }],
    }))).toBe(true);
  });
});

describe('тир по очкам', () => {
  it('считается для любого значения', () => {
    expect(arenaTierKeyForRating(0)).toBe(ARENA_TIER_KEYS[0]);
    expect(arenaTierKeyForRating(300)).toBe(ARENA_TIER_KEYS[1]);
    expect(arenaTierKeyForRating(999_999)).toBe(ARENA_TIER_KEYS[ARENA_TIER_KEYS.length - 1]);
    expect(arenaTierKeyForRating(NaN)).toBe(ARENA_TIER_KEYS[0]);
  });
});

/**
 * Экран результата и красное слово «Повторить».
 *
 * При обрыве связи он краснел одним глаголом — без объяснения и без кнопки,
 * которой этот глагол можно выполнить. Игрок видел красное и решал, что
 * потерял результат матча. На самом деле результат уже засчитан на сервере, и
 * ждёт только доставка: повторять нечего.
 */
describe('обрыв связи на экране результата', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_results.tsx'), 'utf8');

  it('не выдаёт кнопочный глагол за объяснение', () => {
    expect(source).not.toContain("styles.error, { color: P.danger }]}>{arenaText(lang, 'retry')");
  });

  it('объясняет, что результат уже засчитан', () => {
    expect(source).toContain("'resultPending'");
    expect(source).toContain("'resultPendingHint'");
  });

  it('пустой экран до ответа честно называет себя загрузкой', () => {
    expect(source).toContain("!match ?");
  });

  it('обе строки переведены на восемь языков', () => {
    for (const lang of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as Lang[]) {
      expect(arenaText(lang, 'resultPending').length).toBeGreaterThan(0);
      expect(arenaText(lang, 'resultPendingHint').length).toBeGreaterThan(0);
      // Объяснение не должно совпадать с подписью кнопки повтора.
      expect(arenaText(lang, 'resultPending')).not.toBe(arenaText(lang, 'retry'));
    }
  });
});

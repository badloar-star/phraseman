import {
  ARENA_TIER_REWARD_ITEMS,
  arenaTierRewardItem,
  arenaTierRewardLadder,
  arenaTierRewardOpId,
  arenaTierRewardsEarned,
} from '../modules/arena/tier_rewards';
import * as server from '../functions/src/arena_tier_rewards';
import { ARENA_TIER_COUNT } from '../modules/arena/rank_engine';
import { ARENA_COSMETICS } from '../modules/arena/arena_cosmetics';
import { arenaStoreItemTitle } from '../modules/arena/expansion_store_copy';

/**
 * Награды за достижение тира.
 *
 * Владелец (D-63) дословно: «награда за первое достижение каждого тира (8 за
 * всю жизнь) — косметика Арены: титул, рамка, эффект. Общую экономику звёзд не
 * трогаем».
 *
 * Первая версия давала ЗВЁЗДЫ и раз в СЕЗОН — то есть нарушала оба условия
 * сразу. Тесты держат правильные.
 */

describe('награда — косметика, а не звёзды', () => {
  /** Звезда это валюта всего приложения (D-05). */
  it('в наградах нет ни одного числа звёзд', () => {
    const rewards = arenaTierRewardsEarned({ lifetimeBestBefore: 0, lifetimeBestAfter: 7 });
    for (const reward of rewards) {
      expect(reward).not.toHaveProperty('stars');
      expect(typeof reward.itemId).toBe('string');
    }
  });

  it('каждый предмет существует в каталоге косметики', () => {
    const known = new Set(ARENA_COSMETICS.map((item) => item.itemId));
    for (const itemId of ARENA_TIER_REWARD_ITEMS) {
      if (itemId === null) continue;
      expect(known.has(itemId)).toBe(true);
    }
  });

  /**
   * Предмет без названия рисуется в магазине как «Сейчас недоступно», а его
   * кнопка гаснет: игрок получает награду, которую нельзя ни увидеть, ни
   * надеть, и никакой ошибки при этом не показывается.
   */
  it('у каждого предмета каталога есть название на всех восьми языках', () => {
    const langs = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
    for (const item of ARENA_COSMETICS) {
      for (const lang of langs) {
        const title = arenaStoreItemTitle(lang as never, item.itemId);
        expect(typeof title).toBe('string');
        expect((title ?? '').length).toBeGreaterThan(0);
      }
    }
  });

  it('предметы не повторяются между тирами', () => {
    const items = ARENA_TIER_REWARD_ITEMS.filter((item): item is string => item !== null);
    expect(new Set(items).size).toBe(items.length);
  });

  it('бронза бесплатна — платить за вход незачем', () => {
    expect(arenaTierRewardItem(0)).toBeNull();
  });

  it('всего наград семь — по одной на тир кроме стартового', () => {
    expect(ARENA_TIER_REWARD_ITEMS.length).toBe(ARENA_TIER_COUNT);
    expect(ARENA_TIER_REWARD_ITEMS.filter((item) => item !== null).length).toBe(ARENA_TIER_COUNT - 1);
  });
});

describe('награда — раз за всю жизнь', () => {
  /**
   * Ключ с сезоном выдал бы награду заново в следующем сезоне и превратил бы
   * редкую веху в рутинную подачку.
   */
  it('ключ операции НЕ содержит сезона', () => {
    expect(arenaTierRewardOpId(3)).toBe('arena_tier.t3');
    expect(arenaTierRewardOpId(3)).not.toContain('2026');
    expect(arenaTierRewardOpId(3)).toBe(arenaTierRewardOpId(3));
    expect(arenaTierRewardOpId(3)).not.toBe(arenaTierRewardOpId(4));
  });

  it('повторное достижение того же тира ничего не даёт', () => {
    expect(arenaTierRewardsEarned({ lifetimeBestBefore: 3, lifetimeBestAfter: 3 })).toEqual([]);
  });

  it('откат награду не отбирает и не выдаёт заново', () => {
    expect(arenaTierRewardsEarned({ lifetimeBestBefore: 5, lifetimeBestAfter: 2 })).toEqual([]);
  });
});

describe('что причитается за подъём', () => {
  it('подъём на тир даёт награду этого тира', () => {
    const rewards = arenaTierRewardsEarned({ lifetimeBestBefore: 0, lifetimeBestAfter: 1 });
    expect(rewards.length).toBe(1);
    expect(rewards[0].tierIndex).toBe(1);
    expect(rewards[0].itemId).toBe(arenaTierRewardItem(1));
  });

  /** После мягкого сброса игрок может взять два тира подряд. */
  it('перепрыгнутые тиры не теряются', () => {
    const rewards = arenaTierRewardsEarned({ lifetimeBestBefore: 1, lifetimeBestAfter: 4 });
    expect(rewards.map((row) => row.tierIndex)).toEqual([2, 3, 4]);
  });

  it('за шкалу не выходит', () => {
    const rewards = arenaTierRewardsEarned({ lifetimeBestBefore: 0, lifetimeBestAfter: 99 });
    expect(rewards.every((row) => row.tierIndex < ARENA_TIER_COUNT)).toBe(true);
  });

  it('мусор не роняет', () => {
    expect(arenaTierRewardsEarned({ lifetimeBestBefore: NaN, lifetimeBestAfter: NaN })).toEqual([]);
  });

  it('вся жизнь целиком даёт ровно семь наград', () => {
    const all = arenaTierRewardsEarned({ lifetimeBestBefore: 0, lifetimeBestAfter: ARENA_TIER_COUNT - 1 });
    expect(all.length).toBe(ARENA_TIER_COUNT - 1);
    expect(new Set(all.map((row) => row.tierIndex)).size).toBe(all.length);
  });
});

describe('лестница для экрана', () => {
  it('показывает все тиры и что уже забрано', () => {
    const ladder = arenaTierRewardLadder(3);
    expect(ladder.length).toBe(ARENA_TIER_COUNT);
    expect(ladder.filter((row) => row.claimed).map((row) => row.tierIndex)).toEqual([0, 1, 2, 3]);
  });

  it('мусор не роняет и не выводит за шкалу', () => {
    expect(arenaTierRewardLadder(NaN).length).toBe(ARENA_TIER_COUNT);
    expect(arenaTierRewardLadder(999).every((row) => row.claimed)).toBe(true);
  });
});

describe('паритет клиента и сервера', () => {
  it('таблица предметов совпадает', () => {
    expect(ARENA_TIER_REWARD_ITEMS).toEqual(server.ARENA_TIER_REWARD_ITEMS);
  });

  it('расчёт совпадает на всей решётке подъёмов', () => {
    for (let before = -2; before <= ARENA_TIER_COUNT + 1; before += 1) {
      for (let after = -2; after <= ARENA_TIER_COUNT + 1; after += 1) {
        expect(arenaTierRewardsEarned({ lifetimeBestBefore: before, lifetimeBestAfter: after }))
          .toEqual(server.arenaTierRewardsEarned({ lifetimeBestBefore: before, lifetimeBestAfter: after }));
      }
    }
  });

  it('ключи операций совпадают', () => {
    for (let tierIndex = 0; tierIndex < ARENA_TIER_COUNT; tierIndex += 1) {
      expect(arenaTierRewardOpId(tierIndex)).toBe(server.arenaTierRewardOpId(tierIndex));
    }
  });
});

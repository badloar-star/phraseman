import {
  CollectiblesDropState,
  parseDropState,
  rollCollectibleDrop,
} from './collectibles';
import { CollectiblePoolCard } from './collectibles_catalog';

const POOL: CollectiblePoolCard[] = [
  { id: 'a1', setId: 'setA', rarity: 'common' },
  { id: 'a2', setId: 'setA', rarity: 'common' },
  { id: 'a3', setId: 'setA', rarity: 'rare' },
  { id: 'a4', setId: 'setA', rarity: 'epic' },
  { id: 'b1', setId: 'setB', rarity: 'common' },
  { id: 'b2', setId: 'setB', rarity: 'legendary' },
];

function freshState(over: Partial<CollectiblesDropState> = {}): CollectiblesDropState {
  return { date: '2026-06-11', drops: 0, attempts: 0, sinceEpic: 0, sinceLegendary: 0, total: 0, ...over };
}

describe('parseDropState', () => {
  test('сбрасывает дневные счётчики на новый день, pity сохраняет', () => {
    const raw = JSON.stringify({ date: '2026-06-10', drops: 3, attempts: 9, sinceEpic: 7, sinceLegendary: 20, total: 41 });
    expect(parseDropState(raw, '2026-06-11')).toEqual({
      date: '2026-06-11', drops: 0, attempts: 0, sinceEpic: 7, sinceLegendary: 20, total: 41,
    });
  });

  test('мусор на входе превращается в нулевое состояние', () => {
    expect(parseDropState('not-json', '2026-06-11')).toEqual(freshState());
  });
});

describe('rollCollectibleDrop', () => {
  test('детерминирован: один seed — один исход', () => {
    const params = { seedBase: 'collect:u1:lesson:5:2026-06-11', owned: {}, state: freshState(), isPremium: false, pool: POOL };
    const first = rollCollectibleDrop(params);
    const second = rollCollectibleDrop(params);
    expect(second).toEqual(first);
  });

  test('первый дроп дня гарантирован', () => {
    const res = rollCollectibleDrop({ seedBase: 'x', owned: {}, state: freshState(), isPremium: false, pool: POOL });
    expect(res.dropped).toBe(true);
  });

  test('дневной кап: 3 для free, 4 для premium', () => {
    const state = freshState({ drops: 3 });
    expect(rollCollectibleDrop({ seedBase: 'x', owned: {}, state, isPremium: false, pool: POOL }))
      .toEqual({ dropped: false, reason: 'daily_cap' });
    const prem = rollCollectibleDrop({ seedBase: 'x', owned: {}, state, isPremium: true, pool: POOL });
    expect(prem.dropped ? true : prem.reason !== 'daily_cap').toBe(true);
  });

  test('потолок попыток в день', () => {
    const state = freshState({ attempts: 24 });
    expect(rollCollectibleDrop({ seedBase: 'x', owned: {}, state, isPremium: false, pool: POOL }))
      .toEqual({ dropped: false, reason: 'attempt_cap' });
  });

  test('дубли не выпадают: owned-карточки исключены из пула', () => {
    const owned = { a1: 1, a2: 1, a3: 1, a4: 1, b1: 1 };
    for (let i = 0; i < 50; i += 1) {
      const res = rollCollectibleDrop({ seedBase: `s${i}`, owned, state: freshState(), isPremium: false, pool: POOL });
      if (res.dropped) expect(res.card.id).toBe('b2');
    }
  });

  test('пул вычерпан — pool_exhausted', () => {
    const owned = { a1: 1, a2: 1, a3: 1, a4: 1, b1: 1, b2: 1 };
    expect(rollCollectibleDrop({ seedBase: 'x', owned, state: freshState(), isPremium: false, pool: POOL }))
      .toEqual({ dropped: false, reason: 'pool_exhausted' });
  });

  test('pity epic: на 15-м дропе без epic+ выпадает epic', () => {
    const state = freshState({ sinceEpic: 14, sinceLegendary: 10 });
    const res = rollCollectibleDrop({ seedBase: 'pity-e', owned: {}, state, isPremium: false, pool: POOL });
    expect(res.dropped).toBe(true);
    if (res.dropped) {
      expect(res.card.rarity).toBe('epic');
      expect(res.nextState.sinceEpic).toBe(0);
    }
  });

  test('pity legendary: на 35-м дропе без legendary выпадает legendary', () => {
    const state = freshState({ sinceEpic: 2, sinceLegendary: 34 });
    const res = rollCollectibleDrop({ seedBase: 'pity-l', owned: {}, state, isPremium: false, pool: POOL });
    expect(res.dropped).toBe(true);
    if (res.dropped) {
      expect(res.card.rarity).toBe('legendary');
      expect(res.nextState.sinceLegendary).toBe(0);
      expect(res.nextState.sinceEpic).toBe(0);
    }
  });

  test('счётчики pity растут, когда выпала обычная карточка', () => {
    const state = freshState({ sinceEpic: 3, sinceLegendary: 8 });
    // Гарантированный первый дроп дня; ищем seed с common/rare исходом.
    for (let i = 0; i < 30; i += 1) {
      const res = rollCollectibleDrop({ seedBase: `grow${i}`, owned: {}, state, isPremium: false, pool: POOL });
      if (res.dropped && res.card.rarity !== 'epic' && res.card.rarity !== 'legendary') {
        expect(res.nextState.sinceEpic).toBe(4);
        expect(res.nextState.sinceLegendary).toBe(9);
        return;
      }
    }
    throw new Error('не нашлось seed с common/rare дропом');
  });

  test('сет, неизвестный каталогу, никогда не «закрывается» и не даёт секретку', () => {
    const owned = { a1: 1, a2: 1, a3: 1 }; // в синтетическом setA не хватает только a4
    // Подберём seed, который дропает именно a4 (через pity epic он гарантирован).
    const state = freshState({ sinceEpic: 14 });
    const res = rollCollectibleDrop({
      seedBase: 'finish-set', owned, state, isPremium: false,
      pool: POOL.filter((c) => c.setId === 'setA'),
    });
    expect(res.dropped).toBe(true);
    if (res.dropped) {
      expect(res.card.id).toBe('a4');
      // setA нет в COLLECTIBLE_SET_CARD_IDS — полнота не подтверждается каталогом,
      // секретка и осколки не выдаются (защита от мусорных setId).
      expect(res.setCompleted).toBe(false);
      expect(res.secretCardId).toBeNull();
      expect(res.bonusShards).toBe(0);
    }
  });

  test('закрытие реального сета из каталога даёт секретку и 15 осколков', () => {
    // Берём реальный set01_animals: все, кроме одной карточки, уже собраны.
    const { COLLECTIBLE_SET_CARD_IDS, COLLECTIBLE_SECRET_BY_SET, COLLECTIBLE_POOL } =
      require('./collectibles_catalog');
    const setId = Object.keys(COLLECTIBLE_SET_CARD_IDS)[0];
    const ids: string[] = COLLECTIBLE_SET_CARD_IDS[setId];
    const missing = ids[ids.length - 1];
    const owned: Record<string, number> = {};
    for (const id of ids) if (id !== missing) owned[id] = 1;
    // Все карточки других сетов тоже «собраны», чтобы дроп был только из setId.
    for (const c of COLLECTIBLE_POOL) if (c.setId !== setId) owned[c.id] = 1;

    const res = rollCollectibleDrop({ seedBase: 'real-set', owned, state: freshState(), isPremium: false });
    expect(res.dropped).toBe(true);
    if (res.dropped) {
      expect(res.card.id).toBe(missing);
      expect(res.setCompleted).toBe(true);
      expect(res.secretCardId).toBe(COLLECTIBLE_SECRET_BY_SET[setId]);
      expect(res.bonusShards).toBe(15);
    }
  });

  test('шанс ~28%: не первый дроп дня выпадает не всегда', () => {
    const state = freshState({ drops: 1, attempts: 1 });
    let dropped = 0;
    const n = 400;
    for (let i = 0; i < n; i += 1) {
      const res = rollCollectibleDrop({ seedBase: `chance${i}`, owned: {}, state, isPremium: false, pool: POOL });
      if (res.dropped) dropped += 1;
    }
    expect(dropped / n).toBeGreaterThan(0.18);
    expect(dropped / n).toBeLessThan(0.38);
  });
});

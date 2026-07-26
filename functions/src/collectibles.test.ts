import {
  CollectiblesDropState,
  EVENT_ID_RE,
  parseDropState,
  rollCollectibleDrop,
  collectiblesDropConfigFromData,
  COLLECTIBLES_DROP_DEFAULTS,
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

describe('EVENT_ID_RE', () => {
  test('пропускает все точки дропа, включая турнир/словарь/глаголы/предлоги', () => {
    const valid = [
      'lesson:5:2026-06-11',
      'plan:task7',
      'quiz:q1',
      'arena:room9',
      'exam:level3',
      'tournament:room_abc123',
      'vocab:en:12',
      'verbs:en:12',
      'prep:en:12',
    ];
    for (const eventId of valid) expect(EVENT_ID_RE.test(eventId)).toBe(true);
  });

  test('отвергает неизвестный kind и мусор — клиент не может выдумать активность', () => {
    const invalid = ['hack:1', 'tournaments:1', 'vocabulary:1', 'lesson', ':5', 'lesson:пять', ''];
    for (const eventId of invalid) expect(EVENT_ID_RE.test(eventId)).toBe(false);
  });
});

describe('rollCollectibleDrop', () => {
  test('детерминирован: один seed — один исход', () => {
    const params = { seedBase: 'collect:u1:lesson:5:2026-06-11', kind: 'lesson', owned: {}, state: freshState(), isPremium: false, pool: POOL };
    const first = rollCollectibleDrop(params);
    const second = rollCollectibleDrop(params);
    expect(second).toEqual(first);
  });

  test('самая первая карточка за всё время гарантирована (total === 0)', () => {
    const res = rollCollectibleDrop({ seedBase: 'x', kind: 'lesson', owned: {}, state: freshState(), isPremium: false, pool: POOL });
    expect(res.dropped).toBe(true);
  });

  test('первый дроп дня БОЛЬШЕ не гарантирован, если карточки уже были (total > 0)', () => {
    // total > 0, drops === 0 — раньше был бы гарант, теперь подчиняется шансу 15%.
    const state = freshState({ total: 5 });
    let dropped = 0;
    const n = 400;
    for (let i = 0; i < n; i += 1) {
      const res = rollCollectibleDrop({ seedBase: `firstday${i}`, kind: 'lesson', owned: {}, state, isPremium: false, pool: POOL });
      if (res.dropped) dropped += 1;
    }
    expect(dropped).toBeLessThan(n);            // не 100%
    expect(dropped / n).toBeGreaterThan(0.08);  // в районе 15%
    expect(dropped / n).toBeLessThan(0.24);
  });

  test('дневной кап: 3 для free, 4 для premium', () => {
    const state = freshState({ drops: 3 });
    expect(rollCollectibleDrop({ seedBase: 'x', kind: 'lesson', owned: {}, state, isPremium: false, pool: POOL }))
      .toEqual({ dropped: false, reason: 'daily_cap' });
    const prem = rollCollectibleDrop({ seedBase: 'x', kind: 'lesson', owned: {}, state, isPremium: true, pool: POOL });
    expect(prem.dropped ? true : prem.reason !== 'daily_cap').toBe(true);
  });

  test('потолок попыток в день', () => {
    const state = freshState({ attempts: 24 });
    expect(rollCollectibleDrop({ seedBase: 'x', kind: 'lesson', owned: {}, state, isPremium: false, pool: POOL }))
      .toEqual({ dropped: false, reason: 'attempt_cap' });
  });

  test('дубли не выпадают: owned-карточки исключены из пула', () => {
    const owned = { a1: 1, a2: 1, a3: 1, a4: 1, b1: 1 };
    for (let i = 0; i < 50; i += 1) {
      const res = rollCollectibleDrop({ seedBase: `s${i}`, kind: 'lesson', owned, state: freshState(), isPremium: false, pool: POOL });
      if (res.dropped) expect(res.card.id).toBe('b2');
    }
  });

  test('пул вычерпан — pool_exhausted', () => {
    const owned = { a1: 1, a2: 1, a3: 1, a4: 1, b1: 1, b2: 1 };
    expect(rollCollectibleDrop({ seedBase: 'x', kind: 'lesson', owned, state: freshState(), isPremium: false, pool: POOL }))
      .toEqual({ dropped: false, reason: 'pool_exhausted' });
  });

  test('pity epic: на 15-м дропе без epic+ выпадает epic', () => {
    const state = freshState({ sinceEpic: 14, sinceLegendary: 10 });
    const res = rollCollectibleDrop({ seedBase: 'pity-e', kind: 'lesson', owned: {}, state, isPremium: false, pool: POOL });
    expect(res.dropped).toBe(true);
    if (res.dropped) {
      expect(res.card.rarity).toBe('epic');
      expect(res.nextState.sinceEpic).toBe(0);
    }
  });

  test('pity legendary: на 35-м дропе без legendary выпадает legendary', () => {
    const state = freshState({ sinceEpic: 2, sinceLegendary: 34 });
    const res = rollCollectibleDrop({ seedBase: 'pity-l', kind: 'lesson', owned: {}, state, isPremium: false, pool: POOL });
    expect(res.dropped).toBe(true);
    if (res.dropped) {
      expect(res.card.rarity).toBe('legendary');
      expect(res.nextState.sinceLegendary).toBe(0);
      expect(res.nextState.sinceEpic).toBe(0);
    }
  });

  test('счётчики pity растут, когда выпала обычная карточка', () => {
    const state = freshState({ sinceEpic: 3, sinceLegendary: 8 });
    // total === 0 → дроп гарантирован (первая карточка за всё время); ищем seed с common/rare исходом.
    for (let i = 0; i < 30; i += 1) {
      const res = rollCollectibleDrop({ seedBase: `grow${i}`, kind: 'lesson', owned: {}, state, isPremium: false, pool: POOL });
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
      seedBase: 'finish-set', kind: 'lesson', owned, state, isPremium: false,
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

  test('закрытие реального сета из каталога даёт секретку, но 0 монет (новая экономика)', () => {
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

    const res = rollCollectibleDrop({ seedBase: 'real-set', kind: 'lesson', owned, state: freshState(), isPremium: false });
    expect(res.dropped).toBe(true);
    if (res.dropped) {
      expect(res.card.id).toBe(missing);
      expect(res.setCompleted).toBe(true);
      expect(res.secretCardId).toBe(COLLECTIBLE_SECRET_BY_SET[setId]);
      // План 2026-07-20 §7: бонус за сет обнулён, секретная карточка сохранена.
      expect(res.bonusShards).toBe(0);
    }
  });

  test('шанс ~15%: после первой карточки за всё время выпадает не всегда', () => {
    const state = freshState({ drops: 1, attempts: 1, total: 1 });
    let dropped = 0;
    const n = 400;
    for (let i = 0; i < n; i += 1) {
      const res = rollCollectibleDrop({ seedBase: `chance${i}`, kind: 'lesson', owned: {}, state, isPremium: false, pool: POOL });
      if (res.dropped) dropped += 1;
    }
    expect(dropped / n).toBeGreaterThan(0.08);
    expect(dropped / n).toBeLessThan(0.24);
  });

  test('pronounce/dialog дроп не дают — даже на гарантированной первой карточке за всё время', () => {
    for (const kind of ['pronounce', 'dialog']) {
      const res = rollCollectibleDrop({ seedBase: `${kind}-x`, kind, owned: {}, state: freshState(), isPremium: false, pool: POOL });
      expect(res).toEqual({ dropped: false, reason: 'no_luck' });
    }
  });

  test('единый шанс 15%: урок/квиз/экзамен/арена/план дают одинаковый исход на одних сидах', () => {
    // После первой карточки за всё время (total > 0) шанс одинаков для всех видов.
    const state = freshState({ drops: 1, attempts: 1, total: 3 });
    const kinds = ['lesson', 'quiz', 'exam', 'arena', 'plan'];
    const n = 200;
    for (let i = 0; i < n; i += 1) {
      const seedBase = `flat${i}`;
      const outcomes = kinds.map((kind) =>
        rollCollectibleDrop({ seedBase, kind, owned: {}, state, isPremium: false, pool: POOL }).dropped,
      );
      // Один и тот же seed → один и тот же исход «выпало/нет» для всех видов.
      expect(new Set(outcomes).size).toBe(1);
    }
  });
});

describe('collectiblesDropConfigFromData (тюнинг из Пульта)', () => {
  test('пусто/undefined → дефолты', () => {
    expect(collectiblesDropConfigFromData(undefined)).toEqual(COLLECTIBLES_DROP_DEFAULTS);
    expect(collectiblesDropConfigFromData({})).toEqual(COLLECTIBLES_DROP_DEFAULTS);
  });

  test('читает шанс в процентах и капы', () => {
    const cfg = collectiblesDropConfigFromData({
      collectibles_drop_chance_pct: 50,
      collectibles_daily_cap_free: 1,
      collectibles_daily_cap_premium: 9,
      collectibles_attempt_cap: 100,
      collectibles_pity_epic_at: 5,
      collectibles_pity_legendary_at: 10,
      collectibles_set_bonus_shards: 99,
    });
    expect(cfg.flatDropChance).toBeCloseTo(0.5, 5);
    expect(cfg.dailyDropCapFree).toBe(1);
    expect(cfg.dailyDropCapPremium).toBe(9);
    expect(cfg.dailyAttemptCap).toBe(100);
    expect(cfg.pityEpicAt).toBe(5);
    expect(cfg.pityLegendaryAt).toBe(10);
    expect(cfg.setBonusShards).toBe(99);
  });

  test('мусор/вне границ → дефолт по полю (не роняет)', () => {
    const cfg = collectiblesDropConfigFromData({
      collectibles_drop_chance_pct: 'nope',
      collectibles_daily_cap_free: -5,        // клампится к 0
      collectibles_pity_epic_at: 0,           // ниже min=1 → клампится к 1
    });
    expect(cfg.flatDropChance).toBeCloseTo(COLLECTIBLES_DROP_DEFAULTS.flatDropChance, 5);
    expect(cfg.dailyDropCapFree).toBe(0);
    expect(cfg.pityEpicAt).toBe(1);
  });

  test('config=0% шанс → дроп не выпадает (кроме гарантии первой за всё время)', () => {
    const zero = collectiblesDropConfigFromData({ collectibles_drop_chance_pct: 0 });
    // total>0 (первая уже была) + 0% → не выпадает ни на одном сиде
    const state = freshState({ total: 5 });
    for (let i = 0; i < 50; i += 1) {
      const res = rollCollectibleDrop({ seedBase: `z${i}`, kind: 'lesson', owned: {}, state, isPremium: false, pool: POOL, config: zero });
      expect(res.dropped).toBe(false);
    }
  });

  test('config кап free=0 → daily_cap сразу (total>0)', () => {
    const cfg = collectiblesDropConfigFromData({ collectibles_daily_cap_free: 0 });
    const res = rollCollectibleDrop({ seedBase: 'cap', kind: 'lesson', owned: {}, state: freshState({ total: 2 }), isPremium: false, pool: POOL, config: cfg });
    expect(res).toEqual({ dropped: false, reason: 'daily_cap' });
  });
});

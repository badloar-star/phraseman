/**
 * cards-2.0 (E13): XP-буст ×1.5 за perfect session (app/flashcards/xp_boost.ts, §4).
 * fc_stars_v1.xpBoostUntil (ставится в stars_system при 3★) множит XP только
 * для источников трейнер/review; истёкший буст и чужие источники → ×1.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PERFECT_SESSION_XP_BOOST_MULT } from '../app/flashcards/stars_config';
import {
  FC_XP_BOOST_SOURCES,
  fcXpBoostMultiplierFromRaw,
  getFcXpBoostMultiplier,
  isFcXpBoostSource,
  parseXpBoostUntil,
} from '../app/flashcards/xp_boost';

const NOW = Date.UTC(2026, 7, 11, 12, 0, 0);
const rawWithBoost = (until: number) =>
  JSON.stringify({ weekKey: '2026-W33', stars: 5, xpBoostUntil: until });

const storageMock = AsyncStorage as unknown as {
  __reset: () => void;
  setItem: (k: string, v: string) => Promise<void>;
};

beforeEach(() => {
  storageMock.__reset();
});

describe('parseXpBoostUntil', () => {
  it('читает xpBoostUntil из fc_stars_v1', () => {
    expect(parseXpBoostUntil(rawWithBoost(NOW + 1000))).toBe(NOW + 1000);
  });

  it('битый JSON / null / не-объект / отрицательное → 0', () => {
    expect(parseXpBoostUntil(null)).toBe(0);
    expect(parseXpBoostUntil('')).toBe(0);
    expect(parseXpBoostUntil('{broken')).toBe(0);
    expect(parseXpBoostUntil('[1,2]')).toBe(0);
    expect(parseXpBoostUntil(JSON.stringify({ xpBoostUntil: -5 }))).toBe(0);
    expect(parseXpBoostUntil(JSON.stringify({ xpBoostUntil: 'x' }))).toBe(0);
  });
});

describe('fcXpBoostMultiplierFromRaw', () => {
  it('активный буст + трейнер/review → ×1.5', () => {
    for (const source of FC_XP_BOOST_SOURCES) {
      expect(fcXpBoostMultiplierFromRaw(rawWithBoost(NOW + 60_000), source, NOW)).toBe(
        PERFECT_SESSION_XP_BOOST_MULT,
      );
    }
  });

  it('истёкший буст → ×1 (граница: ровно NOW уже не активен)', () => {
    expect(fcXpBoostMultiplierFromRaw(rawWithBoost(NOW - 1), 'trainer_answer', NOW)).toBe(1);
    expect(fcXpBoostMultiplierFromRaw(rawWithBoost(NOW), 'review_answer', NOW)).toBe(1);
  });

  it('чужие источники XP не бустятся даже при активном бусте', () => {
    for (const source of ['lesson_answer', 'quiz_answer', 'bonus_chest', 'wager_win']) {
      expect(fcXpBoostMultiplierFromRaw(rawWithBoost(NOW + 60_000), source, NOW)).toBe(1);
      expect(isFcXpBoostSource(source)).toBe(false);
    }
  });

  it('нет записи fc_stars_v1 → ×1', () => {
    expect(fcXpBoostMultiplierFromRaw(null, 'trainer_answer', NOW)).toBe(1);
  });
});

describe('getFcXpBoostMultiplier (боевой путь через AsyncStorage)', () => {
  it('читает fc_stars_v1 и применяет множитель', async () => {
    await storageMock.setItem('fc_stars_v1', rawWithBoost(Date.now() + 5 * 60_000));
    expect(await getFcXpBoostMultiplier('trainer_answer')).toBe(PERFECT_SESSION_XP_BOOST_MULT);
    expect(await getFcXpBoostMultiplier('review_answer')).toBe(PERFECT_SESSION_XP_BOOST_MULT);
    expect(await getFcXpBoostMultiplier('lesson_answer')).toBe(1);
  });

  it('пустое хранилище → ×1', async () => {
    expect(await getFcXpBoostMultiplier('trainer_answer')).toBe(1);
  });
});

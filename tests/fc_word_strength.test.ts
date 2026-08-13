/**
 * cards-2.0 (E13): «сила слова» (app/flashcards/word_strength.ts, §2 мастер-плана).
 * Маппинг: интервалы SRS 1–3 → Weak, 7–14 → Medium, ≥30 → Strong;
 * trainer correctStreak 0–1 → Weak, 2–3 → Medium, ≥4 → Strong;
 * карточка без данных — null («не тренировалась», точки не рисуем).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildWordStrengthMap,
  loadWordStrengthMap,
  strengthDotCount,
  strengthFor,
  strengthFromSrs,
  strengthFromStreak,
  strengthKey,
  strongerOf,
} from '../app/flashcards/word_strength';

const storageMock = AsyncStorage as unknown as {
  __reset: () => void;
  setItem: (k: string, v: string) => Promise<void>;
};

beforeEach(() => {
  storageMock.__reset();
});

describe('strengthFromSrs (SM-2 active_recall_items)', () => {
  it('интервалы 1–3 дня → weak', () => {
    expect(strengthFromSrs(1, 1)).toBe('weak');
    expect(strengthFromSrs(3, 2)).toBe('weak');
    expect(strengthFromSrs(6, 2)).toBe('weak');
  });

  it('интервалы 7–14 → medium', () => {
    expect(strengthFromSrs(7, 3)).toBe('medium');
    expect(strengthFromSrs(14, 4)).toBe('medium');
    expect(strengthFromSrs(29, 4)).toBe('medium');
  });

  it('интервал 30+ → strong', () => {
    expect(strengthFromSrs(30, 5)).toBe('strong');
    expect(strengthFromSrs(90, 9)).toBe('strong');
  });

  it('repetitions 0 (ошибка без верных повторов) → weak даже при мусорном интервале', () => {
    expect(strengthFromSrs(30, 0)).toBe('weak');
    expect(strengthFromSrs(0, 0)).toBe('weak');
  });

  it('NaN/мусор → weak (не падаем)', () => {
    expect(strengthFromSrs(NaN, NaN)).toBe('weak');
  });
});

describe('strengthFromStreak (trainer_store correctStreak → INTERVALS [1,3,7,14,30])', () => {
  it('streak 0–1 (интервалы 1/3) → weak', () => {
    expect(strengthFromStreak(0)).toBe('weak');
    expect(strengthFromStreak(1)).toBe('weak');
  });

  it('streak 2–3 (интервалы 7/14) → medium', () => {
    expect(strengthFromStreak(2)).toBe('medium');
    expect(strengthFromStreak(3)).toBe('medium');
  });

  it('streak ≥4 (интервал 30) → strong', () => {
    expect(strengthFromStreak(4)).toBe('strong');
    expect(strengthFromStreak(10)).toBe('strong');
  });
});

describe('утилиты', () => {
  it('strengthDotCount: weak=1, medium=2, strong=3', () => {
    expect(strengthDotCount('weak')).toBe(1);
    expect(strengthDotCount('medium')).toBe(2);
    expect(strengthDotCount('strong')).toBe(3);
  });

  it('strongerOf берёт лучший прогресс', () => {
    expect(strongerOf('weak', 'strong')).toBe('strong');
    expect(strongerOf('medium', 'weak')).toBe('medium');
    expect(strongerOf('medium', 'medium')).toBe('medium');
  });

  it('strengthKey нормализует chunk-маркеры и регистр', () => {
    expect(strengthKey('Somebody - planted a - tree')).toBe(strengthKey('somebody planted a tree'));
    expect(strengthKey('  Give Up ')).toBe('give up');
  });
});

describe('buildWordStrengthMap', () => {
  it('строит карту из обоих источников с нормализованными ключами', () => {
    const map = buildWordStrengthMap(
      [
        { phrase: 'I ran out of milk', interval: 1, repetitions: 1 },
        { phrase: 'Break the - ice', interval: 14, repetitions: 3 },
        { phrase: 'Figure out', interval: 30, repetitions: 6 },
      ],
      [
        { key: 'give up', correctStreak: 0 },
        { key: 'put off', correctStreak: 2 },
        { key: 'look forward to', correctStreak: 5 },
      ],
    );
    expect(strengthFor('I ran out of milk', map)).toBe('weak');
    expect(strengthFor('break the ice', map)).toBe('medium');
    expect(strengthFor('figure out', map)).toBe('strong');
    expect(strengthFor('give up', map)).toBe('weak');
    expect(strengthFor('put off', map)).toBe('medium');
    expect(strengthFor('look forward to', map)).toBe('strong');
  });

  it('карточка без данных → null («не тренировалась»)', () => {
    const map = buildWordStrengthMap([], []);
    expect(strengthFor('hit the road', map)).toBeNull();
    expect(strengthFor('hit the road', null)).toBeNull();
  });

  it('оба источника по одному ключу → более сильный', () => {
    const map = buildWordStrengthMap(
      [{ phrase: 'give up', interval: 1, repetitions: 1 }], // weak
      [{ key: 'Give up', correctStreak: 4 }], // strong
    );
    expect(strengthFor('give up', map)).toBe('strong');
  });

  it('архив тренера (выучено) → strong; битые записи пропускаются', () => {
    const map = buildWordStrengthMap(
      [null as never, { phrase: 42, interval: 1, repetitions: 1 }],
      [{ key: 'break the ice', correctStreak: 0, archived: true }, 'junk' as never],
    );
    expect(strengthFor('break the ice', map)).toBe('strong');
    expect(map.size).toBe(1);
  });
});

describe('loadWordStrengthMap (AsyncStorage)', () => {
  it('читает active_recall_items + trainer_store_v1', async () => {
    await storageMock.setItem(
      'active_recall_items',
      JSON.stringify([{ phrase: 'figure out', interval: 30, repetitions: 5 }]),
    );
    await storageMock.setItem(
      'trainer_store_v1',
      JSON.stringify([{ key: 'put off', correctStreak: 3 }]),
    );
    const map = await loadWordStrengthMap();
    expect(strengthFor('figure out', map)).toBe('strong');
    expect(strengthFor('put off', map)).toBe('medium');
  });

  it('битый JSON / пустое хранилище → пустая карта (fail-soft)', async () => {
    await storageMock.setItem('active_recall_items', '{broken');
    const map = await loadWordStrengthMap();
    expect(map.size).toBe(0);
  });
});

// E2: лимит-20 бесплатных сохранённых карточек по СТАБИЛЬНЫМ id (баг 10) —
// первые 20 по addedAt, а не по индексу рендера/фильтру.
import {
  computeUnlockedSavedIds,
  splitByFreeLimit,
  FREE_SAVED_CARD_LIMIT,
} from '../app/flashcards/free_limit';

const card = (id: string, addedAt?: number) => ({ id, addedAt });

describe('computeUnlockedSavedIds', () => {
  it('открывает первые N по addedAt, а не по порядку массива', () => {
    const cards = [
      card('new', 300),
      card('mid', 200),
      card('old', 100),
    ];
    const unlocked = computeUnlockedSavedIds(cards, 2);
    expect(unlocked.has('old')).toBe(true);
    expect(unlocked.has('mid')).toBe(true);
    expect(unlocked.has('new')).toBe(false);
  });

  it('стабильно при любой перестановке исходного массива', () => {
    const base = Array.from({ length: 30 }, (_, i) => card(`c${i}`, 1000 + i));
    const shuffled = [...base].reverse();
    const a = computeUnlockedSavedIds(base);
    const b = computeUnlockedSavedIds(shuffled);
    expect([...a].sort()).toEqual([...b].sort());
    expect(a.size).toBe(FREE_SAVED_CARD_LIMIT);
    // Открыты именно самые ранние 20 по addedAt
    for (let i = 0; i < 30; i++) {
      expect(a.has(`c${i}`)).toBe(i < FREE_SAVED_CARD_LIMIT);
    }
  });

  it('отсутствующий addedAt трактуется как самый старый (0)', () => {
    const cards = [card('withTime', 500), card('legacy'), card('newest', 900)];
    const unlocked = computeUnlockedSavedIds(cards, 2);
    expect(unlocked.has('legacy')).toBe(true);
    expect(unlocked.has('withTime')).toBe(true);
    expect(unlocked.has('newest')).toBe(false);
  });

  it('детерминированный тай-брейк по id при равных addedAt', () => {
    const cards = [card('b', 100), card('a', 100), card('c', 100)];
    const unlocked = computeUnlockedSavedIds(cards, 2);
    expect(unlocked.has('a')).toBe(true);
    expect(unlocked.has('b')).toBe(true);
    expect(unlocked.has('c')).toBe(false);
  });

  it('меньше карточек чем лимит — все открыты', () => {
    const cards = [card('x', 1), card('y', 2)];
    expect(computeUnlockedSavedIds(cards).size).toBe(2);
  });
});

describe('splitByFreeLimit', () => {
  const all = Array.from({ length: 25 }, (_, i) => card(`c${i}`, 1000 + i));
  const unlocked = computeUnlockedSavedIds(all);

  it('премиум видит всё, скрытых нет', () => {
    const { visible, hiddenCount } = splitByFreeLimit(all, unlocked, true);
    expect(visible).toHaveLength(25);
    expect(hiddenCount).toBe(0);
  });

  it('free видит ровно 20, остальные — в счётчик «+N скрыто»', () => {
    const { visible, hiddenCount } = splitByFreeLimit(all, unlocked, false);
    expect(visible).toHaveLength(20);
    expect(hiddenCount).toBe(5);
    expect(visible.every((c) => unlocked.has(c.id))).toBe(true);
  });

  it('фильтрация не «переоткрывает» заблокированные id (лимит не позиционный)', () => {
    // Отфильтрованный список из 5 карточек, где 2 — за лимитом:
    // при позиционном лимите (idx >= 20) все 5 были бы видимы — это баг 10.
    const filtered = [all[0], all[5], all[21], all[22], all[10]];
    const { visible, hiddenCount } = splitByFreeLimit(filtered, unlocked, false);
    expect(visible.map((c) => c.id)).toEqual(['c0', 'c5', 'c10']);
    expect(hiddenCount).toBe(2);
  });

  it('пустой список — пусто и 0 скрытых', () => {
    const { visible, hiddenCount } = splitByFreeLimit([], unlocked, false);
    expect(visible).toEqual([]);
    expect(hiddenCount).toBe(0);
  });
});

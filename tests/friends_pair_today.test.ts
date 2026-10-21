/**
 * pair_today.ts — кого показать на Главной («Серия вдвоём с Лидией») и в финале занятия (две карточки).
 * Макет docs/design/v2-app/friends-full.html, идея 1 (владелец 21.10).
 */
import { pickFinishPairs, pickHomePair, type PairCandidate } from '../app/friends_together/pair_today';
import type { PairFlameState } from '../app/friends_together/pair_streak';

const friend = (friendUid: string, name: string, state: PairFlameState, streak: number): PairCandidate => ({
  friendUid,
  name,
  view: { state, streak, best: streak, lostStreak: 0, week: [] },
});

describe('pickHomePair', () => {
  it('берёт друга, который уже занимался, с самой длинной серией', () => {
    const picked = pickHomePair([
      friend('a', 'Ирина', 'both_today', 12),
      friend('b', 'Лидия', 'me_pending', 3),
      friend('c', 'Марк', 'me_pending', 7),
      friend('d', 'Олег', 'broken', 0),
    ]);
    expect(picked?.friendUid).toBe('c');
  });

  it('при равной серии — по имени, чтобы строка не прыгала', () => {
    expect(pickHomePair([friend('x', 'Марк', 'me_pending', 3), friend('y', 'Лидия', 'me_pending', 3)])?.friendUid).toBe('y');
  });

  it('никто не ждёт меня — строки нет', () => {
    expect(pickHomePair([friend('a', 'Ирина', 'both_today', 12), friend('b', 'Марк', 'friend_pending', 7)])).toBeNull();
    expect(pickHomePair([])).toBeNull();
  });

  it('не переставляет входной список', () => {
    const list = [friend('b', 'Лидия', 'me_pending', 3), friend('c', 'Марк', 'me_pending', 7)];
    pickHomePair(list);
    expect(list.map((c) => c.friendUid)).toEqual(['b', 'c']);
  });
});

describe('pickFinishPairs', () => {
  it('одна карточка «оба сегодня» и одна «позвать» — самые длинные серии', () => {
    const { together, pending } = pickFinishPairs([
      friend('a', 'Ирина', 'both_today', 13),
      friend('e', 'Ева', 'both_today', 2),
      friend('b', 'Марк', 'friend_pending', 7),
      friend('c', 'Лидия', 'friend_pending', 4),
      friend('d', 'Олег', 'none', 0),
    ]);
    expect(together?.friendUid).toBe('a');
    expect(pending?.friendUid).toBe('b');
  });

  it('нет подходящих — пусто, ничего не выдумываем', () => {
    expect(pickFinishPairs([friend('d', 'Олег', 'broken', 0), friend('l', 'Лидия', 'me_pending', 3)])).toEqual({ together: null, pending: null });
  });
});

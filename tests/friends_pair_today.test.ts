/**
 * pair_today.ts — кого показать на Главной («Серия вдвоём с Лидией») и в финале занятия (две карточки).
 * Макет docs/design/v2-app/friends-full.html, идея 1 (владелец 21.10).
 */
import { pairCandidatesFromSnapshot, pickFinishPairs, pickHomePair, type PairCandidate } from '../app/friends_together/pair_today';
import type { PairFlameState } from '../app/friends_together/pair_streak';
import type { FriendTogetherPairState, FriendsTogetherSnapshot } from '../app/friends_together/together_store';
import { encodeActiveDays } from '../app/friends_together/together_days';
import { addLocalDays } from '../app/local_date';

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

// зачем (идея 1, веха на вкладке): Главная, финал занятия и окно вехи берут пары из снимка одним правилом
describe('pairCandidatesFromSnapshot', () => {
  const TODAY = '2026-10-22';
  const days = (...back: number[]) => encodeActiveDays(back.map((n) => addLocalDays(TODAY, -n)), TODAY);
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const pairState = (friendUid: string, extra: Partial<FriendTogetherPairState>): FriendTogetherPairState => ({
    friendUid, days: 0, level: 1, todayCommon: false, ...extra,
  });
  const snapshotOf = (...pairs: FriendTogetherPairState[]): FriendsTogetherSnapshot => ({
    updatedAtMs: 0,
    myDayKey: addLocalDays(TODAY, -1),
    pairs: Object.fromEntries(pairs.map((p) => [p.friendUid, p])),
  });

  it('огонь — по свежим своим дням: занятие только что, серия выросла у обоих', () => {
    const stale = { state: 'friend_pending' as const, streak: 6, best: 6, lostStreak: 0, week: [] };
    const [c] = pairCandidatesFromSnapshot(
      snapshotOf(pairState('a', { name: 'Ирина', coinRank: 5, isPlus: true, pair: stale, friendActiveDays: days(...range(0, 6)) })),
      days(...range(0, 6)),
      TODAY,
    );
    expect(c).toMatchObject({ friendUid: 'a', name: 'Ирина', coinRank: 5, isPlus: true });
    expect(c?.view).toMatchObject({ state: 'both_today', streak: 7 });
  });

  it('старый снимок без дней друга — огонь как посчитан при обновлении вкладки', () => {
    const saved = { state: 'me_pending' as const, streak: 3, best: 3, lostStreak: 0, week: [] };
    const [c] = pairCandidatesFromSnapshot(snapshotOf(pairState('b', { name: 'Лидия', pair: saved })), null, TODAY);
    expect(c?.view).toBe(saved);
  });

  it('без имени или без огня — пары нет; монета и Plus без данных — «нет»', () => {
    const list = pairCandidatesFromSnapshot(
      snapshotOf(
        pairState('noname', { friendActiveDays: days(0) }),
        pairState('noview', { name: 'Олег' }),
        pairState('c', { name: 'Марк', friendActiveDays: days(0, 1) }),
      ),
      days(1),
      TODAY,
    );
    expect(list.map((c) => c.friendUid)).toEqual(['c']);
    expect(list[0]).toMatchObject({ coinRank: null, isPlus: false });
  });
});

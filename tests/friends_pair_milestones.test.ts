/**
 * pair_milestones.ts — окно «Серия вдвоём — 30 дней» один раз на пару и веху (идея 1, макет friends-full.html).
 */
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
}));

import { dueMilestone, takePairMilestone } from '../app/friends_together/pair_milestones';
import type { PairFlameState } from '../app/friends_together/pair_streak';
import type { PairCandidate } from '../app/friends_together/pair_today';

const view = (state: PairFlameState, streak: number) => ({ state, streak, best: streak, lostStreak: 0, week: [] });
const friend = (friendUid: string, name: string, state: PairFlameState, streak: number): PairCandidate => ({ friendUid, name, view: view(state, streak) });

beforeEach(() => {
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
});

describe('dueMilestone', () => {
  it('празднует в момент, когда огонь горит у обоих', () => {
    expect(dueMilestone(view('both_today', 7), [])).toBe(7);
    expect(dueMilestone(view('both_today', 30), [])).toBe(30);
    expect(dueMilestone(view('both_today', 100), [])).toBe(100);
  });

  it('ждущий огонь — ещё не праздник', () => {
    expect(dueMilestone(view('friend_pending', 30), [])).toBeNull();
    expect(dueMilestone(view('me_pending', 7), [])).toBeNull();
  });

  it('догоняет пару дней, но не через месяц', () => {
    expect(dueMilestone(view('both_today', 32), [])).toBe(30);
    expect(dueMilestone(view('both_today', 33), [])).toBeNull();
    expect(dueMilestone(view('both_today', 45), [])).toBeNull();
  });

  it('отпразднованную веху не повторяет', () => {
    expect(dueMilestone(view('both_today', 30), [7, 30])).toBeNull();
    expect(dueMilestone(view('both_today', 8), [7])).toBeNull();
  });
});

describe('takePairMilestone', () => {
  it('берёт самую длинную серию с вехой и сразу отмечает её', async () => {
    const list = [friend('ira', 'Ирина', 'both_today', 30), friend('mark', 'Марк', 'both_today', 7), friend('lida', 'Лидия', 'me_pending', 7)];

    const first = await takePairMilestone(list, 'me');
    const second = await takePairMilestone(list, 'me');
    const third = await takePairMilestone(list, 'me');

    expect(first).toEqual({ candidate: list[0], milestone: 30 });
    expect(second).toEqual({ candidate: list[1], milestone: 7 });
    expect(third).toBeNull();
  });

  it('отметки у каждого аккаунта свои', async () => {
    const list = [friend('ira', 'Ирина', 'both_today', 7)];
    await takePairMilestone(list, 'me');

    expect(await takePairMilestone(list, 'other-account')).toEqual({ candidate: list[0], milestone: 7 });
  });

  it('без своего uid ничего не показывает', async () => {
    expect(await takePairMilestone([friend('ira', 'Ирина', 'both_today', 7)], '')).toBeNull();
  });
});

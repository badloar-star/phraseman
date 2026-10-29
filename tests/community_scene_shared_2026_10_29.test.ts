// зачем (координатор 29.10, оптимизация плиток Сообщества A+C+D): один таймер и один слушатель AppState на весь список, место набора — одна сортировка на версию хранилища.
const removeSubscription = jest.fn();
const addEventListener = jest.fn(() => ({ remove: removeSubscription }));
jest.mock('react-native', () => ({ AppState: { addEventListener: (...args: unknown[]) => (addEventListener as (...a: unknown[]) => unknown)(...args) } }));

import * as contest from '../shared/community_month_contest';
import { packSocialLive } from '../app/community_packs/packSocialLive';
import { __resetCommunitySceneSharedForTests, communityContestMonthStore, monthlyContestPlace } from '../components/packs/community_scene_shared';

const NOW = Date.UTC(2026, 10, 15, 12, 0, 0);

function entry(id: string, hearts: number, publishedAtMs: number): contest.ContestEntry {
  return { id, authorId: `a-${id}`, title: `t-${id}`, hearts, publishedAtMs, status: 'published' } as contest.ContestEntry;
}

describe('общие часы месяца для плиток', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    addEventListener.mockClear();
    removeSubscription.mockClear();
    __resetCommunitySceneSharedForTests();
  });
  afterEach(() => { __resetCommunitySceneSharedForTests(); jest.useRealTimers(); });

  it('сто подписчиков — один таймер и один слушатель AppState; последняя отписка гасит оба', () => {
    const unsubscribe = Array.from({ length: 100 }, () => communityContestMonthStore.subscribe(() => undefined));
    expect(jest.getTimerCount()).toBe(1);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    unsubscribe.slice(0, 99).forEach((off) => off());
    expect(jest.getTimerCount()).toBe(1);
    expect(removeSubscription).not.toHaveBeenCalled();
    unsubscribe[99]();
    expect(jest.getTimerCount()).toBe(0);
    expect(removeSubscription).toHaveBeenCalledTimes(1);
  });

  it('на границе месяца все подписчики будятся один раз, внутри месяца — тишина', () => {
    const listener = jest.fn();
    const off = communityContestMonthStore.subscribe(listener);
    const before = communityContestMonthStore.get();
    jest.advanceTimersByTime(60000 * 3);
    expect(listener).not.toHaveBeenCalled();
    expect(communityContestMonthStore.get()).toBe(before);
    jest.setSystemTime(contest.contestMonth(NOW).endMs + 1000);
    jest.advanceTimersByTime(60000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(communityContestMonthStore.get().id).not.toBe(before.id);
    off();
  });
});

describe('место набора: одна сортировка на версию хранилища', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    __resetCommunitySceneSharedForTests();
    packSocialLive.reset();
  });
  afterEach(() => { jest.restoreAllMocks(); __resetCommunitySceneSharedForTests(); jest.useRealTimers(); });

  it('сто плиток читают место — ранжирование считается один раз; новая версия — пересчёт', () => {
    const month = contest.contestMonth(NOW);
    const entries = Array.from({ length: 50 }, (_, i) => entry(`p${i}`, 50 - i, NOW - 1000 * (i + 1)));
    packSocialLive.setContestEntries(month.id, entries);
    const spy = jest.spyOn(contest, 'rankContestEntries');
    const places = Array.from({ length: 100 }, (_, i) => monthlyContestPlace(`p${i % 50}`, month));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(places[0]).toBe(1);
    expect(places[49]).toBe(50);
    expect(monthlyContestPlace('нет-такого', month)).toBe(0);
    expect(spy).toHaveBeenCalledTimes(1);
    // новое сердечко = новая версия = один пересчёт
    packSocialLive.setContestEntries(month.id, [entry('p0', 1, NOW - 1000), ...entries.slice(1)]);
    expect(monthlyContestPlace('p0', month)).toBeGreaterThan(1);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

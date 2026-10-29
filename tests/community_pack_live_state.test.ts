import { contestMonth } from '../shared/community_month_contest';
import { createPackSocialLiveStore } from '../app/community_packs/packSocialLive';
import { mergeServerCounts, toggleLikeOptimistic } from '../app/community_packs/packSocial';

const initial = { liked: false, likesCount: 12, added: true, addedCount: 4 };
it('shares optimistic hearts and exact counts across screens and reopening synchronously', () => {
  const store = createPackSocialLiveStore();
  const screenA = jest.fn(); const screenB = jest.fn();
  store.subscribe(screenA); const closeB = store.subscribe(screenB);
  store.setIntent('p', true);
  store.set('p', toggleLikeOptimistic(store.get('p', initial)));
  expect(screenA).toHaveBeenCalledTimes(1);
  expect(screenB).toHaveBeenCalledTimes(1);
  closeB();
  expect(store.get('p', initial)).toMatchObject({ liked: true, likesCount: 13 });
  store.set('p', mergeServerCounts(store.get('p', initial), { likesCount: 13, addedCount: 4 }, { liked: true, added: true }));
  expect(store.get('p', initial).likesCount).toBe(13);
});
it('retains an explicit unlike against a stale response and isolates account transitions', () => {
  const store = createPackSocialLiveStore();
  store.setIntent('p', false);
  const current = store.get('p', initial);
  store.set('p', mergeServerCounts({ ...current, liked: store.intent('p') ?? true }, { likesCount: 13, addedCount: 4 }, { liked: true, added: true }));
  expect(store.get('p', initial)).toMatchObject({ liked: false, likesCount: 12 });
  store.reset();
  expect(store.intent('p')).toBeUndefined();
  expect(store.get('p', initial)).toEqual(initial);
});
it('rolls back even after all screens close and shares the in-flight guard across screens', () => {
  const store = createPackSocialLiveStore();
  store.get('p', initial);
  expect(store.beginLike('p')).toBe(true);
  expect(store.beginLike('p')).toBe(false);
  store.setLiked('p', true);
  expect(store.get('p', initial).likesCount).toBe(13);
  store.setLiked('p', false);
  store.endLike('p');
  expect(store.get('p', initial)).toEqual(initial);
  expect(store.beginLike('p')).toBe(true);
});

it('keeps monthly hearts separate from lifetime totals and restores an old heart correctly after rejection', () => {
  const store = createPackSocialLiveStore();
  const month = contestMonth(Date.now());
  store.get('p', { ...initial, liked: true, likesCount: 999 });
  store.setContestEntries(month.id, [{ id: 'p', authorId: 'other', title: 'Pack', publishedAtMs: month.startMs - 100, status: 'published', hearts: 2, myMonthHeart: false }]);
  store.beginLike('p');
  store.setLiked('p', false); // Removing last month's heart must not subtract from this month.
  expect(store.contestEntries(month.id)[0].hearts).toBe(2);
  store.setLiked('p', true); // Rejected removal restores its original monthly eligibility (false).
  expect(store.contestEntries(month.id)[0]).toMatchObject({ hearts: 2, myMonthHeart: false });
  store.endLike('p');
  expect(store.peek('p')?.likesCount).toBe(999);
  expect(store.contestEntries(contestMonth(month.endMs).id)).toEqual([]);
});
it('updates the monthly podium immediately and does not count repeated heart toggles twice', () => {
  const store = createPackSocialLiveStore();
  const month = contestMonth(Date.now());
  store.get('p', initial);
  store.setContestEntries(month.id, [{ id: 'p', authorId: 'other', title: 'Pack', publishedAtMs: month.startMs, status: 'published', hearts: 2, myMonthHeart: false }]);
  store.beginLike('p'); store.setLiked('p', true);
  expect(store.contestEntries(month.id)[0].hearts).toBe(3);
  store.endLike('p');
  store.beginLike('p'); store.setLiked('p', false); store.endLike('p');
  store.beginLike('p'); store.setLiked('p', true); store.endLike('p');
  expect(store.contestEntries(month.id)[0].hearts).toBe(3);
  store.reset();
  expect(store.contestEntries(month.id)).toEqual([]);
});

it('ignores an older monthly response after a completed optimistic operation', () => {
  const store = createPackSocialLiveStore();
  const month = contestMonth(Date.now());
  const entries = [{ id: 'p', authorId: 'other', title: 'Pack', publishedAtMs: month.startMs, status: 'published', hearts: 2, myMonthHeart: false }];
  store.get('p', initial); store.setContestEntries(month.id, entries);
  const started = store.getVersion();
  store.beginLike('p'); store.setLiked('p', true); store.endLike('p');
  store.setContestEntries(month.id, entries, started);
  expect(store.contestEntries(month.id)[0].hearts).toBe(3);
});

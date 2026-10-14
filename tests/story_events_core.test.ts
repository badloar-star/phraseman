// D192 (владелец 14.10): правила списка «историй» — повтор не копится, срок 7 дней, не больше 20, unseen → seen.
import {
  STORY_EVENT_LIMIT,
  STORY_EVENT_TTL_MS,
  addStoryEvent,
  markStorySeen,
  parseStoryEvents,
  serializeStoryEvents,
  storyPlaybackQueue,
  storyRecentQueue,
  unseenStories,
  type StoryEventList,
} from '../modules/story_events/story_events_core';

const NOW = Date.UTC(2026, 9, 14, 12);
const EMPTY: StoryEventList = [];

describe('story_events_core', () => {
  it('does not stack the same fact twice, even after it was seen', () => {
    const first = addStoryEvent(EMPTY, { type: 'coin_rank_up', payload: { toRank: 3 }, atMs: NOW }, NOW);
    expect(first.added).toBe(true);
    const again = addStoryEvent(first.list, { type: 'coin_rank_up', payload: { toRank: 3 }, atMs: NOW + 1000 }, NOW + 1000);
    expect(again).toMatchObject({ added: false, reason: 'duplicate' });
    const seen = markStorySeen(first.list, 'coin_rank_up:3').list;
    expect(addStoryEvent(seen, { type: 'coin_rank_up', payload: { toRank: 3 }, atMs: NOW }, NOW)).toMatchObject({ added: false, reason: 'duplicate' });
    expect(addStoryEvent(first.list, { type: 'coin_rank_up', payload: { toRank: 4 }, atMs: NOW }, NOW).added).toBe(true);
  });

  it('treats the same Spire week in another language and the same streak on another day as new facts', () => {
    const a = addStoryEvent(EMPTY, { type: 'spire_week', payload: { weekId: '2026-W41', lang: 'en', outcome: 'up' }, atMs: NOW }, NOW);
    expect(addStoryEvent(a.list, { type: 'spire_week', payload: { weekId: '2026-W41', lang: 'en', outcome: 'stay' }, atMs: NOW }, NOW).added).toBe(false);
    expect(addStoryEvent(a.list, { type: 'spire_week', payload: { weekId: '2026-W41', lang: 'es' }, atMs: NOW }, NOW).added).toBe(true);
    const s = addStoryEvent(EMPTY, { type: 'streak_milestone', payload: { days: 7, dayKey: '2026-10-14' }, atMs: NOW }, NOW);
    expect(addStoryEvent(s.list, { type: 'streak_milestone', payload: { days: 7, dayKey: '2026-11-30' }, atMs: NOW }, NOW).added).toBe(true);
  });

  it('lives 7 days: an old fact is refused and a stored one disappears after the term', () => {
    expect(addStoryEvent(EMPTY, { type: 'achievement', payload: { achievementId: 'a1' }, atMs: NOW - STORY_EVENT_TTL_MS }, NOW))
      .toMatchObject({ added: false, reason: 'expired' });
    const fresh = addStoryEvent(EMPTY, { type: 'achievement', payload: { achievementId: 'a1' }, atMs: NOW }, NOW);
    expect(unseenStories(fresh.list, NOW + STORY_EVENT_TTL_MS - 1)).toHaveLength(1);
    expect(unseenStories(fresh.list, NOW + STORY_EVENT_TTL_MS)).toHaveLength(0);
  });

  it('keeps at most 20, newest first', () => {
    let list: StoryEventList = EMPTY;
    for (let i = 0; i < STORY_EVENT_LIMIT + 5; i += 1) {
      const d = addStoryEvent(list, { type: 'achievement', payload: { achievementId: `a${i}` }, atMs: NOW + i }, NOW + i);
      list = d.list;
    }
    expect(list).toHaveLength(STORY_EVENT_LIMIT);
    expect(list[0]!.id).toBe(`achievement:a${STORY_EVENT_LIMIT + 4}`);
    expect(list.some((e) => e.id === 'achievement:a0')).toBe(false);
  });

  it('plays unseen stories oldest first, as the mockup flow s2 does', () => {
    let list: StoryEventList = EMPTY;
    list = addStoryEvent(list, { type: 'achievement', payload: { achievementId: 'late' }, atMs: NOW + 50 }, NOW + 50).list;
    list = addStoryEvent(list, { type: 'coin_rank_up', payload: { toRank: 2 }, atMs: NOW }, NOW + 50).list;
    list = markStorySeen(addStoryEvent(list, { type: 'achievement', payload: { achievementId: 'seen' }, atMs: NOW + 10 }, NOW + 50).list, 'achievement:seen').list;
    expect(storyPlaybackQueue(list).map((e) => e.id)).toEqual(['coin_rank_up:2', 'achievement:late']);
  });

  it('recent queue keeps seen stories too, oldest first (tap without the ring)', () => {
    let list: StoryEventList = EMPTY;
    list = addStoryEvent(list, { type: 'achievement', payload: { achievementId: 'b' }, atMs: NOW + 5 }, NOW + 5).list;
    list = markStorySeen(addStoryEvent(list, { type: 'achievement', payload: { achievementId: 'a' }, atMs: NOW }, NOW + 5).list, 'achievement:a').list;
    expect(storyRecentQueue(list).map((e) => e.id)).toEqual(['achievement:a', 'achievement:b']);
    expect(addStoryEvent(EMPTY, { type: 'coin_rank_up', payload: { toRank: 7 }, atMs: NOW, seen: true }, NOW)).toMatchObject({ added: true, event: { seen: true } });
  });

  it('refuses kinds that are not in the mockup', () => {
    expect(addStoryEvent(EMPTY, { type: 'perfect_lesson' as never, payload: { lessonId: 1 }, atMs: NOW }, NOW)).toMatchObject({ added: false, reason: 'invalid' });
  });

  it('moves a story from unseen to seen once', () => {
    const d = addStoryEvent(EMPTY, { type: 'streak_milestone', payload: { days: 30, dayKey: '2026-10-14' }, atMs: NOW }, NOW);
    const id = d.added ? d.event.id : '';
    expect(unseenStories(d.list, NOW)).toHaveLength(1);
    const seen = markStorySeen(d.list, id);
    expect(seen.changed).toBe(true);
    expect(unseenStories(seen.list, NOW)).toHaveLength(0);
    expect(markStorySeen(seen.list, id).changed).toBe(false);
    expect(markStorySeen(seen.list, 'missing').changed).toBe(false);
  });

  it('survives a round trip and drops broken rows', () => {
    const d = addStoryEvent(EMPTY, { type: 'coin_rank_up', payload: { toRank: 2 }, atMs: NOW }, NOW);
    expect(parseStoryEvents(serializeStoryEvents(d.list))).toEqual(d.list);
    expect(parseStoryEvents(JSON.stringify({ events: [{ id: 1 }, null, { id: 'x', type: 'nope', atMs: 1, payload: {} }] }))).toEqual([]);
    expect(parseStoryEvents(null)).toEqual([]);
  });
});

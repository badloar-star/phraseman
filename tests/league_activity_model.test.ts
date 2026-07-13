import { buildLeagueActivityEvents } from '../app/league_activity_model';
import { isLeagueChatMessageVisibleInFeed } from '../app/league_chat_visibility';
import type { LeagueChatMessage } from '../app/firestore_league_chat';
import type { LeagueGroupBoostState } from '../app/league_group_boosts';

function message(overrides: Partial<LeagueChatMessage>): LeagueChatMessage {
  return {
    id: 'm1',
    groupId: 'g',
    weekId: 'w',
    leagueId: 1,
    authorUid: 'u1',
    authorName: 'Anna',
    text: 'Hello',
    status: 'visible',
    createdAt: 1000,
    ...overrides,
  };
}

const activeBoost: LeagueGroupBoostState = {
  groupId: 'g',
  weekId: 'w',
  leagueId: 1,
  multiplier: 2,
  startedAt: 4000,
  expiresAt: 9000,
  buyerUid: 'b',
  buyerName: 'Ben',
  likeEventId: 'boost-1',
  likeCount: 0,
};

describe('league activity model', () => {
  it('uses the same retired and deleted message filter as the full chat', () => {
    expect(isLeagueChatMessageVisibleInFeed(message({ pinned: true }))).toBe(false);
    expect(isLeagueChatMessageVisibleInFeed(message({ compassKind: 'icebreaker' }))).toBe(false);
    expect(isLeagueChatMessageVisibleInFeed(message({ compassKind: 'daily_summary' }))).toBe(false);
    expect(isLeagueChatMessageVisibleInFeed(message({ status: 'deleted' }))).toBe(false);
    expect(isLeagueChatMessageVisibleInFeed(message({ compassKind: 'poll' }))).toBe(true);
  });

  it('returns at most five stable events with actionable items first', () => {
    const events = buildLeagueActivityEvents({
      messages: [
        message({ id: 'chat', createdAt: 5000 }),
        message({ id: 'poll', compassKind: 'poll', createdAt: 6000 }),
      ],
      rankDelta: { delta: 1, passedName: 'Chris', lostToName: null },
      boost: activeBoost,
      crownHolder: { uid: 'a', name: 'Anna' },
      bonusProgress: 8200,
      bonusGoal: 10000,
      chestReady: true,
      now: 7000,
      lang: 'ru',
    });

    expect(events).toHaveLength(5);
    expect(events[0]).toMatchObject({ kind: 'chest', action: 'open_bonus' });
    expect(events[1]).toMatchObject({ id: 'compass:poll', kind: 'compass' });
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    expect(events.some((event) => event.action === 'open_chat')).toBe(true);
  });

  it('localizes cached Compass text without requesting fresh data', () => {
    const events = buildLeagueActivityEvents({
      messages: [message({
        id: 'localized',
        compassKind: 'question',
        text: 'Fallback',
        i18n: { ru: 'Вопрос дня' },
      })],
      rankDelta: null,
      boost: null,
      bonusProgress: 0,
      bonusGoal: 10000,
      chestReady: false,
      now: 2000,
      lang: 'ru',
    });

    expect(events[0]?.text).toBe('Вопрос дня');
  });
});

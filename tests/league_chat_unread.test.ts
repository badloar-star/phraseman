import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LeagueChatMessage, LeagueChatRoom } from '../app/firestore_league_chat';
import {
  computeLeagueChatUnreadCount,
  formatLeagueChatUnreadBadge,
  getLeagueChatLatestMessageAt,
  leagueChatRoomKey,
  loadLeagueChatRoomSeenAt,
  markLeagueChatRoomRead,
} from '../app/league_chat_unread';

const room: LeagueChatRoom = { weekId: '2026-W21', leagueId: 2, groupId: 'group-a' };

const message = (id: string, authorUid: string, createdAt: number): LeagueChatMessage => ({
  id,
  groupId: room.groupId,
  weekId: room.weekId,
  leagueId: room.leagueId,
  authorUid,
  authorName: authorUid,
  text: id,
  status: 'visible',
  createdAt,
});

describe('league chat unread counters', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.spyOn(Date, 'now').mockReturnValue(3_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('counts only visible messages from other users after the room was seen', () => {
    const messages = [
      message('mine-new', 'me', 250),
      message('old-other', 'other', 100),
      message('new-other', 'other', 260),
      { ...message('blocked-other', 'other', 270), status: 'blocked' as const },
    ];

    expect(computeLeagueChatUnreadCount(messages, 'me', 200)).toBe(1);
  });

  it('ignores retired Compass pinned/summary messages that are hidden from the chat feed', () => {
    const messages = [
      { ...message('pin', '__league_system__', 260), pinned: true },
      { ...message('ice', '__league_system__', 270), compassKind: 'icebreaker' as const },
      { ...message('sum', '__league_system__', 280), compassKind: 'daily_summary' as const },
      { ...message('daily', '__league_system__', 290), compassKind: 'discussion' as const },
    ];

    expect(computeLeagueChatUnreadCount(messages, 'me', 200)).toBe(1);
  });

  it('stores the room read point at the latest message or current time', async () => {
    await markLeagueChatRoomRead(room, [
      message('one', 'other', 500),
      message('two', 'other', 700),
    ]);

    await expect(loadLeagueChatRoomSeenAt(room)).resolves.toBe(3_000);
  });

  it('keeps a stable room key and badge text', () => {
    expect(leagueChatRoomKey(room)).toBe('2026-W21:2:group-a');
    expect(getLeagueChatLatestMessageAt([message('one', 'other', 500), message('two', 'other', 700)])).toBe(700);
    expect(formatLeagueChatUnreadBadge(0)).toBe('0');
    expect(formatLeagueChatUnreadBadge(7)).toBe('7');
    expect(formatLeagueChatUnreadBadge(120)).toBe('99+');
  });
});

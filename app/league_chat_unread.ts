import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LeagueChatMessage, LeagueChatRoom } from './firestore_league_chat';

const LEAGUE_CHAT_SEEN_AT_PREFIX = 'league_chat_seen_at_v1:';
const MAX_BADGE_COUNT = 99;

export function leagueChatRoomKey(room: LeagueChatRoom): string {
  return `${room.weekId}:${room.leagueId}:${room.groupId}`;
}

function leagueChatSeenAtKey(room: LeagueChatRoom): string {
  return `${LEAGUE_CHAT_SEEN_AT_PREFIX}${leagueChatRoomKey(room)}`;
}

export function getLeagueChatMessageCreatedAt(message: Pick<LeagueChatMessage, 'createdAt'>): number {
  const createdAt = Math.floor(Number(message.createdAt) || 0);
  return Number.isFinite(createdAt) && createdAt > 0 ? createdAt : 0;
}

export function getLeagueChatLatestMessageAt(messages: Pick<LeagueChatMessage, 'createdAt'>[]): number {
  return messages.reduce((latest, message) => Math.max(latest, getLeagueChatMessageCreatedAt(message)), 0);
}

function isRetiredCompassUnreadMessage(message: LeagueChatMessage): boolean {
  return Boolean(
    message.pinned ||
    message.compassKind === 'icebreaker' ||
    message.compassKind === 'daily_summary'
  );
}

export function computeLeagueChatUnreadCount(
  messages: LeagueChatMessage[],
  myUid: string | null | undefined,
  seenAt: number | null | undefined,
): number {
  const uid = String(myUid ?? '').trim();
  const lastSeenAt = Math.max(0, Math.floor(Number(seenAt) || 0));
  return messages.reduce((count, message) => {
    if (message.status && message.status !== 'visible') return count;
    if (uid && message.authorUid === uid) return count;
    if (isRetiredCompassUnreadMessage(message)) return count;
    return getLeagueChatMessageCreatedAt(message) > lastSeenAt ? count + 1 : count;
  }, 0);
}

export async function loadLeagueChatRoomSeenAt(room: LeagueChatRoom): Promise<number> {
  const raw = await AsyncStorage.getItem(leagueChatSeenAtKey(room)).catch(() => null);
  const seenAt = Math.floor(Number(raw) || 0);
  return Number.isFinite(seenAt) && seenAt > 0 ? seenAt : 0;
}

export async function markLeagueChatRoomRead(
  room: LeagueChatRoom,
  messages: Pick<LeagueChatMessage, 'createdAt'>[],
): Promise<number> {
  const currentSeenAt = await loadLeagueChatRoomSeenAt(room);
  const nextSeenAt = Math.max(currentSeenAt, getLeagueChatLatestMessageAt(messages), Date.now());
  await AsyncStorage.setItem(leagueChatSeenAtKey(room), String(nextSeenAt)).catch(() => {});
  return nextSeenAt;
}

export function formatLeagueChatUnreadBadge(count: number): string {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  return n > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(n);
}

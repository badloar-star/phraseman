import type { Lang } from '../constants/i18n';
import type { LeagueChatMessage } from './firestore_league_chat';
import type { LeagueGroupBoostState } from './league_group_boosts';
import type { RankDelta } from './rank_change';
import { isLeagueChatMessageVisibleInFeed } from './league_chat_visibility';

export type LeagueActivityAction = 'open_chat' | 'open_profile' | 'open_bonus' | 'open_rank';
export type LeagueActivityKind = 'compass' | 'chat' | 'boost' | 'crown' | 'rank' | 'bonus' | 'chest';

export interface LeagueActivityEvent {
  id: string;
  kind: LeagueActivityKind;
  action: LeagueActivityAction;
  authorName?: string;
  authorUid?: string;
  text: string;
  createdAt: number;
}

export interface LeagueActivityInput {
  messages: readonly LeagueChatMessage[];
  rankDelta: RankDelta | null;
  boost: LeagueGroupBoostState | null;
  crownHolder?: { uid?: string; name: string };
  bonusProgress: number;
  bonusGoal: number;
  chestReady: boolean;
  now: number;
  lang: Lang;
}

function localizedMessageText(message: LeagueChatMessage, lang: Lang): string {
  return message.i18n?.[lang] ?? message.i18n?.ru ?? message.text;
}

export function buildLeagueActivityEvents(input: LeagueActivityInput): LeagueActivityEvent[] {
  const visibleMessages = input.messages
    .filter(isLeagueChatMessageVisibleInFeed)
    .sort((a, b) => b.createdAt - a.createdAt);
  const compassMessage = visibleMessages.find((message) => Boolean(message.compassKind));
  const chatMessage = visibleMessages.find((message) => !message.compassKind && message.kind !== 'system');
  const events: LeagueActivityEvent[] = [];

  if (input.chestReady) {
    events.push({
      id: 'chest:ready',
      kind: 'chest',
      action: 'open_bonus',
      text: `${Math.max(0, input.bonusProgress)} / ${Math.max(1, input.bonusGoal)} XP`,
      createdAt: input.now,
    });
  }

  if (compassMessage) {
    events.push({
      id: `compass:${compassMessage.id}`,
      kind: 'compass',
      action: 'open_chat',
      authorName: compassMessage.authorName || 'Compass',
      authorUid: compassMessage.authorUid,
      text: localizedMessageText(compassMessage, input.lang),
      createdAt: compassMessage.createdAt,
    });
  }

  if (chatMessage) {
    events.push({
      id: `chat:${chatMessage.id}`,
      kind: 'chat',
      action: 'open_chat',
      authorName: chatMessage.authorName,
      authorUid: chatMessage.authorUid,
      text: localizedMessageText(chatMessage, input.lang),
      createdAt: chatMessage.createdAt,
    });
  }

  if (input.boost && input.boost.expiresAt > input.now) {
    events.push({
      id: `boost:${input.boost.likeEventId}`,
      kind: 'boost',
      action: 'open_bonus',
      authorName: input.boost.buyerName,
      authorUid: input.boost.buyerUid,
      text: `×${input.boost.multiplier}`,
      createdAt: input.boost.startedAt,
    });
  }

  if (input.rankDelta && input.rankDelta.delta !== 0) {
    const relatedName = input.rankDelta.delta > 0
      ? input.rankDelta.passedName
      : input.rankDelta.lostToName;
    events.push({
      id: `rank:${input.rankDelta.delta}:${relatedName ?? ''}`,
      kind: 'rank',
      action: 'open_rank',
      authorName: relatedName ?? undefined,
      text: String(input.rankDelta.delta),
      createdAt: input.now,
    });
  }

  if (input.crownHolder?.name) {
    events.push({
      id: `crown:${input.crownHolder.uid ?? input.crownHolder.name}`,
      kind: 'crown',
      action: input.crownHolder.uid ? 'open_profile' : 'open_rank',
      authorName: input.crownHolder.name,
      authorUid: input.crownHolder.uid,
      text: input.crownHolder.name,
      createdAt: input.now,
    });
  }

  if (input.bonusGoal > 0 && !input.chestReady) {
    events.push({
      id: `bonus:${Math.max(0, input.bonusProgress)}:${input.bonusGoal}`,
      kind: 'bonus',
      action: 'open_bonus',
      text: `${Math.max(0, input.bonusProgress)} / ${input.bonusGoal} XP`,
      createdAt: input.now,
    });
  }

  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  }).slice(0, 5);
}

import type { GroupMember } from './league_engine';
import type { LeagueGroupBoostState } from './league_group_boosts';

export type LeagueHubPrimaryAction = 'open_chat' | 'claim_chest' | 'help_club' | 'view_rank';
export type LeagueBonusMissionState = 'locked' | 'active' | 'almost_ready' | 'ready' | 'claimed';

export interface LeagueClubHeroInput {
  rank: number;
  participantCount: number;
  weeklyXp: number;
  bonusProgress: number;
  bonusGoal: number;
  unreadCount: number;
  chestReady: boolean;
  chestClaimed: boolean;
  boostLabel?: string;
  crownHolderName?: string;
}

export interface LeagueClubHeroModel extends LeagueClubHeroInput {
  bonusPercent: number;
  primaryAction: LeagueHubPrimaryAction;
}

export function buildLeagueClubHeroModel(input: LeagueClubHeroInput): LeagueClubHeroModel {
  const bonusPercent = input.bonusGoal > 0
    ? Math.min(100, Math.max(0, Math.round((input.bonusProgress / input.bonusGoal) * 100)))
    : 0;
  const primaryAction: LeagueHubPrimaryAction = input.unreadCount > 0
    ? 'open_chat'
    : input.chestReady && !input.chestClaimed
      ? 'claim_chest'
      : input.bonusGoal > input.bonusProgress
        ? 'help_club'
        : 'view_rank';

  return { ...input, bonusPercent, primaryAction };
}

export interface LeagueBonusMissionInput {
  progress: number;
  goal: number;
  myContribution: number;
  chestReady: boolean;
  chestClaimed: boolean;
  contributors: GroupMember[];
  boost: LeagueGroupBoostState | null;
}

export interface LeagueBonusMissionModel extends LeagueBonusMissionInput {
  percent: number;
  remainingXp: number;
  canClaim: boolean;
  state: LeagueBonusMissionState;
  topContributors: GroupMember[];
}

export function buildLeagueBonusMissionModel(input: LeagueBonusMissionInput): LeagueBonusMissionModel {
  const progress = Math.max(0, Math.floor(input.progress));
  const goal = Math.max(1, Math.floor(input.goal));
  const remainingXp = Math.max(0, goal - progress);
  const percent = Math.min(100, Math.round((progress / goal) * 100));
  const state: LeagueBonusMissionState = input.chestClaimed
    ? 'claimed'
    : input.chestReady
      ? 'ready'
      : percent >= 80
        ? 'almost_ready'
        : progress > 0
          ? 'active'
          : 'locked';

  return {
    ...input,
    progress,
    goal,
    remainingXp,
    percent,
    state,
    canClaim: state === 'ready',
    topContributors: [...input.contributors]
      .sort((a, b) => b.points - a.points)
      .slice(0, 3),
  };
}

export interface LeaguePodiumMember {
  place: 1 | 2 | 3;
  uid?: string;
  name: string;
  points: number;
  avatar?: string;
  frame?: string;
  aura?: string;
  isMe: boolean;
}

export function buildLeaguePodium(members: GroupMember[]): LeaguePodiumMember[] {
  return [...members]
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((member, index) => ({
      uid: member.uid,
      name: member.name,
      points: member.points,
      avatar: member.avatar,
      frame: member.frame,
      aura: member.aura,
      isMe: member.isMe,
      place: (index + 1) as 1 | 2 | 3,
    }));
}

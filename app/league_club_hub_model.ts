import type { GroupMember } from './league_engine';
import type { LeagueGroupBoostState } from './league_group_boosts';

export type LeagueBonusMissionState = 'locked' | 'active' | 'almost_ready' | 'ready' | 'claimed';

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

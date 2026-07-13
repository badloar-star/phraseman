import {
  buildLeagueBonusMissionModel,
  buildLeagueClubHeroModel,
  buildLeaguePodium,
} from '../app/league_club_hub_model';
import type { GroupMember } from '../app/league_engine';

const members: GroupMember[] = [
  { uid: 'a', name: 'Anna', points: 900, isMe: false },
  { uid: 'me', name: 'Me', points: 700, isMe: true },
  { uid: 'c', name: 'Chris', points: 500, isMe: false },
];

describe('league club hub model', () => {
  it('calculates a bounded shared-goal percentage without selecting a duplicate CTA', () => {
    const base = {
      rank: 2,
      participantCount: 3,
      weeklyXp: 700,
      bonusProgress: 8200,
      bonusGoal: 10000,
    };

    expect(buildLeagueClubHeroModel({
      ...base,
      unreadCount: 3,
      chestReady: true,
      chestClaimed: false,
    }).bonusPercent).toBe(82);
    expect(buildLeagueClubHeroModel({
      ...base,
      bonusProgress: 12000,
      unreadCount: 0,
      chestReady: true,
      chestClaimed: false,
    }).bonusPercent).toBe(100);
    expect(buildLeagueClubHeroModel({
      ...base,
      bonusProgress: -100,
      unreadCount: 0,
      chestReady: false,
      chestClaimed: false,
    }).bonusPercent).toBe(0);
  });

  it('never promises a chest that was already claimed', () => {
    const model = buildLeagueBonusMissionModel({
      progress: 10000,
      goal: 10000,
      myContribution: 700,
      chestReady: true,
      chestClaimed: true,
      contributors: members,
      boost: null,
    });

    expect(model.state).toBe('claimed');
    expect(model.canClaim).toBe(false);
    expect(model.remainingXp).toBe(0);
  });

  it('returns only real podium members and marks the current user', () => {
    expect(buildLeaguePodium(members.slice(0, 2))).toHaveLength(2);
    expect(buildLeaguePodium(members)[1]).toMatchObject({
      place: 2,
      isMe: true,
      name: 'Me',
    });
  });
});

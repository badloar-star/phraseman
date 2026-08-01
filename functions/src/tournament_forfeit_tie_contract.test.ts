import {
  planTournamentFinalization,
  type TournamentPlayer,
  type TournamentRoomDoc,
} from './tournament_core';
import type { TournamentEconomyConfig } from './tournament_economy';

const paidEconomy: TournamentEconomyConfig = {
  entryGems: 3,
  botEntryGems: 3,
  weeklyBankRate: 0.2,
  prizeShares: [0.6, 0.25, 0.15],
  weeklyShares: [0.6, 0.25, 0.15],
};

function player(id: string, score: number, forfeitedAtMs?: number): TournamentPlayer {
  return {
    id,
    name: id,
    avatar: '',
    color: '#000000',
    score,
    streak: 0,
    forfeitedAtMs,
    forfeitState: forfeitedAtMs === undefined ? undefined : 'round2',
    entry: {
      kind: 'ticket',
      ticketsSpent: 0,
      bankContributionGems: 3,
      weekId: '2026-W31',
    },
  };
}

describe('tournament forfeited tie finalization', () => {
  it('separates an active player and a forfeited player with the same score everywhere', () => {
    const room: TournamentRoomDoc = {
      roomId: 'forfeited-tie-room',
      slotId: 'slot',
      seed: 'seed',
      state: 'results',
      startsAt: 1,
      players: [player('forfeited', 20, 1), player('active', 20)],
      rounds: [],
      version: 0,
      createdAtMs: 1,
      stateDeadlineAtMs: 2,
      economySnapshot: paidEconomy,
    };

    const plan = planTournamentFinalization(room, 2);
    const effectsByPlayer = new Map(plan.playerEffects.map((effect) => [effect.playerId, effect]));
    const publishedByPlayer = new Map(plan.room.players.map((placed) => [placed.id, placed]));

    expect(effectsByPlayer.get('active')).toMatchObject({ place: 1, reward: { gems: expect.any(Number) } });
    expect(effectsByPlayer.get('forfeited')).toMatchObject({ place: 2, reward: { gems: 0, tickets: 0 } });
    expect(publishedByPlayer.get('active')).toMatchObject({ resultPlace: 1 });
    expect(publishedByPlayer.get('forfeited')).toMatchObject({ resultPlace: 2, rewardGems: 0 });
    expect(plan.room.prizeGems?.[0]).toBeGreaterThan(plan.room.prizeGems?.[1] ?? 0);
  });
});

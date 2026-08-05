import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  cancellationCreditGems,
  computePlacements,
  planTournamentCancellation,
  planTournamentFinalization,
  type TournamentPlayer,
  type TournamentRoomDoc,
} from './tournament_core';
import { weeklyBankPayouts } from './tournament_economy';
import type { TournamentEconomyConfig } from './tournament_economy';

const paidEconomy: TournamentEconomyConfig = {
  entryGems: 3,
  botEntryGems: 3,
  weeklyBankRate: 0.2,
  prizeShares: [0.6, 0.25, 0.15],
  weeklyShares: [0.6, 0.25, 0.15],
};

const freeEconomy: TournamentEconomyConfig = { ...paidEconomy, entryGems: 0 };

const player = (id: string, score: number, isBot = false, paid = true): TournamentPlayer => ({
  id,
  isBot,
  name: id,
  avatar: '🙂',
  color: '#000000',
  score,
  streak: 0,
  ...(!isBot ? {
    entry: {
      kind: 'ticket' as const,
      ticketsSpent: 0,
      bankContributionGems: paid ? 3 : 0,
      weekId: '2026-W31',
    },
  } : {}),
});

const room = (
  state: TournamentRoomDoc['state'],
  economySnapshot: TournamentEconomyConfig,
  players: TournamentPlayer[],
): TournamentRoomDoc & { economySnapshot: TournamentEconomyConfig } => ({
  roomId: 'golden-economy-room',
  slotId: 'slot',
  seed: 'seed',
  state,
  startsAt: 1_000,
  players,
  rounds: [],
  version: 0,
  createdAtMs: 1,
  stateDeadlineAtMs: 2_000,
  economySnapshot,
});

describe('Golden Plan tournament economy contracts', () => {
  it('does not grant cancellation gems for a free room, but paid cancellation credits entry plus three', () => {
    const freePlan = planTournamentCancellation(
      // Even stale/corrupt entry provenance cannot turn a free snapshot into a refund farm.
      room('lobby', freeEconomy, [player('free', 0, false, true)]),
      'resources_unavailable',
      10,
    );
    expect(freePlan.refunds[0]).toMatchObject({ bankContributionGems: 0, compensationGems: 0 });
    expect(cancellationCreditGems(freePlan.refunds[0])).toBe(0);

    const paidPlan = planTournamentCancellation(
      // The frozen room price is authoritative even if legacy provenance is missing.
      room('lobby', paidEconomy, [player('paid', 0, false, false)]),
      'resources_unavailable',
      10,
    );
    // зачем 2026-08-03 (владелец поднял вход до 5): взнос в банк возвращается
    // по АКТУАЛЬНОЙ цене входа, а не по числу из фикстуры комнаты —
    // компенсация «за ожидание» остаётся отдельной величиной (3).
    expect(paidPlan.refunds[0]).toMatchObject({ bankContributionGems: 5, compensationGems: 3 });
    expect(cancellationCreditGems(paidPlan.refunds[0])).toBe(8);
  });

  it('combines weekly shares for tied podium places without losing bank gems', () => {
    const result = weeklyBankPayouts(100, [
      { uid: 'alice', points: 20 },
      { uid: 'bob', points: 20 },
      { uid: 'carol', points: 10 },
    ], paidEconomy);

    expect(result.payouts).toEqual([
      { uid: 'alice', place: 1, gems: 43 },
      { uid: 'bob', place: 2, gems: 42 },
      { uid: 'carol', place: 3, gems: 15 },
    ]);
    expect(result.carryOver).toBe(0);
  });

  it('keeps bot podium places and pins every paid seat to the current five-gem contract', () => {
    const players = [
      player('bot-first', 400, true),
      player('human-second', 300),
      player('human-third', 200),
      player('human-fourth', 100),
    ];
    expect(computePlacements(players).realPlacements.map(({ player: placed, place }) => [placed.id, place]))
      .toEqual([['human-second', 2], ['human-third', 3], ['human-fourth', 4]]);

    const changedAdminEconomy: TournamentEconomyConfig = {
      ...paidEconomy,
      entryGems: 99,
      botEntryGems: 99,
      weeklyBankRate: 0.5,
      prizeShares: [1, 0, 0],
    };
    const plan = planTournamentFinalization(
      room('results', paidEconomy, players),
      2_000,
      changedAdminEconomy,
    );

    // Все четыре места вносят по 5: удалённый старый botEntryGems=3 больше не
    // занижает банк относительно цены, которую платит живой игрок.
    expect(plan.room.potGems).toBe(20);
    // 20 − 20% = 16, доли 60/25/15 с целочисленным остатком победителю.
    expect(plan.room.prizeGems).toEqual([10, 4, 2]);
    expect(plan.playerEffects.map(({ playerId, place, reward }) => [playerId, place, reward.gems]))
      .toEqual([
        // Живые призёры получают больше вместе с ростом банка; бот на первом
        // месте своей доли не забирает — приз бота просто НЕ выплачивается.
        ['human-second', 2, 4],
        ['human-third', 3, 2],
        ['human-fourth', 4, 0],
      ]);
    // зачем (владелец 2026-08-04, аудит «банк растёт огромными количествами»):
    // раньше сюда добавлялась невостребованная доля бота-победителя (10), и
    // банк недели раздувался почти до 100% банка комнаты в комнатах, где боты
    // занимают большинство мест. Теперь строго 20% (4) — приз бота никуда не
    // уходит и не создаётся из воздуха, просто не выплачивается никому.
    expect(plan.weeklyBankGems).toBe(4);

    const replay = planTournamentFinalization(plan.room, 3_000, changedAdminEconomy);
    expect(replay.alreadyFinalized).toBe(true);
    expect(replay.playerEffects).toEqual([]);
    expect(replay.weeklyBankGems).toBeUndefined();
  });

  it('persists an economy snapshot on every room creation path and uses it for admission', () => {
    const source = readFileSync(resolve(__dirname, 'tournaments.ts'), 'utf8');
    expect(source.match(/\beconomySnapshot,\r?\n\s*roomId/g)).toHaveLength(3);
    expect(source).toMatch(
      /economySnapshot:\s*data\.economySnapshot\s*\?\s*normalizeTournamentEconomy\(data\.economySnapshot\)\s*:\s*undefined/,
    );
    expect(source).toContain('normalizeTournamentEconomy(room.economySnapshot ?? economySnap.data())');
    expect(source).toContain('cancellationCreditGems(refund)');
    expect(source).not.toContain('bankBefore - bankRefund');
  });

  it('auto-credits room rewards in finalization and makes legacy claim a replay-safe read', () => {
    const source = readFileSync(resolve(__dirname, 'tournaments.ts'), 'utf8');
    expect(source).toContain('const rewardGems = Math.max(0, Math.trunc(effect.reward.gems));');
    expect(source).toContain("shards_updated_reason: 'tournament_prize'");
    expect(source).toMatch(/tx\.create\(rewardRef,[\s\S]*?claimed:\s*true,[\s\S]*?claimedAtMs:\s*nowMs/);
    expect(source).toContain("if (receipt.claimed === true)");
  });

  it('moves weekly carry-over in the same transaction as the payout receipt', () => {
    const source = readFileSync(resolve(__dirname, 'tournament_weekly_payout.ts'), 'utf8');
    expect(source).toContain('const nextBankRef =');
    expect(source).toContain('tx.set(nextBankRef,');
    expect(source).not.toMatch(/await db\.collection\(TOURNAMENT_BANK_COLLECTION\)\.doc\(nextWeek\)\.set/);
  });
});

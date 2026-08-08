import {
  planTournamentCancellation,
  planTournamentFinalization,
  tournamentEconomySnapshotForMode,
  tournamentRoomAdmissionMode,
  type TournamentRoomDoc,
  type TournamentScheduleConfig,
} from './tournament_core';
import { DEFAULT_TOURNAMENT_ECONOMY } from './tournament_economy';

const zeroEconomy = Object.freeze({
  ...DEFAULT_TOURNAMENT_ECONOMY,
  entryGems: 0,
  botEntryGems: 0,
});

const room = (overrides: Partial<TournamentRoomDoc> = {}): TournamentRoomDoc => ({
  roomId: 'room-1',
  slotId: 'daily_1200',
  seed: 'room-1',
  state: 'lobby',
  startsAt: 10_000,
  players: [],
  rounds: [],
  version: 0,
  createdAtMs: 1,
  ...overrides,
});

const schedule = (overrides: Partial<TournamentScheduleConfig> = {}): TournamentScheduleConfig => ({
  slots: [{
    slotId: 'daily_1200',
    localTime: '12:00',
    timezone: 'Europe/Moscow',
    ticketsRequired: 1,
    enabled: true,
  }],
  freeWeeklyEntry: false,
  ticketGemValue: 0,
  ...overrides,
});

const resultsRoom = (overrides: Partial<TournamentRoomDoc> = {}): TournamentRoomDoc => room({
  state: 'results',
  stateDeadlineAtMs: 100,
  players: [
    {
      id: 'human',
      name: 'Human',
      avatar: 'H',
      color: '#000',
      score: 10,
      streak: 0,
      entry: {
        kind: 'ticket',
        ticketsSpent: 0,
        bankContributionGems: 0,
        weekId: '2026-W31',
      },
    },
    { id: 'bot', isBot: true, name: 'Bot', avatar: 'B', color: '#111', score: 5, streak: 0 },
  ],
  ...overrides,
});

describe('paid scheduled and legacy test-room economy boundary', () => {
  // зачем 2026-08-03 (владелец: «теперь вход 5 жемчугов стоит»): цена поднята
  // с 3 до 5. Сам контракт не изменился — платная комната по-прежнему прибита
  // к КОНСТАНТЕ КОДА и игнорирует присланный извне entryGems, иначе
  // подделанный нулевой snapshot открыл бы фарм наград бесплатно.
  it.each([0, 1, 10])('pins scheduled room entry to the code constant instead of remote entryGems=%i', (entryGems) => {
    const snapshot = tournamentEconomySnapshotForMode({
      ...DEFAULT_TOURNAMENT_ECONOMY,
      entryGems,
    }, false);

    expect(snapshot.entryGems).toBe(DEFAULT_TOURNAMENT_ECONOMY.entryGems);
    expect(snapshot.entryGems).toBe(5);
  });

  it.each([0, 1, 10])('pins scheduled bot contribution to five instead of remote botEntryGems=%i', (botEntryGems) => {
    const snapshot = tournamentEconomySnapshotForMode({
      ...DEFAULT_TOURNAMENT_ECONOMY,
      botEntryGems,
    }, false);

    expect(snapshot.botEntryGems).toBe(5);
  });

  it('permits zero economy only for an explicit test-mode snapshot', () => {
    const snapshot = tournamentEconomySnapshotForMode(DEFAULT_TOURNAMENT_ECONOMY, true);

    expect(snapshot.entryGems).toBe(0);
    expect(snapshot.botEntryGems).toBe(0);
  });

  it('admits a legacy pre-marker zero-economy now room independently of the server switch', () => {
    const legacy = room({
      roomId: 'now-daily_1200-123_Europe-Moscow_2026-07-28',
      slotId: 'now-daily_1200-123',
      ticketsRequired: 0,
      economySnapshot: zeroEconomy,
    });

    expect(tournamentRoomAdmissionMode(legacy, schedule({ testingEnabled: true }))).toBe('test');
    expect(tournamentRoomAdmissionMode(legacy, schedule({ testingEnabled: false }))).toBe('test');
  });

  it('preserves scheduled admission for paid now-prefixed and ordinary rooms', () => {
    const paidNowRoom = room({
      slotId: 'now-promotional-slot',
      ticketsRequired: 1,
      economySnapshot: DEFAULT_TOURNAMENT_ECONOMY,
    });
    const ordinaryRoom = room({ economySnapshot: DEFAULT_TOURNAMENT_ECONOMY });

    expect(tournamentRoomAdmissionMode(paidNowRoom, schedule({ slots: [] }))).toBe('scheduled');
    expect(tournamentRoomAdmissionMode(ordinaryRoom, schedule())).toBe('scheduled');
  });

  it('quarantines a zero-price scheduled snapshot instead of admitting a rewarded free room', () => {
    expect(tournamentRoomAdmissionMode(
      room({ economySnapshot: zeroEconomy }),
      schedule(),
    )).toBeNull();
  });

  it('does not infer test mode when a now room explicitly records testMode false', () => {
    const explicitScheduled = room({
      roomId: 'now-daily_1200-123_Europe-Moscow_2026-07-28',
      slotId: 'now-daily_1200-123',
      testMode: false,
      ticketsRequired: 0,
      economySnapshot: zeroEconomy,
    });

    expect(tournamentRoomAdmissionMode(
      explicitScheduled,
      schedule({ slots: [], testingEnabled: true }),
    )).toBeNull();
  });

  it('prevents legacy zero-economy now rooms from minting rewards or progression', () => {
    const legacy = resultsRoom({
      roomId: 'now-daily_1200-123_Europe-Moscow_2026-07-28',
      slotId: 'now-daily_1200-123',
      economySnapshot: zeroEconomy,
    });

    const plan = planTournamentFinalization(legacy, 101);

    expect(plan.playerEffects).toEqual([]);
    expect(plan.weeklyBankGems).toBe(0);
    expect(plan.room.potGems).toBe(0);
    expect(plan.room.prizeGems).toEqual([]);
  });

  it('keeps newly pinned scheduled rooms paid and rewarding despite zero remote config', () => {
    const scheduled = resultsRoom({
      economySnapshot: tournamentEconomySnapshotForMode(zeroEconomy, false),
    });

    const plan = planTournamentFinalization(scheduled, 101);

    expect(plan.playerEffects).toHaveLength(1);
    // Живой игрок и бот вносят по 5: нулевой удалённый конфиг не обнуляет банк.
    expect(plan.room.potGems).toBe(10);
    // Из 10 две жемчужины уходят в недельный банк; первое место получает свою
    // долю призового остатка, а незанятые места возвращаются в недельный банк.
    expect(plan.room.prizeGems?.[0]).toBe(5);
  });

  it('refunds a paid snapshot but never trusts zero-snapshot provenance to mint cancellation gems', () => {
    const paidPlayer = resultsRoom({
      state: 'lobby',
      economySnapshot: DEFAULT_TOURNAMENT_ECONOMY,
    });
    const invalidFreeScheduled = resultsRoom({
      state: 'lobby',
      economySnapshot: zeroEconomy,
      players: paidPlayer.players.map((player) => ({
        ...player,
        entry: player.isBot ? undefined : {
          kind: 'ticket',
          ticketsSpent: 0,
          bankContributionGems: 5,
          weekId: '2026-W31',
        },
      })),
    });
    const legacyTest = resultsRoom({
      roomId: 'now-daily_1200-123_Europe-Moscow_2026-07-28',
      slotId: 'now-daily_1200-123',
      state: 'lobby',
      economySnapshot: zeroEconomy,
    });

    const paidRefund = planTournamentCancellation(paidPlayer, 'cancelled', 200).refunds[0];
    const invalidRefund = planTournamentCancellation(invalidFreeScheduled, 'cancelled', 200).refunds[0];
    const testRefund = planTournamentCancellation(legacyTest, 'cancelled', 200).refunds[0];

    expect(paidRefund.bankContributionGems).toBe(5);
    expect(invalidRefund.bankContributionGems).toBe(0);
    expect(invalidRefund.compensationGems).toBe(0);
    expect(testRefund.bankContributionGems).toBe(0);
    expect(testRefund.compensationGems).toBe(0);
  });
});

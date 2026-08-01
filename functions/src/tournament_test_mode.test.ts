import fs from 'fs';
import path from 'path';
import {
  normalizeTournamentSchedule,
  planTournamentFinalization,
  tournamentEconomySnapshotForMode,
  tournamentRoomAdmissionMode,
  type TournamentRoomDoc,
  type TournamentScheduleConfig,
} from './tournament_core';
import { DEFAULT_TOURNAMENT_ECONOMY } from './tournament_economy';

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

describe('temporary tournament testing mode', () => {
  it('fails closed unless the deployed release explicitly includes test mode', () => {
    const runtime = require('./tournaments') as {
      tournamentTestModeReleaseEnabled?: (env: NodeJS.ProcessEnv) => boolean;
    };
    const gate = runtime.tournamentTestModeReleaseEnabled;
    expect(gate).toBeDefined();
    if (!gate) return;
    expect(gate({})).toBe(false);
    expect(gate({ PHRASEMAN_TOURNAMENT_TEST_MODE_RELEASE: 'true' })).toBe(false);
    expect(gate({ PHRASEMAN_TOURNAMENT_TEST_MODE_RELEASE: '1' })).toBe(true);
  });

  it('normalizes testingEnabled fail-closed and accepts only literal true', () => {
    expect(normalizeTournamentSchedule({ slots: [], testingEnabled: true }).testingEnabled).toBe(true);
    expect(normalizeTournamentSchedule({ slots: [], testingEnabled: 'true' }).testingEnabled).not.toBe(true);
    expect(normalizeTournamentSchedule({ slots: [] }).testingEnabled).not.toBe(true);
    expect(normalizeTournamentSchedule(null).testingEnabled).not.toBe(true);
  });

  it('allows authenticated test-room admission independently of the schedule switch', () => {
    const testRoom = room({ testMode: true, slotId: 'test-now-1', ticketsRequired: 0 });

    expect(tournamentRoomAdmissionMode(testRoom, schedule({ testingEnabled: true }))).toBe('test');
    expect(tournamentRoomAdmissionMode(testRoom, schedule({ testingEnabled: false }))).toBe('test');
    expect(tournamentRoomAdmissionMode(testRoom, schedule())).toBe('test');
  });

  it('does not turn scheduled or legacy paid rooms free when testing is enabled', () => {
    expect(tournamentRoomAdmissionMode(room(), schedule({ testingEnabled: true }))).toBe('scheduled');
    expect(tournamentRoomAdmissionMode(
      room({ slotId: 'legacy-own-slot', ticketsRequired: 3 }),
      schedule({ slots: [], testingEnabled: true }),
    )).toBe('scheduled');

    expect(tournamentEconomySnapshotForMode(DEFAULT_TOURNAMENT_ECONOMY, false))
      .toEqual(DEFAULT_TOURNAMENT_ECONOMY);
  });

  it('snapshots test rooms with zero human and bot economy', () => {
    const snapshot = tournamentEconomySnapshotForMode(DEFAULT_TOURNAMENT_ECONOMY, true);

    expect(snapshot.entryGems).toBe(0);
    expect(snapshot.botEntryGems).toBe(0);
    expect(snapshot.prizeShares).toEqual(DEFAULT_TOURNAMENT_ECONOMY.prizeShares);
  });

  it('does not create rewards, season effects, or weekly-bank value for test results', () => {
    const finalRoom = room({
      testMode: true,
      state: 'results',
      stateDeadlineAtMs: 100,
      economySnapshot: tournamentEconomySnapshotForMode(DEFAULT_TOURNAMENT_ECONOMY, true),
      players: [
        { id: 'human', name: 'Human', avatar: 'H', color: '#000', score: 10, streak: 0 },
        { id: 'bot', isBot: true, name: 'Bot', avatar: 'B', color: '#111', score: 5, streak: 0 },
      ],
    });

    const plan = planTournamentFinalization(finalRoom, 101);

    expect(plan.playerEffects).toEqual([]);
    expect(plan.weeklyBankGems).toBe(0);
    expect(plan.room.potGems).toBe(0);
    expect(plan.room.prizeGems).toEqual([]);
  });

  it('keeps start-now authenticated and zero-economy behind the release gate', () => {
    const source = fs.readFileSync(path.join(__dirname, 'tournaments.ts'), 'utf8');
    const start = source.indexOf('export const tournamentStartNow');
    const end = source.indexOf('export const tournamentRoundReview', start);
    const block = source.slice(start, end > start ? end : undefined);

    expect(block).toContain("if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required')");
    expect(block).toContain('enforceAppCheck: false');
    expect(block).toContain('if (!tournamentTestModeReleaseEnabled())');
    expect(block).toContain("throw new HttpsError('failed-precondition', 'tournament_testing_disabled')");
    expect(block).not.toContain("throw new HttpsError('failed-precondition', 'no_slots_configured')");
    expect(block).toContain('testMode: true');
    expect(block).not.toContain('request.auth?.token?.admin');
    expect(block).not.toContain('config.testingEnabled');
  });
});

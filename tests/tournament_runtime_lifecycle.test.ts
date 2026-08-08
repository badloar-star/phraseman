import fs from 'fs';
import path from 'path';
import {
  hasTournamentTableSettledScores,
  resolveTournamentDisplayRoundNo,
  resolveTournamentLobbyRoute,
  shouldTableEnterRound,
  tournamentSecondsUntil,
} from '../app/tournament_client';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('tournament lifecycle routing', () => {
  test.each([
    ['round1', 'round'],
    ['table2', 'table'],
    ['results', 'results'],
    ['rewards', 'results'],
    ['closed', 'results'],
    ['lobby', null],
  ])('Lobby routes fresh %s directly to %s', (state, expected) => {
    expect(resolveTournamentLobbyRoute(state)).toBe(expected);
  });

  test('Table does not bounce to the round that the player just completed', () => {
    expect(shouldTableEnterRound('round1', 1)).toBe(false);
    expect(shouldTableEnterRound('round2', 1)).toBe(true);
    expect(shouldTableEnterRound('table1', 1)).toBe(false);
  });

  test('an early table never presents active-round scores as settled results', () => {
    expect(hasTournamentTableSettledScores('round1', 1)).toBe(false);
    expect(hasTournamentTableSettledScores('table1', 1)).toBe(true);
    expect(hasTournamentTableSettledScores('round2', 1)).toBe(true);
    expect(hasTournamentTableSettledScores('round1', null)).toBe(true);

    const table = read('app/tournament_table.tsx');
    expect(table).toContain('hasTournamentTableSettledScores');
    expect(table).toContain('Ждём остальных');
    expect(table).not.toContain('SkeletonBlock');
    expect(table).toContain('rows.map((row, index) => (');
  });

  test('table title follows the active/completed state instead of the four preloaded rounds', () => {
    expect(resolveTournamentDisplayRoundNo('round1', null)).toBe(1);
    expect(resolveTournamentDisplayRoundNo('table1', 1)).toBe(1);
    expect(resolveTournamentDisplayRoundNo('round4', 3)).toBe(4);
    expect(resolveTournamentDisplayRoundNo('results', 1)).toBe(4);
    expect(resolveTournamentDisplayRoundNo(null, 1)).toBe(1);

    const table = read('app/tournament_table.tsx');
    expect(table).toContain('resolveTournamentDisplayRoundNo');
    expect(table).not.toContain('Math.max(...room.rounds');
  });

  test('countdowns derive from absolute deadlines after a long sleep', () => {
    expect(tournamentSecondsUntil(10_000, 1_200)).toBe(9);
    expect(tournamentSecondsUntil(10_000, 9_999)).toBe(1);
    expect(tournamentSecondsUntil(10_000, 15_000)).toBe(0);
  });
});

describe('tournament runtime ownership source contract', () => {
  test('room and reaction listeners expose active/fresh ownership', () => {
    const client = read('app/tournament_client.ts');
    expect(client).toContain('freshSnapshot: boolean;');
    expect(client).toContain('snapshot.metadata?.fromCache === true');
    expect(client).toContain('scopeTournamentFreshSnapshot(');
    expect(client).toContain('freshSnapshotRoomId,');
    expect(client).toContain('freshForRequestedRoom');
    expect(client).toContain('secondsLeftForRequestedRoom');
    expect(client).toContain('statusRoomId');
    expect(client).toContain('nudgedRef.current = null');
    expect(client).toContain('const key = `${roomId}:${state}:${deadline}`');
    expect(client).toContain('export function useTournamentReactions(roomId: string | null, active = true)');
    expect(client).toContain('if (!active) return;');
  });

  test.each([
    'app/tournament_lobby.tsx',
    'app/tournament_round.tsx',
    'app/tournament_table.tsx',
    'app/tournament_results.tsx',
  ])('%s passes runtime ownership to tournament work', (file) => {
    const source = read(file);
    expect(source).toContain('const runtimeActive = useRuntimeActive();');
  });

  test('cached room cannot navigate, claim, roll, haptic, or animate results', () => {
    const lobby = read('app/tournament_lobby.tsx');
    const table = read('app/tournament_table.tsx');
    const round = read('app/tournament_round.tsx');
    const results = read('app/tournament_results.tsx');
    expect(lobby).toContain('if (!runtimeActive || !freshSnapshot');
    expect(table).toContain('if (!runtimeActive || !freshSnapshot');
    expect(round).toContain('if (!runtimeActive || !freshSnapshot');
    expect(results).toContain('if (!runtimeActive || !freshSnapshot');
    expect(results).toContain('if (!runtimeActive || !freshSnapshot || !won');
  });

  test('round feedback and absolute countdown stop when the owner sleeps', () => {
    const round = read('app/tournament_round.tsx');
    expect(round).toContain('if (!runtimeActive && advanceRef.current)');
    expect(round).toContain('activeRound?.taskSchedule');
    expect(round).toContain('tournamentSecondsUntil(questionTiming.answerDeadlineAtMs ?? questionTiming.deadlineAtMs, serverNowMs)');
    expect(round).toContain('const serverNowMs = tournamentNow()');
    expect(round).not.toContain('questionDeadlineRef');
  });
});

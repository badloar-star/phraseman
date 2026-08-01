import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  canRetryTournamentTaskAnswer,
  getOrCreateTournamentTaskIdempotencyKey,
  isRetryableTournamentTaskAnswerError,
  isTournamentTaskWindowResolved,
  resolveTournamentScheduledTaskIndex,
  resolveTournamentVisibleTaskIndex,
  type RoomTaskTiming,
} from '../app/tournament_client';

const schedule: RoomTaskTiming[] = [
  { taskId: 'a', taskIndex: 0, durationMs: 10_000, startsAtMs: 1_000, deadlineAtMs: 11_000 },
  { taskId: 'b', taskIndex: 1, durationMs: 20_000, startsAtMs: 11_000, deadlineAtMs: 31_000 },
  { taskId: 'c', taskIndex: 2, durationMs: 10_000, startsAtMs: 31_000, deadlineAtMs: 41_000 },
  { taskId: 'd', taskIndex: 3, durationMs: 20_000, startsAtMs: 41_000, deadlineAtMs: 61_000 },
];

describe('tournament per-task client contract', () => {
  test('resume selects the server-scheduled active or next task instead of index zero', () => {
    expect(resolveTournamentScheduledTaskIndex(schedule, 20_000)).toBe(1);
    expect(resolveTournamentScheduledTaskIndex(schedule, 11_000)).toBe(1);
    expect(resolveTournamentScheduledTaskIndex(schedule, 500)).toBe(0);
    expect(resolveTournamentScheduledTaskIndex(schedule, 70_000)).toBe(3);
    expect(resolveTournamentScheduledTaskIndex([], 20_000)).toBe(0);
  });

  test('same-round terminal, reconnect, and focus reconciliation never regress the visible task', () => {
    expect(resolveTournamentVisibleTaskIndex(schedule, 35_000, 3)).toBe(3);
    expect(resolveTournamentVisibleTaskIndex(schedule, 45_000, 2)).toBe(3);
    expect(resolveTournamentVisibleTaskIndex(schedule, 35_000)).toBe(2);

    const round = readFileSync(resolve(__dirname, '../app/tournament_round.tsx'), 'utf8');
    expect(round).not.toContain('setNavigation(null)');
  });

  test('one task keeps one idempotency key across retries while another task gets a new key', () => {
    const keys = new Map<string, string>();
    let nonce = 0;
    const createNonce = () => `nonce_${++nonce}`;
    const first = getOrCreateTournamentTaskIdempotencyKey(keys, 'room/unsafe', 2, 'task:a', createNonce);
    const retry = getOrCreateTournamentTaskIdempotencyKey(keys, 'room/unsafe', 2, 'task:a', createNonce);
    const next = getOrCreateTournamentTaskIdempotencyKey(keys, 'room/unsafe', 2, 'task:b', createNonce);

    expect(retry).toBe(first);
    expect(next).not.toBe(first);
    expect(nonce).toBe(2);
    expect(first).toMatch(/^[A-Za-z0-9:_-]{8,160}$/);
  });

  test('only transient transport failures retry and only inside the server-authored grace window', () => {
    for (const code of [
      'functions/aborted',
      'functions/cancelled',
      'functions/deadline-exceeded',
      'functions/internal',
      'functions/resource-exhausted',
      'functions/unavailable',
      'functions/unknown',
    ]) expect(isRetryableTournamentTaskAnswerError({ code })).toBe(true);
    for (const code of [
      'functions/failed-precondition',
      'functions/already-exists',
      'functions/invalid-argument',
      'functions/unauthenticated',
      'functions/permission-denied',
      'functions/not-found',
    ]) expect(isRetryableTournamentTaskAnswerError({ code })).toBe(false);
    expect(canRetryTournamentTaskAnswer(schedule[0], 12_500)).toBe(true);
    expect(canRetryTournamentTaskAnswer(schedule[0], 12_501)).toBe(false);
    expect(canRetryTournamentTaskAnswer({
      ...schedule[0],
      answerDeadlineAtMs: 8_000,
    }, 9_501)).toBe(false);
  });

  test('a remounted round treats every elapsed server task window as resolved', () => {
    expect(isTournamentTaskWindowResolved(schedule[0], 10_999)).toBe(false);
    expect(isTournamentTaskWindowResolved(schedule[0], 11_000)).toBe(true);
    expect(isTournamentTaskWindowResolved({
      ...schedule[0],
      answerDeadlineAtMs: 8_000,
    }, 8_000)).toBe(true);

    const round = readFileSync(resolve(__dirname, '../app/tournament_round.tsx'), 'utf8');
    expect(round).toContain('isTournamentTaskWindowResolved');
  });

  test('round submits each task through the authoritative callable and reconciles feedback', () => {
    const client = readFileSync(resolve(__dirname, '../app/tournament_client.ts'), 'utf8');
    const round = readFileSync(resolve(__dirname, '../app/tournament_round.tsx'), 'utf8');

    expect(client).toContain("'tournamentSubmitTaskAnswer'");
    expect(client).toContain('roomId, roundNo, taskId, answer, idempotencyKey');
    expect(round).toContain('submitTaskAnswer');
    expect(round).toContain('result.correct');
    expect(round).toContain('getOrCreateTournamentTaskIdempotencyKey');
    expect(round).not.toContain('submitAnswers');
    expect(round).not.toContain('submittedRef');
    expect(round).not.toContain('buildAnswerRows');
  });

  test('round resumes from absolute server schedule and creates no local deadline', () => {
    const round = readFileSync(resolve(__dirname, '../app/tournament_round.tsx'), 'utf8');
    expect(round).toContain('resolveTournamentScheduledTaskIndex');
    expect(round).toContain('activeRound?.taskSchedule');
    expect(round).toContain('questionTiming.deadlineAtMs');
    expect(round).not.toContain('questionDeadlineRef');
    expect(round).not.toContain('Date.now() +');
  });
});

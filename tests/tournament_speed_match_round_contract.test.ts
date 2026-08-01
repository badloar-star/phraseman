import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(__dirname, '..', 'app', 'tournament_round.tsx'), 'utf8');

describe('tournament speed-match round', () => {
  it('renders one six-pair match board with server-authored timing and recoverable feedback', () => {
    expect(source).not.toContain('SECONDS_PER_MATCH');
    expect(source).toContain('questionTiming?.durationMs');
    expect(source).toContain('questionTiming.deadlineAtMs');
    expect(source).toContain("task.kind === 'match'");
    expect(source).toContain('items.length !== SPEED_MATCH_PAIRS');
    expect(source).toContain('MatchBoard');
    expect(source).toContain('setMatchStars((value) => Math.max(0, value - 1))');
    expect(source).toContain('setMatchStatus');
    expect(source).toContain('submitSpeedMatchAttempt(roomId, roundNo, question.taskId, pairIndex, selectedIndex)');
    expect(source).not.toContain('answerFingerprints');
    expect(source).not.toContain('function answerFingerprint');
  });
});

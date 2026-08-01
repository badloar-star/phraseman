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

  it('reserves an immutable tuple and keeps both selected cards visible until the authoritative verdict', () => {
    const strictBoard = source.slice(source.indexOf('const StrictMatchBoard'), source.indexOf('const WordBank'));

    expect(strictBoard).toContain('const reserveTuple');
    expect(strictBoard).toContain('const tuple = { left, right };');
    expect(strictBoard).toContain('const [pendingTuple, setPendingTuple]');
    const beforeAuthoritativeVerdict = strictBoard.slice(
      strictBoard.indexOf('const tuple = { left, right };'),
      strictBoard.indexOf('onSelect(tuple.left, tuple.right)'),
    );
    expect(beforeAuthoritativeVerdict).not.toContain('setPickedLeft(null)');
    expect(beforeAuthoritativeVerdict).not.toContain('setPickedRight(null)');
    expect(strictBoard).toContain('if (pendingTuple) return;');
    expect(strictBoard).toContain('reservedLeft.has(index)');
    expect(strictBoard).toContain('reservedRight.has(index)');
  });
});

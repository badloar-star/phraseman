import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(__dirname, '..', 'app', 'tournament_round.tsx'), 'utf8');

describe('tournament speed-match round', () => {
  it('renders one six-pair, twenty-second match board with immediate recoverable feedback', () => {
    expect(source).toContain("const SECONDS_PER_MATCH = 20");
    expect(source).toContain("task.kind === 'match'");
    expect(source).toContain('items.length !== SPEED_MATCH_PAIRS');
    expect(source).toContain('MatchBoard');
    expect(source).toContain('setMatchStars((value) => Math.max(0, value - 1))');
    expect(source).toContain('setMatchStatus');
    expect(source).toContain('fingerprint === question.answerFingerprints?.[pairIndex]');
  });
});

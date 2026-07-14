import fs from 'fs';
import path from 'path';

describe('matchmaking resume bot deadline', () => {
  it('starts a fresh bot wait after returning from an unaccepted match', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'contexts', 'MatchmakingContext.tsx'),
      'utf8',
    );

    expect(source).toContain('const botFallbackBaseAt = usePreserved ? now : t0;');
    expect(source).toContain(': botFallbackBaseAt + selectedBotDelay;');
    expect(source).toContain('timeoutDeadlineAt: t0 + SEARCH_TIMEOUT_MS');
  });
});

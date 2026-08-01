import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(__dirname, '..', path), 'utf8');

describe('tournament full-lobby immediate start contract', () => {
  const server = read('functions/src/tournaments.ts');
  const compiledServer = read('functions/lib/functions/src/tournaments.js');
  const client = read('app/tournament_client.ts');
  const lobby = read('app/tournament_lobby.tsx');

  it('lets an authenticated room participant request the exact server-checked deadline transition', () => {
    const callableStart = server.indexOf('export const tournamentAdvanceRound');
    const callableEnd = server.indexOf('// ── Claim', callableStart);
    const callable = server.slice(callableStart, callableEnd);

    expect(callable).toMatch(
      /export const tournamentAdvanceRound = onCall\([\s\S]*?\{\s*\.\.\.HOT_CALLABLE_OPTIONS,\s*enforceAppCheck: false,\s*minInstances: 1/,
    );
    expect(callable).toContain('expectedState');
    expect(callable).toContain('expectedDeadlineAtMs');
    expect(callable).toContain('requesterStableUid');
    expect(callable).not.toMatch(/request\.data\?\.(nowMs|requesterStableUid)/);
    expect(client).toContain('shouldNudgeTournamentDeadline(deadline)');

    const compiledCallableStart = compiledServer.indexOf('exports.tournamentAdvanceRound =');
    const compiledCallableEnd = compiledServer.indexOf('exports.tournamentClaimReward =', compiledCallableStart);
    const compiledCallable = compiledServer.slice(compiledCallableStart, compiledCallableEnd);
    expect(compiledCallableStart).toBeGreaterThanOrEqual(0);
    expect(compiledCallableEnd).toBeGreaterThan(compiledCallableStart);
    expect(compiledCallable).toMatch(
      /exports\.tournamentAdvanceRound = [\s\S]*?enforceAppCheck: false,\s*minInstances: 1/,
    );
    expect(compiledCallable).toContain('expectedState');
    expect(compiledCallable).toContain('expectedDeadlineAtMs');
    expect(compiledCallable).toContain('requesterStableUid');
  });

  it('sets the lobby boundary to the last authored arrival without a settling delay', () => {
    expect(server).toContain(
      'fillDeadlineAtMs: Math.max(input.gatherStartedAtMs, lastBotAtMs),',
    );
    expect(server).toContain('const fillDeadlineAtMs = Math.max(nowMs, lastBotAtMs);');
    expect(server).not.toMatch(/lastBotAtMs\) \+ 1000/);
    expect(compiledServer).toContain(
      'fillDeadlineAtMs: Math.max(input.gatherStartedAtMs, lastBotAtMs),',
    );
    expect(compiledServer).toContain('const fillDeadlineAtMs = Math.max(nowMs, lastBotAtMs);');
    expect(compiledServer).not.toMatch(/lastBotAtMs\) \+ 1000/);
  });

  it('has no disabled start CTA and never shows a zero timer after all sixteen are visible', () => {
    expect(lobby).not.toContain("'Начинаем'");
    expect(lobby).not.toMatch(/<V2Cta\s+disabled/);
    expect(lobby).toContain('{!full ? (');
  });
});

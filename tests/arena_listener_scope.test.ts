import fs from 'node:fs';
import path from 'node:path';

import {
  arenaResultRouteOwnerMatches,
  createArenaListenerScopeGate,
  createArenaResultOwnerGate,
} from '../modules/arena/listener_scope';

describe('Arena listener account scope', () => {
  it('invalidates account A immediately when generation B is captured', () => {
    const gate = createArenaListenerScopeGate();
    const accountA = gate.capture('active:1:account-a:match-1');
    expect(gate.current(accountA)).toBe(true);

    const accountB = gate.capture('active:2:account-b:match-1');

    expect(gate.current(accountA)).toBe(false);
    expect(gate.current(accountB)).toBe(true);
  });

  it('rejects a late A snapshot while B remains the current listener owner', () => {
    const gate = createArenaListenerScopeGate();
    const accountA = gate.capture('active:1:account-a:match-1');
    const accountB = gate.capture('active:2:account-b:match-1');
    const accepted: string[] = [];

    if (gate.current(accountA)) accepted.push('late-a');
    if (gate.current(accountB)) accepted.push('fresh-b');

    expect(accepted).toEqual(['fresh-b']);
  });

  it('pins a result screen to the first active account generation', () => {
    const gate = createArenaResultOwnerGate();

    expect(gate.claim(null)).toBe(false);
    expect(gate.claim('active:1:account-a')).toBe(true);
    expect(gate.claim(null)).toBe(false);
    expect(gate.claim('active:2:account-b')).toBe(false);
    expect(gate.current('active:1:account-a')).toBe(true);
  });

  it('does not let a later active account claim a route whose origin was invalidated before mount', () => {
    expect(arenaResultRouteOwnerMatches(null, { phase: 'active', generation: 2 })).toBe(false);
    expect(arenaResultRouteOwnerMatches(1, { phase: 'transitioning', generation: 1 })).toBe(false);
    expect(arenaResultRouteOwnerMatches(1, { phase: 'active', generation: 1 })).toBe(true);
    expect(arenaResultRouteOwnerMatches(1, { phase: 'active', generation: 2 })).toBe(false);
  });

  it('wires the result listener to the complete account generation key', () => {
    const client = fs.readFileSync(path.resolve(__dirname, '../app/arena_client.ts'), 'utf8');
    const results = fs.readFileSync(path.resolve(__dirname, '../app/arena_results.tsx'), 'utf8');
    const listenerScope = fs.readFileSync(path.resolve(__dirname, '../modules/arena/listener_scope.ts'), 'utf8');

    expect(client).toContain('createArenaListenerScopeGate');
    expect(client).toContain('gate.current(capturedScope)');
    expect(results).toContain('useArenaMatch(matchId, resultAccountActive, resultAccountKey)');
    expect(results).not.toContain('useArenaMatch(matchId, active, resultAccountKey)');
    expect(results).toContain('createArenaResultOwnerGate');
    expect(results).toContain('arenaResultRouteOwnerMatches');
    expect(results).toContain('ownerGeneration?: string');
    expect(listenerScope).toContain('account.generation === routeOwnerGeneration');
    expect(results).toContain('if (!resultOwnerCurrent) return null;');
    expect(results).toContain("router.replace('/arena' as never)");
    expect(fs.readFileSync(path.resolve(__dirname, '../app/arena_match.tsx'), 'utf8'))
      .toContain('ownerGeneration: String(resultAccount.generation)');
    expect(results).toContain('quickPresentation?.match ?? live.value');
  });
});

import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string): string => (
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
);

describe('Arena result rune wallet refresh', () => {
  it('refreshes the unified wallet after the authoritative reward arrives', () => {
    const results = read('app/arena_results.tsx');
    expect(results).toContain('const starsEarned = Math.max(0, Math.trunc(Number(reward?.starsEarned ?? 0)))');
    expect(results).toContain('if (!resultAccountActive || !matchId || starsEarned <= 0) return;');
    expect(results).toContain('flushStalePracticeRuneSettlements(resultAccount.stableId');
    expect(results).toContain('void refreshWallet();');
    expect(results).toContain('if (result.synced > 0) return refreshWallet();');
    expect(results).toContain('arenaRuneWalletRefreshKeyRef.current = refreshKey;');
  });

  it('keeps Arena on the server-confirmed monotonic merge instead of practice credit', () => {
    const results = read('app/arena_results.tsx');
    const client = read('app/arena_client.ts');
    expect(results).not.toContain('usePracticeRunes');
    expect(client).toContain('mergeLevelSpinServerStars(accountToken, arenaUnifiedStarsObservation(home))');
  });
});

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function walk(relativeDir: string): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(path.join(ROOT, relativeDir), { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) result.push(...walk(relativePath));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) result.push(relativePath);
  }
  return result;
}

describe('Arena matchmaking clock ownership', () => {
  it('keeps context elapsed time consumed only by the Arena lobby', () => {
    const consumers = ['app', 'components', 'hooks']
      .flatMap(walk)
      .filter((file) => /import\s*\{[^}]*useMatchmakingContext[^}]*\}\s*from/.test(read(file)))
      .filter((file) => /useMatchmakingContext\s*\(\s*\)/.test(read(file)))
      .filter((file) => /\belapsedMs\b/.test(read(file)))
      .sort();

    expect(consumers).toEqual(['app/arena_lobby.tsx']);
    expect(read('contexts/MatchmakingContext.tsx')).toMatch(/elapsedMs\s*:\s*number/);
    expect(read('app/arena_lobby.tsx')).toContain('Date.now() - searchStartedAt');
  });

  it('does not confuse independent same-named clocks with context consumers', () => {
    const legacyHook = read('hooks/use-matchmaking.ts');
    const karaoke = read('components/onboarding_aha/aha_karaoke.ts');
    expect(legacyHook).toContain('const [elapsedMs, setElapsedMs] = useState(0)');
    expect(legacyHook).not.toContain('useMatchmakingContext');
    expect(karaoke).toContain('elapsedMs: number');
    expect(karaoke).not.toContain('useMatchmakingContext');
  });
});

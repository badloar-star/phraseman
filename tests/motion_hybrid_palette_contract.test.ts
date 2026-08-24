import fs from 'node:fs';
import path from 'node:path';

const HYBRID_SURFACES = [
  'components/arena/ArenaRankHybrid.tsx',
  'components/league/LeagueResultHybrid.tsx',
  'components/DialogVictoryCelebrationHybrid.tsx',
  'components/premium_celebration/PremiumCelebrationHybrid.tsx',
] as const;

describe('motion hybrid palette contract', () => {
  test('keeps raw hexadecimal colors in constants rather than component code', () => {
    const offenders: string[] = [];

    for (const relativePath of HYBRID_SURFACES) {
      const source = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
      for (const match of source.matchAll(/#[\da-fA-F]{3,8}\b/g)) {
        const line = source.slice(0, match.index).split(/\r?\n/).length;
        offenders.push(`${relativePath}:${line}:${match[0]}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});

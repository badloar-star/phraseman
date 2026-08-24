import fs from 'node:fs';
import path from 'node:path';

const HYBRID_SURFACES = [
  'components/arena/ArenaRankHybrid.tsx',
  'components/league/LeagueResultHybrid.tsx',
  'components/premium_celebration/PremiumCelebrationHybrid.tsx',
] as const;

describe('motion hybrid typography contract', () => {
  test('uses only the supported 400 and 700 font weights', () => {
    const offenders: string[] = [];

    for (const relativePath of HYBRID_SURFACES) {
      const source = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
      for (const match of source.matchAll(/fontWeight:\s*['"]([^'"]+)['"]/g)) {
        if (match[1] !== '400' && match[1] !== '700') {
          const line = source.slice(0, match.index).split(/\r?\n/).length;
          offenders.push(`${relativePath}:${line}:${match[1]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

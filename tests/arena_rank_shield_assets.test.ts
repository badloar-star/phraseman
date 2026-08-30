import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');
const MAP_FILE = path.join(ROOT, 'components/arena/arena_rank_shield_assets.ts');
const ASSET_DIR = path.join(ROOT, 'assets/images/arena/ranks');
const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend'] as const;
const divisions = ['iii', 'ii', 'i'] as const;

describe('Arena rank shield assets', () => {
  it('statically wires exactly one WebP for every one of the 24 ranks', () => {
    const source = fs.readFileSync(MAP_FILE, 'utf8');
    const required = [...source.matchAll(/require\(['"]\.\.\/\.\.\/assets\/images\/arena\/ranks\/([^'"]+\.webp)['"]\)/g)]
      .map((match) => match[1]);
    const expected = tiers.flatMap((tier) => divisions.map((division) => `${tier}-${division}.webp`));

    expect(required).toHaveLength(24);
    expect(new Set(required).size).toBe(24);
    expect([...required].sort()).toEqual([...expected].sort());
    for (const filename of expected) {
      expect(fs.existsSync(path.join(ASSET_DIR, filename))).toBe(true);
    }
  });

  it('keeps every bundled shield on the same alpha-preserving canvas', async () => {
    for (const tier of tiers) {
      for (const division of divisions) {
        const metadata = await sharp(path.join(ASSET_DIR, `${tier}-${division}.webp`)).metadata();
        expect(metadata.width).toBe(384);
        expect(metadata.height).toBe(384);
        expect(metadata.hasAlpha).toBe(true);
      }
    }
  });
});

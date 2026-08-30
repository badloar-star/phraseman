import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const LEAGUE_ASSETS = [
  { id: 0, slug: 'med', icon: 'league-icon-med.webp' },
  { id: 1, slug: 'bronz', icon: 'league-icon-bronz.webp' },
  { id: 2, slug: 'serebro', icon: 'league-icon-serebro.webp' },
  { id: 3, slug: 'zoloto', icon: 'league-icon-zoloto.webp' },
  { id: 4, slug: 'platina', icon: 'league-icon-platina.webp' },
  { id: 5, slug: 'izumrud', icon: 'league-icon-izumrud.webp' },
  { id: 6, slug: 'sapfir', icon: 'league-icon-sapfir.webp' },
  { id: 7, slug: 'rubin', icon: 'league-icon-rubin.webp' },
  { id: 8, slug: 'almaz', icon: 'league-icon-almaz.webp' },
  { id: 9, slug: 'cherniy-almaz', icon: 'league-icon-cherniy-almaz.webp' },
  { id: 10, slug: 'efir', icon: 'league-icon-efir.webp' },
  { id: 11, slug: 'vishaya', icon: 'league-icon-vishaya.webp' },
] as const;

const EXPECTED_SIGILS = [
  'open-book',
  'quill-scroll',
  'owl-mask',
  'knowledge-compass',
  'astrolabe',
  'knowledge-tree',
  'celestial-map',
  'alchemical-flame',
  'crystalline-eye',
  'eclipse-archive',
  'mind-constellation',
  'eternal-library-light',
] as const;

async function getAlphaBounds(filePath: string): Promise<{ padL: number; padT: number; padR: number; padB: number }> {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return {
    padL: minX,
    padT: minY,
    padR: info.width - 1 - maxX,
    padB: info.height - 1 - maxY,
  };
}

async function getTallDarkSideColumns(filePath: string): Promise<number[]> {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const badColumns: number[] = [];

  for (let x = 0; x < info.width; x += 1) {
    const outsideShieldCore = x < info.width * 0.28 || x > info.width * 0.72;
    if (!outsideShieldCore) continue;

    let run = 0;
    let maxRun = 0;
    for (let y = 0; y < info.height; y += 1) {
      const offset = (y * info.width + x) * 4;
      const alpha = data[offset + 3];
      const maxRgb = Math.max(data[offset], data[offset + 1], data[offset + 2]);
      const darkArtifact = alpha > 18 && maxRgb <= 46;
      if (darkArtifact) {
        run += 1;
        maxRun = Math.max(maxRun, run);
      } else {
        run = 0;
      }
    }

    if (maxRun >= info.height * 0.32) {
      badColumns.push(x);
    }
  }

  return badColumns;
}

describe('league visual assets', () => {
  it('keeps the approved knowledge-relic progression in the asset manifest', () => {
    const manifest = JSON.parse(fs.readFileSync(
      path.join(process.cwd(), 'assets', 'images', 'levels', 'league-v6-icons', 'manifest.json'),
      'utf8',
    ));

    expect(manifest.version).toBe('league-knowledge-relics-v1');
    expect(manifest.leagues).toHaveLength(12);
    expect(manifest.leagues.map((entry: { sigil: string }) => entry.sigil)).toEqual(EXPECTED_SIGILS);
    expect(manifest.output.quality).toBeGreaterThanOrEqual(58);
    expect(manifest.output.quality).toBeLessThanOrEqual(80);
    expect(manifest.designRules).toEqual(expect.arrayContaining([
      expect.stringMatching(/volumetric 3D hexahedron/i),
      expect.stringMatching(/integrated symbolic relief/i),
    ]));
  });

  it('keeps every league wired to bundled heraldry assets', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'league_engine.ts'), 'utf8');

    for (const { icon } of LEAGUE_ASSETS) {
      expect(source).toContain(`imageUri: require("../assets/images/levels/league-v6-icons/${icon}")`);
    }

    expect(source).not.toContain('cardImageUri');
    expect(source).not.toMatch(/require\("\.\.\/assets\/images\/levels\/[^"]*\s[^"]*"\)/);
  });

  it('keeps knowledge relics available as transparent webp assets without detached side bars', async () => {
    for (const { icon } of LEAGUE_ASSETS) {
      const iconPath = path.join(process.cwd(), 'assets', 'images', 'levels', 'league-v6-icons', icon);
      expect(fs.existsSync(iconPath)).toBe(true);

      const metadata = await sharp(iconPath).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(384);
      expect(metadata.height).toBe(384);
      expect(metadata.hasAlpha).toBe(true);

      const bounds = await getAlphaBounds(iconPath);
      expect(bounds.padT).toBeGreaterThanOrEqual(32);
      expect(bounds.padB).toBeGreaterThanOrEqual(32);
      const suspiciousColumns = await getTallDarkSideColumns(iconPath);
      // A single compressed column can be a legitimate dark bevel (Black Diamond).
      // Generated atlas gutters appear as multi-column bands and remain forbidden.
      expect(suspiciousColumns.length).toBeLessThanOrEqual(1);
    }
  });

  it('keeps league visual art bundled in OTA updates', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
    const patterns: string[] = appJson.expo.updates.assetPatternsToBeBundled;

    expect(patterns).toContain('assets/images/levels/league-v6-icons/*.webp');
    expect(patterns).not.toContain('assets/images/levels/league-v6-cards/*.webp');
  });
});

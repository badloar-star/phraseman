import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const LEAGUE_ASSETS = [
  { id: 0, slug: 'med', icon: 'league-icon-med.webp', card: 'league-card-med.webp' },
  { id: 1, slug: 'bronz', icon: 'league-icon-bronz.webp', card: 'league-card-bronz.webp' },
  { id: 2, slug: 'serebro', icon: 'league-icon-serebro.webp', card: 'league-card-serebro.webp' },
  { id: 3, slug: 'zoloto', icon: 'league-icon-zoloto.webp', card: 'league-card-zoloto.webp' },
  { id: 4, slug: 'platina', icon: 'league-icon-platina.webp', card: 'league-card-platina.webp' },
  { id: 5, slug: 'izumrud', icon: 'league-icon-izumrud.webp', card: 'league-card-izumrud.webp' },
  { id: 6, slug: 'sapfir', icon: 'league-icon-sapfir.webp', card: 'league-card-sapfir.webp' },
  { id: 7, slug: 'rubin', icon: 'league-icon-rubin.webp', card: 'league-card-rubin.webp' },
  { id: 8, slug: 'almaz', icon: 'league-icon-almaz.webp', card: 'league-card-almaz.webp' },
  { id: 9, slug: 'cherniy-almaz', icon: 'league-icon-cherniy-almaz.webp', card: 'league-card-cherniy-almaz.webp' },
  { id: 10, slug: 'efir', icon: 'league-icon-efir.webp', card: 'league-card-efir.webp' },
  { id: 11, slug: 'vishaya', icon: 'league-icon-vishaya.webp', card: 'league-card-vishaya.webp' },
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

async function getInnerHorizontalDarkBands(filePath: string): Promise<Array<{ start: number; end: number }>> {
  const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
  const bands: Array<{ start: number; end: number }> = [];
  let current: { start: number; end: number } | null = null;

  for (let y = 0; y < Math.round(info.height * 0.18); y += 1) {
    let dark = 0;
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * (info.channels ?? 3);
      const maxRgb = Math.max(data[offset], data[offset + 1], data[offset + 2]);
      if (maxRgb < 45) dark += 1;
    }

    const darkBandRow = dark / info.width >= 0.55;
    if (darkBandRow && !current) {
      current = { start: y, end: y };
    } else if (darkBandRow && current) {
      current.end = y;
    } else if (!darkBandRow && current) {
      bands.push(current);
      current = null;
    }
  }
  if (current) bands.push(current);

  return bands.filter((band) => band.start > 4 && band.end - band.start + 1 <= Math.round(info.height * 0.14));
}

describe('league visual assets', () => {
  it('keeps every league wired to bundled heraldry and card assets', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'league_engine.ts'), 'utf8');

    for (const { icon, card } of LEAGUE_ASSETS) {
      expect(source).toContain(`imageUri: require("../assets/images/levels/league-v6-icons/${icon}")`);
      expect(source).toContain(`cardImageUri: require("../assets/images/levels/league-v6-cards/${card}")`);
    }

    expect(source).not.toMatch(/require\("\.\.\/assets\/images\/levels\/[^"]*\s[^"]*"\)/);
  });

  it('keeps generated league cards on a stable horizontal canvas', async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets', 'images', 'levels', 'league-v6-cards', 'manifest.json'), 'utf8'));
    const builderSource = fs.readFileSync(path.join(process.cwd(), 'scripts', 'build-league-card-assets.mjs'), 'utf8');

    expect(manifest.output.fit).toBe('native atlas tile crop');
    expect(builderSource).not.toContain('.extend(');
    expect(builderSource).not.toContain('paddedCanvas');
    expect(builderSource).not.toContain('padMode');

    for (const { card } of LEAGUE_ASSETS) {
      const cardPath = path.join(process.cwd(), 'assets', 'images', 'levels', 'league-v6-cards', card);
      expect(fs.existsSync(cardPath)).toBe(true);

      const metadata = await sharp(cardPath).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(768);
      expect(metadata.height).toBe(363);

      const record = manifest.leagues.find((item: any) => item.file === card);
      expect(record?.crop?.width).toBeGreaterThan(0);
      expect(record?.crop?.height).toBeGreaterThan(0);
      await expect(getInnerHorizontalDarkBands(cardPath)).resolves.toEqual([]);
    }
  });

  it('keeps current DALL-E icons available as transparent webp assets', async () => {
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
      await expect(getTallDarkSideColumns(iconPath)).resolves.toEqual([]);
    }
  });

  it('keeps league visual art bundled in OTA updates', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
    const patterns: string[] = appJson.expo.updates.assetPatternsToBeBundled;

    expect(patterns).toContain('assets/images/levels/league-v6-icons/*.webp');
    expect(patterns).toContain('assets/images/levels/league-v6-cards/*.webp');
  });
});

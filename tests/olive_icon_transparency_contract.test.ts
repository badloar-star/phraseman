import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');

const ICON_SOURCES = [
  'app/home_menu_icons.ts',
  'app/home_last_lesson_assets.ts',
  'app/coin_icons.ts',
  'app/flashcards/FlashcardsCategoryHub.tsx',
  'components/EnergyIcon.tsx',
  'constants/generatedThemeIconAssets.ts',
  'constants/socialIconAssets.ts',
  'constants/leagueBonusGiftImages.ts',
  'constants/weeklyCompassIcons.ts',
  'constants/trainerThemeIcons.ts',
  'constants/boonIconAssets.ts',
  'constants/streakIconAssets.ts',
];

function oliveIconFiles(): string[] {
  const files = new Set<string>();
  for (const sourceName of ICON_SOURCES) {
    const sourceFile = path.join(ROOT, sourceName);
    const source = fs.readFileSync(sourceFile, 'utf8');
    for (const match of source.matchAll(/require\('([^']*assets\/[^']*olive[^']*)'\)/gi)) {
      files.add(path.resolve(path.dirname(sourceFile), match[1]));
    }
  }
  return [...files];
}

function peerFile(file: string, theme: 'gold' | 'sagePorcelain' | 'indigo'): string {
  return file
    .replace(/([\\/])olive([\\/])/g, `$1${theme}$2`)
    .replace(/-olive(?=\.|-)/g, `-${theme}`)
    .replace(/olive-chest/g, `${theme}-chest`)
    .replace(/weekly_compass_icons[\\/]olive\.webp$/, `weekly_compass_icons${path.sep}${theme}.webp`);
}

async function alphaGeometry(file: string) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] <= 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return {
    width: (maxX - minX + 1) / info.width,
    height: (maxY - minY + 1) / info.height,
    centerX: (minX + maxX + 1) / (2 * info.width),
    centerY: (minY + maxY + 1) / (2 * info.height),
  };
}

describe('Olive icon transparency', () => {
  it('does not ship opaque square canvases around icon artwork', async () => {
    const offenders: string[] = [];
    for (const file of oliveIconFiles()) {
      const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let transparentEdgePixels = 0;
      let edgePixels = 0;
      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          if (x !== 0 && y !== 0 && x !== info.width - 1 && y !== info.height - 1) continue;
          edgePixels += 1;
          if (data[(y * info.width + x) * 4 + 3] <= 16) transparentEdgePixels += 1;
        }
      }
      if (transparentEdgePixels / edgePixels < 0.9) offenders.push(path.relative(ROOT, file));
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the artwork inside the established per-slot icon geometry', async () => {
    const offenders: string[] = [];
    for (const file of oliveIconFiles()) {
      const relative = path.relative(ROOT, file).replace(/\\/g, '/');
      if (relative.includes('/weekly_boon_icons/') || relative.includes('/currency/') || relative.includes('/energy/')) {
        continue;
      }
      const peers = (['gold', 'sagePorcelain', 'indigo'] as const)
        .map((theme) => peerFile(file, theme))
        .filter((candidate) => fs.existsSync(candidate));
      if (!peers.length) continue;
      const olive = await alphaGeometry(file);
      const peerGeometry = await Promise.all(peers.map(alphaGeometry));
      const median = (values: number[]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
      };
      if (
        Math.abs(olive.width - median(peerGeometry.map((item) => item.width))) > 0.08 ||
        Math.abs(olive.height - median(peerGeometry.map((item) => item.height))) > 0.08 ||
        Math.abs(olive.centerX - median(peerGeometry.map((item) => item.centerX))) > 0.06 ||
        Math.abs(olive.centerY - median(peerGeometry.map((item) => item.centerY))) > 0.06
      ) {
        offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  }, 60_000);
});

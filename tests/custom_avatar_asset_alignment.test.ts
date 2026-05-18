import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const AVATAR_ASSET_DIR = path.join(__dirname, '..', 'assets', 'images', 'avatars');
const CUSTOM_AVATAR_ASSET_RE = /^custom-idea-\d{2}-(black|white)\.webp$/;

type AlphaBounds = {
  width: number;
  height: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const INSET_SAFE_HEX: Array<[number, number]> = [
  [256, 34],
  [462, 142],
  [462, 370],
  [256, 478],
  [50, 370],
  [50, 142],
];

function isPointInPolygon(x: number, y: number, polygon: Array<[number, number]>): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [xi, yi] = polygon[index];
    const [xj, yj] = polygon[previous];
    const crossesY = (yi > y) !== (yj > y);
    const intersectionX = ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (crossesY && x < intersectionX) inside = !inside;
  }
  return inside;
}

async function readAlphaBounds(filePath: string): Promise<AlphaBounds> {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3] ?? 0;
      if (alpha <= 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  return { width: info.width, height: info.height, minX, minY, maxX, maxY };
}

describe('custom avatar assets', () => {
  it('keeps generated badge artwork centered in its transparent canvas', async () => {
    const files = fs
      .readdirSync(AVATAR_ASSET_DIR)
      .filter((file) => CUSTOM_AVATAR_ASSET_RE.test(file))
      .sort();

    expect(files).toHaveLength(60);

    const failures: string[] = [];
    for (const file of files) {
      const bounds = await readAlphaBounds(path.join(AVATAR_ASSET_DIR, file));
      const centerX = (bounds.minX + bounds.maxX + 1) / 2;
      const centerY = (bounds.minY + bounds.maxY + 1) / 2;
      const offsetX = centerX - bounds.width / 2;
      const offsetY = centerY - bounds.height / 2;

      if (Math.abs(offsetX) > 1 || Math.abs(offsetY) > 1) {
        failures.push(`${file}: offset=(${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('keeps generated badge artwork inside the inset hexagon safe area', async () => {
    const files = fs
      .readdirSync(AVATAR_ASSET_DIR)
      .filter((file) => CUSTOM_AVATAR_ASSET_RE.test(file))
      .sort();

    expect(files).toHaveLength(60);

    const failures: string[] = [];
    for (const file of files) {
      const { data, info } = await sharp(path.join(AVATAR_ASSET_DIR, file))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      let outsidePixels = 0;
      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          const alpha = data[(y * info.width + x) * info.channels + 3] ?? 0;
          if (alpha <= 10) continue;
          if (!isPointInPolygon(x, y, INSET_SAFE_HEX)) outsidePixels += 1;
        }
      }

      if (outsidePixels > 0) {
        failures.push(`${file}: outsidePixels=${outsidePixels}`);
      }
    }

    expect(failures).toEqual([]);
  });
});

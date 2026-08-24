import path from 'node:path';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const source = 'C:/Users/badlo/.codex/generated_images/01a01f7f-441b-7432-9590-5bbb3b3f5636/exec-ddf54bdc-a0ac-4391-92cd-841965ede8e5.png';
const root = path.resolve(import.meta.dirname, '..', '..');
const output = path.join(root, 'prototypes', 'avatar-studio', 'assets', 'hair');
const items = ['wave', 'crop', 'bun', 'long-wave', 'curly-bob', 'side-part'];
const tileWidth = 512;
const tileHeight = 512;

await mkdir(output, { recursive: true });
for (let index = 0; index < items.length; index += 1) {
  const { data, info } = await sharp(source)
    .extract({ left: (index % 2) * tileWidth, top: Math.floor(index / 2) * tileHeight, width: tileWidth, height: tileHeight })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let pixel = 0; pixel < data.length; pixel += info.channels) {
    const [red, green, blue] = [data[pixel], data[pixel + 1], data[pixel + 2]];
    const nearNeutral = Math.max(red, green, blue) - Math.min(red, green, blue) < 14;
    if (nearNeutral && (red > 212 || red < 24)) data[pixel + 3] = 0;
  }
  await sharp(data, { raw: info }).png().toFile(path.join(output, `${items[index]}.png`));
}
process.stdout.write(`avatar_visual_mock_hair=${items.length}\n`);

import path from 'node:path';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const source = 'C:/Users/badlo/.codex/generated_images/01a01f7f-441b-7432-9590-5bbb3b3f5636/exec-90e9e0c3-1f5b-4d0f-a53a-db7b5edd0c92.png';
const root = path.resolve(import.meta.dirname, '..', '..');
const output = path.join(root, 'prototypes', 'avatar-studio', 'assets', 'accessories');
const items = ['round-glasses', 'square-glasses', 'hoops', 'pendant', 'brooch', 'backpack'];

await mkdir(output, { recursive: true });
for (let index = 0; index < items.length; index += 1) {
  const { data, info } = await sharp(source)
    .extract({ left: (index % 2) * 627, top: Math.floor(index / 2) * 418, width: 627, height: 418 })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let pixel = 0; pixel < data.length; pixel += info.channels) {
    const [red, green, blue] = [data[pixel], data[pixel + 1], data[pixel + 2]];
    if (Math.max(red, green, blue) - Math.min(red, green, blue) < 14 && red > 212) data[pixel + 3] = 0;
  }
  await sharp(data, { raw: info }).png().toFile(path.join(output, `${items[index]}.png`));
}
process.stdout.write(`avatar_visual_mock_accessories=${items.length}\n`);

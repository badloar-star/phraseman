import path from 'node:path';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const source = 'C:/Users/badlo/.codex/generated_images/01a01f7f-441b-7432-9590-5bbb3b3f5636/exec-929e01e2-b9c0-4647-8df0-91d2874873ec.png';
const root = path.resolve(import.meta.dirname, '..', '..');
const output = path.join(root, 'prototypes', 'avatar-studio', 'assets', 'headwear');
const items = ['cap', 'beanie', 'hood', 'crown', 'wizard-hat', 'beret'];
const tileWidth = 627;
const tileHeight = 418;

await mkdir(output, { recursive: true });
for (let index = 0; index < items.length; index += 1) {
  const left = (index % 2) * tileWidth;
  const top = Math.floor(index / 2) * tileHeight;
  const { data, info } = await sharp(source)
    .extract({ left, top, width: tileWidth, height: tileHeight })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let pixel = 0; pixel < data.length; pixel += info.channels) {
    const red = data[pixel];
    const green = data[pixel + 1];
    const blue = data[pixel + 2];
    const nearNeutral = Math.max(red, green, blue) - Math.min(red, green, blue) < 14;
    if (nearNeutral && red > 212 && green > 212 && blue > 212) data[pixel + 3] = 0;
  }

  const object = await sharp(data, { raw: info }).png().toBuffer();
  await sharp({ create: { width: 640, height: 760, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(object).resize(640, 427, { fit: 'contain' }).png().toBuffer(), top: 0, left: 0 }])
    .png()
    .toFile(path.join(output, `${items[index]}.png`));
}
process.stdout.write(`avatar_visual_mock_headwear=${items.length}\n`);

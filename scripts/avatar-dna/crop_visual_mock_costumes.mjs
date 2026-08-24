import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..', '..');
const assets = path.join(root, 'prototypes', 'avatar-studio', 'assets');
const output = path.join(assets, 'costumes');
const ids = ['hoodie', 'denim', 'student', 'explorer', 'traveler', 'mage', 'archmage', 'alchemist', 'winter', 'scholar'];

await mkdir(output, { recursive: true });
for (const base of ['boy', 'girl']) {
  const source = path.join(assets, `costume-sheet-${base}-v1.png`);
  for (let index = 0; index < ids.length; index += 1) {
    const left = (index % 2) * 512;
    const top = Math.floor(index / 2) * 307;
    const height = index < 8 ? 307 : 308;
    await sharp(source)
      .extract({ left, top, width: 512, height })
      .resize(640, 760, { fit: 'cover', position: 'top' })
      .png()
      .toFile(path.join(output, `${base}-${ids[index]}.png`));
  }
}
process.stdout.write(`avatar_visual_mock_costumes=${ids.length * 2}\n`);

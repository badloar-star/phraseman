import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..', '..');
const source = path.join(root, 'prototypes', 'avatar-studio', 'assets', 'avatar-wardrobe-sheet-v1.png');
const output = path.join(root, 'prototypes', 'avatar-studio', 'assets', 'portraits');

const crops = [
  ['avatar-boy-casual.png', 0, 0, 512, 660],
  ['avatar-girl-casual.png', 512, 0, 512, 660],
  ['avatar-boy-mage.png', 341, 660, 341, 460],
  ['avatar-boy-archmage.png', 682, 660, 342, 460],
  ['avatar-girl-mage.png', 341, 1120, 341, 416],
  ['avatar-girl-archmage.png', 682, 1120, 342, 416],
];

await mkdir(output, { recursive: true });
await Promise.all(crops.map(async ([name, left, top, width, height]) => {
  await sharp(source).extract({ left, top, width, height }).resize(640, 760, { fit: 'cover', position: 'top' }).png().toFile(path.join(output, name));
}));
process.stdout.write(`avatar_visual_mock_portraits=${crops.length}\n`);

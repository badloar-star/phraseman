import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend'];
const divisions = ['iii', 'ii', 'i'];
const inputIndex = process.argv.indexOf('--input');
const outputIndex = process.argv.indexOf('--output');
const contactIndex = process.argv.indexOf('--contact-sheet');

if (inputIndex < 0 || outputIndex < 0 || contactIndex < 0) {
  throw new Error('Usage: node scripts/build_arena_rank_shields.mjs --input <master.png> --output <asset-dir> --contact-sheet <qa.webp>');
}

const input = path.resolve(process.argv[inputIndex + 1]);
const output = path.resolve(process.argv[outputIndex + 1]);
const contactSheet = path.resolve(process.argv[contactIndex + 1]);
const isConnectedChecker = (rgba, pixelIndex) => {
  const offset = pixelIndex * 4;
  const red = rgba[offset];
  const green = rgba[offset + 1];
  const blue = rgba[offset + 2];
  const low = Math.min(red, green, blue);
  const high = Math.max(red, green, blue);
  return low >= 225 && high - low <= 12;
};

async function checkerboardToAlpha(source) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const enqueue = (pixelIndex) => {
    if (visited[pixelIndex] || !isConnectedChecker(data, pixelIndex)) return;
    visited[pixelIndex] = 1;
    queue[tail] = pixelIndex;
    tail += 1;
  };

  for (let x = 0; x < info.width; x += 1) {
    enqueue(x);
    enqueue((info.height - 1) * info.width + x);
  }
  for (let y = 1; y < info.height - 1; y += 1) {
    enqueue(y * info.width);
    enqueue(y * info.width + info.width - 1);
  }

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    const x = pixelIndex % info.width;
    const y = Math.floor(pixelIndex / info.width);
    if (x > 0) enqueue(pixelIndex - 1);
    if (x + 1 < info.width) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - info.width);
    if (y + 1 < info.height) enqueue(pixelIndex + info.width);
  }

  for (let pixelIndex = 0; pixelIndex < total; pixelIndex += 1) {
    if (!visited[pixelIndex]) continue;
    const offset = pixelIndex * 4;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;
  }

  return sharp(data, { raw: info }).png().toBuffer();
}

function keepLargestAlphaComponent(data, info) {
  const total = info.width * info.height;
  const labels = new Int32Array(total);
  const queue = new Int32Array(total);
  let componentId = 0;
  let largestId = 0;
  let largestSize = 0;

  for (let start = 0; start < total; start += 1) {
    if (labels[start] !== 0 || data[start * 4 + 3] <= 8) continue;
    componentId += 1;
    let head = 0;
    let tail = 1;
    let componentSize = 0;
    queue[0] = start;
    labels[start] = componentId;

    while (head < tail) {
      const pixelIndex = queue[head];
      head += 1;
      componentSize += 1;
      const x = pixelIndex % info.width;
      const y = Math.floor(pixelIndex / info.width);
      for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
        for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
          if (deltaX === 0 && deltaY === 0) continue;
          const nextX = x + deltaX;
          const nextY = y + deltaY;
          if (nextX < 0 || nextX >= info.width || nextY < 0 || nextY >= info.height) continue;
          const next = nextY * info.width + nextX;
          if (labels[next] !== 0 || data[next * 4 + 3] <= 8) continue;
          labels[next] = componentId;
          queue[tail] = next;
          tail += 1;
        }
      }
    }

    if (componentSize > largestSize) {
      largestSize = componentSize;
      largestId = componentId;
    }
  }

  for (let pixelIndex = 0; pixelIndex < total; pixelIndex += 1) {
    if (labels[pixelIndex] === largestId) continue;
    const offset = pixelIndex * 4;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;
  }

  return { data, info };
}

const transparentMaster = await checkerboardToAlpha(input);
const meta = await sharp(transparentMaster).metadata();
if (!meta.width || !meta.height) throw new Error('Master sheet has no dimensions');

await fs.mkdir(output, { recursive: true });
await fs.mkdir(path.dirname(contactSheet), { recursive: true });
await fs.writeFile(path.join(path.dirname(contactSheet), 'master-alpha.png'), transparentMaster);

const cellWidth = Math.floor(meta.width / tiers.length);
const cellHeight = Math.floor(meta.height / divisions.length);
const generated = [];

for (let row = 0; row < divisions.length; row += 1) {
  for (let column = 0; column < tiers.length; column += 1) {
    const left = column * cellWidth;
    const top = row * cellHeight;
    const width = cellWidth;
    const height = cellHeight;
    const rendered = await sharp(transparentMaster)
      .extract({ left, top, width, height })
      .ensureAlpha()
      .resize(384, 384, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const cleaned = keepLargestAlphaComponent(rendered.data, rendered.info);
    const tile = await sharp(cleaned.data, { raw: cleaned.info })
      .webp({ quality: 78, alphaQuality: 100, effort: 6 })
      .toBuffer();
    const filename = `${tiers[column]}-${divisions[row]}.webp`;
    const destination = path.join(output, filename);
    await fs.writeFile(destination, tile);
    generated.push(destination);
  }
}

const contactCell = 192;
const layers = await Promise.all(generated.map(async (file, index) => ({
  input: await sharp(file).resize(contactCell, contactCell, { fit: 'contain' }).png().toBuffer(),
  left: (index % tiers.length) * contactCell,
  top: Math.floor(index / tiers.length) * contactCell,
})));

await sharp({
  create: {
    width: tiers.length * contactCell,
    height: divisions.length * contactCell,
    channels: 4,
    background: { r: 14, g: 22, b: 34, alpha: 1 },
  },
}).composite(layers).webp({ quality: 82, effort: 6 }).toFile(contactSheet);

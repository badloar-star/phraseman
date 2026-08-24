import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import backgroundTools from './lib/theme_pearl_background.cjs';

const { connectedLightNeutralBackground } = backgroundTools;

const SIZE = 512;
const OBJECT_SIZE = 420;
const PAD = (SIZE - OBJECT_SIZE) / 2;
const THEMES = {
  indigo: { shadow: '#3A326F', mid: '#8B80E8', highlight: '#E1DCFF', backdrop: '#14131F', label: '#F1EFFF', title: 'Индиго' },
  sagePorcelain: { shadow: '#315F50', mid: '#7FA795', highlight: '#E4EFE8', backdrop: '#DCE1D8', label: '#17201D', title: 'Нефрит' },
  olive: { shadow: '#34431C', mid: '#7F9B45', highlight: '#E3CC88', backdrop: '#050604', label: '#F4ECD8', title: 'Олива' },
  midnight: { shadow: '#25205F', mid: '#6E7FF5', highlight: '#D7C9FF', backdrop: '#010102', label: '#FFFFFF', title: 'Полночь' },
  ember: { shadow: '#7A1D25', mid: '#F58A2A', highlight: '#FFD28F', backdrop: '#010101', label: '#FFFFFF', title: 'Янтарь' },
  aurora: { shadow: '#086B64', mid: '#2EE6A0', highlight: '#B6FFF0', backdrop: '#010201', label: '#FFFFFF', title: 'Сияние' },
  volt: { shadow: '#496B08', mid: '#A8E81E', highlight: '#E8FF96', backdrop: '#010200', label: '#FFFFFF', title: 'Лайм' },
  dark: { shadow: '#06351C', mid: '#2A9D55', highlight: '#A9F2BF', backdrop: '#030604', label: '#F0F7F2', title: 'Форест' },
  gold: { shadow: '#6E4B14', mid: '#D6B35A', highlight: '#F6E3A1', backdrop: '#030303', label: '#F7F1E4', title: 'Золото' },
};

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function mixColor(from, to, amount) {
  return {
    r: from.r * (1 - amount) + to.r * amount,
    g: from.g * (1 - amount) + to.g * amount,
    b: from.b * (1 - amount) + to.b * amount,
  };
}

function paletteColor(palette, luminance) {
  const shadow = hexToRgb(palette.shadow);
  const mid = hexToRgb(palette.mid);
  const highlight = hexToRgb(palette.highlight);
  if (luminance <= 0.52) return mixColor(shadow, mid, luminance / 0.52);
  return mixColor(mid, highlight, (luminance - 0.52) / 0.48);
}

function labelSvg(text, width, color) {
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return Buffer.from(`
    <svg width="${width}" height="48" xmlns="http://www.w3.org/2000/svg">
      <text x="${width / 2}" y="30" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${color}">${escaped}</text>
    </svg>
  `);
}

async function keepLargestAlphaComponent(inputPath) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  const labels = new Uint32Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  const componentSizes = [0];
  let componentId = 0;

  for (let start = 0; start < pixelCount; start += 1) {
    if (labels[start] !== 0 || data[start * 4 + 3] <= 2) continue;
    componentId += 1;
    let head = 0;
    let tail = 0;
    let size = 0;
    queue[tail++] = start;
    labels[start] = componentId;

    while (head < tail) {
      const current = queue[head++];
      const x = current % info.width;
      size += 1;
      const neighbors = [];
      if (x > 0) neighbors.push(current - 1);
      if (x + 1 < info.width) neighbors.push(current + 1);
      if (current >= info.width) neighbors.push(current - info.width);
      if (current + info.width < pixelCount) neighbors.push(current + info.width);

      for (const neighbor of neighbors) {
        if (labels[neighbor] !== 0 || data[neighbor * 4 + 3] <= 2) continue;
        labels[neighbor] = componentId;
        queue[tail++] = neighbor;
      }
    }
    componentSizes[componentId] = size;
  }

  const largestId = componentSizes.reduce(
    (best, size, id) => (size > componentSizes[best] ? id : best),
    0,
  );
  if (largestId === 0) throw new Error('Master image has no visible alpha component');

  for (let index = 0; index < pixelCount; index += 1) {
    if (labels[index] !== largestId) data[index * 4 + 3] = 0;
  }

  return sharp(data, { raw: info }).png().toBuffer();
}

async function removeConnectedLightNeutralBackground(inputPath) {
  const { data, info } = await sharp(inputPath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const background = connectedLightNeutralBackground(data, info.width, info.height, info.channels);
  const rgba = Buffer.alloc(info.width * info.height * 4);

  for (let index = 0; index < info.width * info.height; index += 1) {
    const sourceOffset = index * info.channels;
    const targetOffset = index * 4;
    rgba[targetOffset] = data[sourceOffset];
    rgba[targetOffset + 1] = data[sourceOffset + 1];
    rgba[targetOffset + 2] = data[sourceOffset + 2];
    rgba[targetOffset + 3] = background[index] ? 0 : 255;
  }

  return sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();
}

async function normalizeMaster(inputPath) {
  const metadata = await sharp(inputPath).metadata();
  const stats = metadata.hasAlpha ? await sharp(inputPath).stats() : null;
  const hasTransparentPixels = (stats?.channels[3]?.min ?? 255) < 250;
  const transparentMaster = hasTransparentPixels
    ? inputPath
    : await removeConnectedLightNeutralBackground(inputPath);
  const cleanedMaster = await keepLargestAlphaComponent(transparentMaster);
  return sharp(cleanedMaster)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(OBJECT_SIZE, OBJECT_SIZE, {
      fit: 'contain',
      withoutEnlargement: false,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: PAD,
      bottom: PAD,
      left: PAD,
      right: PAD,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function themedVariant(master, palette) {
  const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pearlReflection = hexToRgb(palette.highlight);

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * 4;
      if (data[offset + 3] === 0) continue;

      const luminance = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
      const dx = (x / info.width - 0.5) / 0.185;
      const dy = (y / info.height - 0.53) / 0.19;
      const pearlMask = Math.max(0, Math.min(1, 1.35 - Math.sqrt(dx * dx + dy * dy)));
      const original = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
      const shellColor = mixColor(paletteColor(palette, luminance / 255), original, 0.14);
      const pearlColor = mixColor(original, pearlReflection, 0.14);
      const color = mixColor(shellColor, pearlColor, pearlMask);

      data[offset] = Math.round(color.r);
      data[offset + 1] = Math.round(color.g);
      data[offset + 2] = Math.round(color.b);
    }
  }

  return sharp(data, { raw: info })
    .png()
    .toBuffer();
}

async function contactSheet(files, outputPath, background, foreground) {
  const columns = 4;
  const cell = 236;
  const rows = Math.ceil(files.length / columns);
  const composites = [];

  for (let index = 0; index < files.length; index += 1) {
    const { filePath, palette } = files[index];
    const left = (index % columns) * cell;
    const top = Math.floor(index / columns) * cell;
    const icon = await sharp(filePath).resize(174, 174, { fit: 'contain' }).png().toBuffer();
    composites.push(
      { input: icon, left: left + 31, top: top + 8 },
      { input: labelSvg(palette.title, cell, foreground), left, top: top + 182 },
    );
  }

  await sharp({
    create: { width: columns * cell, height: rows * cell, channels: 4, background },
  }).composite(composites).png().toFile(outputPath);
}

async function themedContactSheet(files, outputPath) {
  const columns = 4;
  const cell = 236;
  const rows = Math.ceil(files.length / columns);
  const cells = [];

  for (const { filePath, palette } of files) {
    const icon = await sharp(filePath).resize(174, 174, { fit: 'contain' }).png().toBuffer();
    const cellImage = await sharp({
      create: { width: cell, height: cell, channels: 4, background: palette.backdrop },
    }).composite([
      { input: icon, left: 31, top: 8 },
      { input: labelSvg(palette.title, cell, palette.label), left: 0, top: 182 },
    ]).png().toBuffer();
    cells.push(cellImage);
  }

  const composites = cells.map((input, index) => ({
    input,
    left: (index % columns) * cell,
    top: Math.floor(index / columns) * cell,
  }));
  await sharp({
    create: { width: columns * cell, height: rows * cell, channels: 4, background: '#101319' },
  }).composite(composites).png().toFile(outputPath);
}

async function miniaturesSheet(files, outputPath) {
  const sizes = [14, 18, 22, 44];
  const headerHeight = 54;
  const rowHeight = 76;
  const labelWidth = 220;
  const columnWidth = 145;
  const width = labelWidth + sizes.length * columnWidth;
  const composites = [];

  for (let column = 0; column < sizes.length; column += 1) {
    composites.push({
      input: labelSvg(`${sizes[column]}px`, columnWidth, '#6E6258'),
      left: labelWidth + column * columnWidth,
      top: 4,
    });
  }

  for (let row = 0; row < files.length; row += 1) {
    const { filePath, palette } = files[row];
    const top = headerHeight + row * rowHeight;
    composites.push({ input: labelSvg(palette.title, labelWidth, '#21170B'), left: 0, top: top + 14 });
    for (let column = 0; column < sizes.length; column += 1) {
      const size = sizes[column];
      const icon = await sharp(filePath).resize(size, size, { fit: 'contain' }).png().toBuffer();
      const left = labelWidth + column * columnWidth + Math.floor((columnWidth - size) / 2);
      composites.push({ input: icon, left, top: top + Math.floor((rowHeight - size) / 2) });
    }
  }

  await sharp({
    create: {
      width,
      height: headerHeight + files.length * rowHeight,
      channels: 4,
      background: '#F7F1E8',
    },
  }).composite(composites).png().toFile(outputPath);
}

async function main() {
  const input = argument('--input');
  const output = argument('--output');
  if (!input || !output) throw new Error('Usage: --input <master.png> --output <audit-directory>');

  const inputPath = path.resolve(input);
  const outputRoot = path.resolve(output);
  const finalDir = path.join(outputRoot, 'final');
  const qaDir = path.join(outputRoot, 'qa');
  await fs.mkdir(finalDir, { recursive: true });
  await fs.mkdir(qaDir, { recursive: true });

  const master = await normalizeMaster(inputPath);
  const files = [];
  for (const [theme, palette] of Object.entries(THEMES)) {
    const variant = await themedVariant(master, palette);
    const filePath = path.join(finalDir, `pearl_${theme}.webp`);
    await sharp(variant).webp({ quality: 74, alphaQuality: 100, effort: 6 }).toFile(filePath);
    files.push({ theme, filePath, palette });
  }

  await contactSheet(files, path.join(qaDir, 'contact-light.png'), '#F7F1E8', '#21170B');
  await contactSheet(files, path.join(qaDir, 'contact-dark.png'), '#101319', '#F7F1E8');
  await themedContactSheet(files, path.join(qaDir, 'contact-themed.png'));
  await miniaturesSheet(files, path.join(qaDir, 'miniatures.png'));
  process.stdout.write(JSON.stringify({ output: outputRoot, finalFiles: files.length }));
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

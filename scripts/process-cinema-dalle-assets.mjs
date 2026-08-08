import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
// зачем: черновики генерации вынесены из assets/ в asset_sources/ — они не
// нужны в сборке приложения, но остаются в репозитории для регенерации.
const SOURCE_DIR = path.join(ROOT, 'asset_sources/cinema_dalle_sources');
const CINEMA_THEMES = ['midnight', 'ember', 'aurora', 'volt'];

const LEARNING_OBJECT_SUBJECTS = [
  'trainer:phrases',
  'trainer:words',
  'trainer:analytics',
];

const HOME_OBJECT_SUBJECTS = [
  'home:lessons',
  'home:cards',
  'home:daily-tasks',
  'home:league',
  'home:diagnostic-test',
  'home:practice',
  'home:exam',
  'home:shop',
  'home:hero-map',
  'leagueChest',
];

function outPathFor(theme, subject) {
  const [kind, value] = subject.split(':');
  if (kind === 'trainer') {
    return path.join(ROOT, 'assets/images/trainer_theme_icons', theme, `${value}.webp`);
  }
  if (kind === 'shard') {
    return path.join(ROOT, 'assets/images/shards', `${theme}-${value}.webp`);
  }
  if (kind === 'home') {
    return path.join(ROOT, 'assets/images/home_menu', theme, `home-${theme}-${value}.webp`);
  }
  if (subject === 'streak:freeze') {
    return path.join(ROOT, 'assets/images/streak_icons', theme, `streak-freeze-${theme}.webp`);
  }
  if (subject === 'streak:fire') {
    return path.join(ROOT, 'assets/images/streak_icons', theme, `streak-fire-${theme}-100.webp`);
  }
  if (subject === 'leagueChest') {
    return path.join(ROOT, 'assets/images/league_bonus', `${theme}-chest.webp`);
  }
  throw new Error(`No single output path for ${theme}:${subject}`);
}

function outputSizeFor(subject) {
  if (subject.startsWith('streak:')) return 80;
  if (subject === 'leagueChest') return 512;
  if (subject.startsWith('home:')) return 384;
  if (subject.startsWith('trainer:') || subject.startsWith('shard:')) return 256;
  return 260;
}

const SOLID_KEY_COLORS = {
  midnight: [255, 106, 0],
  ember: [0, 229, 255],
  aurora: [255, 0, 51],
  volt: [0, 76, 255],
};

function keyDistanceSq(data, pixelIndex, theme) {
  const key = SOLID_KEY_COLORS[theme];
  if (!key) return Number.POSITIVE_INFINITY;
  const offset = pixelIndex * 4;
  return (data[offset] - key[0]) ** 2
    + (data[offset + 1] - key[1]) ** 2
    + (data[offset + 2] - key[2]) ** 2;
}

async function chromaToAlpha(input, theme) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const isGreenKey = g > 150 && r < 145 && b < 145 && g > r * 1.25 && g > b * 1.25;
    const isMagentaKey = r > 180 && b > 170 && g < 100 && r > g * 1.8 && b > g * 1.8;
    const isSolidKey = keyDistanceSq(data, pixelIndex, theme) < 72 ** 2;
    const isKey = isGreenKey || isMagentaKey || isSolidKey;
    if (isKey) {
      data[i + 3] = 0;
    } else if (isGreenKey && g > r && g > b) {
      data[i + 1] = Math.max(r, b, Math.round(g * 0.82));
    }
  }

  removeBorderBackground(data, info, theme);
  removeTinyAlphaComponents(data, info);

  return sharp(data, { raw: info })
    .png()
    .toBuffer();
}

function isNeutralCheckerBackground(data, pixelIndex) {
  const offset = pixelIndex * 4;
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const a = data[offset + 3];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return a > 0 && max >= 184 && min >= 160 && max - min <= 24;
}

function isSolidEdgeBackground(data, pixelIndex, theme) {
  const offset = pixelIndex * 4;
  if (data[offset + 3] === 0) return true;
  return keyDistanceSq(data, pixelIndex, theme) < 78 ** 2;
}

function removeBorderBackground(data, info, theme) {
  const total = info.width * info.height;
  const visited = new Uint8Array(total);
  const stack = [];

  for (let x = 0; x < info.width; x += 1) {
    stack.push(x, (info.height - 1) * info.width + x);
  }
  for (let y = 0; y < info.height; y += 1) {
    stack.push(y * info.width, y * info.width + info.width - 1);
  }

  while (stack.length > 0) {
    const current = stack.pop();
    if (current == null || visited[current]) continue;
    visited[current] = 1;
    if (!isNeutralCheckerBackground(data, current) && !isSolidEdgeBackground(data, current, theme)) continue;

    data[current * 4 + 3] = 0;
    const x = current % info.width;
    const y = Math.floor(current / info.width);
    const neighbors = [
      x > 0 ? current - 1 : -1,
      x < info.width - 1 ? current + 1 : -1,
      y > 0 ? current - info.width : -1,
      y < info.height - 1 ? current + info.width : -1,
    ];
    for (const next of neighbors) {
      if (next >= 0 && !visited[next]) {
        stack.push(next);
      }
    }
  }
}

function removeTinyAlphaComponents(data, info) {
  const total = info.width * info.height;
  const visited = new Uint8Array(total);
  const stack = new Int32Array(total);
  const component = new Int32Array(total);
  const minArea = 60;

  for (let start = 0; start < total; start += 1) {
    if (visited[start]) continue;
    const alpha = data[start * 4 + 3];
    if (alpha < 10) {
      visited[start] = 1;
      continue;
    }

    let top = 0;
    let count = 0;
    stack[top++] = start;
    visited[start] = 1;

    while (top > 0) {
      const current = stack[--top];
      const offset = current * 4;
      if (data[offset + 3] < 10) continue;
      component[count++] = current;

      const x = current % info.width;
      const y = Math.floor(current / info.width);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < info.width - 1 ? current + 1 : -1,
        y > 0 ? current - info.width : -1,
        y < info.height - 1 ? current + info.width : -1,
      ];

      for (const next of neighbors) {
        if (next < 0 || visited[next]) continue;
        visited[next] = 1;
        if (data[next * 4 + 3] >= 10) {
          stack[top++] = next;
        }
      }
    }

    if (count < minArea) {
      for (let i = 0; i < count; i += 1) {
        data[component[i] * 4 + 3] = 0;
      }
    }
  }
}

async function alphaBounds(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha <= 10) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function safeScaleFor(subject) {
  if (subject.startsWith('home:')) return 0.76;
  if (subject === 'leagueChest') return 0.72;
  if (subject === 'medal') return 0.74;
  if (subject.startsWith('trainer:')) return 0.76;
  return 0.78;
}

function gridBoxFor(index, metadata, grid, theme, subject) {
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  const cellWidth = Math.floor((metadata.width ?? 0) / grid.cols);
  const cellHeight = Math.floor((metadata.height ?? 0) / grid.rows);
  const left = col * cellWidth;
  const top = row * cellHeight;
  const right = col === grid.cols - 1 ? metadata.width ?? left + cellWidth : left + cellWidth;
  const bottom = row === grid.rows - 1 ? metadata.height ?? top + cellHeight : top + cellHeight;
  const inset = 8;

  const box = {
    left: left + inset,
    top: top + inset,
    width: Math.max(1, right - left - inset * 2),
    height: Math.max(1, bottom - top - inset * 2),
  };

  if (theme === 'aurora' && subject === 'theme:at-the-doctor') {
    box.width = Math.round(box.width * 0.64);
  }

  return box;
}

async function writeIconFromBox(sourcePath, box, subject, theme) {
  const cell = await sharp(sourcePath)
    .extract(box)
    .png()
    .toBuffer();
  const transparent = await chromaToAlpha(cell, theme);
  const size = outputSizeFor(subject);
  const bounds = await alphaBounds(transparent);
  if (!bounds) {
    throw new Error(`${path.basename(sourcePath)}:${subject}: no visible pixels after alpha extraction`);
  }
  const trimmed = await sharp(transparent)
    .extract(bounds)
    .png()
    .toBuffer();
  const inner = await sharp(trimmed)
    .resize(Math.round(size * safeScaleFor(subject)), Math.round(size * safeScaleFor(subject)), {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
  const innerMeta = await sharp(inner).metadata();
  const target = outPathFor(theme, subject);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{
      input: inner,
      left: Math.round((size - (innerMeta.width ?? size)) / 2),
      top: Math.round((size - (innerMeta.height ?? size)) / 2),
    }])
    .webp({ quality: 94, alphaQuality: 98, effort: 5 })
    .toFile(target);
}

async function processAtlas(theme, fileName, grid, subjects) {
  if (grid.cols * grid.rows !== subjects.length) {
    throw new Error(`${fileName}: grid has ${grid.cols * grid.rows} cells for ${subjects.length} subjects`);
  }

  const sourcePath = path.join(SOURCE_DIR, fileName);
  const metadata = await sharp(sourcePath).metadata();
  for (let i = 0; i < subjects.length; i += 1) {
    await writeIconFromBox(sourcePath, gridBoxFor(i, metadata, grid, theme, subjects[i]), subjects[i], theme);
  }
}

async function main() {
  for (const theme of CINEMA_THEMES) {
    await processAtlas(theme, `${theme}-solidkey-learning-v3-dalle.png`, { cols: 4, rows: 3 }, LEARNING_OBJECT_SUBJECTS);
    await processAtlas(theme, `${theme}-solidkey-home-v3-dalle.png`, { cols: 4, rows: 3 }, HOME_OBJECT_SUBJECTS);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

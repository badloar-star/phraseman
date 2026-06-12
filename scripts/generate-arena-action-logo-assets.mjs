import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'qa-artifacts', 'arena-action-dalle-sources');
const OUT_DIR = path.join(ROOT, 'assets', 'images', 'arena_actions');
const QA_DIR = path.join(ROOT, 'qa-artifacts');
const SIZE = 160;
const PREVIEW_CELL = 142;

const SOURCES = {
  match: path.join(SOURCE_DIR, 'match-source.png'),
  friend: path.join(SOURCE_DIR, 'friend-source.png'),
  throne: path.join(SOURCE_DIR, 'throne-source.png'),
};

const THEMES = {
  dark: {
    suffix: 'dark',
    label: 'dark',
    palette: null,
  },
  neon: {
    suffix: 'neon',
    label: 'neon',
    palette: [
      [0, [20, 4, 60]],
      [0.38, [18, 226, 255]],
      [0.7, [255, 56, 226]],
      [1, [241, 255, 72]],
    ],
  },
  gold: {
    suffix: 'gold',
    label: 'gold',
    palette: [
      [0, [66, 35, 5]],
      [0.42, [207, 130, 25]],
      [0.76, [250, 204, 91]],
      [1, [255, 246, 198]],
    ],
  },
  coral: {
    suffix: 'coral',
    label: 'coral',
    palette: [
      [0, [83, 15, 33]],
      [0.42, [216, 43, 67]],
      [0.76, [255, 102, 82]],
      [1, [255, 218, 142]],
    ],
  },
  minimalDark: {
    suffix: 'minimalDark',
    label: 'minimal dark',
    palette: [
      [0, [18, 22, 30]],
      [0.5, [83, 103, 132]],
      [1, [204, 221, 239]],
    ],
  },
};

function backgroundCandidate(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max > 223 && max - min < 24;
}

function lightNeutral(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max > 205 && max - min < 34;
}

function removeDalleCheckerboard({ data, info }) {
  const width = info.width;
  const height = info.height;
  const out = Buffer.from(data);
  const visited = new Uint8Array(width * height);
  const queue = [];

  function enqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    const i = p * 4;
    if (!backgroundCandidate(out[i], out[i + 1], out[i + 2])) return;
    visited[p] = 1;
    queue.push(p);
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const p = queue[head];
    const x = p % width;
    const y = Math.floor(p / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let p = 0; p < visited.length; p += 1) {
    if (visited[p]) out[p * 4 + 3] = 0;
  }

  for (let pass = 0; pass < 5; pass += 1) {
    const remove = [];
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const p = y * width + x;
        const i = p * 4;
        if (out[i + 3] === 0 || !lightNeutral(out[i], out[i + 1], out[i + 2])) continue;
        const transparentNeighbor =
          out[(p - 1) * 4 + 3] === 0 ||
          out[(p + 1) * 4 + 3] === 0 ||
          out[(p - width) * 4 + 3] === 0 ||
          out[(p + width) * 4 + 3] === 0;
        if (transparentNeighbor) remove.push(i + 3);
      }
    }
    for (const alphaIndex of remove) out[alphaIndex] = 0;
  }

  return { data: out, width, height };
}

function alphaBounds(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha <= 14) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0) {
    throw new Error('No visible pixels after DALL-E checkerboard removal.');
  }

  const pad = Math.ceil(Math.max(maxX - minX, maxY - minY) * 0.055);
  return {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(width, maxX + pad + 1) - Math.max(0, minX - pad),
    height: Math.min(height, maxY + pad + 1) - Math.max(0, minY - pad),
  };
}

async function prepareSource(sourcePath) {
  const raw = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cleaned = removeDalleCheckerboard(raw);
  const bounds = alphaBounds(cleaned.data, cleaned.width, cleaned.height);

  return sharp(cleaned.data, {
    raw: {
      width: cleaned.width,
      height: cleaned.height,
      channels: 4,
    },
  })
    .extract(bounds)
    .resize(SIZE, SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function paletteColor(stops, luma) {
  for (let i = 0; i < stops.length - 1; i += 1) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (luma < p0 || luma > p1) continue;
    const t = (luma - p0) / Math.max(0.001, p1 - p0);
    return [
      mix(c0[0], c1[0], t),
      mix(c0[1], c1[1], t),
      mix(c0[2], c1[2], t),
    ];
  }
  return stops[stops.length - 1][1];
}

async function themeIcon(baseBuffer, theme) {
  if (!theme.palette) {
    return sharp(baseBuffer)
      .ensureAlpha()
      .modulate({ brightness: 1.04, saturation: 1.08 })
      .webp({ quality: 96, effort: 6, lossless: true })
      .toBuffer();
  }

  const { data, info } = await sharp(baseBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);

  for (let i = 0; i < out.length; i += 4) {
    const alpha = out[i + 3];
    if (alpha < 4) {
      out[i + 3] = 0;
      continue;
    }

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = Math.pow((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, 0.82);
    const [pr, pg, pb] = paletteColor(theme.palette, luma);
    const contrast = 0.88 + luma * 0.28;

    out[i] = clampByte(pr * contrast);
    out[i + 1] = clampByte(pg * contrast);
    out[i + 2] = clampByte(pb * contrast);
  }

  return sharp(out, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .webp({ quality: 96, effort: 6, lossless: true })
    .toBuffer();
}

async function writePreview(iconBuffers) {
  const pad = 14;
  const rows = Object.keys(THEMES);
  const cols = Object.keys(SOURCES);
  const previewW = pad * 2 + PREVIEW_CELL * cols.length;
  const previewH = pad * 2 + PREVIEW_CELL * rows.length;
  const composites = [];

  for (const [row, themeName] of rows.entries()) {
    for (const [col, action] of cols.entries()) {
      composites.push({
        input: await sharp(iconBuffers[themeName][action]).resize(108, 108, { fit: 'contain' }).png().toBuffer(),
        left: pad + col * PREVIEW_CELL + 17,
        top: pad + row * PREVIEW_CELL + 16,
      });
    }
  }

  const labelSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${previewW}" height="${previewH}">
      <style>
        text { font-family: Arial, sans-serif; font-size: 12px; fill: #C8D0DB; font-weight: 700; }
      </style>
      ${rows.map((themeName, row) => `<text x="10" y="${pad + row * PREVIEW_CELL + 134}">${THEMES[themeName].label}</text>`).join('')}
      ${cols.map((action, col) => `<text x="${pad + col * PREVIEW_CELL + 48}" y="13">${action}</text>`).join('')}
    </svg>
  `);

  await sharp({
    create: {
      width: previewW,
      height: previewH,
      channels: 4,
      background: '#090B10',
    },
  })
    .composite([...composites, { input: labelSvg, left: 0, top: 0 }])
    .png()
    .toFile(path.join(QA_DIR, 'arena-action-logo-icons-preview.png'));
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(QA_DIR, { recursive: true });

  const prepared = {};
  for (const [action, sourcePath] of Object.entries(SOURCES)) {
    await fs.access(sourcePath);
    prepared[action] = await prepareSource(sourcePath);
  }

  const iconBuffers = {};
  for (const [themeName, theme] of Object.entries(THEMES)) {
    iconBuffers[themeName] = {};
    for (const action of Object.keys(SOURCES)) {
      const icon = await themeIcon(prepared[action], theme);
      iconBuffers[themeName][action] = icon;
      await fs.writeFile(
        path.join(OUT_DIR, `arena-action-${action}-${theme.suffix}.webp`),
        icon,
      );
    }
  }

  await writePreview(iconBuffers);
}

await main();

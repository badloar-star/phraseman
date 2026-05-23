import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'assets', 'images', 'levels', 'generated-v5-dalle');
const QA_DIR = path.join(ROOT, 'qa-artifacts');
const CANVAS_SIZE = 512;

// Same six-point avatar badge silhouette used by components/CustomAvatarBadge.tsx.
const CUSTOM_AVATAR_HEX_VIEWBOX_POINTS = '50,3.5 93,26 93,74 50,96.5 7,74 7,26';
const HEX_POINTS = [
  [256, 18],
  [476, 133],
  [476, 379],
  [256, 494],
  [36, 379],
  [36, 133],
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function hex(value) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0').toUpperCase();
}

function rgb({ r, g, b }) {
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function mix(a, b, amount) {
  return {
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  };
}

function colorForLevel(level) {
  const t = (level - 1) / 59;
  const base = {
    r: 232 + 21 * t,
    g: 245 - 208 * t,
    b: 242 - 213 * t,
  };
  const white = { r: 255, g: 255, b: 255 };
  const graphite = { r: 32, g: 36, b: 42 };
  const deepRed = { r: 72, g: 10, b: 14 };

  return {
    base: rgb(base),
    top: rgb(mix(base, white, 0.38)),
    mid: rgb(mix(base, graphite, 0.08)),
    bottom: rgb(mix(base, t > 0.68 ? deepRed : graphite, 0.34)),
    edge: rgb(mix(base, graphite, 0.48)),
    rim: rgb(mix(base, white, 0.66)),
    rimDark: rgb(mix(base, graphite, 0.42)),
    shine: rgb(mix(base, white, 0.56)),
  };
}

function pointsToString(points) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

function svgForLevel(level) {
  const colors = colorForLevel(level);
  const points = pointsToString(HEX_POINTS);
  const oneDigit = level < 10;
  const fontSize = oneDigit ? 190 : 150;
  const textY = oneDigit ? 326 : 314;
  const strokeWidth = oneDigit ? 18 : 14;

  return `
<svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="hexClip">
      <polygon points="${points}"/>
    </clipPath>
    <linearGradient id="body" x1="256" y1="18" x2="256" y2="494" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${colors.top}"/>
      <stop offset="0.52" stop-color="${colors.mid}"/>
      <stop offset="1" stop-color="${colors.bottom}"/>
    </linearGradient>
    <linearGradient id="rim" x1="90" y1="54" x2="422" y2="470" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.32" stop-color="${colors.rim}"/>
      <stop offset="0.72" stop-color="${colors.rimDark}"/>
      <stop offset="1" stop-color="#FFFFFF"/>
    </linearGradient>
    <linearGradient id="numberFill" x1="0" y1="158" x2="0" y2="346" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.58" stop-color="#F9FDFF"/>
      <stop offset="1" stop-color="#DCEBFF"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#hexClip)">
    <polygon points="${points}" fill="url(#body)"/>
    <polygon points="${points}" fill="none" stroke="${colors.edge}" stroke-width="30" opacity="0.42"/>
    <polygon points="${points}" fill="none" stroke="url(#rim)" stroke-width="18" opacity="0.98"/>
    <polygon points="${points}" fill="none" stroke="#FFFFFF" stroke-width="6" opacity="0.34"/>
    <path d="M78 138 L256 45 L434 138" fill="none" stroke="#FFFFFF" stroke-width="5" opacity="0.18"/>
    <ellipse cx="188" cy="96" rx="178" ry="35" fill="#FFFFFF" opacity="0.16" transform="rotate(-16 188 96)"/>
    <text x="256" y="${textY}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="0" fill="url(#numberFill)" stroke="${colors.edge}" stroke-width="${strokeWidth}" paint-order="stroke fill">${level}</text>
    <text x="256" y="${textY - 4}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="0" fill="#FFFFFF" opacity="0.92">${level}</text>
  </g>
</svg>`;
}

async function writeLevel(level) {
  const svg = Buffer.from(svgForLevel(level));
  const outPath = path.join(OUTPUT_DIR, `${level}.webp`);
  await sharp(svg)
    .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: 'contain' })
    .webp({ quality: 94, effort: 0, smartSubsample: true })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  return {
    level,
    file: path.relative(ROOT, outPath).replace(/\\/g, '/'),
    width: meta.width,
    height: meta.height,
    hasAlpha: Boolean(meta.hasAlpha),
    bytes: (await fs.stat(outPath)).size,
  };
}

async function makeContactSheet({ name, cellSize, columns, levels }) {
  const labelHeight = Math.max(18, Math.round(cellSize * 0.34));
  const gap = Math.max(6, Math.round(cellSize * 0.15));
  const rows = Math.ceil(levels.length / columns);
  const width = columns * cellSize + (columns + 1) * gap;
  const height = rows * (cellSize + labelHeight + gap) + gap;
  const composites = [
    {
      input: Buffer.from(
        `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#07101D"/></svg>`,
      ),
      left: 0,
      top: 0,
    },
  ];

  for (let index = 0; index < levels.length; index += 1) {
    const level = levels[index];
    const row = Math.floor(index / columns);
    const column = index % columns;
    const left = gap + column * (cellSize + gap);
    const top = gap + row * (cellSize + labelHeight + gap);
    const labelTop = top + cellSize + Math.round(gap * 0.18);
    composites.push({
      input: await sharp(path.join(OUTPUT_DIR, `${level}.webp`))
        .resize(cellSize, cellSize, { fit: 'contain' })
        .png()
        .toBuffer(),
      left,
      top,
    });
    composites.push({
      input: Buffer.from(
        `<svg width="${cellSize}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${cellSize}" height="${labelHeight}" rx="4" fill="#101B2C"/>
          <text x="${cellSize / 2}" y="${Math.round(labelHeight * 0.68)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(10, Math.round(labelHeight * 0.48))}" font-weight="700" fill="#E8F1FF">${level}</text>
        </svg>`,
      ),
      left,
      top: labelTop,
    });
  }

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#07101D',
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(QA_DIR, name));
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(QA_DIR, { recursive: true });

  const levels = [];
  for (let level = 1; level <= 60; level += 1) {
    levels.push(await writeLevel(level));
  }

  const manifest = {
    version: 'generated-v6-custom-avatar-hex',
    generatedAt: new Date().toISOString(),
    intent: 'Level avatar hexes regenerated as the paid custom avatar card hex underlay only: no icon/logo, transparent corners, one centered number, and a smooth 60-step light-to-red progression.',
    finalCanvasSize: CANVAS_SIZE,
    referenceComponent: 'components/CustomAvatarBadge.tsx',
    referenceViewBoxPoints: CUSTOM_AVATAR_HEX_VIEWBOX_POINTS,
    referenceCanvasPoints: pointsToString(HEX_POINTS),
    levels,
  };

  await fs.writeFile(path.join(OUTPUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await makeContactSheet({
    name: 'level-avatars-generated-v5-dalle-44px.png',
    cellSize: 44,
    columns: 10,
    levels: Array.from({ length: 60 }, (_, index) => index + 1),
  });
  await makeContactSheet({
    name: 'level-avatars-generated-v5-dalle-96px.png',
    cellSize: 96,
    columns: 10,
    levels: Array.from({ length: 60 }, (_, index) => index + 1),
  });
  await makeContactSheet({
    name: 'level-avatars-generated-v5-dalle-milestones.png',
    cellSize: 128,
    columns: 6,
    levels: [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60],
  });
  console.log(`Generated ${levels.length} level avatars in ${path.relative(ROOT, OUTPUT_DIR)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

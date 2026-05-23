import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const QA_DIR = path.join(ROOT, 'qa-artifacts');
const CANDIDATES_PATH = path.join(QA_DIR, 'recent-generated-quizzes-candidates.json');
const DALLE_CARD_SOURCES_PATH = path.join(QA_DIR, 'quiz-level-dalle-card-sources.json');
const DALLE_LOGO_SOURCES_PATH = path.join(QA_DIR, 'quiz-level-dalle-logo-sources.json');
const OUT_ROOT = path.join(ROOT, 'assets', 'images', 'quizzes');
const CARD_DIR = path.join(OUT_ROOT, 'level_cards');
const LOGO_DIR = path.join(OUT_ROOT, 'level_logos');
const CARD_W = 640;
const CARD_H = 236;
const LOGO_SIZE = 260;

const THEMES = {
  dark: {
    file: 'dark',
    label: 'Dark archive',
    source: 'dark',
    bg: ['#071510', '#020807'],
    veil: '#020B08',
    ink: '#E9FFF3',
    accent: '#5EEA91',
    accent2: '#0E7A52',
    foil: '#D8C06C',
  },
  neon: {
    file: 'neon',
    label: 'Neon circuit',
    source: 'neon',
    bg: ['#09051B', '#010411'],
    veil: '#02030B',
    ink: '#E8FBFF',
    accent: '#00F5FF',
    accent2: '#BFFF00',
    foil: '#FF2BD6',
  },
  gold: {
    file: 'gold',
    label: 'Golden sanctum',
    source: 'gold',
    bg: ['#241706', '#050302'],
    veil: '#110A03',
    ink: '#FFF6D7',
    accent: '#F4C96B',
    accent2: '#A56B22',
    foil: '#FFF0A8',
  },
  coral: {
    file: 'coral',
    label: 'Coral forge',
    source: 'coral',
    bg: ['#2A0B14', '#090305'],
    veil: '#18060A',
    ink: '#FFF1EC',
    accent: '#FF6B74',
    accent2: '#FFB16A',
    foil: '#FFD7A0',
  },
  minimalLight: {
    file: 'minimal-light',
    label: 'Ivory sketch',
    source: 'minimalLight',
    bg: ['#F5ECDD', '#D7C2A6'],
    veil: '#F7EFDF',
    ink: '#3F3426',
    accent: '#8B6A3C',
    accent2: '#B99A63',
    foil: '#FFFFFF',
  },
  minimalDark: {
    file: 'minimal-dark',
    label: 'Graphite study',
    source: 'minimalDark',
    bg: ['#202329', '#080A0D'],
    veil: '#111318',
    ink: '#EFF4F7',
    accent: '#9DB4CE',
    accent2: '#5B708A',
    foil: '#E7EEF6',
  },
};

const LEVELS = {
  easy: {
    label: 'Easy',
    cefr: 'A1-A2',
    cardAccent: '#45D483',
    cardAccent2: '#39BDF8',
    emblemAccent: '#71F2A0',
    emblemAccent2: '#52C7FF',
    glow: '#25D36D',
    motif: 'leaf_gate',
  },
  medium: {
    label: 'Medium',
    cefr: 'B1-B2',
    cardAccent: '#FF7A58',
    cardAccent2: '#F7C464',
    emblemAccent: '#FF684E',
    emblemAccent2: '#FFC86D',
    glow: '#FF503D',
    motif: 'ember_dialogue',
  },
  hard: {
    label: 'Hard',
    cefr: 'C1-C2',
    cardAccent: '#A78BFA',
    cardAccent2: '#55D6FF',
    emblemAccent: '#9C7CFF',
    emblemAccent2: '#65DFFF',
    glow: '#8B5CF6',
    motif: 'crystal_crown',
  },
};

function esc(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[char]));
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

async function readCandidates() {
  try {
    const raw = await fs.readFile(CANDIDATES_PATH, 'utf8');
    const rows = JSON.parse(raw);
    return Object.fromEntries(rows.map(row => [row.theme, row.source]));
  } catch {
    return {};
  }
}

async function readDalleLogoSources() {
  try {
    const raw = await fs.readFile(DALLE_LOGO_SOURCES_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function readDalleCardSources() {
  try {
    const raw = await fs.readFile(DALLE_CARD_SOURCES_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function fallbackCardSvg(theme, level) {
  return Buffer.from(`
<svg width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${esc(theme.bg[0])}"/>
      <stop offset="1" stop-color="${esc(theme.bg[1])}"/>
    </linearGradient>
  </defs>
  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#bg)"/>
  <circle cx="510" cy="68" r="170" fill="${esc(rgba(level.cardAccent, 0.16))}"/>
  <circle cx="430" cy="210" r="150" fill="${esc(rgba(level.cardAccent2, 0.12))}"/>
</svg>`);
}

function themePatternSvg(themeKey, theme, level) {
  const a = esc(rgba(level.cardAccent, 0.5));
  const b = esc(rgba(level.cardAccent2, 0.42));
  const f = esc(rgba(theme.foil, 0.26));

  switch (themeKey) {
    case 'neon':
      return `
        <path d="M392 24h86v36h72M430 205h74v-42h82M388 116h64v-30h50" stroke="${a}" stroke-width="2.4" fill="none"/>
        <g fill="${b}"><circle cx="478" cy="60" r="5"/><circle cx="504" cy="163" r="5"/><circle cx="452" cy="86" r="4"/></g>`;
    case 'gold':
      return `
        <circle cx="506" cy="117" r="82" stroke="${f}" stroke-width="2" fill="none"/>
        <circle cx="506" cy="117" r="48" stroke="${a}" stroke-width="2" fill="none"/>
        <path d="M506 26v182M414 117h184M441 52l130 130M571 52 441 182" stroke="${b}" stroke-width="1.4" opacity=".72"/>`;
    case 'coral':
      return `
        <path d="M411 192c42-82 28-117 94-166 68 51 47 96 94 166" stroke="${a}" stroke-width="2.6" fill="none"/>
        <path d="M430 124c40-30 108-30 148 0M453 158c30-19 72-19 102 0" stroke="${b}" stroke-width="2.1" fill="none"/>`;
    case 'minimalLight':
      return `
        <path d="M382 38c60 22 122 14 196-6M380 80c67 17 132 12 206-9M388 174c62-17 122-14 188 8" stroke="${a}" stroke-width="1.3" fill="none"/>
        <path d="M420 32l145 168M560 32L415 206" stroke="${f}" stroke-width="1.1" fill="none"/>`;
    case 'minimalDark':
      return `
        <path d="M388 34h182v150H388zM388 86h182M388 138h182M448 34v150M510 34v150" stroke="${a}" stroke-width="1.4" fill="none"/>
        <circle cx="510" cy="112" r="58" stroke="${b}" stroke-width="1.8" fill="none"/>`;
    case 'dark':
    default:
      return `
        <path d="M428 42c38 48 38 100 0 148M518 42c-38 48-38 100 0 148M382 116h184" stroke="${a}" stroke-width="2" fill="none"/>
        <circle cx="474" cy="116" r="70" stroke="${f}" stroke-width="1.5" fill="none"/>`;
  }
}

function cardOverlaySvg(themeKey, theme, levelKey, level) {
  return Buffer.from(`
<svg width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="textVeil" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${esc(theme.veil)}" stop-opacity=".94"/>
      <stop offset=".50" stop-color="${esc(theme.veil)}" stop-opacity=".74"/>
      <stop offset=".72" stop-color="${esc(theme.veil)}" stop-opacity=".22"/>
      <stop offset="1" stop-color="${esc(theme.veil)}" stop-opacity=".02"/>
    </linearGradient>
    <radialGradient id="orb" cx=".77" cy=".44" r=".56">
      <stop offset="0" stop-color="${esc(level.cardAccent2)}" stop-opacity=".28"/>
      <stop offset=".48" stop-color="${esc(level.cardAccent)}" stop-opacity=".13"/>
      <stop offset="1" stop-color="${esc(level.cardAccent)}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${CARD_W}" height="${CARD_H}" fill="${esc(theme.bg[1])}" opacity=".44"/>
  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#textVeil)"/>
  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#orb)"/>
</svg>`);
}

function logoPatternSvg(themeKey, theme, level) {
  const a = esc(rgba(theme.accent, 0.58));
  const b = esc(rgba(theme.foil, 0.5));
  switch (themeKey) {
    case 'neon':
      return `<path d="M42 130h42l16-32h58l18 32h40M130 42v48M130 170v48" stroke="${a}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
    case 'gold':
      return `<circle cx="130" cy="130" r="88" stroke="${b}" stroke-width="4" fill="none"/><path d="M130 42v176M42 130h176M68 68l124 124M192 68 68 192" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'coral':
      return `<path d="M66 201c30-68 26-112 64-154 40 42 36 86 66 154" stroke="${a}" stroke-width="5" fill="none"/><path d="M70 95c28-18 92-18 120 0M62 157c35 22 100 22 136 0" stroke="${b}" stroke-width="4" fill="none"/>`;
    case 'minimalLight':
      return `<path d="M50 78c50-22 110-24 160-4M44 130c54-14 118-14 172 0M50 184c50 20 108 22 160 4" stroke="${a}" stroke-width="3" fill="none"/>`;
    case 'minimalDark':
      return `<path d="M54 54h152v152H54zM54 104h152M54 156h152M104 54v152M156 54v152" stroke="${a}" stroke-width="3" fill="none"/>`;
    case 'dark':
    default:
      return `<circle cx="130" cy="130" r="91" stroke="${a}" stroke-width="4" fill="none"/><path d="M75 65c34 36 34 94 0 130M185 65c-34 36-34 94 0 130" stroke="${b}" stroke-width="4" fill="none"/>`;
  }
}

function motifSvg(levelKey, theme, level) {
  const a = esc(level.emblemAccent);
  const b = esc(level.emblemAccent2);
  const foil = esc(theme.foil);
  const darkStroke = esc(theme.bg[1]);

  if (levelKey === 'easy') {
    return `
      <path d="M130 34 198 62v62c0 49-30 86-68 105-38-19-68-56-68-105V62Z" fill="url(#body)" stroke="${foil}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M130 53 181 74v47c0 35-20 62-51 79-31-17-51-44-51-79V74Z" fill="${esc(rgba(theme.bg[0], 0.52))}" stroke="${a}" stroke-width="4"/>
      <path d="M86 146c54-82 99-70 96-6-44 16-75 11-96 6Z" fill="url(#leaf)" stroke="${foil}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M95 145c34-15 61-38 82-70" stroke="${darkStroke}" stroke-width="7" stroke-linecap="round" opacity=".62"/>
      <path d="M96 144c34-15 61-38 82-70" stroke="${b}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="130" cy="122" r="73" fill="none" stroke="${esc(rgba(foil, 0.45))}" stroke-width="3"/>`;
  }

  if (levelKey === 'medium') {
    return `
      <path d="M126 31c-11 43 26 55-20 94-32 28-31 74 24 98 62-25 68-72 38-112-16-22-18-45-7-73-26 14-34 37-35 66-19-20-20-44 0-73Z" fill="url(#body)" stroke="${foil}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M128 77c-6 32 19 39-12 67-19 17-17 45 13 60 39-17 45-47 23-73-9-12-10-27-3-43-18 9-24 25-24 43-10-12-12-30 3-54Z" fill="url(#leaf)" stroke="${darkStroke}" stroke-width="4" opacity=".72"/>
      <path d="M72 126h81c16 0 29 11 29 25s-13 25-29 25h-30l-28 24 6-24H72c-16 0-29-11-29-25s13-25 29-25Z" fill="${esc(rgba(theme.bg[1], 0.72))}" stroke="${b}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M80 151h70M80 166h44" stroke="${foil}" stroke-width="6" stroke-linecap="round"/>`;
  }

  return `
    <path d="M54 170 75 88l38 47 17-91 17 91 38-47 21 82-22 44H76Z" fill="url(#body)" stroke="${foil}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M130 47 154 128 130 202 106 128Z" fill="url(#leaf)" stroke="${b}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M83 166h94M76 188h108" stroke="${darkStroke}" stroke-width="9" stroke-linecap="round" opacity=".38"/>
    <path d="M83 166h94M76 188h108" stroke="${foil}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="130" cy="130" r="30" fill="${esc(rgba(theme.bg[1], 0.52))}" stroke="${a}" stroke-width="5"/>
    <path d="M130 105v50M105 130h50" stroke="${b}" stroke-width="6" stroke-linecap="round"/>`;
}

function logoSvg(themeKey, theme, levelKey, level) {
  return Buffer.from(`
<svg width="${LOGO_SIZE}" height="${LOGO_SIZE}" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="halo" cx=".50" cy=".46" r=".56">
      <stop offset="0" stop-color="${esc(level.glow)}" stop-opacity=".55"/>
      <stop offset=".55" stop-color="${esc(level.glow)}" stop-opacity=".16"/>
      <stop offset="1" stop-color="${esc(level.glow)}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${esc(theme.foil)}"/>
      <stop offset=".32" stop-color="${esc(level.emblemAccent2)}"/>
      <stop offset=".70" stop-color="${esc(level.emblemAccent)}"/>
      <stop offset="1" stop-color="${esc(theme.accent2)}"/>
    </linearGradient>
    <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity=".95"/>
      <stop offset=".48" stop-color="${esc(level.emblemAccent2)}"/>
      <stop offset="1" stop-color="${esc(level.emblemAccent)}"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#000000" flood-opacity=".42"/>
      <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${esc(level.glow)}" flood-opacity=".50"/>
    </filter>
  </defs>
  <circle cx="130" cy="130" r="122" fill="url(#halo)"/>
  ${logoPatternSvg(themeKey, theme, level)}
  <g filter="url(#shadow)">
    ${motifSvg(levelKey, theme, level)}
  </g>
  <path d="M54 61c34-20 115-26 154 28" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity=".32"/>
</svg>`);
}

async function buildDalleCard(sourcePath, column) {
  await fs.access(sourcePath);
  const meta = await sharp(sourcePath).metadata();
  const sheetW = meta.width ?? 0;
  const sheetH = meta.height ?? 0;
  if (sheetW < 300 || sheetH < 300) throw new Error(`Unexpected DALL-E card sheet size: ${sourcePath}`);

  const left = Math.floor((sheetW * column) / 3);
  const right = Math.floor((sheetW * (column + 1)) / 3);

  return sharp(sourcePath)
    .extract({ left, top: 0, width: right - left, height: sheetH })
    .resize(CARD_W, CARD_H, { fit: 'cover', position: 'attention' })
    .png()
    .toBuffer();
}

async function buildCard(themeKey, theme, levelKey, level, candidateSources, dalleCardSources) {
  const target = path.join(CARD_DIR, `quiz-card-${levelKey}-${theme.file}.webp`);
  const dalleSourcePath = dalleCardSources[themeKey];
  const candidateSourcePath = candidateSources[theme.source];
  const column = Object.keys(LEVELS).indexOf(levelKey);
  let base;
  let source = null;

  if (dalleSourcePath && column >= 0) {
    try {
      base = await buildDalleCard(dalleSourcePath, column);
      source = dalleSourcePath;
    } catch (error) {
      console.warn(`Falling back from DALL-E card for ${themeKey}/${levelKey}: ${error.message}`);
    }
  }

  if (!base) {
    try {
      await fs.access(candidateSourcePath);
      base = await sharp(candidateSourcePath)
        .resize(CARD_W, CARD_H, { fit: 'cover', position: 'attention' })
        .modulate({ brightness: themeKey === 'minimalLight' ? 1.04 : 0.78, saturation: themeKey === 'minimalDark' ? 0.68 : 0.94 })
        .blur(themeKey === 'minimalLight' ? 0.6 : 0.35)
        .png()
        .toBuffer();
      source = candidateSourcePath;
    } catch {
      base = await sharp(fallbackCardSvg(theme, level)).png().toBuffer();
    }
  }

  await sharp(base)
    .composite([{ input: cardOverlaySvg(themeKey, theme, levelKey, level), left: 0, top: 0 }])
    .webp({ quality: 91, effort: 5 })
    .toFile(target);

  return { target, source };
}

function readCornerKey(data, width, height) {
  const points = [
    0,
    (width - 1) * 4,
    ((height - 1) * width) * 4,
    (((height - 1) * width) + width - 1) * 4,
  ];
  const sum = points.reduce((acc, idx) => {
    acc[0] += data[idx];
    acc[1] += data[idx + 1];
    acc[2] += data[idx + 2];
    return acc;
  }, [0, 0, 0]);
  return sum.map(value => Math.round(value / points.length));
}

function removeChromaKey({ data, info }) {
  const out = Buffer.from(data);
  const [keyR, keyG, keyB] = readCornerKey(out, info.width, info.height);
  const greenKey = keyG > 180 && keyR < 80 && keyB < 80;
  const magentaKey = keyR > 180 && keyB > 180 && keyG < 100;

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const distance = Math.sqrt(((r - keyR) * (r - keyR)) + ((g - keyG) * (g - keyG)) + ((b - keyB) * (b - keyB)));

    if (distance < 115) {
      out[i + 3] = 0;
      continue;
    }

    if (distance < 170) {
      out[i + 3] = Math.round(out[i + 3] * ((distance - 115) / 55));
      if (greenKey) {
        out[i + 1] = Math.min(out[i + 1], Math.round((out[i] + out[i + 2]) * 0.62));
      } else if (magentaKey) {
        out[i] = Math.min(out[i], Math.round((out[i + 1] + out[i + 2]) * 0.72));
        out[i + 2] = Math.min(out[i + 2], Math.round((out[i] + out[i + 1]) * 0.72));
      }
    }
  }

  return { data: out, info };
}

function alphaBounds(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < 12) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0) return null;

  const pad = Math.ceil(Math.max(maxX - minX, maxY - minY) * 0.08);
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(width, maxX + pad + 1);
  const bottom = Math.min(height, maxY + pad + 1);

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

async function buildDalleLogo(sourcePath, column, target) {
  await fs.access(sourcePath);
  const meta = await sharp(sourcePath).metadata();
  const sheetW = meta.width ?? 0;
  const sheetH = meta.height ?? 0;
  if (sheetW < 300 || sheetH < 300) throw new Error(`Unexpected DALL-E logo sheet size: ${sourcePath}`);

  const left = Math.floor((sheetW * column) / 3);
  const right = Math.floor((sheetW * (column + 1)) / 3);
  const crop = await sharp(sourcePath)
    .extract({ left, top: 0, width: right - left, height: sheetH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const keyed = removeChromaKey(crop);
  const bounds = alphaBounds(keyed.data, keyed.info.width, keyed.info.height);
  if (!bounds) throw new Error(`No visible DALL-E logo pixels after chroma removal: ${sourcePath}`);

  const icon = await sharp(keyed.data, {
    raw: {
      width: keyed.info.width,
      height: keyed.info.height,
      channels: 4,
    },
  })
    .extract(bounds)
    .resize(232, 232, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: icon, left: 14, top: 14 }])
    .webp({ quality: 96, effort: 6, lossless: true })
    .toFile(target);
}

async function buildLogo(themeKey, theme, levelKey, level, dalleLogoSources) {
  const target = path.join(LOGO_DIR, `quiz-logo-${levelKey}-${theme.file}.webp`);
  const sourcePath = dalleLogoSources[themeKey];
  const column = Object.keys(LEVELS).indexOf(levelKey);

  if (sourcePath && column >= 0) {
    try {
      await buildDalleLogo(sourcePath, column, target);
      return { target, source: sourcePath };
    } catch (error) {
      console.warn(`Falling back to generated SVG logo for ${themeKey}/${levelKey}: ${error.message}`);
    }
  }

  await sharp(logoSvg(themeKey, theme, levelKey, level))
    .webp({ quality: 96, effort: 6, lossless: true })
    .toFile(target);
  return { target, source: null };
}

async function writePreview() {
  const cellW = 356;
  const cellH = 178;
  const gap = 18;
  const pad = 22;
  const themeKeys = Object.keys(THEMES);
  const levelKeys = Object.keys(LEVELS);
  const width = pad * 2 + themeKeys.length * cellW + (themeKeys.length - 1) * gap;
  const height = pad * 2 + levelKeys.length * cellH + (levelKeys.length - 1) * gap;
  const composites = [];

  for (const [row, levelKey] of levelKeys.entries()) {
    for (const [col, themeKey] of themeKeys.entries()) {
      const theme = THEMES[themeKey];
      const left = pad + col * (cellW + gap);
      const top = pad + row * (cellH + gap);
      const cardPath = path.join(CARD_DIR, `quiz-card-${levelKey}-${theme.file}.webp`);
      const logoPath = path.join(LOGO_DIR, `quiz-logo-${levelKey}-${theme.file}.webp`);
      composites.push({
        input: await sharp(cardPath).resize(320, 118).png().toBuffer(),
        left,
        top: top + 28,
      });
      composites.push({
        input: await sharp(logoPath).resize(100, 100).png().toBuffer(),
        left: left + 216,
        top: top + 38,
      });
    }
  }

  const labelSvg = Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    text { font-family: Arial, sans-serif; fill: #DDE7EE; font-size: 15px; font-weight: 700; }
    .sub { fill: #91A2B5; font-size: 12px; font-weight: 600; }
  </style>
  ${themeKeys.map((themeKey, col) => {
    const left = pad + col * (cellW + gap);
    return `<text x="${left}" y="17">${esc(THEMES[themeKey].label)}</text>`;
  }).join('')}
  ${levelKeys.flatMap((levelKey, row) => themeKeys.map((themeKey, col) => {
    const left = pad + col * (cellW + gap);
    const top = pad + row * (cellH + gap);
    return `<text class="sub" x="${left}" y="${top + 164}">${esc(LEVELS[levelKey].label)} ${esc(LEVELS[levelKey].cefr)}</text>`;
  })).join('')}
</svg>`);

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#07090D',
    },
  })
    .composite([...composites, { input: labelSvg, left: 0, top: 0 }])
    .webp({ quality: 92, effort: 5 })
    .toFile(path.join(QA_DIR, 'quiz-level-theme-assets-preview.webp'));
}

async function main() {
  const cardsOnly = process.argv.includes('--cards-only');

  await fs.mkdir(CARD_DIR, { recursive: true });
  await fs.mkdir(LOGO_DIR, { recursive: true });
  await fs.mkdir(QA_DIR, { recursive: true });

  const candidateSources = await readCandidates();
  const dalleCardSources = await readDalleCardSources();
  const dalleLogoSources = await readDalleLogoSources();
  const manifest = [];

  for (const [themeKey, theme] of Object.entries(THEMES)) {
    for (const [levelKey, level] of Object.entries(LEVELS)) {
      const card = await buildCard(themeKey, theme, levelKey, level, candidateSources, dalleCardSources);
      if (cardsOnly) continue;
      const logo = await buildLogo(themeKey, theme, levelKey, level, dalleLogoSources);
      const cardMeta = await sharp(card.target).metadata();
      const logoMeta = await sharp(logo.target).metadata();
      manifest.push({
        theme: themeKey,
        level: levelKey,
        card: path.relative(ROOT, card.target).replaceAll('\\', '/'),
        logo: path.relative(ROOT, logo.target).replaceAll('\\', '/'),
        dalleSource: card.source,
        cardDalleSource: dalleCardSources[themeKey] ?? null,
        logoDalleSource: logo.source,
        cardSize: `${cardMeta.width}x${cardMeta.height}`,
        logoSize: `${logoMeta.width}x${logoMeta.height}`,
      });
    }
  }

  if (cardsOnly) {
    console.log('Generated quiz level cards.');
    return;
  }

  await writePreview();
  await fs.writeFile(
    path.join(QA_DIR, 'quiz-level-theme-assets-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  console.log(`Generated ${manifest.length} quiz level card/logo pairs.`);
  console.log(path.join(QA_DIR, 'quiz-level-theme-assets-preview.webp'));
}

await main();

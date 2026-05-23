import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const CARD_W = 640;
const CARD_H = 236;
const LOGO_SIZE = 260;

const THEMES = {
  forest: {
    file: 'forest',
    label: 'forest',
    hue: 118,
    brightness: 0.78,
    saturation: 0.96,
    wash: '#0B432E',
    accent: '#72F3A2',
    accent2: '#1FBF8A',
    ink: '#E9FFF3',
  },
  dark: {
    file: 'dark',
    label: 'dark',
    hue: 170,
    brightness: 0.76,
    saturation: 0.78,
    wash: '#07121B',
    accent: '#7DB8FF',
    accent2: '#4C6C95',
    ink: '#EEF6FF',
  },
  neon: {
    file: 'neon',
    label: 'neon',
    hue: 255,
    brightness: 0.86,
    saturation: 1.28,
    wash: '#120A3A',
    accent: '#00F5FF',
    accent2: '#C084FC',
    ink: '#E9FBFF',
  },
  neonGreen: {
    file: 'neon-green',
    label: 'neonGreen',
    hue: 112,
    brightness: 0.82,
    saturation: 1.36,
    wash: '#08291C',
    accent: '#9DFF57',
    accent2: '#00D084',
    ink: '#F0FFE6',
  },
  gold: {
    file: 'gold',
    label: 'gold',
    hue: 42,
    brightness: 0.9,
    saturation: 1.12,
    wash: '#3B2206',
    accent: '#F4C96B',
    accent2: '#B67A25',
    ink: '#FFF3C2',
  },
  coral: {
    file: 'coral',
    label: 'coral',
    hue: 8,
    brightness: 0.88,
    saturation: 1.2,
    wash: '#3A0D14',
    accent: '#FF8A73',
    accent2: '#FF5E7A',
    ink: '#FFF1EC',
  },
  minimalLight: {
    file: 'minimal-light',
    label: 'minimalLight',
    hue: 36,
    brightness: 1.22,
    saturation: 0.42,
    wash: '#F6EAD8',
    accent: '#2E6EEB',
    accent2: '#1BAA9B',
    ink: '#243142',
  },
  minimalDark: {
    file: 'minimal-dark',
    label: 'minimalDark',
    hue: 215,
    brightness: 0.66,
    saturation: 0.48,
    wash: '#111923',
    accent: '#9DB4CE',
    accent2: '#39D58A',
    ink: '#EDF4FA',
  },
};

function parseArgs(argv) {
  const args = {
    category: '',
    cardSource: '',
    logoSource: '',
    outRoot: path.join(ROOT, 'assets', 'images', 'quizzes'),
    qaRoot: path.join(ROOT, 'qa-artifacts', 'skyler-thematic-assets'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--category') args.category = argv[++i];
    else if (token === '--card-source') args.cardSource = argv[++i];
    else if (token === '--logo-source') args.logoSource = argv[++i];
    else if (token === '--out-root') args.outRoot = argv[++i];
    else if (token === '--qa-root') args.qaRoot = argv[++i];
    else throw new Error(`Unknown argument: ${token}`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.category)) {
    throw new Error('--category is required and must be kebab-case');
  }
  if (!args.cardSource) throw new Error('--card-source is required');
  if (!args.logoSource) throw new Error('--logo-source is required');

  return {
    ...args,
    cardSource: path.resolve(ROOT, args.cardSource),
    logoSource: path.resolve(ROOT, args.logoSource),
    outRoot: path.resolve(ROOT, args.outRoot),
    qaRoot: path.resolve(ROOT, args.qaRoot),
  };
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

function esc(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[char]));
}

function cardOverlaySvg(themeKey, theme) {
  const light = themeKey === 'minimalLight';
  return Buffer.from(`
<svg width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${light ? '#FFF8EA' : '#000000'}" stop-opacity="${light ? '.46' : '.76'}"/>
      <stop offset=".46" stop-color="${light ? '#FFF8EA' : '#000000'}" stop-opacity="${light ? '.22' : '.30'}"/>
      <stop offset="1" stop-color="${esc(theme.wash)}" stop-opacity="${light ? '.12' : '.18'}"/>
    </linearGradient>
    <radialGradient id="glow" cx=".78" cy=".52" r=".52">
      <stop offset="0" stop-color="${esc(theme.accent)}" stop-opacity="${light ? '.25' : '.34'}"/>
      <stop offset=".48" stop-color="${esc(theme.accent2)}" stop-opacity="${light ? '.11' : '.16'}"/>
      <stop offset="1" stop-color="${esc(theme.wash)}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#scrim)"/>
  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#glow)"/>
  <path d="M388 32h88v42h84M420 203h78v-38h90M396 122h62v-26h62" stroke="${esc(rgba(theme.accent, light ? 0.26 : 0.34))}" stroke-width="2.1" fill="none"/>
  <circle cx="514" cy="73" r="5" fill="${esc(rgba(theme.ink, light ? 0.30 : 0.42))}"/>
  <circle cx="552" cy="164" r="4" fill="${esc(rgba(theme.accent, light ? 0.28 : 0.46))}"/>
</svg>`);
}

function logoHaloSvg(themeKey, theme) {
  const light = themeKey === 'minimalLight';
  return Buffer.from(`
<svg width="${LOGO_SIZE}" height="${LOGO_SIZE}" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="halo" cx=".50" cy=".48" r=".56">
      <stop offset="0" stop-color="${esc(theme.accent)}" stop-opacity="${light ? '.30' : '.44'}"/>
      <stop offset=".62" stop-color="${esc(theme.accent2)}" stop-opacity="${light ? '.10' : '.16'}"/>
      <stop offset="1" stop-color="${esc(theme.wash)}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="130" cy="130" r="122" fill="url(#halo)"/>
</svg>`);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copySource(source, target) {
  await ensureDir(path.dirname(target));
  await fs.copyFile(source, target);
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

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const distance = Math.sqrt(((r - keyR) ** 2) + ((g - keyG) ** 2) + ((b - keyB) ** 2));

    if (distance < 105) {
      out[i + 3] = 0;
    } else if (distance < 168) {
      out[i + 3] = Math.round(out[i + 3] * ((distance - 105) / 63));
      out[i + 1] = Math.min(out[i + 1], Math.round((out[i] + out[i + 2]) * 0.56));
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
  const pad = Math.ceil(Math.max(maxX - minX, maxY - minY) * 0.07);
  return {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(width, maxX + pad + 1) - Math.max(0, minX - pad),
    height: Math.min(height, maxY + pad + 1) - Math.max(0, minY - pad),
  };
}

async function buildLogoBase(logoSource) {
  const raw = await sharp(logoSource).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const keyed = removeChromaKey(raw);
  const bounds = alphaBounds(keyed.data, keyed.info.width, keyed.info.height);
  if (!bounds) throw new Error('No visible pixels after logo chroma-key removal');

  return sharp(keyed.data, {
    raw: {
      width: keyed.info.width,
      height: keyed.info.height,
      channels: 4,
    },
  })
    .extract(bounds)
    .resize(222, 222, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function makeCard(cardSource, target, themeKey, theme) {
  const base = await sharp(cardSource)
    .resize(CARD_W, CARD_H, { fit: 'cover', position: 'attention' })
    .modulate({
      brightness: theme.brightness,
      saturation: theme.saturation,
      hue: theme.hue,
    })
    .png()
    .toBuffer();

  await sharp(base)
    .composite([{ input: cardOverlaySvg(themeKey, theme), left: 0, top: 0 }])
    .webp({ quality: 91, effort: 5 })
    .toFile(target);
}

async function makeLogo(logoBase, target, themeKey, theme) {
  const tinted = await sharp(logoBase)
    .modulate({
      brightness: Math.max(0.72, Math.min(1.24, theme.brightness + 0.18)),
      saturation: Math.max(0.5, theme.saturation),
      hue: theme.hue,
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
    .composite([
      { input: logoHaloSvg(themeKey, theme), left: 0, top: 0 },
      { input: tinted, left: 19, top: 19 },
    ])
    .webp({ quality: 96, effort: 6, lossless: true })
    .toFile(target);
}

async function writePreview(entries, target) {
  const cellW = 372;
  const cellH = 136;
  const gap = 14;
  const pad = 18;
  const width = pad * 2 + cellW;
  const height = pad * 2 + entries.length * cellH + (entries.length - 1) * gap;
  const composites = [];

  for (const [index, entry] of entries.entries()) {
    const top = pad + index * (cellH + gap);
    composites.push({
      input: await sharp(entry.cardPath).resize(320, 118).png().toBuffer(),
      left: pad,
      top: top + 8,
    });
    composites.push({
      input: await sharp(entry.logoPath).resize(104, 104).png().toBuffer(),
      left: pad + 250,
      top: top + 16,
    });
  }

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#111318',
    },
  })
    .composite(composites)
    .png()
    .toFile(target);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cardDir = path.join(args.outRoot, 'theme_cards');
  const logoDir = path.join(args.outRoot, 'theme_logos');
  const sourceDir = path.join(args.qaRoot, args.category, 'dalle-sources');
  await ensureDir(cardDir);
  await ensureDir(logoDir);
  await ensureDir(sourceDir);

  const copiedCardSource = path.join(sourceDir, `${args.category}-card-source.png`);
  const copiedLogoSource = path.join(sourceDir, `${args.category}-logo-source.png`);
  await copySource(args.cardSource, copiedCardSource);
  await copySource(args.logoSource, copiedLogoSource);

  const logoBase = await buildLogoBase(args.logoSource);
  const entries = [];

  for (const [themeKey, theme] of Object.entries(THEMES)) {
    const cardPath = path.join(cardDir, `quiz-theme-${args.category}-${theme.file}.webp`);
    const logoPath = path.join(logoDir, `quiz-theme-${args.category}-${theme.file}.webp`);
    await makeCard(args.cardSource, cardPath, themeKey, theme);
    await makeLogo(logoBase, logoPath, themeKey, theme);
    const cardMeta = await sharp(cardPath).metadata();
    const logoMeta = await sharp(logoPath).metadata();
    entries.push({
      family: theme.label,
      cardPath: path.relative(ROOT, cardPath).split(path.sep).join('/'),
      logoPath: path.relative(ROOT, logoPath).split(path.sep).join('/'),
      card: { width: cardMeta.width, height: cardMeta.height, hasAlpha: Boolean(cardMeta.hasAlpha) },
      logo: { width: logoMeta.width, height: logoMeta.height, hasAlpha: Boolean(logoMeta.hasAlpha) },
    });
  }

  const manifest = {
    schemaVersion: 'skyler-thematic-theme-assets-v1',
    categoryId: args.category,
    generatedAt: new Date().toISOString(),
    sourceMode: 'DALL-E source art plus local theme normalization',
    sourcePaths: {
      card: path.relative(ROOT, copiedCardSource).split(path.sep).join('/'),
      logo: path.relative(ROOT, copiedLogoSource).split(path.sep).join('/'),
    },
    promptNotes: {
      card: `${args.category} DALL-E topic plaque/card source, no bitmap text, no logos, app text rendered separately.`,
      logo: `${args.category} DALL-E compact topic icon/logo source, no bitmap text, no logos, readable at small size.`,
    },
    assets: entries,
  };

  const manifestPath = path.join(args.qaRoot, args.category, 'manifest.json');
  const previewPath = path.join(args.qaRoot, args.category, 'preview.png');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writePreview(entries, previewPath);

  console.log(JSON.stringify({
    ok: true,
    manifest: path.relative(ROOT, manifestPath).split(path.sep).join('/'),
    preview: path.relative(ROOT, previewPath).split(path.sep).join('/'),
    assets: entries,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const QA_DIR = path.join(ROOT, 'qa-artifacts', 'quiz-compass-readable-repair');
const CARD_W = 640;
const CARD_H = 236;
const LOGO_SIZE = 260;
const ICON_SIZE = 150;
sharp.cache(false);

const ASSETS = [
  {
    kind: 'level',
    key: 'easy',
    title: 'easy',
    accent: '#D7B56F',
    glow: '#6D9C68',
    card: 'assets/images/quizzes/level_cards/quiz-card-easy-compass-premium.webp',
    logo: 'assets/images/quizzes/level_logos/quiz-logo-easy-compass-premium.webp',
  },
  {
    kind: 'level',
    key: 'medium',
    title: 'medium',
    accent: '#E2A45C',
    glow: '#B66137',
    card: 'assets/images/quizzes/level_cards/quiz-card-medium-compass-premium.webp',
    logo: 'assets/images/quizzes/level_logos/quiz-logo-medium-compass-premium.webp',
  },
  {
    kind: 'level',
    key: 'hard',
    title: 'hard',
    accent: '#E6D4B1',
    glow: '#8670A8',
    card: 'assets/images/quizzes/level_cards/quiz-card-hard-compass-premium.webp',
    logo: 'assets/images/quizzes/level_logos/quiz-logo-hard-compass-premium.webp',
  },
  {
    kind: 'theme',
    key: 'kitchen-and-cooking',
    title: 'kitchen',
    accent: '#E9C785',
    glow: '#A86C38',
    card: 'assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-compass-premium.webp',
    logo: 'assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-compass-premium.webp',
  },
  {
    kind: 'theme',
    key: 'home-and-rooms',
    title: 'home',
    accent: '#CBA978',
    glow: '#506E82',
    card: 'assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-compass-premium.webp',
    logo: 'assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-compass-premium.webp',
  },
];

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
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

function cardSvg(asset) {
  const accent = esc(asset.accent);
  const glow = esc(asset.glow);
  const accentSoft = esc(rgba(asset.accent, 0.28));
  const accentQuiet = esc(rgba(asset.accent, 0.12));
  const glowQuiet = esc(rgba(asset.glow, 0.14));

  return Buffer.from(`
<svg width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22211E"/>
      <stop offset="0.48" stop-color="#111210"/>
      <stop offset="1" stop-color="#070807"/>
    </linearGradient>
    <radialGradient id="rightWash" cx="84%" cy="50%" r="44%">
      <stop offset="0" stop-color="${glow}" stop-opacity="0.20"/>
      <stop offset="0.48" stop-color="${glow}" stop-opacity="0.075"/>
      <stop offset="1" stop-color="#050505" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="iconQuietZone" cx="83%" cy="50%" r="25%">
      <stop offset="0" stop-color="#070706" stop-opacity="0.78"/>
      <stop offset="0.72" stop-color="#090807" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#090807" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.92" numOctaves="3" seed="14"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.09"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#base)"/>
  <rect width="${CARD_W}" height="${CARD_H}" filter="url(#grain)" opacity="0.34"/>
  <rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" fill="url(#rightWash)"/>
  <rect x="356" y="0" width="284" height="${CARD_H}" fill="url(#iconQuietZone)"/>
  <path d="M418 28c74 42 104 112 86 184M548 10c-78 52-103 126-76 206" stroke="${accentQuiet}" stroke-width="1.4" fill="none"/>
  <path d="M386 185c52-20 111-20 178 0M402 52c52 16 105 16 160 0" stroke="${accentQuiet}" stroke-width="1.2" fill="none"/>
  <circle cx="528" cy="118" r="82" stroke="${accentQuiet}" stroke-width="1.2" fill="none"/>
  <circle cx="528" cy="118" r="52" stroke="${accentSoft}" stroke-width="1.1" fill="none"/>
  <path d="M528 54v128M464 118h128" stroke="${accentSoft}" stroke-width="1.2" opacity="0.42"/>
  <path d="M24 28c94-14 178-11 246 8M22 205c95 10 180 5 252-14" stroke="${accentQuiet}" stroke-width="1" fill="none"/>
  <rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" fill="rgba(0,0,0,0.22)"/>
  <rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" fill="none" stroke="rgba(235,207,150,0.22)" stroke-width="2"/>
  <rect x="1.5" y="1.5" width="${CARD_W - 3}" height="${CARD_H - 3}" fill="none" stroke="rgba(0,0,0,0.48)" stroke-width="3"/>
</svg>`);
}

function alphaBounds(data, width, height, threshold = 14) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function buildLogo(asset) {
  const target = path.join(ROOT, asset.logo);
  const tmpTarget = `${target}.tmp.webp`;
  const originalFile = await fs.readFile(target);
  const original = await sharp(originalFile).ensureAlpha().png().toBuffer();
  const raw = await sharp(original)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = alphaBounds(raw.data, raw.info.width, raw.info.height);
  if (!bounds) throw new Error(`No visible pixels for ${asset.logo}`);

  const cutout = await sharp(raw.data, {
    raw: { width: raw.info.width, height: raw.info.height, channels: 4 },
  })
    .extract(bounds)
    .resize(ICON_SIZE, ICON_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .modulate({ saturation: 0.92, brightness: 1.04 })
    .png()
    .toBuffer();

  const ringSvg = Buffer.from(`
<svg width="${LOGO_SIZE}" height="${LOGO_SIZE}" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="disc" cx="50%" cy="45%" r="54%">
      <stop offset="0" stop-color="#201A13" stop-opacity="0.98"/>
      <stop offset="0.68" stop-color="#070706" stop-opacity="0.96"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000000" flood-opacity="0.72"/>
    </filter>
  </defs>
  <circle cx="130" cy="130" r="99" fill="url(#disc)" filter="url(#shadow)"/>
  <circle cx="130" cy="130" r="84" fill="none" stroke="${esc(rgba(asset.accent, 0.72))}" stroke-width="4"/>
  <circle cx="130" cy="130" r="74" fill="none" stroke="rgba(255,245,220,0.18)" stroke-width="2"/>
</svg>`);

  await sharp({
    create: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: ringSvg, left: 0, top: 0 },
      { input: cutout, left: Math.round((LOGO_SIZE - ICON_SIZE) / 2), top: Math.round((LOGO_SIZE - ICON_SIZE) / 2) - 2 },
    ])
    .webp({ quality: 96, effort: 6, lossless: true })
    .toFile(tmpTarget);

  await fs.copyFile(tmpTarget, target);
  await fs.unlink(tmpTarget);
}

async function buildCard(asset) {
  const target = path.join(ROOT, asset.card);
  await sharp(cardSvg(asset))
    .webp({ quality: 92, effort: 5 })
    .toFile(target);
}

async function validateLogo(asset) {
  const target = path.join(ROOT, asset.logo);
  const raw = await sharp(target)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = alphaBounds(raw.data, LOGO_SIZE, LOGO_SIZE) ?? { left: 0, top: 0, width: LOGO_SIZE, height: LOGO_SIZE };
  const margins = {
    left: bounds.left,
    top: bounds.top,
    right: LOGO_SIZE - bounds.left - bounds.width,
    bottom: LOGO_SIZE - bounds.top - bounds.height,
  };
  return {
    key: asset.key,
    path: asset.logo,
    bounds,
    margins,
    minMargin: Math.min(margins.left, margins.top, margins.right, margins.bottom),
  };
}

async function writePreview() {
  const rowW = 520;
  const rowH = 128;
  const gap = 14;
  const pad = 18;
  const composites = [];
  for (const [index, asset] of ASSETS.entries()) {
    const top = pad + index * (rowH + gap);
    composites.push({ input: await sharp(path.join(ROOT, asset.card)).resize(340, 125).png().toBuffer(), left: pad, top });
    composites.push({ input: await sharp(path.join(ROOT, asset.logo)).resize(94, 94).png().toBuffer(), left: 398, top: top + 16 });
  }
  const target = path.join(QA_DIR, 'preview.png');
  await sharp({
    create: {
      width: rowW,
      height: pad * 2 + ASSETS.length * rowH + (ASSETS.length - 1) * gap,
      channels: 4,
      background: '#141414',
    },
  })
    .composite(composites)
    .png()
    .toFile(target);
  return target;
}

async function main() {
  await fs.mkdir(QA_DIR, { recursive: true });
  for (const asset of ASSETS) await buildCard(asset);
  for (const asset of ASSETS) await buildLogo(asset);
  const logos = [];
  for (const asset of ASSETS) logos.push(await validateLogo(asset));
  const preview = await writePreview();
  const manifest = {
    schemaVersion: 'quiz-compass-readable-repair-v1',
    generatedAt: new Date().toISOString(),
    note: 'Readable repair after in-app screenshot: calm cards, separate icon slot, dark medallion behind DALL-E cutouts.',
    cards: ASSETS.map((asset) => ({ key: asset.key, path: asset.card, width: CARD_W, height: CARD_H })),
    logos,
    preview: rel(preview),
  };
  const manifestPath = path.join(QA_DIR, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ok: true, manifest: rel(manifestPath), preview: rel(preview), logos }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

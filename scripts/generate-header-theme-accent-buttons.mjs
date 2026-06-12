import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'images', 'header_glyphs', 'theme-accent-buttons');
const SOURCE_DIR = path.join(OUT_DIR, 'vector_sources_outline_v1');
const WIDTH = 320;
const HEIGHT = 224;
const VERSION = 'outline-v1';

const themes = [
  { id: 'dark', play: '#47C870', message: '#58CC89', shadow: '#021006' },
  { id: 'neon', play: '#C8FF00', message: '#FFE600', shadow: '#101400' },
  { id: 'gold', play: '#D6B35A', message: '#F7DA92', shadow: '#120C02' },
  { id: 'coral', play: '#FF6464', message: '#FFD060', shadow: '#20080D' },
  { id: 'minimalDark', play: '#6EA8FF', message: '#D7DCE6', shadow: '#03070F' },
  { id: 'compass', play: '#F2C48D', message: '#D78C58', shadow: '#0F0904' },
  { id: 'midnight', play: '#8FA0FF', message: '#B79CFF', shadow: '#030515' },
  { id: 'ember', play: '#FFA245', message: '#FF6E8A', shadow: '#180600' },
  { id: 'aurora', play: '#3DE8A6', message: '#2E9DFF', shadow: '#00120B' },
  { id: 'volt', play: '#D6FF3D', message: '#2EE08C', shadow: '#0A1100' },
];

const oldRootAssets = [
  'theme-accent-button-pairs-contact-sheet-dalle-v1.png',
  ...themes.flatMap(({ id }) => [
    `play-button-${id}-dalle-v1.webp`,
    `message-button-${id}-dalle-v1.webp`,
  ]),
];

function commonDefs(theme, color) {
  return `
    <defs>
      <filter id="softInk" x="-18%" y="-28%" width="136%" height="156%" color-interpolation-filters="sRGB">
        <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="${theme.shadow}" flood-opacity="0.24"/>
        <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="${color}" flood-opacity="0.26"/>
      </filter>
    </defs>
  `;
}

function strokeGroup(color, shadow, body, strokeWidth = 10) {
  const backingWidth = strokeWidth + 3.5;
  const highlightWidth = Math.max(2.2, strokeWidth * 0.32);
  return `
    <g filter="url(#softInk)" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g stroke="${shadow}" stroke-opacity="0.38" stroke-width="${backingWidth}">${body}</g>
      <g stroke="${color}" stroke-width="${strokeWidth}">${body}</g>
      <g stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="${highlightWidth}">${body}</g>
    </g>
  `;
}

function frameBody() {
  return `
    <rect x="47" y="43" width="226" height="138" rx="31"/>
  `;
}

function playInnerBody() {
  return `
    <path d="M139 80 L204 112 L139 144 Z"/>
  `;
}

function messageInnerBody() {
  return `
    <path d="M82 80 L145 127 Q160 138 175 127 L238 80"/>
    <path d="M82 148 L130 110"/>
    <path d="M238 148 L190 110"/>
  `;
}

function iconSvg(kind, theme) {
  const color = theme[kind];
  const innerBody = kind === 'play' ? playInnerBody() : messageInnerBody();
  const innerStrokeWidth = kind === 'play' ? 10 : 5;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      ${commonDefs(theme, color)}
      ${strokeGroup(color, theme.shadow, frameBody())}
      ${strokeGroup(color, theme.shadow, innerBody, innerStrokeWidth)}
    </svg>
  `;
}

function contactSheetSvg() {
  const rowH = 154;
  const sheetW = 720;
  const sheetH = themes.length * rowH + 68;
  const rows = themes.map((theme, index) => {
    const y = 46 + index * rowH;
    const play = iconSvg('play', theme).replace('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="224" viewBox="0 0 320 224">', `<svg x="156" y="${y - 34}" width="168" height="118" viewBox="0 0 320 224">`).replace('</svg>', '</svg>');
    const message = iconSvg('message', theme).replace('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="224" viewBox="0 0 320 224">', `<svg x="354" y="${y - 34}" width="168" height="118" viewBox="0 0 320 224">`).replace('</svg>', '</svg>');
    return `
      <text x="34" y="${y + 30}" fill="#E8EAEE" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800">${theme.id}</text>
      ${play}
      ${message}
    `;
  }).join('\n');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}" viewBox="0 0 ${sheetW} ${sheetH}">
      <rect width="${sheetW}" height="${sheetH}" fill="#090A0D"/>
      <text x="34" y="34" fill="#FFFFFF" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900">Header accent buttons - outline v1</text>
      ${rows}
    </svg>
  `;
}

async function writeAsset(kind, theme) {
  const svg = iconSvg(kind, theme);
  const baseName = `${kind}-button-${theme.id}-${VERSION}`;
  const svgPath = path.join(SOURCE_DIR, `${baseName}.svg`);
  const webpPath = path.join(OUT_DIR, `${baseName}.webp`);
  fs.writeFileSync(svgPath, svg.trimStart(), 'utf8');
  await sharp(Buffer.from(svg)).webp({ quality: 96, lossless: true }).toFile(webpPath);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SOURCE_DIR, { recursive: true });

  for (const file of oldRootAssets) {
    fs.rmSync(path.join(OUT_DIR, file), { force: true });
  }

  for (const theme of themes) {
    await writeAsset('play', theme);
    await writeAsset('message', theme);
  }

  await sharp(Buffer.from(contactSheetSvg()))
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, `theme-accent-button-pairs-contact-sheet-${VERSION}.png`));
}

await main();

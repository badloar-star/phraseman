import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { validateCardManifest } from './schema.mjs';

const WIDTH = 1080;
const HEIGHT = 1080;
const SAFE_AREA = 48;

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function mimeFor(filePath) {
  return path.extname(filePath).toLowerCase() === '.jpg' || path.extname(filePath).toLowerCase() === '.jpeg'
    ? 'image/jpeg'
    : 'image/png';
}

async function imageDataUri(filePath) {
  const bytes = await fs.readFile(filePath);
  return `data:${mimeFor(filePath)};base64,${bytes.toString('base64')}`;
}

function artifactPaths(outputPath) {
  const parsed = path.parse(outputPath);
  return {
    layoutPath: path.join(parsed.dir, `${parsed.name}.layout.json`),
    svgPath: path.join(parsed.dir, `${parsed.name}.svg`),
    jpegPath: outputPath,
  };
}

async function sha256File(filePath) {
  return crypto.createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
}

async function writeArtifacts({ outputPath, layout, svg }) {
  const artifacts = artifactPaths(outputPath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(artifacts.layoutPath, `${JSON.stringify(layout, null, 2)}\n`, 'utf8');
  await fs.writeFile(artifacts.svgPath, svg, 'utf8');
  await sharp(Buffer.from(svg))
    .flatten({ background: '#ffffff' })
    .toColourspace('srgb')
    .jpeg({ quality: 82, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toFile(artifacts.jpegPath);
  const metadata = await sharp(artifacts.jpegPath).metadata();
  if (metadata.width !== WIDTH || metadata.height !== HEIGHT || metadata.format !== 'jpeg') {
    throw new Error('jpeg_verification_failed');
  }
  return { ...artifacts, sha256: await sha256File(artifacts.jpegPath) };
}

function assertCard(card) {
  const result = validateCardManifest(card);
  if (!result.ok) throw new Error(`invalid_manifest:${result.errors.join(',')}`);
}

function learningLayout(card, cellPaths) {
  const columns = card.grid === '3x3' ? 3 : 2;
  const rows = 3;
  const gap = 18;
  const top = 190;
  const availableWidth = WIDTH - SAFE_AREA * 2;
  const availableHeight = HEIGHT - top - SAFE_AREA;
  const cellWidth = Math.floor((availableWidth - gap * (columns - 1)) / columns);
  const cellHeight = Math.floor((availableHeight - gap * (rows - 1)) / rows);
  const cells = card.items.map((item, index) => ({
    itemId: item.id,
    imagePath: cellPaths[item.id],
    x: SAFE_AREA + (index % columns) * (cellWidth + gap),
    y: top + Math.floor(index / columns) * (cellHeight + gap),
    width: cellWidth,
    height: cellHeight,
    english: item.english,
    russian: card.languageMode === 'bilingual' ? item.russian ?? '' : '',
    englishFontSize: 34,
    russianFontSize: 24,
  }));
  if (cells.some((cell) => !cell.imagePath)) throw new Error('missing_cell_image');
  return {
    kind: 'learning',
    width: WIDTH,
    height: HEIGHT,
    safeArea: SAFE_AREA,
    background: '#ffffff',
    title: { text: card.titleEn, x: WIDTH / 2, y: 84, fontSize: 64 },
    subtitle: { text: card.titleRu, x: WIDTH / 2, y: 142, fontSize: 28 },
    cells,
  };
}

async function learningSvg(layout) {
  const cells = await Promise.all(layout.cells.map(async (cell) => {
    const imageHeight = cell.russian ? cell.height - 84 : cell.height - 56;
    const englishY = cell.y + imageHeight + 36;
    const russianY = englishY + 28;
    return `<g>
      <rect x="${cell.x}" y="${cell.y}" width="${cell.width}" height="${cell.height}" rx="20" fill="#f7f7f5"/>
      <image href="${await imageDataUri(cell.imagePath)}" x="${cell.x + 6}" y="${cell.y + 6}" width="${cell.width - 12}" height="${imageHeight - 8}" preserveAspectRatio="xMidYMid meet"/>
      <text x="${cell.x + cell.width / 2}" y="${englishY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${cell.englishFontSize}" font-weight="800" fill="#10151c">${escapeXml(cell.english)}</text>
      ${cell.russian ? `<text x="${cell.x + cell.width / 2}" y="${russianY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${cell.russianFontSize}" fill="#4b5563">${escapeXml(cell.russian)}</text>` : ''}
    </g>`;
  }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${layout.background}"/>
    <text x="${layout.title.x}" y="${layout.title.y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${layout.title.fontSize}" font-weight="900" fill="#0b1016">${escapeXml(layout.title.text)}</text>
    <text x="${layout.subtitle.x}" y="${layout.subtitle.y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${layout.subtitle.fontSize}" fill="#394150">${escapeXml(layout.subtitle.text)}</text>
    ${cells.join('\n')}
  </svg>`;
}

export async function renderLearningSlide({ card, cellPaths, outputPath }) {
  assertCard(card);
  const layout = learningLayout(card, cellPaths);
  return writeArtifacts({ outputPath, layout, svg: await learningSvg(layout) });
}

export async function renderInstallSlide({ card, appScreenshotPath, heroCellPath, outputPath }) {
  assertCard(card);
  await Promise.all([fs.access(appScreenshotPath), fs.access(heroCellPath)]);
  const layout = {
    kind: 'install',
    width: WIDTH,
    height: HEIGHT,
    safeArea: SAFE_AREA,
    screenshot: { path: appScreenshotPath, x: 92, y: 444, width: 260, height: 520 },
    hero: { path: heroCellPath, x: SAFE_AREA, y: SAFE_AREA, width: 984, height: 350 },
    cta: {
      x: 400,
      y: 500,
      width: 632,
      height: 464,
      fontSize: 42,
      title: 'Установи Phraseman бесплатно',
      titleLines: ['Установи Phraseman', 'бесплатно'],
      subtitle: 'Первый урок — через 30 секунд',
      button: 'Установить бесплатно',
      buttonBackground: '#B7FF3C',
      buttonTextColor: '#07110A',
      footer: 'Ссылка в профиле',
      url: 'knowlyapps.com/download',
    },
  };
  const [screenshotUri, heroUri] = await Promise.all([
    imageDataUri(appScreenshotPath),
    imageDataUri(heroCellPath),
  ]);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
    <rect x="48" y="48" width="984" height="350" rx="30" fill="#f5f1e9"/>
    <image href="${heroUri}" x="48" y="48" width="984" height="350" preserveAspectRatio="xMidYMid slice"/>
    <rect x="76" y="426" width="292" height="556" rx="42" fill="#111820"/>
    <image href="${screenshotUri}" x="92" y="444" width="260" height="520" preserveAspectRatio="xMidYMid slice"/>
    <text x="400" y="548" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#0b1016">${escapeXml(layout.cta.titleLines[0])}</text>
    <text x="400" y="600" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#0b1016">${escapeXml(layout.cta.titleLines[1])}</text>
    <text x="400" y="668" font-family="Arial, sans-serif" font-size="34" fill="#384252">${escapeXml(layout.cta.subtitle)}</text>
    <rect x="400" y="720" width="520" height="92" rx="24" fill="#b8f34b"/>
    <text x="660" y="780" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="900" fill="#07110a">Установить бесплатно</text>
    <text x="400" y="880" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#0b1016">${escapeXml(layout.cta.footer)}</text>
    <text x="400" y="940" font-family="Arial, sans-serif" font-size="26" fill="#596273">knowlyapps.com/download</text>
  </svg>`;
  return writeArtifacts({ outputPath, layout, svg });
}

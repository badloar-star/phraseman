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

function wrapWords(value, maxCharacters) {
  const lines = [];
  for (const word of String(value).split(/\s+/)) {
    const current = lines.at(-1);
    if (!current || `${current} ${word}`.length > maxCharacters) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
  }
  return lines;
}

function mimeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return extension === '.jpg' || extension === '.jpeg'
    ? 'image/jpeg'
    : extension === '.webp'
      ? 'image/webp'
      : 'image/png';
}

async function imageDataUri(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const bytes = extension === '.webp' || extension === '.png'
    ? await sharp(filePath).flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer()
    : await fs.readFile(filePath);
  const mime = extension === '.webp' || extension === '.png' ? 'image/jpeg' : mimeFor(filePath);
  return `data:${mime};base64,${bytes.toString('base64')}`;
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
    const imageHeight = cell.russian ? cell.height - 112 : cell.height - 72;
    const englishY = cell.y + imageHeight + 36;
    const russianY = englishY + 28;
    return `<g>
      <image href="${await imageDataUri(cell.imagePath)}" x="${cell.x + 18}" y="${cell.y + 10}" width="${cell.width - 36}" height="${imageHeight - 14}" preserveAspectRatio="xMidYMid meet"/>
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

export async function renderInstallSlide({ card, heroCellPath, outputPath }) {
  assertCard(card);
  await fs.access(heroCellPath);
  const conversion = card.conversion;
  if (conversion.layoutVariant) {
    const variants = {
      A: { hero: { x: 628, y: 92, width: 404, height: 770 }, textWidth: 550, titleSize: 50, titleY: 174, explanationY: 350, benefitY: 455, buttonY: 650 },
      B: { hero: { x: 392, y: 70, width: 640, height: 820 }, textWidth: 420, titleSize: 46, titleY: 174, explanationY: 350, benefitY: 455, buttonY: 650 },
      C: { hero: { x: 470, y: 82, width: 562, height: 800 }, textWidth: 430, titleSize: 46, titleY: 174, explanationY: 350, benefitY: 455, buttonY: 650 },
    };
    const variant = variants[conversion.layoutVariant];
    const layout = {
      kind: 'install',
      layoutVariant: conversion.layoutVariant,
      width: WIDTH,
      height: HEIGHT,
      safeArea: SAFE_AREA,
      hero: { path: heroCellPath, ...variant.hero, used: true, preserveFullSubject: true },
      cta: {
        x: 48,
        y: 70,
        width: variant.textWidth,
        height: 938,
        fontSize: variant.titleSize,
        eyebrow: conversion.hookLabel,
        title: conversion.titleLines.join(' '),
        titleLines: conversion.titleLines,
        explanationLines: conversion.explanationLines,
        benefitPrimary: conversion.benefits[0],
        benefitSecondary: conversion.benefits[1],
        button: conversion.cta,
        buttonBackground: '#B7FF3C',
        buttonTextColor: '#07110A',
        footer: 'Без регистрации • первый урок через 30 секунд',
        url: conversion.url,
      },
    };
    const heroUri = await imageDataUri(heroCellPath);
    const displayUrl = conversion.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
      <image href="${heroUri}" x="${variant.hero.x}" y="${variant.hero.y}" width="${variant.hero.width}" height="${variant.hero.height}" preserveAspectRatio="xMidYMid meet"/>
      <rect x="48" y="70" width="304" height="48" rx="24" fill="#B7FF3C"/>
      <text x="200" y="102" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="#07110A">${escapeXml(conversion.hookLabel)}</text>
      ${conversion.titleLines.map((line, index) => `<text x="48" y="${variant.titleY + index * 56}" font-family="Arial, sans-serif" font-size="${variant.titleSize}" font-weight="900" fill="#0b1016">${escapeXml(line)}</text>`).join('')}
      ${conversion.explanationLines.map((line, index) => `<text x="48" y="${variant.explanationY + index * 38}" font-family="Arial, sans-serif" font-size="28" fill="#384252">${escapeXml(line)}</text>`).join('')}
      <circle cx="64" cy="${variant.benefitY}" r="9" fill="#77D61D"/><text x="88" y="${variant.benefitY + 11}" font-family="Arial, sans-serif" font-size="29" font-weight="800" fill="#0b1016">${escapeXml(conversion.benefits[0])}</text>
      <circle cx="64" cy="${variant.benefitY + 58}" r="9" fill="#77D61D"/><text x="88" y="${variant.benefitY + 69}" font-family="Arial, sans-serif" font-size="29" font-weight="800" fill="#0b1016">${escapeXml(conversion.benefits[1])}</text>
      <rect x="48" y="${variant.buttonY}" width="540" height="100" rx="28" fill="#B7FF3C"/>
      <text x="318" y="${variant.buttonY + 65}" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="900" fill="#07110A">${escapeXml(conversion.cta)}</text>
      <text x="48" y="${variant.buttonY + 164}" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#0b1016">Без регистрации • первый урок</text>
      <text x="48" y="${variant.buttonY + 200}" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#0b1016">через 30 секунд</text>
      <text x="48" y="${variant.buttonY + 270}" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#0b1016">${escapeXml(displayUrl)}</text>
    </svg>`;
    return writeArtifacts({ outputPath, layout, svg });
  }
  const layout = {
    kind: 'install',
    width: WIDTH,
    height: HEIGHT,
    safeArea: SAFE_AREA,
    hero: { path: heroCellPath, x: 690, y: 105, width: 330, height: 390, used: true },
    cta: {
      x: 48,
      y: 70,
      width: 628,
      height: 938,
      fontSize: 58,
      eyebrow: conversion.hookLabel,
      title: conversion.titleLines.join(' '),
      titleLines: conversion.titleLines,
      explanationLines: conversion.explanationLines,
      benefitPrimary: conversion.benefits[0],
      benefitSecondary: conversion.benefits[1],
      answerEn: conversion.answerEn,
      answerRu: conversion.answerRu,
      answerLines: wrapWords(conversion.answerEn, 18),
      button: conversion.cta,
      buttonBackground: '#B7FF3C',
      buttonTextColor: '#07110A',
      footer: 'Без регистрации • первый урок через 30 секунд',
      url: conversion.url,
    },
  };
  const heroUri = await imageDataUri(heroCellPath);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
    <rect x="48" y="70" width="304" height="48" rx="24" fill="#B7FF3C"/>
    <text x="200" y="102" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="#07110A">${escapeXml(layout.cta.eyebrow)}</text>
    ${layout.cta.titleLines.map((line, index) => `<text x="48" y="${174 + index * 56}" font-family="Arial, sans-serif" font-size="48" font-weight="900" fill="#0b1016">${escapeXml(line)}</text>`).join('')}
    ${layout.cta.explanationLines.map((line, index) => `<text x="48" y="${350 + index * 38}" font-family="Arial, sans-serif" font-size="29" fill="#384252">${escapeXml(line)}</text>`).join('')}
    <circle cx="64" cy="447" r="9" fill="#77D61D"/><text x="88" y="458" font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="#0b1016">${escapeXml(layout.cta.benefitPrimary)}</text>
    <circle cx="64" cy="505" r="9" fill="#77D61D"/><text x="88" y="516" font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="#0b1016">${escapeXml(layout.cta.benefitSecondary)}</text>
    <rect x="48" y="586" width="584" height="100" rx="28" fill="#B7FF3C"/>
    <text x="340" y="651" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="900" fill="#07110A">${escapeXml(layout.cta.button)}</text>
    <text x="48" y="750" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#0b1016">Без регистрации • первый урок</text>
    <text x="48" y="786" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#0b1016">через 30 секунд</text>
    <text x="48" y="858" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#0b1016">${escapeXml(layout.cta.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</text>
    <image href="${heroUri}" x="690" y="105" width="330" height="390" preserveAspectRatio="xMidYMid meet"/>
    <path d="M704 552 H1018" stroke="#B7FF3C" stroke-width="12" stroke-linecap="round"/>
    <text x="704" y="620" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#384252">↓ готовая фраза</text>
    ${layout.cta.answerLines.map((line, index) => `<text x="704" y="${680 + index * 40}" font-family="Arial, sans-serif" font-size="31" font-weight="900" fill="#0b1016">${escapeXml(line)}</text>`).join('')}
    <text x="704" y="${700 + layout.cta.answerLines.length * 40}" font-family="Arial, sans-serif" font-size="22" fill="#596273">${escapeXml(layout.cta.answerRu)}</text>
  </svg>`;
  return writeArtifacts({ outputPath, layout, svg });
}

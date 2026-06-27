#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const WIDTH = 1080;
const HEIGHT = 1350;

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = true;
    }
  }
  return options;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapLine(line, maxChars) {
  const words = line.split(/\s+/).filter(Boolean);
  const result = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      result.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) result.push(current);
  return result;
}

function wrapText(value, maxChars) {
  return String(value)
    .split("\n")
    .flatMap((line) => wrapLine(line, maxChars));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function headlineSizeFor(lines, text) {
  const compact = String(text).replace(/\s+/g, "");
  if (lines.length <= 3 && compact.length <= 48) return 66;
  if (lines.length <= 4) return 60;
  if (lines.length <= 5) return 54;
  return 48;
}

function textLines(lines, x, y, fontSize, fill, weight = 900, lineHeightRatio = 1.08) {
  const lineHeight = Math.round(fontSize * lineHeightRatio);
  return lines
    .map((line, index) => {
      return `<text x="${x}" y="${y + index * lineHeight}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}" font-family="Arial, Helvetica, sans-serif">${escapeXml(line)}</text>`;
    })
    .join("\n");
}

function overlaySvg(carousel, slide, isLightText = true) {
  const lines = wrapText(slide.overlayText, 19);
  const fontSize = headlineSizeFor(lines, slide.overlayText);
  const headlineLineHeight = Math.round(fontSize * 1.08);
  const subLines = slide.subText ? wrapText(slide.subText, 35) : [];
  const subFontSize = subLines.length >= 5 ? 31 : 34;
  const subLineHeight = Math.round(subFontSize * 1.26);
  const totalTextHeight =
    lines.length * headlineLineHeight + (subLines.length > 0 ? 38 + subLines.length * subLineHeight : 0);
  const textY = clamp(HEIGHT - 118 - totalTextHeight, 575, 810);
  const textColor = isLightText ? "#FFFFFF" : "#0E1116";
  const mutedColor = isLightText ? "#EEF3FA" : "#273142";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
      <linearGradient id="bottomShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#000000" stop-opacity="0" />
        <stop offset="0.28" stop-color="#000000" stop-opacity="0.22" />
        <stop offset="0.58" stop-color="#000000" stop-opacity="0.64" />
        <stop offset="1" stop-color="#000000" stop-opacity="0.88" />
      </linearGradient>
      <linearGradient id="leftShade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#000000" stop-opacity="0.54" />
        <stop offset="0.66" stop-color="#000000" stop-opacity="0.12" />
        <stop offset="1" stop-color="#000000" stop-opacity="0" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="7" stdDeviation="11" flood-color="#000000" flood-opacity="0.58" />
      </filter>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bottomShade)" />
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#leftShade)" />
    <g filter="url(#shadow)">
      ${textLines(lines, 68, textY, fontSize, textColor, 900, 1.08)}
      ${subLines.length > 0 ? textLines(subLines, 68, textY + lines.length * headlineLineHeight + 38, subFontSize, mutedColor, 760, 1.26) : ""}
    </g>
  </svg>`;
}

async function renderSlide(backgroundPath, outputPath, carousel, slide) {
  const overlay = Buffer.from(overlaySvg(carousel, slide, true));
  await sharp(backgroundPath)
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "center" })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toFile(outputPath);
}

async function renderContactSheet(imagePaths, outputPath) {
  const thumbW = 270;
  const thumbH = 338;
  const gap = 18;
  const columns = 3;
  const rows = Math.ceil(imagePaths.length / columns);
  const width = columns * thumbW + (columns + 1) * gap;
  const height = rows * thumbH + (rows + 1) * gap;
  const composites = [];

  for (let index = 0; index < imagePaths.length; index += 1) {
    const input = await sharp(imagePaths[index]).resize(thumbW, thumbH).png().toBuffer();
    const col = index % columns;
    const row = Math.floor(index / columns);
    composites.push({
      input,
      left: gap + col * (thumbW + gap),
      top: gap + row * (thumbH + gap),
    });
  }

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: "#E7EBF3",
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const date = options.date || "2026-06-26";
  const carouselId = options.carousel || "brc_001_netflix_understand_life_zero_words";
  const dir = path.join(REPO_ROOT, "docs", "reports", "buyer-radar", date);
  const pack = JSON.parse(fs.readFileSync(path.join(dir, "carousel_pack_001.json"), "utf8"));
  const carousel = pack.carousels.find((item) => item.carouselId === carouselId);
  if (!carousel) throw new Error(`Carousel not found: ${carouselId}`);

  const root = path.join(dir, "dalle_final", carouselId);
  const backgroundDir = path.join(root, "backgrounds");
  const outputDir = path.join(root, "slides");
  fs.mkdirSync(outputDir, { recursive: true });

  const rendered = [];
  for (const slide of carousel.slides) {
    const backgroundPath = path.join(backgroundDir, `slide_${String(slide.slide).padStart(2, "0")}_background.png`);
    if (!fs.existsSync(backgroundPath)) {
      throw new Error(`Missing background: ${path.relative(REPO_ROOT, backgroundPath)}`);
    }
    const outputPath = path.join(outputDir, `slide_${String(slide.slide).padStart(2, "0")}.png`);
    await renderSlide(backgroundPath, outputPath, carousel, slide);
    rendered.push(outputPath);
  }

  await renderContactSheet(rendered, path.join(root, "CONTACT_SHEET.png"));

  const manifest = {
    carouselId,
    status: carousel.status || "dalle_final_ready_editorial_bible",
    rule:
      "Each slide uses a unique DALL-E image generated through Codex. Only article copy is overlaid; no visible pipeline label, CTA button, or corner brand stamp is drawn on the slides. The final slide may mention the Phraseman bio link as part of the article copy.",
    editorialBible: "docs/pipelines/buyer-radar-editorial-bible.ru.md",
    generatedAt: new Date().toISOString(),
    backgrounds: carousel.slides.map((slide) =>
      path.relative(REPO_ROOT, path.join(backgroundDir, `slide_${String(slide.slide).padStart(2, "0")}_background.png`)).replace(/\\/g, "/"),
    ),
    slides: rendered.map((item) => path.relative(REPO_ROOT, item).replace(/\\/g, "/")),
  };
  fs.writeFileSync(path.join(root, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`Rendered DALL-E final carousel: ${carouselId}`);
  console.log(`Slides: ${rendered.length}`);
  console.log(`Output: ${path.relative(REPO_ROOT, outputDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

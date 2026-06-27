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

function wrapText(text, maxChars) {
  return String(text)
    .split("\n")
    .flatMap((line) => wrapLine(line, maxChars));
}

function fontSizeFor(lines, rawText) {
  const length = String(rawText).replace(/\s+/g, "").length;
  if (lines.length <= 2 && length <= 34) return 96;
  if (lines.length <= 3 && length <= 58) return 82;
  if (lines.length <= 4) return 72;
  return 62;
}

function textBlock(lines, x, y, fontSize, color, weight = 900) {
  const lineHeight = Math.round(fontSize * 1.04);
  return lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight;
      return `<text x="${x}" y="${y + dy * index}" font-size="${fontSize}" font-weight="${weight}" fill="${color}" font-family="Arial, Helvetica, sans-serif">${escapeXml(line)}</text>`;
    })
    .join("\n");
}

function theme(index) {
  const themes = [
    {
      bg: "#F5F7FB",
      text: "#0E1116",
      muted: "#465160",
      accent: "#B9F227",
      accentText: "#07110A",
      secondary: "#335CFF",
      danger: "#FF4D4D",
    },
    {
      bg: "#11151E",
      text: "#FFFFFF",
      muted: "#C9D1DE",
      accent: "#B9F227",
      accentText: "#07110A",
      secondary: "#6FA8FF",
      danger: "#FF6868",
    },
    {
      bg: "#FFF7F2",
      text: "#121014",
      muted: "#5F5651",
      accent: "#B9F227",
      accentText: "#07110A",
      secondary: "#FF4D4D",
      danger: "#FF4D4D",
    },
    {
      bg: "#EDF2FF",
      text: "#0B1020",
      muted: "#46506A",
      accent: "#B9F227",
      accentText: "#07110A",
      secondary: "#335CFF",
      danger: "#FF4D4D",
    },
  ];
  return themes[index % themes.length];
}

function decorativeSvg(colors, slide, index) {
  const isDark = colors.bg === "#11151E";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(14,17,22,0.06)";
  const panelFill = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.62)";
  const lineFill = isDark ? "rgba(255,255,255,0.20)" : "rgba(14,17,22,0.16)";
  const accentOpacity = isDark ? "0.88" : "0.95";
  const secondaryOpacity = isDark ? "0.42" : "0.28";

  const layout = slide.layout || "";
  let mock = "";
  if (layout.includes("split") || layout.includes("two_column")) {
    mock = `
      <rect x="112" y="150" width="360" height="310" rx="34" fill="${panelFill}" />
      <rect x="608" y="150" width="360" height="310" rx="34" fill="${lineFill}" />
      <circle cx="288" cy="305" r="74" fill="${colors.accent}" opacity="0.62" />
      <path d="M672 320 C736 230 816 230 890 320" stroke="${colors.danger}" stroke-width="20" fill="none" opacity="0.58" />
    `;
  } else if (layout.includes("cta")) {
    mock = `
      <path d="M275 215 C455 110 735 165 782 355 C815 490 670 595 520 560" stroke="${colors.accent}" stroke-width="34" fill="none" opacity="0.9" />
      <rect x="245" y="495" width="590" height="112" rx="28" fill="${colors.accent}" opacity="${accentOpacity}" />
    `;
  } else if (layout.includes("phrase") || layout.includes("blocks") || layout.includes("contrast")) {
    mock = [0, 1, 2]
      .map((n) => `<rect x="${235 + n * 36}" y="${190 + n * 92}" width="570" height="64" rx="22" fill="${colors.accent}" opacity="${0.92 - n * 0.12}" />`)
      .join("\n");
  } else if (layout.includes("microphone") || layout.includes("fear")) {
    mock = `
      <circle cx="540" cy="290" r="96" fill="${panelFill}" />
      <circle cx="540" cy="290" r="148" fill="none" stroke="${colors.danger}" stroke-width="24" opacity="0.35" />
      <rect x="498" y="390" width="84" height="180" rx="42" fill="${colors.text}" opacity="${isDark ? "0.55" : "0.2"}" />
    `;
  } else if (layout.includes("minimal_dark")) {
    mock = `
      <rect x="260" y="190" width="560" height="250" rx="40" fill="${panelFill}" />
      <path d="M340 315 C430 250 548 378 640 300 C695 254 740 270 782 310" stroke="${colors.accent}" stroke-width="24" fill="none" opacity="0.65" />
    `;
  } else {
    mock = `
      <rect x="210" y="155" width="660" height="360" rx="48" fill="${panelFill}" />
      <rect x="290" y="250" width="500" height="28" rx="14" fill="${lineFill}" />
      <rect x="290" y="310" width="420" height="28" rx="14" fill="${lineFill}" />
      <rect x="290" y="370" width="305" height="28" rx="14" fill="${lineFill}" />
    `;
  }

  return `
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${colors.bg}" />
    <defs>
      <pattern id="grid-${index}" width="46" height="46" patternUnits="userSpaceOnUse">
        <path d="M 46 0 L 0 0 0 46" fill="none" stroke="${gridColor}" stroke-width="2"/>
      </pattern>
      <filter id="blur-${index}">
        <feGaussianBlur stdDeviation="16" />
      </filter>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid-${index})" opacity="0.8" />
    <circle cx="930" cy="360" r="250" fill="${colors.accent}" opacity="0.46" filter="url(#blur-${index})" />
    <circle cx="110" cy="230" r="210" fill="${colors.secondary}" opacity="${secondaryOpacity}" filter="url(#blur-${index})" />
    <circle cx="920" cy="1120" r="190" fill="${colors.danger}" opacity="0.16" filter="url(#blur-${index})" />
    ${mock}
  `;
}

function slideSvg(carousel, slide, globalIndex) {
  const colors = theme(globalIndex);
  const lines = wrapText(slide.overlayText, 18);
  const fontSize = fontSizeFor(lines, slide.overlayText);
  const top = lines.length >= 4 ? 760 : 830;
  const subLines = slide.subText ? wrapText(slide.subText, 25) : [];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    ${decorativeSvg(colors, slide, globalIndex)}
    ${textBlock(lines, 72, top, fontSize, colors.text)}
    ${subLines.length > 0 ? textBlock(subLines, 72, top + lines.length * Math.round(fontSize * 1.04) + 40, 38, colors.muted, 800) : ""}
  </svg>`;
}

async function renderSlide(carousel, slide, globalIndex, outputPath) {
  const svg = slideSvg(carousel, slide, globalIndex);
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

async function renderContactSheet(imagePaths, outputPath) {
  const thumbW = 270;
  const thumbH = 338;
  const gap = 18;
  const columns = 6;
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
  const dir = path.join(REPO_ROOT, "docs", "reports", "buyer-radar", date);
  const packPath = path.join(dir, "carousel_pack_001.json");
  const outputRoot = path.join(dir, "rendered", "carousel_pack_001");
  const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
  fs.mkdirSync(outputRoot, { recursive: true });

  const allImages = [];
  let globalIndex = 0;
  for (const carousel of pack.carousels) {
    const carouselDir = path.join(outputRoot, carousel.carouselId);
    fs.mkdirSync(carouselDir, { recursive: true });
    for (const slide of carousel.slides) {
      globalIndex += 1;
      const outputPath = path.join(carouselDir, `slide_${String(slide.slide).padStart(2, "0")}.png`);
      await renderSlide(carousel, slide, globalIndex, outputPath);
      allImages.push(outputPath);
    }
  }

  const contactSheetPath = path.join(outputRoot, "CONTACT_SHEET.png");
  await renderContactSheet(allImages, contactSheetPath);

  console.log(`Rendered ${allImages.length} slides`);
  console.log(`Contact sheet: ${path.relative(REPO_ROOT, contactSheetPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

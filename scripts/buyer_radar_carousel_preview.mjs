#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(value) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function slideMarkup(carousel, slide, index) {
  const theme = index % 4;
  return `
    <article class="slide theme-${theme}">
      <div class="scene">
        <div class="orb orb-a"></div>
        <div class="orb orb-b"></div>
        <div class="noise"></div>
        <div class="mock ${escapeHtml(slide.layout)}">
          ${mockMarkup(slide.layout)}
        </div>
      </div>
      <div class="copy">
        <h2>${textToHtml(slide.overlayText)}</h2>
        ${slide.subText ? `<p class="sub">${textToHtml(slide.subText)}</p>` : ""}
      </div>
    </article>`;
}

function mockMarkup(layout) {
  if (layout.includes("split") || layout.includes("two_column")) {
    return `<div class="panel left"></div><div class="panel right"></div>`;
  }
  if (layout.includes("cta")) {
    return `<div class="path"></div><div class="cta-pill"></div>`;
  }
  if (layout.includes("phrase") || layout.includes("blocks")) {
    return `<div class="block-stack"><i></i><i></i><i></i></div>`;
  }
  if (layout.includes("microphone") || layout.includes("fear")) {
    return `<div class="face"></div><div class="pulse"></div>`;
  }
  return `<div class="card-shape"></div><div class="tiny-bars"><i></i><i></i><i></i></div>`;
}

function renderHtml(pack) {
  const nav = pack.carousels
    .map((carousel) => `<a href="#${slugify(carousel.carouselId)}">${escapeHtml(carousel.title)}</a>`)
    .join("");

  const sections = pack.carousels
    .map((carousel) => {
      const slides = carousel.slides.map((slide, index) => slideMarkup(carousel, slide, index)).join("\n");
      return `
        <section class="carousel" id="${slugify(carousel.carouselId)}">
          <header class="carousel-head">
            <p>${escapeHtml(carousel.painClusterId)} / ${escapeHtml(carousel.campaignId)}</p>
            <h1>${escapeHtml(carousel.title)}</h1>
            <div class="meta">
              <span>${escapeHtml(carousel.visualConcept)}</span>
              <span>${escapeHtml(carousel.cta)}</span>
            </div>
          </header>
          <div class="slides">${slides}</div>
          <details>
            <summary>DALL-E prompts</summary>
            <ol>
              ${carousel.slides
                .map((slide) => `<li><strong>Slide ${slide.slide}</strong><br />${escapeHtml(slide.dallePrompt)}</li>`)
                .join("")}
            </ol>
          </details>
        </section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Research Carousel Pack 001</title>
  <style>
    :root {
      --bg: #f5f7fb;
      --text: #0e1116;
      --muted: #5c6675;
      --ink: #15171c;
      --accent: #b9f227;
      --accent-text: #07110a;
      --blue: #335cff;
      --red: #ff4d4d;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: #e7ebf3;
      color: var(--text);
      font-family: Inter, Arial, system-ui, sans-serif;
    }

    .top {
      position: sticky;
      top: 0;
      z-index: 10;
      padding: 18px 24px;
      background: rgba(245, 247, 251, 0.92);
      border-bottom: 1px solid rgba(14, 17, 22, 0.12);
      backdrop-filter: blur(12px);
    }

    .top h1 {
      margin: 0 0 10px;
      font-size: 22px;
      letter-spacing: 0;
    }

    .top nav {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .top a {
      color: var(--text);
      text-decoration: none;
      border: 1px solid rgba(14, 17, 22, 0.16);
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      background: #fff;
    }

    .carousel {
      max-width: 1560px;
      margin: 0 auto;
      padding: 42px 24px;
    }

    .carousel-head {
      margin-bottom: 18px;
    }

    .carousel-head p {
      margin: 0 0 6px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .carousel-head h1 {
      margin: 0;
      font-size: clamp(28px, 4vw, 54px);
      line-height: 1.02;
      letter-spacing: 0;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
    }

    .meta span {
      background: #fff;
      border: 1px solid rgba(14, 17, 22, 0.12);
      border-radius: 8px;
      padding: 10px 12px;
      color: #263141;
      font-weight: 700;
    }

    .slides {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 18px;
      align-items: start;
    }

    .slide {
      position: relative;
      aspect-ratio: 4 / 5;
      overflow: hidden;
      border-radius: 0;
      background: var(--bg);
      box-shadow: 0 18px 45px rgba(23, 31, 45, 0.16);
    }

    .scene {
      position: absolute;
      inset: 0;
      overflow: hidden;
      background:
        linear-gradient(135deg, rgba(255,255,255,0.9), rgba(245,247,251,0.55)),
        radial-gradient(circle at 12% 10%, rgba(185,242,39,0.5), transparent 32%),
        radial-gradient(circle at 88% 14%, rgba(51,92,255,0.28), transparent 26%);
    }

    .theme-1 .scene {
      background:
        linear-gradient(135deg, rgba(14,17,22,0.95), rgba(47,55,70,0.82)),
        radial-gradient(circle at 78% 14%, rgba(185,242,39,0.45), transparent 28%);
    }

    .theme-2 .scene {
      background:
        linear-gradient(135deg, rgba(255,255,255,0.95), rgba(236,239,245,0.85)),
        radial-gradient(circle at 18% 15%, rgba(255,77,77,0.28), transparent 30%);
    }

    .theme-3 .scene {
      background:
        linear-gradient(135deg, rgba(247,249,252,0.95), rgba(226,233,246,0.9)),
        radial-gradient(circle at 85% 82%, rgba(51,92,255,0.26), transparent 32%);
    }

    .orb {
      position: absolute;
      border-radius: 999px;
      filter: blur(3px);
      opacity: 0.95;
    }

    .orb-a {
      width: 38%;
      height: 38%;
      background: rgba(185, 242, 39, 0.9);
      right: -9%;
      bottom: 16%;
    }

    .orb-b {
      width: 28%;
      height: 28%;
      background: rgba(51, 92, 255, 0.72);
      left: -8%;
      top: 14%;
    }

    .noise {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(90deg, rgba(14,17,22,0.06) 1px, transparent 1px),
        linear-gradient(rgba(14,17,22,0.05) 1px, transparent 1px);
      background-size: 28px 28px;
      opacity: 0.36;
    }

    .mock {
      position: absolute;
      inset: 10% 9% auto;
      height: 38%;
      border-radius: 18px;
      border: 2px solid rgba(14,17,22,0.14);
      background: rgba(255,255,255,0.36);
      backdrop-filter: blur(8px);
    }

    .theme-1 .mock {
      border-color: rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.08);
    }

    .card-shape {
      position: absolute;
      inset: 16% 12%;
      border-radius: 16px;
      background: rgba(255,255,255,0.72);
      border: 1px solid rgba(14,17,22,0.12);
    }

    .tiny-bars {
      position: absolute;
      left: 18%;
      right: 18%;
      bottom: 18%;
      display: grid;
      gap: 8px;
    }

    .tiny-bars i {
      display: block;
      height: 10px;
      border-radius: 10px;
      background: rgba(14,17,22,0.18);
    }

    .panel {
      position: absolute;
      top: 14%;
      bottom: 14%;
      width: 38%;
      border-radius: 16px;
      background: rgba(255,255,255,0.58);
    }

    .panel.left { left: 9%; }
    .panel.right { right: 9%; background: rgba(14,17,22,0.18); }

    .block-stack {
      position: absolute;
      left: 18%;
      right: 18%;
      top: 17%;
      display: grid;
      gap: 12px;
    }

    .block-stack i {
      display: block;
      height: 34px;
      border-radius: 10px;
      background: var(--accent);
      box-shadow: 0 10px 20px rgba(7,17,10,0.16);
    }

    .face {
      position: absolute;
      width: 72px;
      height: 72px;
      left: calc(50% - 36px);
      top: 20%;
      border-radius: 50%;
      background: rgba(255,255,255,0.75);
      border: 2px solid rgba(14,17,22,0.14);
    }

    .pulse {
      position: absolute;
      width: 120px;
      height: 120px;
      left: calc(50% - 60px);
      top: 13%;
      border-radius: 50%;
      border: 10px solid rgba(255,77,77,0.28);
    }

    .path {
      position: absolute;
      left: 22%;
      top: 14%;
      width: 54%;
      height: 58%;
      border: 14px solid var(--accent);
      border-left-color: transparent;
      border-bottom-color: transparent;
      border-radius: 999px;
      transform: rotate(18deg);
    }

    .cta-pill {
      position: absolute;
      left: 18%;
      right: 18%;
      bottom: 16%;
      background: var(--accent);
      color: var(--accent-text);
      border-radius: 10px;
      padding: 12px;
      text-align: center;
      font-weight: 900;
    }

    .copy {
      position: absolute;
      left: 26px;
      right: 26px;
      bottom: 68px;
    }

    .eyebrow {
      margin: 0 0 10px;
      color: var(--blue);
      font-weight: 900;
      font-size: 11px;
      text-transform: uppercase;
    }

    .theme-1 .eyebrow,
    .theme-1 .copy h2,
    .theme-1 .sub,
    .theme-1 .footer {
      color: #fff;
    }

    .copy h2 {
      margin: 0;
      color: var(--text);
      font-size: clamp(28px, 9vw, 50px);
      line-height: 0.96;
      letter-spacing: 0;
      font-weight: 950;
    }

    .sub {
      margin: 12px 0 0;
      font-size: 17px;
      line-height: 1.18;
      color: #263141;
      font-weight: 800;
    }

    .footer {
      position: absolute;
      left: 26px;
      right: 26px;
      bottom: 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--text);
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
    }

    details {
      margin-top: 18px;
      background: #fff;
      border: 1px solid rgba(14,17,22,0.12);
      border-radius: 8px;
      padding: 14px 16px;
    }

    summary {
      cursor: pointer;
      font-weight: 900;
    }

    li {
      margin: 12px 0;
      line-height: 1.45;
      color: #263141;
    }

    @media (max-width: 720px) {
      .carousel { padding: 30px 14px; }
      .slides { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="top">
    <h1>Research Carousel Pack 001</h1>
    <nav>${nav}</nav>
  </header>
  ${sections}
</body>
</html>`;
}

function renderMarkdown(pack) {
  const lines = [];
  lines.push(`# Research Carousel Pack 001`);
  lines.push("");
  lines.push(`Date: ${pack.date}`);
  lines.push(`Status: ${pack.status}`);
  lines.push("");
  lines.push("## Design");
  lines.push("");
  lines.push(`Format: ${pack.designSystem.format}`);
  lines.push(`Style: ${pack.designSystem.style}`);
  lines.push("");
  lines.push("Principles:");
  for (const principle of pack.designSystem.principles) {
    lines.push(`- ${principle}`);
  }
  lines.push("");

  for (const carousel of pack.carousels) {
    lines.push(`## ${carousel.title}`);
    lines.push("");
    lines.push(`Carousel ID: \`${carousel.carouselId}\``);
    lines.push(`Pain cluster: \`${carousel.painClusterId}\``);
    lines.push(`Campaign ID: \`${carousel.campaignId}\``);
    lines.push(`Content variant: \`${carousel.contentVariantId}\``);
    lines.push("");
    lines.push(`Visual concept: ${carousel.visualConcept}`);
    lines.push("");
    lines.push(`Caption: ${carousel.caption}`);
    lines.push("");
    lines.push(`CTA: ${carousel.cta}`);
    lines.push("");
    lines.push("Slides:");
    lines.push("");
    for (const slide of carousel.slides) {
      lines.push(`### Slide ${slide.slide}`);
      lines.push("");
      lines.push("Overlay:");
      lines.push("");
      lines.push("```text");
      lines.push(slide.overlayText);
      if (slide.subText) {
        lines.push("");
        lines.push(slide.subText);
      }
      lines.push("```");
      lines.push("");
      lines.push(`Layout: \`${slide.layout}\``);
      lines.push("");
      lines.push("DALL-E background prompt:");
      lines.push("");
      lines.push("```text");
      lines.push(slide.dallePrompt);
      lines.push("```");
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const date = options.date || "2026-06-26";
  const dir = path.join(REPO_ROOT, "docs", "reports", "buyer-radar", date);
  const packPath = path.join(dir, "carousel_pack_001.json");
  const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));

  const htmlPath = path.join(dir, "BUYER_RADAR_CAROUSEL_PREVIEW_001.html");
  const markdownPath = path.join(dir, "BUYER_RADAR_CAROUSEL_PACK_001.md");

  fs.writeFileSync(htmlPath, renderHtml(pack), "utf8");
  fs.writeFileSync(markdownPath, renderMarkdown(pack), "utf8");

  console.log(`Wrote ${path.relative(REPO_ROOT, markdownPath)}`);
  console.log(`Wrote ${path.relative(REPO_ROOT, htmlPath)}`);
}

main();

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
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }
  return options;
}

function normalize(value) {
  return String(value ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function slideText(slide) {
  return `${slide.overlayText || ""}\n${slide.subText || ""}`;
}

function hasLanguageContext(text) {
  return /(язык|языки|иностранн|английск|реч|говор|разговор|слова|слово|фраз|голос)/i.test(text);
}

function hasClosingContradiction(text) {
  return /(но|снова|завтра|можешь|промолч|молч|противореч|останется|не станет|потерять)/i.test(text);
}

function validateCarousel(carousel) {
  const errors = [];
  const warnings = [];
  const slides = Array.isArray(carousel.slides) ? carousel.slides : [];

  if (slides.length < 6) {
    errors.push("needs at least 6 slides for the editorial arc");
  }

  const first = slides[0];
  const last = slides[slides.length - 1];
  if (!first) {
    errors.push("missing first slide");
  } else {
    const firstText = slideText(first);
    if (!hasLanguageContext(firstText)) {
      errors.push("first slide does not instantly signal language learning");
    }
    if (/^\s*парадокс/i.test(first.overlayText || "")) {
      errors.push('first slide starts with abstract "Парадокс" instead of concrete language context');
    }
  }

  if (!last) {
    errors.push("missing last slide");
  } else {
    const lastText = slideText(last);
    if (!lastText.includes("Ссылка на приложение Phraseman — в био")) {
      errors.push('last slide must contain exact CTA: "Ссылка на приложение Phraseman — в био"');
    }
    if (!hasClosingContradiction(lastText)) {
      errors.push("last slide lacks a closing contradiction or cost-of-inaction");
    }
  }

  const bannedPatterns = [
    /\bпросто\b/i,
    /\bлегко\b/i,
    /\bэффективн/i,
    /\bпрокач/i,
    /\bлайфхак/i,
    /\bтоп[-\s]?\d*/i,
    /\bсекрет/i,
    /\bмотивац/i,
    /\bуникальн/i,
    /\bинновационн/i,
    /полезный контент/i,
  ];

  for (const slide of slides) {
    const text = slideText(slide);
    if (/BUYER RADAR/i.test(text)) {
      errors.push(`slide ${slide.slide} contains visible pipeline label`);
    }
    for (const pattern of bannedPatterns) {
      if (pattern.test(text)) {
        errors.push(`slide ${slide.slide} contains banned weak wording: ${pattern}`);
      }
    }
  }

  for (const slide of slides.slice(0, -1)) {
    if (/Phraseman/i.test(slideText(slide))) {
      warnings.push(`slide ${slide.slide} mentions Phraseman before the closing slide`);
    }
  }

  return { errors, warnings };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const date = options.date || "2026-06-26";
  const packName = options.pack || "carousel_pack_001.json";
  const packPath = path.join(REPO_ROOT, "docs", "reports", "buyer-radar", date, packName);
  if (!fs.existsSync(packPath)) {
    throw new Error(`Missing carousel pack: ${path.relative(REPO_ROOT, packPath)}`);
  }

  const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
  const carousels = Array.isArray(pack.carousels) ? pack.carousels : [];
  const allErrors = [];
  const allWarnings = [];

  for (const carousel of carousels) {
    const result = validateCarousel(carousel);
    for (const error of result.errors) {
      allErrors.push(`${carousel.carouselId || "unknown"}: ${error}`);
    }
    for (const warning of result.warnings) {
      allWarnings.push(`${carousel.carouselId || "unknown"}: ${warning}`);
    }
  }

  console.log(`BUYER RADAR editorial gate for ${date}`);
  console.log(`Carousel pack: ${path.relative(REPO_ROOT, packPath)}`);
  console.log(`Carousels checked: ${carousels.length}`);

  if (allWarnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    allWarnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (allErrors.length > 0) {
    console.error("");
    console.error("Errors:");
    allErrors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("OK: editorial bible gate passed.");
}

main();

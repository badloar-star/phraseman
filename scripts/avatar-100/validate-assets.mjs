#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SIZE = 512;
const HEX_VIEWBOX = [[50, 3.5], [93, 26], [93, 74], [50, 96.5], [7, 74], [7, 26]];
const SAFE_SCALE = 0.92;
const FILE_PATTERN = /^custom-idea-(\d{2,3})-(black|white)\.(png|webp)$/i;

export function hexAt(scale) {
  return HEX_VIEWBOX.map(([x, y]) => [
    SIZE / 2 + (x * SIZE / 100 - SIZE / 2) * scale,
    SIZE / 2 + (y * SIZE / 100 - SIZE / 2) * scale,
  ]);
}

export function inPoly(poly, px, py) {
  let inside = false;
  for (let index = 0, previous = poly.length - 1; index < poly.length; previous = index, index += 1) {
    const [xi, yi] = poly[index];
    const [xj, yj] = poly[previous];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

const SAFE_HEX = hexAt(SAFE_SCALE);

export async function checkFile(filePath) {
  const name = path.basename(filePath);
  const errors = [];
  const bytes = fs.statSync(filePath).size;
  if (/\.webp$/i.test(name) && bytes > 50_000) {
    errors.push(`WebP exceeds 50 KB hard limit: ${bytes} bytes`);
  }

  let decoded;
  try {
    const metadata = await sharp(filePath).metadata();
    if (metadata.width !== SIZE || metadata.height !== SIZE) {
      errors.push(`Expected 512x512; got ${metadata.width}x${metadata.height}`);
    }
    if (!metadata.hasAlpha) errors.push('Missing alpha channel');
    decoded = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  } catch (error) {
    errors.push(`Image decode failed: ${error instanceof Error ? error.message : String(error)}`);
    return { name, filePath, bytes, errors, alpha: null, width: null, height: null };
  }

  const { data, info } = decoded;
  let visible = 0;
  let outsideSafe = 0;
  let opaqueCorners = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  let colorSamples = 0;
  const alpha = Buffer.alloc(info.width * info.height);

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const pixelOffset = (y * info.width + x) * info.channels;
      const alphaValue = data[pixelOffset + 3] ?? 0;
      alpha[y * info.width + x] = alphaValue;
      if (alphaValue <= 10) continue;
      visible += 1;
      if (!inPoly(SAFE_HEX, x + 0.5, y + 0.5)) outsideSafe += 1;
      if ((x < 20 || x >= info.width - 20) && (y < 20 || y >= info.height - 20)) {
        opaqueCorners += 1;
      }
      if (alphaValue > 200) {
        red += data[pixelOffset];
        green += data[pixelOffset + 1];
        blue += data[pixelOffset + 2];
        colorSamples += 1;
      }
    }
  }

  if (visible === 0) errors.push('Artwork is fully transparent');
  if (outsideSafe > 0) errors.push(`${outsideSafe} visible pixels outside inset safe hex`);
  if (opaqueCorners > 0) errors.push(`${opaqueCorners} visible pixels in canvas corners`);

  const luma = colorSamples === 0
    ? 0
    : (0.2126 * red + 0.7152 * green + 0.0722 * blue) / colorSamples;
  if (/-black\./i.test(name) && luma > 150) errors.push(`Black variant is too light: luma ${luma.toFixed(0)}`);
  if (/-white\./i.test(name) && luma < 110) errors.push(`White variant is too dark: luma ${luma.toFixed(0)}`);

  return {
    name,
    filePath,
    bytes,
    width: info.width,
    height: info.height,
    visible,
    outsideSafe,
    luma: Number(luma.toFixed(1)),
    errors,
    alpha,
  };
}

export async function checkDirectory(targetPath) {
  const resolved = path.resolve(targetPath);
  const candidateFiles = fs.statSync(resolved).isDirectory()
    ? fs.readdirSync(resolved).filter((name) => FILE_PATTERN.test(name)).map((name) => path.join(resolved, name))
    : [resolved];
  if (candidateFiles.length === 0) throw new Error(`No avatar PNG/WebP files found in ${resolved}`);

  const results = [];
  for (const filePath of candidateFiles.sort()) results.push(await checkFile(filePath));

  const groups = new Map();
  for (const result of results) {
    const match = result.name.match(FILE_PATTERN);
    if (!match) {
      result.errors.push('Filename does not match custom-idea-(2-3 digits)-(black|white).(png|webp)');
      continue;
    }
    const key = `${match[1]}.${match[3].toLowerCase()}`;
    const group = groups.get(key) ?? {};
    group[match[2].toLowerCase()] = result;
    groups.set(key, group);
  }

  const pairResults = [];
  for (const [key, group] of groups) {
    const errors = [];
    if (!group.black || !group.white) {
      errors.push(`Missing ${group.black ? 'white' : 'black'} partner for ${key}`);
    } else if (!group.black.alpha || !group.white.alpha || !group.black.alpha.equals(group.white.alpha)) {
      errors.push(`Alpha masks differ for ${key}`);
    }
    if (errors.length > 0) pairResults.push({ name: `pair:${key}`, errors });
  }

  const publicResults = [...results, ...pairResults].map(({ alpha: _alpha, ...result }) => result);
  const rejected = publicResults.filter((result) => result.errors.length > 0).length;
  return { checked: results.length, rejected, results: publicResults };
}

function parseCli(args) {
  const target = args[0];
  const jsonIndex = args.indexOf('--json');
  if (!target || jsonIndex < 0 || !args[jsonIndex + 1] || args.length !== 3) {
    throw new Error('Usage: node scripts/avatar-100/validate-assets.mjs <file-or-dir> --json <report.json>');
  }
  return { target, reportPath: path.resolve(args[jsonIndex + 1]) };
}

async function main() {
  const { target, reportPath } = parseCli(process.argv.slice(2));
  const report = await checkDirectory(target);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  for (const result of report.results) {
    process.stdout.write(`${result.errors.length === 0 ? 'OK' : 'FAIL'} ${result.name}${result.errors.length ? `: ${result.errors.join('; ')}` : ''}\n`);
  }
  process.stdout.write(`avatar-100 validation: checked=${report.checked} rejected=${report.rejected}\n`);
  process.exitCode = report.rejected === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

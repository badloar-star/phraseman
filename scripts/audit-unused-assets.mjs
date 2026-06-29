#!/usr/bin/env node
// Audit unused bundled image assets.
//
// Why this works: the app wires every image via a STATIC require() path string
// (verified — no dynamic/template asset requires). So an image under assets/images/**
// is "used" iff its path-tail or basename appears verbatim in source under the dirs
// listed in SRC_DIRS. Raw generation sources (*sources*, dalle_sources, singles, …)
// are excluded — they are not bundled and must be kept.
//
// Usage:
//   node scripts/audit-unused-assets.mjs            # report only
//   node scripts/audit-unused-assets.mjs --json      # machine-readable list
//   node scripts/audit-unused-assets.mjs --delete    # delete unused (asks nothing; back up first!)
//
// See AGENTS.md -> "New Theme / Per-Theme Asset Hygiene".

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const RAW_RE = /(sources?|singles|dalle|originals|drafts|_raw|raw_)/i;
const SRC_DIRS = ['app', 'components', 'constants', 'hooks', 'contexts', 'lib', 'modules', 'plugins', 'scripts'];
const SRC_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.cjs', '.mjs']);
const CONFIG_FILES = ['app.json', 'app.config.js', 'app.config.ts', 'eas.json', 'package.json'];

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const doDelete = args.includes('--delete');

function walkImages(dir, acc) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkImages(p, acc);
    else if (IMG_EXT.has(path.extname(e.name).toLowerCase())) acc.push(p.split(path.sep).join('/'));
  }
}

let HAY = '';
function readSrc(dir) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name === 'node_modules' || e.name === '.git') continue; readSrc(p); }
    else if (SRC_EXT.has(path.extname(e.name).toLowerCase())) { try { HAY += '\n' + fs.readFileSync(p, 'utf8'); } catch {} }
  }
}

const assets = [];
walkImages(path.join(ROOT, 'assets/images'), assets);
for (const d of SRC_DIRS) readSrc(path.join(ROOT, d));
for (const f of CONFIG_FILES) { try { HAY += '\n' + fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch {} }
HAY = HAY.replace(/\\/g, '/');

const unused = [];
for (const a of assets) {
  if (RAW_RE.test(a)) continue;
  const tail = a.slice(a.indexOf('assets/images'));
  const base = a.split('/').pop();
  const baseNoExt = base.replace(/\.[^.]+$/, '');
  const used = HAY.includes(tail) || HAY.includes(base) || (baseNoExt.length >= 5 && HAY.includes(baseNoExt));
  if (!used) unused.push(a);
}

const size = (p) => { try { return fs.statSync(p).size; } catch { return 0; } };
const bytes = unused.reduce((s, p) => s + size(p), 0);

if (asJson) {
  console.log(JSON.stringify({ count: unused.length, bytes, files: unused.map((p) => p.replace(ROOT.replace(/\\/g, '/') + '/', '')) }, null, 2));
} else {
  const bundled = assets.filter((a) => !RAW_RE.test(a)).length;
  console.log(`bundled images (excl. raw/sources): ${bundled}`);
  console.log(`UNUSED: ${unused.length} = ${(bytes / 1048576).toFixed(2)} MB`);
  for (const p of unused.map((p) => ({ p, s: size(p) })).sort((a, b) => b.s - a.s).slice(0, 40)) {
    console.log(`${(p.s / 1024).toFixed(0).padStart(6)} KB  ${p.p.replace(ROOT.replace(/\\/g, '/') + '/', '')}`);
  }
  if (unused.length > 40) console.log(`… and ${unused.length - 40} more (use --json for the full list)`);
}

if (doDelete) {
  let del = 0, fail = 0;
  for (const a of unused) { try { fs.unlinkSync(a); del++; } catch { fail++; } }
  console.error(`\ndeleted ${del}, failed ${fail} (back up before running --delete!)`);
}

process.exit(0);

#!/usr/bin/env node
// зачем (координатор 22.10, ускорение первого кадра Главной): герой «Сцены» показывается в 160 dp (≈ 480 px на экране 3×), а владелец
// рисует его 1024×1024 — декодировать вчетверо больше пикселей на первом кадре незачем. Скрипт делает копии 512 px рядом с оригиналами
// (assets/images/v2art/hero512/{dark,light}/), манифест с sha256 оригинала и копии и реестр require для Metro. Оригиналы НЕ трогает —
// владелец кладёт туда новые. Папка hero512 вне dark/light: генератор оригиналов и сторожа v2art читают только dark/light.
// Запуск: node scripts/gen_home_hero_512.mjs          — пересобрать (перекодирует только изменившиеся оригиналы)
//         node scripts/gen_home_hero_512.mjs --force  — перекодировать все копии заново
//         node scripts/gen_home_hero_512.mjs --check  — только проверить актуальность по хэшам (ничего не пишет; выход 1 при расхождении)
// Владелец положил новый 1024 → сначала node scripts/gen_themed_art_assets.mjs (реестр оригиналов), потом этот скрипт.
// Governance-ID: TG-20E426BE8A5D
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOG = '[HOME-HERO-512]';
export const HERO_512_SIZE = 512;
const NAME_RE = /^(home_scene_[a-z0-9_]+)(\.accent)?\.webp$/;
const WEBP = Object.freeze({ quality: 90, alphaQuality: 100, effort: 5 });
const BRIGHTNESSES = ['dark', 'light'];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artDir = path.join(root, 'assets', 'images', 'v2art');
const outDir = path.join(artDir, 'hero512');
const manifestFile = path.join(outDir, 'manifest.json');
const registryFile = path.join(root, 'components', 'home', 'v2', 'scene', 'home_scene_hero512.generated.ts');
const rel = (file) => path.relative(root, file).split(path.sep).join('/');
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const lf = (text) => text.replace(/\r\n/g, '\n');

/** Оригиналы героя: [{ key: 'dark/home_scene_x.webp', brightness, file, name, accent, src }]. */
function listOriginals() {
  const out = [];
  for (const brightness of BRIGHTNESSES) {
    const dir = path.join(artDir, brightness);
    if (!fs.existsSync(dir)) {
      console.log(`${LOG} нет папки ${rel(dir)} — пропуск`);
      continue;
    }
    for (const file of fs.readdirSync(dir).sort()) {
      const m = NAME_RE.exec(file);
      if (m) out.push({ key: `${brightness}/${file}`, brightness, file, name: m[1], accent: Boolean(m[2]), src: path.join(dir, file) });
    }
  }
  return out;
}

/** Копии, что лежат в hero512 сейчас: Set<'dark/home_scene_x.webp'>. */
function listCopies() {
  const out = new Set();
  for (const brightness of BRIGHTNESSES) {
    const dir = path.join(outDir, brightness);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) if (file.endsWith('.webp')) out.add(`${brightness}/${file}`);
  }
  return out;
}

function readManifest() {
  if (!fs.existsSync(manifestFile)) return { size: HERO_512_SIZE, webp: WEBP, files: {} };
  try {
    return JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  } catch (error) {
    console.error(`${LOG} манифест не читается, собираю заново: ${error instanceof Error ? error.message : String(error)}`);
    return { size: HERO_512_SIZE, webp: WEBP, files: {} };
  }
}

const SLOT_ORDER = (entry) => `${entry.name}|${entry.brightness === 'dark' ? 0 : 1}|${entry.accent ? 1 : 0}`;

/** Текст реестра из записей манифеста — один и тот же для сборки и для --check. */
export function registryText(files) {
  const byName = new Map();
  for (const key of Object.keys(files).sort()) {
    const m = /^(dark|light)\/(home_scene_[a-z0-9_]+)(\.accent)?\.webp$/.exec(key);
    if (!m) continue;
    const entry = { brightness: m[1], name: m[2], accent: Boolean(m[3]), key };
    if (!byName.has(entry.name)) byName.set(entry.name, []);
    byName.get(entry.name).push(entry);
  }
  const lines = [...byName.keys()].sort().map((name) => {
    const slots = byName.get(name).sort((a, b) => SLOT_ORDER(a).localeCompare(SLOT_ORDER(b)));
    const parts = slots.map((e) => `${e.brightness}${e.accent ? 'Accent' : ''}: require('../../../../assets/images/v2art/hero512/${e.key}')`);
    return `  ${name}: { ${parts.join(', ')} },`;
  });
  return [
    '// АВТОГЕНЕРАЦИЯ: node scripts/gen_home_hero_512.mjs — руками не править.',
    '// Копии героя «Сцены» Главной 512 px (оригиналы 1024 — в themed_art_assets.generated.ts); манифест с sha256 —',
    '// assets/images/v2art/hero512/manifest.json. Metro подключает картинки только статическим require.',
    "import type { ThemedArtSlots } from '../../../theme/themed_art_registry';",
    '',
    'export const HOME_HERO_512: Readonly<Partial<Record<string, ThemedArtSlots>>> = {',
    ...lines,
    '};',
    '',
  ].join('\n');
}

const manifestText = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`;

/** --check: только хэши и тексты, без перекодирования. Возвращает список расхождений. */
function check() {
  const problems = [];
  const manifest = readManifest();
  const originals = listOriginals();
  const expected = new Set(originals.map((o) => o.key));
  for (const o of originals) {
    const entry = manifest.files?.[o.key];
    if (!entry) { problems.push(`${o.key}: нет копии 512 в манифесте`); continue; }
    const srcHash = sha256(fs.readFileSync(o.src));
    if (entry.sourceSha256 !== srcHash) problems.push(`${o.key}: оригинал изменился (манифест ${String(entry.sourceSha256).slice(0, 12)}…, файл ${srcHash.slice(0, 12)}…)`);
    const copy = path.join(outDir, o.key);
    if (!fs.existsSync(copy)) { problems.push(`${o.key}: файла копии нет`); continue; }
    const copyHash = sha256(fs.readFileSync(copy));
    if (entry.sha256 !== copyHash) problems.push(`${o.key}: копия не совпадает с манифестом`);
  }
  for (const key of Object.keys(manifest.files ?? {})) if (!expected.has(key)) problems.push(`${key}: в манифесте, но оригинала нет`);
  for (const key of listCopies()) if (!expected.has(key)) problems.push(`${key}: копия-сирота без оригинала`);
  const registry = fs.existsSync(registryFile) ? lf(fs.readFileSync(registryFile, 'utf8')) : '';
  if (registry !== registryText(manifest.files ?? {})) problems.push(`${rel(registryFile)}: реестр не совпадает с манифестом`);
  return problems;
}

async function build(force) {
  const { default: sharp } = await import('sharp');
  const previous = readManifest();
  const files = {};
  let encoded = 0;
  let kept = 0;
  for (const o of listOriginals()) {
    const srcBuf = fs.readFileSync(o.src);
    const srcHash = sha256(srcBuf);
    const copy = path.join(outDir, o.key);
    const old = previous.files?.[o.key];
    if (!force && old && old.sourceSha256 === srcHash && fs.existsSync(copy) && sha256(fs.readFileSync(copy)) === old.sha256) {
      files[o.key] = old;
      kept += 1;
      continue;
    }
    const meta = await sharp(srcBuf).metadata();
    if (meta.width !== 1024 || meta.height !== 1024) console.warn(`${LOG} ${o.key}: оригинал ${meta.width}×${meta.height}, ожидался 1024×1024 — уменьшаю как есть`);
    const { data, info } = await sharp(srcBuf)
      .resize({ width: HERO_512_SIZE, height: HERO_512_SIZE, fit: 'inside', withoutEnlargement: true })
      .webp(WEBP)
      .toBuffer({ resolveWithObject: true });
    fs.mkdirSync(path.dirname(copy), { recursive: true });
    fs.writeFileSync(copy, data);
    files[o.key] = {
      source: rel(o.src),
      sourceSha256: srcHash,
      sourceWidth: meta.width,
      sourceHeight: meta.height,
      sourceBytes: srcBuf.length,
      sha256: sha256(data),
      width: info.width,
      height: info.height,
      bytes: data.length,
    };
    encoded += 1;
    console.log(`${LOG} ${o.key}: ${meta.width}×${meta.height} ${Math.round(srcBuf.length / 1024)} КБ → ${info.width}×${info.height} ${Math.round(data.length / 1024)} КБ`);
  }
  let removed = 0;
  for (const key of listCopies()) {
    if (files[key]) continue;
    fs.rmSync(path.join(outDir, key), { force: true });
    removed += 1;
    console.log(`${LOG} ${key}: оригинала нет — копия удалена`);
  }
  const manifest = { size: HERO_512_SIZE, webp: WEBP, files };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(manifestFile, manifestText(manifest));
  fs.writeFileSync(registryFile, registryText(files));
  console.log(`${LOG} готово: перекодировано ${encoded}, без изменений ${kept}, удалено сирот ${removed}; манифест ${rel(manifestFile)}, реестр ${rel(registryFile)}`);
}

const samePath = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);
const isMain = Boolean(process.argv[1]) && samePath(path.resolve(process.argv[1]), fileURLToPath(import.meta.url));
if (isMain) {
  const args = new Set(process.argv.slice(2));
  if (args.has('--check')) {
    const problems = check();
    if (problems.length > 0) {
      for (const p of problems) console.error(`${LOG} ${p}`);
      console.error(`${LOG} не актуально (${problems.length}) — пересобрать: node scripts/gen_home_hero_512.mjs`);
      process.exit(1);
    }
    console.log(`${LOG} актуально`);
  } else {
    build(args.has('--force')).catch((error) => {
      console.error(`${LOG} сбой: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      process.exit(1);
    });
  }
}

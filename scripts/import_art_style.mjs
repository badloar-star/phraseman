#!/usr/bin/env node
// зачем ([R1-PAGE] координатор 15.10): приёмка выбранного владельцем стиля арта ОДНОЙ командой.
//   node scripts/import_art_style.mjs <код стиля> [--dry-run]
// Источник — ART_STYLE_FOR_CODEX/trials/<код>/{dark,light}/<имя>.webp и <имя>.accent.webp. Файл сжимается до ≤ 400 КБ (webp q≈85, при нужде ниже),
// проверяется сторожем [THEMED-ART-GUARD] (настоящая альфа), копируется в assets/images/v2art/{dark,light}/, затем запускается gen_themed_art_assets.mjs.
// «Всё или ничего»: если хоть один файл не прошёл сторож — ничего не записывается. Заменяемые файлы сохраняются в ART_STYLE_FOR_CODEX/_backup/<код>-<время>/.
// --dry-run только печатает, что заменится. Скрытые опции для теста: --src-root, --dest-root, --no-gen.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ART_MAX_BYTES, checkArtFile, knownNames } from './gen_themed_art_assets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUALITIES = [85, 80, 74, 68, 62, 56, 50, 44];
const LOG = '[ART-IMPORT]';

// зачем: на Windows удаление временной папки может дать EPERM (файл ещё держит sharp) — это не повод ронять приёмку
function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch (error) { console.warn(`${LOG} временная папка ${dir} не удалена: ${error instanceof Error ? error.message : String(error)}`); }
}

function option(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

/** Слой .accent красится через tintColor: должен быть БЕЛЫМ силуэтом и не пустым. Пустой — отказ; не белый — предупреждение (цвет темы исказится). */
async function accentStats(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  let visible = 0;
  let white = 0;
  for (let i = 0; i < total; i += 1) {
    if (data[i * 4 + 3] > 24) { visible += 1; if (data[i * 4] > 235 && data[i * 4 + 1] > 235 && data[i * 4 + 2] > 235) white += 1; }
  }
  return { visiblePct: (visible / total) * 100, whitePct: visible ? (white / visible) * 100 : 0 };
}

/** Сжатие до лимита: сперва исходник как есть (если уже ≤ лимита и webp), иначе webp q85 и ниже. */
async function compress(file) {
  const original = fs.readFileSync(file);
  if (original.length <= ART_MAX_BYTES) return { buf: original, quality: null, from: original.length };
  for (const quality of QUALITIES) {
    const buf = await sharp(original).webp({ quality, alphaQuality: 100, effort: 5 }).toBuffer();
    if (buf.length <= ART_MAX_BYTES) return { buf, quality, from: original.length };
  }
  return { buf: null, quality: null, from: original.length };
}

export async function importStyle({ style, srcRoot, destRoot, dryRun, gen }) {
  const styleDir = path.join(srcRoot, 'trials', style);
  if (!fs.existsSync(styleDir)) {
    const known = fs.existsSync(path.join(srcRoot, 'trials')) ? fs.readdirSync(path.join(srcRoot, 'trials')).join(', ') : '(папки trials нет)';
    throw new Error(`${LOG} стиль «${style}» не найден в ${styleDir}. Доступны: ${known}`);
  }
  const names = knownNames();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'art-import-'));
  const plan = [];
  const problems = [];
  for (const brightness of ['dark', 'light']) {
    const dir = path.join(styleDir, brightness);
    if (!fs.existsSync(dir)) { console.warn(`${LOG} нет папки ${brightness} у стиля ${style}`); continue; }
    for (const file of fs.readdirSync(dir).sort()) {
      const m = file.match(/^([a-z0-9_]+)(\.accent)?\.webp$/);
      if (!m) { console.warn(`${LOG} пропуск ${brightness}/${file}: имя не <имя>[.accent].webp`); continue; }
      if (!names.has(m[1])) { console.warn(`${LOG} пропуск ${brightness}/${file}: имя «${m[1]}» нет в реестре THEMED_ART_NAMES`); continue; }
      const src = path.join(dir, file);
      const packed = await compress(src);
      if (!packed.buf) { problems.push(`${brightness}/${file}: не сжимается до ${ART_MAX_BYTES / 1024} КБ даже при q=${QUALITIES[QUALITIES.length - 1]} (исходник ${Math.round(packed.from / 1024)} КБ)`); continue; }
      const tmp = path.join(tmpDir, `${brightness}-${file}`);
      fs.writeFileSync(tmp, packed.buf);
      const verdict = await checkArtFile(tmp);
      if (!verdict.ok) { problems.push(`${brightness}/${file}: ${verdict.reason}`); continue; }
      const notes = [];
      if (m[2]) {
        const stats = await accentStats(tmp);
        if (stats.visiblePct < 0.2) { problems.push(`${brightness}/${file}: слой accent пустой (видно ${stats.visiblePct.toFixed(2)} % кадра)`); continue; }
        if (stats.whitePct < 60) notes.push(`⚠ accent не белый силуэт (белого ${stats.whitePct.toFixed(0)} % видимого) — tintColor исказит цвет темы`);
        if (stats.visiblePct > 45) notes.push(`⚠ accent занимает ${stats.visiblePct.toFixed(0)} % кадра — «одна деталь» превращается в заливку`);
      }
      const dest = path.join(destRoot, brightness, file);
      plan.push({ notes, brightness, file, dest, tmp, bytes: packed.buf.length, from: packed.from, quality: packed.quality, replaces: fs.existsSync(dest) });
    }
  }
  for (const item of plan) {
    console.log(`${LOG} ${dryRun ? '[dry-run] ' : ''}${item.replaces ? 'ЗАМЕНИТ' : 'ДОБАВИТ'} ${item.brightness}/${item.file}: ${Math.round(item.from / 1024)} → ${Math.round(item.bytes / 1024)} КБ${item.quality ? ` (webp q${item.quality})` : ' (без пересжатия)'}${item.notes.length ? `  ${item.notes.join('; ')}` : ''}`);
  }
  for (const problem of problems) console.error(`[THEMED-ART-GUARD] отказ: ${problem}`);
  console.log(`${LOG} итого: ${plan.length} файл(ов) к записи (${plan.filter((p) => p.replaces).length} замен), ${problems.length} отказ(ов)`);
  if (problems.length > 0) { cleanup(tmpDir); throw new Error(`${LOG} приёмка остановлена: ${problems.length} файл(ов) не прошли проверку — ничего не записано`); }
  if (!dryRun) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(srcRoot, '_backup', `${style}-${stamp}`);
    for (const item of plan) {
      if (item.replaces) {
        fs.mkdirSync(path.join(backupDir, item.brightness), { recursive: true });
        fs.copyFileSync(item.dest, path.join(backupDir, item.brightness, item.file));
      }
      fs.mkdirSync(path.dirname(item.dest), { recursive: true });
      fs.copyFileSync(item.tmp, item.dest);
    }
    console.log(`${LOG} записано ${plan.length} файл(ов) в ${path.relative(root, destRoot) || destRoot}${plan.some((p) => p.replaces) ? `; прежние версии → ${path.relative(root, backupDir)}` : ''}`);
    if (gen) execFileSync(process.execPath, [path.join(root, 'scripts', 'gen_themed_art_assets.mjs')], { cwd: root, stdio: 'inherit' });
  }
  cleanup(tmpDir);
  return plan;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const style = process.argv.slice(2).find((arg, i, all) => !arg.startsWith('--') && !['--src-root', '--dest-root'].includes(all[i - 1] ?? ''));
  if (!style) { console.error(`Использование: node scripts/import_art_style.mjs <код стиля, например S3_pearl> [--dry-run]`); process.exit(2); }
  try {
    await importStyle({
      style,
      srcRoot: path.resolve(option('--src-root') ?? path.join(root, 'ART_STYLE_FOR_CODEX')),
      destRoot: path.resolve(option('--dest-root') ?? path.join(root, 'assets', 'images', 'v2art')),
      dryRun: process.argv.includes('--dry-run'),
      gen: !process.argv.includes('--no-gen'),
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

#!/usr/bin/env node
// Размерный аудит webp: пиксели файла vs максимальный размер отображения в коде.
//
// зачем: Фаза 4 «Бандл-диеты» (docs/plans/2026-08-24-bundle-diet-plan.md) —
// найти картинки, зашитые в бандл крупнее, чем их когда-либо рисует UI.
// compress-bundled-assets.mjs жмёт всё под общий потолок 512px; этот аудит
// точнее — для каждого require()-ного webp берёт максимальный width/height/size
// (в dp) из требующих его модулей и сравнивает с пикселями файла ×3 (@3x).
// Только отчёт, файлы НЕ трогает: пережатие — отдельным решением по списку.
//
// Usage:
//   node scripts/audit_webp_display_sizes.mjs            # markdown-отчёт в stdout
//   node scripts/audit_webp_display_sizes.mjs --json     # машиночитаемый JSON
//
// Особый режим дерева 2026-08-24: параллельная сессия ведёт зачистку ассетов
// (asset-hygiene-safe.mjs), поэтому каждый файл помечается git-статусом —
// «занятые» (M/D/??) файлы из рекомендаций к пережатию исключаются.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AS_JSON = process.argv.includes('--json');

const SOURCE_ROOTS = ['app', 'components', 'constants', 'hooks', 'lib', 'modules'];
const SOURCE_EXT = /\.(?:ts|tsx|js|jsx)$/;
const SKIP_SOURCE = /(?:\.test\.|__tests__|\.d\.ts$)/;

// Дисплейные dp выше ширины телефона — почти всегда не размер картинки
// (анимационные значения, проценты, ширины экрана), их не учитываем.
const MAX_PLAUSIBLE_DP = 480;
// Пережимать имеет смысл только с запасом: меньший фактор — шум/страховка.
const OVERSIZE_FACTOR = 1.3;
const SCALE = 3; // @3x — худший случай плотности

// Контрактные тесты требуют точную геометрию — не предлагать ресайз
// (список согласован с compress-bundled-assets.mjs).
const FIXED_GEOMETRY_DIRS = [
  'assets/images/levels/league-v6-icons/',
  'assets/images/weekly_compass_icons/',
];
// Кандидаты на CDN — решение владельца отдельно; в рекомендации не включаем.
const CDN_CANDIDATE_DIRS = [
  'assets/images/achievements/',
  'assets/images/avatar-auras/',
  'assets/images/streak_icons/',
];

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const inDirs = (relPath, dirs) => dirs.some((d) => relPath.startsWith(d));

function walkSources(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      walkSources(full, out);
    } else if (SOURCE_EXT.test(e.name) && !SKIP_SOURCE.test(full)) {
      out.push(full);
    }
  }
  return out;
}

// Максимальный правдоподобный dp-размер, упомянутый в модуле.
function maxDisplayDpOf(source) {
  const patterns = [
    /\bwidth\s*[:=]\s*(\d{2,3})\b/g,
    /\bheight\s*[:=]\s*(\d{2,3})\b/g,
    /\b[a-zA-Z_]*[sS]ize\s*[:=]\s*(\d{2,3})\b/g,
    /\b[A-Z_]*(?:SIZE|WIDTH|HEIGHT)\b\s*=\s*(\d{2,3})\b/g,
  ];
  let max = 0;
  for (const re of patterns) {
    for (const m of source.matchAll(re)) {
      const v = Number(m[1]);
      if (v >= 16 && v <= MAX_PLAUSIBLE_DP && v > max) max = v;
    }
  }
  return max || null;
}

// зачем: porcelain схлопывает полностью untracked-каталог в «?? dir/» — поэтому
// точного Map.get(file) мало, нужен и префиксный матч по каталожным записям.
function gitStatusLookup() {
  const exact = new Map();
  const dirPrefixes = [];
  try {
    const out = execFileSync('git', ['status', '--porcelain', '--', 'assets'], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    for (const line of out.split('\n')) {
      if (!line.trim()) continue;
      const code = line.slice(0, 2).trim();
      const file = line.slice(3).trim().replace(/^"|"$/g, '').replace(/\\/g, '/');
      if (file.endsWith('/')) dirPrefixes.push([file, code]);
      else exact.set(file, code);
    }
  } catch {
    // без git работаем как есть — все файлы считаем чистыми
  }
  return (relPath) =>
    exact.get(relPath) ?? dirPrefixes.find(([p]) => relPath.startsWith(p))?.[1];
}

const sources = SOURCE_ROOTS.flatMap((r) => walkSources(path.join(ROOT, r), []));
const requireRe = /require\(\s*['"]([^'"]+?\.webp)['"]\s*\)/g;

/** @type {Map<string, {requiredBy: Set<string>, maxDp: number|null}>} */
const assets = new Map();
for (const src of sources) {
  const text = fs.readFileSync(src, 'utf8');
  const matches = [...text.matchAll(requireRe)];
  if (matches.length === 0) continue;
  const moduleDp = maxDisplayDpOf(text);
  for (const m of matches) {
    const resolved = rel(path.resolve(path.dirname(src), m[1]));
    const entry = assets.get(resolved) ?? { requiredBy: new Set(), maxDp: null };
    entry.requiredBy.add(rel(src));
    if (moduleDp !== null && (entry.maxDp === null || moduleDp > entry.maxDp)) {
      entry.maxDp = moduleDp;
    }
    assets.set(resolved, entry);
  }
}

const statusOf = gitStatusLookup();
const rows = [];
let missingOnDisk = 0;
for (const [assetPath, info] of assets) {
  const abs = path.join(ROOT, assetPath);
  if (!fs.existsSync(abs)) {
    missingOnDisk++;
    continue; // удалено зачисткой параллельной сессии — аудировать нечего
  }
  const bytes = fs.statSync(abs).size;
  let width = null;
  let height = null;
  try {
    const meta = await sharp(abs).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
  } catch {
    // нечитаемый файл попадёт в отчёт с неизвестными размерами
  }
  const longSide = Math.max(width ?? 0, height ?? 0) || null;
  const targetPx = info.maxDp !== null ? info.maxDp * SCALE : null;
  const factor = longSide && targetPx ? longSide / targetPx : null;
  const estBytesAfter =
    factor && factor > 1 ? Math.round(bytes / (factor * factor)) : bytes;
  rows.push({
    asset: assetPath,
    bytes,
    width,
    height,
    maxDp: info.maxDp,
    targetPx,
    factor: factor ? Number(factor.toFixed(2)) : null,
    estSavingBytes: factor && factor >= OVERSIZE_FACTOR ? bytes - estBytesAfter : 0,
    gitStatus: statusOf(assetPath) ?? 'clean',
    fixedGeometry: inDirs(assetPath, FIXED_GEOMETRY_DIRS),
    cdnCandidate: inDirs(assetPath, CDN_CANDIDATE_DIRS),
    requiredBy: [...info.requiredBy].sort(),
  });
}

const kb = (b) => `${(b / 1024).toFixed(1)} КБ`;
const mb = (b) => `${(b / (1024 * 1024)).toFixed(2)} МБ`;
const totalBytes = rows.reduce((a, r) => a + r.bytes, 0);

const oversized = rows
  .filter((r) => r.factor !== null && r.factor >= OVERSIZE_FACTOR)
  .sort((a, b) => b.estSavingBytes - a.estSavingBytes);
const safeToResize = oversized.filter(
  (r) => r.gitStatus === 'clean' && !r.fixedGeometry && !r.cdnCandidate,
);
const unknownDp = rows
  .filter((r) => r.maxDp === null)
  .sort((a, b) => b.bytes - a.bytes);

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        requiredWebpCount: assets.size,
        onDiskCount: rows.length,
        missingOnDisk,
        totalBytes,
        oversizedCount: oversized.length,
        safeToResizeCount: safeToResize.length,
        estSavingBytesSafe: safeToResize.reduce((a, r) => a + r.estSavingBytes, 0),
        rows,
      },
      null,
      2,
    ),
  );
} else {
  const line = (r) =>
    `| ${r.asset} | ${kb(r.bytes)} | ${r.width}×${r.height} | ${r.maxDp ?? '?'}dp → ${r.targetPx ?? '?'}px | ×${r.factor ?? '?'} | ${kb(r.estSavingBytes)} | ${r.gitStatus}${r.cdnCandidate ? ' · CDN-кандидат' : ''}${r.fixedGeometry ? ' · фикс. геометрия' : ''} |`;
  console.log(`# Размерный аудит require()-ных webp — ${new Date().toISOString().slice(0, 10)}`);
  console.log('');
  console.log(`- require()-ных webp в коде: **${assets.size}**, на диске: **${rows.length}** (${missingOnDisk} удалено зачисткой)`);
  console.log(`- суммарный вес на диске: **${mb(totalBytes)}**`);
  console.log(`- oversized (×${OVERSIZE_FACTOR}+ против @3x-отображения): **${oversized.length}**`);
  console.log(`- из них безопасно пережать сейчас (git-чистые, вне контрактов и CDN-кандидатов): **${safeToResize.length}**, оценка экономии **${mb(safeToResize.reduce((a, r) => a + r.estSavingBytes, 0))}**`);
  console.log('');
  console.log('## Oversized (по убыванию экономии)');
  console.log('');
  console.log('| Файл | Вес | Пиксели | Отображение | Фактор | Экономия | Статус |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of oversized) console.log(line(r));
  console.log('');
  console.log('## Размер отображения не определён (нужны глаза)');
  console.log('');
  console.log('| Файл | Вес | Пиксели | Требуют |');
  console.log('|---|---|---|---|');
  for (const r of unknownDp) {
    console.log(`| ${r.asset} | ${kb(r.bytes)} | ${r.width}×${r.height} | ${r.requiredBy.join('<br>')} |`);
  }
}

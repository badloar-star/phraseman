// зачем (координатор 11.10, решение владельца D145 «шрифты 16/13 главнее макета»): общий сканер типографики по экранам,
// которые входят в СТОР-сборку. Используется скриптом аудита (scripts/audit_typography_store_surface.mjs) и сторожем
// tests/typography_store_surface_ratchet.test.mjs. Поверхность считается по настоящему графу импортов от маршрутов,
// которые пропускает стор-ветка router.ctx.js, — а не по списку папок, который устаревает.
import fs from 'node:fs';
import path from 'node:path';
import { storeRouteRegexFromRouterCtx } from '../../scripts/store_release_surface.mjs';

const EXTS = ['.tsx', '.ts', '.jsx', '.js'];
// не входят в стор-сборку или не видны пользователю (решения владельца: Learning V2 и Шпиль вырезаны/скрыты, арена удалена, дев-витрины)
export const OUT_OF_SCOPE = [
  /learning[_-]v2/i, /(^|\/)spire\//i, /(^|\/)spire_/i, /arena/i, /(^|\/)dev\//, /(^|\/)dev-/, /_dev_/, /dev_hub/i, /motion_showcase/,
  /modes_showcase/, /_preview\.tsx$/, /_smoke\.tsx$/, /DevBotsSheet/, /TabBarHybridPreview/, /\.test\./, /(^|\/)tests\//, /(^|\/)graphify-out\//,
  // онбординг не трогаем — решение владельца (как в tests/typography_two_sizes_ratchet.test.mjs)
  /onboarding/i, /CleanOnboarding/,
];

const IMPORT_RE = /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;

function resolveModule(root, fromFile, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(root, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  const candidates = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => path.join(base, 'index' + e))];
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile() && EXTS.includes(path.extname(c))) return c;
    } catch { /* нет такого файла — пробуем следующий вариант */ }
  }
  return null;
}

function routeFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.tsx')) out.push(p);
    }
  };
  walk(path.join(root, 'app'));
  return out;
}

/** Файлы, достижимые по импортам от маршрутов стор-ветки; относительные пути со слэшами. */
export function collectStoreSurfaceFiles(root) {
  const regex = storeRouteRegexFromRouterCtx(root);
  if (!regex) throw new Error('[TYPO-SURFACE] router.ctx.js: регулярка стор-режима не найдена');
  const rel = (f) => path.relative(root, f).split(path.sep).join('/');
  const queue = routeFiles(root).filter((f) => regex.test(`./${rel(f).slice('app/'.length)}`));
  const seen = new Set();
  while (queue.length) {
    const file = queue.pop();
    const r = rel(file);
    if (seen.has(r) || OUT_OF_SCOPE.some((re) => re.test(r))) continue;
    seen.add(r);
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(IMPORT_RE)) {
      const target = resolveModule(root, file, m[1]);
      if (target) queue.push(target);
    }
  }
  return [...seen].sort();
}

const lineOf = (src, index) => src.slice(0, index).split('\n').length;
const lineText = (src, index) => {
  const start = src.lastIndexOf('\n', index) + 1;
  const end = src.indexOf('\n', index);
  return src.slice(start, end === -1 ? undefined : end);
};
const isComment = (text) => /^\s*(\/\/|\*|\/\*)/.test(text);
// исключения помечаются в коде рядом со строкой: `d145-micro: <причина>` (микроцифры) или `typo-exempt: <причина>`
const EXEMPT = /(?:d145-micro|typo-exempt):\s*\S/;

/**
 * @returns {{ tiny: object[], offScale: object[], lineHeight: object[], fit: object[], thickBorder: object[] }}
 * tiny — fontSize < 13; offScale — 14/15/17/18 и дробные (19+ — заголовки по макетам, 13/16 — шкала);
 * lineHeight — отношение к fontSize < 1.25 в одном литерале стиля; fit — adjustsFontSizeToFit; thickBorder — рамка > 1.
 */
export function scanSource(src) {
  const out = { tiny: [], offScale: [], lineHeight: [], fit: [], thickBorder: [] };
  const push = (bucket, index, extra) => {
    const text = lineText(src, index);
    if (isComment(text) || EXEMPT.test(text)) return;
    out[bucket].push({ line: lineOf(src, index), text: text.trim().slice(0, 140), ...extra });
  };
  for (const m of src.matchAll(/fontSize:\s*([0-9]+(?:\.[0-9]+)?)\b/g)) {
    const size = Number(m[1]);
    if (size < 13) push('tiny', m.index, { size });
    else if (size !== 13 && size !== 16 && size < 19) push('offScale', m.index, { size });
  }
  for (const m of src.matchAll(/\{[^{}]*\}/g)) {
    const block = m[0];
    const fs_ = /fontSize:\s*([0-9]+(?:\.[0-9]+)?)\b/.exec(block);
    const lh = /lineHeight:\s*([0-9]+(?:\.[0-9]+)?)\b/.exec(block);
    if (!fs_ || !lh) continue;
    const size = Number(fs_[1]);
    const line = Number(lh[1]);
    // зачем: у заголовков по макетам межстрочный плотный (kit.css: 40/46, 34/40, 20/24) — «ломаным» считаем только текст до 18 pt
    if (size > 0 && size <= 18 && line / size < 1.25) push('lineHeight', m.index + block.indexOf(lh[0]), { size, lineHeightValue: line, ratio: Number((line / size).toFixed(2)) });
  }
  // только настоящее использование: не тип/не строка/не вырезание пропа (`_adjustsFontSizeToFit`, `'adjustsFontSizeToFit'`)
  for (const m of src.matchAll(/(?<![_'"A-Za-z])adjustsFontSizeToFit(?!['"A-Za-z])(?!\s*:\s*_)/g)) {
    const text = lineText(src, m.index);
    if (/зачем:/.test(text)) continue;
    push('fit', m.index, {});
  }
  for (const m of src.matchAll(/\bborder(Width|LeftWidth|RightWidth|StartWidth|EndWidth):\s*([0-9]+(?:\.[0-9]+)?)\b/g)) {
    if (Number(m[2]) > 1) push('thickBorder', m.index, { width: Number(m[2]) });
  }
  return out;
}

/** Полный проход: { file: { tiny, offScale, lineHeight, fit, thickBorder } } только для файлов с находками. */
export function auditStoreSurface(root) {
  const result = {};
  for (const file of collectStoreSurfaceFiles(root)) {
    const found = scanSource(fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'));
    if (Object.values(found).some((list) => list.length)) result[file] = found;
  }
  return result;
}

export const CATEGORIES = ['tiny', 'offScale', 'lineHeight', 'fit', 'thickBorder'];

export function countsByCategory(audit) {
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  for (const found of Object.values(audit)) for (const c of CATEGORIES) totals[c] += found[c].length;
  return totals;
}

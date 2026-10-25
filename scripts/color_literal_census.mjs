// Запуск: node scripts/color_literal_census.mjs [выход.md] — по умолчанию .codex-tmp/color-literal-census.raw.md (отчёт с ручной сводкой не трогает)
// зачем (координатор 25.10, правило владельца «каждый цвет — оттенок текущей темы»): перепись цветовых литералов в стилях app/, components/,
// modules/, которые НЕ из токенов темы и НЕ помечены theme-exempt с причиной. В отличие от сторожа tests/theme_hardcoded_colors_ratchet
// (он пропускает Главную и Learning V2 по прежним запретам), здесь смотрим ВСЁ, что видит человек, и сортируем по заметности:
// Главная → занятие → Пик → Plus → остальное. Только чтение кода; ничего не правит.
// Колонка «чей модуль» — по последнему коммиту в файле (область из заголовка коммита: fix(spire), [HOME-SCENE] …).
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// зачем (Моменты 25.10: прогон для сверки перезаписал отчёт с ручными разделами): по умолчанию пишем сырую таблицу в отдельный файл,
// а docs/work/color-literal-census-2026-10-25.md с ручной сводкой правится только руками
const OUT = process.argv[2] ?? '.codex-tmp/color-literal-census.raw.md';
const DIRS = ['app', 'components', 'modules'];

// не экран: токены и палитры тем (источник цветов), dev-витрины, тесты, админка, контент-данные
const SKIP = [
  /(^|\/)dev\//, /dev_hub/i, /DevHub/, /motion_showcase/, /_preview\.tsx?$/, /_smoke\.tsx?$/, /learning-v2-lab\//, /DevBotsSheet/,
  /\.test\./, /\.generated\./, /^app\/v2_kit_preview/, /admin/i, /\/__tests__\//,
  /learning-v2\/content\//, /^modules\/learning-v2\/(content|factory)/, /_authoring_/,
  /^app\/(lesson_data|idioms_data|theory_content|lesson_intro)/,
];
// файлы, которые САМИ являются токенами/палитрами — их литералы и есть тема
const TOKEN_FILE = /(tokens?|palette|Palette|_colors?|Colors?|theme_|Theme(Context|Palette)|glassTone|plateAlpha|ink\b|_ink\.ts$|InkTokens)/;

const NAMED = 'white|black|red|green|blue|yellow|orange|gray|grey|purple|pink|gold|silver|cyan|magenta|navy|teal';
const reHex = /(['"`])#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3,4})\1/g;
const reRgb = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/g;
const reNamed = new RegExp(`(?:[cC]olor|[fF]ill|[sS]troke|tintColor|shadowColor)\\s*[:=]\\s*\\{?\\s*['"](${NAMED})['"]`, 'g');

const AREAS = [
  ['1 · Главная', /^components\/home\/|^app\/\(tabs\)\/home\.tsx$|^app\/home_/],
  ['2 · Занятие', /learning-v2|learning_v2|LearningV2|lesson1\.tsx|lesson_prep|^modules\/learning-v2|exam_v2|workshop/i],
  ['3 · Пик', /spire/i],
  ['4 · Plus', /paywall|premium|Paywall|Premium|plus_/],
  ['5 · Карточки', /flashcards|Collection|Pack|Deck|cards/i],
  ['6 · Диалоги', /dialog/i],
  ['7 · Ошибки', /mistake/i],
  ['8 · Профиль и настройки', /profile|settings|account|Settings|Profile/],
];
const areaOf = (f) => (AREAS.find(([, re]) => re.test(f)) ?? ['9 · Прочее'])[0];

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

const rgbaOf = (c) => { const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/.exec(c); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
const hexOf = (c) => {
  const m = /^#([0-9a-f]{3,8})$/i.exec(c); if (!m) return null;
  let h = m[1]; if (h.length <= 4) h = [...h].map((x) => x + x).join('');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
};
// что это на экране — по ключу стиля на строке
function roleOf(text) {
  const k = /(shadowColor|textShadowColor|backgroundColor|borderColor|borderBottomColor|borderTopColor|tintColor|placeholderTextColor|stopColor|stroke|fill|color|colors)\b/.exec(text)?.[1];
  return ({ shadowColor: 'тень', textShadowColor: 'тень текста', backgroundColor: 'заливка', borderColor: 'обводка', borderBottomColor: 'разделитель',
    borderTopColor: 'разделитель', tintColor: 'окраска значка', placeholderTextColor: 'подсказка в поле', stopColor: 'градиент', stroke: 'линия/значок', fill: 'заливка значка',
    color: 'текст или значок', colors: 'градиент' })[k] ?? 'значение цвета';
}
// как заменить токеном
function tokenFor(color, text, file) {
  if (/\/scene\/|today_scene|HomeV2Header|spire\/scene/.test(file)) return 'чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу';
  const named = /^(white|black)$/.test(color);
  const v = named ? (color === 'white' ? { r: 255, g: 255, b: 255, a: 1 } : { r: 0, g: 0, b: 0, a: 1 }) : (rgbaOf(color) ?? hexOf(color));
  if (!v) return '— (разобрать вручную)';
  const dark = v.r < 40 && v.g < 40 && v.b < 40, white = v.r > 235 && v.g > 235 && v.b > 235, grey = Math.abs(v.r - v.g) < 14 && Math.abs(v.g - v.b) < 14;
  if (/shadowColor/.test(text)) return '`g.dropShadow` / `g.shadowTint`';
  if (dark && v.a < 1 && /(scrim|dim|backdrop|overlay|Backdrop)/i.test(text)) return '`g.scrim` / `g.scrimStrong` (или theme-exempt: затемнение)';
  if (dark && v.a < 1) return '`g.scrim` / `g.mediaScrim` (на медиа)';
  if (dark) return '`g.text` (текст) / `g.deepBase` (заливка)';
  if (white && v.a < 1) return v.a < 0.07 ? '`g.hairlineSoft`' : v.a < 0.16 ? '`g.glassEdge`' : v.a < 0.35 ? '`g.bevelHi`' : '`g.mediaInkSoft` (на медиа) / `g.text` + альфа';
  if (white) return /color\b/.test(text) ? '`g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке)' : '`g.opaqueCard`';
  if (grey) return v.a < 1 ? '`g.line` / `g.hairlineSoft`' : v.r < 90 ? '`g.opaqueControl`' : v.r < 150 ? '`g.mutedText`' : '`g.secondary`';
  if (v.r > 180 && v.g > 110 && v.b < 130 && v.r - v.g < 100) return '`g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной';
  if (v.g > v.r + 25 && v.g > v.b) return '`semanticInk(g).goodText` (текст) / `g.good` (значок)';
  if (v.r > v.g + 40 && v.r > v.b + 30) return '`semanticInk(g).badText` (текст) / `g.bad` (значок)';
  return '`g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка)';
}

const lastCommit = new Map();
function ownerOf(file) {
  if (lastCommit.has(file)) return lastCommit.get(file);
  let v = '—';
  try {
    const s = execFileSync('git', ['log', '-1', '--format=%h %cs %s', '--', file], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (s) {
      const [h, d, ...rest] = s.split(' '); const subj = rest.join(' ');
      const scope = /^\w+\(([^)]+)\)/.exec(subj)?.[1] ?? /\[([A-Z0-9-]+)\]/.exec(subj)?.[1] ?? subj.slice(0, 40);
      v = `${scope} · ${h} · ${d}`;
    }
  } catch (e) { v = `git log не прочитан: ${e instanceof Error ? e.message.slice(0, 60) : 'ошибка'}`; }
  lastCommit.set(file, v);
  return v;
}

const rows = [];
let filesScanned = 0, exemptLines = 0;
for (const dir of DIRS) for (const abs of walk(join(ROOT, dir), [])) {
  const file = relative(ROOT, abs).split(sep).join('/');
  if (SKIP.some((re) => re.test(file))) continue;
  const base = file.split('/').pop();
  if (TOKEN_FILE.test(base)) continue;
  filesScanned++;
  const lines = readFileSync(abs, 'utf8').replace(/\r\n/g, '\n').split('\n');
  let inBlock = false;
  lines.forEach((l, i) => {
    const t = l.trim();
    if (inBlock) { if (t.includes('*/')) inBlock = false; return; }
    if (t.startsWith('/*') && !t.includes('*/')) { inBlock = true; return; }
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    if (/theme-exempt:\s*\S/.test(l)) { if (reHex.test(l) || reRgb.test(l)) exemptLines++; reHex.lastIndex = 0; reRgb.lastIndex = 0; return; }
    if (/console\.(log|warn|error)/.test(l)) return; // цвет в журнале — не на экране
    const code = l.replace(/\/\/.*$/, '');
    for (const re of [reHex, reRgb, reNamed]) {
      re.lastIndex = 0; let m;
      while ((m = re.exec(code))) {
        const color = (re === reNamed ? m[1] : m[0]).replace(/^['"`]|['"`]$/g, '');
        rows.push({ area: areaOf(file), file, line: i + 1, color, role: roleOf(t), token: tokenFor(color, t, file), text: t.slice(0, 90) });
      }
    }
  });
}

const byArea = {};
for (const r of rows) byArea[r.area] = (byArea[r.area] ?? 0) + 1;
const byFile = {};
for (const r of rows) byFile[r.file] = (byFile[r.file] ?? 0) + 1;

const md = [];
md.push('# Цвета вне токенов темы — перепись по приложению (25.10.2026)', '');
md.push('Правило владельца: **каждый цвет — оттенок текущей темы**. Ниже — литералы цвета (`#…`, `rgb(a)(…)`, `white` / `black` и т. п. в стилях) в `app/`,',
  '`components/`, `modules/`, которые не взяты из токенов темы и **не** помечены `theme-exempt: <причина>`. Только изучение — код не правился.', '');
md.push('Как получено: `node scripts/color_literal_census.mjs`. Сканер — те же регулярки, что у сторожа `tests/theme_hardcoded_colors_ratchet`, но без его',
  'исключений для Главной и Learning V2. Не смотрим: файлы самих токенов и палитр (там цвета — это и есть тема), dev-витрины, тесты, админку, контент-данные,',
  'комментарии и журналы. «Чей модуль» — область из заголовка последнего коммита в файле, его хэш и дата. «Как заменить» — подсказка по цвету и роли:',
  'перед правкой владелец зоны проверяет её глазами (белый на медиа — `mediaInk`, на поверхности темы — `text` и т. д.).', '');
md.push(`**Итого:** ${rows.length} литералов в ${Object.keys(byFile).length} файлах из ${filesScanned} просмотренных; строк с пометкой theme-exempt (не считаются) — ${exemptLines}.`, '');
md.push('## По зонам (сначала самое заметное)', '', '| Зона | Литералов | Файлов |', '|---|---|---|');
for (const [a] of AREAS.concat([['9 · Прочее']])) {
  const n = byArea[a] ?? 0; if (!n) continue;
  md.push(`| ${a} | ${n} | ${new Set(rows.filter((r) => r.area === a).map((r) => r.file)).size} |`);
}
md.push('', '## Таблица', '');
const order = (a) => a.area;
let cur = '';
for (const r of rows.sort((a, b) => order(a).localeCompare(order(b)) || byFile[b.file] - byFile[a.file] || a.file.localeCompare(b.file) || a.line - b.line)) {
  if (r.area !== cur) {
    cur = r.area;
    md.push('', `### ${cur}`, '', '| Файл:строка | Цвет | Что на экране | Чей модуль (последний коммит) | Как заменить токеном |', '|---|---|---|---|---|');
  }
  md.push(`| ${r.file}:${r.line} | \`${r.color}\` | ${r.role} | ${ownerOf(r.file)} | ${r.token} |`);
}
writeFileSync(join(ROOT, OUT), `${md.join('\n')}\n`);
console.log(`[COLOR-CENSUS] ${rows.length} литералов в ${Object.keys(byFile).length} файлах (просмотрено ${filesScanned}, theme-exempt строк ${exemptLines}) → ${OUT}`);
console.log(JSON.stringify(byArea));

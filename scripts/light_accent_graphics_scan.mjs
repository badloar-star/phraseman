#!/usr/bin/env node
// зачем (координатор 12.10, находка контраста «Авроры»): у 10 градиентных тем (grad_aurora … grad_lilac) в СВЕТЛОМ оформлении сырой `accent` — пастель, на светлом фоне/карточке
// 1,0–1,8 (< 3) начиная с level ≈ 0,55–0,75. Кольца, полосы, точки, контуры состояний, иконки и текст, красящиеся сырым `accent`, там практически невидимы.
// Для светлого есть глубокие токены: текст/значок → `accentText` (≥ 4,5), графика (кольца, полосы, контуры, точки) → `accentBorder` / `progressGradient`.
// Скрипт статически обходит app/ и components/ (Learning V2 Codex — отдельным списком, без правок) и классифицирует каждое место `<объект>.accent`.
//   node scripts/light_accent_graphics_scan.mjs --json   → JSON (для сторожа)
//   node scripts/light_accent_graphics_scan.mjs --md     → таблица Markdown (для аудита)
// Пометка `light-accent-ok: причина` в строке (или `theme-exempt`) выводит место из учёта (осознанное исключение).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = ['app', 'components'];
const SKIP_PATH = /(^|\/)(dev|__tests__)(\/|$)|(^|\/)dev_|preview|\.generated\.|themed_art_assets|\.test\./i;
const CODEX_PATH = /learning[-_]v2/i;
const NOT_COLOR_OBJECTS = new Set(['part', 'daysLine', 'resolved', 'priorityCardArt', 'art', 'lessons', 'dialogs', 'spire_tile', 'intro_legacy_lessons', 'intro_cards_swipe', 'intro_cards_hub', 'slots', 'entry']);
const INK = /accentInk|ctaInk|textOnGold|onAccent|buttonForeground|inkOn/;
const FLAGGED = new Set(['text', 'icon', 'svg', 'border', 'fill-graphic', 'fill-unknown', 'gradient-graphic', 'switch', 'graphic-prop', 'pass-prop', 'alias']);
// файлы, которые САМИ строят токены/палитры из accent (определения, а не экраны): в учёт не входят
const DEFINITION_FILES = new Set(['app/flashcards/cardPackPaywallTokenTheme.ts', 'components/medalToastThemeStylesFromTokens.ts', 'components/ui/v2_theme.ts', 'app/theory_topic_accents.ts', 'components/theme/art_tint.ts', 'components/theme/themed_art_registry.ts', 'components/ScreenGradient.tsx', 'components/spire/useSpirePalette.ts', 'app/lingman_youtube_chrome.ts']);
const GRAPHIC_WORDS = /(bar|fill|dot|ring|track|thumb|progress|indicator|bullet|handle|divider|segment|marker|pip|halo|edge|stroke|tick|cursor|selection|inactive|remaining)/i;
const BUTTON_WORDS = /(btn|button|cta|fab|send|mic|chip|pill|badge|tab\b|primary|action|confirm|submit|selected|check|cell|tile|card|banner|row|option|opt\b)/i;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (entry.isDirectory()) { if (entry.name === 'node_modules' || SKIP_PATH.test(rel + '/')) continue; yield* walk(full); }
    else if (/\.(tsx|ts)$/.test(entry.name) && !SKIP_PATH.test(rel)) yield rel;
  }
}

function classify(lines, i, obj) {
  const line = lines[i];
  const win = lines.slice(Math.max(0, i - 4), i + 5).join('\n');
  const back = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
  const acc = `${obj}\\.accent\\b(?![A-Za-z])`;
  if (/light-accent-ok|theme-exempt/.test(line)) return 'exempt';
  // зачем (светлый акцент): строка уже читает accentGraphic/accentTextSafe (токены 12.10) — `?? t.accent` это лишь запасной вариант для старых тем
  if (/accentGraphic|accentTextSafe/.test(line)) return 'exempt';
  // полупрозрачная вуаль/свечение: X.accent + '1F', `${X.accent}33`, alpha(X.accent, …), shadowColor/boxShadow — не графика с контрастом
  if (new RegExp(`${acc}\\s*\\+\\s*['"\`]`).test(line) || new RegExp('\\$\\{' + obj + '\\.accent\\}[0-9A-Fa-f]{2}').test(line) || new RegExp(`(withAlpha|alpha|hexAlpha|rgba)\\([^)]*${acc}`).test(line) || /shadowColor|boxShadow|textShadow/.test(line)) return 'wash';
  if (/Ionicons|MaterialCommunityIcons|MaterialIcons|Feather|FontAwesome|AntDesign|<Icon\b/.test(back) && new RegExp(`color\\s*[=:]\\s*\\{?[^,}]*${acc}`).test(line)) return 'icon';
  if (/stroke=|fill=|stopColor|<Circle|<Path|<Rect|<Svg|<Line\b|<Polyline/.test(line) || /<(Circle|Path|Rect|Line|Polyline)\b[^>]*$/.test(lines[i - 1] ?? '')) return 'svg';
  if (/trackColor|thumbColor|ios_backgroundColor/.test(line)) return 'switch';
  if (/border(Top|Bottom|Left|Right|Start|End)?Color/.test(line)) return 'border';
  if (/colors\s*[=:]/.test(line) || (/\[/.test(line) && /LinearGradient|colors=/.test(back))) return INK.test(win) ? 'gradient-button' : 'gradient-graphic';
  if (/backgroundColor|\bbg\s*:/.test(line)) {
    if (/Progress|[Tt]humb|[Rr]ail|[Pp]ulse|Fill\b/.test(line)) return 'fill-graphic';
    if (INK.test(win)) return 'fill-button';
    const key = nearestKey(lines, i);
    if (GRAPHIC_WORDS.test(key)) return 'fill-graphic';
    if (BUTTON_WORDS.test(key)) return 'fill-button';
    return 'fill-unknown';
  }
  if (new RegExp(`\\bcolor\\s*[:=]\\s*\\{?[^,}]*${acc}`).test(line)) return 'text';
  // передача цвета в проп графики (haloColor, edgeColor, dotColor, remainingColor, tintColor, …)
  if (new RegExp(`\\b(\\w*(halo|edge|dot|ring|bar|track|thumb|progress|indicator|stroke|cursor|selection|tint|inactive|remaining|fill)\\w*)\\s*[=:]\\s*\\{?[^}]*${acc}`, 'i').test(line)) return 'graphic-prop';
  if (new RegExp(`\\b(accent|accentColor|color|highlight)\\s*=\\s*\\{[^}]*${acc}`).test(line)) return 'pass-prop';
  return 'alias';
}

/** Ближайшее имя стиля/ключа: styles.xxx в этой строке или `xxx: {` выше (до 8 строк) — по нему отличаем полосу/точку от кнопки. */
function nearestKey(lines, i) {
  const same = lines[i].match(/styles\.(\w+)/);
  if (same) return same[1];
  for (let k = i; k >= Math.max(0, i - 8); k -= 1) {
    const m = lines[k].match(/^\s*([A-Za-z_]\w*)\s*:\s*\{/) || lines[k].match(/styles\.(\w+)/) || lines[k].match(/const\s+(\w+)\s*=/);
    if (m) return m[1];
  }
  return '';
}


// зачем (координатор 13.10): в тёмном accentBorder и accentText НЕ равны accent (graphite, rose, marine, aurora…), прямое обращение к ним для графики/текста сдвигает тёмный вид.
// Разрешены только accentGraphic / accentTextSafe (в тёмном — ровно accent). Этот счётчик — храповик по текущему числу сырых обращений; пометка `light-accent-ok: причина` выводит строку из учёта.
const DEEP_ROOTS = ['app', 'components', 'hooks'];
export function scanDeep() {
  const counts = {};
  for (const base of DEEP_ROOTS) {
    const dir = path.join(root, base);
    if (!fs.existsSync(dir)) continue;
    for (const rel of walk(dir)) {
      if (DEFINITION_FILES.has(rel) || CODEX_PATH.test(rel)) continue;
      for (const line of fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/)) {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
        if (/light-accent-ok|theme-exempt/.test(line)) continue;
        const n = [...line.matchAll(/\.(accentBorder|accentText)\b/g)].length;
        if (n) counts[rel] = (counts[rel] ?? 0) + n;
      }
    }
  }
  return counts;
}

export function scan() {
  const hits = [];
  const codex = [];
  for (const base of ROOTS) {
    for (const rel of walk(path.join(root, base))) {
      if (DEFINITION_FILES.has(rel)) continue;
      const lines = fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
        const seen = new Set();
        for (const m of line.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\.accent\b(?![A-Za-z0-9_])/g)) {
          const obj = m[1];
          if (seen.has(obj)) continue;
          seen.add(obj);
          if (NOT_COLOR_OBJECTS.has(obj)) continue;
          const kind = classify(lines, i, obj);
          const row = { file: rel, line: i + 1, obj, kind, code: line.trim().slice(0, 150) };
          if (CODEX_PATH.test(rel)) codex.push(row); else hits.push(row);
        }
      });
    }
  }
  return { hits, codex };
}

const REPLACE = {
  text: '`accentText` (текст ≥ 4,5 на карточке)',
  icon: '`accentText` (значок ≥ 4,5; глубокий тон светлой темы)',
  svg: '`accentBorder` (кольцо/линия) или `progressGradient` (полоса)',
  border: '`accentBorder` (контур состояния)',
  'fill-graphic': '`accentBorder` (точка/полоса/дорожка) или `progressGradient`',
  'gradient-graphic': '`progressGradient` / [`accentBorder`, `accentBorder`]',
  switch: '`accentBorder` (дорожка включённого переключателя)',
  'fill-unknown': 'проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить',
  'graphic-prop': '`accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент)',
  'pass-prop': 'проверить получателя: график → `accentBorder`, текст/значок → `accentText`',
  alias: 'проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText`',
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { hits, codex } = scan();
  const flagged = hits.filter((h) => FLAGGED.has(h.kind));
  if (process.argv.includes('--json')) {
    const counts = {};
    for (const h of flagged) counts[h.file] = (counts[h.file] ?? 0) + 1;
    const byKind = {};
    for (const h of hits) byKind[h.kind] = (byKind[h.kind] ?? 0) + 1;
    const deepCounts = scanDeep();
    const deepTotal = Object.values(deepCounts).reduce((x, y) => x + y, 0);
    process.stdout.write(JSON.stringify({ total: flagged.length, counts, deepTotal, deepCounts, byKind, codex: codex.filter((h) => FLAGGED.has(h.kind)).length }));
  } else {
    const rank = (k) => ['text', 'icon', 'svg', 'graphic-prop', 'border', 'fill-graphic', 'gradient-graphic', 'switch', 'fill-unknown', 'pass-prop', 'alias'].indexOf(k);
    const rows = [...flagged].sort((a, b) => rank(a.kind) - rank(b.kind) || a.file.localeCompare(b.file) || a.line - b.line);
    const out = ['| файл:строка | элемент | что стоит | на что заменить |', '|---|---|---|---|'];
    for (const h of rows) out.push(`| \`${h.file}:${h.line}\` | ${h.kind} | \`${h.code.replace(/\|/g, '\\|')}\` | ${REPLACE[h.kind]} |`);
    process.stdout.write(out.join('\n') + '\n');
    const cx = codex.filter((h) => FLAGGED.has(h.kind));
    process.stdout.write(`\n<!-- codex: ${cx.length} -->\n` + cx.map((h) => `- \`${h.file}:${h.line}\` (${h.kind}) \`${h.code.replace(/\|/g, '\\|')}\``).join('\n') + '\n');
  }
}

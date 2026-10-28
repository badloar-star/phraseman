// scripts/color_literal_scan.mjs — общий сканер литералов цвета (перепись scripts/color_literal_census.mjs и ratchet tests/color_literal_census_ratchet.test.ts).
// зачем (координатор 28.10, аудит «каждый цвет — оттенок текущей темы»): перепись и страж считают ОДИНАКОВО — одни регулярки, одни исключения. Только чтение кода.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const COLOR_SCAN_DIRS = ['app', 'components', 'modules'];

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
// зачем (координатор 28.10: «исключи служебное, ассеты, dev-маршруты»): внутренние экраны проверки и витрины с «_» в имени — не экран человека
SKIP.push(/^app\/learning_v2_session_intro_check\.tsx$/, /^app\/_pos_analytics_audit\.tsx$/, /^app\/_learning_v2_modes_showcase\.tsx$/);

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

/** Все литералы цвета вне токенов и вне строк с theme-exempt: { rows: [{ file, line, color, text }], filesScanned, exemptLines }. */
export function scanColorLiterals(ROOT) {
  const DIRS = COLOR_SCAN_DIRS;
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
          rows.push({ file, line: i + 1, color, text: t });
        }
      }
    });
  }

  return { rows, filesScanned, exemptLines };
}

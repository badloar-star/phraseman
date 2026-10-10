// Сканер захардкоженных цветов в экранах и компонентах 2.0 — общий для сторожа-храповика и аудита.
// зачем (замечание владельца 10.10): цвета приложения берутся ТОЛЬКО из токенов выбранной темы
// (liquidGlassTokens / themePair / mixDark); макет «Авроры» — эталон формы и состава, а не источник HEX.
// Строка с пометкой «theme-exempt: <причина>» не считается (тёмные скримы под шторками, DEV-кнопки, запасные значения).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const SCAN_DIRS = ['app', 'components', 'modules'];

// Файлы токенов, палитр и вне-экранные зоны. Главная не трогается (запрет владельца), Learning V2 / factory_native — зона Codex.
export const SKIP_PATH = [
  /(^|\/)dev\//, /dev_hub/i, /DevHub/, /motion_showcase/, /_preview\.tsx$/, /_smoke\.tsx$/, /learning-v2-lab\//, /DevBotsSheet/,
  /onboarding/i, /CleanOnboarding/, /\.test\./, /^app\/v2_kit_preview/, /^app\/_/, /admin/i,
  /^components\/home\//, /^app\/\(tabs\)\/home\.tsx$/, /^app\/home_/,
  /learning-v2\/content\//, /factory_native/, /_authoring_/, /^modules\/learning-v2\/(content|factory)/,
  /^components\/ThemeContext/, /^components\/v2\/useV2Palette/, /^components\/mistakes-panel\/panelPaint/, /theme_ui_assets/, /color_palette/i, /Palette/,
  /^app\/theme_/, /^app\/(lesson_data|idioms_data|theory_content|lesson_intro)/,
];

const NAMED = 'white|black|red|green|blue|yellow|orange|gray|grey|purple|pink|gold|silver|cyan|magenta|navy|teal';
const reHex = /(['"`])#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3,4})\1|#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6})(?![0-9A-Za-z])/g;
const reRgb = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/g;
const reNamed = new RegExp(`(?:[cC]olor|[fF]ill|[sS]troke|tintColor|shadowColor)\\s*[:=]\\s*\\{?\\s*['"](${NAMED})['"]`, 'g');

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

/** → { 'path/file.tsx': [{ line, colors: [..], text }] } */
export function scanHardcodedColors(root) {
  const res = {};
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(root, dir), [])) {
      const rel = relative(root, file).split(sep).join('/');
      if (SKIP_PATH.some((re) => re.test(rel))) continue;
      const lines = readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
      let inBlock = false;
      lines.forEach((l, i) => {
        const t = l.trim();
        if (inBlock) { if (t.includes('*/')) inBlock = false; return; }
        if (t.startsWith('/*') && !t.includes('*/')) { inBlock = true; return; }
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
        if (/theme-exempt:\s*\S/.test(l)) return;
        const code = l.replace(/\/\/.*$/, '');
        const hits = [];
        for (const re of [reHex, reRgb, reNamed]) {
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(code))) hits.push(m[0].replace(/^['"`]|['"`]$/g, ''));
        }
        if (hits.length) (res[rel] = res[rel] || []).push({ line: i + 1, colors: hits, text: t.slice(0, 140) });
      });
    }
  }
  return res;
}

export function countByFile(scan) {
  const counts = {};
  for (const [f, rows] of Object.entries(scan)) counts[f] = rows.reduce((s, r) => s + r.colors.length, 0);
  return counts;
}

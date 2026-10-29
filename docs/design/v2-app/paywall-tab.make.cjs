// paywall-tab.make.cjs — собирает docs/design/v2-app/paywall-tab.html: макет «таб Plus в нижней панели и страница-пейвол». Движок — те же
// строки эталона peak-scene-v2.html, что у scene-home-h.make.cjs (CSS тем/сцены/таббара), снимок тем __THEMES и значков __ICODE оттуда же,
// опись реальных кадров — assets/real/scene-frames.json, русские имена тем — app/theme_display_names.ts. Пересборка: node paywall-tab.make.cjs
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'peak-scene-v2.html');
const OUT = path.join(__dirname, 'paywall-tab.html');
const L = fs.readFileSync(SRC, 'utf8').split('\n');
const RANGES = [
  [14, 15, '@font-face'], [17, 33, '/* ── темы ── */'], [35, 69, '/* ── общие детали ── */'], [71, 76, '/* аватар'],
  [78, 88, '/* плавающий таббар'], [90, 93, '/* шторка и затемнение */'], [337, 339, '.thm {'], [345, 345, '@media (prefers-reduced-motion'],
  [352, 391, '/* ── общее ── */'], [398, 428, '/* ═════ A · Сцена'],
];
const engineCss = RANGES.map(([a, b, head]) => { if (!L[a - 1].startsWith(head)) throw new Error(`[PT-MAKE] строка ${a} эталона не «${head}»: ${L[a - 1].slice(0, 60)}`); return L.slice(a - 1, b).join('\n'); }).join('\n');
const themesLine = L.find((l) => l.startsWith('<script>window.__THEMES = '));
const icodeLine = L.find((l) => l.startsWith('<script>window.__ICODE = '));
if (!themesLine || !icodeLine) throw new Error('[PT-MAKE] в эталоне нет строк __THEMES / __ICODE');
for (const f of ['paywall-tab.css', 'paywall-tab.app.js', 'scene-palettes.css', 'scene-palettes.app.js', 'dark-themes.app.js', 'spire-tower-render.js', 'kit.css', 'kit.js', 'real-frame.css', 'real-frame.js', 'scene-recolor.js', 'scene-real.js', 'scene-styles.js', 'scene-cards.js', 'scene-approved.js', 'assets/paywall-tab/diamond_mask.png', 'assets/paywall-tab/plus_sheet_now.png']) {
  if (!fs.existsSync(path.join(__dirname, f))) throw new Error(`[PT-MAKE] рядом нет ${f}`);
}
const realJson = path.join(__dirname, 'assets', 'real', 'scene-frames.json');
const realFrames = fs.existsSync(realJson) ? JSON.parse(fs.readFileSync(realJson, 'utf8')) : {};
Object.values(realFrames).forEach((r) => { delete r.mtime; });
const realLine = `<script>window.__REAL = ${JSON.stringify(realFrames)};</script>`;
const namesTs = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'app', 'theme_display_names.ts'), 'utf8'); const names = {}; namesTs.replace(/^\s*([a-z_]+): \{ ru: '([^']+)'/gm, (m, id, ru) => { names[id] = ru; return m; });
const namesLine = `<script>window.__THEME_NAMES = ${JSON.stringify(names)};</script>`;
const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Таб Plus и страница-пейвол</title>
<link rel="stylesheet" href="kit.css">
<link rel="stylesheet" href="real-frame.css">
<style>
/* движок эталона peak-scene-v2.html (скопирован сборщиком paywall-tab.make.cjs) */
${engineCss}
</style>
<link rel="stylesheet" href="scene-palettes.css">
<link rel="stylesheet" href="paywall-tab.css">
</head>
<body>
<div class="page">
  <h1 class="page-h1">Таб Plus в нижней панели — страница-пейвол</h1>
  <div class="thm sp-bar pt-bar2"><span class="sp-lbl">Тема</span><span id="ptTheme" style="display:inline-flex;gap:8px"></span><span class="sp-lbl">Оформление</span><span id="ptAp" style="display:inline-flex;gap:8px"></span><span class="sp-lbl">Кому</span><span id="ptPlan" style="display:inline-flex;gap:8px"></span></div>
  <div id="pt"></div>
  <div id="spControls" style="display:none"><span id="apList"></span><span id="modeList"></span><span id="stratList"></span></div>
  <div id="thmList" style="display:none"></div>
  <div id="root" style="display:none"></div>
</div>
<script src="kit.js"></script>
<script src="spire-tower-render.js"></script>
<script src="real-frame.js"></script>
<script src="scene-recolor.js"></script>
<script src="scene-real.js"></script>
<script src="scene-styles.js"></script>
<script src="scene-cards.js"></script>
<script src="scene-approved.js"></script>
${themesLine}
${icodeLine}
${realLine}
${namesLine}
<script src="scene-palettes.app.js"></script>
<script src="dark-themes.app.js"></script>
<script src="paywall-tab.app.js"></script>
</body>
</html>
`;
fs.writeFileSync(OUT, html);
console.log('[PT-MAKE] записан', OUT, html.length, 'байт; реальных кадров', Object.keys(realFrames).length);

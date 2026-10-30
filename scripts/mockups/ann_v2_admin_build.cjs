// ═══════════════════════════════════════════════════════════════════════════
// ann_v2_admin_build.cjs — сборка предпросмотра редактора объявлений для админки из макета (один источник истины).
//
// зачем (владелец 28.10: «все 36 должны быть добавлены в админку… точно так же, как на макете»): страница предпросмотра в админке — это
// сам макет docs/design/v2-app/stories-announcements-v1.html в режиме ?preview=1 (один телефон, содержимое из формы по postMessage),
// с путями к копиям нужных ассетов в admin/v2/assets/stories_v2/. Запуск после каждого изменения макета:
//   node scripts/mockups/ann_v2_admin_build.cjs
// Выход: admin/v2/scripts/pages/story_announcements_v2_preview.html + admin/v2/assets/stories_v2/{kit.css, spire-tower-render.js,
// fonts/*.ttf, Ionicons.ttf, coin_rank_*.webp, v2art/{dark,light}/*.webp, en_rail_1.jpg}. Никаких правок legacy.html.
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SRC_DIR = path.join(ROOT, 'docs', 'design', 'v2-app');
const SRC = path.join(SRC_DIR, 'stories-announcements-v1.html');
const OUT_HTML = path.join(ROOT, 'admin', 'v2', 'scripts', 'pages', 'story_announcements_v2_preview.html');
const OUT_ASSETS = path.join(ROOT, 'admin', 'v2', 'assets', 'stories_v2');
/** Путь к ассетам из страницы предпросмотра (scripts/pages/ → assets/stories_v2/). */
const REL = '../../assets/stories_v2/';
/** Арты, которые показывают кадры (announcement_v2_registry: ANNOUNCEMENT_ART_DEFAULTS) + весь белый список редактора. */
const ART_NAMES = [
  'lessons', 'dialogs', 'cards', 'spire_tile', 'phrase_of_day', 'today', 'mistakes_entry', 'intro_friends', 'intro_ai_dialog', 'intro_cards_hub',
  'intro_training_blitz', 'home_scene_welcome_back', 'home_scene_exam_ready', 'home_scene_newbie', 'home_scene_day_done', 'home_scene_all_done',
  'home_scene_continue', 'home_scene_streak_risk', 'home_scene_streak_lost', 'home_scene_no_energy', 'home_scene_offline', 'cards_from_video',
  'continue', 'dialogs_scene_limit',
];

function copy(rel, to = rel) {
  const from = path.join(SRC_DIR, rel);
  if (!fs.existsSync(from)) { console.warn('[ANN-ADMIN-BUILD] нет файла', rel); return false; }
  const dest = path.join(OUT_ASSETS, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(from, dest);
  return true;
}

let html = fs.readFileSync(SRC, 'utf8');
if (!html.includes('preview=1')) throw new Error('в макете нет режима предпросмотра (?preview=1)');
// пути макета → копии в админке
const replaces = [
  ['href="kit.css"', `href="${REL}kit.css"`],
  ['<script src="kit.js"></script>\n', ''],
  ['src="spire-tower-render.js"', `src="${REL}spire-tower-render.js"`],
  ['url(assets/Ionicons.ttf)', `url(${REL}Ionicons.ttf)`],
];
for (const [a, b] of replaces) { if (!html.includes(a)) throw new Error('не найдено: ' + a); html = html.split(a).join(b); }
// пути ассетов в шаблонах: assets/coin_rank_, assets/v2art/, assets/home_video/
html = html.split('assets/coin_rank_').join(`${REL}coin_rank_`).split('assets/v2art/').join(`${REL}v2art/`).split('assets/home_video/').join(`${REL}`);
// kit.css грузит шрифты из fonts/ относительно себя — копия kit.css лежит рядом с fonts/ в assets/stories_v2
html = html.replace('<title>', '<title>Предпросмотр · ');
html = html.replace('<head>', '<head>\n<!-- СГЕНЕРИРОВАНО scripts/mockups/ann_v2_admin_build.cjs из docs/design/v2-app/stories-announcements-v1.html — не править руками -->');

// Admin-only interaction layer. The source mockup remains the renderer of record.
// Keep these exact anchors fail-closed when that source changes.
const replaceOnce = (before, after) => {
  if (html.split(before).length !== 2) throw new Error('Admin gallery anchor changed: ' + before.slice(0, 100));
  html = html.replace(before, after);
};
replaceOnce("const kinLines = (text, maxW = 316) => { const sizes = [56, 50, 44, 40, 36, 32, 28, 24]; const ws = text.split(' '); const wl = (s, fs) => fs * (s.replace(/ /g, '').length * .72 + (s.split(' ').length - 1) * .3); for (const fs of sizes) { const lines = []; let cur = ''; let ok = true; for (const w of ws) { if (wl(w, fs) > maxW) { ok = false; break; } const t = cur ? cur + ' ' + w : w; if (wl(t, fs) <= maxW) cur = t; else { lines.push(cur); cur = w; } } if (!ok) continue; if (cur) lines.push(cur); if (lines.length <= 8) return { fs, lines }; } return { fs: 24, lines: ws }; };", String.raw`// Measure the actual uppercase font; split a long word without dropping graphemes.
const kinContext = document.createElement('canvas').getContext('2d');
const kinSegmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ru', { granularity: 'grapheme' }) : null;
const kinParts = (text) => kinSegmenter ? Array.from(kinSegmenter.segment(text), (part) => part.segment) : Array.from(text);
const kinLines = (text, maxW = 316) => {
  const value = String(text || '').replace(/\s+/gu, ' ').trim();
  if (!value) return { fs: 56, lines: [] };
  const words = value.split(' '), limit = Math.max(40, maxW - 2);
  const sizes = [56, 50, 44, 40, 36, 32, 28, 24, 22, 20];
  let fallback = { fs: 20, lines: [] };
  // Try every size with whole words first; only a truly long word needs splitting.
  for (const splitWords of [false, true]) for (const fs of sizes) {
    if (kinContext) kinContext.font = '800 ' + fs + 'px Inter, system-ui, sans-serif';
    const width = (line) => {
      const upper = line.toUpperCase();
      const measured = kinContext ? kinContext.measureText(upper).width : kinParts(upper).length * fs * 1.4;
      return Math.max(0, measured - Math.max(0, kinParts(upper).length - 1) * fs * .02);
    };
    if (!splitWords && words.some((word) => width(word) > limit)) continue;
    const lines = []; let current = '';
    for (const word of words) {
      const candidate = current ? current + ' ' + word : word;
      if (width(candidate) <= limit) { current = candidate; continue; }
      if (current) { lines.push(current); current = ''; }
      if (width(word) <= limit) { current = word; continue; }
      for (const grapheme of kinParts(word)) {
        if (current && width(current + grapheme) > limit) { lines.push(current); current = ''; }
        current += grapheme;
      }
    }
    if (current) lines.push(current);
    fallback = { fs, lines };
    // The poster has 372px before its footer; retain room for the moving lines.
    if (lines.every((line) => width(line) <= limit) && fs * (lines.length * 1.12 + .1) <= 350) return fallback;
  }
  return fallback;
};`);
replaceOnce("<script>if (/[?&]preview=1/.test(location.search)) document.body.classList.add('preview');</script>",
  "<script>if (/[?&](?:preview|gallery)=1/.test(location.search)) document.body.classList.add('preview'); if (/[?&]gallery=1/.test(location.search)) { document.body.classList.add('ann-gallery-mode'); document.documentElement.classList.add('ann-gallery-root'); }</script>");
replaceOnce('const previewEntry = (content) => {',
  "const previewEntry = (value) => {\n  const content = value && typeof value === 'object' ? value : {};");
replaceOnce("const blocks = (content.blocks || []).map((b) => ({ text: String(b.text || ''), size: [14, 16, 20].includes(Number(b.size)) ? Number(b.size) : 16, style: ['normal', 'accent', 'quote'].includes(b.style) ? b.style : 'normal' })).filter((b) => b.text);",
  "const blocks = (Array.isArray(content.blocks) ? content.blocks : []).slice(0, 4).map((b) => ({ text: String(b?.text || ''), size: [14, 16, 20].includes(Number(b?.size)) ? Number(b.size) : 16, style: ['normal', 'accent', 'quote'].includes(b?.style) ? b.style : 'normal' })).filter((b) => b.text);");
replaceOnce('const previewRender = (content, id, ap) => {', 'const previewRender = (content, id, ap, options = {}) => {');
replaceOnce('const PREVIEW = { ph: null, player: null };', 'const PREVIEW = { ph: null, player: null, last: null };');
replaceOnce("  const root = document.getElementById('preview'); if (!root) return false;",
  "  const root = document.getElementById('preview'); if (!root) return false;\n  PREVIEW.last = { content, id, ap, options };");
replaceOnce('  applyTheme(PREVIEW.ph, themeId, mode);',
  "  applyTheme(PREVIEW.ph, themeId, mode);\n  PREVIEW.ph.classList.toggle('ann-static', options.animate === false);");
replaceOnce("  PREVIEW.player = new Player(PREVIEW.ph, { start: 0, mode: 'restart', list: [entry] });",
  "  const wasInstant = INSTANT.on; INSTANT.on = options.animate === false;\n  try { PREVIEW.player = new Player(PREVIEW.ph, { start: 0, mode: 'restart', list: [entry] }); } finally { INSTANT.on = wasInstant; }\n  if (options.animate === false) PREVIEW.player.frozen = true;\n  PREVIEW.player.setVisible(options.enabled !== false && !document.hidden);");
replaceOnce("if (document.body.classList.contains('preview')) {",
  "if (document.body.classList.contains('preview') && !document.body.classList.contains('ann-gallery-mode')) {");
replaceOnce("  window.addEventListener('message', (e) => { if (e.source !== window.parent) return; const m = e.data; if (!m || m.channel !== 'pm-ann-preview') return; previewRender(m.content, m.theme, m.ap); });",
  "  let previewEnabled = true;\n  window.addEventListener('message', (e) => {\n    if (e.source !== window.parent || e.origin !== location.origin) return;\n    const m = e.data; if (!m || m.channel !== 'pm-ann-preview') return;\n    previewEnabled = m.enabled !== false;\n    if (Object.prototype.hasOwnProperty.call(m, 'content')) previewRender(m.content, m.theme, m.ap, { animate: m.animate, enabled: previewEnabled });\n    else PREVIEW.player?.setVisible(previewEnabled && !document.hidden);\n  });\n  document.addEventListener('visibilitychange', () => PREVIEW.player?.setVisible(previewEnabled && !document.hidden));\n  document.fonts?.ready.then(() => { const last = PREVIEW.last; if (last) previewRender(last.content, last.id, last.ap, { ...last.options, enabled: previewEnabled }); }).catch(() => {});\n  window.addEventListener('pagehide', () => { if (PREVIEW.player) { PREVIEW.player.alive = false; clearTimeout(PREVIEW.player.timer); cancelAnimationFrame(PREVIEW.player.raf); } });");
replaceOnce("gradient: !!THEMES[id].gradient })) }, '*');", "gradient: !!THEMES[id].gradient })) }, location.origin === 'null' ? '*' : location.origin);");
replaceOnce('geo, rects, preview: previewRender, setTheme:',
  'geo, rects, preview: previewRender, gallerySupport: { applyTheme, previewEntry, sbHtml, io, fmt }, setTheme:');
const galleryFragment = fs.readFileSync(path.join(__dirname, 'ann_v2_admin_gallery.fragment.html'), 'utf8');
replaceOnce('</body>', galleryFragment + '\n</body>');
fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
fs.writeFileSync(OUT_HTML, html);

// A focused rebuild can verify HTML without recopying the existing art library.
if (process.argv.includes('--html-only')) {
  console.log(JSON.stringify({ html: path.relative(ROOT, OUT_HTML), bytes: Buffer.byteLength(html), assets: 'unchanged' }));
  process.exit(0);
}

let n = 0;
n += copy('kit.css') ? 1 : 0;
n += copy('spire-tower-render.js') ? 1 : 0;
n += copy('assets/Ionicons.ttf', 'Ionicons.ttf') ? 1 : 0;
n += copy('assets/home_video/en_rail_1.jpg', 'en_rail_1.jpg') ? 1 : 0;
for (const f of ['Inter-Regular', 'Inter-SemiBold', 'Inter-Bold', 'Inter-Black']) n += copy(`fonts/${f}.ttf`) ? 1 : 0;
for (let i = 0; i < 20; i += 1) n += copy(`assets/coin_rank_${String(i).padStart(2, '0')}.webp`, `coin_rank_${String(i).padStart(2, '0')}.webp`) ? 1 : 0;
for (const name of ART_NAMES) for (const ap of ['dark', 'light']) n += copy(`assets/v2art/${ap}/${name}.webp`, `v2art/${ap}/${name}.webp`) ? 1 : 0;
const size = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
console.log(JSON.stringify({ html: path.relative(ROOT, OUT_HTML), bytes: Buffer.byteLength(html), assets: n, assetsBytes: size(OUT_ASSETS) }));

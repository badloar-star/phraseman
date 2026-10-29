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
fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
fs.writeFileSync(OUT_HTML, html);

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

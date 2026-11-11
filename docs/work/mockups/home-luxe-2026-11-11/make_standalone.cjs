// зачем (владелец 11.11: «макет невозможно открыть» — ошибка Cannot read properties of undefined (reading 'sunny')):
// страница грузила соседние файлы (карту значков, код темы, шрифты, картинки). Там, где HTML открывают одним файлом (панель файлов приложения,
// пересылка, предпросмотр), соседние файлы не подгружаются — карта значков оставалась пустой и скрипт падал на первой же строке.
// Этот сценарий вшивает всё внутрь: получается один самодостаточный файл, который открывается откуда угодно, без сервера и без папки рядом.
// Запуск: node make_standalone.cjs  → пересобирает index.html, designer.html, tishina.html на месте (повторный запуск безопасен).
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const b64 = (rel) => fs.readFileSync(path.join(DIR, rel)).toString('base64');
const walk = (dir) => fs.readdirSync(path.join(DIR, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));

const art = {};
for (const f of walk('art')) if (f.endsWith('.webp')) art[f] = `data:image/webp;base64,${b64(f)}`;
const inlineScript = (file) => `<script>/* вшито из ${file} */\n${fs.readFileSync(path.join(DIR, file), 'utf8').replace(/<\/script>/g, '<\\/script>')}\n</script>`;

for (const name of ['index.html', 'designer.html', 'tishina.html']) {
  const file = path.join(DIR, name);
  if (!fs.existsSync(file)) { console.warn('[STANDALONE] нет файла, пропуск:', name); continue; }
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('window.ART=')) { console.log('[STANDALONE] уже самодостаточный, пропуск:', name); continue; }
  const before = s.length;
  // шрифты
  s = s.replace(/url\((fonts\/[A-Za-z-]+\.ttf|Ionicons\.ttf)\)/g, (m, rel) => `url(data:font/ttf;base64,${b64(rel)})`);
  // скрипты и картинки
  if (!s.includes('<script src="pm_theme.js"></script>')) { console.error('[STANDALONE] не найден тег кода темы в', name, '— файл не тронут'); continue; }
  s = s.replace('<script src="ionicons_map.js"></script>', () => inlineScript('ionicons_map.js'));
  s = s.replace('<script src="pm_theme.js"></script>', () => `<script>window.ART=${JSON.stringify(art)};</script>\n${inlineScript('pm_theme.js')}`);
  // пути картинок → вшитые данные (и в разметке экранов, и при рисовании плиток)
  const a = 'ph.innerHTML = SCREENS[id]();';
  const b = 'im.src = src;';
  if (!s.includes(a) || !s.includes(b)) { console.error('[STANDALONE] не найдены места подстановки картинок в', name, '— файл не тронут'); continue; }
  s = s.replace(a, `ph.innerHTML = SCREENS[id]().replace(/src="(art\\/[^"]+)"/g, (m, p) => 'src="' + ((window.ART && window.ART[p]) || p) + '"');`);
  s = s.replace(b, `im.src = (window.ART && window.ART[src]) || src;`);
  // понятное сообщение вместо немого падения, если карта значков или код темы всё же не загрузились
  s = s.replace(`(() => {\n'use strict';\nconst LOG = '[HOME-LUXE]';`, `(() => {\n'use strict';\nconst LOG = '[HOME-LUXE]';\nif (!window.IONMAP || !window.PM) { console.error(LOG, 'не загрузились части макета', { значки: !!window.IONMAP, темы: !!window.PM }); document.body.insertAdjacentHTML('afterbegin', '<p style="padding:16px;font:16px system-ui;color:#fff;background:#8a1f1f">Макет не смог загрузить свои части (значки или код темы). Откройте файл целиком из папки макета.</p>'); return; }`);
  fs.writeFileSync(file, s);
  console.log('[STANDALONE] готово:', name, Math.round(before / 1024) + ' КБ →', Math.round(s.length / 1024) + ' КБ');
}

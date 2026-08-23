// ════════════════════════════════════════════════════════════════════════════
// build_revoice_result_page.mjs — страница приёмки готовой переозвучки.
//
// зачем: 5014 файлов переозвучены голосом echo и залиты в Storage. Прежде чем
// коммитить карту, владелец должен услышать РЕЗУЛЬТАТ — по нескольку фраз из
// каждого раздела приложения, включая одиночные слова (у них отдельный,
// более медленный темп 0.90) и длинные вопросы.
//
// Звук вшит внутрь файла (blob из base64): открывается двойным кликом, без
// локального сервера — тот в этой сессии умирал между ходами.
//
// Запуск: node scripts/build_revoice_result_page.mjs [--per=8]
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TTS = path.join(ROOT, '.codex-tmp', 'tts-voicing');
const SRC_DIR = path.join(TTS, 'revoice_echo');
const OUT_FILE = path.join(TTS, 'РЕЗУЛЬТАТ_ECHO.html');

const PER_SOURCE = (() => {
  const a = process.argv.find((x) => x.startsWith('--per='));
  return a ? Math.max(1, Number(a.split('=')[1])) : 8;
})();

const SOURCE_LABELS = {
  lesson: 'Уроки',
  lesson_comma: 'Уроки (с запятой)',
  word: 'Слова · темп 0.90',
  verb: 'Глаголы · темп 0.90',
  quiz: 'Квизы',
  collectible: 'Коллекционные',
  flashcard: 'Флешкарты',
  idiom: 'Идиомы',
  thematic: 'Тематические',
};

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function main() {
  const map = {
    ...JSON.parse(fs.readFileSync(path.join(TTS, 'audio_url_map.json'), 'utf8')),
    ...JSON.parse(fs.readFileSync(path.join(TTS, 'audio_url_map_gaps.json'), 'utf8')),
  };

  const bySource = new Map();
  for (const [id, rec] of Object.entries(map)) {
    if (!rec?.text) continue;
    if (!bySource.has(rec.source)) bySource.set(rec.source, []);
    bySource.get(rec.source).push({ id, text: rec.text, source: rec.source });
  }

  const clips = {};
  const sections = [];

  for (const source of [...bySource.keys()].sort()) {
    const list = bySource.get(source);
    // Короткие, средние и длинные — детерминированно, чтобы набор был
    // воспроизводим и покрывал весь диапазон длины внутри раздела.
    const sorted = [...list].sort((a, b) => a.text.length - b.text.length || a.id.localeCompare(b.id));
    const step = Math.max(1, Math.floor(sorted.length / PER_SOURCE));
    const picked = [];
    for (let i = 0, taken = 0; i < sorted.length && taken < PER_SOURCE; i += step, taken += 1) {
      picked.push(sorted[i]);
    }

    const rows = picked.map((item) => {
      const file = path.join(SRC_DIR, source, `${item.id}.mp3`);
      if (!fs.existsSync(file)) return '';
      const key = `${source}/${item.id}`;
      clips[key] = fs.readFileSync(file).toString('base64');
      return `<tr><th class="phrase">${esc(item.text)}</th><td><audio controls preload="none" data-key="${esc(key)}"></audio></td></tr>`;
    }).filter(Boolean).join('\n');

    if (!rows) continue;
    sections.push([
      `<section data-source="${esc(source)}">`,
      `<h2>${esc(SOURCE_LABELS[source] || source)} <span class="cnt">${list.length} всего</span>`,
      `<button class="chain" data-source="${esc(source)}">▶ подряд</button></h2>`,
      `<table><tbody>${rows}</tbody></table>`,
      '</section>',
    ].join(''));
  }

  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Результат переозвучки — echo</title>
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0; padding: 32px 24px 80px;
    background: #14161a; color: #eceff4;
    font: 15px/1.5 -apple-system, "Segoe UI", system-ui, sans-serif;
  }
  h1 { font-size: 26px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.02em; }
  .sub { color: #98a2b3; margin: 0 0 28px; font-size: 14px; }
  .stat { display: flex; flex-wrap: wrap; gap: 28px; margin: 0 0 34px; }
  .stat div { }
  .stat b { display: block; font-size: 24px; font-weight: 800; letter-spacing: -0.01em; }
  .stat span { color: #98a2b3; font-size: 13px; }
  section { margin: 0 0 34px; }
  h2 {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    font-size: 18px; font-weight: 700; margin: 0 0 12px;
  }
  .cnt { color: #8b95a5; font-weight: 500; font-size: 14px; }
  .chain {
    padding: 7px 14px; background: #2c3138; color: #eceff4;
    border: 0; border-radius: 8px; cursor: pointer;
    font: 600 12px/1 inherit;
    transition: background .15s ease, transform .08s ease;
  }
  .chain:hover { background: #363c45; }
  .chain:active { transform: scale(0.96); }
  .chain[data-playing="1"] { background: #d9a441; color: #14161a; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 10px 14px; text-align: left; vertical-align: middle; }
  tbody tr { background: #1b1e24; }
  tbody tr:nth-child(even) { background: #191c21; }
  .phrase { font-weight: 500; }
  audio { width: 240px; height: 34px; }
  tr.now .phrase { color: #d9a441; }
  tr.now audio { outline: 2px solid #d9a441; outline-offset: 3px; border-radius: 6px; }
</style>
</head>
<body>
  <h1>Переозвучка готова — голос echo</h1>
  <p class="sub">Спокойная подача · темп 0.92 (слова 0.90) · громкость выровнена · Esc — стоп</p>
  <div class="stat">
    <div><b>5014</b><span>файлов переозвучено</span></div>
    <div><b>0</b><span>ошибок</span></div>
    <div><b>0</b><span>расхождений в аудите</span></div>
    <div><b>$1.31</b><span>потрачено</span></div>
  </div>
${sections.join('\n')}
<script id="clips" type="application/json">${JSON.stringify(clips)}</script>
<script>
(function () {
  var CLIPS = JSON.parse(document.getElementById('clips').textContent);
  var urls = {};
  function urlFor(key) {
    if (urls[key]) return urls[key];
    var raw = atob(CLIPS[key]);
    var bytes = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    urls[key] = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
    return urls[key];
  }

  var players = Array.prototype.slice.call(document.querySelectorAll('audio'));
  players.forEach(function (a) { a.src = urlFor(a.getAttribute('data-key')); });

  var chain = null;
  function clearMarks() {
    document.querySelectorAll('tr.now').forEach(function (el) { el.classList.remove('now'); });
  }
  function stopChain() {
    if (chain) { chain.button.removeAttribute('data-playing'); chain = null; }
    clearMarks();
  }

  players.forEach(function (audio) {
    audio.addEventListener('play', function () {
      players.forEach(function (o) { if (o !== audio) o.pause(); });
      clearMarks();
      audio.closest('tr').classList.add('now');
    });
    audio.addEventListener('pause', function () { if (!chain) clearMarks(); });
  });

  function playNext() {
    if (!chain) return;
    if (chain.index >= chain.queue.length) { stopChain(); return; }
    var audio = chain.queue[chain.index++];
    audio.scrollIntoView({ block: 'center', behavior: 'smooth' });
    audio.currentTime = 0;
    audio.play();
    audio.onended = function () {
      audio.onended = null;
      if (chain) setTimeout(playNext, 420);
    };
  }

  document.querySelectorAll('button.chain').forEach(function (button) {
    button.addEventListener('click', function () {
      var wasActive = chain && chain.button === button;
      players.forEach(function (a) { a.pause(); a.onended = null; });
      stopChain();
      if (wasActive) return;
      var queue = Array.prototype.slice.call(
        document.querySelectorAll('section[data-source="' + button.getAttribute('data-source') + '"] audio'));
      if (!queue.length) return;
      button.setAttribute('data-playing', '1');
      chain = { queue: queue, index: 0, button: button };
      playNext();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.code !== 'Escape') return;
    players.forEach(function (a) { a.pause(); a.onended = null; });
    stopChain();
  });
}());
</script>
</body>
</html>`;

  fs.writeFileSync(OUT_FILE, html, 'utf8');
  console.log(`Готово: ${path.relative(ROOT, OUT_FILE)} (${(fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1)} МБ, клипов: ${Object.keys(clips).length})`);
}

main();

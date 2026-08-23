// ════════════════════════════════════════════════════════════════════════════
// build_voice_trial_page.mjs — страница пробного прогона голоса echo.
//
// зачем: владелец выбрал голос, осталось выбрать ПОДАЧУ. Страница ставит три
// варианта подачи одной фразы рядом, чтобы разница слышалась вплотную, и
// группирует фразы по разделам приложения (уроки, квизы, идиомы...) — голос
// должен быть хорош и на одном слове, и на длинном вопросе.
//
// Звук вшит внутрь файла (blob из base64): страница открывается двойным кликом
// и не зависит от локального сервера, который в прошлый раз умирал между ходами.
//
// Запуск: node scripts/build_voice_trial_page.mjs
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, '.codex-tmp', 'voice-trial-echo');
const OUT_FILE = path.join(SRC_DIR, 'ПОДАЧА_ECHO.html');

const SOURCE_LABELS = {
  lesson: 'Уроки',
  lesson_comma: 'Уроки (с запятой)',
  word: 'Слова',
  quiz: 'Квизы',
  collectible: 'Коллекционные',
  flashcard: 'Флешкарты',
  idiom: 'Идиомы',
  thematic: 'Тематические',
  verb: 'Глаголы',
  unknown: 'Прочее',
};

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function main() {
  const manifestPath = path.join(SRC_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Нет прогона. Сначала: node scripts/voice_trial_echo.mjs');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const styles = manifest.styles;

  // Фразы уникальны по id; подачи — колонки.
  const byId = new Map();
  for (const item of manifest.items) {
    if (!byId.has(item.id)) byId.set(item.id, { id: item.id, source: item.source, text: item.text });
  }

  const clips = {};
  for (const style of styles) {
    for (const item of byId.values()) {
      const file = path.join(SRC_DIR, style.id, `${item.id}.mp3`);
      if (fs.existsSync(file)) clips[`${style.id}/${item.id}`] = fs.readFileSync(file).toString('base64');
    }
  }

  const bySource = new Map();
  for (const item of byId.values()) {
    if (!bySource.has(item.source)) bySource.set(item.source, []);
    bySource.get(item.source).push(item);
  }

  const sections = [...bySource.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([source, items]) => {
    const rows = items.map((item) => {
      const cells = styles.map((style) => {
        const key = `${style.id}/${item.id}`;
        if (!clips[key]) return '<td class="miss">—</td>';
        return `<td data-style="${esc(style.id)}"><audio controls preload="none" data-key="${esc(key)}"></audio></td>`;
      }).join('');
      return `<tr><th class="phrase">${esc(item.text)}</th>${cells}</tr>`;
    }).join('\n');

    return [
      `<section><h2>${esc(SOURCE_LABELS[source] || source)} <span class="cnt">${items.length}</span></h2>`,
      '<div class="wrap"><table><thead><tr><th>Фраза</th>',
      styles.map((s) => `<th><span class="lbl">${esc(s.label)}</span><span class="meta">темп ${s.speed}</span></th>`).join(''),
      '</tr></thead><tbody>',
      rows,
      '</tbody></table></div></section>',
    ].join('');
  }).join('\n');

  const styleButtons = styles.map((s) => `<button class="chain" data-style="${esc(s.id)}">▶ ${esc(s.label)} — всё подряд</button>`).join('');

  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Подача голоса echo — Phraseman</title>
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0; padding: 32px 24px 80px;
    background: #14161a; color: #eceff4;
    font: 15px/1.5 -apple-system, "Segoe UI", system-ui, sans-serif;
  }
  h1 { font-size: 26px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.02em; }
  .sub { color: #98a2b3; margin: 0 0 20px; font-size: 14px; }
  .bar { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 32px; }
  .chain {
    padding: 10px 16px; background: #2c3138; color: #eceff4;
    border: 0; border-radius: 10px; cursor: pointer;
    font: 600 13px/1 inherit;
    transition: background .15s ease, transform .08s ease;
  }
  .chain:hover { background: #363c45; }
  .chain:active { transform: scale(0.97); }
  .chain[data-playing="1"] { background: #d9a441; color: #14161a; }
  section { margin: 0 0 40px; }
  h2 { font-size: 18px; font-weight: 700; margin: 0 0 12px; }
  .cnt { color: #8b95a5; font-weight: 500; font-size: 14px; margin-left: 6px; }
  .wrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 10px 14px; text-align: left; vertical-align: middle; }
  thead th { color: #98a2b3; font-weight: 600; font-size: 13px; }
  thead .lbl { display: block; color: #eceff4; font-size: 14px; font-weight: 700; }
  thead .meta { display: block; margin-top: 2px; font-weight: 400; font-size: 12px; }
  tbody tr { background: #1b1e24; }
  tbody tr:nth-child(even) { background: #191c21; }
  .phrase { font-weight: 500; min-width: 260px; max-width: 420px; }
  audio { width: 200px; height: 34px; }
  .miss { color: #6b7280; }
  td.now audio { outline: 2px solid #d9a441; outline-offset: 3px; border-radius: 6px; }
  tr.now .phrase { color: #d9a441; }
</style>
</head>
<body>
  <h1>Голос echo — выбор подачи</h1>
  <p class="sub">54 настоящие фразы из приложения · три варианта подачи · громкость выровнена · Esc — стоп</p>
  <div class="bar">${styleButtons}</div>
${sections}
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
    document.querySelectorAll('td.now, tr.now').forEach(function (el) { el.classList.remove('now'); });
  }
  function stopChain() {
    if (chain) { chain.button.removeAttribute('data-playing'); chain = null; }
    clearMarks();
  }
  function mark(audio) {
    var cell = audio.closest('td');
    if (cell) { cell.classList.add('now'); cell.closest('tr').classList.add('now'); }
  }

  players.forEach(function (audio) {
    audio.addEventListener('play', function () {
      players.forEach(function (o) { if (o !== audio) o.pause(); });
      clearMarks(); mark(audio);
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
        document.querySelectorAll('td[data-style="' + button.getAttribute('data-style') + '"] audio'));
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
  console.log(`Готово: ${path.relative(ROOT, OUT_FILE)} (${(fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1)} МБ, фраз: ${byId.size}, клипов: ${Object.keys(clips).length})`);
}

main();

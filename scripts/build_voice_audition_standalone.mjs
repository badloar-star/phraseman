// ════════════════════════════════════════════════════════════════════════════
// build_voice_audition_standalone.mjs — автономная страница выбора голоса.
//
// зачем: локальный сервер прослушки умирал между ходами сессии, и владелец
// каждый раз упирался в «не открывается». Эта версия вшивает все 55 mp3 внутрь
// HTML, поэтому файл открывается ДВОЙНЫМ КЛИКОМ в обычном браузере и работает
// всегда — без сервера, портов и запусков. Тяжелее (~4 МБ), но живёт вечно.
//
// Отличие от build_voice_audition_page.mjs: тот делает лёгкую страницу для
// локального сервера; этот — «неубиваемую» для отправки владельцу.
//
// Запуск: node scripts/build_voice_audition_standalone.mjs
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_DIR = path.join(ROOT, '.codex-tmp', 'voice-audition');
const OUT_FILE = path.join(BASE_DIR, 'ВЫБОР_ГОЛОСА.html');

// зачем: сырые сэмплы разошлись по громкости на 20 dB (alloy -21, sage -40).
// При таком разбросе выбор идёт «кто громче», а не «кто приятнее». Если рядом
// лежит нормализованная папка (loudnorm I=-16) — берём её.
const NORM_DIR = path.join(BASE_DIR, 'normalized');
const SRC_DIR = fs.existsSync(NORM_DIR) ? NORM_DIR : BASE_DIR;

const SAMPLES = [
  { id: '1_word', text: 'available', label: 'Слово' },
  { id: '2_lesson', text: 'I am not from here.', label: 'Фраза урока' },
  { id: '3_question', text: 'Excuse me, do you speak English?', label: 'Вопрос' },
  { id: '4_idiom', text: 'a blessing in disguise', label: 'Идиома' },
  { id: '5_long', text: 'The second hotel is more expensive than the first.', label: 'Длинная фраза' },
];

const NOTES = {
  alloy: 'нейтральный · сейчас в планах',
  ash: 'мужской, спокойный',
  ballad: 'мужской, мягкий',
  coral: 'женский, тёплый',
  echo: 'мужской, ровный',
  fable: 'СЕЙЧАС В ПРИЛОЖЕНИИ',
  nova: 'женский, светлый',
  onyx: 'мужской, низкий',
  sage: 'нейтральный, мягкий',
  shimmer: 'женский, яркий',
  verse: 'выразительный',
};

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    throw new Error('Нет сэмплов. Сначала: node scripts/voice_audition_samples.mjs');
  }

  const voices = fs.readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();

  // Аудио складываем в JS-словарь и раздаём через blob: URL. Прямой data: в
  // src некоторые просмотрщики режут, а blob из того же документа проходит.
  const clips = {};
  for (const voice of voices) {
    for (const sample of SAMPLES) {
      const file = path.join(SRC_DIR, voice, `${sample.id}.mp3`);
      if (fs.existsSync(file)) {
        clips[`${voice}/${sample.id}`] = fs.readFileSync(file).toString('base64');
      }
    }
  }

  const heads = SAMPLES.map((s) => [
    '<th>',
    `<span class="lbl">${esc(s.label)}</span>`,
    `<span class="txt">${esc(s.text)}</span>`,
    `<button class="play" data-col="${esc(s.id)}">▶ все голоса</button>`,
    '</th>',
  ].join('')).join('');

  const rows = voices.map((voice) => {
    const cells = SAMPLES.map((sample) => {
      const key = `${voice}/${sample.id}`;
      if (!clips[key]) return '<td class="miss">—</td>';
      return `<td data-col="${esc(sample.id)}" data-voice="${esc(voice)}"><audio controls preload="none" data-key="${esc(key)}"></audio></td>`;
    }).join('');
    const note = NOTES[voice] ? `<span class="note">${esc(NOTES[voice])}</span>` : '';
    return `<tr class="${voice === 'fable' ? 'current' : ''}"><th><span class="name">${esc(voice)}</span>${note}</th>${cells}</tr>`;
  }).join('\n');

  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Выбор голоса — Phraseman</title>
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0; padding: 32px 24px 64px;
    background: #14161a; color: #eceff4;
    font: 15px/1.5 -apple-system, "Segoe UI", system-ui, sans-serif;
  }
  h1 { font-size: 26px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.02em; }
  .sub { color: #98a2b3; margin: 0 0 28px; font-size: 14px; }
  .wrap { overflow-x: auto; }
  table { border-collapse: collapse; min-width: 100%; }
  th, td { padding: 12px 14px; text-align: left; vertical-align: middle; }
  thead th { color: #98a2b3; font-weight: 600; font-size: 13px; }
  thead .lbl { display: block; color: #eceff4; font-size: 14px; font-weight: 700; }
  thead .txt { display: block; margin-top: 3px; font-weight: 400; font-style: italic; }
  tbody tr { background: #1b1e24; }
  tbody tr:nth-child(even) { background: #191c21; }
  tbody th { white-space: nowrap; }
  .name { display: block; font-size: 17px; font-weight: 700; }
  .note { display: block; margin-top: 2px; font-size: 12px; color: #8b95a5; font-weight: 400; }
  tr.current { background: #2a231a; }
  tr.current .note { color: #d9a441; font-weight: 600; }
  audio { width: 210px; height: 34px; }
  .miss { color: #6b7280; }
  .play {
    display: inline-block; margin-top: 8px; padding: 6px 12px;
    background: #2c3138; color: #eceff4; border: 0; border-radius: 8px;
    font: 600 12px/1 inherit; cursor: pointer;
    transition: background .15s ease, transform .08s ease;
  }
  .play:hover { background: #363c45; }
  .play:active { transform: scale(0.96); }
  .play[data-playing="1"] { background: #d9a441; color: #14161a; }
  td.now audio { outline: 2px solid #d9a441; outline-offset: 3px; border-radius: 6px; }
  tr.now th .name { color: #d9a441; }
  tbody tr:first-child th { border-top-left-radius: 10px; }
  tbody tr:last-child th { border-bottom-left-radius: 10px; }
</style>
</head>
<body>
  <h1>Выбор голоса для переозвучки</h1>
  <p class="sub">Модель gpt-4o-mini-tts · один и тот же текст каждым голосом · громкость выровнена · подсвечен текущий голос приложения · Esc — стоп</p>
  <div class="wrap">
    <table>
      <thead><tr><th>Голос</th>${heads}</tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>
<script id="clips" type="application/json">${JSON.stringify(clips)}</script>
<script>
(function () {
  var CLIPS = JSON.parse(document.getElementById('clips').textContent);
  var urls = {};

  // base64 -> blob: URL. Так звук живёт внутри файла, но браузер получает
  // нормальный ресурс, а не гигантский data:-атрибут в разметке.
  function urlFor(key) {
    if (urls[key]) return urls[key];
    var raw = atob(CLIPS[key]);
    var bytes = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    urls[key] = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
    return urls[key];
  }

  var players = Array.prototype.slice.call(document.querySelectorAll('audio'));
  players.forEach(function (audio) {
    audio.src = urlFor(audio.getAttribute('data-key'));
  });

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

  // Один звук за раз: иначе голоса накладываются и сравнить их невозможно.
  players.forEach(function (audio) {
    audio.addEventListener('play', function () {
      players.forEach(function (o) { if (o !== audio) o.pause(); });
      clearMarks();
      mark(audio);
    });
    audio.addEventListener('pause', function () {
      if (!chain) clearMarks();
    });
  });

  function playNext() {
    if (!chain) return;
    if (chain.index >= chain.queue.length) { stopChain(); return; }
    var audio = chain.queue[chain.index++];
    audio.currentTime = 0;
    audio.play();
    audio.onended = function () {
      audio.onended = null;
      // Пауза между голосами — иначе они сливаются в один поток.
      if (chain) setTimeout(playNext, 450);
    };
  }

  document.querySelectorAll('button.play').forEach(function (button) {
    button.addEventListener('click', function () {
      var wasActive = chain && chain.button === button;
      players.forEach(function (a) { a.pause(); a.onended = null; });
      stopChain();
      if (wasActive) return;
      var queue = Array.prototype.slice.call(
        document.querySelectorAll('td[data-col="' + button.getAttribute('data-col') + '"] audio'));
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
  console.log(`Готово: ${path.relative(ROOT, OUT_FILE)} (${(fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1)} МБ, голосов: ${voices.length}, клипов: ${Object.keys(clips).length})`);
}

main();

// Живая страница очереди светофора для владельца (11.11.2026).
// зачем: владелец попросил видеть, кто держит слот, кто ждёт и кто недавно прошёл,
// и чтобы страница обновлялась сама. Сервер ТОЛЬКО читает .claude/semaphore и журналы
// сессий; в светофор ничего не пишет и ничего тяжёлого не запускает.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const PORT = 4790;
const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const SEM = path.join(REPO, '.claude', 'semaphore');
const PROJECTS = path.join(os.homedir(), '.claude', 'projects');
const DEAD_AFTER_SEC = 3 * 3600; // зачем: записи старше 3 ч — процесса давно нет (Codex от октября и т. п.)
const TAIL_BYTES = 1500000;
const LOG = '[QUEUE-BOARD]';

const nowSec = () => Math.floor(Date.now() / 1000);

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn(LOG, 'не прочитал', file, e.code || e.message);
    return '';
  }
}

function readTail(file, bytes) {
  let fd;
  try {
    const st = fs.statSync(file);
    const len = Math.min(st.size, bytes);
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, st.size - len);
    return buf.toString('utf8');
  } catch (e) {
    console.warn(LOG, 'не прочитал хвост', file, e.code || e.message);
    return '';
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

// ── журналы сессий: id → файл (индекс обновляется раз в минуту) ──────────────
let fileIndex = new Map();
let fileIndexAt = 0;
function refreshFileIndex() {
  if (Date.now() - fileIndexAt < 60000) return;
  const next = new Map();
  let dirs = [];
  try {
    dirs = fs.readdirSync(PROJECTS);
  } catch (e) {
    console.warn(LOG, 'нет папки журналов', e.code || e.message);
  }
  for (const d of dirs) {
    let files = [];
    try {
      files = fs.readdirSync(path.join(PROJECTS, d));
    } catch (e) {
      // в папке журналов лежат и обычные файлы — для них ENOTDIR ожидаем, остальное показываем
      if (e.code !== 'ENOTDIR') console.warn(LOG, 'не прочитал папку журналов', d, e.code || e.message);
      continue;
    }
    for (const f of files) {
      if (!f.endsWith('.jsonl')) continue;
      const id = f.slice(0, -6);
      next.set(id, path.join(PROJECTS, d, f));
      if (!next.has(id.slice(0, 8))) next.set(id.slice(0, 8), path.join(PROJECTS, d, f));
    }
  }
  fileIndex = next;
  fileIndexAt = Date.now();
}

// ── название сессии и «что поставила на проверку» (кэш по id + времени постановки) ──
const infoCache = new Map();
function sessionInfo(id, born) {
  const key = id + ':' + born;
  const hit = infoCache.get(key);
  if (hit) return hit;
  const file = fileIndex.get(id) || fileIndex.get(id.slice(0, 8));
  const info = { title: '', want: '' };
  if (file) {
    let skipped = 0;
    for (const line of readTail(file, TAIL_BYTES).split('\n')) {
      if (!line) continue;
      let o;
      try {
        o = JSON.parse(line);
      } catch (e) {
        // хвост файла начинается с середины строки — одна нечитаемая строка на файл ожидаема
        skipped += 1;
        if (skipped > 1) console.warn(LOG, 'нечитаемая строка журнала', id.slice(0, 8), e.message);
        continue;
      }
      if (o.customTitle) info.title = o.customTitle;
      else if (o.aiTitle && !info.title) info.title = o.aiTitle;
      if (o.type !== 'assistant' || !o.message || !Array.isArray(o.message.content)) continue;
      for (const c of o.message.content) {
        if (c.type !== 'tool_use' || c.name !== 'Bash') continue;
        const cmd = String((c.input && c.input.command) || '');
        const m = cmd.match(/slot\.sh\s+run\s+--wait\s+"([^"]{0,160})"/) || cmd.match(/slot\.sh\s+run\s+--wait\s+'([^']{0,160})'/);
        if (m) info.want = m[1];
      }
    }
  }
  infoCache.set(key, info);
  if (infoCache.size > 400) infoCache.delete(infoCache.keys().next().value);
  return info;
}

function listDirs(prefix) {
  let names = [];
  try {
    names = fs.readdirSync(SEM);
  } catch (e) {
    console.warn(LOG, 'нет папки светофора', e.code || e.message);
    return [];
  }
  return names
    .filter((n) => n.startsWith(prefix) && n.endsWith('.d'))
    .map((n) => {
      const id = n.slice(prefix.length, -2);
      const dir = path.join(SEM, n);
      const born = parseInt(readText(path.join(dir, 'born')).trim(), 10) || 0;
      const why = readText(path.join(dir, 'why')).trim();
      return { id, born, why };
    });
}

function urgency(text) {
  return /выкладк|deploy/i.test(text || '') ? 'deploy' : '';
}

function recentEvents() {
  const lines = readTail(path.join(SEM, 'slot_events.log'), 60000).split('\n').filter(Boolean);
  const open = new Map();
  const done = [];
  for (const line of lines) {
    const m = line.match(/^(\d\d:\d\d:\d\d)\s+(\S+)\s+(GO|release)\b(.*)$/);
    if (!m) continue;
    const [, time, id, kind, rest] = m;
    if (kind === 'GO') {
      const w = rest.match(/why=(.*)$/);
      open.set(id, { id, start: time, why: w ? w[1].trim() : '' });
    } else {
      const o = open.get(id);
      if (o) {
        open.delete(id);
        done.push({ ...o, end: time });
      }
    }
  }
  const toSec = (t) => t.split(':').reduce((a, x) => a * 60 + Number(x), 0);
  return done
    .slice(-14)
    .reverse()
    .map((e) => {
      let dur = toSec(e.end) - toSec(e.start);
      if (dur < 0) dur += 86400; // прогон через полночь
      const info = sessionInfo(e.id, 'log');
      return { id: e.id.slice(0, 8), title: info.title, why: e.why, start: e.start, end: e.end, durSec: dur };
    });
}

// ── процессы node/claude: не чаще раза в 30 секунд ───────────────────────────
let procCount = null;
let procAt = 0;
function refreshProcCount() {
  if (Date.now() - procAt < 30000) return;
  procAt = Date.now();
  execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (err, out) => {
    if (err) {
      console.warn(LOG, 'tasklist не отработал', err.code || err.message);
      return;
    }
    procCount = out.split('\n').filter((l) => /^"(node|claude)\.exe"/i.test(l)).length;
  });
}

function snapshot() {
  refreshFileIndex();
  refreshProcCount();
  const t = nowSec();
  const holders = listDirs('slot.').map((h) => {
    const info = sessionInfo(h.id, h.born);
    return { id: h.id.slice(0, 8), title: info.title, why: h.why, heldSec: Math.max(0, t - h.born), urgency: urgency(h.why) };
  });
  const holderIds = new Set(listDirs('slot.').map((h) => h.id));
  const waiting = [];
  const dead = [];
  for (const r of listDirs('run.')) {
    if (holderIds.has(r.id)) continue; // эта сессия уже получила слот
    const age = Math.max(0, t - r.born);
    if (age > DEAD_AFTER_SEC) {
      dead.push({ id: r.id.slice(0, 40), ageSec: age });
      continue;
    }
    const info = sessionInfo(r.id, r.born);
    waiting.push({ id: r.id.slice(0, 8), title: info.title, want: info.want, waitSec: age, urgency: urgency(info.want) });
  }
  waiting.sort((a, b) => b.waitSec - a.waitSec);
  dead.sort((a, b) => b.ageSec - a.ageSec);
  return {
    at: new Date().toISOString(),
    freeMemGb: Math.round((os.freemem() / 1073741824) * 10) / 10,
    totalMemGb: Math.round(os.totalmem() / 1073741824),
    procCount,
    holders,
    waiting,
    dead,
    recent: recentEvents(),
  };
}

const PAGE = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Очередь проверок</title>
<style>
:root{--bg:#f4f5f7;--card:#fff;--ink:#14161a;--mute:#6b7280;--soft:#eceef2;--go:#0f9d58;--warn:#d97706;--bad:#d93025;--accent:#2f5bea;--shadow:0 1px 2px rgba(16,24,40,.06),0 8px 24px rgba(16,24,40,.06)}
@media (prefers-color-scheme:dark){:root{--bg:#0e1014;--card:#171a20;--ink:#eef0f4;--mute:#98a1b0;--soft:#20242c;--go:#34c77b;--warn:#f0a43a;--bad:#ff6b5e;--accent:#7b9bff;--shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.35)}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 -apple-system,"Segoe UI",Inter,Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:980px;margin:0 auto;padding:24px 16px 56px}
header{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:baseline;justify-content:space-between;margin-bottom:18px}
h1{font-size:26px;line-height:1.15;margin:0;letter-spacing:-.02em}
.stamp{color:var(--mute);font-variant-numeric:tabular-nums}.stamp b{color:var(--ink);font-weight:600}
.stale .stamp b{color:var(--bad)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:22px}
.tile{background:var(--card);border-radius:16px;padding:14px 16px;box-shadow:var(--shadow)}
.tile .n{font-size:28px;font-weight:650;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.tile .l{color:var(--mute);font-size:13px}
.n.bad{color:var(--bad)}.n.warn{color:var(--warn)}.n.go{color:var(--go)}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--mute);margin:26px 4px 10px;font-weight:650}
.card{background:var(--card);border-radius:16px;box-shadow:var(--shadow);overflow:hidden}
.row{display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:start;padding:13px 16px}
.row+.row{background:linear-gradient(var(--soft),var(--soft)) top/calc(100% - 32px) 1px no-repeat}
.pos{width:32px;height:32px;border-radius:10px;background:var(--soft);display:grid;place-items:center;font-weight:650;color:var(--mute);font-variant-numeric:tabular-nums}
.now .pos{background:var(--go);color:#fff}
.t{font-weight:600;overflow-wrap:anywhere}.w{color:var(--mute);overflow-wrap:anywhere}
.id{color:var(--mute);font:12px ui-monospace,Consolas,monospace}
.time{font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--mute);text-align:right}
.time.long{color:var(--warn)}.time.vlong{color:var(--bad)}
.tag{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:999px;background:color-mix(in srgb,var(--bad) 14%,transparent);color:var(--bad);font-size:12px;font-weight:650}
.empty{padding:18px 16px;color:var(--mute)}
.note{color:var(--mute);font-size:13px;margin:8px 4px 0}
details{margin-top:22px}summary{cursor:pointer;color:var(--mute);font-size:13px;text-transform:uppercase;letter-spacing:.08em;font-weight:650;margin:0 4px 10px}
.deadlist{padding:12px 16px;color:var(--mute);font:12px/1.7 ui-monospace,Consolas,monospace;overflow-wrap:anywhere}
@media (max-width:560px){.row{grid-template-columns:36px 1fr}.time{grid-column:2;text-align:left}}
</style></head><body><div class="wrap" id="root">
<header><h1>Очередь проверок</h1><div class="stamp">обновлено <b id="stamp">—</b></div></header>
<div class="tiles" id="tiles"></div>
<h2>Сейчас идёт</h2><div class="card" id="now"></div>
<h2>Ждут слот</h2><div class="card" id="wait"></div>
<p class="note">Порядок — по времени ожидания. Светофор выдаёт слот не строго по очереди: его берёт та сессия, чья проверка первой заметит свободный слот.</p>
<h2>Недавно прошли</h2><div class="card" id="recent"></div>
<details><summary id="deadsum">Мёртвые записи</summary><div class="card"><div class="deadlist" id="dead"></div></div></details>
</div>
<script>
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dur=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?h+' ч '+m+' мин':m?m+' мин '+String(x).padStart(2,'0')+' с':x+' с'};
const tag=u=>u==='deploy'?'<span class="tag">выкладка</span>':'';
const name=r=>esc(r.title||'сессия без названия');
let last=0;
function draw(d){
  last=Date.now();document.getElementById('root').classList.remove('stale');
  document.getElementById('stamp').textContent=new Date(d.at).toLocaleTimeString('ru-RU');
  const memCls=d.freeMemGb<2?'bad':d.freeMemGb<6?'warn':'go';
  const pc=d.procCount==null?'…':d.procCount;const pcCls=d.procCount>=140?'bad':d.procCount>=60?'warn':'';
  document.getElementById('tiles').innerHTML=
   '<div class="tile"><div class="n '+(d.holders.length?'warn':'go')+'">'+(d.holders.length?'занят':'свободен')+'</div><div class="l">слот проверок</div></div>'+
   '<div class="tile"><div class="n">'+d.waiting.length+'</div><div class="l">живых сессий ждут</div></div>'+
   '<div class="tile"><div class="n '+memCls+'">'+d.freeMemGb+' ГБ</div><div class="l">свободной памяти из '+d.totalMemGb+'</div></div>'+
   '<div class="tile"><div class="n '+pcCls+'">'+pc+'</div><div class="l">процессов node и claude</div></div>';
  document.getElementById('now').innerHTML=d.holders.length?d.holders.map(h=>
   '<div class="row now"><div class="pos">▶</div><div><div class="t">'+name(h)+tag(h.urgency)+'</div><div class="w">'+esc(h.why||'описание не указано')+'</div><div class="id">'+esc(h.id)+'</div></div><div class="time '+(h.heldSec>1200?'vlong':h.heldSec>600?'long':'')+'">держит '+dur(h.heldSec)+'</div></div>').join(''):'<div class="empty">Слот свободен — никто ничего тяжёлого не гонит.</div>';
  document.getElementById('wait').innerHTML=d.waiting.length?d.waiting.map((w,i)=>
   '<div class="row"><div class="pos">'+(i+1)+'</div><div><div class="t">'+name(w)+tag(w.urgency)+'</div><div class="w">'+esc(w.want||'что именно ждёт — в журнале сессии не найдено')+'</div><div class="id">'+esc(w.id)+'</div></div><div class="time '+(w.waitSec>2400?'vlong':w.waitSec>900?'long':'')+'">ждёт '+dur(w.waitSec)+'</div></div>').join(''):'<div class="empty">Очередь пуста.</div>';
  document.getElementById('recent').innerHTML=d.recent.length?d.recent.map(r=>
   '<div class="row"><div class="pos">✓</div><div><div class="t">'+name(r)+'</div><div class="w">'+esc(r.why||'описание не указано')+'</div><div class="id">'+esc(r.id)+'</div></div><div class="time">'+esc(r.end)+' · шла '+dur(r.durSec)+'</div></div>').join(''):'<div class="empty">Пока никто не проходил.</div>';
  document.getElementById('deadsum').textContent='Мёртвые записи — '+d.dead.length;
  document.getElementById('dead').innerHTML=d.dead.length?d.dead.map(x=>esc(x.id)+' — висит '+dur(x.ageSec)).join('<br>'):'Мёртвых записей нет.';
}
async function tick(){try{const r=await fetch('/data',{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);draw(await r.json())}catch(e){console.warn('[QUEUE-BOARD] данные не пришли:',e.message);if(Date.now()-last>15000)document.getElementById('root').classList.add('stale')}}
tick();setInterval(tick,5000);
</script></body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/data') {
    let body;
    try {
      body = JSON.stringify(snapshot());
    } catch (e) {
      console.warn(LOG, 'не собрал снимок', e.message);
      res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'snapshot_failed' }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(body);
    return;
  }
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(PAGE);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

server.on('error', (e) => {
  console.error(LOG, 'сервер не поднялся:', e.code || e.message);
  process.exit(1);
});
// зачем: только 127.0.0.1 — страница служебная, с других машин недоступна
server.listen(PORT, '127.0.0.1', () => console.log(LOG, 'http://127.0.0.1:' + PORT, 'читаю', SEM));

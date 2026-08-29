// зачем: владелец отмечает понравившиеся звуки прямо в панели просмотра, а я
// забираю выбор сам — без копирования и пересылки. Страница шлёт отметки сюда,
// сервер пишет их в choices.json, который я просто читаю с диска.
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const PORT = 8777;
const CHOICES = path.join(DIR, 'choices.json');
// зачем: второй раунд пишем в отдельный файл, чтобы выбор первого раунда
// (16 уже зашитых звуков) нельзя было случайно затереть.
const CHOICES2 = path.join(DIR, 'choices2.json');
const CHOICES3 = path.join(DIR, 'choices3.json');
// зачем: единая страница вместо трёх — свой файл выбора, прошлые не трогаем.
const CHOICESF = path.join(DIR, 'choices_final.json');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
};

const readFile = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
};
const readChoices = () => readFile(CHOICES);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Сохранение одной отметки. Пишем сразу — чтобы выбор не потерялся,
  // если страницу закроют не дойдя до конца списка.
  if (req.method === 'POST' && (url.pathname === '/pick' || url.pathname === '/pick2' || url.pathname === '/pick3' || url.pathname === '/pickF')) {
    const target = url.pathname === '/pickF' ? CHOICESF : url.pathname === '/pick3' ? CHOICES3 : url.pathname === '/pick2' ? CHOICES2 : CHOICES;
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const { id, variant } = JSON.parse(body);
        const all = readFile(target);
        if (variant === null) delete all[id]; else all[id] = variant;
        fs.writeFileSync(target, JSON.stringify(all, null, 2), 'utf8');
        res.writeHead(200, TYPES['.json']).end(JSON.stringify({ ok: true, total: Object.keys(all).length }));
      } catch (e) {
        res.writeHead(400, TYPES['.json']).end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  if (url.pathname === '/choices' || url.pathname === '/choices2' || url.pathname === '/choices3' || url.pathname === '/choicesF') {
    const src = url.pathname === '/choicesF' ? CHOICESF : url.pathname === '/choices3' ? CHOICES3 : url.pathname === '/choices2' ? CHOICES2 : CHOICES;
    res.writeHead(200, TYPES['.json']).end(JSON.stringify(readFile(src), null, 2));
    return;
  }

  if (url.pathname === '/doc') { res.writeHead(302, { Location: '/polnaya-ozvuchka.html' }).end(); return; }
  const name = url.pathname === '/' ? '/zvuki.html' : url.pathname;
  const file = path.join(DIR, path.normalize(name).replace(/^[\\/]+/, ''));
  if (!file.startsWith(DIR)) { res.writeHead(403).end('no'); return; }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log('listening on ' + PORT));

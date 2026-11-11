// зачем: макет открывается в браузере по http (в части браузеров картинки и шрифты с диска file:// блокируются). Запуск: node serve.cjs → http://localhost:4173
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = __dirname; const PORT = Number(process.env.PORT) || 4173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.ttf': 'font/ttf', '.css': 'text/css; charset=utf-8' };
http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = path.normalize(path.join(ROOT, rel === '/' ? 'index.html' : rel));
  if (!file.startsWith(ROOT)) { console.warn('[HOME-LUXE] отказ: путь вне папки макета', rel); res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { console.warn('[HOME-LUXE] нет файла', rel, err.code); res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(buf);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`[HOME-LUXE] http://localhost:${PORT}`));

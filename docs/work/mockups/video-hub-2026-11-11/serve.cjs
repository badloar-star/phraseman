// зачем: макет берёт шрифты и значки из соседней папки home-luxe-2026-11-11, поэтому раздаём общую папку макетов, а не только свою.
// Запуск: node docs/work/mockups/video-hub-2026-11-11/serve.cjs → http://localhost:4191/video-hub-2026-11-11/
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..'); const PORT = Number(process.env.PORT) || 4191;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.ttf': 'font/ttf', '.css': 'text/css; charset=utf-8' };
http.createServer((req, res) => {
  let rel = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rel === '/') rel = '/video-hub-2026-11-11/index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) { console.warn('[VIDEO-HUB] отказ: путь вне папки макетов', rel); res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { console.warn('[VIDEO-HUB] нет файла', rel, err.code); res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(buf);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`[VIDEO-HUB] http://localhost:${PORT}/video-hub-2026-11-11/`));

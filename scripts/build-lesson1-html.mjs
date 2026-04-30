import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const mdPath = path.join(root, 'docs', 'lesson-1-full-content.md');
const outPath = path.join(root, 'OPEN-LESSON1.html');

const md = fs.readFileSync(mdPath, 'utf8');
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Phraseman — Урок 1 (весь текст)</title>
  <style>
    body { font-family: Segoe UI, system-ui, sans-serif; background: #121212; color: #e8e8e8; max-width: 56rem; margin: 0 auto; padding: 1.25rem; line-height: 1.5; }
    .banner { background: #1e3a2f; border: 1px solid #2d5a45; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
    .banner strong { color: #8fd4a6; }
    pre { white-space: pre-wrap; word-break: break-word; background: #1a1a1a; padding: 1rem; border-radius: 8px; border: 1px solid #333; font-size: 13px; }
    h1 { font-size: 1.35rem; margin-top: 0; }
  </style>
</head>
<body>
  <div class="banner">
    <h1>Урок 1 — справочник</h1>
    <p>Если из чата Cursor не открывает <code>.md</code> (ошибка <code>%5C</code>): открой <strong>этот</strong> файл через Проводник — двойной клик по <code>OPEN-LESSON1.html</code> в папке проекта <code>phraseman</code>.</p>
    <p>В Cursor файл всё равно можно открыть: левая панель <strong>Explorer</strong> → клик по <code>OPEN-LESSON1.html</code> или <code>docs/lesson-1-full-content.md</code> (не по ссылке из чата).</p>
  </div>
  <pre>${esc(md)}</pre>
</body>
</html>`;

fs.writeFileSync(outPath, html, 'utf8');
console.log('OK:', outPath);

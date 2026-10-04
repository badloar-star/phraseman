// Пересчёт хэшей зафиксированного макета раздела «Карточки». Запускать ТОЛЬКО с прямого слова владельца.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs/design/v2-app');
const FILES = ['cards-section.html', 'cards-section.css', 'cards-section-extra.js', 'cards-section-zoom.js', 'cards-glass.css'];
const files = {};
for (const f of FILES) files[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\r\n/g, '\n'), 'utf8').digest('hex');
const about = 'ЗАФИКСИРОВАНО владельцем 04.10: «эти макеты одобряю отлично, их надо зафиксировать, чтобы никогда не потерять, строго фиксируем в этом состоянии». Перенос в приложение — 1 в 1 без потерь.';
fs.writeFileSync(path.join(DIR, 'cards-section.lock.json'), JSON.stringify({ about, files }, null, 2) + '\n');
console.log('[CARDS-SECTION-LOCK]', files);

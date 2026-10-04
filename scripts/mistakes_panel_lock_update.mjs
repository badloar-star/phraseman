// Пересчёт хэшей зафиксированного макета «Мои ошибки — Панель». Запускать ТОЛЬКО с прямого слова владельца.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs/design/v2-app');
const FILES = ['mistakes-panel.html'];
const files = {};
for (const f of FILES) files[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\r\n/g, '\n'), 'utf8').digest('hex');
const about = 'ЗАФИКСИРОВАНО владельцем 04.10: раздел «Мои ошибки» в концепции Б «Панель» одобрен («ХОРОШО»). Перенос в приложение — 1 в 1. Не повторять язык «Карточек».';
fs.writeFileSync(path.join(DIR, 'mistakes-panel.lock.json'), JSON.stringify({ about, files }, null, 2) + '\n');
console.log('[MISTAKES-PANEL-LOCK]', files);

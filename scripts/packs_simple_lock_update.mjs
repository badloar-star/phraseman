// Пересчёт хэша зафиксированного макета «Наборы сообщества». Только с прямого слова владельца.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs/design/v2-app');
const files = {};
for (const f of ['packs-simple.html']) files[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\r\n/g, '\n'), 'utf8').digest('hex');
fs.writeFileSync(path.join(DIR, 'packs-simple.lock.json'), JSON.stringify({ about: 'ЗАФИКСИРОВАНО владельцем 04.10: «Наборы сообщества» — один простой вариант на утверждённом каталоге «Карточек» одобрен («да»).', files }, null, 2) + '\n');
console.log('[PACKS-LOCK]', files);

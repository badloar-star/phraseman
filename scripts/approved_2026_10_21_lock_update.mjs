// Пересчёт хэшей эталонов, утверждённых владельцем 21.10 («Найди пары» вар. 2, Пик «Собери перевод» вар. A, кольцо Plus, «Обучение» способ 2, Главная A «Сцена», экзамен на способе 2). Только с прямого слова владельца.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs/design/v2-app');
const files = {};
for (const f of ['speed-match-long-pairs.html', 'peak-phrase-builder.html', 'plus-ring-etalon.html', 'course-hybrid-1-4.html', 'home-new-concepts.html', 'chapter-exam-season.html']) files[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\r\n/g, '\n'), 'utf8').digest('hex');
fs.writeFileSync(path.join(DIR, 'approved-2026-10-21.lock.json'), JSON.stringify({ about: 'УТВЕРЖДЕНО владельцем 21.10: «Найди пары» — вариант 2 (узкая колонка слов 36% + широкая переводов); Пик «Собери перевод» — вариант A (ячейки-плашки + «Проверить»); Plus — эталон кольца как есть; «Обучение» — способ 2 «Сезон и карусель карт» (course-hybrid-1-4.html, раздел «Способ 2»); Главная — A «Сцена» (home-new-concepts.html, раздел A); экзамен главы и тест-распределение на способе 2 (chapter-exam-season.html), плитки ответов — эталон заданий V2.', files }, null, 2) + '\n');
console.log('[APPROVED-1021-LOCK]', files);

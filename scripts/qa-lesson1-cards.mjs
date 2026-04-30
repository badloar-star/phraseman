/**
 * QA карточек урока 1: структура + эвристики (длина, дубли, шаблоны).
 * Запуск: node scripts/qa-lesson1-cards.mjs
 * Альтернативный файл: node scripts/qa-lesson1-cards.mjs --file=path/to/copy.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runLesson1Qa } from './lib/qa-lesson1-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function main() {
  const fileArg = process.argv.find((a) => a.startsWith('--file='));
  const rel = fileArg ? fileArg.slice('--file='.length) : path.join('app', 'lesson_cards_data.ts');
  const cardsPath = path.isAbsolute(rel) ? rel : path.join(root, rel);
  const full = fs.readFileSync(cardsPath, 'utf8');
  const report = runLesson1Qa(full, path.relative(root, cardsPath));
  report.summary.docPhases = [
    'A–D см. docs/pipelines/lesson-cards-generation.ru.md',
    'C2 — агенты C2-RU/C2-UK по docs/pipelines/lesson-cards-c2-agent-prompts.md (этот скрипт их не вызывает)',
  ];

  const json = JSON.stringify(report, null, 2);
  const outArg = process.argv.find((a) => a.startsWith('--json='));
  if (outArg) {
    const p = outArg.slice('--json='.length);
    const abs = path.isAbsolute(p) ? p : path.join(root, p);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, json, 'utf8');
    console.log('Wrote', p);
  }
  console.log(json);
  if (report.summary.errorCount > 0) process.exitCode = 1;
}

main();

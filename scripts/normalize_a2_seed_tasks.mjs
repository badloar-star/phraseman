/**
 * Чинит task вида "foo · foo" и пустые — подставляет канон по type.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, 'a2_seed.json');

const DEFAULT_TASK = {
  fill_blank: 'Выберите правильный вариант · Оберіть правильний варіант',
  complete_phrasal: 'Закончите фразовый глагол · Доповніть фразове дієслово',
  find_error: 'Найдите неверное предложение · Знайдіть неправильне речення',
  translate_meaning: 'Выберите значение выражения · Оберіть значення вислову',
  choose_phrasal: 'Выберите фразовый глагол · Оберіть фразове дієслово',
};

function normTask(t) {
  return String(t || '')
    .replace(/\s*\/\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim();
}

const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
let fixed = 0;
for (const q of raw) {
  const t = normTask(q.task);
  const parts = t.split(' · ').map((s) => s.trim()).filter(Boolean);
  const same =
    parts.length === 2 &&
    parts[0].toLowerCase() === parts[1].toLowerCase();
  const empty = !t;
  if ((same || empty) && DEFAULT_TASK[q.type]) {
    q.task = DEFAULT_TASK[q.type];
    fixed++;
  } else {
    q.task = t;
  }
}
fs.writeFileSync(seedPath, JSON.stringify(raw, null, 2) + '\n', 'utf8');
console.log('normalized tasks:', fixed, 'total', raw.length);

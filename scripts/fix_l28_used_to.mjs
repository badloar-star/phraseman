// Автофикс L28: для всех 'Did you use to ...?' фраз добавляем 'бывало,' в RU и 'раніше' в UA,
// чтобы игрок понял что нужно собирать структуру use to.
//
// Запуск: node scripts/fix_l28_used_to.mjs --apply

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

const file = path.join(ROOT, 'app/lesson_data_25_32.ts');
let txt = fs.readFileSync(file, 'utf8');

// Идём по парам (english=Did you use to ...?) → находим ниже russian: '...' и ukrainian: '...'
// и добавляем "Бывало, " в RU и "Чи раніше " в UA, если их там ещё нет.
const blockRe = /english:\s*'(Did you use to[^']+\?)'\s*,\s*\n\s*russian:\s*'([^']+)'\s*,\s*\n\s*ukrainian:\s*'([^']+)'/g;

let count = 0;
const out = txt.replace(blockRe, (full, eng, ru, uk) => {
  let newRu = ru;
  let newUk = uk;
  if (!/^Бывало/i.test(ru)) {
    // Преобразуем "Ты ..." в "Бывало, ты ..." и сохраняем ?
    newRu = `Бывало, ${ru[0].toLowerCase()}${ru.slice(1)}`;
  }
  if (!/^Чи\s+раніше/i.test(uk)) {
    // Если уже начинается с "Чи" — добавим "раніше" после Чи.
    if (/^Чи\s/i.test(uk)) {
      newUk = uk.replace(/^Чи\s+/i, 'Чи раніше ');
    } else {
      newUk = `Чи раніше ${uk[0].toLowerCase()}${uk.slice(1)}`;
    }
  }
  if (newRu === ru && newUk === uk) return full;
  count += 1;
  console.log(`- EN: ${eng}`);
  if (newRu !== ru) console.log(`  RU: ${ru} → ${newRu}`);
  if (newUk !== uk) console.log(`  UA: ${uk} → ${newUk}`);
  return `english: '${eng}',\n    russian: '${newRu}',\n    ukrainian: '${newUk}'`;
});

if (APPLY && count > 0) {
  fs.writeFileSync(file, out, 'utf8');
  console.log(`\n✓ Записано ${count} правок`);
} else {
  console.log(`\n${APPLY ? 'Нет изменений' : 'Dry-run'}: ${count} правок`);
}

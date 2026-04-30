/**
 * Пересобирает §4.0–4.2 в lesson markdown из app/lesson_cards_data.ts (lessonCards[1]).
 * Запуск: node scripts/sync-lesson1-cards-md.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const cardsPath = path.join(root, 'app', 'lesson_cards_data.ts');

function readQuotedField(block, fieldName) {
  const key = `${fieldName}: "`;
  const idx = block.indexOf(key);
  if (idx === -1) throw new Error(`Missing ${fieldName} in card block`);
  let pos = idx + key.length;
  let out = '';
  while (pos < block.length) {
    const c = block[pos];
    if (c === '\\') {
      out += block[pos + 1] ?? '';
      pos += 2;
      continue;
    }
    if (c === '"') break;
    out += c;
    pos++;
  }
  return out;
}

/** Только карты 1..50 урока 1 (без обёртки `1: {` / `},`). Конец — перед `  },\\n  2: {` урока 2. */
function getLesson1Block(text) {
  const lesson1Open = text.indexOf('  1: {');
  const lesson2Start = text.indexOf('\n  },\n  2: {\n    1: {');
  if (lesson1Open === -1 || lesson2Start === -1) {
    throw new Error('lesson 1 boundaries not found in lesson_cards_data.ts');
  }
  const innerStart = lesson1Open + '  1: {\n'.length;
  return text.slice(innerStart, lesson2Start);
}

function getCardBlock(lessonBlock, n) {
  const marker = `    ${n}: {`;
  const start = lessonBlock.indexOf(marker);
  if (start === -1) throw new Error(`Card ${n} start not found`);
  const next =
    n < 50 ? lessonBlock.indexOf(`    ${n + 1}: {`, start + 1) : lessonBlock.length;
  if (n < 50 && next === -1) throw new Error(`Card ${n + 1} not found`);
  return lessonBlock.slice(start, next);
}

function escapeMdTable(s) {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function buildSection4Md(cards) {
  let md = '';
  md +=
    '**Секция 4 (`lessonCards[1]`):** соответствует `app/lesson_cards_data.ts`. Пересборка этого блока: `node scripts/sync-lesson1-cards-md.mjs`.\n\n';
  md += '### 4.0 Тексты подсказки после ошибки в уроке (`wrongRu` / `wrongUk`)\n\n';
  md +=
    'В приложении (`lesson1.tsx`) при **неверном** ответе показывается красный блок с текстом из **`wrongRu`** (интерфейс RU) или **`wrongUk`** (UK). Ниже — **все 50** строк (они же в колонках таблиц §4.1–4.2).\n\n';
  md += '#### wrongRu (все 50)\n\n';
  cards.forEach((c, j) => {
    md += `${j + 1}. ${c.wrongRu}\n`;
  });
  md += '\n#### wrongUk (все 50)\n\n';
  cards.forEach((c, j) => {
    md += `${j + 1}. ${c.wrongUk}\n`;
  });
  md += '\n### 4.1 Карточки 1–21 (полная таблица)\n\n';
  md += '| # | correctRu | correctUk | wrongRu | wrongUk | secretRu | secretUk |\n';
  md += '|---|------------|-----------|---------|---------|----------|----------|\n';
  for (let i = 0; i < 21; i++) {
    const c = cards[i];
    const n = i + 1;
    md += `| ${n} | ${escapeMdTable(c.correctRu)} | ${escapeMdTable(c.correctUk)} | ${escapeMdTable(c.wrongRu)} | ${escapeMdTable(c.wrongUk)} | ${escapeMdTable(c.secretRu)} | ${escapeMdTable(c.secretUk)} |\n`;
  }
  md += '\n### 4.2 Карточки 22–50 (полная таблица)\n\n';
  md += '| # | correctRu | correctUk | wrongRu | wrongUk | secretRu | secretUk |\n';
  md += '|---|------------|-----------|---------|---------|----------|----------|\n';
  for (let i = 21; i < 50; i++) {
    const c = cards[i];
    const n = i + 1;
    md += `| ${n} | ${escapeMdTable(c.correctRu)} | ${escapeMdTable(c.correctUk)} | ${escapeMdTable(c.wrongRu)} | ${escapeMdTable(c.wrongUk)} | ${escapeMdTable(c.secretRu)} | ${escapeMdTable(c.secretUk)} |\n`;
  }
  md += '\n';
  return md;
}

function spliceSection4(doc, section4Md) {
  const normalized = doc.replace(/\r\n/g, '\n');
  const fileLine = '*Файл сгенерирован для чтения';
  const fi = normalized.indexOf(fileLine);
  if (fi === -1) throw new Error('footer *Файл сгенерирован… not found in markdown');

  const cut = normalized.lastIndexOf('\n---\n', fi);
  if (cut === -1) throw new Error('horizontal rule --- before footer not found');
  const head = normalized.slice(0, cut);
  const tail = normalized.slice(cut);

  const markers = ['**Источник правды:**', '**Секция 4 (`lessonCards[1]`):**'];
  let splitPoint = -1;
  for (const m of markers) {
    const i = head.indexOf(m);
    if (i !== -1) {
      splitPoint = i;
      break;
    }
  }
  if (splitPoint === -1) {
    throw new Error('No section-4 sync marker (**Источник правды** / **Секция 4**)');
  }

  return head.slice(0, splitPoint) + section4Md + tail;
}

function main() {
  const full = fs.readFileSync(cardsPath, 'utf8').replace(/\r\n/g, '\n');
  const lb = getLesson1Block(full);
  const cards = [];
  for (let i = 1; i <= 50; i++) {
    const block = getCardBlock(lb, i);
    cards.push({
      correctRu: readQuotedField(block, 'correctRu'),
      correctUk: readQuotedField(block, 'correctUk'),
      wrongRu: readQuotedField(block, 'wrongRu'),
      wrongUk: readQuotedField(block, 'wrongUk'),
      secretRu: readQuotedField(block, 'secretRu'),
      secretUk: readQuotedField(block, 'secretUk'),
    });
  }

  const section4Md = buildSection4Md(cards);

  const docPath = path.join(root, 'docs', 'lesson-1-full-content.md');
  const doc = fs.readFileSync(docPath, 'utf8');
  fs.writeFileSync(docPath, spliceSection4(doc, section4Md), 'utf8');
  console.log('OK:', docPath);
}

main();

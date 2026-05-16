const fs = require('fs');

function parseCsv(source) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function mdCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').trim();
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ').trim()}"`;
}

const text = fs.readFileSync('docs/lesson-vocabulary-table.csv', 'utf8').replace(/^\uFEFF/, '');
const [header, ...rows] = parseCsv(text);
const idx = Object.fromEntries(header.map((name, index) => [name, index]));

const seen = new Map();
const repeats = [];

for (const row of rows) {
  if (!row.length || !row[idx.en]) continue;
  const item = {
    lesson: Number(row[idx.lesson]),
    number: Number(row[idx.number]),
    en: row[idx.en],
    ru: row[idx.ru],
    uk: row[idx.uk],
    pos: row[idx.pos],
    note: row[idx.note],
  };
  const key = item.en.trim().toLowerCase();
  const first = seen.get(key);
  if (!first) {
    seen.set(key, item);
  } else if (item.lesson > first.lesson) {
    repeats.push({
      ...item,
      firstLesson: first.lesson,
      firstNumber: first.number,
      firstRu: first.ru,
      firstUk: first.uk,
      firstPos: first.pos,
    });
  }
}

repeats.sort((a, b) => a.lesson - b.lesson || a.number - b.number || a.en.localeCompare(b.en));

const byLesson = new Map();
for (const repeat of repeats) {
  if (!byLesson.has(repeat.lesson)) byLesson.set(repeat.lesson, []);
  byLesson.get(repeat.lesson).push(repeat);
}

let md = '';
md += '# Повторы слов между уроками\n\n';
md += 'Проверка сделана по `docs/lesson-vocabulary-table.csv`. Ключ сравнения: английское слово `EN` в нижнем регистре. Правило проверки: после первого появления слово не должно повторяться в следующих уроках.\n\n';
md += `Всего строк в таблице: ${rows.length}.\n`;
md += `Уникальных EN: ${seen.size}.\n`;
md += `Повторов в следующих уроках: ${repeats.length}.\n`;
md += `Уроков с повторами: ${byLesson.size}.\n\n`;

md += '## Сводка по урокам\n\n';
md += '| Урок | Повторов |\n';
md += '| --- | --- |\n';
for (const [lesson, items] of [...byLesson.entries()].sort((a, b) => a[0] - b[0])) {
  md += `| ${lesson} | ${items.length} |\n`;
}

md += '\n## Полная таблица повторов\n\n';
md += '| Урок | № | EN | RU | UK | POS | Первое появление | Первый RU | Первый UK |\n';
md += '| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
for (const item of repeats) {
  md += `| ${item.lesson} | ${item.number} | ${mdCell(item.en)} | ${mdCell(item.ru)} | ${mdCell(item.uk)} | ${mdCell(item.pos)} | ${item.firstLesson}.${item.firstNumber} | ${mdCell(item.firstRu)} | ${mdCell(item.firstUk)} |\n`;
}

const csv = [
  ['lesson', 'number', 'en', 'ru', 'uk', 'pos', 'first_lesson', 'first_number', 'first_ru', 'first_uk'].map(csvCell).join(','),
  ...repeats.map((item) => [
    item.lesson,
    item.number,
    item.en,
    item.ru,
    item.uk,
    item.pos,
    item.firstLesson,
    item.firstNumber,
    item.firstRu,
    item.firstUk,
  ].map(csvCell).join(',')),
].join('\n');

fs.writeFileSync('docs/lesson-vocabulary-duplicates-report.md', md, 'utf8');
fs.writeFileSync('docs/lesson-vocabulary-duplicates.csv', `${csv}\n`, 'utf8');

console.log(JSON.stringify({
  rows: rows.length,
  uniqueWords: seen.size,
  repeats: repeats.length,
  lessonsWithRepeats: byLesson.size,
  markdown: 'docs/lesson-vocabulary-duplicates-report.md',
  csv: 'docs/lesson-vocabulary-duplicates.csv',
}, null, 2));

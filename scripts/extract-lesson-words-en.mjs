import fs from 'fs';

const s = fs.readFileSync('app/lesson_words.tsx', 'utf8');
const rows = [];
const re = /\{ en: '((?:[^'\\]|\\.)*)', ru: '((?:[^'\\]|\\.)*)', uk: '((?:[^'\\]|\\.)*)'/g;
let m;
while ((m = re.exec(s)) !== null) {
  rows.push({ en: m[1].replace(/\\'/g, "'"), ru: m[2].replace(/\\'/g, "'"), uk: m[3].replace(/\\'/g, "'") });
}
fs.writeFileSync('docs/reports/lesson_words_en_ru_uk.json', JSON.stringify(rows, null, 0), 'utf8');
console.log('wrote', rows.length, 'rows');

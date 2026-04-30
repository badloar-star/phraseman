import fs from 'fs';

const s = fs.readFileSync('app/lesson_words.tsx', 'utf8');
const rows = [];
const re =
  /\{\s*en:\s*(['"])((?:(?!\1).|\\.)*)\1\s*,\s*ru:\s*(['"])((?:(?!\3).|\\.)*)\3\s*,\s*uk:\s*(['"])((?:(?!\5).|\\.)*)\5/g;
let m;
while ((m = re.exec(s)) !== null) {
  const unq = (x) => x.replace(/\\(.)/g, (_, c) => (c === 'n' ? '\n' : c));
  rows.push({ en: unq(m[2]), ru: unq(m[4]), uk: unq(m[6]) });
}
fs.writeFileSync('docs/reports/lesson_words_en_ru_uk.json', JSON.stringify(rows, null, 0), 'utf8');
console.log('wrote', rows.length, 'rows');

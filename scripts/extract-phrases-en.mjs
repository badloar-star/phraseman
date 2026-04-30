import fs from 'fs';
const path = new URL('../app/lesson_data_1_8.ts', import.meta.url);
const lines = fs.readFileSync(path, 'utf8').split(/\n/);
const out = [];
for (let i = 0; i < lines.length; i++) {
  const idM = lines[i].match(/^    id: '(lesson[1-8]_phrase_\d+)'/);
  if (!idM) continue;
  const id = idM[1];
  let j = i + 1;
  while (j < lines.length && !/^    english:/.test(lines[j])) j++;
  const el = lines[j];
  let en;
  let m = el.match(/^    english: '((?:\\.|[^'\\])*)'/);
  if (m) {
    en = m[1].replace(/\\(.)/g, (_, c) => c);
  } else {
    m = el.match(/^    english: "((?:\\.|[^"\\])*)"/);
    if (!m) throw new Error(`No english for ${id}: ${el}`);
    en = m[1].replace(/\\(.)/g, (_, c) => c);
  }
  out.push({ id, english: en });
}
fs.writeFileSync(new URL('./phrases-en-order.json', import.meta.url), JSON.stringify(out, null, 2), 'utf8');
console.log('wrote', out.length, 'phrases');

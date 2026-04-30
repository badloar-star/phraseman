import fs from 'fs';
const s = fs.readFileSync('app/lesson_data_17_24.ts', 'utf8');
const out = [];

const reMulti =
  /id:\s*'([^']+)',\s*\n\s*english:\s*'((?:[^'\\]|\\.)*)'/gs;
let m;
while ((m = reMulti.exec(s)) !== null) {
  const id = m[1];
  if (!/^(lesson\d+_phrase_\d+)$/.test(id)) continue;
  const en = m[2].replace(/\\'/g, "'").replace(/\\n/g, '\n');
  out.push({ id, english: en });
}

const reCompact =
  /\{id:'(l\d+p\d+)',english:'((?:[^'\\]|\\.)*)'/gs;
while ((m = reCompact.exec(s)) !== null) {
  const id = m[1];
  const en = m[2].replace(/\\'/g, "'").replace(/\\n/g, '\n');
  out.push({ id, english: en });
}

console.log(JSON.stringify(out, null, 2));
console.error('count', out.length);

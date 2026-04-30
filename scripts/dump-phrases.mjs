import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const s = fs.readFileSync(join(__dirname, '..', 'app', 'lesson_data_17_24.ts'), 'utf8');
const out = [];
const seen = new Set();

function add(id, english) {
  if (seen.has(id)) return;
  seen.add(id);
  out.push({ id, english });
}

const reMulti = /id:\s*'([^']+)',\s*\n\s*english:\s*'((?:[^'\\]|\\.)*)'/gs;
let m;
while ((m = reMulti.exec(s)) !== null) {
  const id = m[1];
  if (!/^lesson\d+_phrase_\d+$/.test(id)) continue;
  add(id, m[2].replace(/\\'/g, "'"));
}

const reCompact = /\{id:'(l\d+p\d+)',english:'((?:[^'\\]|\\.)*)'/gs;
while ((m = reCompact.exec(s)) !== null) {
  add(m[1], m[2].replace(/\\'/g, "'"));
}

const m50 = /\{id:'l20p50',english:"((?:[^"\\]|\\.)*)"/s.exec(s);
if (m50) add('l20p50', m50[1].replace(/\\"/g, '"'));

fs.writeFileSync(join(__dirname, '..', 'phrases-export.json'), JSON.stringify(out, null, 2), 'utf8');
console.error('count', out.length);

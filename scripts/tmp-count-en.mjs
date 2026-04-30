import fs from 'fs';
const t = fs.readFileSync('app/lesson_words.tsx', 'utf8');
const m = [...t.matchAll(/en:\s*'((?:\\'|[^'])*)'/g)].map((x) => x[1].replace(/\\'/g, "'"));
const u = new Set(m);
console.log('total', m.length, 'unique', u.size);

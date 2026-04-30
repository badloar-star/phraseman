import fs from 'fs';
const s = fs.readFileSync('app/lesson_data_17_24.ts', 'utf8');
const u = s.match(/ukrainian:[^\n]+/g) || [];
console.log('ukrainian lines', u.length);
const ids = s.match(/id:\s*['"]?(lesson\d+_phrase_\d+|l\d+p\d+)/g) || [];
console.log('ids', ids.length);

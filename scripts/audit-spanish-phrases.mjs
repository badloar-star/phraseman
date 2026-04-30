import fs from 'fs';

const files = [
  'app/lesson_data_1_8.ts',
  'app/lesson_data_9_16.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
];

for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const ids = [...s.matchAll(/id:\s*'(lesson\d+_phrase_\d+)'/g)];
  const missing = [];
  for (let i = 0; i < ids.length; i++) {
    const start = ids[i].index;
    const end = i + 1 < ids.length ? ids[i + 1].index : s.length;
    const block = s.slice(start, end);
    if (!/\bspanish\s*:/.test(block)) missing.push(ids[i][1]);
  }
  console.log(`${f}: phrases ${ids.length}, missing spanish: ${missing.length}`);
  if (missing.length && missing.length <= 40) console.log(' ', missing.join(', '));
  else if (missing.length) console.log(' ', missing.slice(0, 25).join(', '), '…');
}

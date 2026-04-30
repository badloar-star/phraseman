import fs from 'fs';

const FILES = ['lesson_data_1_8.ts', 'lesson_data_9_16.ts', 'lesson_data_17_24.ts', 'lesson_data_25_32.ts'];
const ROOT = new URL('../app/', import.meta.url);

for (const name of FILES) {
  const lines = fs.readFileSync(new URL(name, ROOT), 'utf8').split('\n');
  const misses = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s+textRU:/.test(lines[i])) continue;
    let hasES = false;
    let j = i + 1;
    for (; j < lines.length && j < i + 30; j++) {
      const l = lines[j];
      if (/^\s+textES:/.test(l)) {
        hasES = true;
        break;
      }
      if (/^\s+titleRU:|^\s{2}\{|^\s+kind:/.test(l) && j > i + 1) break;
    }
    if (!hasES) misses.push({ line: i + 1, preview: lines[i].trim().slice(0, 50) });
  }
  console.log(name, misses.length === 0 ? 'OK' : misses.length + ' MISSING textES');
  if (misses.length && misses.length <= 15) console.log(misses);
  else if (misses.length) console.log('sample:', misses.slice(0, 8));
}

import fs from 'fs';

const FILES = ['lesson_data_1_8.ts', 'lesson_data_9_16.ts', 'lesson_data_17_24.ts', 'lesson_data_25_32.ts'];
const ROOT = new URL('../app/', import.meta.url);

for (const name of FILES) {
  const lines = fs.readFileSync(new URL(name, ROOT), 'utf8').split('\n');
  const misses = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s+titleRU:/.test(lines[i])) continue;
    let hasES = false;
    for (let j = i + 1; j < lines.length && j < i + 12; j++) {
      if (/^\s+titleES:/.test(lines[j])) {
        hasES = true;
        break;
      }
      if (/^\s+(textRU|examples|kind):/.test(lines[j])) break;
    }
    if (!hasES) misses.push({ line: i + 1, preview: lines[i].trim().slice(0, 44) });
  }
  console.log(name, misses.length ? misses.length + ' MISSING titleES' : 'OK');
  if (misses.length && misses.length <= 20) console.log(misses);
  else if (misses.length) console.log(misses.slice(0, 10));
}

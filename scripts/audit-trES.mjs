import fs from 'fs';

const FILES = ['lesson_data_1_8.ts', 'lesson_data_9_16.ts', 'lesson_data_17_24.ts', 'lesson_data_25_32.ts'];
const ROOT = new URL('../app/', import.meta.url);

for (const name of FILES) {
  const s = fs.readFileSync(new URL(name, ROOT), 'utf8');
  const uk = [...s.matchAll(/\btrUK:/g)].length;
  const es = [...s.matchAll(/\btrES:/g)].length;
  if (uk !== es) console.log(`${name}: trUK=${uk} trES=${es} MISMATCH`);
  else console.log(`${name}: tr examples OK (${es})`);
}

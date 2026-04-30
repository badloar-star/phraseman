import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, '..', 'app');

function phrasesMissingSpanish(filename) {
  const s = fs.readFileSync(path.join(appDir, filename), 'utf8');
  const re = /\{\s*\n\s*id: '(lesson\d+_phrase_\d+)'[\s\S]*?\n\s*\},(?=\s*\n\s*(?:\/\/|\{|$))/g;
  const missing = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const block = m[0];
    if (!/^\s*spanish\s*:/m.test(block)) missing.push(m[1]);
  }
  return missing;
}

for (const f of ['lesson_data_1_8.ts', 'lesson_data_9_16.ts', 'lesson_data_17_24.ts', 'lesson_data_25_32.ts']) {
  const miss = phrasesMissingSpanish(f);
  console.log(f, 'phrases without spanish:', miss.length);
  if (miss.length) console.log(miss.slice(0, 50).join('\n'), miss.length > 50 ? '\n...' : '');
}

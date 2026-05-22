import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, '..', 'app');

const files = fs
  .readdirSync(appDir)
  .filter((name) => /^lesson_intro_screens_lesson\d+_v2\.ts$/.test(name))
  .map((name) => path.join(appDir, name))
  .sort((a, b) => a.localeCompare(b));

const issues = [];
let totalTextRU = 0;
let totalTextES = 0;
let totalTrRU = 0;
let totalTrES = 0;

for (const file of files) {
  const rel = path.relative(path.join(__dirname, '..'), file);
  const text = fs.readFileSync(file, 'utf8');
  const textRU = (text.match(/\btextRU\s*:/g) || []).length;
  const textES = (text.match(/\btextES\s*:/g) || []).length;
  const trRU = (text.match(/\btrRU\s*:/g) || []).length;
  const trES = (text.match(/\btrES\s*:/g) || []).length;
  totalTextRU += textRU;
  totalTextES += textES;
  totalTrRU += trRU;
  totalTrES += trES;
  if (textRU !== textES) issues.push(`${rel}: textRU=${textRU} textES=${textES}`);
  if (trRU !== trES) issues.push(`${rel}: trRU=${trRU} trES=${trES}`);
}

if (files.length === 0) {
  issues.push('No lesson_intro_screens_lesson*_v2.ts files found.');
}

console.log(
  `intro Spanish audit: files=${files.length}, textRU=${totalTextRU}, textES=${totalTextES}, trRU=${totalTrRU}, trES=${totalTrES}`,
);

if (issues.length) {
  console.log('issues:');
  for (const issue of issues) console.log(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log('OK');
}

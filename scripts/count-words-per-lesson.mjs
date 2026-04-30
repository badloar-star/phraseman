import fs from 'fs';

const s = fs.readFileSync('app/lesson_words.tsx', 'utf8');
const lessons = {};
let cur = null;
for (const line of s.split('\n')) {
  const lm = line.match(/^  (\d+): \[/);
  if (lm) {
    cur = parseInt(lm[1], 10);
    lessons[cur] = 0;
    continue;
  }
  if (cur && line.includes("{ en: '")) lessons[cur]++;
}
console.log(lessons);
let t = 0;
for (let i = 1; i <= 8; i++) t += lessons[i] || 0;
console.log('lessons1-8 total', t);

import fs from 'node:fs';

const FILE = 'app/lesson_data_17_24.ts';
const TARGET = new Set([22, 23]);
const GENERIC = new Set(['i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
const PRONOUN_CORRECT = new Set([
  'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
]);

function readStringLiterals(src) {
  const out = [];
  const re = /(['"])((?:\\.|(?!\1).)*?)\1/g;
  let m;
  while ((m = re.exec(src))) out.push(m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
  return out;
}

const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);
let lesson = null;
let inWordsEn = false;
let phrase = '';
const findings = [];
const unique = new Map();

for (const line of lines) {
  const lessonMatch = line.match(/id:\s*['"]lesson(\d+)_phrase_(\d+)['"]/);
  if (lessonMatch) {
    lesson = Number(lessonMatch[1]);
    phrase = `lesson${lessonMatch[1]}_phrase_${lessonMatch[2]}`;
    inWordsEn = false;
  }
  if (line.includes('wordsEn:')) inWordsEn = true;
  if (!TARGET.has(lesson) || !inWordsEn || !line.includes('distractors:')) continue;

  const correct = line.match(/correct:\s*(['"])((?:\\.|(?!\1).)*?)\1/)?.[2];
  const dists = readStringLiterals(line.match(/distractors:\s*\[([^\]]*)\]/)?.[1] ?? '');
  if (!correct || /^[.,!?;:]+$/.test(correct)) continue;
  if (PRONOUN_CORRECT.has(correct.toLowerCase())) continue;

  const generic = dists.filter((d) => GENERIC.has(d.toLowerCase()));
  if (generic.length) {
    findings.push({ phrase, correct, generic, dists });
    if (!unique.has(correct.toLowerCase())) unique.set(correct.toLowerCase(), { correct, count: 0 });
    unique.get(correct.toLowerCase()).count += 1;
  }
}

console.log(`# Lesson 22/23 semantic distractor audit`);
console.log(`Generic pronoun filler rows: ${findings.length}`);
console.log('\n## Unique correct tokens affected');
for (const item of [...unique.values()].sort((a, b) => b.count - a.count || a.correct.localeCompare(b.correct))) {
  console.log(`- ${item.correct}: ${item.count}`);
}
console.log('\n## First 80 rows');
for (const row of findings.slice(0, 80)) {
  console.log(`- ${row.phrase}: ${row.correct} -> [${row.dists.join(', ')}]`);
}

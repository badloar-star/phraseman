import fs from 'node:fs';

const FILES = ['app/lesson_data_17_24.ts', 'app/lesson_data_25_32.ts'];
const TARGET = new Set([24, 25, 26, 27, 28, 29, 30, 32]);
const GENERIC = new Set(['i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
const PRONOUN_CORRECT = new Set([
  'i', 'you', 'he', 'she', 'we', 'they', 'it', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'our', 'their', 'its',
  'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
]);

function readStringLiterals(src) {
  const out = [];
  const re = /(['"])((?:\\.|(?!\1).)*?)\1/g;
  let m;
  while ((m = re.exec(src))) out.push(m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
  return out;
}

const findings = [];
const unique = new Map();
const byLesson = new Map();

for (const file of FILES) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let lesson = null;
  let inWordsEn = false;
  let phrase = '';

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
    if (!generic.length) continue;

    findings.push({ file, lesson, phrase, correct, generic, dists });
    if (!unique.has(correct.toLowerCase())) unique.set(correct.toLowerCase(), { correct, count: 0 });
    unique.get(correct.toLowerCase()).count += 1;
    byLesson.set(lesson, (byLesson.get(lesson) ?? 0) + 1);
  }
}

console.log(`# Lesson 24-30/32 semantic distractor audit`);
console.log(`Generic pronoun filler rows: ${findings.length}`);
console.log('\n## By lesson');
for (const lesson of [...TARGET].sort((a, b) => a - b)) {
  console.log(`- lesson ${lesson}: ${byLesson.get(lesson) ?? 0}`);
}
console.log('\n## Unique correct tokens affected');
for (const item of [...unique.values()].sort((a, b) => b.count - a.count || a.correct.localeCompare(b.correct))) {
  console.log(`- ${item.correct}: ${item.count}`);
}
console.log('\n## First 120 rows');
for (const row of findings.slice(0, 120)) {
  console.log(`- ${row.phrase}: ${row.correct} -> [${row.dists.join(', ')}]`);
}

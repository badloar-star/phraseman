const fs = require('fs');

const raw = fs.readFileSync('./assets/АРЕНА - Copy.txt', 'utf8');

// Split by ```json fences and extract all JSON arrays
const blocks = raw.split(/`{3,}json|`{3,}/g).filter(s => s.trim().startsWith('['));

let all = [];
for (const block of blocks) {
  try {
    const arr = JSON.parse(block.trim());
    all = all.concat(arr);
  } catch (e) {
    console.error('Block parse error:', e.message);
  }
}
console.log('Total objects:', all.length);

// Filter A1 only
const a1 = all.filter(q => q.level === 'A1');
console.log('A1 count:', a1.length);
console.log('Sample task:', a1[0]?.task);

// Deduplicate by question text
const seen = new Set();
const deduped = [];
for (const q of a1) {
  const key = (q.question || '').toLowerCase().trim();
  if (!key) continue;
  if (seen.has(key)) continue;
  seen.add(key);
  deduped.push(q);
}
console.log('After dedup:', deduped.length);

// Filter invalid
const valid = deduped.filter(q => {
  if (!q.correct || !q.question) return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  if (!q.options.includes(q.correct)) return false;
  // known bad
  if (q.question.includes('Open your book') && q.correct === 'at') return false;
  if (q.question.includes('turn ___ the light') && q.options.includes('of')) return false;
  return true;
});
console.log('After validation:', valid.length);

// Shuffle options in each question
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const result = valid.map((q, i) => ({
  id: `a1_${String(i + 1).padStart(3, '0')}`,
  level: 'A1',
  type: q.type,
  task: q.task || '',
  question: q.question,
  options: shuffle(q.options),
  correct: q.correct,
  rule: q.rule || '',
}));

// Verify
const bad = result.filter(q => !q.options.includes(q.correct));
console.log('Bad after shuffle:', bad.length);

const positions = [0,0,0,0];
result.forEach(q => positions[q.options.indexOf(q.correct)]++);
console.log('Correct position distribution:', positions);

const withTask = result.filter(q => q.task);
console.log('With task field:', withTask.length);

fs.writeFileSync('./assets/arena_questions_a1.json', JSON.stringify(result, null, 2));
console.log('Saved:', result.length, 'questions');

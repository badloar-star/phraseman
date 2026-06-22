// Deterministic quiz auditor: flags structural defects + heuristic ambiguity
// candidates for human review. Read-only.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const quizzes = JSON.parse(readFileSync(resolve(__dirname, 'CONTENT_QUIZZES.json'), 'utf8'));

const findings = [];
function add(sev, ref, type, detail) { findings.push({ sev, ref, type, detail }); }

// crude article/grammar heuristics for the "correct" choice
function looksUngrammatical(s) {
  const t = s.trim();
  const issues = [];
  // double space, leading lowercase after nothing, trailing odd punctuation handled elsewhere
  if (/\s{2,}/.test(t)) issues.push('double space');
  // "a" before vowel sound (rough) / "an" before consonant (rough)
  if (/\ba\s+[aeiou]/i.test(t) && !/\ba\s+(uni|use|user|eu|one)/i.test(t)) issues.push('"a" before vowel');
  if (/\ban\s+[bcdfghjklmnpqrstvwxyz]/i.test(t) && !/\ban\s+(hour|honest|honou?r|heir)/i.test(t)) issues.push('"an" before consonant');
  // "to" + verb-ing right after want/need (common quiz trap is intentional in distractors, skip)
  return issues;
}

for (const q of quizzes) {
  const ref = `${q.pool}#${q.idx}`;
  const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];

  // 1) correct index out of range
  for (const ci of correctArr) {
    if (ci < 0 || ci >= q.choices.length) { add('HIGH', ref, 'CORRECT_OUT_OF_RANGE', `correct=${ci} but ${q.choices.length} choices`); }
  }
  // 2) duplicate choices (same surface twice)
  const seen = new Map();
  q.choices.forEach((c, i) => {
    const k = String(c).trim().toLowerCase();
    if (seen.has(k)) add('MED', ref, 'DUPLICATE_CHOICE', `choices ${seen.get(k)} & ${i} identical: "${c}"`);
    else seen.set(k, i);
  });
  // 3) empty / missing prompt or choices
  if (!q.ru || !q.ru.trim()) add('MED', ref, 'EMPTY_RU', 'ru prompt empty');
  if (!q.uk || !q.uk.trim()) add('LOW', ref, 'EMPTY_UK', 'uk prompt empty');
  if (!q.choices || q.choices.length < 2) add('HIGH', ref, 'TOO_FEW_CHOICES', `only ${q.choices?.length || 0} choices`);
  // 4) explanations count mismatch with choices (explanation[i] should map to choice[i])
  if (q.explanations && q.explanations.length && q.explanations.length !== q.choices.length) {
    add('LOW', ref, 'EXPL_COUNT_MISMATCH', `${q.explanations.length} explanations vs ${q.choices.length} choices`);
  }
  // 5) the accepted correct choice looks ungrammatical (heuristic)
  for (const ci of correctArr) {
    const c = q.choices[ci];
    if (!c) continue;
    const iss = looksUngrammatical(c);
    if (iss.length) add('MED', ref, 'CORRECT_MAYBE_UNGRAMMATICAL', `"${c}" — ${iss.join(', ')}`);
  }
  // 6) mojibake in any text
  const mojiRe = /Ð|Ñ|Ð°|â€|Â|Ã/;
  for (const [field, val] of [['ru', q.ru], ['uk', q.uk]]) {
    if (val && mojiRe.test(val) && !/[а-яёіїєґ]/i.test(val)) add('MED', ref, 'MOJIBAKE', `${field}="${val}"`);
  }
}

findings.sort((a, b) => ({ HIGH: 0, MED: 1, LOW: 2 }[a.sev] - { HIGH: 0, MED: 1, LOW: 2 }[b.sev]));
const byType = {};
for (const f of findings) byType[f.type] = (byType[f.type] || 0) + 1;
console.log('quizzes:', quizzes.length, '| findings:', findings.length);
console.log('by type:', JSON.stringify(byType));
for (const f of findings.slice(0, 60)) console.log(`  [${f.sev}] ${f.ref} ${f.type} — ${f.detail}`);
writeFileSync(resolve(__dirname, 'QUIZ_DET_FINDINGS.json'), JSON.stringify(findings, null, 2), 'utf8');

/**
 * Аудит качества банков арены (A1/A2/B1): двусмысленные translate_meaning,
 * одинаковые EN-головы у вариантов, пустые rule, подозрительные correct.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function normSlashesToDot(s) {
  return String(s || '').replace(/\s*\/\s*/g, ' · ').replace(/\s+/g, ' ').trim();
}
function leadingSeg(s) {
  const t = normSlashesToDot(s);
  const i = t.indexOf('·');
  return (i >= 0 ? t.slice(0, i) : t).trim().toLowerCase();
}

function audit(arr, pool) {
  const issues = [];
  for (const q of arr) {
    const id = q.id;
    if (!q.rule || !String(q.rule).trim()) {
      issues.push({ id, pool, kind: 'empty_rule', q: q.question?.slice(0, 50) });
    }
    if (q.type === 'translate_meaning' && Array.isArray(q.options)) {
      const leads = q.options.map(leadingSeg);
      const set = new Set(leads);
      if (set.size < 4) {
        issues.push({
          id,
          pool,
          kind: 'translate_ambiguous_en_head',
          detail: leads.join(' | '),
        });
      }
      const low = q.options.map((o) => o.toLowerCase());
      for (let i = 0; i < low.length; i++) {
        for (let j = i + 1; j < low.length; j++) {
          if (low[i] === low[j]) {
            issues.push({ id, pool, kind: 'translate_dup_option', detail: q.options[i] });
            break;
          }
        }
      }
    }
    if (q.type === 'fill_blank' || q.type === 'complete_phrasal') {
      const qq = q.question || '';
      if (!qq.includes('___') && !qq.includes('…')) {
        issues.push({ id, pool, kind: 'no_gap', q: qq.slice(0, 60) });
      }
    }
    // find_error: поле correct — это само ошибочное предложение (его и выбирают).
  }
  return issues;
}

for (const [pool, rel] of [
  ['A1', 'assets/arena_questions_a1.json'],
  ['A2', 'assets/arena_questions_a2.json'],
  ['B1', 'assets/arena_questions_b1.json'],
  ['B2', 'assets/arena_questions_b2.json'],
]) {
  const p = path.join(root, rel);
  const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
  const iss = audit(arr, pool);
  console.log(pool, 'cards', arr.length, 'issues', iss.length);
  for (const x of iss.slice(0, 30)) console.log(' ', JSON.stringify(x));
  if (iss.length > 30) console.log(' ... +', iss.length - 30);
}

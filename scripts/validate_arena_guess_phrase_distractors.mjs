// зачем: PM-285 — владелец требует, чтобы в режиме guess_phrase неверные
// варианты были ТОЛЬКО грамматически неверными (не смысловыми/лексическими
// подменами). Аудит docs/arena/ARENA_DISTRACTOR_AUDIT_2026-08-21.md нашёл это
// нарушение в старом живом пуле V10 (4439/4479 дистракторов — лексические).
// Этот скрипт проверяет ТЕКУЩИЕ файлы content/arena-multilingual/generated/
// {es,de,fr,it}/tasks.jsonl по той же методике: читает grammarMatrix и
// distractorReasons каждого guess_phrase-задания, требует ровно 4 варианта,
// ровно 1 грамматически верный, 3 грамматически неверных, никаких причин с
// пометкой lexical/meaning/collocation/reference/function_choice (список
// запрещённых причин — из README v2-контракта в самом аудите).
//
// Запуск: node scripts/validate_arena_guess_phrase_distractors.mjs
// Только чтение — ничего не пишет и не публикует.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const TARGETS = ['es', 'de', 'fr', 'it'];

// Причины, которые НИКОГДА не могут обосновывать грамматический дистрактор
// (см. audit: "reject lexical_meaning, collocation, reference, function_choice").
const FORBIDDEN_REASON_SUBSTRINGS = [
  'lexical', 'meaning', 'collocation', 'reference', 'function_choice',
  'situation', 'synonym', 'false_friend', 'politeness', 'stylistic',
];

function isForbiddenReason(reason) {
  const lowered = String(reason || '').toLowerCase();
  return FORBIDDEN_REASON_SUBSTRINGS.some((needle) => lowered.includes(needle));
}

function validateTask(task, target) {
  const problems = [];
  if (task.mode !== 'guess_phrase') return problems;

  const payload = task.payload || {};
  const options = payload.options;
  const gm = payload.grammarMatrix;
  const distractorReasons = task.distractorReasons || [];

  if (!Array.isArray(options) || options.length !== 4) {
    problems.push('options_not_exactly_4');
    return problems;
  }
  if (!gm || !Array.isArray(gm.options) || gm.options.length !== 4) {
    problems.push('grammarMatrix_missing_or_not_4');
    return problems;
  }

  // options[] и grammarMatrix.options[].token обязаны совпадать 1:1.
  const gmTokens = gm.options.map((o) => o.token);
  const sameOrder = options.every((opt, idx) => opt === gmTokens[idx]);
  if (!sameOrder) problems.push('options_grammarMatrix_token_mismatch');

  const grammaticalCount = gm.options.filter((o) => o.grammatical === true).length;
  if (grammaticalCount !== 1) problems.push(`grammatical_true_count_${grammaticalCount}_expected_1`);

  const correctIndex = payload.correctIndex;
  if (!Number.isInteger(correctIndex) || !gm.options[correctIndex] || gm.options[correctIndex].grammatical !== true) {
    problems.push('correctIndex_does_not_point_to_grammatical_option');
  }

  // Каждый неверный вариант обязан иметь грамматическую причину, а не
  // смысловую/лексическую.
  for (const opt of gm.options) {
    if (opt.grammatical === true) continue;
    if (!opt.reason || typeof opt.reason !== 'string') {
      problems.push(`distractor_${opt.token}_missing_reason`);
      continue;
    }
    if (isForbiddenReason(opt.reason)) {
      problems.push(`distractor_${opt.token}_forbidden_reason:${opt.reason}`);
    }
  }

  // distractorReasons[] — публикуемый параллельный список, тоже должен быть
  // чисто грамматическим и покрывать все 3 неверных варианта.
  if (distractorReasons.length !== 3) {
    problems.push(`distractorReasons_count_${distractorReasons.length}_expected_3`);
  }
  for (const dr of distractorReasons) {
    if (isForbiddenReason(dr.reason)) {
      problems.push(`distractorReasons_${dr.token}_forbidden_reason:${dr.reason}`);
    }
  }

  return problems;
}

function auditTarget(target) {
  const filePath = resolve(ROOT, `content/arena-multilingual/generated/${target}/tasks.jsonl`);
  if (!existsSync(filePath)) {
    return { target, missing: true };
  }
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);

  let guessPhraseCount = 0;
  let failingTasks = 0;
  let totalDistractors = 0;
  let forbiddenDistractors = 0;
  const sampleFailures = [];

  for (const line of lines) {
    const task = JSON.parse(line);
    if (task.mode !== 'guess_phrase') continue;
    guessPhraseCount += 1;
    totalDistractors += 3;
    const problems = validateTask(task, target);
    const forbiddenInThisTask = problems.filter((p) => p.includes('forbidden_reason')).length;
    forbiddenDistractors += forbiddenInThisTask;
    if (problems.length > 0) {
      failingTasks += 1;
      if (sampleFailures.length < 5) {
        sampleFailures.push({ taskId: task.taskId, problems });
      }
    }
  }

  return {
    target,
    guessPhraseCount,
    failingTasks,
    totalDistractors,
    forbiddenDistractors,
    sampleFailures,
  };
}

const results = TARGETS.map(auditTarget);

console.log('=== PM-285 guess_phrase distractor audit (grammar-only rule) ===\n');
let anyFail = false;
for (const r of results) {
  if (r.missing) {
    console.log(`${r.target}: FILE MISSING`);
    continue;
  }
  const verdict = r.failingTasks === 0 ? 'PASS' : 'FAIL';
  if (verdict === 'FAIL') anyFail = true;
  console.log(`${r.target}: ${verdict}  tasks=${r.guessPhraseCount}  failingTasks=${r.failingTasks}  ` +
    `distractors=${r.totalDistractors}  forbiddenReasonDistractors=${r.forbiddenDistractors}`);
  if (r.sampleFailures.length > 0) {
    console.log('  sample failures:');
    for (const f of r.sampleFailures) {
      console.log(`    ${f.taskId}: ${f.problems.join(', ')}`);
    }
  }
}
console.log('\nVerdict:', anyFail ? 'FAIL — some guess_phrase tasks violate the grammar-only distractor rule' : 'PASS — all guess_phrase tasks are grammar-only');
process.exitCode = anyFail ? 1 : 0;

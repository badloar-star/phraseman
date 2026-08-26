import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8');

const productionFiles = [
  'app/ai_dialog_session.tsx',
  'app/arena_friend_duel.tsx',
  'app/arena_invite.tsx',
  'app/arena_matchmaking.tsx',
  'app/arena_today.tsx',
  'app/diagnostic_test.tsx',
  'app/exam.tsx',
  'app/flashcards_blitz_session.tsx',
  'app/flashcards_listening_session.tsx',
  'app/flashcards_speaking_session.tsx',
  'app/flashcards_swipe.tsx',
  'app/learning-v2/session/[id].tsx',
  'app/lesson_irregular_verbs.tsx',
  'app/lesson_words.tsx',
  'app/lesson1.tsx',
  'app/level_exam.tsx',
  'app/max_call_prestart.tsx',
  'app/mistake_practice_session.tsx',
  'app/personal_plan_exercise.tsx',
  'app/preposition_drill.tsx',
  'components/level-exam/LevelExamV2.tsx',
] as const;

for (const file of productionFiles) {
  const source = read(file);
  assert.doesNotMatch(
    source,
    /\bconfirm(?:SpendOne|SpendAmount|[A-Za-z]+Energy)\s*\(\s*(?:ENERGY_COST|LEVEL_EXAM_ENERGY|LINGMAN_EXAM_ENERGY)?\s*\)/,
    `${file}: every paid start must supply a durable EnergySessionIntent`,
  );
}

const context = read('components/EnergyContext.tsx');
assert.match(context, /confirmSpendOne:\s*\(intent:\s*EnergySessionIntent\)/);
assert.match(context, /refundOne:\s*\(operationId:\s*string,\s*reason:\s*string\)/);
assert.match(context, /acknowledgeSessionStart:\s*\(operationId:\s*string\)/);
assert.doesNotMatch(context, /lastSpendPoolRef|lastSpendAccountTokenRef|lastSpentBonusRef/);

const ledger = read('app/energy_session_operation_ledger.ts');
assert.match(ledger, /energy-session-operation\.v1/);
assert.match(ledger, /energy-session-prepared\.v1/);
assert.match(ledger, /energy-session-grant-receipt\.v1/);
assert.match(ledger, /operation_id_conflict/);

console.log(`ENERGY SESSION CALLSITES CONTRACT: PASS (${productionFiles.length} production files)`);

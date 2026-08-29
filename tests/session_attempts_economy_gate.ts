import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const swipe = fs.readFileSync(path.join(root, 'app', 'flashcards_swipe.tsx'), 'utf8');
const registry = fs.readFileSync(
  path.join(root, 'app', 'session_attempts', 'session_attempts_registry.ts'),
  'utf8',
);
const hook = fs.readFileSync(path.join(root, 'hooks', 'useSessionAttempts.ts'), 'utf8');
const giftInventory = fs.readFileSync(path.join(root, 'app', 'level_gift_active_inventory.ts'), 'utf8');
const rewardCatalog = fs.readFileSync(path.join(root, 'app', 'level_spin_reward_catalog.ts'), 'utf8');
const recovery = fs.readFileSync(
  path.join(root, 'app', 'session_attempts', 'session_attempt_recovery.ts'),
  'utf8',
);
const phoneEconomy = fs.readFileSync(path.join(root, 'modules', 'phone-state', 'domains', 'economy.ts'), 'utf8');

for (const needle of [
  "from '../components/session_attempts/SessionAttemptsHud'",
  "from '../hooks/useSessionAttempts'",
  "from '../hooks/useSessionAttemptAutoReset'",
  '<SessionAttemptsHud',
  "verdict: correct ? 'correct' : 'pedagogical_wrong'",
  "attemptEffect === 'attempts_exhausted'",
]) {
  assert.ok(swipe.includes(needle), `flashcards_swipe missing: ${needle}`);
}
assert.ok(!swipe.includes('Попытка потеряна'), 'wrong-answer toast is forbidden');
assert.ok(registry.includes("'/flashcards_swipe'"), 'ordinary training route is not registered');
assert.ok(hook.includes('restoreAfterSessionRuneForfeit'), 'automatic local attempt restore is missing');
assert.ok(
  !giftInventory.includes("key: 'attempt_restore_all'"),
  'retired Second chance must not appear in active inventory',
);
assert.ok(
  recovery.includes("kind: 'session_attempt_recovery_rune_debit'")
    && recovery.includes('commitPhoneStateNonMonetaryEconomyGrant'),
  'rune recovery must remain one durable composite economy operation',
);
for (const kind of [
  'attempt_restore_inventory_credit',
  'attempt_restore_inventory_consume',
  'session_attempt_recovery_rune_debit',
]) {
  assert.ok(phoneEconomy.includes(`'${kind}'`), `phone-state economy is missing ${kind}`);
}

const jarvisDir = path.join(root, 'functions', 'src', 'jarvis');
const jarvisReaders = fs.readdirSync(jarvisDir)
  .filter((name) => name.endsWith('_firestore_fetcher.ts'))
  .map((name) => fs.readFileSync(path.join(jarvisDir, name), 'utf8'))
  .join('\n');
assert.ok(
  !/attempt_restore_all|session_attempt_recovery_rune_debit/u.test(jarvisReaders),
  'Jarvis reader started consuming the new local projection; update its contract guard',
);

console.log('PASS session attempts economy gate');

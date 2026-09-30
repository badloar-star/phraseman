import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const read = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

const trainingEntry = read('app', 'flashcards', 'training_entry.ts');
const swipe = read('app', 'flashcards_swipe.tsx');
const trueFalseRoute = read('app', 'flashcards_truefalse_session.tsx');
const entryPolicy = read('app', 'flashcards', 'training_entry_policy.ts');
const pendingGrant = read('app', 'flashcard_training_pending_grant.ts');

const claimIndex = swipe.indexOf('const claimed = await claimFlashcardTrainingPendingGrantStart(');
const chargeIndex = swipe.indexOf('const energyResult = await confirmSwipeEnergy', claimIndex);
const quotaIndex = swipe.indexOf('const quotaResult = await consumeMonthlyTrainingSession', claimIndex);
const playableIndex = swipe.indexOf('const playable = await markFlashcardTrainingPendingGrantPlayable', claimIndex);
const ackIndex = swipe.indexOf('const cleared = await acknowledgeAndClearFlashcardTrainingPendingGrant', claimIndex);
const playIndex = swipe.indexOf("setPhase('play')", ackIndex);

assert.ok(claimIndex >= 0, 'startup must durably claim the grant before any protected mutation');
assert.ok(chargeIndex > claimIndex, 'energy may be charged only after the durable claim');
assert.ok(quotaIndex > claimIndex, 'quota may be committed only after the durable claim');
assert.ok(playableIndex > quotaIndex, 'playable transition must follow claim and quota settlement');
assert.ok(ackIndex > playableIndex, 'energy acknowledgement must follow the playable transition');
assert.ok(playIndex > ackIndex, 'the UI must not enter play before the grant has been acknowledged and cleared');

assert.match(
  trainingEntry,
  /pathname:\s*'\/flashcards_truefalse_session'/,
  'True/False must have a dedicated active route instead of masquerading as /flashcards_swipe',
);

assert.match(
  swipe,
  /canUseLegacySwipeGrantFailOpen\(message, isTrueFalseSession\)[\s\S]*entry:fail-open/,
  'the shared controller must route all legacy fallback decisions through the fail-closed policy',
);
assert.match(
  swipe,
  /canUseLegacySwipeGrantFailOpen\(message, isTrueFalseSession\)[\s\S]*entry:fail-open/,
  'missing claims and failed settlement must never reach the legacy swipe fail-open path',
);
assert.match(
  entryPolicy,
  /pending_grant_\(\?:claim\|energy\|quota\|playable\|ack\)_/,
  'all protected claim and settlement failures must be classified fail-closed',
);
assert.ok(
  /persistSpentEnergyOrRefund(?:<[^>]+>)?\(\{/.test(swipe),
  'a confirmed spend must use the tested refund-on-persistence-failure boundary',
);
assert.ok(
  swipe.includes('preset: flashcardPendingGrantPreset(isTrueFalseSession)'),
  'pending-grant scope must distinguish True/False from ordinary swipe',
);
assert.match(
  pendingGrant,
  /scope\.preset,\s*\]\);/,
  'the pending-grant fingerprint must include the mode-specific preset',
);

assert.match(
  swipe,
  /payload:\s*\{\s*orderedCardIds:[\s\S]*seed:[\s\S]*promptRecipe:/,
  'pending grant must receive the compact swipe manifest accepted by its validator',
);

assert.doesNotMatch(
  swipe,
  /manifest:\s*\{[\s\S]{0,300}payload:\s*manifestPayload/,
  'the rich runtime payload that deterministically returns invalid_input must not reach pending-grant prepare',
);

assert.match(trueFalseRoute, /trainingMode="truefalse"/, 'dedicated route must select the True/False presentation');
for (const testId of [
  'flashcards-truefalse-header',
  'flashcards-truefalse-progress',
  'flashcards-truefalse-prompt',
  'flashcards-truefalse-answer-false',
  'flashcards-truefalse-answer-true',
  'flashcards-truefalse-verdict',
  'flashcards-truefalse-continue',
]) {
  assert.ok(swipe.includes(testId), `True/False transfer is missing ${testId}`);
}
assert.match(
  swipe,
  /feedback\.kind === 'correct'[\s\S]*continueAfterFeedback/,
  'a correct True/False answer must wait for the explicit Continue action',
);
assert.ok(swipe.includes("ru: `Неверно."), 'a wrong answer must show an explicit visible Неверно verdict');
assert.match(
  swipe,
  /completedBeforeCurrent[\s\S]*feedback\?\.kind === 'correct'[\s\S]*feedback\.mastered/,
  'progress must retain the current card ordinal until Continue advances it',
);

console.log('flashcards_truefalse_critical_entry_gate: PASS');

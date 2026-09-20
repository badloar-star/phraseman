import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const arena = readFileSync(new URL('../functions/src/arena_v2.ts', import.meta.url), 'utf8');
const expansion = readFileSync(new URL('../functions/src/arena_expansion.ts', import.meta.url), 'utf8');
const client = readFileSync(new URL('../app/arena_client.ts', import.meta.url), 'utf8');
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const indexes = JSON.parse(readFileSync(new URL('../firestore.indexes.json', import.meta.url), 'utf8'));

test('server competitive profile access is routed through the target-aware helper', () => {
  for (const source of [arena, expansion]) {
    assert.doesNotMatch(
      source,
      /db\.collection\(ARENA_V2_COLLECTIONS\.profiles\)\.doc\(/u,
      'direct profile root access would make ES/FR/DE share English progress',
    );
    assert.match(source, /arenaProfileRef\(/u);
  }
});

test('friends board resolves and returns one explicit target publication', () => {
  const block = arena.slice(arena.indexOf('export const arenaV2FriendsBoard'));
  assert.match(block, /arenaRequiredTargetPublication\(request\.data\?\.studyTarget\)/u);
  assert.match(block, /studyTarget:\s*publication\.studyTarget/u);
  assert.match(block, /publicationFingerprint:\s*publication\.publicationFingerprint/u);
});

test('client profile listener selects the English root or the requested nested target document', () => {
  const block = client.slice(client.indexOf('export function useArenaProfile'));
  assert.match(block, /studyTarget:\s*ArenaStudyTarget/u);
  assert.match(client, /arena_v2_target_profiles/u);
});

test('nested target profiles are owner-readable and server-write-only', () => {
  const profileRules = rules.slice(rules.indexOf('match /arena_v2_profiles/{userId}'));
  assert.match(profileRules, /match \/arena_v2_target_profiles\/\{studyTarget\}/u);
  assert.match(rules, /studyTarget\.matches\('\^\(es\|fr\|de\)\$'\)/u);
  assert.match(rules, /allow read:\s*if studyTarget\.matches[\s\S]*userDocOwnerMatchesAuth\(userId\)/u);
  assert.match(rules, /allow create, update, delete:\s*if false/u);
});

test('receipt settlement query has a target-local composite index', () => {
  assert.ok(indexes.indexes.some((index) => index.collectionGroup === 'arena_v2_receipts'
    && index.fields.some((field) => field.fieldPath === 'studyTarget' && field.order === 'ASCENDING')
    && index.fields.some((field) => field.fieldPath === 'settledAtMs' && field.order === 'DESCENDING')));
});

test('pair throttling is target-scoped without changing the installed English HMAC identity', () => {
  assert.match(arena, /const hmacInput = studyTarget === 'en' \? pair : `\$\{studyTarget\}\|\$\{pair\}`/u);
  const targetScopedCalls = arena.match(
    /\.doc\(pairLimitId\([^\r\n]+publication\.studyTarget\)\)/gu,
  ) ?? [];
  assert.equal(targetScopedCalls.length, 4);
});

test('mastery signatures isolate non-English history while preserving English ids', () => {
  assert.match(
    readFileSync(new URL('../functions/src/arena_v2_core.ts', import.meta.url), 'utf8'),
    /return studyTarget === 'en' \? signature : `\$\{studyTarget\}_\$\{signature\}`/u,
  );
  assert.match(expansion, /arenaMasterySignatureId\(profileTarget,/u);
  assert.match(arena, /arenaMasterySignatureId\(profileTarget,/u);
});

test('friend duel notification and push navigation carries the selected target', () => {
  assert.match(arena, /action: 'duel_invite'[\s\S]{0,100}studyTarget: publication\.studyTarget/u);
  assert.match(arena, /action: 'duel_state'[\s\S]{0,100}studyTarget: publication\.studyTarget/u);
  assert.match(arena, /const pushData = \{ type: 'arena_friend_expired',[\s\S]{0,180}studyTarget/u);
});

test('competitive settlement keeps wallet economy on the one global English profile', () => {
  const settle = arena.slice(arena.indexOf('async function settleMatch'));
  assert.match(settle, /globalProfile: arenaProfileRef\(uid, 'en'\)/u);
  assert.match(settle, /existing\.globalProfile\.starWalletBalance/u);
  assert.match(settle, /tx\.set\(entry\.globalProfile, globalProfilePatch/u);
});

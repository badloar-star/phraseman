import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ARENA_V2_COLLECTIONS,
  arenaCompetitiveProfilePath,
  arenaMasterySignatureId,
} from './arena_v2_core';

test('English keeps the canonical Arena profile document path', () => {
  assert.equal(
    arenaCompetitiveProfilePath('stable-user', 'en'),
    `${ARENA_V2_COLLECTIONS.profiles}/stable-user`,
  );
});

test('non-English competitive profiles use an isolated target subcollection', () => {
  for (const target of ['es', 'fr', 'de'] as const) {
    assert.equal(
      arenaCompetitiveProfilePath('stable-user', target),
      `${ARENA_V2_COLLECTIONS.profiles}/stable-user/arena_v2_target_profiles/${target}`,
    );
  }
});

test('profile paths reject unsafe stable ids instead of widening the Firestore path', () => {
  assert.throws(() => arenaCompetitiveProfilePath('', 'es'), /arena_profile_uid_invalid/u);
  assert.throws(() => arenaCompetitiveProfilePath('user/other', 'es'), /arena_profile_uid_invalid/u);
});

test('mastery evidence keeps English ids and scopes every new contour', () => {
  assert.equal(arenaMasterySignatureId('en', 'sig-1'), 'sig-1');
  assert.equal(arenaMasterySignatureId('es', 'sig-1'), 'es_sig-1');
  assert.equal(arenaMasterySignatureId('fr', 'sig-1'), 'fr_sig-1');
  assert.equal(arenaMasterySignatureId('de', 'sig-1'), 'de_sig-1');
});

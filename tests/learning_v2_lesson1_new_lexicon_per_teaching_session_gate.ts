import assert from 'node:assert/strict';

import { authoredLearningV2SessionSource } from '../modules/learning-v2/content/source/authored_sessions_v1';
import { EPISODE_01_SESSION_MAP_V1 } from '../modules/learning-v2/content/source/episode_01_session_map_v1';
import { LESSON1_AUTHORING_REGISTRY_V1 } from '../modules/learning-v2/content/source/lesson1_authoring_registry_v1';

const current = LESSON1_AUTHORING_REGISTRY_V1.find(
  (entry) => entry.status !== 'LOCKED',
);
assert.ok(current, 'lesson 1 authoring registry must expose one current session');

const mapEntry = EPISODE_01_SESSION_MAP_V1[current.sessionOrdinal - 1];
const source = authoredLearningV2SessionSource(current.sessionOrdinal);
assert.ok(mapEntry, `session ${current.sessionOrdinal}: map entry missing`);
assert.ok(source, `session ${current.sessionOrdinal}: source missing`);

const noNewLexiconKind = new Set(['voice', 'recall', 'checkpoint']).has(
  mapEntry.kind,
);
const vocabularyCount = source.newVocabulary?.length ?? 0;
const exception = source.newVocabularyExceptionReason?.trim() ?? '';

if (noNewLexiconKind) {
  assert.equal(
    vocabularyCount,
    0,
    `session ${current.sessionOrdinal} (${mapEntry.kind}): review/voice/checkpoint must not introduce lexicon`,
  );
  assert.equal(
    exception,
    '',
    `session ${current.sessionOrdinal} (${mapEntry.kind}): its kind is already the reason; do not add a fake exception`,
  );
} else if (vocabularyCount === 0) {
  assert.ok(
    exception.length >= 40,
    `session ${current.sessionOrdinal}: an ordinary teaching session without useful new lexicon needs a concrete editorial exception`,
  );
  assert.match(
    exception,
    /(?:interaction|grammar|retrieval|objective|budget|construct)/iu,
    `session ${current.sessionOrdinal}: exception must name the exact pedagogical constraint`,
  );
} else {
  assert.equal(
    exception,
    '',
    `session ${current.sessionOrdinal}: new lexicon exists, so an exception reason would be contradictory`,
  );
  assert.ok(
    vocabularyCount <= 5,
    `session ${current.sessionOrdinal}: more than five new units cannot receive the required contacts inside one session`,
  );
}

console.log('LEARNING V2 NEW LEXICON PER TEACHING SESSION GATE: PASS');

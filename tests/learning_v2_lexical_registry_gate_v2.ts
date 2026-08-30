import assert from "node:assert/strict";

import {
  LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V2,
  LEARNING_V2_ENGLISH_LEXICAL_SENSES_V2,
} from "../modules/learning-v2/curriculum/en/lexical_senses_en_v2";

const senses = LEARNING_V2_ENGLISH_LEXICAL_SENSES_V2;
const edges = LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V2;
const expectedLocales = ["es", "id", "pl", "pt-BR", "ru", "tr", "uk", "vi"];

assert.ok(senses.length > 0, "lexical_ledger_must_not_be_empty");
assert.equal(new Set(senses.map((sense) => sense.id)).size, senses.length, "lexical_sense_ids_must_be_unique");

for (const sense of senses) {
  assert.deepEqual(Object.keys(sense.definitionByLocale).sort(), expectedLocales, `locale_coverage:${sense.id}`);
  assert.ok(sense.audioAssetId.length > 0, `audio_asset_id_missing:${sense.id}`);
  assert.ok(sense.neededBySessionIds.length > 0, `consuming_session_missing:${sense.id}`);
  assert.equal(sense.firstEncounterCard.blockingBeforeFirstInteraction, true, `card_blocking_policy:${sense.id}`);
  assert.equal(sense.firstEncounterCard.durableUnlockOnFirstDisplay, true, `card_unlock_policy:${sense.id}`);
  assert.equal(sense.firstEncounterCard.suppressBlockingOverlayOnReplay, true, `card_replay_policy:${sense.id}`);
  assert.ok(
    edges.some((edge) => edge.senseId === sense.id && edge.targetAbsoluteSessionOrdinal > sense.introductionAbsoluteSessionOrdinal),
    `future_retrieval_edge_missing:${sense.id}`,
  );
  assert.equal(
    Object.values(sense.definitionByLocale).some((definition) =>
      definition.toLocaleLowerCase().includes(sense.english.toLocaleLowerCase())),
    false,
    `${sense.id}:definition_must_not_be_circular`,
  );
}

const introductionsBySession = new Map<number, number>();
for (const sense of senses) {
  introductionsBySession.set(
    sense.introductionAbsoluteSessionOrdinal,
    (introductionsBySession.get(sense.introductionAbsoluteSessionOrdinal) ?? 0) + 1,
  );
}
const sessionsWithMoreThanTwoNewSenses = [...introductionsBySession.entries()].filter(([, count]) => count > 2);
assert.equal(sessionsWithMoreThanTwoNewSenses.length, 0, "session_new_lexical_sense_cap_exceeded");

process.stdout.write(
  `LEARNING V2 LEXICAL REGISTRY V2 GATE: PASS senses=${senses.length} retrieval_edges=${edges.length} two_new_sessions=${[...introductionsBySession.values()].filter((count) => count === 2).length}\n`,
);

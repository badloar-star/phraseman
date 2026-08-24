import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_03_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_03_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { validateLearningV2GeneratedSessionShardV1 } from '../modules/learning-v2/content/generator_session_shard';
import { evaluateLearningV2SessionContentQuality } from '../modules/learning-v2/content/source/learning_content_quality_gate_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const vocabulary = ['happy', 'sad', 'tired', 'fine'] as const;
const phrases = [
  'I am happy',
  'I am sad',
  'I am tired',
  'I am fine',
  'I am not sad',
] as const;

assert.equal(EPISODE_01_SESSION_03_SOURCE.distractorAuthorship, 'manual');
assert.deepEqual(
  EPISODE_01_SESSION_03_SOURCE.newVocabulary?.map((word) => word.target),
  vocabulary,
  'Session 3 must add four useful state words before using them in phrases',
);
assert.deepEqual(
  EPISODE_01_SESSION_03_SOURCE.phrases.map((phrase) => phrase.english),
  phrases,
  'Session 3 must stay inside I am, the four authored states, and recalled not',
);
assert.deepEqual(
  EPISODE_01_SESSION_03_SOURCE.introPages.map((page) => page.kind),
  ['concept', 'formula', 'trap'],
);
for (const page of EPISODE_01_SESSION_03_SOURCE.introPages) {
  for (const locale of locales) {
    assert.ok(page.body[locale]?.trim());
    assert.ok(page.bodyRuns?.[locale]?.length);
    assert.equal(
      page.bodyRuns?.[locale]?.map((run) => run.text).join(''),
      page.body[locale],
    );
  }
  assert.doesNotMatch(
    Object.values(page.body).join(' '),
    /\bI\s+am(?:\s+not)?\s+(?:happy|sad|tired|fine)\b/iu,
    'The intro must not reveal a complete phrase before all new words receive standalone contacts',
  );
}
for (const phrase of EPISODE_01_SESSION_03_SOURCE.phrases) {
  for (const word of phrase.words) assert.equal(word.distractors.length, 2);
  for (const locale of locales) {
    const detail = phrase.localizedDetails?.[locale];
    assert.ok(detail?.meaning.trim());
    assert.ok(detail?.explanation.trim());
    assert.equal(detail?.words.length, phrase.words.length);
    assert.ok(detail?.words.every((word) => word.distractors.length === 2));
  }
}

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_03_SOURCE);
assert.equal(shard.cards.length, 20);
assert.ok(shard.cards.slice(3, 15).every((card) => vocabulary.includes(card.contentItem.target.text as never)));
for (const word of vocabulary) {
  assert.deepEqual(
    shard.cards
      .slice(3, 15)
      .filter((card) => card.contentItem.target.text === word)
      .map((card) => card.family),
    ['listen_choose', 'speed_match', 'context_gap_grammar'],
    `${word} must receive recognize, retrieve-meaning and build-form contacts before phrase use`,
  );
}
assert.ok(
  shard.cards.slice(15).every((card) => phrases.includes(card.contentItem.target.text as never)),
);
assert.doesNotThrow(() =>
  validateLearningV2GeneratedSessionShardV1(shard, {
    packageId: shard.packageId,
    targetLanguage: shard.targetLanguage,
    episodeOrdinal: shard.episodeOrdinal,
    requiredSessionOrdinal: shard.requiredSessionOrdinal,
    generationInputFingerprint: shard.generationInputFingerprint,
  }),
);
for (const locale of locales) {
  const children = buildSessionChildBodiesFromShard(shard, locale, 'lesson-01:session:03');
  assert.equal(children.learner.interactions.length, 17);
  const learnerCards = children.learner.interactions.map((interaction) =>
    shard.cards.find((card) => card.cardId === interaction.interactionId),
  );
  assert.ok(learnerCards.every(Boolean));
  assert.ok(
    learnerCards.slice(0, 12).every((card) =>
      vocabulary.includes(card!.contentItem.target.text as never)),
    `All 12 standalone word contacts must remain visible after intro for ${locale}`,
  );
  assert.ok(
    learnerCards.slice(12).every((card) =>
      phrases.includes(card!.contentItem.target.text as never)),
    `Phrase application may start only after all standalone contacts for ${locale}`,
  );
  assert.doesNotThrow(
    () => children,
    `Session 3 must materialize a real learner package for ${locale}`,
  );
}

const report = evaluateLearningV2SessionContentQuality(EPISODE_01_SESSION_03_SOURCE);
const reviewOnly = new Set([
  'quality_review_missing',
  'quality_review_stale',
  'quality_review_rejected',
  'quality_review_not_independent',
  'locale_review_missing',
]);
assert.deepEqual(
  report.issues.filter((issue) => !reviewOnly.has(issue.code)),
  [],
  'Session 3 must have no deterministic quality blocker before autopass',
);

process.stdout.write('LEARNING V2 SESSION 3 WORD-FIRST GATE: PASS\n');

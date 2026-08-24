import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_04_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_04_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { validateLearningV2GeneratedSessionShardV1 } from '../modules/learning-v2/content/generator_session_shard';
import { evaluateLearningV2SessionContentQuality } from '../modules/learning-v2/content/source/learning_content_quality_gate_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const phrases = [
  "I'm here",
  "I'm ready",
  "I'm happy",
  "I'm tired",
  "I'm fine",
  "I'm busy",
  "I'm not busy",
] as const;

assert.equal(EPISODE_01_SESSION_04_SOURCE.distractorAuthorship, 'manual');
assert.equal(EPISODE_01_SESSION_04_SOURCE.sessionKindOverride, 'phrases');
assert.deepEqual(
  EPISODE_01_SESSION_04_SOURCE.newVocabulary?.map((word) => word.target),
  ['busy'],
  'Session 4 must add one useful state word without overloading the contraction objective',
);
assert.deepEqual(
  EPISODE_01_SESSION_04_SOURCE.phrases.map((phrase) => phrase.english),
  phrases,
);
assert.deepEqual(
  EPISODE_01_SESSION_04_SOURCE.introPages.map((page) => page.kind),
  ['concept', 'formula', 'trap'],
);
for (const page of EPISODE_01_SESSION_04_SOURCE.introPages) {
  for (const locale of locales) {
    assert.ok(page.body[locale]?.trim());
    assert.ok(page.bodyRuns?.[locale]?.length);
    assert.equal(
      page.bodyRuns?.[locale]?.map((run) => run.text).join(''),
      page.body[locale],
    );
    assert.ok(
      page.bodyRuns?.[locale]?.every((run) =>
        run.text !== 'i' || run.semantic === 'explanation'),
      `A native lowercase conjunction must not be coloured as English I for ${locale}`,
    );
  }
  assert.doesNotMatch(
    Object.values(page.body).join(' '),
    /\b(?:I am|I['’]m) busy\b/iu,
    'The new word busy must receive standalone contacts before a complete phrase',
  );
}
for (const phrase of EPISODE_01_SESSION_04_SOURCE.phrases) {
  for (const word of phrase.words) assert.equal(word.distractors.length, 2);
  for (const locale of locales) {
    const detail = phrase.localizedDetails?.[locale];
    assert.ok(detail?.meaning.trim());
    assert.ok(detail?.explanation.trim());
    assert.equal(detail?.words.length, phrase.words.length);
    assert.ok(detail?.words.every((word) => word.distractors.length === 2));
  }
}

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_04_SOURCE);
assert.equal(shard.cards.length, 20);
assert.deepEqual(
  shard.cards.slice(3, 6).map((card) => [card.contentItem.target.text, card.family]),
  [
    ['busy', 'listen_choose'],
    ['busy', 'speed_match'],
    ['busy', 'context_gap_grammar'],
  ],
);
assert.ok(
  shard.cards.slice(6).every((card) => phrases.includes(card.contentItem.target.text as never)),
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
  const children = buildSessionChildBodiesFromShard(
    shard,
    locale,
    'lesson-01:session:04',
  );
  assert.equal(children.learner.interactions.length, 17);
  const learnerCards = children.learner.interactions.map((interaction) =>
    shard.cards.find((card) => card.cardId === interaction.interactionId),
  );
  assert.ok(
    learnerCards.slice(0, 3).every((card) => card?.contentItem.target.text === 'busy'),
    `All standalone busy contacts must remain visible after intro for ${locale}`,
  );
  assert.ok(
    learnerCards.slice(3).every((card) => phrases.includes(card!.contentItem.target.text as never)),
    `Contraction phrases may start only after the word contacts for ${locale}`,
  );
}

const report = evaluateLearningV2SessionContentQuality(EPISODE_01_SESSION_04_SOURCE);
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
  'Session 4 must have no deterministic quality blocker before autopass',
);

process.stdout.write('LEARNING V2 SESSION 4 WORD-FIRST GATE: PASS\n');

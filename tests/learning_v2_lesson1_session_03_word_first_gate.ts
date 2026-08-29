import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_03_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_03_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { validateLearningV2GeneratedSessionShardV1 } from '../modules/learning-v2/content/generator_session_shard';
import { evaluateLearningV2SessionContentQuality } from '../modules/learning-v2/content/source/learning_content_quality_gate_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { evaluateLearningV2LearnerProjectionIntegrityV1 } from '../modules/learning-v2/content/source/learning_v2_learner_projection_integrity_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const phrases = ["I'm here", "I'm ready", "I'm happy", "I'm sad", "I'm tired", "I'm fine"] as const;
const activeFamilies = new Set([
  'phrase_builder', 'listen_choose', 'listen_build_dictation',
  'context_gap_grammar', 'speed_match', 'scripted_repeat_compare',
]);

assert.equal(EPISODE_01_SESSION_03_SOURCE.requiredSessionOrdinal, 3);
assert.equal(EPISODE_01_SESSION_03_SOURCE.sessionKindOverride, 'phrases');
assert.equal(EPISODE_01_SESSION_03_SOURCE.distractorAuthorship, 'manual');
assert.deepEqual(
  EPISODE_01_SESSION_03_SOURCE.newVocabulary?.map((word) => word.target),
  ["I'm"],
  'Session 3 teaches only the I am contraction before applying it',
);
assert.deepEqual(
  EPISODE_01_SESSION_03_SOURCE.phrases.map((phrase) => phrase.english),
  phrases,
  'Session 3 must stay inside the contraction and already learned complements',
);
assert.doesNotMatch(
  EPISODE_01_SESSION_03_SOURCE.phrases.map((phrase) => phrase.english).join(' '),
  /\b(?:not|you|he|she|it|we|they|hello|hi|name|from|country|language)\b/iu,
  'Session 3 must not import later lesson material',
);
assert.deepEqual(
  EPISODE_01_SESSION_03_SOURCE.introPages.map((page) => page.kind),
  ['concept', 'formula', 'trap'],
);
for (const page of EPISODE_01_SESSION_03_SOURCE.introPages) {
  for (const locale of locales) {
    const body = page.body[locale];
    assert.ok(body?.trim());
    assert.ok(body.length <= 320, `${locale} intro must stay concise`);
    assert.ok(page.bodyRuns?.[locale]?.length);
    assert.equal(page.bodyRuns?.[locale]?.map((run) => run.text).join(''), body);
  }
}

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_03_SOURCE);
assert.equal(shard.cards.length, 20);
assert.deepEqual(
  shard.cards.slice(3, 6).map((card) => card.contentItem.target.text),
  ["I'm", "I'm", "I'm"],
  'The contraction must receive recognize, retrieve and build contacts first',
);
assert.deepEqual(
  shard.cards.slice(3, 6).map((card) => card.learningFunction),
  ['comprehend', 'retrieve', 'assemble'],
);
assert.ok(shard.cards.slice(6).filter((card) => card.family !== 'speed_match').every(
  (card) => phrases.includes(card.contentItem.target.text as never),
));
const families = shard.cards.slice(3).map((card) => card.family);
assert.deepEqual(new Set(families), activeFamilies, 'Every approved mode must appear in session 3');
assert.equal(
  EPISODE_01_SESSION_03_SOURCE.modeNativePractice?.filter(
    (entry) => entry.family === 'phrase_builder' && entry.target.kind === 'phrase',
  ).length,
  1,
  'One full-phrase builder example is enough in session 3',
);
for (let index = 1; index < families.length; index += 1) {
  assert.notEqual(families[index], families[index - 1], `Adjacent mode repeated at practice ${index + 1}`);
}
const speed = shard.cards.find((card) => card.family === 'speed_match');
assert.equal(speed?.modePayload?.family, 'speed_match');
assert.equal(
  EPISODE_01_SESSION_03_SOURCE.modeNativePractice?.find((entry) => entry.family === 'speed_match')?.target.kind,
  'vocabulary_grid',
);
const speedSource = EPISODE_01_SESSION_03_SOURCE.modeNativePractice?.find(
  (entry) => entry.family === 'speed_match',
);
assert.ok(speedSource?.target.kind === 'vocabulary_grid');
for (const locale of locales) {
  assert.doesNotMatch(
    speedSource.instruction[locale] ?? '',
    /(?:восем|вісім|ocho|oito|tám|delapan|sekiz|osiem)/iu,
    `Speed Match instruction must not narrate the visible pair count in ${locale}`,
  );
}
assert.deepEqual(
  speedSource.target.knownItems?.map((item) => item.target),
  speed?.modePayload?.family === 'speed_match'
    ? speed.modePayload.pairGrid.map((item) => item.target)
    : [],
  'Speed Match metadata must name the same four known words as its pair grid',
);
if (speed?.modePayload?.family === 'speed_match') {
  assert.equal(speed.modePayload.pairGrid.length, 4, 'Speed Match must contain four known-word pairs');
  assert.deepEqual(
    speed.modePayload.pairGrid.map((pair) => pair.target).sort(),
    ['happy', 'here', 'ready', 'tired'].sort(),
    'Speed Match must rehearse four curriculum-relevant known words',
  );
  for (const pair of speed.modePayload.pairGrid) {
    for (const locale of locales) {
      assert.doesNotMatch(
        pair.meaningByLocale[locale] ?? '',
        /\//u,
        `Speed Match option ${pair.target} must contain one meaning without slash lists in ${locale}`,
      );
    }
  }
}
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
  const speedInteraction = children.learner.interactions.find(
    (interaction) => interaction.family === 'speed_match',
  );
  assert.ok(speedInteraction, `Speed Match learner interaction must exist in ${locale}`);
  assert.doesNotMatch(
    speedInteraction.accessibilityLabel,
    /\//u,
    `Speed Match accessibility copy must use atomic meanings in ${locale}`,
  );
  assert.doesNotMatch(
    speedInteraction.scriptedAlternate.instruction,
    /\//u,
    `Speed Match fallback copy must use atomic meanings in ${locale}`,
  );
  for (const interaction of children.learner.interactions) {
    for (const option of interaction.responseOptions) {
      assert.doesNotMatch(
        option.text,
        /\//u,
        `Response option ${interaction.interactionId}:${option.responseId} must be one atomic answer in ${locale}`,
      );
    }
  }
  assert.deepEqual(
    evaluateLearningV2LearnerProjectionIntegrityV1({
      learnerChild: children.learner,
      evaluatorCapsuleChild: children.evaluatorCapsule,
      auxiliaryChild: children.auxiliary,
    }).issues,
    [],
    `The learner package must retain one answer and three traps in ${locale}`,
  );
}

const report = evaluateLearningV2SessionContentQuality(EPISODE_01_SESSION_03_SOURCE);
const reviewOnly = new Set([
  'quality_review_missing', 'quality_review_stale', 'quality_review_rejected',
  'quality_review_not_independent', 'locale_review_missing',
]);
assert.deepEqual(
  report.issues.filter((issue) => !reviewOnly.has(issue.code)),
  [],
  'Session 3 must have no deterministic quality blocker before owner review',
);

process.stdout.write('LEARNING V2 SESSION 3 CONTRACTION GATE: PASS\n');

import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_02_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_02_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { validateLearningV2GeneratedSessionShardV1 } from '../modules/learning-v2/content/generator_session_shard';
import { evaluateLearningV2SessionContentQuality } from '../modules/learning-v2/content/source/learning_content_quality_gate_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

assert.equal(EPISODE_01_SESSION_02_SOURCE.distractorAuthorship, 'manual');
assert.deepEqual(
  EPISODE_01_SESSION_02_SOURCE.newVocabulary?.map((word) => word.target),
  ['not'],
  'Session 2 must teach not as a standalone word before any negative phrase',
);
assert.deepEqual(
  EPISODE_01_SESSION_02_SOURCE.phrases.map((phrase) => phrase.english),
  ['I am not here', 'I am not ready'],
  'Session 2 must stay inside lesson-1 vocabulary and the negation objective',
);
assert.deepEqual(
  EPISODE_01_SESSION_02_SOURCE.introPages.map((page) => page.kind),
  ['concept', 'formula', 'trap'],
);
for (const page of EPISODE_01_SESSION_02_SOURCE.introPages) {
  for (const locale of locales) {
    assert.ok(page.body[locale]?.trim());
    assert.ok(page.bodyRuns?.[locale]?.length);
    assert.equal(
      page.bodyRuns?.[locale]?.map((run) => run.text).join(''),
      page.body[locale],
    );
    const body = page.body[locale];
    const semanticRuns = page.bodyRuns?.[locale] ?? [];
    const notRuns = semanticRuns.filter((run) => /^not$/iu.test(run.text));
    assert.ok(notRuns.length > 0, `English not must be marked for ${locale}`);
    assert.ok(
      notRuns.every((run) => run.semantic === 'targetCorrect'),
      `Every English not must use targetCorrect styling for ${locale}`,
    );
    let cursor = 0;
    for (const run of semanticRuns) {
      const start = cursor;
      cursor += run.text.length;
      if (
        run.semantic !== 'explanation' &&
        /^[not]$/iu.test(run.text)
      ) {
        assert.doesNotMatch(
          `${body[start - 1] ?? ''}${body[cursor] ?? ''}`,
          /\p{L}/u,
          `A single-letter English token must not be cut out of native copy: ${locale}`,
        );
      }
    }
  }
  assert.doesNotMatch(
    Object.values(page.body).join(' '),
    /\bI\s+am\s+not\b/u,
    'The intro must teach not before presenting a complete negative phrase',
  );
}
for (const phrase of EPISODE_01_SESSION_02_SOURCE.phrases) {
  for (const word of phrase.words) assert.equal(word.distractors.length, 2);
  for (const locale of locales) {
    const detail = phrase.localizedDetails?.[locale];
    assert.ok(detail?.meaning.trim());
    assert.ok(detail?.explanation.trim());
    assert.equal(detail?.words.length, phrase.words.length);
    assert.ok(detail?.words.every((word) => word.distractors.length === 2));
  }
}

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_02_SOURCE);
assert.equal(shard.cards.length, 20);
assert.deepEqual(
  shard.cards.slice(3, 6).map((card) => [card.contentItem.target.text, card.family]),
  [
    ['not', 'listen_choose'],
    ['not', 'speed_match'],
    ['not', 'context_gap_grammar'],
  ],
);
assert.ok(
  shard.cards.slice(6).every((card) => /\bnot\b/u.test(card.contentItem.target.text)),
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
  const children = buildSessionChildBodiesFromShard(shard, locale, 'lesson-01:session:02');
  assert.equal(children.learner.interactions.length, 17);
  assert.deepEqual(
    children.learner.interactions.slice(0, 3).map((interaction) => interaction.family),
    ['listen_choose', 'speed_match', 'context_gap_grammar'],
    `Session 2 must expose all three standalone not contacts after intro for ${locale}`,
  );
  assert.doesNotThrow(
    () => children,
    `Session 2 must materialize a real learner package for ${locale}`,
  );
}

const report = evaluateLearningV2SessionContentQuality(EPISODE_01_SESSION_02_SOURCE);
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
  'Session 2 must have no deterministic quality blocker before autopass',
);

process.stdout.write('LEARNING V2 SESSION 2 WORD-FIRST GATE: PASS\n');

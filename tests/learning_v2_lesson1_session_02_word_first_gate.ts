import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EPISODE_01_SESSION_02_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_02_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { validateLearningV2GeneratedSessionShardV1 } from '../modules/learning-v2/content/generator_session_shard';
import { evaluateLearningV2SessionContentQuality } from '../modules/learning-v2/content/source/learning_content_quality_gate_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import {
  createLearningV2CourseSessionDeviceRunV1,
  evaluateLearningV2CourseSessionDeviceInteractionV1,
} from '../modules/learning-v2/runtime/course_session_device_run_v1';
import { buildLearningV2AuthoringDevicePreviewV1 } from '../modules/learning-v2/preview/authoring_device_preview_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const expectedVocabulary = ['happy', 'sad', 'tired', 'fine'];
const expectedPhrases = ['I am happy', 'I am sad', 'I am tired', 'I am fine'];
const expectedFamilies = [
  'scripted_repeat_compare', 'listen_choose', 'scripted_repeat_compare',
  'listen_choose', 'context_gap_grammar', 'listen_choose',
  'context_gap_grammar', 'listen_choose', 'listen_build_dictation',
  'phrase_builder', 'context_gap_grammar', 'phrase_builder', 'speed_match',
  'phrase_builder', 'context_gap_grammar', 'listen_choose',
  'scripted_repeat_compare',
] as const;

assert.equal(EPISODE_01_SESSION_02_SOURCE.distractorAuthorship, 'manual');
assert.equal(EPISODE_01_SESSION_02_SOURCE.modeNativePlanId, 'en-e01-s02-mode-native-v1');
assert.deepEqual(
  EPISODE_01_SESSION_02_SOURCE.newVocabulary?.map((word) => word.target),
  expectedVocabulary,
  'Session 2 must add useful affirmative-state vocabulary',
);
assert.deepEqual(
  EPISODE_01_SESSION_02_SOURCE.phrases.map((phrase) => phrase.english),
  expectedPhrases,
  'Session 2 must practise only the full affirmative I am frame',
);
assert.doesNotMatch(
  [
    ...EPISODE_01_SESSION_02_SOURCE.phrases.map((phrase) => phrase.english),
    ...EPISODE_01_SESSION_02_SOURCE.introPages.flatMap((page) =>
      page.question.choices.map((choice) => choice.ru),
    ),
  ].join('\n'),
  /\bnot\b|\bI['’]m\b|\b(am[ \t]+I|are[ \t]+you)\b/u,
  'Session 2 must not leak negation, contraction, or question grammar',
);
assert.deepEqual(
  EPISODE_01_SESSION_02_SOURCE.introPages.map((page) => page.kind),
  ['concept', 'formula', 'trap'],
);
assert.deepEqual(
  EPISODE_01_SESSION_02_SOURCE.introPages.map((page) => page.question.correctChoiceIndex),
  [1, 2, 0],
  'Correct intro answers must not create a positional pattern',
);
for (const page of EPISODE_01_SESSION_02_SOURCE.introPages) {
  for (const locale of locales) {
    assert.ok(page.body[locale]?.trim());
    assert.ok(page.bodyRuns?.[locale]?.length);
    assert.equal(page.bodyRuns?.[locale]?.map((run) => run.text).join(''), page.body[locale]);
    assert.ok(
      page.bodyRuns?.[locale]?.some((run) => run.semantic === 'targetCorrect'),
      `English teaching material must be visually marked for ${locale}`,
    );
  }
}
assert.equal(
  EPISODE_01_SESSION_02_SOURCE.introPages
    .flatMap((page) => page.bodyRuns?.pl ?? [])
    .filter((run) => run.semantic === 'targetCorrect' && run.text === 'i')
    .length,
  0,
  'Polish conjunction i must not be styled as English pronoun I',
);

for (const sourcePath of [
  'modules/learning-v2/content/source/episode_01_session_02_vocabulary_v1.ts',
  'modules/learning-v2/content/source/episode_01_session_02_affirmative_phrases_v1.ts',
  'modules/learning-v2/content/source/episode_01_session_02_v1.ts',
]) {
  assert.doesNotMatch(
    readFileSync(sourcePath, 'utf8'),
    /episode_01_session_03/u,
    `Session 2 must own its source instead of aliasing session 3: ${sourcePath}`,
  );
}
for (const word of EPISODE_01_SESSION_02_SOURCE.newVocabulary ?? []) {
  for (const stage of ['recognize', 'retrieve_meaning', 'build_form'] as const) {
    assert.equal(word.contacts[stage].distractors.length, 2);
    assert.ok(word.contacts[stage].distractors.every((entry) => entry.feedback));
  }
}
for (const phrase of EPISODE_01_SESSION_02_SOURCE.phrases) {
  for (const locale of locales) {
    const detail = phrase.localizedDetails?.[locale];
    assert.ok(detail?.meaning.trim());
    assert.ok(detail?.explanation.trim());
    assert.equal(detail?.words.length, phrase.words.length);
    assert.ok(detail?.words.every((word) => word.distractors.length === 2));
  }
}

const practice = EPISODE_01_SESSION_02_SOURCE.modeNativePractice ?? [];
assert.equal(practice.length, 17);
assert.deepEqual(practice.map((entry) => entry.family), expectedFamilies);
assert.deepEqual(
  [...new Set(practice.map((entry) => entry.family))].sort(),
  ['context_gap_grammar', 'listen_build_dictation', 'listen_choose', 'phrase_builder', 'scripted_repeat_compare', 'speed_match'],
  'Every active mode must appear in the session',
);
for (let index = 1; index < practice.length; index += 1) {
  assert.notEqual(practice[index]?.family, practice[index - 1]?.family);
}
for (const entry of practice) assert.equal(entry.modePayload.family, entry.family);
const speedMatch = practice.find((entry) => entry.family === 'speed_match')?.modePayload;
assert.ok(speedMatch?.family === 'speed_match');
assert.equal(speedMatch.pairGrid.length, 8);
assert.deepEqual(
  speedMatch.pairGrid.map((pair) => pair.target).sort(),
  ['I', 'am', 'fine', 'happy', 'here', 'ready', 'sad', 'tired'].sort(),
);

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_02_SOURCE);
assert.equal(shard.cards.length, 20);
assert.deepEqual(shard.cards.slice(3).map((card) => card.family), expectedFamilies);
assert.equal(shard.cards[3]?.instructionByLocale.ru, 'Послушайте слово, затем произнесите его вслух.');
assert.equal(shard.cards[11]?.instructionByLocale.ru, 'Послушайте целую фразу и соберите её в услышанном порядке.');
assert.equal(shard.cards[12]?.instructionByLocale.ru, 'Соберите полную фразу о своём состоянии.');
assert.equal(shard.cards[19]?.instructionByLocale.ru, 'Послушайте полную фразу, произнесите её и сравните с образцом.');
assert.doesNotThrow(() => validateLearningV2GeneratedSessionShardV1(shard, {
  packageId: shard.packageId,
  targetLanguage: shard.targetLanguage,
  episodeOrdinal: shard.episodeOrdinal,
  requiredSessionOrdinal: shard.requiredSessionOrdinal,
  generationInputFingerprint: shard.generationInputFingerprint,
}));
for (const locale of locales) {
  const children = buildSessionChildBodiesFromShard(shard, locale, 'lesson-01:session:02');
  assert.equal(children.learner.interactions.length, 17);
  assert.deepEqual(children.learner.interactions.map((interaction) => interaction.family), expectedFamilies);
  assert.ok(children.learner.interactions.every((interaction) => interaction.modePayload));
  const encounters = children.auxiliary.entries
    .map((entry) => ({ id: entry.interactionId, encounter: entry.newWordEncounter }))
    .filter((entry) => entry.encounter);
  assert.deepEqual(
    encounters.map((entry) => entry.id),
    shard.cards.slice(3, 7).map((card) => card.cardId),
    `Each word card must appear immediately before that word's first task for ${locale}`,
  );
  assert.deepEqual(
    encounters.map((entry) => entry.encounter?.lexicalItemId),
    ['e01-s02-word-happy', 'e01-s02-word-sad', 'e01-s02-word-tired', 'e01-s02-word-fine'],
  );
  assert.ok(encounters.every((entry) =>
    (entry.encounter?.playfulMeaningByLocale[locale]?.length ?? 0) >= 55,
  ), `Every word card needs an exact, lively manual description for ${locale}`);
}

const deviceChildren = buildSessionChildBodiesFromShard(shard, 'ru', 'en:lesson-01:session:02');
const deviceRun = createLearningV2CourseSessionDeviceRunV1({
  environment: 'production',
  targetLanguage: 'en',
  studyTarget: 'en',
  learnerSourceLocale: 'ru',
  seasonId: 'learning-v2',
  releaseId: 'session-02-mode-native-gate',
  activeRootFingerprint: 'a'.repeat(64),
  activeHeadFingerprint: 'b'.repeat(64),
  lessonId: 'lesson-01',
  lessonOrdinal: 1,
  courseSessionId: 'en:lesson-01:session:02',
  sessionOrdinal: 2,
  packageFingerprint: 'c'.repeat(64),
  childSetFingerprint: 'd'.repeat(64),
  introChild: deviceChildren.intro as never,
  learnerChild: deviceChildren.learner as never,
  evaluatorCapsuleChild: deviceChildren.evaluatorCapsule as never,
  auxiliaryChild: deviceChildren.auxiliary as never,
});
for (const interaction of deviceChildren.learner.interactions) {
  const payload = interaction.modePayload as Record<string, unknown>;
  const response = interaction.family === 'speed_match'
    ? { kind: 'choice_token' as const, value: 'all_pairs_matched' }
    : interaction.family === 'listen_choose' || interaction.family === 'context_gap_grammar'
    ? {
        kind: 'choice_token' as const,
        value: ((payload.choiceFeedback as readonly { responseId: string; correct: boolean }[])
          .find((entry) => entry.correct)?.responseId ?? null),
      }
    : interaction.family === 'scripted_repeat_compare'
    ? { kind: 'transcript' as const, value: String(payload.targetPhrase) }
    : {
        kind: 'text' as const,
        value: String(payload.targetPhrase ?? payload.hiddenTargetPhrase),
      };
  const verdict = evaluateLearningV2CourseSessionDeviceInteractionV1(
    deviceRun,
    interaction.interactionId,
    response,
  );
  assert.equal(
    verdict.resultCode,
    'provisional_correct',
    `Real device evaluator rejected ${interaction.interactionId}`,
  );
}
const authoringPreview = buildLearningV2AuthoringDevicePreviewV1(2, 'ru');
assert.equal(authoringPreview.status, 'DRAFT');
assert.equal(authoringPreview.introChild.pages.length, 3);
assert.equal(authoringPreview.learnerChild.interactions.length, 17);
assert.equal(authoringPreview.sideEffectPolicy, 'preview_only_no_learner_writes');

const report = evaluateLearningV2SessionContentQuality(EPISODE_01_SESSION_02_SOURCE);
const reviewOnly = new Set([
  'quality_review_missing', 'quality_review_stale', 'quality_review_rejected',
  'quality_review_not_independent', 'locale_review_missing',
]);
assert.deepEqual(
  report.issues.filter((issue) => !reviewOnly.has(issue.code)),
  [],
  'Session 2 must have no deterministic quality blocker before independent review',
);

process.stdout.write('LEARNING V2 SESSION 2 MODE-NATIVE WORD-FIRST GATE: PASS\n');

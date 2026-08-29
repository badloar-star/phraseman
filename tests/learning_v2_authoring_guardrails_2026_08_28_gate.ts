import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { authoredLearningV2SessionSource } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { evaluateLearningV2SessionContentQuality } from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";
import { buildLearningV2DevUnlockedDraftDevicePreviewV1 } from "../modules/learning-v2/preview/authoring_device_preview_v1";
import { evaluateLearningV2CourseSessionInteractionV1 } from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import { evaluateLearningV2LearnerProjectionIntegrityV1 } from "../modules/learning-v2/content/source/learning_v2_learner_projection_integrity_v1";
import {
  assertLearningV2CurrentGrammarGetsFullSessionV1,
  assertLearningV2NoLetterLevelAssemblyV1,
  assertLearningV2NewVocabularyProgressionV1,
} from "../scripts/learning_v2_current_session_integrity_gate";

const session1 = authoredLearningV2SessionSource(1);
assert.ok(session1, "english_session_1_source_missing");
const session2 = authoredLearningV2SessionSource(2);
assert.ok(session2, "english_session_2_source_missing");
const session3 = authoredLearningV2SessionSource(3);
assert.ok(session3, "english_session_3_source_missing");
const session4 = authoredLearningV2SessionSource(4);
assert.ok(session4, "english_session_4_source_missing");

const wrongRussianLocale = structuredClone(session2);
(wrongRussianLocale.learningGoal as { ru: string }).ru =
  "Це повністю український текст, який випадково потрапив у російську локаль.";
assert.ok(
  evaluateLearningV2SessionContentQuality(wrongRussianLocale).issues.some(
    (issue) =>
      issue.code === "locale_language_mismatch" &&
      issue.path === "learningGoal.ru",
  ),
  "ru_locale_must_reject_ukrainian_learner_copy",
);

const wateryIntro = structuredClone(session2);
(wateryIntro.introPages[0].body as { ru: string }).ru +=
  " Кроме того, запомните ещё одно отдельное правило.";
assert.ok(
  evaluateLearningV2SessionContentQuality(wateryIntro).issues.some(
    (issue) =>
      issue.code === "intro_multiple_teaching_jobs" &&
      issue.path === "introPages[0].ru.body",
  ),
  "intro_page_must_not_pack_an_unrelated_second_rule",
);

const noNewVocabulary = structuredClone(session3);
noNewVocabulary.newVocabulary = [];
assert.ok(
  evaluateLearningV2SessionContentQuality(noNewVocabulary).issues.some(
    (issue) => issue.code === "vocabulary_count_invalid" && issue.path === "newVocabulary",
  ),
  "every authored session must introduce at least one genuinely new lexical unit",
);
assert.throws(
  () => assertLearningV2NewVocabularyProgressionV1([
    session2,
    { ...structuredClone(session3), newVocabulary: structuredClone(session2.newVocabulary) },
  ]),
  /session_new_vocabulary_reused/u,
  "a word introduced by an earlier session must never be issued as new again",
);

const letterAssembly = structuredClone(session4);
const builderIndex = letterAssembly.modeNativePractice?.findIndex((step) => step.modePayload.family === "phrase_builder") ?? -1;
assert.ok(builderIndex >= 0, "session_4_phrase_builder_missing");
const letterBuilder = letterAssembly.modeNativePractice![builderIndex]!.modePayload;
assert.equal(letterBuilder.family, "phrase_builder");
if (letterBuilder.family === "phrase_builder") letterBuilder.orderedTokens = ["Y", "o", "u"];
assert.throws(
  () => assertLearningV2NoLetterLevelAssemblyV1(letterAssembly),
  /letter_level_assembly_forbidden/u,
  "builders must use complete words and must never mix letter fragments with words",
);

const splitContraction = structuredClone(session4);
const contractionBuilder = splitContraction.modeNativePractice![builderIndex]!.modePayload;
assert.equal(contractionBuilder.family, "phrase_builder");
if (contractionBuilder.family === "phrase_builder") {
  contractionBuilder.targetPhrase = "You're";
  contractionBuilder.orderedTokens = ["You", "'re"];
}
assert.throws(
  () => assertLearningV2NoLetterLevelAssemblyV1(splitContraction),
  /letter_level_assembly_forbidden/u,
  "a one-word contraction must remain one complete tile instead of being reconstructed from chunks",
);

const nativeMeaningIntro = structuredClone(session4);
nativeMeaningIntro.introPages[0]!.question.choices = [
  { ...nativeMeaningIntro.introPages[0]!.question.choices[0], ru: "Вы здесь" },
  { ...nativeMeaningIntro.introPages[0]!.question.choices[1], ru: "Я здесь" },
  { ...nativeMeaningIntro.introPages[0]!.question.choices[2], ru: "Вы готовы" },
];
assert.throws(
  () => assertLearningV2CurrentGrammarGetsFullSessionV1([session1, session2, session3, nativeMeaningIntro]),
  /intro_native_language_answer_forbidden/u,
  "intro questions must diagnose the taught English grammar, never native-language semantics",
);

const unexplainedGrammar = structuredClone(session4);
delete unexplainedGrammar.introPages[1]!.question.grammarFeatureId;
assert.throws(
  () => assertLearningV2CurrentGrammarGetsFullSessionV1([session1, session2, session3, unexplainedGrammar]),
  /intro_grammar_focus_missing_or_stale/u,
  "new grammar may not appear in practice before every intro page declares its teaching job",
);

const hiddenGrammar = structuredClone(session3);
hiddenGrammar.phrases[0]!.features.push("infinitive_to");
assert.throws(
  () => assertLearningV2CurrentGrammarGetsFullSessionV1([session2, hiddenGrammar]),
  /new_grammar_hidden_inside_session/u,
  "new grammar must be the declared focus of its own full session",
);

const untaggedToConstruction = structuredClone(session3);
untaggedToConstruction.phrases[0]!.english = "I am to go";
assert.throws(
  () => assertLearningV2CurrentGrammarGetsFullSessionV1([session2, untaggedToConstruction]),
  /new_grammar_hidden_inside_session/u,
  "surface grammar such as to must not bypass the dedicated-session gate by omitting a feature tag",
);

const jargonInQuestion = structuredClone(session2);
(jargonInQuestion.introPages[0].question.prompt as { ru: string }).ru =
  "Какой инфинитив здесь нужен?";
assert.ok(
  evaluateLearningV2SessionContentQuality(jargonInQuestion).issues.some(
    (issue) =>
      issue.code === "learner_copy_forbidden_term" &&
      issue.path === "introPages[0].question.prompt.ru",
  ),
  "forbidden_beginner_jargon_must_be_blocked_outside_intro_body_too",
);

const weakBuilder = structuredClone(session2);
const builder = weakBuilder.modeNativePractice?.find(
  (practice) => practice.modePayload.family === "phrase_builder",
);

const weakPhraseSource = structuredClone(session3);
weakPhraseSource.phrases[0]!.words[1]!.distractors =
  weakPhraseSource.phrases[0]!.words[1]!.distractors.slice(0, 2);
assert.ok(
  evaluateLearningV2SessionContentQuality(weakPhraseSource).issues.some(
    (issue) => issue.code === "phrase_distractors_invalid",
  ),
  "manual_phrase_word_must_have_at_least_three_authored_distractors",
);
assert.ok(builder && builder.modePayload.family === "phrase_builder");
(builder.modePayload as { authoredDistractorTokens: readonly string[] }).authoredDistractorTokens =
  builder.modePayload.authoredDistractorTokens.slice(0, 2);
assert.ok(
  evaluateLearningV2SessionContentQuality(weakBuilder).issues.some(
    (issue) => issue.code === "mode_distractors_invalid",
  ),
  "one_step_builder_must_have_at_least_three_authored_distractors",
);

const copiedChoiceFeedbackSource = structuredClone(session3);
const copiedChoicePractice = copiedChoiceFeedbackSource.modeNativePractice?.find(
  (practice) => practice.modePayload.family === "listen_choose",
);
assert.ok(copiedChoicePractice?.modePayload.family === "listen_choose");
const copiedWrongFeedback = copiedChoicePractice.modePayload.choiceFeedback.filter(
  (entry) => !entry.correct,
);
assert.ok(copiedWrongFeedback.length >= 2, "listen_choose_wrong_feedback_fixture_too_small");
copiedWrongFeedback[1]!.feedbackByLocale = copiedWrongFeedback[0]!.feedbackByLocale;
assert.ok(
  evaluateLearningV2SessionContentQuality(copiedChoiceFeedbackSource).issues.some(
    (issue) => issue.code === "mode_choice_feedback_not_pair_specific",
  ),
  "source_gate_must_reject_copied_feedback_between_choice_distractors",
);

const unrelatedChoiceFeedbackSource = structuredClone(session3);
const unrelatedChoicePractice = unrelatedChoiceFeedbackSource.modeNativePractice?.find(
  (practice) => practice.modePayload.family === "context_gap_grammar",
);
assert.ok(unrelatedChoicePractice?.modePayload.family === "context_gap_grammar");
const unrelatedWrongFeedback = unrelatedChoicePractice.modePayload.choiceFeedback.find(
  (entry) => !entry.correct,
);
assert.ok(unrelatedWrongFeedback, "context_gap_wrong_feedback_fixture_missing");
unrelatedWrongFeedback.feedbackByLocale.ru = "Здесь просто нужен другой ответ.";
assert.ok(
  evaluateLearningV2SessionContentQuality(unrelatedChoiceFeedbackSource).issues.some(
    (issue) => issue.code === "mode_choice_feedback_not_pair_specific",
  ),
  "source_gate_must_require_feedback_to_name_the_selected_trap_and_correct_form",
);

// Mutation fixtures must remain stable when the owner legitimately reopens an
// earlier ordinal. This DEV-only builder reads the real source/package but does
// not mistake registry visibility for projection correctness.
const preview = buildLearningV2DevUnlockedDraftDevicePreviewV1(3, "ru");
const cleanProjection = evaluateLearningV2LearnerProjectionIntegrityV1({
  learnerChild: preview.learnerChild,
  evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
  auxiliaryChild: preview.auxiliaryChild,
});
assert.deepEqual(
  cleanProjection.issues,
  [],
  `session_3_projection_must_be_clean:${JSON.stringify(cleanProjection.issues)}`,
);

const missingCorrectProjection = structuredClone(preview.learnerChild);
const choiceInteraction = missingCorrectProjection.interactions.find(
  (interaction) => interaction.inputMode === "single_choice",
);
assert.ok(choiceInteraction, "session_3_single_choice_interaction_missing");
const acceptedIds = new Set(
  choiceInteraction.responseOptions
    .filter(
      (option) =>
        evaluateLearningV2CourseSessionInteractionV1(
          preview.evaluatorCapsuleChild,
          choiceInteraction.interactionId,
          { kind: "choice_token", value: option.responseId },
        ).resultCode === "provisional_correct",
    )
    .map((option) => option.responseId),
);
(choiceInteraction as { responseOptions: typeof choiceInteraction.responseOptions }).responseOptions =
  choiceInteraction.responseOptions.filter(
    (option) => !acceptedIds.has(option.responseId),
  );
assert.ok(
  evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: missingCorrectProjection,
    evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
    auxiliaryChild: preview.auxiliaryChild,
  }).issues.some(
    (issue) => issue.code === "single_choice_correct_count_invalid",
  ),
  "projection_gate_must_reject_a_choice_screen_without_its_correct_answer",
);

const reducedVisibleDistractors = structuredClone(preview.learnerChild);
const fourOptionInteraction = reducedVisibleDistractors.interactions.find(
  (interaction) =>
    interaction.inputMode === "single_choice" &&
    interaction.responseOptions.length === 4,
);
assert.ok(fourOptionInteraction, "session_3_four_option_interaction_missing");
(fourOptionInteraction as { responseOptions: typeof fourOptionInteraction.responseOptions }).responseOptions =
  fourOptionInteraction.responseOptions.slice(0, 3);
assert.ok(
  evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: reducedVisibleDistractors,
    evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
    auxiliaryChild: preview.auxiliaryChild,
  }).issues.some(
    (issue) => issue.code === "single_choice_distractor_count_invalid",
  ),
  "projection_gate_must_reject_a_visible_distractor_reduction",
);

const compoundOptionProjection = structuredClone(preview.learnerChild);
const compoundOptionInteraction = compoundOptionProjection.interactions.find(
  (interaction) => interaction.inputMode === "single_choice" && interaction.responseOptions.length > 0,
);
assert.ok(compoundOptionInteraction, "session_3_option_for_atomic_label_check_missing");
compoundOptionInteraction.responseOptions[0]!.text =
  `${compoundOptionInteraction.responseOptions[0]!.text} / второй вариант`;
assert.ok(
  evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: compoundOptionProjection,
    evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
    auxiliaryChild: preview.auxiliaryChild,
  }).issues.some(
    (issue) => issue.code === "single_choice_compound_option_forbidden",
  ),
  "projection_gate_must_reject_slash_lists_inside_answer_options",
);

const compoundPairProjection = structuredClone(preview.learnerChild);
const pairInteraction = compoundPairProjection.interactions.find(
  (interaction) => interaction.modePayload?.family === "speed_match",
);
assert.ok(
  pairInteraction?.modePayload?.family === "speed_match",
  "session_3_speed_match_for_atomic_label_check_missing",
);
pairInteraction.modePayload.pairGrid[0]!.meaningByLocale.ru = "один / второй";
assert.ok(
  evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: compoundPairProjection,
    evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
    auxiliaryChild: preview.auxiliaryChild,
  }).issues.some(
    (issue) => issue.code === "speed_match_compound_meaning_forbidden",
  ),
  "projection_gate_must_reject_slash_lists_inside_speed_match_meanings",
);

const oversizedPairProjection = structuredClone(preview.learnerChild);
const oversizedPairInteraction = oversizedPairProjection.interactions.find(
  (interaction) => interaction.modePayload?.family === "speed_match",
);
assert.ok(
  oversizedPairInteraction?.modePayload?.family === "speed_match",
  "session_3_speed_match_for_pair_limit_check_missing",
);
oversizedPairInteraction.modePayload.pairGrid.push({
  ...oversizedPairInteraction.modePayload.pairGrid[0]!,
  pairId: "owner-limit-fifth-pair",
  target: "fifth",
});
assert.ok(
  evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: oversizedPairProjection,
    evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
    auxiliaryChild: preview.auxiliaryChild,
  }).issues.some((issue) => issue.code === "speed_match_pair_count_exceeded"),
  "projection_gate_must_reject_more_than_four_speed_match_pairs",
);

const duplicateResponseIdProjection = structuredClone(preview.learnerChild);
const duplicateResponseIdInteraction = duplicateResponseIdProjection.interactions.find(
  (interaction) => interaction.inputMode === "single_choice" && interaction.responseOptions.length >= 2,
);
assert.ok(duplicateResponseIdInteraction, "single_choice_for_response_id_uniqueness_missing");
duplicateResponseIdInteraction.responseOptions[1]!.responseId =
  duplicateResponseIdInteraction.responseOptions[0]!.responseId;
assert.ok(
  evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: duplicateResponseIdProjection,
    evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
    auxiliaryChild: preview.auxiliaryChild,
  }).issues.some((issue) => issue.code === "single_choice_response_ids_not_unique"),
  "projection_gate_must_reject_duplicate_response_ids",
);
assert.ok(
  evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: duplicateResponseIdProjection,
    evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
    auxiliaryChild: preview.auxiliaryChild,
  }).issues.some((issue) => issue.code === "single_choice_correct_count_invalid"),
  "projection_gate_must_reject_two_visible_options_that_both_evaluate_as_correct",
);

const missingWrongFeedbackAuxiliary = structuredClone(preview.auxiliaryChild);
const feedbackInteraction = preview.learnerChild.interactions.find(
  (interaction) => interaction.inputMode === "single_choice",
);
assert.ok(feedbackInteraction, "single_choice_for_feedback_coverage_missing");
const feedbackEntry = missingWrongFeedbackAuxiliary.entries.find(
  (entry) => entry.interactionId === feedbackInteraction.interactionId,
);
assert.ok(feedbackEntry?.responseFeedbackById, "single_choice_feedback_map_missing");
const firstWrongFeedbackId = Object.keys(feedbackEntry.responseFeedbackById)[0];
assert.ok(firstWrongFeedbackId, "single_choice_wrong_feedback_id_missing");
delete (feedbackEntry.responseFeedbackById as Record<string, unknown>)[firstWrongFeedbackId];
assert.ok(
  evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: preview.learnerChild,
    evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
    auxiliaryChild: missingWrongFeedbackAuxiliary,
  }).issues.some((issue) => issue.code === "single_choice_wrong_feedback_missing"),
  "projection_gate_must_require_exact_feedback_for_every_wrong_choice",
);

const missingLocaleFeedbackAuxiliary = structuredClone(preview.auxiliaryChild);
const missingLocaleFeedbackEntry = missingLocaleFeedbackAuxiliary.entries.find(
  (entry) => entry.interactionId === feedbackInteraction.interactionId,
);
assert.ok(missingLocaleFeedbackEntry?.responseFeedbackById, "localized_feedback_fixture_missing");
delete (missingLocaleFeedbackEntry.responseFeedbackById[firstWrongFeedbackId] as Record<string, unknown>).tr;
assert.ok(
  evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: preview.learnerChild,
    evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
    auxiliaryChild: missingLocaleFeedbackAuxiliary,
  }).issues.some((issue) => issue.code === "single_choice_wrong_feedback_missing"),
  "projection_gate_must_require_every_wrong_explanation_in_all_eight_locales",
);

const duplicateWrongFeedbackAuxiliary = structuredClone(preview.auxiliaryChild);
const duplicateFeedbackEntry = duplicateWrongFeedbackAuxiliary.entries.find(
  (entry) => entry.interactionId === feedbackInteraction.interactionId,
);
assert.ok(duplicateFeedbackEntry?.responseFeedbackById, "single_choice_feedback_map_for_uniqueness_missing");
const duplicateFeedbackIds = Object.keys(duplicateFeedbackEntry.responseFeedbackById);
assert.ok(duplicateFeedbackIds.length >= 2, "single_choice_requires_two_wrong_feedback_entries");
(duplicateFeedbackEntry.responseFeedbackById as Record<string, unknown>)[duplicateFeedbackIds[1]!] =
  duplicateFeedbackEntry.responseFeedbackById[duplicateFeedbackIds[0]!]!;
assert.ok(
  evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: preview.learnerChild,
    evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
    auxiliaryChild: duplicateWrongFeedbackAuxiliary,
  }).issues.some((issue) => issue.code === "single_choice_wrong_feedback_not_unique"),
  "projection_gate_must_reject_copied_feedback_between_distractors",
);

const feedbackForCorrectAuxiliary = structuredClone(preview.auxiliaryChild);
const feedbackForCorrectEntry = feedbackForCorrectAuxiliary.entries.find(
  (entry) => entry.interactionId === feedbackInteraction.interactionId,
);
assert.ok(feedbackForCorrectEntry?.responseFeedbackById, "single_choice_feedback_for_correct_target_check_missing");
const acceptedFeedbackId = feedbackInteraction.responseOptions.find((option) =>
  evaluateLearningV2CourseSessionInteractionV1(
    preview.evaluatorCapsuleChild,
    feedbackInteraction.interactionId,
    { kind: "choice_token", value: option.responseId },
  ).resultCode === "provisional_correct",
)?.responseId;
assert.ok(acceptedFeedbackId, "single_choice_accepted_response_id_missing");
(feedbackForCorrectEntry.responseFeedbackById as Record<string, unknown>)[acceptedFeedbackId] =
  feedbackForCorrectEntry.responseFeedbackById[duplicateFeedbackIds[0]!]!;
assert.ok(
  evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: preview.learnerChild,
    evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
    auxiliaryChild: feedbackForCorrectAuxiliary,
  }).issues.some((issue) => issue.code === "single_choice_feedback_target_invalid"),
  "wrong-answer feedback map must never classify the correct response as a distractor",
);

const nonChoiceFeedbackAuxiliary = structuredClone(preview.auxiliaryChild);
const nonChoiceInteraction = preview.learnerChild.interactions.find(
  (interaction) => interaction.inputMode !== "single_choice",
);
assert.ok(nonChoiceInteraction, "non_choice_interaction_for_feedback_boundary_missing");
const nonChoiceEntry = nonChoiceFeedbackAuxiliary.entries.find(
  (entry) => entry.interactionId === nonChoiceInteraction.interactionId,
);
assert.ok(nonChoiceEntry, "non_choice_auxiliary_entry_missing");
(nonChoiceEntry as { responseFeedbackById?: Record<string, unknown> }).responseFeedbackById = {
  forbidden: feedbackForCorrectEntry.responseFeedbackById[duplicateFeedbackIds[0]!]!,
};
assert.ok(
  evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: preview.learnerChild,
    evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
    auxiliaryChild: nonChoiceFeedbackAuxiliary,
  }).issues.some((issue) => issue.code === "non_choice_response_feedback_forbidden"),
  "projection gate must forbid choice-style explanations in builders, pairs, and voice modes",
);

const packageJson = readFileSync(join(__dirname, "..", "package.json"), "utf8");
const preflightScript = JSON.parse(packageJson).scripts[
  "learning-v2:lesson1-authoring-preflight"
] as string;
const packageScripts = JSON.parse(packageJson).scripts as Record<string, string>;
assert.doesNotMatch(
  preflightScript,
  /lesson1_distractor_gate\.ts\s+--session=1/u,
  "authoring_preflight_must_not_silently_audit_session_1_when_session_2_or_3_is_requested",
);
assert.match(
  readFileSync(
    join(
      __dirname,
      "..",
      "scripts",
      "learning_v2_lesson1_authoring_preflight.ts",
    ),
    "utf8",
  ),
  /learning_v2_current_session_integrity_gate/u,
  "authoring_preflight_must_run_the_requested_session_integrity_gate",
);
assert.match(
  preflightScript,
  /learning_v2_authoring_guardrails_2026_08_28_gate/u,
  "authoring_preflight_must_run_the_permanent_editorial_guardrails",
);
assert.match(
  packageScripts["learning-v2:lesson1-authoring-gate"],
  /learning-v2:owner-review-html:build/u,
  "full authoring gate must rebuild the owner-review artifact",
);
assert.match(
  packageScripts["learning-v2:owner-review-ready-gate"],
  /owner-review-html:build[\s\S]*owner-review-html:freshness-gate/u,
  "owner-review readiness must rebuild before checking the live page",
);
assert.match(
  readFileSync(
    join(__dirname, "..", "docs", "v2", "MODE_NATIVE_AUTHORING_CONTRACT.ru.md"),
    "utf8",
  ),
  /learning-v2:owner-review-ready-gate/u,
  "mode-native authoring contract must require the fresh owner-review gate",
);
assert.match(
  readFileSync(join(__dirname, "..", "docs", "v2", "СТАРТ В2.md"), "utf8"),
  /learning-v2:owner-review-ready-gate/u,
  "START V2 must require the fresh owner-review gate",
);
assert.match(
  readFileSync(
    join(__dirname, "..", "docs", "v2", "БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md"),
    "utf8",
  ),
  /Одна кнопка — один ответ/u,
  "text_bible_must_preserve_the_atomic_answer_rule",
);
assert.match(
  readFileSync(
    join(__dirname, "..", "docs", "v2", "БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md"),
    "utf8",
  ),
  /Пояснение принадлежит конкретному неверному выбору/u,
  "text_bible_must_preserve_the_exact_single_choice_feedback_boundary",
);
assert.match(
  readFileSync(
    join(__dirname, "..", "modules", "learning-v2", "content", "source", "learning_v2_learner_projection_integrity_v1.ts"),
    "utf8",
  ),
  /single_choice_compound_option_forbidden/u,
  "permanent_projection_gate_must_preserve_the_compound_option_blocker",
);
assert.match(
  readFileSync(
    join(__dirname, "..", "modules", "learning-v2", "content", "source", "learning_v2_learner_projection_integrity_v1.ts"),
    "utf8",
  ),
  /non_choice_response_feedback_forbidden/u,
  "permanent_projection_gate_must_preserve_the_feedback_mode_boundary",
);
assert.match(
  readFileSync(
    join(__dirname, "..", "scripts", "learning_v2_current_session_integrity_gate.ts"),
    "utf8",
  ),
  /LEARNING_V2_INTERFACE_LOCALES\.flatMap/u,
  "current_session_integrity_must_check_all_mandatory_locales",
);

process.stdout.write("LEARNING V2 AUTHORING GUARDRAILS 2026-08-28: PASS\n");

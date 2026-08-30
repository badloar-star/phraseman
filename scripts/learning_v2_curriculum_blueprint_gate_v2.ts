import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_MANIFEST_V2 } from "../modules/learning-v2/curriculum/en/course_blueprint_manifest_en_v2";
import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2 } from "../modules/learning-v2/curriculum/en/course_blueprint_en_v2";
import {
  LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V2,
  validateLearningV2EnglishGrammarPrerequisiteDagV2,
} from "../modules/learning-v2/curriculum/en/prerequisite_dag_en_v2";
import { validateLearningV2CourseBlueprintV2 } from "../modules/learning-v2/curriculum/validation/course_blueprint_validation_v2";

const blueprint = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2;
const manifest = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_MANIFEST_V2;
const scopeFindings = blueprint.scope.lessons.length === 32 &&
  blueprint.scope.lessons.every((lesson, index) =>
    lesson.lessonOrdinal === index + 1 &&
    lesson.introducesNewMajorSystem === true &&
    lesson.checkpointOnly === false
  ) ? [] : ["scope_invalid"];
const dagFindings = validateLearningV2EnglishGrammarPrerequisiteDagV2(
  LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V2,
);
const semanticFindings = validateLearningV2CourseBlueprintV2({
  grammarOperations: blueprint.grammarOperations,
  lexicalSenses: blueprint.lexicalSenses,
  sessionPackets: blueprint.sessionPackets,
});
const lessonsWithPlannedLexicalProgression = new Set(
  blueprint.sessionPackets
    .filter(
      (packet) =>
        packet.newLexicalSenseIds.length > 0 ||
        packet.retrievalLexicalSenseIds.length > 0,
    )
    .map((packet) => packet.lessonOrdinal),
);
const lexicalScopeFindings = blueprint.scope.lessons
  .filter(
    (lesson) =>
      !lessonsWithPlannedLexicalProgression.has(lesson.lessonOrdinal),
  )
  .map((lesson) => `lesson_lexical_progression_missing:${lesson.lessonOrdinal}`);
const lexicalDensityFindings = blueprint.sessionPackets.flatMap((packet) => {
  const isCheckpoint = packet.sessionWithinChapter === 8;

  if (isCheckpoint && packet.newLexicalSenseIds.length > 0) {
    return [`checkpoint_new_lexicon_forbidden:${packet.sessionId}`];
  }

  if (!isCheckpoint && packet.newLexicalSenseIds.length === 0) {
    return [`noncheckpoint_new_lexicon_missing:${packet.sessionId}`];
  }

  return [];
});
const courseStartOperation = blueprint.grammarOperations[0];
const courseStartPacket = blueprint.sessionPackets[0];
const courseStartFindings = [
  courseStartOperation?.id === "en.grammar.present_be_affirmative.i_am"
    ? null
    : "course_start_atomic_i_am_operation_missing",
  JSON.stringify(courseStartOperation?.positiveExamples) === JSON.stringify(["I am here.", "I am ready."])
    ? null
    : "course_start_examples_not_prerequisite_safe",
  JSON.stringify([...(courseStartPacket?.newLexicalSenseIds ?? [])].sort()) ===
      JSON.stringify(["en.fine.adjective.01", "en.here.adverb.01", "en.ready.adjective.01"])
    ? null
    : "course_start_here_ready_fine_not_explicitly_introduced",
].filter((finding): finding is string => finding !== null);

const countsPass =
  manifest.lessonCount === 32 &&
  manifest.chapterCount === 224 &&
  manifest.sessionPacketCount === 1_792 &&
  manifest.introPlanItemCount === 5_376 &&
  manifest.activityPlanItemCount === 30_464;
const fingerprintPass = /^[a-f0-9]{64}$/.test(manifest.fingerprint);
const approvalPass = manifest.ownerApproval === "APPROVED";
const pass =
  countsPass &&
  fingerprintPass &&
  approvalPass &&
  scopeFindings.length === 0 &&
  dagFindings.length === 0 &&
  semanticFindings.length === 0 &&
  lexicalScopeFindings.length === 0 &&
  lexicalDensityFindings.length === 0 &&
  courseStartFindings.length === 0;

if (!pass) {
  process.stderr.write("LEARNING V2 CURRICULUM BLUEPRINT V2 GATE: HOLD\n");
  process.stderr.write(
    `counts_pass=${countsPass} fingerprint_pass=${fingerprintPass} approval_pass=${approvalPass}\n`,
  );
  process.stderr.write(
    `scope_findings=${scopeFindings.length} dag_findings=${dagFindings.length} semantic_findings=${semanticFindings.length} lexical_scope_findings=${lexicalScopeFindings.length} lexical_density_findings=${lexicalDensityFindings.length} course_start_findings=${courseStartFindings.length}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write("LEARNING V2 CURRICULUM BLUEPRINT V2 GATE: PASS\n");
  process.stdout.write(
    `lessons=${manifest.lessonCount} chapters=${manifest.chapterCount} packets=${manifest.sessionPacketCount}\n`,
  );
  process.stdout.write(
    `intro_plan_items=${manifest.introPlanItemCount} activity_plan_items=${manifest.activityPlanItemCount}\n`,
  );
  process.stdout.write(
    `scope_findings=${scopeFindings.length} dag_findings=${dagFindings.length} semantic_findings=${semanticFindings.length} lexical_scope_findings=${lexicalScopeFindings.length} lexical_density_findings=${lexicalDensityFindings.length} course_start_findings=${courseStartFindings.length}\n`,
  );
  process.stdout.write(
    `owner_approval=${manifest.ownerApproval} fingerprint=${manifest.fingerprint}\n`,
  );
}

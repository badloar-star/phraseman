import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_MANIFEST_V2 } from "../modules/learning-v2/curriculum/en/course_blueprint_manifest_en_v2";
import {
  LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2,
  hashLearningV2EnglishCourseBlueprintBodyV2,
} from "../modules/learning-v2/curriculum/en/course_blueprint_en_v2";
import { learningV2EnglishLexicalSenseOccursInExamplesV2 } from "../modules/learning-v2/curriculum/en/exact_session_packets_en_v2";
import { learningV2EnglishLexicalDensityFindingsForPacketV2 } from "../modules/learning-v2/curriculum/en/lexical_density_policy_en_v2";
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
const lexicalDensityFindings = blueprint.sessionPackets.flatMap(
  learningV2EnglishLexicalDensityFindingsForPacketV2,
);
const checkpointRetrievalFindings = blueprint.sessionPackets
  .filter(
    (packet) =>
      packet.sessionWithinChapter === 8 &&
      packet.retrievalLexicalSenseIds.length === 0,
  )
  .map((packet) => `checkpoint_retrieval_missing:${packet.sessionId}`);
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
      JSON.stringify(["en.fine.adjective.01", "en.happy.adjective.01", "en.here.adverb.01", "en.ready.adjective.01"])
    ? null
    : "course_start_here_ready_fine_not_explicitly_introduced",
].filter((finding): finding is string => finding !== null);

const authoringSessionArg = process.argv.slice(2).find((arg) => arg.startsWith("--session="));
const authoringSession = authoringSessionArg?.slice("--session=".length) ?? null;
const authoringSessionMatch = authoringSession
  ? /^en\/l(\d{2})\/s(\d{2})$/u.exec(authoringSession)
  : null;
const authoringPacket = authoringSessionMatch
  ? blueprint.sessionPackets.find(
      (packet) =>
        packet.lessonOrdinal === Number(authoringSessionMatch[1]) &&
        packet.sessionOrdinal === Number(authoringSessionMatch[2]),
    )
  : null;

const operationEvidenceAlternatives = (operation: (typeof blueprint.grammarOperations)[number]) =>
  [...new Set([
    ...operation.formBoundary.flatMap((frame) => {
    const pieces = frame.toLowerCase().split("+").map((piece) => piece.trim());
    if (pieces.length < 2 || !/^[a-z|]+$/u.test(pieces[0]) || !/^[a-z]+$/u.test(pieces[1])) return [];
    return pieces[0].split("|").map((subject) => `${subject} ${pieces[1]}`);
    }),
    ...operation.positiveExamples,
    ...operation.canonicalLexicalExamples,
  ])];

const operationEvidenceExamples = (operation: (typeof blueprint.grammarOperations)[number]) =>
  [...new Set([...operation.positiveExamples, ...operation.canonicalLexicalExamples])]
    .filter((example) => /[.!?]$/u.test(example.trim()));

const operationContract = (operationId: string) => {
  const operation = blueprint.grammarOperations.find((candidate) => candidate.id === operationId);
  return operation
    ? {
        id: operation.id,
        formBoundary: operation.formBoundary,
        planEvidenceAlternatives: operationEvidenceAlternatives(operation),
        evidenceExamples: operationEvidenceExamples(operation),
      }
    : null;
};

const lexicalContract = (senseId: string) => {
  const sense = blueprint.lexicalSenses.find((candidate) => candidate.id === senseId);
  if (!sense) return null;
  const evidenceExamples = [...new Set(blueprint.sessionPackets
    .filter((packet) => packet.newLexicalSenseIds.includes(senseId))
    .flatMap((packet) => packet.canonicalExamples)
    .filter((example) => learningV2EnglishLexicalSenseOccursInExamplesV2(
      sense.english,
      sense.partOfSpeech,
      [example],
    )))];
  return {
    id: sense.id,
    english: sense.english,
    partOfSpeech: sense.partOfSpeech,
    evidenceExamples,
  };
};

const externalSessionId = (packet: (typeof blueprint.sessionPackets)[number]) =>
  `en/l${String(packet.lessonOrdinal).padStart(2, "0")}/s${String(packet.sessionOrdinal).padStart(2, "0")}`;

const packetSemanticContract = (packet: (typeof blueprint.sessionPackets)[number]) => ({
  session: externalSessionId(packet),
  sessionId: packet.sessionId,
  sessionPacketSha256: hashLearningV2EnglishCourseBlueprintBodyV2(packet),
  grammarOperations: packet.grammarOperationIds.map(operationContract).filter((value) => value !== null),
  reviewOperations: packet.reviewOperationIds.map(operationContract).filter((value) => value !== null),
  newLexicalSenses: packet.newLexicalSenseIds.map(lexicalContract).filter((value) => value !== null),
});

const allAuthoringPacketContracts = blueprint.sessionPackets.map(packetSemanticContract);
const allAuthoringPacketFindings = allAuthoringPacketContracts.flatMap((contract, index) => {
  const packet = blueprint.sessionPackets[index];
  return [
    contract.grammarOperations.length === packet.grammarOperationIds.length ? null : `packet_grammar_operation_missing:${contract.session}`,
    contract.reviewOperations.length === packet.reviewOperationIds.length ? null : `packet_review_operation_missing:${contract.session}`,
    contract.newLexicalSenses.length === packet.newLexicalSenseIds.length ? null : `packet_new_lexical_sense_missing:${contract.session}`,
    [...contract.grammarOperations, ...contract.reviewOperations].every((operation) =>
      operation.planEvidenceAlternatives.length > 0 && operation.evidenceExamples.length > 0
    ) ? null : `packet_operation_evidence_missing:${contract.session}`,
    contract.newLexicalSenses.every((sense) => sense.evidenceExamples.length > 0)
      ? null
      : `packet_lexical_evidence_missing:${contract.session}`,
  ].filter((finding): finding is string => finding !== null);
});

const authoringChapter = authoringPacket
  ? blueprint.chapters.find(
      (chapter) =>
        chapter.lessonOrdinal === authoringPacket.lessonOrdinal &&
        chapter.chapterOrdinal === authoringPacket.chapterOrdinal,
    )
  : null;
const authoringContract = authoringPacket && authoringSession
  ? {
      schemaVersion: "learning_v2_blueprint_authoring_contract_v2",
      session: authoringSession,
      sessionId: authoringPacket.sessionId,
      blueprintFingerprint: manifest.fingerprint,
      sessionPacketSha256: hashLearningV2EnglishCourseBlueprintBodyV2(authoringPacket),
      introPlanItemCount: authoringPacket.introPlan.length,
      activityPlanItemCount: authoringPacket.activityPlan.length,
      acceptedPrefixPackets: allAuthoringPacketContracts.filter(
        (_contract, index) => blueprint.sessionPackets[index].absoluteSessionOrdinal < authoringPacket.absoluteSessionOrdinal,
      ),
      semantic: {
        role: authoringPacket.role,
        grammarOperationIds: authoringPacket.grammarOperationIds,
        reviewOperationIds: authoringPacket.reviewOperationIds,
        prerequisiteSessionIds: authoringPacket.prerequisiteSessionIds,
        grammarOperations: authoringPacket.grammarOperationIds.map(operationContract).filter((value) => value !== null),
        reviewOperations: authoringPacket.reviewOperationIds.map(operationContract).filter((value) => value !== null),
        newLexicalSenses: authoringPacket.newLexicalSenseIds.map(lexicalContract).filter((value) => value !== null),
        retrievalLexicalSenses: authoringPacket.retrievalLexicalSenseIds.map(lexicalContract).filter((value) => value !== null),
        phraseFrames: authoringPacket.phraseFrames,
        modeFamilies: [...new Set(authoringPacket.activityPlan.map((activity) => activity.modeFamily))],
        learningDeltaRu: authoringPacket.learningDeltaRu,
        chapterTitleRu: authoringChapter?.titleRu ?? "",
        transferContextRu: authoringChapter?.transferContextRu ?? "",
      },
    }
  : null;
const authoringContractFindings = authoringSession === null
  ? []
  : [
      authoringSessionMatch ? null : "authoring_session_invalid",
      authoringPacket ? null : "authoring_session_packet_missing",
      authoringChapter ? null : "authoring_session_chapter_missing",
      authoringContract?.semantic.grammarOperations.length === authoringPacket?.grammarOperationIds.length
        ? null
        : "authoring_grammar_operation_missing",
      authoringContract?.semantic.reviewOperations.length === authoringPacket?.reviewOperationIds.length
        ? null
        : "authoring_review_operation_missing",
      authoringContract?.semantic.newLexicalSenses.length === authoringPacket?.newLexicalSenseIds.length
        ? null
        : "authoring_new_lexical_sense_missing",
      authoringContract?.semantic.retrievalLexicalSenses.length === authoringPacket?.retrievalLexicalSenseIds.length
        ? null
        : "authoring_retrieval_lexical_sense_missing",
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
  checkpointRetrievalFindings.length === 0 &&
  courseStartFindings.length === 0 &&
  allAuthoringPacketFindings.length === 0 &&
  authoringContractFindings.length === 0;

if (!pass) {
  process.stderr.write("LEARNING V2 CURRICULUM BLUEPRINT V2 GATE: HOLD\n");
  process.stderr.write(
    `counts_pass=${countsPass} fingerprint_pass=${fingerprintPass} approval_pass=${approvalPass}\n`,
  );
  process.stderr.write(
    `scope_findings=${scopeFindings.length} dag_findings=${dagFindings.length} semantic_findings=${semanticFindings.length} lexical_scope_findings=${lexicalScopeFindings.length} lexical_density_findings=${lexicalDensityFindings.length} checkpoint_retrieval_findings=${checkpointRetrievalFindings.length} course_start_findings=${courseStartFindings.length} authoring_packet_contract_findings=${allAuthoringPacketFindings.length} authoring_contract_findings=${authoringContractFindings.length}\n`,
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
    `authoring_packet_contracts=${allAuthoringPacketContracts.length} authoring_packet_contract_findings=${allAuthoringPacketFindings.length}\n`,
  );
  process.stdout.write(
    `scope_findings=${scopeFindings.length} dag_findings=${dagFindings.length} semantic_findings=${semanticFindings.length} lexical_scope_findings=${lexicalScopeFindings.length} lexical_density_findings=${lexicalDensityFindings.length} checkpoint_retrieval_findings=${checkpointRetrievalFindings.length} course_start_findings=${courseStartFindings.length} authoring_contract_findings=${authoringContractFindings.length}\n`,
  );
  process.stdout.write(
    `owner_approval=${manifest.ownerApproval} fingerprint=${manifest.fingerprint}\n`,
  );
  if (authoringContract) {
    process.stdout.write(
      `authoring_contract_base64=${Buffer.from(JSON.stringify(authoringContract), "utf8").toString("base64")}\n`,
    );
  }
}

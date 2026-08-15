import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_CANONICAL_INTERFACE_LOCALES } from "./v2_canonical_generation_plan";
import type {
  V2B2BodyValidation,
  V2B2ValidationInput,
} from "./v2_canonical_stage_validation_b2_contract";
import {
  SPEAKING_MAX_BYTES,
  isRecord,
  exactKeys,
  exactToken,
  exactHash,
  sortedUnique,
  exactSortedTokenArray,
  safeHumanText,
  issueResult,
  inheritedProvenanceIssues,
  outlineContext,
  validateOutlineBinding,
  sourceHashById,
  validateContentBoundary,
  referenceIdsResolve,
  speechProfileLocale,
} from "./v2_canonical_stage_validation_b2_common";

function historyHashes(
  outlineBody: Record<string, unknown>,
  targetLanguage: string,
  sources: ReadonlyMap<string, string>,
): ReadonlySet<string> {
  const hashes = new Set<string>();
  if (!Array.isArray(outlineBody.sessions)) return hashes;
  for (const session of outlineBody.sessions) {
    if (!isRecord(session)) continue;
    if (Array.isArray(session.trainingPromptRefs)) {
      for (const prompt of session.trainingPromptRefs) {
        if (!isRecord(prompt)) continue;
        if (exactHash(prompt.promptSemanticHash))
          hashes.add(prompt.promptSemanticHash);
        if (exactHash(prompt.contentSemanticHash))
          hashes.add(prompt.contentSemanticHash);
        const sourceContentHash =
          typeof prompt.sourceRefId === "string"
            ? sources.get(prompt.sourceRefId)
            : null;
        const outcomeIds = exactSortedTokenArray(prompt.outcomeIds, 1, 8);
        const unitIds = exactSortedTokenArray(prompt.linguisticUnitIds, 1, 32);
        if (
          outcomeIds &&
          unitIds &&
          typeof prompt.promptText === "string" &&
          typeof prompt.contentBody === "string"
        ) {
          hashes.add(
            hashCanonicalBody(
              Object.freeze({
                schemaVersion: "v2-visible-learning-surface.v1",
                targetLanguage,
                promptText: prompt.promptText,
                contextBody: prompt.contentBody,
                outcomeIds,
                linguisticUnitIds: unitIds,
              }),
            ),
          );
        }
        if (
          sourceContentHash &&
          outcomeIds &&
          unitIds &&
          typeof prompt.promptText === "string" &&
          typeof prompt.contentBody === "string"
        ) {
          hashes.add(
            hashCanonicalBody(
              Object.freeze({
                schemaVersion: "v2-learning-surface-semantics.v1",
                targetLanguage,
                promptText: prompt.promptText,
                contextBody: prompt.contentBody,
                outcomeIds,
                linguisticUnitIds: unitIds,
                sourceContentHashes: [sourceContentHash],
              }),
            ),
          );
        }
      }
    }
    if (Array.isArray(session.independentCandidates)) {
      for (const prompt of session.independentCandidates) {
        if (!isRecord(prompt)) continue;
        if (exactHash(prompt.promptSemanticHash))
          hashes.add(prompt.promptSemanticHash);
        if (exactHash(prompt.contentSemanticHash))
          hashes.add(prompt.contentSemanticHash);
      }
    }
  }
  if (Array.isArray(outlineBody.delayedProbeDefinitions)) {
    for (const prompt of outlineBody.delayedProbeDefinitions) {
      if (!isRecord(prompt)) continue;
      if (exactHash(prompt.novelPromptSemanticHash))
        hashes.add(prompt.novelPromptSemanticHash);
      if (exactHash(prompt.novelContentSemanticHash))
        hashes.add(prompt.novelContentSemanticHash);
    }
  }
  if (Array.isArray(outlineBody.priorTrainingSurfaceSemanticHashes)) {
    outlineBody.priorTrainingSurfaceSemanticHashes.forEach((value) => {
      if (exactHash(value)) hashes.add(value);
    });
  }
  if (Array.isArray(outlineBody.priorTransferSurfaceSemanticHashes)) {
    outlineBody.priorTransferSurfaceSemanticHashes.forEach((value) => {
      if (exactHash(value)) hashes.add(value);
    });
  }
  if (Array.isArray(outlineBody.priorVisibleSurfaceSemanticHashes)) {
    outlineBody.priorVisibleSurfaceSemanticHashes.forEach((value) => {
      if (exactHash(value)) hashes.add(value);
    });
  }
  return hashes;
}

export function validateSpeakingMission(
  input: V2B2ValidationInput,
): V2B2BodyValidation {
  const prefix = "v2_speaking_mission";
  const checked = [
    "speaking_schema",
    "speaking_outline_binding",
    "speaking_source_inheritance",
    "speaking_capstone",
    "speaking_novelty",
    "speaking_fallback",
    "speaking_privacy",
  ];
  const human = [
    "assessment_specialist",
    "cultural_safety_reviewer",
    "minor_safety_reviewer",
    "accessibility_specialist",
    "curriculum_scientist",
    "plain_language_copy_reviewer",
    "privacy_reviewer",
    "product_ux_reviewer",
    "pronunciation_specialist",
    "speech_pedagogy_reviewer",
    "target_language_linguist",
    "voice_privacy_reviewer",
  ];
  const device = [
    "android_audio_interruption_recovery",
    "android_speaking_fallback_accessibility",
    "android_talkback_speaking",
    "ios_audio_interruption_recovery",
    "ios_speaking_fallback_accessibility",
    "ios_voiceover_speaking",
    "large_text_100_150_200_speaking",
    "low_end_speaking_performance",
    "offline_speaking_fallback",
    "reduced_motion_speaking",
  ];
  const listening = ["speaking_construct_listening_review"];
  const issues: string[] = [];
  const body = input.candidate.body;
  const outline = outlineContext(input, prefix);
  issues.push(...outline.issues);
  if (
    !isRecord(body) ||
    !outline.body ||
    !input.episodeOutline ||
    !outline.scenarioId ||
    !exactKeys(body, [
      "schemaVersion",
      "episodeOutlineBinding",
      "episodeId",
      "missionId",
      "targetLanguage",
      "taskType",
      "phase",
      "introducesNewMaterial",
      "scenarioId",
      "outcomeIds",
      "linguisticUnitIds",
      "objectives",
      "semanticSlotIds",
      "criticalConstraintIds",
      "contentBoundary",
      "targetLanguageAtoms",
      "localizableScaffolding",
      "usefulPhraseRefs",
      "prompt",
      "speechProfileBinding",
      "voiceTaskSpec",
      "turnContract",
      "supportContract",
      "evidenceDeclaration",
      "networkContract",
      "fallbackContract",
      "retryPolicy",
      "rewardPolicyRef",
      "privacyRequirements",
      "governanceRefs",
    ])
  )
    return issueResult(
      checked,
      [`${prefix}_schema_invalid`, ...issues],
      human,
      device,
      listening,
    );
  const episodeOrdinal = Number(outline.body.episodeOrdinal);
  if (
    input.candidate.bodySchemaVersion !== "v2-speaking-mission-artifact.v1" ||
    body.schemaVersion !== input.candidate.bodySchemaVersion ||
    body.episodeId !== input.stage.episodeId ||
    !exactToken(body.missionId) ||
    body.targetLanguage !== input.plan.targetLanguage ||
    body.taskType !== "spontaneous" ||
    body.phase !== "transfer_capstone" ||
    body.introducesNewMaterial !== false ||
    body.scenarioId !== outline.scenarioId ||
    input.plan.optionalStageDispositions[episodeOrdinal - 1]
      ?.speakingMission !== "required" ||
    utf8ByteLengthV1(canonicalJsonV1(body)) > SPEAKING_MAX_BYTES
  )
    issues.push(`${prefix}_schema_invalid`);
  issues.push(
    ...validateOutlineBinding(
      body.episodeOutlineBinding,
      input.episodeOutline,
      outline.scenarioId,
      prefix,
    ),
  );
  issues.push(
    ...inheritedProvenanceIssues(input.candidate, input.episodeOutline, prefix),
  );
  const sources = sourceHashById(input.candidate);
  const content = validateContentBoundary(
    body,
    input.plan.targetLanguage,
    outline.outcomeIds,
    outline.unitIds,
    outline.semanticSlotsByOutcome,
    outline.constraintsByOutcome,
    outline.unitsByOutcome,
    sources,
    prefix,
  );
  issues.push(...content.issues);
  const declaredOutcomes = referenceIdsResolve(
    body.outcomeIds,
    outline.outcomeIds,
    1,
    8,
  );
  const declaredUnits = referenceIdsResolve(
    body.linguisticUnitIds,
    outline.unitIds,
    1,
    16,
  );
  const expectedDeclaredUnits = sortedUnique(
    (declaredOutcomes ?? []).flatMap((id) => [
      ...(outline.unitsByOutcome.get(id) ?? []),
    ]),
  );
  const speechLocale = speechProfileLocale(
    body.speechProfileBinding,
    input.plan,
  );
  const objectives = Array.isArray(body.objectives) ? body.objectives : [];
  const objectiveIds = new Set<string>();
  const objectiveOutcomeIds = new Set<string>();
  const objectiveSlotIds = new Set<string>();
  const objectiveConstraintIds = new Set<string>();
  const objectiveBindings = new Map<
    string,
    Readonly<{
      outcomes: readonly string[];
      slots: readonly string[];
      constraints: readonly string[];
    }>
  >();
  if (
    !declaredOutcomes ||
    !declaredUnits ||
    canonicalJsonV1(declaredUnits) !== canonicalJsonV1(expectedDeclaredUnits) ||
    !speechLocale ||
    objectives.length !== 3
  ) {
    issues.push(`${prefix}_objective_coverage_invalid`);
  }
  for (const objective of objectives) {
    const outcomeIds =
      isRecord(objective) && declaredOutcomes
        ? referenceIdsResolve(
            objective.outcomeIds,
            new Set(declaredOutcomes),
            1,
            8,
          )
        : null;
    const slotIds = isRecord(objective)
      ? exactSortedTokenArray(objective.semanticSlotIds, 1, 16)
      : null;
    const constraintIds = isRecord(objective)
      ? exactSortedTokenArray(objective.criticalConstraintIds, 1, 16)
      : null;
    const allowedObjectiveSlots = new Set(
      (outcomeIds ?? []).flatMap((id) => [
        ...(outline.semanticSlotsByOutcome.get(id) ?? []),
      ]),
    );
    const allowedObjectiveConstraints = new Set(
      (outcomeIds ?? []).flatMap((id) => [
        ...(outline.constraintsByOutcome.get(id) ?? []),
      ]),
    );
    if (
      !isRecord(objective) ||
      !exactKeys(objective, [
        "objectiveId",
        "outcomeIds",
        "semanticSlotIds",
        "criticalConstraintIds",
      ]) ||
      !exactToken(objective.objectiveId) ||
      objectiveIds.has(objective.objectiveId) ||
      !outcomeIds ||
      !slotIds ||
      !constraintIds ||
      slotIds.some((id) => !allowedObjectiveSlots.has(id)) ||
      constraintIds.some((id) => !allowedObjectiveConstraints.has(id))
    ) {
      issues.push(`${prefix}_objective_coverage_invalid`);
    } else {
      objectiveIds.add(objective.objectiveId);
      outcomeIds.forEach((id) => objectiveOutcomeIds.add(id));
      slotIds.forEach((id) => objectiveSlotIds.add(id));
      constraintIds.forEach((id) => objectiveConstraintIds.add(id));
      objectiveBindings.set(
        objective.objectiveId,
        Object.freeze({
          outcomes: outcomeIds,
          slots: slotIds,
          constraints: constraintIds,
        }),
      );
    }
  }
  if (declaredOutcomes?.some((id) => !objectiveOutcomeIds.has(id))) {
    issues.push(`${prefix}_objective_coverage_invalid`);
  }
  const semanticSlotIds = exactSortedTokenArray(body.semanticSlotIds, 1, 32);
  const criticalConstraintIds = exactSortedTokenArray(
    body.criticalConstraintIds,
    1,
    32,
  );
  const allowedSlots = new Set(
    (declaredOutcomes ?? []).flatMap((id) => [
      ...(outline.semanticSlotsByOutcome.get(id) ?? []),
    ]),
  );
  const allowedConstraints = new Set(
    (declaredOutcomes ?? []).flatMap((id) => [
      ...(outline.constraintsByOutcome.get(id) ?? []),
    ]),
  );
  if (
    !semanticSlotIds ||
    semanticSlotIds.some((id) => !allowedSlots.has(id)) ||
    [...allowedSlots].some((id) => !semanticSlotIds?.includes(id)) ||
    [...objectiveSlotIds].some((id) => !semanticSlotIds?.includes(id)) ||
    semanticSlotIds?.some((id) => !objectiveSlotIds.has(id)) ||
    !criticalConstraintIds ||
    criticalConstraintIds.some((id) => !allowedConstraints.has(id)) ||
    [...allowedConstraints].some(
      (id) => !criticalConstraintIds?.includes(id),
    ) ||
    [...objectiveConstraintIds].some(
      (id) => !criticalConstraintIds?.includes(id),
    ) ||
    criticalConstraintIds?.some((id) => !objectiveConstraintIds.has(id))
  ) {
    issues.push(`${prefix}_objective_coverage_invalid`);
  }
  const trainingPrompts = Array.isArray(outline.body.sessions)
    ? outline.body.sessions.flatMap((session) =>
        isRecord(session) && Array.isArray(session.trainingPromptRefs)
          ? session.trainingPromptRefs.filter(isRecord)
          : [],
      )
    : [];
  const useful = Array.isArray(body.usefulPhraseRefs)
    ? body.usefulPhraseRefs
    : [];
  const usefulIdentities = new Set<string>();
  const usedTargetAtomIds = new Set<string>();
  const usedScaffoldIds = new Set<string>();
  if (useful.length < 2 || useful.length > 3)
    issues.push(`${prefix}_prompt_commitment_invalid`);
  for (const ref of useful) {
    const contentUnitId =
      isRecord(ref) && exactToken(ref.contentUnitId) ? ref.contentUnitId : null;
    const atom = contentUnitId ? content.targetAtoms.get(contentUnitId) : null;
    if (
      !isRecord(ref) ||
      !exactKeys(ref, [
        "contentUnitId",
        "promptSemanticHash",
        "contentSemanticHash",
        "outcomeIds",
      ]) ||
      !exactHash(ref.promptSemanticHash) ||
      !exactHash(ref.contentSemanticHash) ||
      !declaredOutcomes ||
      !referenceIdsResolve(ref.outcomeIds, new Set(declaredOutcomes), 1, 8) ||
      !trainingPrompts.some(
        (prompt) =>
          prompt.promptSemanticHash === ref.promptSemanticHash &&
          prompt.contentSemanticHash === ref.contentSemanticHash,
      ) ||
      !atom ||
      atom.usageRole !== "useful_phrase" ||
      canonicalJsonV1(atom.outcomeIds) !== canonicalJsonV1(ref.outcomeIds) ||
      usefulIdentities.has(
        canonicalJsonV1([ref.promptSemanticHash, ref.contentSemanticHash]),
      )
    ) {
      issues.push(`${prefix}_prompt_commitment_invalid`);
    } else {
      usefulIdentities.add(
        canonicalJsonV1([ref.promptSemanticHash, ref.contentSemanticHash]),
      );
      if (contentUnitId) usedTargetAtomIds.add(contentUnitId);
    }
  }
  const prompt = body.prompt;
  const history = historyHashes(
    outline.body,
    input.plan.targetLanguage,
    sources,
  );
  const promptContentUnitId =
    isRecord(prompt) && exactToken(prompt.contentUnitId)
      ? prompt.contentUnitId
      : null;
  const sourceRefIds = isRecord(prompt)
    ? exactSortedTokenArray(prompt.sourceRefIds, 1, 1)
    : null;
  const sourceContentHashes = sourceRefIds
    ?.map((id) => sources.get(id))
    .filter((hash): hash is string => Boolean(hash));
  const expectedPromptHash =
    isRecord(prompt) &&
    promptContentUnitId &&
    content.scaffolds.has(promptContentUnitId) &&
    declaredOutcomes &&
    declaredUnits &&
    sourceContentHashes?.length === sourceRefIds?.length
      ? hashCanonicalBody(
          Object.freeze({
            schemaVersion: "v2-learning-surface-semantics.v1",
            targetLanguage: input.plan.targetLanguage,
            promptText: prompt.promptText,
            contextBody: prompt.contextBody,
            outcomeIds: declaredOutcomes,
            linguisticUnitIds: declaredUnits,
            sourceContentHashes,
          }),
        )
      : null;
  const expectedContentHash =
    isRecord(prompt) &&
    declaredOutcomes &&
    sourceContentHashes?.length === sourceRefIds?.length
      ? hashCanonicalBody(
          Object.freeze({
            schemaVersion: "v2-training-content-semantics.v1",
            sourceContentHash: sourceContentHashes?.[0],
            contentBody: prompt.contextBody,
            outcomeIds: declaredOutcomes,
            linguisticUnitIds: declaredUnits,
          }),
        )
      : null;
  const expectedVisibleSurfaceHash =
    isRecord(prompt) && declaredOutcomes && declaredUnits
      ? hashCanonicalBody(
          Object.freeze({
            schemaVersion: "v2-visible-learning-surface.v1",
            targetLanguage: input.plan.targetLanguage,
            promptText: prompt.promptText,
            contextBody: prompt.contextBody,
            outcomeIds: declaredOutcomes,
            linguisticUnitIds: declaredUnits,
          }),
        )
      : null;
  if (
    !isRecord(prompt) ||
    !exactKeys(prompt, [
      "contentUnitId",
      "promptText",
      "contextBody",
      "surfaceSemanticHash",
      "visibleSurfaceSemanticHash",
      "contentSemanticHash",
      "sourceRefIds",
      "newSurfaceForm",
    ]) ||
    !promptContentUnitId ||
    content.scaffolds.get(promptContentUnitId)?.purpose !== "instruction" ||
    content.scaffolds.get(promptContentUnitId)?.sourceText !==
      prompt.promptText ||
    !safeHumanText(prompt.promptText, 3, 1_000) ||
    !safeHumanText(prompt.contextBody, 3, 2_000) ||
    !exactHash(prompt.surfaceSemanticHash) ||
    prompt.surfaceSemanticHash !== expectedPromptHash ||
    !outline.plannedTransferSurfaceHashes.has(prompt.surfaceSemanticHash) ||
    !exactHash(prompt.visibleSurfaceSemanticHash) ||
    prompt.visibleSurfaceSemanticHash !== expectedVisibleSurfaceHash ||
    !outline.plannedTransferVisibleSurfaceHashes.has(
      prompt.visibleSurfaceSemanticHash,
    ) ||
    !exactHash(prompt.contentSemanticHash) ||
    prompt.contentSemanticHash !== expectedContentHash ||
    history.has(prompt.surfaceSemanticHash) ||
    history.has(prompt.visibleSurfaceSemanticHash) ||
    history.has(prompt.contentSemanticHash) ||
    !referenceIdsResolve(prompt.sourceRefIds, new Set(sources.keys()), 1, 8) ||
    prompt.newSurfaceForm !== true
  )
    issues.push(`${prefix}_prompt_commitment_invalid`);
  if (promptContentUnitId) usedScaffoldIds.add(promptContentUnitId);
  const voiceTaskSpec = body.voiceTaskSpec;
  const expectedVoiceVariantIds = [...objectiveIds].sort();
  if (
    !isRecord(voiceTaskSpec) ||
    !exactKeys(voiceTaskSpec, [
      "schemaVersion",
      "taskType",
      "objectiveIds",
      "speechLocale",
      "learningConstructs",
      "semanticVariantIds",
      "transcriptConfirmation",
    ]) ||
    voiceTaskSpec.schemaVersion !== "v2-voice-task.v1" ||
    voiceTaskSpec.taskType !== "spontaneous" ||
    canonicalJsonV1(voiceTaskSpec.objectiveIds) !==
      canonicalJsonV1(expectedVoiceVariantIds) ||
    voiceTaskSpec.speechLocale !== speechLocale ||
    canonicalJsonV1(voiceTaskSpec.learningConstructs) !==
      canonicalJsonV1(["communicative_objective"]) ||
    !exactSortedTokenArray(voiceTaskSpec.semanticVariantIds, 2, 16) ||
    canonicalJsonV1(voiceTaskSpec.semanticVariantIds) !==
      canonicalJsonV1(expectedVoiceVariantIds) ||
    voiceTaskSpec.transcriptConfirmation !== "required"
  ) {
    issues.push(`${prefix}_evidence_claim_invalid`);
  }
  const turn = body.turnContract;
  const support = body.supportContract;
  const evidence = body.evidenceDeclaration;
  if (
    !isRecord(turn) ||
    !exactKeys(turn, [
      "minimumTargetTurns",
      "maximumTargetTurns",
      "transcriptConfirmation",
    ]) ||
    !Number.isSafeInteger(turn.minimumTargetTurns) ||
    Number(turn.minimumTargetTurns) < 3 ||
    !Number.isSafeInteger(turn.maximumTargetTurns) ||
    Number(turn.maximumTargetTurns) > 10 ||
    Number(turn.maximumTargetTurns) < Number(turn.minimumTargetTurns) ||
    turn.transcriptConfirmation !== "required_before_network_send" ||
    !isRecord(support) ||
    !exactKeys(support, [
      "answerExposure",
      "requiredAnswerText",
      "mandatoryHints",
    ]) ||
    support.answerExposure !== "forbidden" ||
    support.requiredAnswerText !== null ||
    support.mandatoryHints !== 0 ||
    !isRecord(evidence) ||
    !exactKeys(evidence, [
      "allowedKinds",
      "voiceTranscriptMatchAllowed",
      "editedTranscriptAuthority",
      "typedRouteAuthority",
      "uncertainResultAuthority",
    ]) ||
    canonicalJsonV1(evidence.allowedKinds) !==
      canonicalJsonV1(["acoustic_pronunciation", "dialogue_objectives"]) ||
    evidence.voiceTranscriptMatchAllowed !== false ||
    evidence.editedTranscriptAuthority !== "semantic_neutral_only" ||
    evidence.typedRouteAuthority !== "semantic_neutral_only" ||
    evidence.uncertainResultAuthority !== "no_pass_fail_mastery_or_stars"
  ) {
    issues.push(`${prefix}_evidence_claim_invalid`);
  }
  const network = body.networkContract;
  if (
    !isRecord(network) ||
    !exactKeys(network, [
      "coreCompletionRequiresNetwork",
      "cancelRequired",
      "timeoutSeconds",
      "providerConfigAllowed",
    ]) ||
    network.coreCompletionRequiresNetwork !== false ||
    network.cancelRequired !== true ||
    !Number.isSafeInteger(network.timeoutSeconds) ||
    Number(network.timeoutSeconds) < 10 ||
    Number(network.timeoutSeconds) > 60 ||
    network.providerConfigAllowed !== false
  ) {
    issues.push(`${prefix}_privacy_invalid`);
  }
  const fallback = body.fallbackContract;
  if (
    !isRecord(fallback) ||
    !exactKeys(fallback, [
      "mode",
      "routeId",
      "entryStepId",
      "objectiveIds",
      "outcomeIds",
      "semanticSlotIds",
      "criticalConstraintIds",
      "steps",
      "parityVerificationStage",
      "runtimeParityAuthority",
      "voiceEvidenceEquivalent",
    ]) ||
    fallback.mode !== "deterministic_non_ai" ||
    !exactToken(fallback.routeId) ||
    !exactToken(fallback.entryStepId) ||
    !referenceIdsResolve(
      fallback.objectiveIds,
      objectiveIds,
      objectiveIds.size,
      objectiveIds.size,
    ) ||
    !declaredOutcomes ||
    !referenceIdsResolve(
      fallback.outcomeIds,
      new Set(declaredOutcomes),
      declaredOutcomes.length,
      declaredOutcomes.length,
    ) ||
    !semanticSlotIds ||
    !referenceIdsResolve(
      fallback.semanticSlotIds,
      new Set(semanticSlotIds),
      semanticSlotIds.length,
      semanticSlotIds.length,
    ) ||
    !criticalConstraintIds ||
    !referenceIdsResolve(
      fallback.criticalConstraintIds,
      new Set(criticalConstraintIds),
      criticalConstraintIds.length,
      criticalConstraintIds.length,
    ) ||
    fallback.parityVerificationStage !== "v2_activity_instances" ||
    fallback.runtimeParityAuthority !== "none" ||
    fallback.voiceEvidenceEquivalent !== false
  ) {
    issues.push(`${prefix}_fallback_parity_invalid`);
  }
  const fallbackSteps =
    isRecord(fallback) && Array.isArray(fallback.steps) ? fallback.steps : [];
  const fallbackStepIds = new Set<string>();
  const fallbackEdges = new Map<string, string | null>();
  const fallbackObjectives = new Set<string>();
  const fallbackOutcomes = new Set<string>();
  const fallbackSlots = new Set<string>();
  const fallbackConstraints = new Set<string>();
  for (const [index, step] of fallbackSteps.entries()) {
    const stepObjectiveIds = isRecord(step)
      ? referenceIdsResolve(step.objectiveIds, objectiveIds, 1, 3)
      : null;
    const stepOutcomeIds =
      isRecord(step) && declaredOutcomes
        ? referenceIdsResolve(step.outcomeIds, new Set(declaredOutcomes), 1, 8)
        : null;
    const stepSlots =
      isRecord(step) && semanticSlotIds
        ? referenceIdsResolve(
            step.semanticSlotIds,
            new Set(semanticSlotIds),
            1,
            32,
          )
        : null;
    const stepConstraints =
      isRecord(step) && criticalConstraintIds
        ? referenceIdsResolve(
            step.criticalConstraintIds,
            new Set(criticalConstraintIds),
            1,
            32,
          )
        : null;
    const expectedStepOutcomes = sortedUnique(
      (stepObjectiveIds ?? []).flatMap(
        (id) => objectiveBindings.get(id)?.outcomes ?? [],
      ),
    );
    const expectedStepSlots = sortedUnique(
      (stepObjectiveIds ?? []).flatMap(
        (id) => objectiveBindings.get(id)?.slots ?? [],
      ),
    );
    const expectedStepConstraints = sortedUnique(
      (stepObjectiveIds ?? []).flatMap(
        (id) => objectiveBindings.get(id)?.constraints ?? [],
      ),
    );
    const instructionId =
      isRecord(step) && exactToken(step.instructionContentUnitId)
        ? step.instructionContentUnitId
        : null;
    if (
      !isRecord(step) ||
      !exactKeys(step, [
        "stepId",
        "ordinal",
        "instructionContentUnitId",
        "objectiveIds",
        "outcomeIds",
        "semanticSlotIds",
        "criticalConstraintIds",
        "nextStepId",
        "terminal",
      ]) ||
      !exactToken(step.stepId) ||
      fallbackStepIds.has(step.stepId) ||
      step.ordinal !== index + 1 ||
      !instructionId ||
      content.scaffolds.get(instructionId)?.purpose !== "fallback" ||
      !stepObjectiveIds ||
      !stepOutcomeIds ||
      !stepSlots ||
      !stepConstraints ||
      canonicalJsonV1(stepOutcomeIds) !==
        canonicalJsonV1(expectedStepOutcomes) ||
      canonicalJsonV1(stepSlots) !== canonicalJsonV1(expectedStepSlots) ||
      canonicalJsonV1(stepConstraints) !==
        canonicalJsonV1(expectedStepConstraints) ||
      !(step.nextStepId === null || exactToken(step.nextStepId)) ||
      typeof step.terminal !== "boolean" ||
      step.terminal !== (step.nextStepId === null)
    ) {
      issues.push(`${prefix}_fallback_parity_invalid`);
    } else {
      fallbackStepIds.add(step.stepId);
      usedScaffoldIds.add(instructionId);
      fallbackEdges.set(step.stepId, step.nextStepId as string | null);
      stepObjectiveIds.forEach((id) => fallbackObjectives.add(id));
      stepOutcomeIds.forEach((id) => fallbackOutcomes.add(id));
      stepSlots.forEach((id) => fallbackSlots.add(id));
      stepConstraints.forEach((id) => fallbackConstraints.add(id));
    }
  }
  if (
    fallbackSteps.length < 2 ||
    fallbackSteps.length > 6 ||
    !isRecord(fallback) ||
    !fallbackStepIds.has(String(fallback.entryStepId)) ||
    [...fallbackEdges.values()].some(
      (id) => id !== null && !fallbackStepIds.has(id),
    ) ||
    [...objectiveIds].some((id) => !fallbackObjectives.has(id)) ||
    (declaredOutcomes ?? []).some((id) => !fallbackOutcomes.has(id)) ||
    (semanticSlotIds ?? []).some((id) => !fallbackSlots.has(id)) ||
    (criticalConstraintIds ?? []).some((id) => !fallbackConstraints.has(id))
  ) {
    issues.push(`${prefix}_fallback_parity_invalid`);
  }
  if (isRecord(fallback) && exactToken(fallback.entryStepId)) {
    const visited = new Set<string>();
    let current: string | null = fallback.entryStepId;
    while (current && !visited.has(current)) {
      visited.add(current);
      current = fallbackEdges.get(current) ?? null;
    }
    if (current !== null || visited.size !== fallbackStepIds.size)
      issues.push(`${prefix}_fallback_parity_invalid`);
  }
  const retry = body.retryPolicy;
  const rewardPolicy = body.rewardPolicyRef;
  if (
    !isRecord(retry) ||
    !exactKeys(retry, [
      "mandatoryLearningRetriesMax",
      "technicalFailureConsumesLearningRetry",
      "alternateAfterTechnicalFailure",
    ]) ||
    !Number.isSafeInteger(retry.mandatoryLearningRetriesMax) ||
    Number(retry.mandatoryLearningRetriesMax) < 0 ||
    Number(retry.mandatoryLearningRetriesMax) > 2 ||
    retry.technicalFailureConsumesLearningRetry !== false ||
    retry.alternateAfterTechnicalFailure !== true ||
    !isRecord(rewardPolicy) ||
    !exactKeys(rewardPolicy, [
      "policyId",
      "version",
      "authority",
      "requiredOutcome",
      "requiredEvidenceKind",
      "minimumConfidentUneditedAttempts",
      "contentMayAward",
      "policyFingerprint",
    ]) ||
    rewardPolicy.policyId !== "learning-v2-voice-third-star.v1" ||
    rewardPolicy.version !== 1 ||
    rewardPolicy.authority !== "code_owned_runtime_only" ||
    rewardPolicy.requiredOutcome !== "PASS_CONFIDENT" ||
    rewardPolicy.requiredEvidenceKind !== "eligible_voice_evidence" ||
    rewardPolicy.minimumConfidentUneditedAttempts !== 2 ||
    rewardPolicy.contentMayAward !== false ||
    rewardPolicy.policyFingerprint !==
      hashCanonicalBody({
        schemaVersion: "v2-code-owned-reward-policy.v1",
        policyId: "learning-v2-voice-third-star.v1",
        version: 1,
        authority: "code_owned_runtime_only",
        requiredOutcome: "PASS_CONFIDENT",
        requiredEvidenceKind: "eligible_voice_evidence",
        minimumConfidentUneditedAttempts: 2,
        contentMayAward: false,
      })
  ) {
    issues.push(`${prefix}_evidence_claim_invalid`);
  }
  const privacy = body.privacyRequirements;
  if (
    !isRecord(privacy) ||
    !exactKeys(privacy, [
      "personalDisclosure",
      "rawAudioRetention",
      "transcriptRetention",
      "providerTraining",
      "genericAnalyticsPayload",
      "consentDecision",
      "minorSafetyReviewRequired",
    ]) ||
    privacy.personalDisclosure !== "fictional_ephemeral_skippable_only" ||
    privacy.rawAudioRetention !== "runtime_policy_only" ||
    privacy.transcriptRetention !== "runtime_policy_only" ||
    privacy.providerTraining !== "forbidden" ||
    privacy.genericAnalyticsPayload !== "none" ||
    privacy.consentDecision !== "runtime_only" ||
    privacy.minorSafetyReviewRequired !== true
  ) {
    issues.push(`${prefix}_privacy_invalid`);
  }
  const governance = body.governanceRefs;
  const governanceKeys = [
    "voiceDataPolicyRef",
    "voiceDataPolicyObjectRef",
    "voiceConsentCopyRefs",
    "voiceConsentCopyObjectRefs",
    "voiceDeletionRouteRef",
    "voiceDeletionRouteObjectRef",
    "voiceMinorsPolicyRef",
    "voiceMinorsPolicyObjectRef",
    "voiceNetworkEgressRef",
    "voiceNetworkEgressObjectRef",
  ];
  const voiceData = isRecord(governance) ? governance.voiceDataPolicyRef : null;
  const voiceDataObject = isRecord(governance)
    ? governance.voiceDataPolicyObjectRef
    : null;
  const consentRefs =
    isRecord(governance) && Array.isArray(governance.voiceConsentCopyRefs)
      ? governance.voiceConsentCopyRefs
      : [];
  const consentObjects =
    isRecord(governance) && Array.isArray(governance.voiceConsentCopyObjectRefs)
      ? governance.voiceConsentCopyObjectRefs
      : [];
  const deletion = isRecord(governance)
    ? governance.voiceDeletionRouteRef
    : null;
  const deletionObject = isRecord(governance)
    ? governance.voiceDeletionRouteObjectRef
    : null;
  const minorSafety = isRecord(governance)
    ? governance.voiceMinorsPolicyRef
    : null;
  const minorSafetyObject = isRecord(governance)
    ? governance.voiceMinorsPolicyObjectRef
    : null;
  const networkEgress = isRecord(governance)
    ? governance.voiceNetworkEgressRef
    : null;
  const networkEgressObject = isRecord(governance)
    ? governance.voiceNetworkEgressObjectRef
    : null;
  const governanceSources = new Map(
    input.candidate.provenanceRefs
      .filter((ref) => ref.provenanceType === "authoritative_source")
      .map((ref) => [ref.provenanceId, ref] as const),
  );
  const pinned = (id: string, contentHash: unknown, objectRef: unknown) => {
    const source = governanceSources.get(id);
    return Boolean(
      source &&
      exactHash(contentHash) &&
      isRecord(objectRef) &&
      exactKeys(objectRef, [
        "provenanceId",
        "objectPath",
        "objectGeneration",
        "contentHash",
      ]) &&
      objectRef.provenanceId === id &&
      objectRef.contentHash === contentHash &&
      objectRef.objectPath === source.objectPath &&
      objectRef.objectGeneration === source.objectGeneration &&
      objectRef.contentHash === source.contentHash,
    );
  };
  if (
    !isRecord(governance) ||
    !exactKeys(governance, governanceKeys) ||
    !isRecord(voiceData) ||
    !exactKeys(voiceData, ["policyId", "version", "contentHash"]) ||
    voiceData.policyId !== "voice-data-policy" ||
    voiceData.version !== 1 ||
    !pinned("voice-data-policy", voiceData.contentHash, voiceDataObject) ||
    consentRefs.length !== V2_CANONICAL_INTERFACE_LOCALES.length ||
    consentObjects.length !== V2_CANONICAL_INTERFACE_LOCALES.length ||
    consentRefs.some((ref, index) => {
      const locale = V2_CANONICAL_INTERFACE_LOCALES[index];
      const copyId = `voice-consent-copy-${locale}`;
      return (
        !isRecord(ref) ||
        !exactKeys(ref, ["copyId", "version", "locale", "contentHash"]) ||
        ref.copyId !== copyId ||
        ref.version !== 1 ||
        ref.locale !== locale ||
        !pinned(copyId, ref.contentHash, consentObjects[index])
      );
    }) ||
    !isRecord(deletion) ||
    !exactKeys(deletion, ["deletionRouteId", "version", "contentHash"]) ||
    deletion.deletionRouteId !== "voice-deletion-policy" ||
    deletion.version !== 1 ||
    !pinned("voice-deletion-policy", deletion.contentHash, deletionObject) ||
    !isRecord(minorSafety) ||
    !exactKeys(minorSafety, ["minorsPolicyId", "version", "contentHash"]) ||
    minorSafety.minorsPolicyId !== "minor-safety-policy" ||
    minorSafety.version !== 1 ||
    !pinned(
      "minor-safety-policy",
      minorSafety.contentHash,
      minorSafetyObject,
    ) ||
    !isRecord(networkEgress) ||
    !exactKeys(networkEgress, ["gatewayId", "version", "contentHash"]) ||
    networkEgress.gatewayId !== "voice-network-egress" ||
    networkEgress.version !== 1 ||
    !pinned(
      "voice-network-egress",
      networkEgress.contentHash,
      networkEgressObject,
    )
  ) {
    issues.push(`${prefix}_privacy_invalid`);
  }
  if (
    [...content.targetAtoms.keys()].some((id) => !usedTargetAtomIds.has(id)) ||
    [...content.evaluatorAtoms.keys()].length > 0 ||
    [...content.scaffolds.keys()].some((id) => !usedScaffoldIds.has(id))
  ) {
    issues.push(`${prefix}_content_boundary_invalid`);
  }
  return issueResult(checked, issues, human, device, listening);
}

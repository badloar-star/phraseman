import {
  canonicalJsonV1,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type {
  V2B2BodyValidation,
  V2B2ValidationInput,
} from "./v2_canonical_stage_validation_b2_contract";
import {
  DIALOGUE_MAX_BYTES,
  isRecord,
  exactKeys,
  exactToken,
  sortedUnique,
  exactTokenArray,
  exactSortedTokenArray,
  issueResult,
  inheritedProvenanceIssues,
  outlineContext,
  validateOutlineBinding,
  sourceHashById,
  validateContentBoundary,
  referenceIdsResolve,
  speechProfileLocale,
} from "./v2_canonical_stage_validation_b2_common";

export function validateDialogue(
  input: V2B2ValidationInput,
): V2B2BodyValidation {
  const prefix = "v2_dialogue_script";
  const checked = [
    "dialogue_schema",
    "dialogue_outline_binding",
    "dialogue_source_inheritance",
    "dialogue_turns",
    "dialogue_offline_fallback",
    "dialogue_evidence_limits",
  ];
  const human = [
    "accessibility_specialist",
    "assessment_specialist",
    "cultural_safety_reviewer",
    "curriculum_scientist",
    "plain_language_copy_reviewer",
    "pragmatics_reviewer",
    "product_ux_reviewer",
    "target_language_linguist",
  ];
  const device = [
    "android_dialogue_offline_accessibility",
    "android_talkback_dialogue",
    "ios_dialogue_offline_accessibility",
    "ios_voiceover_dialogue",
    "large_text_100_150_200_dialogue",
    "low_end_dialogue_performance",
    "reduced_motion_dialogue",
  ];
  const listening = [
    "dialogue_text_audio_parity",
    "dialogue_tempo_intelligibility",
  ];
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
      "dialogueId",
      "targetLanguage",
      "dialogueKind",
      "scenarioId",
      "outcomeIds",
      "linguisticUnitIds",
      "contentBoundary",
      "targetLanguageAtoms",
      "evaluatorOnlyTargetLanguageAtoms",
      "localizableScaffolding",
      "speechProfileBinding",
      "registerContract",
      "speakers",
      "turns",
      "branches",
      "fullTranscriptTurnIds",
      "fallbackContract",
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
    input.candidate.bodySchemaVersion !== "v2-dialogue-script-artifact.v1" ||
    body.schemaVersion !== input.candidate.bodySchemaVersion ||
    body.episodeId !== input.stage.episodeId ||
    !exactToken(body.dialogueId) ||
    body.targetLanguage !== input.plan.targetLanguage ||
    body.scenarioId !== outline.scenarioId ||
    !["scripted", "bounded_branching"].includes(String(body.dialogueKind)) ||
    input.plan.optionalStageDispositions[episodeOrdinal - 1]?.dialogue !==
      "required" ||
    utf8ByteLengthV1(canonicalJsonV1(body)) > DIALOGUE_MAX_BYTES
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
  const register = body.registerContract;
  if (
    !declaredOutcomes ||
    !declaredUnits ||
    canonicalJsonV1(declaredUnits) !== canonicalJsonV1(expectedDeclaredUnits) ||
    !speechLocale ||
    !isRecord(register) ||
    !exactKeys(register, [
      "relationshipSemanticId",
      "formalityPolicyId",
      "consistencyRequired",
    ]) ||
    !exactToken(register.relationshipSemanticId) ||
    !exactToken(register.formalityPolicyId) ||
    register.consistencyRequired !== true
  )
    issues.push(`${prefix}_objective_coverage_invalid`);
  const speakers = Array.isArray(body.speakers) ? body.speakers : [];
  const speakerRoles = new Map<string, string>();
  for (const speaker of speakers) {
    if (
      !isRecord(speaker) ||
      !exactKeys(speaker, ["speakerId", "roleSemanticId", "role"]) ||
      !exactToken(speaker.speakerId) ||
      speakerRoles.has(speaker.speakerId) ||
      !exactToken(speaker.roleSemanticId) ||
      !["learner", "counterpart"].includes(String(speaker.role))
    ) {
      issues.push(`${prefix}_turns_invalid`);
    } else speakerRoles.set(speaker.speakerId, String(speaker.role));
  }
  if (
    speakers.length !== 2 ||
    ![...speakerRoles.values()].includes("learner") ||
    ![...speakerRoles.values()].includes("counterpart")
  ) {
    issues.push(`${prefix}_turns_invalid`);
  }
  const turns = Array.isArray(body.turns) ? body.turns : [];
  const turnIds = new Set<string>();
  const usedTargetAtomIds = new Set<string>();
  const usedEvaluatorAtomIds = new Set<string>();
  const usedScaffoldIds = new Set<string>();
  let learnerTurns = 0;
  let previousRole: string | null = null;
  for (const [index, turn] of turns.entries()) {
    const outcomeIds =
      isRecord(turn) && declaredOutcomes
        ? referenceIdsResolve(turn.outcomeIds, new Set(declaredOutcomes), 1, 8)
        : null;
    const semanticSlotIds = isRecord(turn)
      ? exactSortedTokenArray(turn.semanticSlotIds, 1, 16)
      : null;
    const constraintIds = isRecord(turn)
      ? exactSortedTokenArray(turn.constraintIds, 1, 16)
      : null;
    const acceptedIds = isRecord(turn)
      ? exactSortedTokenArray(turn.acceptedVariantContentUnitIds, 0, 4)
      : null;
    const repairIds = isRecord(turn)
      ? exactSortedTokenArray(turn.repairContentUnitIds, 0, 2)
      : null;
    const contentUnitId =
      isRecord(turn) && exactToken(turn.targetLanguageContentUnitId)
        ? turn.targetLanguageContentUnitId
        : null;
    const learnerGoalId =
      isRecord(turn) && exactToken(turn.learnerGoalContentUnitId)
        ? turn.learnerGoalContentUnitId
        : null;
    const role =
      isRecord(turn) && exactToken(turn.speakerId)
        ? speakerRoles.get(turn.speakerId)
        : null;
    const voiceTaskSpec = isRecord(turn) ? turn.voiceTaskSpec : null;
    const acceptedAtoms =
      acceptedIds?.flatMap((id) => {
        const atom = content.evaluatorAtoms.get(id);
        return atom ? [atom] : [];
      }) ?? [];
    const expectedTurnUnits = sortedUnique(
      (outcomeIds ?? []).flatMap((id) => [
        ...(outline.unitsByOutcome.get(id) ?? []),
      ]),
    );
    const acceptedBindingsValid =
      acceptedIds &&
      acceptedAtoms.length === acceptedIds.length &&
      acceptedAtoms.every(
        (atom) =>
          atom.usageRole === "learner_variant" &&
          canonicalJsonV1(atom.outcomeIds) === canonicalJsonV1(outcomeIds) &&
          canonicalJsonV1(atom.linguisticUnitIds) ===
            canonicalJsonV1(expectedTurnUnits) &&
          canonicalJsonV1(atom.semanticSlotIds) ===
            canonicalJsonV1(semanticSlotIds) &&
          canonicalJsonV1(atom.constraintIds) ===
            canonicalJsonV1(constraintIds),
      );
    const counterpartAtom = contentUnitId
      ? content.targetAtoms.get(contentUnitId)
      : null;
    const counterpartBindingValid = Boolean(
      counterpartAtom &&
      counterpartAtom.usageRole === "counterpart_line" &&
      canonicalJsonV1(counterpartAtom.outcomeIds) ===
        canonicalJsonV1(outcomeIds) &&
      canonicalJsonV1(counterpartAtom.linguisticUnitIds) ===
        canonicalJsonV1(expectedTurnUnits) &&
      canonicalJsonV1(counterpartAtom.semanticSlotIds) ===
        canonicalJsonV1(semanticSlotIds) &&
      canonicalJsonV1(counterpartAtom.constraintIds) ===
        canonicalJsonV1(constraintIds),
    );
    const allowedTurnSlots = new Set(
      (outcomeIds ?? []).flatMap((id) => [
        ...(outline.semanticSlotsByOutcome.get(id) ?? []),
      ]),
    );
    const allowedTurnConstraints = new Set(
      (outcomeIds ?? []).flatMap((id) => [
        ...(outline.constraintsByOutcome.get(id) ?? []),
      ]),
    );
    if (
      !isRecord(turn) ||
      !exactKeys(turn, [
        "turnId",
        "ordinal",
        "speakerId",
        "targetLanguageContentUnitId",
        "learnerGoalContentUnitId",
        "outcomeIds",
        "semanticSlotIds",
        "constraintIds",
        "evidenceRole",
        "support",
        "maxHints",
        "answerExposure",
        "captionRequired",
        "replayAllowed",
        "slowerAllowed",
        "acceptedVariantContentUnitIds",
        "repairContentUnitIds",
        "voiceTaskSpec",
      ]) ||
      !exactToken(turn.turnId) ||
      turnIds.has(turn.turnId) ||
      turn.ordinal !== index + 1 ||
      !role ||
      !outcomeIds ||
      !semanticSlotIds ||
      semanticSlotIds.some((id) => !allowedTurnSlots.has(id)) ||
      !constraintIds ||
      constraintIds.some((id) => !allowedTurnConstraints.has(id)) ||
      !acceptedIds ||
      !repairIds ||
      repairIds.some((id) => content.scaffolds.get(id)?.purpose !== "repair") ||
      !["guided_practice", "near_transfer", "independent_alternate"].includes(
        String(turn.evidenceRole),
      ) ||
      !["full", "partial", "none"].includes(String(turn.support)) ||
      !Number.isSafeInteger(turn.maxHints) ||
      Number(turn.maxHints) < 0 ||
      Number(turn.maxHints) > 2 ||
      !["allowed", "forbidden"].includes(String(turn.answerExposure)) ||
      turn.captionRequired !== true ||
      turn.replayAllowed !== true ||
      turn.slowerAllowed !== true ||
      (role === "counterpart" &&
        (!contentUnitId ||
          !counterpartBindingValid ||
          learnerGoalId !== null ||
          acceptedIds.length !== 0 ||
          voiceTaskSpec !== null)) ||
      (role === "learner" &&
        (contentUnitId !== null ||
          !learnerGoalId ||
          content.scaffolds.get(learnerGoalId)?.purpose !== "instruction" ||
          !acceptedBindingsValid ||
          !isRecord(voiceTaskSpec) ||
          !exactKeys(voiceTaskSpec, [
            "schemaVersion",
            "taskType",
            "objectiveIds",
            "speechLocale",
            "learningConstructs",
            "referenceText",
            "acceptedSpokenVariants",
            "transcriptConfirmation",
          ]) ||
          voiceTaskSpec.schemaVersion !== "v2-voice-task.v1" ||
          voiceTaskSpec.taskType !== "scripted" ||
          canonicalJsonV1(voiceTaskSpec.objectiveIds) !==
            canonicalJsonV1(outcomeIds) ||
          voiceTaskSpec.speechLocale !== speechLocale ||
          canonicalJsonV1(voiceTaskSpec.learningConstructs) !==
            canonicalJsonV1(["communicative_objective"]) ||
          voiceTaskSpec.referenceText !== acceptedAtoms[0]?.text ||
          canonicalJsonV1(voiceTaskSpec.acceptedSpokenVariants) !==
            canonicalJsonV1(acceptedAtoms.map((atom) => atom.text)) ||
          voiceTaskSpec.transcriptConfirmation !== "not_required")) ||
      (turn.evidenceRole === "independent_alternate" &&
        (turn.support !== "none" ||
          turn.maxHints !== 0 ||
          turn.answerExposure !== "forbidden")) ||
      (turn.evidenceRole === "near_transfer" &&
        (!["partial", "none"].includes(String(turn.support)) ||
          Number(turn.maxHints) > 1 ||
          turn.answerExposure !== "forbidden")) ||
      (role === "learner" && acceptedIds.length < 1) ||
      role === previousRole ||
      (index === 0 && role !== "counterpart")
    )
      issues.push(`${prefix}_turns_invalid`);
    else {
      turnIds.add(turn.turnId);
      if (role === "learner") {
        learnerTurns += 1;
        if (learnerGoalId) usedScaffoldIds.add(learnerGoalId);
        acceptedIds.forEach((id) => usedEvaluatorAtomIds.add(id));
        repairIds.forEach((id) => usedScaffoldIds.add(id));
      } else if (contentUnitId) usedTargetAtomIds.add(contentUnitId);
    }
    previousRole = role ?? previousRole;
  }
  if (learnerTurns < 3 || learnerTurns > 5 || turns.length > 25)
    issues.push(`${prefix}_turns_invalid`);
  const learnerTurnRows = turns.filter(
    (turn) =>
      isRecord(turn) && speakerRoles.get(String(turn.speakerId)) === "learner",
  ) as readonly Record<string, unknown>[];
  const coveredOutcomes = new Set(
    learnerTurnRows.flatMap((turn) =>
      Array.isArray(turn.outcomeIds)
        ? turn.outcomeIds.filter((id): id is string => typeof id === "string")
        : [],
    ),
  );
  const coveredSlots = new Set(
    learnerTurnRows.flatMap((turn) =>
      Array.isArray(turn.semanticSlotIds)
        ? turn.semanticSlotIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
    ),
  );
  const coveredConstraints = new Set(
    learnerTurnRows.flatMap((turn) =>
      Array.isArray(turn.constraintIds)
        ? turn.constraintIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
    ),
  );
  const requiredSlots = new Set(
    (declaredOutcomes ?? []).flatMap((id) => [
      ...(outline.semanticSlotsByOutcome.get(id) ?? []),
    ]),
  );
  const requiredConstraints = new Set(
    (declaredOutcomes ?? []).flatMap((id) => [
      ...(outline.constraintsByOutcome.get(id) ?? []),
    ]),
  );
  if (
    (declaredOutcomes ?? []).some((id) => !coveredOutcomes.has(id)) ||
    [...requiredSlots].some((id) => !coveredSlots.has(id)) ||
    [...requiredConstraints].some((id) => !coveredConstraints.has(id))
  ) {
    issues.push(`${prefix}_objective_coverage_invalid`);
  }
  const transcript = exactTokenArray(
    body.fullTranscriptTurnIds,
    turns.length,
    turns.length,
  );
  if (
    !transcript ||
    canonicalJsonV1(transcript) !==
      canonicalJsonV1(
        turns.flatMap((turn) =>
          isRecord(turn) && exactToken(turn.turnId) ? [turn.turnId] : [],
        ),
      )
  )
    issues.push(`${prefix}_turns_invalid`);
  const branches = Array.isArray(body.branches) ? body.branches : [];
  const branchTargets = new Map<string, readonly string[]>();
  if (body.dialogueKind === "scripted" && branches.length !== 0)
    issues.push(`${prefix}_branching_invalid`);
  if (body.dialogueKind === "bounded_branching") {
    const branchIds = new Set<string>();
    const branchFromTurnIds = new Set<string>();
    for (const branch of branches) {
      const nextTurnIds = isRecord(branch)
        ? referenceIdsResolve(branch.nextTurnIds, turnIds, 1, 4)
        : null;
      const choiceIds = isRecord(branch)
        ? referenceIdsResolve(
            branch.choiceContentUnitIds,
            new Set(content.targetAtoms.keys()),
            2,
            4,
          )
        : null;
      const fromIndex = isRecord(branch)
        ? turns.findIndex(
            (turn) => isRecord(turn) && turn.turnId === branch.fromTurnId,
          )
        : -1;
      const fromTurn =
        fromIndex >= 0 && isRecord(turns[fromIndex]) ? turns[fromIndex] : null;
      const nextTurns =
        nextTurnIds?.flatMap((id) => {
          const found = turns.find(
            (turn) => isRecord(turn) && turn.turnId === id,
          );
          return isRecord(found) ? [found] : [];
        }) ?? [];
      const choiceAtoms =
        choiceIds?.flatMap((id) => {
          const atom = content.targetAtoms.get(id);
          return atom ? [atom] : [];
        }) ?? [];
      const terminalGoalIds =
        isRecord(branch) && declaredOutcomes
          ? referenceIdsResolve(
              branch.terminalGoalIds,
              new Set(declaredOutcomes),
              1,
              8,
            )
          : null;
      const choiceTargetBindingsValid =
        choiceAtoms.length === nextTurns.length &&
        choiceAtoms.every((atom, index) => {
          const targetTurn = nextTurns[index];
          const acceptedIds = exactSortedTokenArray(
            targetTurn?.acceptedVariantContentUnitIds,
            1,
            4,
          );
          const acceptedAtoms =
            acceptedIds?.flatMap((id) => {
              const accepted = content.evaluatorAtoms.get(id);
              return accepted ? [accepted] : [];
            }) ?? [];
          const targetOutcomes = Array.isArray(targetTurn?.outcomeIds)
            ? targetTurn.outcomeIds.filter(
                (id): id is string => typeof id === "string",
              )
            : [];
          const targetUnits = sortedUnique(
            targetOutcomes.flatMap((id) => [
              ...(outline.unitsByOutcome.get(id) ?? []),
            ]),
          );
          return (
            acceptedIds !== null &&
            acceptedAtoms.length === acceptedIds.length &&
            canonicalJsonV1(atom.outcomeIds) ===
              canonicalJsonV1(targetTurn?.outcomeIds) &&
            canonicalJsonV1(atom.linguisticUnitIds) ===
              canonicalJsonV1(targetUnits) &&
            canonicalJsonV1(atom.semanticSlotIds) ===
              canonicalJsonV1(targetTurn?.semanticSlotIds) &&
            canonicalJsonV1(atom.constraintIds) ===
              canonicalJsonV1(targetTurn?.constraintIds) &&
            acceptedAtoms.every(
              (accepted) =>
                canonicalJsonV1(accepted.outcomeIds) ===
                  canonicalJsonV1(atom.outcomeIds) &&
                canonicalJsonV1(accepted.linguisticUnitIds) ===
                  canonicalJsonV1(atom.linguisticUnitIds) &&
                canonicalJsonV1(accepted.semanticSlotIds) ===
                  canonicalJsonV1(atom.semanticSlotIds) &&
                canonicalJsonV1(accepted.constraintIds) ===
                  canonicalJsonV1(atom.constraintIds),
            )
          );
        });
      const targetOutcomeIds = sortedUnique(
        nextTurns.flatMap((turn) =>
          Array.isArray(turn.outcomeIds)
            ? turn.outcomeIds.filter(
                (id): id is string => typeof id === "string",
              )
            : [],
        ),
      );
      if (
        !isRecord(branch) ||
        !exactKeys(branch, [
          "branchId",
          "fromTurnId",
          "choiceContentUnitIds",
          "nextTurnIds",
          "terminalGoalIds",
        ]) ||
        !exactToken(branch.branchId) ||
        branchIds.has(branch.branchId) ||
        fromIndex < 0 ||
        !exactToken(branch.fromTurnId) ||
        branchFromTurnIds.has(branch.fromTurnId) ||
        !choiceIds ||
        !nextTurnIds ||
        choiceIds.length !== nextTurnIds.length ||
        !terminalGoalIds ||
        !fromTurn ||
        speakerRoles.get(String(fromTurn.speakerId)) !== "counterpart" ||
        nextTurns.length !== nextTurnIds.length ||
        nextTurns.some(
          (turn) => speakerRoles.get(String(turn.speakerId)) !== "learner",
        ) ||
        choiceAtoms.length !== choiceIds.length ||
        choiceAtoms.some(
          (atom) =>
            atom.usageRole !== "branch_choice" ||
            !Array.isArray(atom.outcomeIds) ||
            atom.outcomeIds.some(
              (id) => !declaredOutcomes?.includes(String(id)),
            ),
        ) ||
        !choiceTargetBindingsValid ||
        canonicalJsonV1(terminalGoalIds) !==
          canonicalJsonV1(targetOutcomeIds) ||
        nextTurnIds.some(
          (id) =>
            turns.findIndex((turn) => isRecord(turn) && turn.turnId === id) <=
            fromIndex,
        )
      )
        issues.push(`${prefix}_branching_invalid`);
      else {
        branchIds.add(branch.branchId);
        branchFromTurnIds.add(branch.fromTurnId);
        branchTargets.set(branch.fromTurnId, nextTurnIds);
        choiceIds.forEach((id) => usedTargetAtomIds.add(id));
      }
    }
    if (branches.length < 1 || branches.length > 12)
      issues.push(`${prefix}_branching_invalid`);
    const graphEdges = new Map<string, readonly string[]>();
    for (const [index, turn] of turns.entries()) {
      if (!isRecord(turn) || !exactToken(turn.turnId)) continue;
      const explicit = branchTargets.get(turn.turnId);
      const next = turns[index + 1];
      graphEdges.set(
        turn.turnId,
        explicit ??
          (isRecord(next) && exactToken(next.turnId) ? [next.turnId] : []),
      );
    }
    const reachableTurns = new Set<string>();
    const terminalCoverage: Readonly<{
      outcomes: ReadonlySet<string>;
      slots: ReadonlySet<string>;
      constraints: ReadonlySet<string>;
    }>[] = [];
    const firstTurnId =
      isRecord(turns[0]) && exactToken(turns[0].turnId)
        ? turns[0].turnId
        : null;
    const pending = firstTurnId
      ? [
          {
            turnId: firstTurnId,
            outcomes: new Set<string>(),
            slots: new Set<string>(),
            constraints: new Set<string>(),
          },
        ]
      : [];
    const visitedStates = new Set<string>();
    while (pending.length > 0 && visitedStates.size <= 4_096) {
      const state = pending.pop()!;
      const turn = turns.find(
        (row) => isRecord(row) && row.turnId === state.turnId,
      );
      if (!isRecord(turn)) continue;
      const outcomes = new Set(state.outcomes);
      const slots = new Set(state.slots);
      const constraints = new Set(state.constraints);
      if (speakerRoles.get(String(turn.speakerId)) === "learner") {
        if (Array.isArray(turn.outcomeIds))
          turn.outcomeIds.forEach((id) => {
            if (typeof id === "string") outcomes.add(id);
          });
        if (Array.isArray(turn.semanticSlotIds))
          turn.semanticSlotIds.forEach((id) => {
            if (typeof id === "string") slots.add(id);
          });
        if (Array.isArray(turn.constraintIds))
          turn.constraintIds.forEach((id) => {
            if (typeof id === "string") constraints.add(id);
          });
      }
      const stateKey = canonicalJsonV1({
        turnId: state.turnId,
        outcomes: sortedUnique([...outcomes]),
        slots: sortedUnique([...slots]),
        constraints: sortedUnique([...constraints]),
      });
      if (visitedStates.has(stateKey)) continue;
      visitedStates.add(stateKey);
      reachableTurns.add(state.turnId);
      const nextIds = graphEdges.get(state.turnId) ?? [];
      if (nextIds.length === 0)
        terminalCoverage.push({ outcomes, slots, constraints });
      else
        nextIds.forEach((turnId) =>
          pending.push({ turnId, outcomes, slots, constraints }),
        );
    }
    if (
      !firstTurnId ||
      visitedStates.size > 4_096 ||
      reachableTurns.size !== turnIds.size ||
      terminalCoverage.length < 1 ||
      terminalCoverage.some(
        (coverage) =>
          (declaredOutcomes ?? []).some((id) => !coverage.outcomes.has(id)) ||
          [...requiredSlots].some((id) => !coverage.slots.has(id)) ||
          [...requiredConstraints].some((id) => !coverage.constraints.has(id)),
      )
    ) {
      issues.push(`${prefix}_branching_invalid`);
    }
  }
  const fallback = body.fallbackContract;
  if (
    !isRecord(fallback) ||
    !exactKeys(fallback, [
      "mode",
      "contentUnitId",
      "outcomeIds",
      "semanticSlotIds",
      "criticalConstraintIds",
      "parityVerificationStage",
      "runtimeParityAuthority",
      "voiceSpecificEvidence",
      "networkRequired",
      "microphoneRequired",
    ]) ||
    fallback.mode !== "deterministic_choice_or_text" ||
    !exactToken(fallback.contentUnitId) ||
    content.scaffolds.get(fallback.contentUnitId)?.purpose !== "fallback" ||
    !declaredOutcomes ||
    !referenceIdsResolve(
      fallback.outcomeIds,
      new Set(declaredOutcomes),
      declaredOutcomes.length,
      declaredOutcomes.length,
    ) ||
    !referenceIdsResolve(
      fallback.semanticSlotIds,
      requiredSlots,
      requiredSlots.size,
      requiredSlots.size,
    ) ||
    !referenceIdsResolve(
      fallback.criticalConstraintIds,
      requiredConstraints,
      requiredConstraints.size,
      requiredConstraints.size,
    ) ||
    fallback.parityVerificationStage !== "v2_activity_instances" ||
    fallback.runtimeParityAuthority !== "none" ||
    fallback.voiceSpecificEvidence !== false ||
    fallback.networkRequired !== false ||
    fallback.microphoneRequired !== false
  ) {
    issues.push(`${prefix}_fallback_parity_invalid`);
  }
  if (isRecord(fallback) && exactToken(fallback.contentUnitId))
    usedScaffoldIds.add(fallback.contentUnitId);
  if (
    [...content.targetAtoms.keys()].some((id) => !usedTargetAtomIds.has(id)) ||
    [...content.evaluatorAtoms.keys()].some(
      (id) => !usedEvaluatorAtomIds.has(id),
    ) ||
    [...content.scaffolds.keys()].some((id) => !usedScaffoldIds.has(id))
  ) {
    issues.push(`${prefix}_content_boundary_invalid`);
  }
  return issueResult(checked, issues, human, device, listening);
}

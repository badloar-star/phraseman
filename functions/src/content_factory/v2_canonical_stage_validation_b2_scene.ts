import {
  canonicalJsonV1,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type {
  V2B2BodyValidation,
  V2B2ValidationInput,
} from "./v2_canonical_stage_validation_b2_contract";
import {
  SCENE_MAX_BYTES,
  isRecord,
  exactKeys,
  exactToken,
  sortedUnique,
  exactSortedTokenArray,
  issueResult,
  inheritedProvenanceIssues,
  outlineContext,
  validateOutlineBinding,
  sourceHashById,
  validateContentBoundary,
  referenceIdsResolve,
} from "./v2_canonical_stage_validation_b2_common";

export function validateSceneSet(
  input: V2B2ValidationInput,
): V2B2BodyValidation {
  const prefix = "v2_scene_set";
  const checked = [
    "scene_schema",
    "scene_outline_binding",
    "scene_source_inheritance",
    "scene_semantics",
    "scene_accessibility",
    "scene_fallback",
  ];
  const human = [
    "accessibility_specialist",
    "cultural_safety_reviewer",
    "curriculum_scientist",
    "product_ux_reviewer",
    "target_language_linguist",
  ];
  const device = [
    "android_accessibility_offline_scene",
    "ios_accessibility_offline_scene",
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
      "sceneSetId",
      "targetLanguage",
      "scenarioId",
      "objectives",
      "contentBoundary",
      "targetLanguageAtoms",
      "localizableScaffolding",
      "entrySceneId",
      "scenes",
      "fallbackContract",
    ])
  ) {
    return issueResult(
      checked,
      [`${prefix}_schema_invalid`, ...issues],
      human,
      device,
      [],
    );
  }
  if (
    input.candidate.bodySchemaVersion !== "v2-scene-set-artifact.v1" ||
    body.schemaVersion !== input.candidate.bodySchemaVersion ||
    body.episodeId !== input.stage.episodeId ||
    !exactToken(body.sceneSetId) ||
    body.targetLanguage !== input.plan.targetLanguage ||
    body.scenarioId !== outline.scenarioId ||
    utf8ByteLengthV1(canonicalJsonV1(body)) > SCENE_MAX_BYTES
  ) {
    issues.push(`${prefix}_schema_invalid`);
  }
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
  const objectives = Array.isArray(body.objectives) ? body.objectives : [];
  const objectiveIds = new Set<string>();
  const objectiveOutcomes = new Set<string>();
  const objectiveSlots = new Set<string>();
  const objectiveConstraints = new Set<string>();
  const objectiveBindings = new Map<
    string,
    Readonly<{
      outcomes: readonly string[];
      slots: readonly string[];
      constraints: readonly string[];
    }>
  >();
  if (objectives.length < 2 || objectives.length > 3)
    issues.push(`${prefix}_objective_coverage_invalid`);
  for (const objective of objectives) {
    const outcomeIds = isRecord(objective)
      ? referenceIdsResolve(objective.outcomeIds, outline.outcomeIds, 1, 4)
      : null;
    const semanticSlotIds = isRecord(objective)
      ? exactSortedTokenArray(objective.semanticSlotIds, 1, 16)
      : null;
    const criticalConstraintIds = isRecord(objective)
      ? exactSortedTokenArray(objective.criticalConstraintIds, 1, 16)
      : null;
    const allowedSlots = new Set(
      (outcomeIds ?? []).flatMap((id) => [
        ...(outline.semanticSlotsByOutcome.get(id) ?? []),
      ]),
    );
    const allowedConstraints = new Set(
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
      !semanticSlotIds ||
      semanticSlotIds.some((id) => !allowedSlots.has(id)) ||
      !criticalConstraintIds ||
      criticalConstraintIds.some((id) => !allowedConstraints.has(id))
    ) {
      issues.push(`${prefix}_objective_coverage_invalid`);
    } else {
      objectiveIds.add(objective.objectiveId);
      outcomeIds.forEach((id) => objectiveOutcomes.add(id));
      semanticSlotIds.forEach((id) => objectiveSlots.add(id));
      criticalConstraintIds.forEach((id) => objectiveConstraints.add(id));
      objectiveBindings.set(
        objective.objectiveId,
        Object.freeze({
          outcomes: outcomeIds,
          slots: semanticSlotIds,
          constraints: criticalConstraintIds,
        }),
      );
    }
  }
  const requiredObjectiveSlots = new Set(
    [...outline.outcomeIds].flatMap((id) => [
      ...(outline.semanticSlotsByOutcome.get(id) ?? []),
    ]),
  );
  const requiredObjectiveConstraints = new Set(
    [...outline.outcomeIds].flatMap((id) => [
      ...(outline.constraintsByOutcome.get(id) ?? []),
    ]),
  );
  if (
    [...outline.outcomeIds].some((id) => !objectiveOutcomes.has(id)) ||
    [...requiredObjectiveSlots].some((id) => !objectiveSlots.has(id)) ||
    [...requiredObjectiveConstraints].some(
      (id) => !objectiveConstraints.has(id),
    )
  ) {
    issues.push(`${prefix}_objective_coverage_invalid`);
  }
  const scenes = Array.isArray(body.scenes) ? body.scenes : [];
  const sceneIds = new Set<string>();
  const nextSceneIds = new Set<string>();
  const sceneEdges = new Map<string, Set<string>>();
  const allActionIds = new Set<string>();
  const usedTargetAtomIds = new Set<string>();
  const usedScaffoldIds = new Set<string>();
  let totalHotspots = 0;
  if (scenes.length < 1 || scenes.length > 6)
    issues.push(`${prefix}_scene_graph_invalid`);
  scenes.forEach((scene, index) => {
    const sceneOutcomeIds = isRecord(scene)
      ? referenceIdsResolve(scene.outcomeIds, outline.outcomeIds, 1, 8)
      : null;
    const sceneUnitIds = isRecord(scene)
      ? referenceIdsResolve(scene.linguisticUnitIds, outline.unitIds, 1, 16)
      : null;
    const expectedSceneUnitIds = sortedUnique(
      (sceneOutcomeIds ?? []).flatMap((id) => [
        ...(outline.unitsByOutcome.get(id) ?? []),
      ]),
    );
    const sceneObjectiveIds = isRecord(scene)
      ? referenceIdsResolve(scene.objectiveIds, objectiveIds, 1, 3)
      : null;
    const atomIds = isRecord(scene)
      ? referenceIdsResolve(
          scene.targetLanguageContentUnitIds,
          new Set(content.targetAtoms.keys()),
          1,
          16,
        )
      : null;
    const sceneAtoms =
      atomIds?.flatMap((id) => {
        const atom = content.targetAtoms.get(id);
        return atom ? [atom] : [];
      }) ?? [];
    const sceneSemanticIds = new Set(
      sceneAtoms.map((atom) => String(atom.semanticId)),
    );
    const sourceRefIds = isRecord(scene)
      ? referenceIdsResolve(scene.sourceRefIds, new Set(sources.keys()), 1, 8)
      : null;
    const hotspots =
      isRecord(scene) && Array.isArray(scene.hotspots) ? scene.hotspots : [];
    totalHotspots += hotspots.length;
    const actionIds: string[] = [];
    for (const [hotspotIndex, hotspot] of hotspots.entries()) {
      const hotspotObjectiveIds = isRecord(hotspot)
        ? referenceIdsResolve(hotspot.objectiveIds, objectiveIds, 1, 3)
        : null;
      const hotspotOutcomeIds = sortedUnique(
        (hotspotObjectiveIds ?? []).flatMap(
          (id) => objectiveBindings.get(id)?.outcomes ?? [],
        ),
      );
      const hotspotSlotIds = sortedUnique(
        (hotspotObjectiveIds ?? []).flatMap(
          (id) => objectiveBindings.get(id)?.slots ?? [],
        ),
      );
      const hotspotConstraintIds = sortedUnique(
        (hotspotObjectiveIds ?? []).flatMap(
          (id) => objectiveBindings.get(id)?.constraints ?? [],
        ),
      );
      const resultAtom = sceneAtoms.find(
        (atom) => atom.semanticId === hotspot.resultSemanticId,
      );
      const repairId =
        isRecord(hotspot) && exactToken(hotspot.repairContentUnitId)
          ? hotspot.repairContentUnitId
          : null;
      if (
        !isRecord(hotspot) ||
        !exactKeys(hotspot, [
          "actionId",
          "ordinal",
          "objectiveIds",
          "resultSemanticId",
          "repairContentUnitId",
        ]) ||
        !exactToken(hotspot.actionId) ||
        actionIds.includes(hotspot.actionId) ||
        hotspot.ordinal !== hotspotIndex + 1 ||
        !hotspotObjectiveIds ||
        !exactToken(hotspot.resultSemanticId) ||
        !sceneSemanticIds.has(hotspot.resultSemanticId) ||
        !resultAtom ||
        canonicalJsonV1(resultAtom.outcomeIds) !==
          canonicalJsonV1(hotspotOutcomeIds) ||
        canonicalJsonV1(resultAtom.semanticSlotIds) !==
          canonicalJsonV1(hotspotSlotIds) ||
        canonicalJsonV1(resultAtom.constraintIds) !==
          canonicalJsonV1(hotspotConstraintIds) ||
        !repairId ||
        content.scaffolds.get(repairId)?.purpose !== "repair"
      ) {
        issues.push(`${prefix}_scene_graph_invalid`);
      } else {
        actionIds.push(hotspot.actionId);
        allActionIds.add(hotspot.actionId);
      }
    }
    const listActionIds = isRecord(scene)
      ? exactSortedTokenArray(scene.listActionIds, 3, 5)
      : null;
    const accessibilityId =
      isRecord(scene) && exactToken(scene.accessibilityDescriptionContentUnitId)
        ? scene.accessibilityDescriptionContentUnitId
        : null;
    const progressId =
      isRecord(scene) && exactToken(scene.progressContentUnitId)
        ? scene.progressContentUnitId
        : null;
    const interaction = isRecord(scene) ? scene.interactionContract : null;
    const motion = isRecord(scene) ? scene.motionContract : null;
    const completion = isRecord(scene) ? scene.completionContract : null;
    const requiredActionIds = isRecord(completion)
      ? exactSortedTokenArray(completion.requiredActionIds, 3, 5)
      : null;
    const requiredObjectiveIds = isRecord(completion)
      ? referenceIdsResolve(completion.requiredObjectiveIds, objectiveIds, 1, 3)
      : null;
    if (
      !isRecord(scene) ||
      !exactKeys(scene, [
        "sceneId",
        "ordinal",
        "settingSemanticId",
        "objectiveIds",
        "outcomeIds",
        "linguisticUnitIds",
        "targetLanguageContentUnitIds",
        "sourceRefIds",
        "hotspots",
        "nextSceneId",
        "terminal",
        "listActionIds",
        "accessibilityDescriptionContentUnitId",
        "progressContentUnitId",
        "interactionContract",
        "motionContract",
        "completionContract",
      ]) ||
      !exactToken(scene.sceneId) ||
      sceneIds.has(scene.sceneId) ||
      scene.ordinal !== index + 1 ||
      !exactToken(scene.settingSemanticId) ||
      !sceneObjectiveIds ||
      !sceneOutcomeIds ||
      !sceneUnitIds ||
      canonicalJsonV1(sceneUnitIds) !== canonicalJsonV1(expectedSceneUnitIds) ||
      !atomIds ||
      sceneAtoms.length !== atomIds.length ||
      sceneAtoms.some(
        (atom) =>
          atom.usageRole !== "scene_line" ||
          canonicalJsonV1(atom.outcomeIds) !==
            canonicalJsonV1(sceneOutcomeIds) ||
          canonicalJsonV1(atom.linguisticUnitIds) !==
            canonicalJsonV1(sceneUnitIds),
      ) ||
      !sourceRefIds ||
      hotspots.length < 3 ||
      hotspots.length > 5 ||
      !(scene.nextSceneId === null || exactToken(scene.nextSceneId)) ||
      typeof scene.terminal !== "boolean" ||
      scene.terminal !== (scene.nextSceneId === null) ||
      !listActionIds ||
      canonicalJsonV1(listActionIds) !==
        canonicalJsonV1(sortedUnique(actionIds)) ||
      !accessibilityId ||
      content.scaffolds.get(accessibilityId)?.purpose !== "accessibility" ||
      !progressId ||
      content.scaffolds.get(progressId)?.purpose !== "progress" ||
      !isRecord(interaction) ||
      !exactKeys(interaction, [
        "coordinateOnly",
        "colorOnly",
        "dragRequired",
        "hoverRequired",
      ]) ||
      interaction.coordinateOnly !== false ||
      interaction.colorOnly !== false ||
      interaction.dragRequired !== false ||
      interaction.hoverRequired !== false ||
      !isRecord(motion) ||
      !exactKeys(motion, ["infiniteMotion", "reducedMotion"]) ||
      motion.infiniteMotion !== false ||
      motion.reducedMotion !== "static_or_crossfade"
    ) {
      issues.push(`${prefix}_scene_graph_invalid`);
    } else if (
      !isRecord(completion) ||
      !exactKeys(completion, [
        "mode",
        "requiredActionIds",
        "requiredObjectiveIds",
      ]) ||
      completion.mode !== "all_actions_required" ||
      !requiredActionIds ||
      canonicalJsonV1(requiredActionIds) !==
        canonicalJsonV1(sortedUnique(actionIds)) ||
      !requiredObjectiveIds ||
      canonicalJsonV1(requiredObjectiveIds) !==
        canonicalJsonV1(sceneObjectiveIds)
    ) {
      issues.push(`${prefix}_scene_graph_invalid`);
    } else {
      sceneIds.add(scene.sceneId);
      if (scene.nextSceneId) {
        nextSceneIds.add(scene.nextSceneId);
        sceneEdges.set(scene.sceneId, new Set([scene.nextSceneId]));
      }
      atomIds.forEach((id) => usedTargetAtomIds.add(id));
      usedScaffoldIds.add(accessibilityId);
      usedScaffoldIds.add(progressId);
      hotspots.forEach((hotspot) => {
        if (isRecord(hotspot) && exactToken(hotspot.repairContentUnitId)) {
          usedScaffoldIds.add(hotspot.repairContentUnitId);
        }
      });
    }
  });
  if (
    !exactToken(body.entrySceneId) ||
    !sceneIds.has(body.entrySceneId) ||
    [...nextSceneIds].some((id) => !sceneIds.has(id)) ||
    totalHotspots > 24
  ) {
    issues.push(`${prefix}_scene_graph_invalid`);
  }
  if (exactToken(body.entrySceneId) && sceneIds.has(body.entrySceneId)) {
    const reachable = new Set<string>();
    const pending = [body.entrySceneId];
    while (pending.length) {
      const current = pending.pop()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      for (const next of sceneEdges.get(current) ?? []) pending.push(next);
    }
    if (reachable.size !== sceneIds.size)
      issues.push(`${prefix}_scene_graph_invalid`);
  }
  for (const scene of scenes) {
    if (!isRecord(scene) || !exactToken(scene.sceneId)) continue;
    const currentOrdinal = Number(scene.ordinal);
    if (scene.nextSceneId === null) continue;
    const target = scenes.find(
      (row) => isRecord(row) && row.sceneId === scene.nextSceneId,
    );
    if (!isRecord(target) || Number(target.ordinal) <= currentOrdinal)
      issues.push(`${prefix}_scene_graph_invalid`);
  }
  const requiredSceneConstraints = requiredObjectiveConstraints;
  const fallback = body.fallbackContract;
  if (
    !isRecord(fallback) ||
    !exactKeys(fallback, [
      "mode",
      "contentUnitId",
      "objectiveIds",
      "outcomeIds",
      "semanticSlotIds",
      "criticalConstraintIds",
      "actionIds",
      "parityVerificationStage",
      "runtimeParityAuthority",
      "voiceEvidenceEquivalent",
      "assetRequired",
    ]) ||
    fallback.mode !== "deterministic_text_script" ||
    !exactToken(fallback.contentUnitId) ||
    content.scaffolds.get(fallback.contentUnitId)?.purpose !== "fallback" ||
    !referenceIdsResolve(
      fallback.objectiveIds,
      objectiveIds,
      objectiveIds.size,
      objectiveIds.size,
    ) ||
    !referenceIdsResolve(
      fallback.outcomeIds,
      outline.outcomeIds,
      outline.outcomeIds.size,
      outline.outcomeIds.size,
    ) ||
    !referenceIdsResolve(
      fallback.semanticSlotIds,
      requiredObjectiveSlots,
      requiredObjectiveSlots.size,
      requiredObjectiveSlots.size,
    ) ||
    !referenceIdsResolve(
      fallback.criticalConstraintIds,
      requiredSceneConstraints,
      requiredSceneConstraints.size,
      requiredSceneConstraints.size,
    ) ||
    !referenceIdsResolve(
      fallback.actionIds,
      allActionIds,
      allActionIds.size,
      allActionIds.size,
    ) ||
    fallback.parityVerificationStage !== "v2_activity_instances" ||
    fallback.runtimeParityAuthority !== "none" ||
    fallback.voiceEvidenceEquivalent !== false ||
    fallback.assetRequired !== false
  )
    issues.push(`${prefix}_fallback_parity_invalid`);
  if (isRecord(fallback) && exactToken(fallback.contentUnitId))
    usedScaffoldIds.add(fallback.contentUnitId);
  if (
    [...content.targetAtoms.keys()].some((id) => !usedTargetAtomIds.has(id)) ||
    [...content.scaffolds.keys()].some((id) => !usedScaffoldIds.has(id))
  ) {
    issues.push(`${prefix}_content_boundary_invalid`);
  }
  return issueResult(checked, issues, human, device, []);
}

import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_CANONICAL_INTERFACE_LOCALES,
  type V2CanonicalSeasonPlanV1,
} from "./v2_canonical_generation_plan";
import type {
  V2B2BodyValidation,
  V2B2CandidateView,
  V2B2ProvenanceRef,
  V2B2ValidationInput,
} from "./v2_canonical_stage_validation_b2_contract";

const SHA256_RE = /^[a-f0-9]{64}$/;
const TOKEN_RE = /^[A-Za-z0-9._:-]{1,240}$/;
const BCP47_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const SAFE_TEXT_FORBIDDEN_RE =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u;
const MARKUP_OR_URL_RE =
  /<\/?[A-Za-z!]|https?:\/\/|www\.|javascript:|\]\s*\(/iu;
export const SCENE_MAX_BYTES = 128 * 1024;
export const DIALOGUE_MAX_BYTES = 96 * 1024;
export const SPEAKING_MAX_BYTES = 64 * 1024;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return (
    keys.length === expected.length &&
    expected.every((key) => keys.includes(key))
  );
}

export function exactToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_RE.test(value);
}

export function exactHash(value: unknown): value is string {
  return typeof value === "string" && SHA256_RE.test(value);
}

export function sortedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  );
}

export function exactTokenArray(
  value: unknown,
  min: number,
  max: number,
): readonly string[] | null {
  if (
    !Array.isArray(value) ||
    value.length < min ||
    value.length > max ||
    value.some((entry) => !exactToken(entry)) ||
    new Set(value).size !== value.length
  )
    return null;
  return value;
}

export function exactSortedTokenArray(
  value: unknown,
  min: number,
  max: number,
): readonly string[] | null {
  const parsed = exactTokenArray(value, min, max);
  return parsed &&
    canonicalJsonV1(parsed) === canonicalJsonV1(sortedUnique(parsed))
    ? parsed
    : null;
}

export function safeHumanText(
  value: unknown,
  min: number,
  max: number,
): value is string {
  if (
    typeof value !== "string" ||
    value.length < min ||
    value.length > max ||
    value !== value.normalize("NFC") ||
    value.trim() !== value ||
    !value.trim() ||
    SAFE_TEXT_FORBIDDEN_RE.test(value) ||
    MARKUP_OR_URL_RE.test(value)
  )
    return false;
  const lines = value.split("\n");
  return lines.length <= 8 && lines.every((line) => line.length <= 500);
}

export function normalizedLeakText(value: unknown): string {
  return typeof value === "string"
    ? value
        .normalize("NFC")
        .toLocaleLowerCase("en-US")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
    : "";
}

export function issueResult(
  checked: readonly string[],
  issues: readonly string[],
  requiredHuman: readonly string[],
  requiredDevice: readonly string[],
  requiredListening: readonly string[],
): V2B2BodyValidation {
  return Object.freeze({
    checked: Object.freeze([...checked]),
    issues: sortedUnique(issues),
    requiredHuman: sortedUnique(requiredHuman),
    requiredDevice: sortedUnique(requiredDevice),
    requiredListening: sortedUnique(requiredListening),
  });
}

export function provenanceIdentity(ref: V2B2ProvenanceRef): string {
  return canonicalJsonV1([
    ref.provenanceType,
    ref.provenanceId,
    ref.objectPath,
    ref.objectGeneration,
    ref.contentHash,
    ref.byteSize,
  ]);
}

export function inheritedProvenanceIssues(
  candidate: V2B2CandidateView,
  episodeOutline: V2B2CandidateView,
  prefix: string,
): readonly string[] {
  const inherited = new Set(
    episodeOutline.provenanceRefs.map(provenanceIdentity),
  );
  const issues: string[] = [];
  if (
    candidate.provenanceRefs.length < 1 ||
    candidate.provenanceRefs.some(
      (ref) =>
        ref.provenanceType === "generated_asset_receipt" ||
        !inherited.has(provenanceIdentity(ref)),
    )
  ) {
    issues.push(`${prefix}_provenance_not_inherited`);
  }
  return issues;
}

export function outlineContext(input: V2B2ValidationInput, prefix: string) {
  const issues: string[] = [];
  const outline = input.episodeOutline;
  const body = outline?.body;
  if (
    !outline ||
    outline.stageKind !== "v2_episode_outline" ||
    !isRecord(body) ||
    !isRecord(body.scenario) ||
    !Array.isArray(body.sessions)
  ) {
    issues.push(`${prefix}_outline_binding_invalid`);
    return {
      issues,
      body: null,
      scenarioId: null,
      outcomeIds: new Set<string>(),
      unitIds: new Set<string>(),
      semanticSlotsByOutcome: new Map<string, ReadonlySet<string>>(),
      constraintsByOutcome: new Map<string, ReadonlySet<string>>(),
      unitsByOutcome: new Map<string, ReadonlySet<string>>(),
      priorSurfaceHashes: new Set<string>(),
      plannedTransferSurfaceHashes: new Set<string>(),
      plannedTransferVisibleSurfaceHashes: new Set<string>(),
    };
  }
  const outcomeIds = new Set<string>(
    [
      ...(Array.isArray(body.primaryOutcomeIds) ? body.primaryOutcomeIds : []),
      ...(Array.isArray(body.supportingOutcomeIds)
        ? body.supportingOutcomeIds
        : []),
    ].filter((value): value is string => exactToken(value)),
  );
  const primaryOutcomeIds = new Set(
    Array.isArray(body.primaryOutcomeIds)
      ? body.primaryOutcomeIds.filter((value): value is string =>
          exactToken(value),
        )
      : [],
  );
  const allUnitIds = new Set<string>();
  const introducedOutcomes = new Set<string>();
  const practicedOutcomes = new Set<string>();
  const introducedUnits = new Set<string>();
  const practicedUnits = new Set<string>();
  const earliestUnitIntroduction = new Map<string, number>();
  const earliestUnitPractice = new Map<string, number>();
  const earliestOutcomeIntroduction = new Map<string, number>();
  const earliestOutcomePractice = new Map<string, number>();
  const earliestPairIntroduction = new Map<string, number>();
  const earliestPairPractice = new Map<string, number>();
  const introducedUnitsByOutcome = new Map<string, Set<string>>();
  const practicedUnitsByOutcome = new Map<string, Set<string>>();
  for (const [sessionIndex, session] of body.sessions.entries()) {
    if (isRecord(session) && Array.isArray(session.trainingPromptRefs)) {
      for (const [
        promptIndex,
        prompt,
      ] of session.trainingPromptRefs.entries()) {
        if (!isRecord(prompt)) continue;
        const promptOutcomes =
          exactSortedTokenArray(prompt.outcomeIds, 1, 8) ?? [];
        const promptUnits =
          exactSortedTokenArray(prompt.linguisticUnitIds, 1, 32) ?? [];
        const position = sessionIndex * 1_000 + promptIndex;
        promptUnits.forEach((value) => allUnitIds.add(value));
        if (prompt.phase === "introduce") {
          promptOutcomes.forEach((value) => {
            introducedOutcomes.add(value);
            earliestOutcomeIntroduction.set(
              value,
              Math.min(
                earliestOutcomeIntroduction.get(value) ??
                  Number.POSITIVE_INFINITY,
                position,
              ),
            );
            promptUnits.forEach((unitId) => {
              const pair = canonicalJsonV1([value, unitId]);
              earliestPairIntroduction.set(
                pair,
                Math.min(
                  earliestPairIntroduction.get(pair) ??
                    Number.POSITIVE_INFINITY,
                  position,
                ),
              );
            });
          });
          promptUnits.forEach((value) => {
            introducedUnits.add(value);
            earliestUnitIntroduction.set(
              value,
              Math.min(
                earliestUnitIntroduction.get(value) ?? Number.POSITIVE_INFINITY,
                position,
              ),
            );
          });
          promptOutcomes.forEach((outcomeId) => {
            const units =
              introducedUnitsByOutcome.get(outcomeId) ?? new Set<string>();
            promptUnits.forEach((unitId) => units.add(unitId));
            introducedUnitsByOutcome.set(outcomeId, units);
          });
        }
        if (prompt.phase === "practice" || prompt.phase === "retrieval") {
          promptOutcomes.forEach((value) => {
            practicedOutcomes.add(value);
            earliestOutcomePractice.set(
              value,
              Math.min(
                earliestOutcomePractice.get(value) ?? Number.POSITIVE_INFINITY,
                position,
              ),
            );
            promptUnits.forEach((unitId) => {
              const pair = canonicalJsonV1([value, unitId]);
              earliestPairPractice.set(
                pair,
                Math.min(
                  earliestPairPractice.get(pair) ?? Number.POSITIVE_INFINITY,
                  position,
                ),
              );
            });
          });
          promptUnits.forEach((value) => {
            practicedUnits.add(value);
            earliestUnitPractice.set(
              value,
              Math.min(
                earliestUnitPractice.get(value) ?? Number.POSITIVE_INFINITY,
                position,
              ),
            );
          });
          promptOutcomes.forEach((outcomeId) => {
            const units =
              practicedUnitsByOutcome.get(outcomeId) ?? new Set<string>();
            promptUnits.forEach((unitId) => units.add(unitId));
            practicedUnitsByOutcome.set(outcomeId, units);
          });
        }
      }
    }
  }
  const preparedOutcomes = new Set(
    [...outcomeIds].filter(
      (id) =>
        introducedOutcomes.has(id) &&
        practicedOutcomes.has(id) &&
        (earliestOutcomeIntroduction.get(id) ?? Number.POSITIVE_INFINITY) <
          (earliestOutcomePractice.get(id) ?? Number.NEGATIVE_INFINITY),
    ),
  );
  const preparedUnits = new Set(
    [...allUnitIds].filter(
      (id) =>
        introducedUnits.has(id) &&
        practicedUnits.has(id) &&
        (earliestUnitIntroduction.get(id) ?? Number.POSITIVE_INFINITY) <
          (earliestUnitPractice.get(id) ?? Number.NEGATIVE_INFINITY),
    ),
  );
  const unitsByOutcome = new Map<string, ReadonlySet<string>>();
  for (const outcomeId of preparedOutcomes) {
    const introduced =
      introducedUnitsByOutcome.get(outcomeId) ?? new Set<string>();
    const practiced =
      practicedUnitsByOutcome.get(outcomeId) ?? new Set<string>();
    const units = new Set(
      [...introduced].filter(
        (unitId) =>
          practiced.has(unitId) &&
          preparedUnits.has(unitId) &&
          (earliestPairIntroduction.get(canonicalJsonV1([outcomeId, unitId])) ??
            Number.POSITIVE_INFINITY) <
            (earliestPairPractice.get(canonicalJsonV1([outcomeId, unitId])) ??
              Number.NEGATIVE_INFINITY),
      ),
    );
    if (units.size > 0) unitsByOutcome.set(outcomeId, units);
  }
  const semanticSlotsByOutcome = new Map<string, ReadonlySet<string>>();
  const constraintsByOutcome = new Map<string, ReadonlySet<string>>();
  if (Array.isArray(body.outcomeConstraintBindings)) {
    for (const binding of body.outcomeConstraintBindings) {
      if (!isRecord(binding) || !exactToken(binding.outcomeId)) continue;
      const slots = exactSortedTokenArray(binding.semanticSlotIds, 1, 32);
      const constraints = exactSortedTokenArray(binding.constraintIds, 1, 32);
      if (slots && constraints) {
        semanticSlotsByOutcome.set(binding.outcomeId, new Set(slots));
        constraintsByOutcome.set(binding.outcomeId, new Set(constraints));
      }
    }
  }
  const priorSurfaceHashes = new Set(
    Array.isArray(body.priorTrainingSurfaceSemanticHashes)
      ? body.priorTrainingSurfaceSemanticHashes.filter(
          (value): value is string => exactHash(value),
        )
      : [],
  );
  if (Array.isArray(body.priorTransferSurfaceSemanticHashes)) {
    body.priorTransferSurfaceSemanticHashes.forEach((value) => {
      if (exactHash(value)) priorSurfaceHashes.add(value);
    });
  }
  if (Array.isArray(body.priorVisibleSurfaceSemanticHashes)) {
    body.priorVisibleSurfaceSemanticHashes.forEach((value) => {
      if (exactHash(value)) priorSurfaceHashes.add(value);
    });
  }
  const plannedTransferSurfaceHashes = new Set(
    Array.isArray(body.plannedTransferSurfaceSemanticHashes)
      ? body.plannedTransferSurfaceSemanticHashes.filter(
          (value): value is string => exactHash(value),
        )
      : [],
  );
  const plannedTransferVisibleSurfaceHashes = new Set(
    Array.isArray(body.plannedTransferVisibleSurfaceSemanticHashes)
      ? body.plannedTransferVisibleSurfaceSemanticHashes.filter(
          (value): value is string => exactHash(value),
        )
      : [],
  );
  const scenarioId = exactToken(body.scenario.scenarioId)
    ? body.scenario.scenarioId
    : null;
  if (
    !scenarioId ||
    preparedOutcomes.size < 1 ||
    preparedUnits.size < 1 ||
    [...primaryOutcomeIds].some((id) => !preparedOutcomes.has(id)) ||
    [...preparedOutcomes].some(
      (id) =>
        !semanticSlotsByOutcome.has(id) ||
        !constraintsByOutcome.has(id) ||
        !unitsByOutcome.has(id),
    )
  ) {
    issues.push(`${prefix}_outline_binding_invalid`);
  }
  return {
    issues,
    body,
    scenarioId,
    outcomeIds: preparedOutcomes,
    unitIds: preparedUnits,
    semanticSlotsByOutcome,
    constraintsByOutcome,
    unitsByOutcome,
    priorSurfaceHashes,
    plannedTransferSurfaceHashes,
    plannedTransferVisibleSurfaceHashes,
  };
}

export function validateOutlineBinding(
  value: unknown,
  outline: V2B2CandidateView,
  scenarioId: string,
  prefix: string,
): readonly string[] {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "stageId",
      "bodyFingerprint",
      "candidateFingerprint",
      "scenarioId",
    ]) ||
    value.stageId !== outline.stageId ||
    value.bodyFingerprint !== outline.bodyFingerprint ||
    value.candidateFingerprint !== outline.candidateFingerprint ||
    value.scenarioId !== scenarioId
  ) {
    return Object.freeze([`${prefix}_outline_binding_invalid`]);
  }
  return Object.freeze([]);
}

export function sourceHashById(
  candidate: V2B2CandidateView,
): ReadonlyMap<string, string> {
  return new Map(
    candidate.provenanceRefs
      .filter((ref) => ref.provenanceType === "authoritative_source")
      .map((ref) => [ref.provenanceId, ref.contentHash]),
  );
}

export type ContentBoundaryResult = Readonly<{
  issues: readonly string[];
  targetAtoms: ReadonlyMap<string, Record<string, unknown>>;
  evaluatorAtoms: ReadonlyMap<string, Record<string, unknown>>;
  scaffolds: ReadonlyMap<string, Record<string, unknown>>;
}>;

export function validateContentBoundary(
  body: Record<string, unknown>,
  targetLanguage: string,
  allowedOutcomes: ReadonlySet<string>,
  allowedUnits: ReadonlySet<string>,
  semanticSlotsByOutcome: ReadonlyMap<string, ReadonlySet<string>>,
  constraintsByOutcome: ReadonlyMap<string, ReadonlySet<string>>,
  unitsByOutcome: ReadonlyMap<string, ReadonlySet<string>>,
  sources: ReadonlyMap<string, string>,
  prefix: string,
): ContentBoundaryResult {
  const issues: string[] = [];
  const targetAtoms = new Map<string, Record<string, unknown>>();
  const evaluatorAtoms = new Map<string, Record<string, unknown>>();
  const scaffolds = new Map<string, Record<string, unknown>>();
  const semanticIds = new Set<string>();
  const semanticHashes = new Set<string>();
  const rawAtoms = Array.isArray(body.targetLanguageAtoms)
    ? body.targetLanguageAtoms
    : [];
  const rawEvaluatorAtoms = Array.isArray(body.evaluatorOnlyTargetLanguageAtoms)
    ? body.evaluatorOnlyTargetLanguageAtoms
    : [];
  const rawScaffolds = Array.isArray(body.localizableScaffolding)
    ? body.localizableScaffolding
    : [];
  if (
    rawAtoms.length < 1 ||
    rawAtoms.length > 96 ||
    rawScaffolds.length < 1 ||
    rawScaffolds.length > 64
  ) {
    issues.push(`${prefix}_content_boundary_invalid`);
  }
  const parseAtom = (
    atom: unknown,
    destination: Map<string, Record<string, unknown>>,
    issueCode: string,
  ) => {
    const keys = [
      "contentUnitId",
      "semanticId",
      "usageRole",
      "text",
      "outcomeIds",
      "linguisticUnitIds",
      "semanticSlotIds",
      "constraintIds",
      "sourceRefIds",
      "semanticHash",
    ];
    const outcomeIds = isRecord(atom)
      ? exactSortedTokenArray(atom.outcomeIds, 1, 8)
      : null;
    const unitIds = isRecord(atom)
      ? exactSortedTokenArray(atom.linguisticUnitIds, 1, 16)
      : null;
    const semanticSlotIds = isRecord(atom)
      ? exactSortedTokenArray(atom.semanticSlotIds, 1, 32)
      : null;
    const constraintIds = isRecord(atom)
      ? exactSortedTokenArray(atom.constraintIds, 1, 32)
      : null;
    const sourceRefIds = isRecord(atom)
      ? exactSortedTokenArray(atom.sourceRefIds, 1, 8)
      : null;
    const sourceContentHashes = sourceRefIds
      ?.map((id) => sources.get(id))
      .filter((hash): hash is string => Boolean(hash));
    const allowedSlots = new Set(
      outcomeIds?.flatMap((id) => [
        ...(semanticSlotsByOutcome.get(id) ?? []),
      ]) ?? [],
    );
    const allowedConstraints = new Set(
      outcomeIds?.flatMap((id) => [...(constraintsByOutcome.get(id) ?? [])]) ??
        [],
    );
    const pairedUnits = new Set(
      outcomeIds?.flatMap((id) => [...(unitsByOutcome.get(id) ?? [])]) ?? [],
    );
    const expectedHash =
      isRecord(atom) &&
      outcomeIds &&
      unitIds &&
      sourceRefIds &&
      sourceContentHashes?.length === sourceRefIds.length
        ? hashCanonicalBody(
            Object.freeze({
              schemaVersion: "v2-target-language-content-unit-semantics.v1",
              targetLanguage,
              contentUnitId: atom.contentUnitId,
              semanticId: atom.semanticId,
              usageRole: atom.usageRole,
              text: atom.text,
              outcomeIds,
              linguisticUnitIds: unitIds,
              semanticSlotIds,
              constraintIds,
              sourceContentHashes,
            }),
          )
        : null;
    if (
      !isRecord(atom) ||
      !exactKeys(atom, keys) ||
      !exactToken(atom.contentUnitId) ||
      targetAtoms.has(atom.contentUnitId) ||
      evaluatorAtoms.has(atom.contentUnitId) ||
      destination.has(atom.contentUnitId) ||
      !exactToken(atom.semanticId) ||
      semanticIds.has(String(atom.semanticId)) ||
      semanticHashes.has(String(atom.semanticHash)) ||
      ![
        "scene_line",
        "counterpart_line",
        "learner_variant",
        "useful_phrase",
        "branch_choice",
      ].includes(String(atom.usageRole)) ||
      !safeHumanText(atom.text, 1, 500) ||
      !outcomeIds ||
      outcomeIds.some((id) => !allowedOutcomes.has(id)) ||
      !unitIds ||
      unitIds.some((id) => !allowedUnits.has(id) || !pairedUnits.has(id)) ||
      outcomeIds.some(
        (outcomeId) =>
          !unitIds.some((unitId) => unitsByOutcome.get(outcomeId)?.has(unitId)),
      ) ||
      !sourceRefIds ||
      !semanticSlotIds ||
      semanticSlotIds.some((id) => !allowedSlots.has(id)) ||
      !constraintIds ||
      constraintIds.some((id) => !allowedConstraints.has(id)) ||
      sourceContentHashes?.length !== sourceRefIds.length ||
      !exactHash(atom.semanticHash) ||
      atom.semanticHash !== expectedHash
    ) {
      issues.push(issueCode);
    } else {
      destination.set(atom.contentUnitId, atom);
      semanticIds.add(String(atom.semanticId));
      semanticHashes.add(String(atom.semanticHash));
    }
  };
  for (const atom of rawAtoms) {
    parseAtom(atom, targetAtoms, `${prefix}_target_content_invalid`);
  }
  if (rawEvaluatorAtoms.length > 64)
    issues.push(`${prefix}_evaluator_content_invalid`);
  for (const atom of rawEvaluatorAtoms) {
    parseAtom(atom, evaluatorAtoms, `${prefix}_evaluator_content_invalid`);
  }
  for (const scaffold of rawScaffolds) {
    const keys = [
      "contentUnitId",
      "semanticId",
      "purpose",
      "sourceLocale",
      "sourceText",
      "sourceRefIds",
      "semanticHash",
    ];
    const sourceRefIds = isRecord(scaffold)
      ? exactSortedTokenArray(scaffold.sourceRefIds, 1, 8)
      : null;
    const sourceContentHashes = sourceRefIds
      ?.map((id) => sources.get(id))
      .filter((hash): hash is string => Boolean(hash));
    const expectedHash =
      isRecord(scaffold) &&
      sourceRefIds &&
      sourceContentHashes?.length === sourceRefIds.length
        ? hashCanonicalBody(
            Object.freeze({
              schemaVersion: "v2-localizable-scaffolding-semantics.v1",
              contentUnitId: scaffold.contentUnitId,
              semanticId: scaffold.semanticId,
              purpose: scaffold.purpose,
              sourceLocale: scaffold.sourceLocale,
              sourceText: scaffold.sourceText,
              sourceContentHashes,
            }),
          )
        : null;
    if (
      !isRecord(scaffold) ||
      !exactKeys(scaffold, keys) ||
      !exactToken(scaffold.contentUnitId) ||
      scaffolds.has(scaffold.contentUnitId) ||
      targetAtoms.has(scaffold.contentUnitId) ||
      evaluatorAtoms.has(scaffold.contentUnitId) ||
      !exactToken(scaffold.semanticId) ||
      semanticIds.has(String(scaffold.semanticId)) ||
      semanticHashes.has(String(scaffold.semanticHash)) ||
      ![
        "instruction",
        "explanation",
        "accessibility",
        "repair",
        "fallback",
        "progress",
      ].includes(String(scaffold.purpose)) ||
      scaffold.sourceLocale !== targetLanguage ||
      !safeHumanText(scaffold.sourceText, 1, 1_000) ||
      !sourceRefIds ||
      sourceContentHashes?.length !== sourceRefIds.length ||
      !exactHash(scaffold.semanticHash) ||
      scaffold.semanticHash !== expectedHash
    ) {
      issues.push(`${prefix}_scaffolding_invalid`);
    } else {
      scaffolds.set(scaffold.contentUnitId, scaffold);
      semanticIds.add(String(scaffold.semanticId));
      semanticHashes.add(String(scaffold.semanticHash));
    }
  }
  const visibleTextFingerprints = [
    ...[...targetAtoms.values()].map((atom) => normalizedLeakText(atom.text)),
    ...[...scaffolds.values()].map((scaffold) =>
      normalizedLeakText(scaffold.sourceText),
    ),
  ].filter(Boolean);
  for (const evaluator of evaluatorAtoms.values()) {
    const hidden = normalizedLeakText(evaluator.text);
    if (
      hidden.length >= 3 &&
      visibleTextFingerprints.some(
        (visible) => visible === hidden || visible.includes(hidden),
      )
    ) {
      issues.push(`${prefix}_evaluator_content_leak`);
    }
  }
  const boundary = body.contentBoundary;
  const targetIds = isRecord(boundary)
    ? exactSortedTokenArray(boundary.targetLanguageOnlyContentUnitIds, 1, 96)
    : null;
  const scaffoldIds = isRecord(boundary)
    ? exactSortedTokenArray(
        boundary.localizableScaffoldingContentUnitIds,
        1,
        64,
      )
    : null;
  const visibleIds = isRecord(boundary)
    ? exactSortedTokenArray(boundary.learnerVisibleContentUnitIds, 2, 160)
    : null;
  const expectedVisible = sortedUnique([
    ...targetAtoms.keys(),
    ...scaffolds.keys(),
  ]);
  if (
    !isRecord(boundary) ||
    !exactKeys(boundary, [
      "requiredInterfaceLocales",
      "targetLanguageOnlyContentUnitIds",
      "localizableScaffoldingContentUnitIds",
      "learnerVisibleContentUnitIds",
    ]) ||
    !Array.isArray(boundary.requiredInterfaceLocales) ||
    canonicalJsonV1(boundary.requiredInterfaceLocales) !==
      canonicalJsonV1(V2_CANONICAL_INTERFACE_LOCALES) ||
    !targetIds ||
    canonicalJsonV1(targetIds) !==
      canonicalJsonV1(sortedUnique([...targetAtoms.keys()])) ||
    !scaffoldIds ||
    canonicalJsonV1(scaffoldIds) !==
      canonicalJsonV1(sortedUnique([...scaffolds.keys()])) ||
    !visibleIds ||
    canonicalJsonV1(visibleIds) !== canonicalJsonV1(expectedVisible)
  ) {
    issues.push(`${prefix}_content_boundary_invalid`);
  }
  return Object.freeze({
    issues: sortedUnique(issues),
    targetAtoms,
    evaluatorAtoms,
    scaffolds,
  });
}

export function referenceIdsResolve(
  value: unknown,
  allowed: ReadonlySet<string>,
  min = 1,
  max = 16,
): readonly string[] | null {
  const ids = exactSortedTokenArray(value, min, max);
  return ids && ids.every((id) => allowed.has(id)) ? ids : null;
}

export function speechProfileLocale(
  value: unknown,
  plan: V2CanonicalSeasonPlanV1,
): string | null {
  const profileRequirement = plan.stages
    .find((stage) => stage.kind === "v2_season_outline")
    ?.externalRequirements.find(
      (requirement) => requirement.dependencyType === "language_profile",
    );
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "profileId",
      "profileVersion",
      "profileContentHash",
      "targetLanguage",
      "speechLocale",
    ]) ||
    !profileRequirement ||
    profileRequirement.dependencyType !== "language_profile" ||
    value.profileId !== profileRequirement.profileId ||
    value.profileVersion !== profileRequirement.version ||
    value.profileContentHash !== profileRequirement.contentHash ||
    value.targetLanguage !== plan.targetLanguage ||
    typeof value.speechLocale !== "string" ||
    !BCP47_RE.test(value.speechLocale) ||
    !(
      value.speechLocale === plan.targetLanguage ||
      value.speechLocale.startsWith(`${plan.targetLanguage}-`)
    )
  )
    return null;
  return value.speechLocale;
}

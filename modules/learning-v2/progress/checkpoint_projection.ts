export interface CheckpointRequirement {
  readonly tupleKey: string;
  readonly targetKind: "semantic_slot" | "critical_constraint" | "objective";
  readonly targetId: string;
  readonly phase: "independent_probe";
  readonly assessmentNodeId: string;
  readonly objectiveId: string;
}

export type CheckpointObservation =
  | {
      readonly status: "assessed";
      readonly outcome: "success" | "needs_work";
      readonly ref: string;
      readonly assessmentNodeId?: string;
      readonly objectiveId?: string;
      readonly repairRouteDeclared?: boolean;
    }
  | {
      readonly status: "not_assessed";
      readonly reason: "outside_window" | "accessibility" | "system";
    }
  | { readonly status: "unobserved" };

export interface CheckpointProjection {
  readonly decision:
    | "passed"
    | "repair_required"
    | "not_assessed"
    | "incomplete";
  readonly complete: boolean;
  readonly entries: Readonly<Record<string, CheckpointObservation>>;
}

export interface CheckpointProjectionContract {
  readonly tupleKeys: readonly string[];
  readonly assessedObjectiveIds: readonly string[];
  readonly assessmentNodeIds: readonly string[];
  readonly criticalSemanticSlotTupleKeys: readonly string[];
  readonly criticalConstraintTupleKeys: readonly string[];
  readonly repairTupleKeys: readonly string[];
  readonly alternateTupleKeys: readonly string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const projectCheckpointEvidence = (
  requirements: readonly CheckpointRequirement[],
  observations: Readonly<Record<string, CheckpointObservation>>,
  contract: CheckpointProjectionContract,
): CheckpointProjection => {
  const expected = new Set(
    requirements.map((requirement) => requirement.tupleKey),
  );
  if (
    expected.size !== requirements.length ||
    Object.keys(observations).some((key) => !expected.has(key)) ||
    expected.size !== contract.tupleKeys.length ||
    contract.tupleKeys.some((key) => !expected.has(key))
  )
    throw new Error("checkpoint_tuple_mismatch");
  const nodeIds = new Set(
    requirements.map((requirement) => requirement.assessmentNodeId),
  );
  const objectiveIds = new Set(
    requirements.map((requirement) => requirement.objectiveId),
  );
  if (
    nodeIds.size !== contract.assessmentNodeIds.length ||
    contract.assessmentNodeIds.some((id) => !nodeIds.has(id)) ||
    objectiveIds.size !== contract.assessedObjectiveIds.length ||
    contract.assessedObjectiveIds.some((id) => !objectiveIds.has(id))
  )
    throw new Error("checkpoint_contract_set_mismatch");
  for (const requirement of requirements) {
    if (requirement.phase !== "independent_probe")
      throw new Error("checkpoint_phase_invalid");
    if (contract.criticalSemanticSlotTupleKeys.some((key) => !expected.has(key)) || contract.criticalConstraintTupleKeys.some((key) => !expected.has(key))) throw new Error("checkpoint_critical_tuple_missing");
  }
  const entries: Record<string, CheckpointObservation> = {};
  let needsWork = false;
  let notAssessed = false;
  for (const requirement of requirements) {
    const observation = observations[requirement.tupleKey] ?? {
      status: "unobserved" as const,
    };
    if (!isRecord(observation))
      throw new Error("checkpoint_observation_invalid");
    entries[requirement.tupleKey] = observation;
    if (
      observation.status === "assessed" &&
      observation.outcome === "needs_work"
    ) {
      if (
        !contract.repairTupleKeys?.includes(requirement.tupleKey) ||
        observation.repairRouteDeclared !== true
      )
        throw new Error("checkpoint_repair_route_missing");
      needsWork = true;
    }
    if (observation.status === "not_assessed") {
      if (!contract.alternateTupleKeys.includes(requirement.tupleKey)) throw new Error("checkpoint_alternate_route_missing");
      notAssessed = true;
    }
  }
  if (
    requirements.length > 0 &&
    requirements.every((requirement) => {
      const observation = entries[requirement.tupleKey];
      return (
        observation.status === "assessed" && observation.outcome === "success"
      );
    })
  ) {
    return { decision: "passed", complete: true, entries };
  }
  if (needsWork)
    return { decision: "repair_required", complete: false, entries };
  if (notAssessed)
    return { decision: "not_assessed", complete: false, entries };
  return { decision: "incomplete", complete: false, entries };
};

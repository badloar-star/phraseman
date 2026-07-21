"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectCheckpointEvidence = void 0;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const projectCheckpointEvidence = (requirements, observations, contract) => {
    const expected = new Set(requirements.map((requirement) => requirement.tupleKey));
    if (expected.size !== requirements.length ||
        Object.keys(observations).some((key) => !expected.has(key)) ||
        expected.size !== contract.tupleKeys.length ||
        contract.tupleKeys.some((key) => !expected.has(key)))
        throw new Error("checkpoint_tuple_mismatch");
    const nodeIds = new Set(requirements.map((requirement) => requirement.assessmentNodeId));
    const objectiveIds = new Set(requirements.map((requirement) => requirement.objectiveId));
    if (nodeIds.size !== contract.assessmentNodeIds.length ||
        contract.assessmentNodeIds.some((id) => !nodeIds.has(id)) ||
        objectiveIds.size !== contract.assessedObjectiveIds.length ||
        contract.assessedObjectiveIds.some((id) => !objectiveIds.has(id)))
        throw new Error("checkpoint_contract_set_mismatch");
    for (const requirement of requirements) {
        if (requirement.phase !== "independent_probe")
            throw new Error("checkpoint_phase_invalid");
        if (contract.criticalSemanticSlotTupleKeys.some((key) => !expected.has(key)) || contract.criticalConstraintTupleKeys.some((key) => !expected.has(key)))
            throw new Error("checkpoint_critical_tuple_missing");
    }
    const entries = {};
    let needsWork = false;
    let notAssessed = false;
    for (const requirement of requirements) {
        const observation = observations[requirement.tupleKey] ?? {
            status: "unobserved",
        };
        if (!isRecord(observation))
            throw new Error("checkpoint_observation_invalid");
        entries[requirement.tupleKey] = observation;
        if (observation.status === "assessed" &&
            observation.outcome === "needs_work") {
            if (!contract.repairTupleKeys?.includes(requirement.tupleKey) ||
                observation.repairRouteDeclared !== true)
                throw new Error("checkpoint_repair_route_missing");
            needsWork = true;
        }
        if (observation.status === "not_assessed") {
            if (!contract.alternateTupleKeys.includes(requirement.tupleKey))
                throw new Error("checkpoint_alternate_route_missing");
            notAssessed = true;
        }
    }
    if (requirements.length > 0 &&
        requirements.every((requirement) => {
            const observation = entries[requirement.tupleKey];
            return (observation.status === "assessed" && observation.outcome === "success");
        })) {
        return { decision: "passed", complete: true, entries };
    }
    if (needsWork)
        return { decision: "repair_required", complete: false, entries };
    if (notAssessed)
        return { decision: "not_assessed", complete: false, entries };
    return { decision: "incomplete", complete: false, entries };
};
exports.projectCheckpointEvidence = projectCheckpointEvidence;
//# sourceMappingURL=checkpoint_projection.js.map
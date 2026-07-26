/** Pure V2 performance/access-star and gate projections.
 *
 * Earned performance stars are the writable reward projection for a stable
 * slot. Access stars are derived one-for-one from the same positive delta;
 * neither is LearningEvidence or a mastery decision. Purchased access is
 * accepted only as a gate-scoped additive input.
 */

export interface BestPerformanceStarInput {
  readonly previous: number;
  readonly candidate: number;
  readonly source?: AccessStarSource;
}

export interface BestPerformanceStarProjection {
  readonly next: number;
  readonly performanceStarsDelta: number;
  readonly accessStarsEarnedDelta: number;
}

export type AccessStarSource = "performance" | "optional_practice" | "purchase";

export interface AccessStarDeltaInput {
  readonly previousTotal: number;
  readonly delta: number;
  readonly source: "optional_practice";
  /**
   * Deterministic, idempotency-ready operation identity for a later
   * account-scoped persistence boundary. This pure projection neither stores
   * the identity nor performs durable replay deduplication.
   */
  readonly idempotencyKey: string;
}

export interface AccessStarDeltaProjection {
  readonly nextTotal: number;
  readonly delta: number;
  readonly source: "optional_practice";
}

export interface GateInput {
  readonly alreadyUnlocked: boolean;
  readonly grandfathered: boolean;
  readonly requiredLoopsComplete: boolean;
  readonly capabilityFallbackComplete: boolean;
  readonly priorEpisodePerformanceEarned: number;
  readonly localMinimum: number;
  readonly cumulativeAccessEarned: number;
  readonly requiredCumulativeAccess: number;
  readonly purchasedAccessAppliedToThisGate: number;
  readonly checkpointDecision:
    | "not_required"
    | "passed"
    | "failed"
    | "incomplete"
    | "needs_work";
}

export type GateEvaluation =
  | {
      readonly allowed: true;
      readonly basis: "grandfathered" | "earned" | "earned_plus_boost";
    }
  | {
      readonly allowed: false;
      readonly reason:
        | "required_loops"
        | "capability_fallback"
        | "local_performance"
        | "checkpoint"
        | "cumulative_access";
    };

const isIntegerInRange = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

type FlatDataSnapshot =
  | { readonly ok: true; readonly values: Readonly<Record<string, unknown>> }
  | { readonly ok: false; readonly field?: PropertyKey };

const snapshotFlatDataProperties = (
  input: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): FlatDataSnapshot => {
  if (typeof input !== "object" || input === null) return { ok: false };

  let keys: readonly PropertyKey[];
  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      return { ok: false };
    }
    keys = Reflect.ownKeys(input);
  } catch {
    return { ok: false };
  }

  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  if (
    keys.some((key) => typeof key !== "string" || !allowedKeys.has(key)) ||
    requiredKeys.some((key) => !keys.includes(key))
  ) {
    return { ok: false };
  }

  const values: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const key of keys) {
    if (typeof key !== "string") return { ok: false, field: key };
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, key);
    } catch {
      return { ok: false, field: key };
    }
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value")
    ) {
      return { ok: false, field: key };
    }
    values[key] = descriptor.value;
  }
  return { ok: true, values };
};

const assertNonNegativeInteger = (value: number, code: string): void => {
  if (!Number.isInteger(value) || value < 0) throw new Error(code);
};

const assertGateInput = (input: GateInput): void => {
  assertNonNegativeInteger(
    input.priorEpisodePerformanceEarned,
    "gate_input_invalid",
  );
  assertNonNegativeInteger(input.localMinimum, "gate_input_invalid");
  assertNonNegativeInteger(input.cumulativeAccessEarned, "gate_input_invalid");
  assertNonNegativeInteger(
    input.requiredCumulativeAccess,
    "gate_input_invalid",
  );
  assertNonNegativeInteger(
    input.purchasedAccessAppliedToThisGate,
    "gate_input_invalid",
  );
  if (
    typeof input.alreadyUnlocked !== "boolean" ||
    typeof input.grandfathered !== "boolean"
  ) {
    throw new Error("gate_input_invalid");
  }
  if (typeof input.requiredLoopsComplete !== "boolean")
    throw new Error("gate_input_invalid");
  if (typeof input.capabilityFallbackComplete !== "boolean")
    throw new Error("gate_input_invalid");
  if (
    !["not_required", "passed", "failed", "incomplete", "needs_work"].includes(
      input.checkpointDecision,
    )
  ) {
    throw new Error("gate_input_invalid");
  }
};

export const applyBestPerformanceStars = (
  input: BestPerformanceStarInput,
): BestPerformanceStarProjection => {
  const snapshot = snapshotFlatDataProperties(
    input,
    ["previous", "candidate"],
    ["source"],
  );
  if (!snapshot.ok) {
    throw new Error(
      snapshot.field === "source"
        ? "performance_star_source_invalid"
        : "performance_stars_invalid",
    );
  }
  const previous = snapshot.values.previous;
  const candidate = snapshot.values.candidate;
  const source = snapshot.values.source;
  if (source !== undefined && source !== "performance") {
    throw new Error("performance_star_source_invalid");
  }
  if (
    typeof previous !== "number" ||
    typeof candidate !== "number" ||
    !isIntegerInRange(previous, 0, 3) ||
    !isIntegerInRange(candidate, 0, 3)
  ) {
    throw new Error("performance_stars_invalid");
  }
  const next = Math.max(previous, candidate);
  const delta = next - previous;
  return {
    next,
    performanceStarsDelta: delta,
    accessStarsEarnedDelta: delta,
  };
};

/**
 * Projects one deterministic optional-practice access delta without writing
 * performance or mastery. Purchase remains on its gate-scoped server path.
 */
export const applyAccessStarDelta = (
  input: AccessStarDeltaInput,
): AccessStarDeltaProjection => {
  const snapshot = snapshotFlatDataProperties(input, [
    "previousTotal",
    "delta",
    "source",
    "idempotencyKey",
  ]);
  if (!snapshot.ok) {
    throw new Error("access_star_operation_invalid");
  }
  const previousTotal = snapshot.values.previousTotal;
  const delta = snapshot.values.delta;
  const source = snapshot.values.source;
  const idempotencyKey = snapshot.values.idempotencyKey;
  if (
    typeof previousTotal !== "number" ||
    !Number.isSafeInteger(previousTotal) ||
    previousTotal < 0 ||
    typeof delta !== "number" ||
    !Number.isSafeInteger(delta) ||
    delta < 0 ||
    source !== "optional_practice" ||
    typeof idempotencyKey !== "string" ||
    idempotencyKey.trim().length === 0 ||
    idempotencyKey.length > 256
  ) {
    throw new Error("access_star_operation_invalid");
  }
  const nextTotal = previousTotal + delta;
  if (!Number.isSafeInteger(nextTotal)) {
    throw new Error("access_star_operation_invalid");
  }
  return { nextTotal, delta, source };
};

export const sumBestPerformanceStars = (
  bestBySlot: readonly number[],
): number => {
  if (
    bestBySlot.length > 8 ||
    bestBySlot.some((value) => !isIntegerInRange(value, 0, 3))
  ) {
    throw new Error("star_slots_invalid");
  }
  return bestBySlot.reduce((sum, value) => sum + value, 0);
};

export const cumulativeAccessRequirement = (targetEpisode: number): number => {
  if (
    !Number.isInteger(targetEpisode) ||
    targetEpisode < 2 ||
    targetEpisode > 32
  ) {
    throw new Error("gate_target_invalid");
  }
  const ratio = 0.55 + 0.1 * ((targetEpisode - 2) / 30);
  return Math.ceil(24 * (targetEpisode - 1) * ratio);
};

export const localPerformanceMinimum = (priorEpisode: number): number => {
  if (
    !Number.isInteger(priorEpisode) ||
    priorEpisode < 1 ||
    priorEpisode > 32
  ) {
    throw new Error("episode_target_invalid");
  }
  if (priorEpisode <= 8) return 14;
  if (priorEpisode <= 16) return 15;
  if (priorEpisode <= 24) return 16;
  return 17;
};

export const evaluateV2Gate = (input: GateInput): GateEvaluation => {
  assertGateInput(input);
  if (input.alreadyUnlocked || input.grandfathered) {
    return { allowed: true, basis: "grandfathered" };
  }
  if (!input.requiredLoopsComplete)
    return { allowed: false, reason: "required_loops" };
  if (!input.capabilityFallbackComplete)
    return { allowed: false, reason: "capability_fallback" };
  if (input.priorEpisodePerformanceEarned < input.localMinimum) {
    return { allowed: false, reason: "local_performance" };
  }
  if (
    input.checkpointDecision !== "not_required" &&
    input.checkpointDecision !== "passed"
  ) {
    return { allowed: false, reason: "checkpoint" };
  }
  const access =
    input.cumulativeAccessEarned + input.purchasedAccessAppliedToThisGate;
  if (access < input.requiredCumulativeAccess) {
    return { allowed: false, reason: "cumulative_access" };
  }
  return {
    allowed: true,
    basis:
      input.purchasedAccessAppliedToThisGate > 0
        ? "earned_plus_boost"
        : "earned",
  };
};

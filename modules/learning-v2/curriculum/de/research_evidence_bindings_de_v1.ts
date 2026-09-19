import {
  GERMAN_RESEARCH_AUTHORITY_V1,
  type GermanResearchClaim,
} from "./research_authority_de_v1";

export type GermanResearchEvidenceStatusDeV1 =
  | "DIRECT_SOURCE"
  | "DIRECT_L2_RU"
  | "DIRECT_L2_UK"
  | "DIRECT_SYSTEM"
  | "CONTRASTIVE_RISK";

export type GermanResearchEvidenceBindingDeV1 = Readonly<{
  id: string;
  status: GermanResearchEvidenceStatusDeV1;
  limitation: "NO_UNIVERSAL_LEARNER_PROFILE" | "NO_OWNER_DECISION_OR_BLUEPRINT_SEQUENCE";
}>;

function expectedStatus(id: string): GermanResearchEvidenceStatusDeV1 {
  if (/^DE-PHON-RU-\d{3}$/u.test(id)) return "DIRECT_L2_RU";
  if (id === "DE-PHON-UK-001") return "DIRECT_L2_UK";
  if (id === "DE-PHON-UK-002" || id === "DE-PHON-UK-004") return "CONTRASTIVE_RISK";
  if (id === "DE-PHON-UK-003") return "DIRECT_SYSTEM";
  return "DIRECT_SOURCE";
}

function expectedLimitation(id: string): GermanResearchEvidenceBindingDeV1["limitation"] {
  return id.startsWith("DE-PHON-")
    ? "NO_UNIVERSAL_LEARNER_PROFILE"
    : "NO_OWNER_DECISION_OR_BLUEPRINT_SEQUENCE";
}

export const GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1 = Object.freeze(
  GERMAN_RESEARCH_AUTHORITY_V1.map((claim) => Object.freeze({
    id: claim.id,
    status: expectedStatus(claim.id),
    limitation: expectedLimitation(claim.id),
  })),
) satisfies readonly GermanResearchEvidenceBindingDeV1[];

function assertPlainRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`plain_record_required:${label}`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`plain_record_required:${label}`);
  }
}

function assertClosedOwnKeys(record: Record<string, unknown>, keys: readonly string[], label: string): void {
  for (const key of Object.keys(record)) {
    if (!keys.includes(key)) throw new Error(`unknown_evidence_key:${label}:${key}`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new Error(`missing_evidence_key:${label}:${key}`);
  }
}

export function validateGermanResearchEvidenceBindingsDeV1(
  claims: readonly GermanResearchClaim[],
  bindings: unknown,
): asserts bindings is readonly GermanResearchEvidenceBindingDeV1[] {
  if (!Array.isArray(bindings)) throw new Error("evidence_bindings_array_required");
  const knownIds = new Set(claims.map((claim) => claim.id));
  const seenIds = new Set<string>();
  for (const candidate of bindings) {
    assertPlainRecord(candidate, "binding");
    assertClosedOwnKeys(candidate, ["id", "status", "limitation"], "binding");
    if (typeof candidate.id !== "string") throw new Error("evidence_id_string_required");
    if (!knownIds.has(candidate.id)) throw new Error(`unknown_evidence_id:${candidate.id}`);
    if (seenIds.has(candidate.id)) throw new Error(`duplicate_evidence_id:${candidate.id}`);
    seenIds.add(candidate.id);
    if (typeof candidate.limitation !== "string" || !candidate.limitation.trim()) {
      throw new Error(`missing_evidence_limitation:${candidate.id}`);
    }
    if (candidate.limitation !== expectedLimitation(candidate.id)) {
      throw new Error(`inconsistent_evidence_limitation:${candidate.id}`);
    }
    if (candidate.status !== expectedStatus(candidate.id)) {
      throw new Error(`inconsistent_evidence_status:${candidate.id}`);
    }
  }
  if (seenIds.size !== knownIds.size) throw new Error("evidence_binding_coverage_incomplete");
}

validateGermanResearchEvidenceBindingsDeV1(
  GERMAN_RESEARCH_AUTHORITY_V1,
  GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1,
);

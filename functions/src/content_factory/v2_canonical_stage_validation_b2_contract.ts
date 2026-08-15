import type {
  V2CanonicalSeasonPlanV1,
  V2CanonicalStageNode,
} from "./v2_canonical_generation_plan";

export type V2B2ProvenanceRef = Readonly<{
  provenanceType:
    | "authoring_revision"
    | "stage_artifact"
    | "published_template"
    | "language_profile"
    | "authoritative_source"
    | "decision_registry"
    | "generated_asset_receipt";
  provenanceId: string;
  objectPath: string;
  contentHash: string;
  objectGeneration: string;
  byteSize: number;
}>;

export type V2B2CandidateView = Readonly<{
  stageId: string;
  stageKind: V2CanonicalStageNode["kind"];
  bodySchemaVersion: string;
  bodyFingerprint: string;
  candidateFingerprint: string;
  body: unknown;
  provenanceRefs: readonly V2B2ProvenanceRef[];
}>;

export type V2B2BodyValidation = Readonly<{
  checked: readonly string[];
  issues: readonly string[];
  requiredHuman: readonly string[];
  requiredDevice: readonly string[];
  requiredListening: readonly string[];
}>;

export type V2B2ValidationInput = Readonly<{
  plan: V2CanonicalSeasonPlanV1;
  stage: V2CanonicalStageNode;
  candidate: V2B2CandidateView;
  episodeOutline: V2B2CandidateView | null;
}>;

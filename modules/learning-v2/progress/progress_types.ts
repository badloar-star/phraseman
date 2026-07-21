import type {
  LearningEvidenceRef,
  LearningNonAssessmentRef,
  LearningMaterializationRef,
} from "../contracts/evidence";
import type { CanonicalAttemptRef } from "../contracts/attempt";
import type { V2AttemptOutcome } from "../contracts/attempt";

export type PerformanceStars = 0 | 1 | 2 | 3;

export interface ProgressSlot {
  readonly episodeId: string;
  readonly starSlotId: string;
  readonly activityId: string;
  readonly progressCompatibilityKey: string;
  readonly bestPerformanceStars: PerformanceStars;
  readonly bestPerformanceAttemptRef?: CanonicalAttemptRef;
}

export interface NodeOutcome {
  readonly nodeId: string;
  readonly activityId: string;
  readonly progressCompatibilityKey: string;
  readonly bestAcceptedAttemptRef: CanonicalAttemptRef;
  readonly bestAcceptedOutcome: V2AttemptOutcome;
}

export interface LearningEvidenceIndexEntry {
  readonly bestAssessedEvidenceRef?: LearningEvidenceRef;
  readonly latestNonAssessmentRef?: LearningNonAssessmentRef;
}

export interface CheckpointEvidenceIndexEntry {
  readonly checkpointEpisodeId: string;
  readonly tupleKey: string;
  readonly state: "passed" | "repair_required" | "not_assessed" | "incomplete";
  readonly ref?: LearningMaterializationRef;
}

export interface ProgressSnapshot {
  readonly schemaVersion: "v2-progress.v1";
  readonly accountScopeHash: string;
  readonly seasonId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly enrolledPolicyVersion: number;
  readonly slots: Readonly<Record<string, ProgressSlot>>;
  readonly nodeOutcomes: Readonly<Record<string, NodeOutcome>>;
  readonly learningEvidenceIndex: Readonly<
    Record<string, LearningEvidenceIndexEntry>
  >;
  readonly checkpointEvidenceIndex: Readonly<
    Record<string, CheckpointEvidenceIndexEntry>
  >;
  readonly gateReceipts: Readonly<
    Record<
      string,
      { readonly unlockedAtMs: number; readonly releaseId: string }
    >
  >;
  readonly legacy?: Readonly<Record<string, unknown>>;
  readonly updatedAt: string;
}

export type ProgressEvidenceInput =
  | { readonly tupleKey: string; readonly assessedRef: LearningEvidenceRef }
  | {
      readonly tupleKey: string;
      readonly nonAssessmentRef: LearningNonAssessmentRef;
    };

export interface ProgressEventInput {
  readonly eventId: string;
  readonly starSlotId: string;
  readonly activityId?: string;
  readonly progressCompatibilityKey?: string;
  readonly candidateStars: number;
  readonly attemptRef?: CanonicalAttemptRef;
  readonly acceptedOutcome?: V2AttemptOutcome;
  readonly nodeId?: string;
  readonly learningEvidence?: ProgressEvidenceInput;
  readonly occurredAtMs?: number;
  readonly checkpointEvidence?: {
    readonly checkpointEpisodeId: string;
    readonly tupleKey: string;
    readonly state:
      | "passed"
      | "repair_required"
      | "not_assessed"
      | "incomplete";
    readonly ref?: LearningMaterializationRef;
  };
}

export interface ProgressReduction {
  readonly state: ProgressSnapshot;
  readonly delta: number;
  readonly accessStarsEarnedDelta: number;
  readonly changed: boolean;
  readonly attemptLedgerEntry: {
    readonly opId: string;
    readonly attemptBodyHash: string;
  };
}

export interface ProgressReducerContext {
  readonly expectedAccountScopeHash: string;
  readonly expectedSeasonId: string;
  readonly processedAttemptIndex: Readonly<Record<string, string>>;
  readonly slotCatalog: Readonly<
    Record<
      string,
      {
        readonly episodeId: string;
        readonly activityId: string;
        readonly progressCompatibilityKey: string;
      }
    >
  >;
  readonly validateAttemptRef: (ref: CanonicalAttemptRef) => boolean;
  readonly validateEvidenceRef: (
    tupleKey: string,
    ref: LearningMaterializationRef,
  ) => boolean;
  readonly evidenceBindings?: Readonly<
    Record<
      string,
      {
        readonly bodyHash: string;
        readonly sourceAttempt: CanonicalAttemptRef;
        readonly assessmentStatus?: "assessed" | "not_assessed";
        readonly outcome?: "success" | "needs_work";
      }
    >
  >;
  readonly checkpointContract: {
    readonly tupleKeys: readonly string[];
    readonly assessmentNodeIds: readonly string[];
    readonly assessedObjectiveIds: readonly string[];
    readonly criticalTupleKeys: readonly string[];
    readonly repairTupleKeys: readonly string[];
    readonly alternateTupleKeys: readonly string[];
  };
  readonly nodeCatalog?: Readonly<
    Record<
      string,
      { readonly activityId: string; readonly progressCompatibilityKey: string }
    >
  >;
  readonly requiredLoopNodeIds?: {
    readonly encounterBuild: readonly string[];
    readonly nearTransfer: readonly string[];
  };
  readonly declaredEvidenceTupleKeys?: readonly string[];
}

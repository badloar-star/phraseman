import type {
  PublishedModeTemplateRef,
  V2ActivityInstance,
  V2LocalizedContentValue,
  VersionedPolicyRef,
} from "./activity";
import type {
  ActivityId,
  EpisodeId,
  NodeId,
  SeasonId,
  SkillId,
} from "./identities";

export type LearningConstruct =
  | "semantic"
  | "listening"
  | "recall"
  | "spoken"
  | "interaction";
export type LearningEvidencePhase =
  | "encounter_build"
  | "near_transfer"
  | "independent_probe"
  | "delayed_probe";
export type V2GraphPhase =
  | Exclude<LearningEvidencePhase, "delayed_probe">
  | "optional_review";
export type LearningSupportLevel =
  | "model"
  | "full_text"
  | "partial_cue"
  | "visual_only"
  | "none";
export type LearningAssessmentTarget =
  | { readonly targetKind: "objective"; readonly targetId: string }
  | { readonly targetKind: "semantic_slot"; readonly targetId: string }
  | { readonly targetKind: "critical_constraint"; readonly targetId: string };

export interface V2NodeEvidenceDeclaration {
  readonly objectiveId: string;
  readonly skillId: SkillId;
  readonly construct: LearningConstruct;
  readonly phase: LearningEvidencePhase;
  readonly target: LearningAssessmentTarget;
}

interface LearningContextIdentity {
  readonly contextId: string;
  readonly surfaceFormId: string;
  readonly novelty: "trained" | "varied" | "novel";
}

export type LearningPedagogicalContextContract =
  | {
      readonly phase: "encounter_build" | "near_transfer";
      readonly allowedSupportLevels: readonly LearningSupportLevel[];
      readonly maximumHints: number;
      readonly answerExposure: "allowed" | "forbidden";
      readonly context: LearningContextIdentity;
      readonly prompt: {
        readonly promptId: string;
        readonly reusedFromTraining: boolean;
      };
    }
  | {
      readonly phase: "independent_probe";
      readonly allowedSupportLevels: readonly (
        | "partial_cue"
        | "visual_only"
        | "none"
      )[];
      readonly maximumHints: 0;
      readonly answerExposure: "forbidden";
      readonly context: LearningContextIdentity & {
        readonly novelty: "varied" | "novel";
      };
      readonly prompt: {
        readonly promptId: string;
        readonly reusedFromTraining: false;
        readonly separatePrompt: true;
      };
    }
  | {
      readonly phase: "delayed_probe";
      readonly allowedSupportLevels: readonly (
        | "partial_cue"
        | "visual_only"
        | "none"
      )[];
      readonly maximumHints: 0;
      readonly answerExposure: "forbidden";
      readonly context: LearningContextIdentity & {
        readonly novelty: "varied" | "novel";
        readonly newSurfaceForm: true;
      };
      readonly prompt: {
        readonly promptId: string;
        readonly reusedFromTraining: false;
        readonly separatePrompt: true;
      };
    };

export interface V2DelayedProbeRef {
  readonly probeId: string;
  readonly contentHash: string;
}

export interface V2SessionSetRef {
  readonly episodeId: EpisodeId;
  readonly version: number;
  readonly contentHash: string;
}

export interface V2DelayedProbeDefinitionBody {
  readonly schemaVersion: "v2-delayed-probe-definition.v1";
  readonly probeId: string;
  readonly targetEpisodeId: EpisodeId;
  readonly probeNodeId: string;
  readonly activityBinding: {
    readonly activityId: ActivityId;
    readonly progressCompatibilityKey: string;
    readonly templateRef: PublishedModeTemplateRef;
  };
  readonly evidenceDeclarations: readonly (V2NodeEvidenceDeclaration & {
    readonly phase: "delayed_probe";
  })[];
  readonly pedagogicalContextContract: Extract<
    LearningPedagogicalContextContract,
    { readonly phase: "delayed_probe" }
  >;
  readonly accessibilityAlternateActivityId?: ActivityId;
}

export interface V2ResolvedDelayedProbeDefinition {
  readonly ref: V2DelayedProbeRef;
  readonly body: V2DelayedProbeDefinitionBody;
}

export type V2LocalizedText = V2LocalizedContentValue;

export interface V2ScenarioContract {
  readonly scenarioId: string;
  readonly title: readonly V2LocalizedText[];
  readonly setting: readonly V2LocalizedText[];
  readonly learnerRole: readonly V2LocalizedText[];
  readonly partnerRole: readonly V2LocalizedText[];
  readonly communicativeGoal: readonly V2LocalizedText[];
  readonly successCondition: readonly V2LocalizedText[];
  readonly criticalConstraintIds: readonly string[];
}

export interface V2PhraseFrame {
  readonly phraseFrameId: string;
  readonly targetPattern: string;
  readonly learnerMeaning: readonly V2LocalizedText[];
  readonly semanticSlotIds: readonly string[];
  readonly skillIds: readonly SkillId[];
  readonly required: boolean;
}

export interface V2SemanticSlot {
  readonly semanticSlotId: string;
  readonly role: readonly V2LocalizedText[];
  readonly acceptedTargetValues: readonly string[];
  readonly allowedContentUnitIds: readonly string[];
  readonly minimumDistinctValues: number;
  readonly requiredInCapstone: boolean;
  readonly critical: boolean;
}

export interface V2CriticalConstraint {
  readonly criticalConstraintId: string;
  readonly description: string;
}

export type V2NodeFallback =
  | {
      readonly policy: "same_node";
      readonly alternateNodeId?: never;
      readonly reasonCodes: readonly (
        | "permission_denied"
        | "microphone_unavailable"
        | "speech_locale_unsupported"
        | "network_unavailable"
        | "accessibility_preference"
      )[];
      readonly coreCompletionEquivalent: boolean;
      readonly voiceEvidenceEquivalent: false;
    }
  | {
      readonly policy: "alternate_node";
      readonly alternateNodeId: NodeId;
      readonly reasonCodes: readonly (
        | "permission_denied"
        | "microphone_unavailable"
        | "speech_locale_unsupported"
        | "network_unavailable"
        | "accessibility_preference"
      )[];
      readonly coreCompletionEquivalent: boolean;
      readonly voiceEvidenceEquivalent: false;
    };

interface V2ActivityGraphNodeBase {
  readonly nodeId: NodeId;
  readonly activityId: ActivityId;
  readonly position: number;
  readonly visible: boolean;
  readonly requiredForCore: boolean;
  readonly voiceEvidenceOptional: boolean;
  readonly fallback?: V2NodeFallback;
  readonly transferFromNodeId?: NodeId;
  readonly variedSemanticSlotIds?: readonly string[];
}

type V2EvidenceGraphNode = {
  [Phase in Exclude<V2GraphPhase, "optional_review">]: {
    readonly phase: Phase;
    readonly evidenceDeclarations: readonly (V2NodeEvidenceDeclaration & {
      readonly phase: Phase;
    })[];
    readonly pedagogicalContextContract: Extract<
      LearningPedagogicalContextContract,
      { readonly phase: Phase }
    >;
  };
}[Exclude<V2GraphPhase, "optional_review">];

type V2GraphNodeAssessment =
  | V2EvidenceGraphNode
  | {
      readonly phase: "optional_review";
      readonly evidenceDeclarations: readonly [];
      readonly pedagogicalContextContract?: never;
    };

type V2GraphNodeReward =
  | {
      readonly gateEligible: true;
      readonly starSlotId: string;
      readonly maxStars: 3;
    }
  | {
      readonly gateEligible: false;
      readonly starSlotId?: never;
      readonly maxStars: 0;
    };

export type V2ActivityGraphNode = V2ActivityGraphNodeBase &
  V2GraphNodeAssessment &
  V2GraphNodeReward;

export interface V2ActivityGraphEdge {
  readonly edgeId: string;
  readonly fromNodeId: NodeId;
  readonly toNodeId: NodeId;
  readonly condition:
    | "completed"
    | "passed"
    | "needs_reinforcement"
    | "fallback_selected";
}

export interface V2ActivityGraph {
  readonly startNodeId: NodeId;
  readonly capstoneNodeId: NodeId;
  readonly nodes: readonly V2ActivityGraphNode[];
  readonly edges: readonly V2ActivityGraphEdge[];
}

export interface V2StarSlotDefinition {
  readonly starSlotId: string;
  readonly maxStars: 3;
  readonly acceptedNodeIds: readonly NodeId[];
}

export interface V2RequiredLoopDefinition {
  readonly encounterBuildNodeIds: readonly NodeId[];
  readonly nearTransferNodeIds: readonly NodeId[];
}

export interface V2AssessmentNodeDefinition {
  readonly independentProbeNodeIds: readonly NodeId[];
  readonly optionalReviewNodeIds: readonly NodeId[];
}

export interface V2CapstoneContract {
  readonly objectiveIds: readonly string[];
  readonly requiredSemanticSlotIds: readonly string[];
  readonly criticalConstraintIds: readonly string[];
  readonly primaryNodeIds: readonly NodeId[];
  readonly deterministicAlternateNodeIds: readonly NodeId[];
}

export interface V2EpisodeLearningDesign {
  readonly primaryOutcomeId: string;
  readonly objectiveIds: readonly string[];
  readonly prerequisiteEdges: readonly {
    readonly from: {
      readonly kind: "outcome" | "objective";
      readonly id: string;
      readonly sourceEpisodeId: EpisodeId;
    };
    readonly toObjectiveId: string;
    readonly requiredState:
      | "exposed"
      | "supported_success"
      | "independent_evidence";
  }[];
  readonly supportPlan: readonly {
    readonly objectiveId: string;
    readonly initialSupport: LearningSupportLevel;
    readonly fadeRuleId: string;
    readonly escalationRuleId: string;
  }[];
  readonly independentProbeRef: NodeId;
  readonly delayedProbeRef: V2DelayedProbeRef;
  readonly delayedWindowPolicyId: string;
}

export interface V2MasteryContract {
  readonly evidencePolicyRef: VersionedPolicyRef<"evidence">;
  readonly requirements: readonly {
    readonly objectiveId: string;
    readonly construct: LearningConstruct;
    readonly phase: "near_transfer" | "independent_probe" | "delayed_probe";
    readonly requiredValidity: "assessed";
    readonly requiredOutcome: "success";
    readonly maximumSupport: LearningSupportLevel;
  }[];
  readonly durableClaimRequiresDelayedProbe: true;
  readonly accessibilityHandling: "learning_non_assessment_no_failure";
  readonly numericCutoffHypothesisRef: "HYP-V2-003";
  readonly performanceStarsAreLearningEvidence: false;
  readonly confidentVoiceTurnCountAloneIsSufficient: false;
}

export type V2ReviewLink =
  | {
      readonly scheduleKind: "optional_review";
      readonly targetEpisodeId: EpisodeId;
      readonly delay: "next_episode" | "chapter_checkpoint";
      readonly probeRef?: never;
      readonly windowPolicyId?: never;
      readonly skillIds: readonly SkillId[];
    }
  | {
      readonly scheduleKind: "delayed_probe";
      readonly targetEpisodeId: EpisodeId;
      readonly delay: "d_plus_1" | "d_plus_7" | "d_plus_21";
      readonly probeRef: V2DelayedProbeRef;
      readonly windowPolicyId: string;
      readonly skillIds: readonly SkillId[];
    };

export interface V2AccessibilityRoute {
  readonly routeId: string;
  readonly routeKind: "primary" | "accessibility" | "capability_fallback";
  readonly nodeIds: readonly NodeId[];
  readonly reachableStarSlotIds: readonly string[];
  readonly completesRequiredLoops: boolean;
  readonly usesAccessBoost: false;
  readonly requiresNetwork: false;
  readonly requiresAi: false;
  readonly requiresVoiceSpecificStar: false;
  readonly measuredConstructs: readonly LearningConstruct[];
}

export interface V2CheckpointContract {
  readonly contractKind: "chapter_assessment";
  readonly coveredEpisodeIds: readonly EpisodeId[];
  readonly assessedObjectiveIds: readonly string[];
  readonly assessmentNodeIds: readonly NodeId[];
  readonly criticalSemanticSlotIds: readonly string[];
  readonly criticalConstraintIds: readonly string[];
  readonly evidenceRequirements: readonly {
    readonly assessmentNodeId: NodeId;
    readonly objectiveId: string;
    readonly skillId: SkillId;
    readonly construct: LearningConstruct;
    readonly phase: "independent_probe";
    readonly target: LearningAssessmentTarget;
    readonly requiredOutcome: "success";
  }[];
  readonly passPolicyKey: string;
  readonly deterministicAlternateRoutes: readonly {
    readonly primaryNodeId: NodeId;
    readonly alternateNodeId: NodeId;
    readonly assessedObjectiveIds: readonly string[];
    readonly evidenceTupleKeys: readonly string[];
    readonly aiIndependent: true;
    readonly voiceEvidenceEquivalent: false;
  }[];
  readonly criticalRepairRoutes: readonly {
    readonly target: Extract<
      LearningAssessmentTarget,
      { readonly targetKind: "semantic_slot" | "critical_constraint" }
    >;
    readonly repairNodeId: NodeId;
    readonly reassessmentNodeId: NodeId;
  }[];
}

export interface V2EpisodeContractV1 {
  readonly schemaVersion: "v2-episode-contract.v1";
  readonly episodeId: EpisodeId;
  readonly seasonId: SeasonId;
  readonly episodeKind: "ordinary" | "checkpoint";
  readonly ordinal: number;
  readonly chapterId: string;
  readonly estimatedMinutes: number;
  readonly title: readonly V2LocalizedText[];
  readonly canDoOutcome: readonly V2LocalizedText[];
  readonly scenario: V2ScenarioContract;
  readonly objectiveIds: readonly string[];
  readonly skillIds: readonly SkillId[];
  readonly phraseFrames: readonly V2PhraseFrame[];
  readonly semanticSlots: readonly V2SemanticSlot[];
  readonly criticalConstraints: readonly V2CriticalConstraint[];
  readonly grammarDistinctionIds: readonly string[];
  readonly soundFocusIds: readonly string[];
  readonly assetIds: readonly string[];
  readonly activities: readonly V2ActivityInstance[];
  readonly graph: V2ActivityGraph;
  readonly starSlots: readonly V2StarSlotDefinition[];
  readonly requiredLoops: V2RequiredLoopDefinition;
  readonly assessmentNodes: V2AssessmentNodeDefinition;
  readonly capstoneContract: V2CapstoneContract;
  readonly learningDesign: V2EpisodeLearningDesign;
  readonly masteryContract: V2MasteryContract;
  readonly delayedProbeDefinitions: readonly V2ResolvedDelayedProbeDefinition[];
  readonly reviewLinks: readonly V2ReviewLink[];
  readonly accessibilityRoutes: readonly V2AccessibilityRoute[];
  readonly checkpointContract?: V2CheckpointContract;
}

export interface V2EpisodeContractV2 extends Omit<
  V2EpisodeContractV1,
  "schemaVersion" | "estimatedMinutes"
> {
  readonly schemaVersion: "v2-episode-contract.v2";
  readonly estimatedMinutes: number;
  readonly sessionSetRef: V2SessionSetRef;
}

export type V2EpisodeContract = V2EpisodeContractV1 | V2EpisodeContractV2;

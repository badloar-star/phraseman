import type { ActivityId, SkillId } from "./identities";

export const V2_ACTIVITY_FAMILIES = Object.freeze([
  "visual_discovery",
  "listen_choose",
  "sound_contrast",
  "sound_syllable_lab",
  "scripted_repeat_compare",
  "phrase_builder",
  "listen_build_dictation",
  "context_gap_grammar",
  "quick_spoken_response",
  "shadowing_prosody",
  "describe_scene",
  "microstory_radio",
  "branching_scene",
  "scripted_dialogue",
  "speaking_club_mission",
  "personalized_review",
  "speed_match",
] as const);

export type V2ActivityFamily = (typeof V2_ACTIVITY_FAMILIES)[number];
export type V2PolicyKind =
  | "evidence"
  | "scoring"
  | "progress"
  | "reward"
  | "recovery";
export type V2ActivityEvidenceKind =
  | "semantic"
  | "listening"
  | "recall"
  | "spoken"
  | "interaction";
export type V2JsonPrimitive = null | boolean | number | string;
export type V2JsonValue =
  | V2JsonPrimitive
  | { readonly [key: string]: V2JsonValue }
  | readonly V2JsonValue[];

export interface V2LocalizedContentValue {
  readonly locale: string;
  readonly value: string;
  readonly sourceHash: string;
}

export interface PublishedModeTemplateRef {
  readonly templateId: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface VersionedPolicyRef<Kind extends V2PolicyKind = V2PolicyKind> {
  readonly kind: Kind;
  readonly key: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface V2RuntimePolicyRefs {
  readonly evidence: VersionedPolicyRef<"evidence">;
  readonly scoring: VersionedPolicyRef<"scoring">;
  readonly progress: VersionedPolicyRef<"progress">;
  readonly reward: VersionedPolicyRef<"reward">;
  readonly recovery: VersionedPolicyRef<"recovery">;
}

export type V2PolicyClaim =
  | "completion"
  | "accuracy"
  | "spoken_attempt"
  | "spoken_confident"
  | "acoustic_pronunciation"
  | "transfer";

/** Hash-free canonical policy artifact resolved by the runtime package validator. */
export interface V2PolicyDescriptorBody<
  Kind extends V2PolicyKind = V2PolicyKind,
> {
  readonly schemaVersion: "content-studio-policy-body.v1";
  readonly kind: Kind;
  readonly key: string;
  readonly version: number;
  readonly humanName: string;
  readonly description: string;
  readonly compatibleFamilies: readonly V2ActivityFamily[];
  readonly compatibleKernelKeys: readonly string[];
  readonly configurableFieldPaths: readonly string[];
  readonly evidenceKinds: readonly V2ActivityEvidenceKind[];
  readonly claims: readonly V2PolicyClaim[];
}

export interface V2ResolvedPolicyDescriptor<
  Kind extends V2PolicyKind = V2PolicyKind,
> {
  readonly ref: VersionedPolicyRef<Kind>;
  readonly body: V2PolicyDescriptorBody<Kind>;
}

export interface V2ActivityCapabilities {
  readonly microphone: "none" | "optional" | "required";
  readonly speechRecognition: "none" | "optional" | "required";
  readonly audioPlayback: boolean;
  readonly network: "none" | "preferred" | "required";
}

export interface V2ActivityRequirements {
  readonly prompt: readonly string[];
  readonly media: readonly string[];
  readonly input: readonly string[];
  readonly fallback: {
    readonly deterministicScripted: boolean;
    readonly offline: "full" | "cached_assets_only" | "not_supported";
    readonly nonVoiceCoreEquivalent: boolean;
  };
}

export interface V2ActivityTargets {
  readonly skillIds: readonly SkillId[];
  readonly phraseFrameIds: readonly string[];
  readonly semanticSlotIds: readonly string[];
}

export interface V2ActivityInstance<Payload extends V2JsonValue = V2JsonValue> {
  readonly activityId: ActivityId;
  readonly progressCompatibilityKey: string;
  readonly family: V2ActivityFamily;
  readonly activityTypeKey: string;
  readonly kernelVersion: number;
  readonly templateRef: PublishedModeTemplateRef;
  readonly payloadSchemaVersion: number;
  readonly estimatedSeconds: number;
  readonly contentUnitIds: readonly string[];
  readonly assetIds: readonly string[];
  readonly capabilities: V2ActivityCapabilities;
  readonly requirements: V2ActivityRequirements;
  readonly targets: V2ActivityTargets;
  readonly tags: {
    readonly skillIds: readonly SkillId[];
    readonly grammar: readonly string[];
    readonly vocabulary: readonly string[];
    readonly scenario: readonly string[];
    readonly modalities: readonly (
      | "reading"
      | "listening"
      | "writing"
      | "speaking"
    )[];
  };
  readonly payload: Payload;
}

export interface V2VersionRef {
  readonly id: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface SpeechCalibrationReceiptRef {
  readonly receiptId: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface VoiceDataPolicyRef {
  readonly policyId: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface VoiceNetworkEgressRef {
  readonly gatewayId: "voice-network-egress";
  readonly version: number;
  readonly contentHash: string;
}

export type V2VoiceReleaseRequirements =
  | {
      readonly allowedTaskTypes: readonly ("scripted" | "spontaneous")[];
      readonly processingMode: "on_device_only";
      readonly calibrationReceiptRef?: SpeechCalibrationReceiptRef;
      readonly voiceDataPolicyRef?: never;
      readonly activePolicyRegistryKey?: never;
      readonly requiredNetworkPurposes?: never;
      readonly networkEgressRef?: never;
    }
  | {
      readonly allowedTaskTypes: readonly ("scripted" | "spontaneous")[];
      readonly processingMode: "network_allowed" | "network_required";
      readonly calibrationReceiptRef?: SpeechCalibrationReceiptRef;
      readonly voiceDataPolicyRef: VoiceDataPolicyRef;
      readonly activePolicyRegistryKey: string;
      readonly requiredNetworkPurposes: readonly (
        | "recognition"
        | "speech_scoring"
        | "club_reply"
        | "safety_review"
      )[];
      readonly networkEgressRef: VoiceNetworkEgressRef;
    };

/** The only canonical hash domain for an immutable published ModeTemplate. */
export interface ModeTemplateArtifactBody {
  readonly schemaVersion: "v2-mode-template-body.v1";
  readonly templateId: string;
  readonly version: number;
  readonly family: V2ActivityFamily;
  readonly humanName: string;
  readonly description: string;
  readonly pedagogicalPurpose: {
    readonly phase:
      | "discover"
      | "comprehend"
      | "controlled_production"
      | "guided_transfer"
      | "free_transfer"
      | "review"
      | "checkpoint";
    readonly primarySkillIds: readonly SkillId[];
    readonly modalities: readonly (
      | "reading"
      | "listening"
      | "writing"
      | "speaking"
    )[];
    readonly estimatedSeconds: number;
  };
  readonly kernel: {
    readonly activityTypeKey: string;
    readonly kernelVersion: number;
    readonly rendererKey: string;
    readonly rendererSchemaVersion: number;
    readonly payloadSchemaKey: string;
    readonly payloadSchemaVersion: number;
    readonly payloadSchemaHash: string;
  };
  readonly policies: V2RuntimePolicyRefs;
  readonly authoring: {
    readonly editableFieldPaths: readonly string[];
    readonly requiredFieldPaths: readonly string[];
    readonly defaultValues: Readonly<Record<string, V2JsonValue>>;
    readonly allowedOverridePaths: readonly string[];
  };
  readonly capabilityContract: V2ActivityCapabilities & {
    readonly fallbackTemplateRef?: PublishedModeTemplateRef;
  };
  readonly evidenceClaims: readonly V2PolicyClaim[];
  readonly learnerCopy: {
    readonly instruction: readonly V2LocalizedContentValue[];
    readonly primaryAction: readonly V2LocalizedContentValue[];
    readonly retryAction: readonly V2LocalizedContentValue[];
    readonly successMessage: readonly V2LocalizedContentValue[];
    readonly needsWorkMessage: readonly V2LocalizedContentValue[];
    readonly recoveryMessage: readonly V2LocalizedContentValue[];
  };
  readonly fixtures: readonly {
    readonly fixtureId: string;
    readonly label: string;
    readonly state:
      | "prompt"
      | "active"
      | "processing"
      | "success"
      | "needs_work"
      | "recovery";
    readonly payload: V2JsonValue;
    readonly expectedResultKind?: string;
  }[];
  readonly compatibility: {
    readonly minAppVersion: string;
    readonly requiredSupportManifestHashes: readonly string[];
    readonly progressCompatibilityNamespace: string;
  };
  readonly learningContractRefs: {
    readonly learningEvidenceContractRef: V2VersionRef;
    readonly prerequisiteGraphRef: V2VersionRef;
    readonly supportFadePolicyRef: V2VersionRef;
  };
  readonly voiceReleaseRequirements?: V2VoiceReleaseRequirements;
}

/** Mutable server-owned lifecycle projection for one immutable template version. */
export interface ModeTemplateLifecycleHead {
  readonly schemaVersion: "v2-mode-template-lifecycle.v1";
  readonly templateId: string;
  readonly version: number;
  readonly contentHash: string;
  readonly status: "approved" | "published" | "deprecated" | "archived";
  readonly reason: string;
  readonly replacementRef?: PublishedModeTemplateRef;
  readonly noReplacement?: true;
  readonly changedBy: string;
  readonly changedAt: string;
  readonly lifecycleRevision: number;
}

export interface V2ResolvedModeTemplate {
  readonly templateRef: PublishedModeTemplateRef;
  readonly body: ModeTemplateArtifactBody;
}

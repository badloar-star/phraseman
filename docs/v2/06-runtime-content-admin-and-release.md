# Phraseman V2: runtime, схемы контента, админ-генератор и релизы

> **Owner override 2026-08-25:** learner release обязан нести versioned
> family-native payload семи approved modes и доказательство exact 1:1 parity
> с owner HTML. Generic projection по `family + inputMode + responseOptions`
> недостаточна. Полный нормативный контракт:
> [`MODE_NATIVE_AUTHORING_CONTRACT.ru.md`](./MODE_NATIVE_AUTHORING_CONTRACT.ru.md).

**Статус:** нормативная техническая спецификация пилота из 32 эпизодов  
**Область:** activity engine, episode graph, evidence/result contracts, delivery/cache, immutable release, admin generation, adapters и масштабирование языков

## 1. Архитектурное решение

V2 строится как новый модульный activity engine поверх существующих проверенных экранов и данных. Это не полная перепись приложения и не ещё один изолированный режим. Legacy-экраны подключаются через adapters, а новые режимы используют те же контракты. Персональный план становится scheduler над этим engine, Speaking Club — transfer/capstone, диалоги — одним из activity families.

Основной поток:

```text
approved immutable content release
  → release loader + hash verification
  → episode graph
  → activity registry
  → shared renderer shells
  → evidence/scoring policy
  → account-scoped progress
  → gates + personal review
```

Нормативные принципы:

1. Контент хранит только данные и versioned keys; executable renderer/scorer живёт в приложении.
2. Новый activity kernel считается существующим только при наличии versioned `activityTypeKey`, schema, validator, renderer, scoring/evidence policy, progress policy, recovery policy и fixtures.
3. Неизвестный `activityTypeKey`, kernel/template/payload schema или template hash блокирует активацию релиза и fail-closed на клиенте.
4. Episode graph — DAG со стабильными IDs, а не набор `if lessonId === ...` в экране.
5. `progressCompatibilityKey` отделён от `contentHash`.
6. Активность не пишет AsyncStorage, shards, XP или navigation напрямую; она возвращает нормализованный result engine.
7. Remote content всегда имеет last-known-good и bundled fallback.
8. Release меняется только между activity sessions, не посреди записи/ответа.
9. Большой generated content не импортируется статически в screen/top-level module.
10. Первый production slice — один полный episode 1 `en ← ru`; массовое создание 32 начинается после его проверки.

## 2. Activity catalog и registry

### 2.1 Каноническая taxonomy

Пять уровней нельзя смешивать в одном поле `type`:

| Уровень | Ответственность | Кто создаёт |
|---|---|---|
| `V2ActivityFamily` | Педагогическая роль в curriculum и аналитике | learning design |
| `activityTypeKey` / kernel | Исполняемая механика, renderer и допустимые evidence/scoring contracts | разработчик приложения |
| `ModeTemplate` | Безопасная конфигурация kernel, доступная для повторного использования | администратор в Content Studio |
| `ActivityInstance` | Конкретный prompt/content payload конкретного эпизода | генератор или администратор |
| `V2ActivityGraphNode` | Размещение instance в DAG: обязательность, route, learning phase и stars | Episode Builder |

`family` не выбирает React-компонент. `activityTypeKey` не содержит учебный контент. `ModeTemplate` не содержит исполняемый код. `ActivityInstance` не определяет своё положение в графе. `nodeId` и `activityId` имеют разные пространства идентичности и никогда не взаимозаменяются.

### 2.2 Семейства пилота

```ts
export type V2ActivityFamily =
  | 'visual_discovery'
  | 'listen_choose'
  | 'sound_contrast'
  | 'sound_syllable_lab'
  | 'scripted_repeat_compare'
  | 'phrase_builder'
  | 'listen_build_dictation'
  | 'context_gap_grammar'
  | 'quick_spoken_response'
  | 'shadowing_prosody'
  | 'describe_scene'
  | 'microstory_radio'
  | 'branching_scene'
  | 'scripted_dialogue'
  | 'speaking_club_mission'
  | 'personalized_review'
  | 'speed_match';
```

Это семнадцать activity families. Checkpoint не является восемнадцатой family: это assessment contract над обычными graph nodes. Обычный эпизод использует 8–9 nodes и ровно восемь gate-eligible star slots. Checkpoint episodes 8, 16, 24 и 32 содержат девять видимых nodes; briefing/transition может не иметь звёзд.

### 2.3 Kernel, template и activity instance

```ts
export type RuntimeCapability =
  | 'microphone'
  | 'speech_recognition'
  | 'audio_playback'
  | 'network'
  | 'image_rendering';

export type ActivityTypeKey = string;

export interface PublishedModeTemplateRef {
  templateId: string;
  version: number;
  contentHash: string;
}

export type V2PolicyKind =
  | 'evidence'
  | 'scoring'
  | 'progress'
  | 'reward'
  | 'recovery';

export interface VersionedPolicyRef<TKind extends V2PolicyKind = V2PolicyKind> {
  kind: TKind;
  key: string;
  version: number;
  contentHash: string;
}

export interface V2RuntimePolicyRefs {
  evidence: VersionedPolicyRef<'evidence'>;
  scoring: VersionedPolicyRef<'scoring'>;
  progress: VersionedPolicyRef<'progress'>;
  reward: VersionedPolicyRef<'reward'>;
  recovery: VersionedPolicyRef<'recovery'>;
}

export interface PublishedModeTemplate<TConfig = unknown> {
  schemaVersion: 'v2-mode-template.v1';
  templateId: string;
  version: number;
  contentHash: string;
  family: V2ActivityFamily;
  activityTypeKey: ActivityTypeKey;
  kernelVersion: number;
  templateSchemaVersion: number;
  payloadSchemaVersion: number;
  config: TConfig;
  policies: V2RuntimePolicyRefs;
  voiceReleaseRequirements?: VoiceReleaseRequirements;
  minAppVersion: string;
  compatibleKernelVersions: number[];
}

export interface V2ActivityInstance<TPayload = unknown> {
  activityId: string;
  progressCompatibilityKey: string;
  family: V2ActivityFamily;
  activityTypeKey: ActivityTypeKey;
  kernelVersion: number;
  templateRef: PublishedModeTemplateRef;

  payloadSchemaVersion: number;
  estimatedSeconds: number;
  contentUnitIds: string[];

  capabilities: {
    microphone: 'none' | 'optional' | 'required';
    speechRecognition: 'none' | 'optional' | 'required';
    audioPlayback: boolean;
    network: 'none' | 'preferred' | 'required';
  };

  tags: {
    skillIds: string[];
    grammar: string[];
    vocabulary: string[];
    scenario: string[];
    modalities: Array<'reading' | 'listening' | 'writing' | 'speaking'>;
  };

  payload: TPayload;
}
```

`ModeTemplate` создаётся в админке только из kernel catalog и безопасных versioned policy catalogs. `PublishedModeTemplate` выше — resolved runtime read model, а не canonical hash body: его identity/version/`contentHash` присоединяются после разрешения immutable artifact record. Канонический hash считается только как `sha256(canonicalJsonV1(ModeTemplateArtifactBody))` из документа 08; сам `ModeTemplateArtifactBody` не содержит hash, record/ref, object metadata или lifecycle. Хешировать полный `PublishedModeTemplate` запрещено. Client принимает instance только если resolved template hash совпадает, kernel/template/payload schema совместимы, `minAppVersion` соблюдён, а family и exact version/hash refs всех пяти policies разрешены registry entry. Voice template дополнительно fail-closed проверяет `voiceReleaseRequirements`.

`activityId` — стабильная идентичность конкретного упражнения и его content payload. `progressCompatibilityKey` отвечает за перенос результата между совместимыми revisions. Порядок, prerequisite, learning phase, обязательность и stars принадлежат graph node, а не instance.

### 2.4 Graph node

```ts
// LearningConstruct, LearningEvidencePhase, LearningAssessmentTarget and
// LearningPedagogicalContextContract and LearningPedagogicalProvenance are
// canonical imports from document 05; this file does not redefine them.
export interface V2NodeEvidenceDeclaration {
  objectiveId: string;
  skillId: string;
  construct: LearningConstruct;
  phase: LearningEvidencePhase;
  target: LearningAssessmentTarget;
}

export interface V2DelayedProbeRef {
  probeId: string;
  contentHash: string;
}

// Hash-free nested body. Its ref hash is computed before it is embedded in an
// EpisodeRevision; the enclosing EpisodeRevision/Season pins the exact body.
export interface V2DelayedProbeDefinitionBody {
  schemaVersion: 'v2-delayed-probe-definition.v1';
  probeId: string;
  targetEpisodeId: string;
  probeNodeId: string;
  activityBinding: {
    activityId: string;
    progressCompatibilityKey: string;
    templateRef: PublishedModeTemplateRef;
  };
  evidenceDeclarations: Array<
    V2NodeEvidenceDeclaration & { phase: 'delayed_probe' }
  >;
  pedagogicalContextContract: Extract<
    LearningPedagogicalContextContract,
    { phase: 'delayed_probe' }
  >;
  accessibilityAlternateActivityId?: string;
}

export interface V2ResolvedDelayedProbeDefinition {
  ref: V2DelayedProbeRef;
  body: V2DelayedProbeDefinitionBody;
}

type V2ActivityGraphNodeBase = {
  nodeId: string;
  activityId: string;
  position: number;
  visible: boolean;
  requiredForCore: boolean;
  voiceEvidenceOptional: boolean;
  fallback?: {
    policy: 'same_node' | 'alternate_node';
    alternateNodeId?: string;
    reasonCodes: Array<
      | 'permission_denied'
      | 'microphone_unavailable'
      | 'speech_locale_unsupported'
      | 'network_unavailable'
      | 'accessibility_preference'
    >;
    coreCompletionEquivalent: boolean;
    voiceEvidenceEquivalent: false;
  };
};

type V2GraphEvidencePhase =
  | 'encounter_build'
  | 'near_transfer'
  | 'independent_probe';

type V2EvidenceGraphNode = {
  [P in V2GraphEvidencePhase]: {
    phase: P;
    evidenceDeclarations: Array<V2NodeEvidenceDeclaration & { phase: P }>;
    pedagogicalContextContract: Extract<
      LearningPedagogicalContextContract,
      { phase: P }
    >;
  };
}[V2GraphEvidencePhase];

export type V2ActivityGraphNode = V2ActivityGraphNodeBase &
  (
    | V2EvidenceGraphNode
    | {
        phase: 'optional_review';
        evidenceDeclarations: [];
        pedagogicalContextContract?: never;
      }
  ) & (
  | { gateEligible: true; starSlotId: string; maxStars: 3 }
  | { gateEligible: false; starSlotId?: never; maxStars: 0 }
);
```

`requiredForCore` означает, что без завершения node либо её объявленной equivalent alternate route эпизод не завершён. `voiceEvidenceOptional` относится только к core-completion: при `true` deterministic non-voice alternate может завершить node, но не выдаёт voice evidence. При `false` voice evidence требуется для этого evidence requirement; такая node не может быть единственным путём core completion без отдельной доступной alternate route.

Starless briefing/transition/recovery node имеет `starSlotId` отсутствующим, `maxStars: 0` и `gateEligible: false`. Gate-eligible node обязана иметь `starSlotId`, `maxStars: 3`; primary и fallback nodes используют один slot, поэтому попытки не складываются.

### 2.5 Registry entry

```ts
export interface ActivityRegistryEntry<TPayload, TSubmission> {
  activityTypeKey: ActivityTypeKey;
  kernelVersion: number;
  supportedTemplateSchemaVersions: readonly number[];
  supportedPayloadSchemaVersions: readonly number[];

  validatePayload(value: unknown): value is TPayload;
  validateTemplate(value: unknown): value is PublishedModeTemplate;
  render: React.ComponentType<ActivityRendererProps<TPayload>>;

  evaluate(input: {
    instance: V2ActivityInstance<TPayload>;
    template: PublishedModeTemplate;
    submission: TSubmission;
    evidence: V2Evidence;
  }): V2ActivityResult;

  sanitizeAttemptBody(input: {
    instance: V2ActivityInstance<TPayload>;
    template: PublishedModeTemplate;
    submission: TSubmission;
    evidence: V2Evidence;
    result: V2ActivityResult;
    attemptContext: Omit<
      V2AttemptEventBodyBase,
      'schemaVersion' | 'attemptSurface'
    >;
    attemptSurface: V2AttemptEventBodyBase['attemptSurface'];
    declarations: V2NodeEvidenceDeclaration[];
    pedagogicalContextContract?: LearningPedagogicalContextContract;
  }): V2AttemptEventBody;
  buildRecoveryCandidates(body: V2AttemptEventBody): RecoveryCandidate[];

  migratePayload?(
    fromVersion: number,
    value: unknown,
  ): { version: number; payload: TPayload };
}
```

`sanitizeAttemptBody` принимает только ephemeral renderer/evaluator input и возвращает hash-free `V2AttemptEventBody`. Он никогда не принимает и не возвращает `V2AttemptEvent` envelope, `CanonicalAttemptRef` или learning refs: эти сущности появляются строго после canonicalization/hash body. Raw audio/transcript/free text могут существовать во входном `submission/evidence` только до sanitizer boundary и обязаны отсутствовать в его результате.

Registry invariant:

```text
content schema
  → payload validator
  → renderer
  → evidence adapter
  → scoring policy
  → progress reducer
  → reward policy
  → telemetry schema
  → fixtures/tests
```

Если отсутствует хотя бы одно звено, kernel нельзя выбрать в Mode Library и нельзя включить в release. Published template не может переопределить renderer, вызвать сеть, добавить JavaScript/CSS или изменить reward economics вне разрешённых catalogs.

### 2.6 Legacy adapters

Первые registry entries могут оборачивать существующие реализации:

| Adapter key | Текущий источник |
|---|---|
| `legacy.phrase_builder.v1` | lesson phrase builder |
| `legacy.theory.v1` | theory screen |
| `legacy.vocabulary.v1` | vocabulary flow |
| `legacy.irregular_verbs.v1` | irregular verbs |
| `legacy.prepositions.v1` | preposition drills |
| `plan.phrase_build.v1` | personal-plan renderer |
| `plan.missing_word.v1` | personal-plan renderer |
| `plan.listen_choose.v1` | personal-plan renderer |
| `plan.listen_build.v1` | personal-plan renderer |
| `voice.repeat_compare.v1` | SpeakingPanel/plan pronunciation logic |
| `club.mission.v1` | Speaking Club session |
| `dialog.ai.v1` | AI dialog |

Adapter получает content payload и callbacks engine, но не может сам начислять V2 stars или shards. Он преобразует свой внутренний исход в `V2ActivityResult`.

## 3. Evidence и result contracts

### 3.1 Evidence envelope

```ts
export type EvidenceKind =
  | 'objective_answer'
  | 'sequence_answer'
  | 'typed_recall'
  | 'listening_discrimination'
  | 'voice_transcript_match'
  | 'acoustic_pronunciation'
  | 'dialogue_objectives'
  | 'self_check'
  | 'accessibility_alternative'
  | 'system_unavailable';

export type V2VoiceResultCode =
  | 'PASS_CONFIDENT'
  | 'NEEDS_WORK_CONFIDENT'
  | 'UNCERTAIN'
  | 'INVALID_AUDIO_OR_SYSTEM';

export type V2SpeechConstruct =
  | 'intelligibility'
  | 'sound_contrast'
  | 'word_stress'
  | 'rhythm'
  | 'intonation'
  | 'fluency'
  | 'formulaic_recall'
  | 'communicative_objective';

interface VoiceTaskSpecBase {
  schemaVersion: 'v2-voice-task.v1';
  speechLocale: string;
  learningConstructs: V2SpeechConstruct[];
  objectiveIds: string[];
}

export type VoiceTaskSpec =
  | (VoiceTaskSpecBase & {
      taskType: 'scripted';
      referenceText: string;
      acceptedSpokenVariants: string[];
      semanticVariantIds?: never;
      transcriptConfirmation: 'not_required';
    })
  | (VoiceTaskSpecBase & {
      taskType: 'spontaneous';
      referenceText?: never;
      acceptedSpokenVariants?: never;
      semanticVariantIds: string[];
      transcriptConfirmation: 'required';
    });

export type TranscriptOrigin = 'asr_raw' | 'learner_edited' | 'typed';

export type V2TranscriptEvidence =
  | {
      transcriptOrigin: 'asr_raw';
      semanticObjectiveIdsMet: string[];
      spokenConfidenceEligible: boolean;
      transcriptMatchEligible: boolean;
      acousticEvidenceEligible: false;
    }
  | {
      transcriptOrigin: 'learner_edited';
      semanticObjectiveIdsMet: string[];
      spokenConfidenceEligible: false;
      transcriptMatchEligible: false;
      acousticEvidenceEligible: false;
    }
  | {
      transcriptOrigin: 'typed';
      semanticObjectiveIdsMet: string[];
      spokenConfidenceEligible: false;
      transcriptMatchEligible: false;
      acousticEvidenceEligible: false;
    };

export type V2CaptureValidityReasonCode =
  | 'permission_denied'
  | 'microphone_unavailable'
  | 'no_speech'
  | 'too_short'
  | 'clipping'
  | 'excessive_noise'
  | 'multiple_speakers'
  | 'interrupted'
  | 'audio_route_changed'
  | 'unsupported_capture_format';

export type V2CaptureValidity =
  | {
      status: 'valid';
      reasonCodes: [];
      inputRoute: string;
      capturePipelineVersion: string;
      durationMs: number;
      signalQualityBand: 'high' | 'medium' | 'low' | 'unknown';
    }
  | {
      status: 'invalid';
      reasonCodes: [V2CaptureValidityReasonCode, ...V2CaptureValidityReasonCode[]];
      inputRoute: string;
      capturePipelineVersion: string;
      durationMs: number;
      signalQualityBand: 'low' | 'unknown';
    };

export interface V2RecognitionEvidence {
  status: 'valid' | 'uncertain' | 'unsupported' | 'not_run';
  confidenceBand: 'high' | 'medium' | 'low' | 'unknown';
  coverageBand: 'complete' | 'partial' | 'none' | 'unknown';
  referenceAlignmentBand?: 'high' | 'medium' | 'low' | 'unknown';
  reasonCodes: string[];
}

export interface V2SpeechFeatureObservation {
  construct: V2SpeechConstruct;
  targetId?: string;
  evidenceBand: 'meets_target' | 'needs_work' | 'uncertain';
  feedbackCode?: string;
}

export interface V2SpeechFeatureEvidence {
  status: 'valid' | 'uncertain' | 'unsupported' | 'not_run' | 'not_required' | 'not_eligible';
  observations: V2SpeechFeatureObservation[];
  reasonCodes: string[];
}

// ID-only assessment atoms: no raw answer, slot value, phrase or transcript.
export interface V2SemanticSlotOutcome {
  semanticSlotId: string;
  outcome: 'met' | 'missed';
}

export interface V2CriticalConstraintOutcome {
  criticalConstraintId: string;
  outcome: 'met' | 'missed';
}

export type V2VoicePedagogicalDecision =
  | {
      resultCode: 'PASS_CONFIDENT';
      objectiveIdsMet: string[];
      criticalObjectiveIdsMissed: string[];
      semanticSlotOutcomes: V2SemanticSlotOutcome[];
      criticalConstraintOutcomes: V2CriticalConstraintOutcome[];
      feedbackCodes: string[];
    }
  | {
      resultCode: 'NEEDS_WORK_CONFIDENT';
      objectiveIdsMet: string[];
      criticalObjectiveIdsMissed: string[];
      semanticSlotOutcomes: V2SemanticSlotOutcome[];
      criticalConstraintOutcomes: V2CriticalConstraintOutcome[];
      feedbackCodes: string[];
    }
  | {
      resultCode: 'UNCERTAIN' | 'INVALID_AUDIO_OR_SYSTEM';
      objectiveIdsMet: [];
      criticalObjectiveIdsMissed: [];
      semanticSlotOutcomes: [];
      criticalConstraintOutcomes: [];
      feedbackCodes: [];
    };

export type V2VoiceRewardDecision =
  | {
      decision: 'eligible_pass_confident';
      candidatePerformanceStars: 0 | 1 | 2 | 3;
      rewardEligible: boolean;
      reasonCode: 'pass_confident_voice_evidence';
    }
  | {
      decision: 'eligible_needs_work_confident';
      candidatePerformanceStars: 0 | 1;
      rewardEligible: boolean;
      reasonCode: 'needs_work_completion_only';
    }
  | {
      decision: 'ineligible_neutral';
      candidatePerformanceStars: 0;
      rewardEligible: false;
      reasonCode: 'uncertain_measurement' | 'invalid_audio_or_system';
    };

export interface V2EvaluatorProvenance {
  provider: string;
  model: string;
  modelVersion: string;
  configHash: string;
}

export type V2EvaluatorExecutionProvenance =
  | ({ status: 'ran' } & V2EvaluatorProvenance)
  | {
      status: 'not_run';
      reasonCode: 'not_required' | 'unsupported' | 'blocked_before_processing';
    };

export interface SpeechCalibrationReceiptRef {
  receiptId: string;
  version: number;
  contentHash: string;
}

export interface VoiceDataPolicyRef {
  policyId: string;
  version: number;
  contentHash: string;
}

export interface VoiceConsentCopyRef {
  copyId: string;
  version: number;
  locale: string;
  contentHash: string;
}

export interface VoiceDeletionRouteRef {
  deletionRouteId: string;
  version: number;
  contentHash: string;
}

export interface VoiceMinorsPolicyRef {
  minorsPolicyId: string;
  version: number;
  contentHash: string;
}

export interface VoiceNetworkEgressRef {
  gatewayId: 'voice-network-egress';
  version: number;
  contentHash: string;
}

export interface VoiceSubjectEligibilityReceiptRef {
  eligibilityReceiptId: string;
  version: number;
  contentHash: string;
}

export interface VoiceGuardianConsentReceiptRef {
  guardianConsentReceiptId: string;
  version: number;
  contentHash: string;
}

export interface VoiceSubjectClassificationAttestationRef {
  classificationAttestationId: string;
  version: number;
  contentHash: string;
}

export type V2VoiceProcessingProvenance =
  | {
      processingMode: 'on_device';
      voiceDataPolicyRef?: never;
    }
  | {
      processingMode: 'network';
      voiceDataPolicyRef: VoiceDataPolicyRef;
      activePolicyRegistryKey: string;
      voiceDataPolicyLifecycleAtAttempt: 'active';
      networkEgressRef: VoiceNetworkEgressRef;
      dispatchReservationRef: VoiceNetworkDispatchReservationRef;
    };

export interface SpeechCalibrationScopeRef {
  receiptRef: SpeechCalibrationReceiptRef;
  scopeId: string;
  taskType: VoiceTaskSpec['taskType'];
  construct: V2SpeechConstruct;
}

export type V2TranscriptConfirmationFact =
  | {
      status: 'confirmed_unedited';
      transcriptOrigin: 'asr_raw';
      confirmedAtClient: string;
    }
  | {
      status: 'confirmed_edited';
      transcriptOrigin: 'learner_edited';
      confirmedAtClient: string;
    }
  | {
      status: 'not_reached';
      transcriptOrigin?: never;
      confirmedAtClient?: never;
      reasonCode: 'capture_invalid' | 'recognition_unavailable' | 'learner_re_recorded';
    };

type V2ConfidentVoiceProvenance = {
  speechLocale: string;
  capturePipelineVersion: string;
  recognitionEvaluator: Extract<V2EvaluatorExecutionProvenance, { status: 'ran' }>;
  scoringEvaluator: Extract<V2EvaluatorExecutionProvenance, { status: 'ran' }>;
  policies: V2RuntimePolicyRefs;
  calibrationScopeRefs: [SpeechCalibrationScopeRef, ...SpeechCalibrationScopeRef[]];
} & V2VoiceProcessingProvenance;

type V2NeutralVoiceProvenance = {
  speechLocale: string;
  capturePipelineVersion: string;
  recognitionEvaluator: V2EvaluatorExecutionProvenance;
  scoringEvaluator: V2EvaluatorExecutionProvenance;
  policies: V2RuntimePolicyRefs;
  calibrationScopeRefs?: SpeechCalibrationScopeRef[];
} & V2VoiceProcessingProvenance;

interface V2VoiceEvidenceEnvelopeBase {
  route: 'voice';
  inputSource: 'microphone';
  hintsUsed: number;
  durationMs: number;
}

type V2ConfidentVoiceRoute =
  | {
      task: Extract<VoiceTaskSpec, { taskType: 'scripted' }>;
      evidenceKind: 'voice_transcript_match' | 'acoustic_pronunciation' | 'dialogue_objectives';
      transcriptConfirmationFact?: never;
      transcriptEvidence?: Extract<V2TranscriptEvidence, { transcriptOrigin: 'asr_raw' }>;
    }
  | {
      task: Extract<VoiceTaskSpec, { taskType: 'spontaneous' }>;
      evidenceKind: 'acoustic_pronunciation' | 'dialogue_objectives';
      transcriptConfirmationFact: Extract<
        V2TranscriptConfirmationFact,
        { status: 'confirmed_unedited' }
      >;
      transcriptEvidence: Extract<V2TranscriptEvidence, { transcriptOrigin: 'asr_raw' }>;
    };

type V2NeutralRawVoiceRoute =
  | {
      task: Extract<VoiceTaskSpec, { taskType: 'scripted' }>;
      evidenceKind: 'voice_transcript_match' | 'acoustic_pronunciation' | 'dialogue_objectives';
      transcriptConfirmationFact?: never;
      transcriptEvidence?: Extract<V2TranscriptEvidence, { transcriptOrigin: 'asr_raw' }>;
    }
  | {
      task: Extract<VoiceTaskSpec, { taskType: 'spontaneous' }>;
      evidenceKind: 'acoustic_pronunciation' | 'dialogue_objectives';
      transcriptConfirmationFact: Extract<
        V2TranscriptConfirmationFact,
        { status: 'confirmed_unedited' | 'not_reached' }
      >;
      transcriptEvidence?: Extract<V2TranscriptEvidence, { transcriptOrigin: 'asr_raw' }>;
    };

type V2ConfidentScoringLayer =
  | {
      evidenceKind: 'acoustic_pronunciation';
      speechFeatures: Omit<V2SpeechFeatureEvidence, 'status' | 'observations'> & {
        status: 'valid';
        observations: [V2SpeechFeatureObservation, ...V2SpeechFeatureObservation[]];
      };
    }
  | {
      evidenceKind: 'voice_transcript_match' | 'dialogue_objectives';
      speechFeatures:
        | (Omit<V2SpeechFeatureEvidence, 'status'> & { status: 'valid' })
        | {
            status: 'not_required';
            observations: [];
            reasonCodes: ['not_required_by_policy'];
          };
    };

type V2ConfidentDecisionLayer =
  | {
      pedagogicalDecision: Extract<
        V2VoicePedagogicalDecision,
        { resultCode: 'PASS_CONFIDENT' }
      >;
      rewardDecision: Extract<
        V2VoiceRewardDecision,
        { decision: 'eligible_pass_confident' }
      >;
    }
  | {
      pedagogicalDecision: Extract<
        V2VoicePedagogicalDecision,
        { resultCode: 'NEEDS_WORK_CONFIDENT' }
      >;
      rewardDecision: Extract<
        V2VoiceRewardDecision,
        { decision: 'eligible_needs_work_confident' }
      >;
    };

export type V2ConfidentVoiceEvidenceEnvelope =
  V2VoiceEvidenceEnvelopeBase &
  V2ConfidentVoiceRoute &
  V2ConfidentScoringLayer &
  V2ConfidentDecisionLayer & {
      captureValidity: Extract<V2CaptureValidity, { status: 'valid' }>;
      recognitionEvidence: V2RecognitionEvidence & { status: 'valid' };
      provenance: V2ConfidentVoiceProvenance;
    };

export type V2NeutralVoiceEvidenceEnvelope =
  | (V2VoiceEvidenceEnvelopeBase &
    V2NeutralRawVoiceRoute & {
      captureValidity: V2CaptureValidity;
      recognitionEvidence: V2RecognitionEvidence;
      provenance: V2NeutralVoiceProvenance;
      speechFeatures: V2SpeechFeatureEvidence;
      pedagogicalDecision: Extract<
        V2VoicePedagogicalDecision,
        { resultCode: 'UNCERTAIN' | 'INVALID_AUDIO_OR_SYSTEM' }
      >;
      rewardDecision: Extract<V2VoiceRewardDecision, { decision: 'ineligible_neutral' }>;
    })
  | (V2VoiceEvidenceEnvelopeBase & {
      task: Extract<VoiceTaskSpec, { taskType: 'spontaneous' }>;
      evidenceKind: 'dialogue_objectives';
      transcriptConfirmationFact: Extract<
        V2TranscriptConfirmationFact,
        { status: 'confirmed_edited' }
      >;
      transcriptEvidence: Extract<
        V2TranscriptEvidence,
        { transcriptOrigin: 'learner_edited' }
      >;
      captureValidity: V2CaptureValidity;
      recognitionEvidence: V2RecognitionEvidence;
      provenance: V2NeutralVoiceProvenance;
      speechFeatures: {
        status: 'not_eligible';
        observations: [];
        reasonCodes: ['transcript_edited'];
      };
      pedagogicalDecision: Extract<
        V2VoicePedagogicalDecision,
        { resultCode: 'UNCERTAIN' | 'INVALID_AUDIO_OR_SYSTEM' }
      >;
      rewardDecision: Extract<V2VoiceRewardDecision, { decision: 'ineligible_neutral' }>;
    });

export type V2VoiceEvidenceEnvelope =
  | V2ConfidentVoiceEvidenceEnvelope
  | V2NeutralVoiceEvidenceEnvelope;

export interface V2NonVoiceEvidence {
  route: 'non_voice';
  evidenceKind: Exclude<
    EvidenceKind,
    'voice_transcript_match' | 'acoustic_pronunciation'
  >;
  inputSource: 'tap' | 'word_bank' | 'keyboard' | 'accessibility_alternative';
  valid: boolean;
  objectiveIdsMet: string[];
  criticalObjectiveIdsMissed: string[];
  semanticSlotOutcomes: V2SemanticSlotOutcome[];
  criticalConstraintOutcomes: V2CriticalConstraintOutcome[];
  transcriptEvidence?: Extract<
    V2TranscriptEvidence,
    { transcriptOrigin: 'learner_edited' | 'typed' }
  >;
  hintsUsed: number;
  durationMs: number;
}

export type V2Evidence = V2VoiceEvidenceEnvelope | V2NonVoiceEvidence;
```

`VoiceTaskSpec` — обязательный discriminator voice pipeline. `scripted` допускает alignment только с опубликованным reference/accepted variants; `spontaneous` не имеет reference text и проверяется по semantic objectives отдельной policy. `learner_edited` и `typed` transcript могут подтверждать semantic objective, но типом запрещены как источник `spokenConfidence`, transcript-match и acoustic evidence. После edit runtime закрывает speech-derived route этой попытки нейтральным voice result и, если цель выполнена, создаёт отдельный `V2NonVoiceEvidence` для semantic objective; чтобы получить voice evidence, learner записывает новую попытку. Сам transcript никогда не является acoustic evidence: оно может появиться только в отдельном `speechFeatures` layer из неизменённой записи и при действующем calibration receipt. `semanticSlotOutcomes` и `criticalConstraintOutcomes` в voice/non-voice envelopes содержат только allowlisted ID и `met|missed`; они не переносят actual slot value, answer или transcript. Materializer преобразует каждый declared `met` в отдельный target `LearningEvidenceBody.outcome='success'`, а `missed` — в `outcome='needs_work'`, с exact `sourceAttempt`; массив не хранится как один opaque score. В checkpoint node validator требует ровно один outcome для каждого declared critical slot/constraint; neutral/system route оставляет оба массива пустыми и материализует non-assessment refs после attempt ref. Generic boolean `learningEvidenceEligible` запрещён: eligibility и результат определяются отдельно для каждого exact declared tuple, поэтому одна accessibility attempt может законно создать assessed refs для измеренных semantic/recall/interaction tuples и non-assessment refs для неизмеренных spoken/listening tuples.

Raw audio, transcript и свободный текст не входят в общий progress/analytics contract и не попадают в `V2AttemptEvent`. Generic analytics получает только типизированные reason/evidence bands, policy/receipt refs и агрегаты без содержимого речи. Если AI feature обрабатывает transcript или audio по сети, это отдельный privacy/safety path с утверждённым `VoiceDataPolicyRef`.

### 3.2 Voice calibration и data policy

```ts
export interface SpeechCalibrationScope {
  scopeId: string;
  taskType: VoiceTaskSpec['taskType'];
  construct: V2SpeechConstruct;
  sampleSize: number;
  observedMetrics: {
    humanAgreement: number;
    falseAcceptRate: number;
    falseRejectRate: number;
    abstentionRate: number;
    maximumObservedSubgroupGap: number;
  };
  acceptanceThresholds: {
    minimumHumanAgreement: number;
    maximumFalseAcceptRate: number;
    maximumFalseRejectRate: number;
    maximumSubgroupGap: number;
  };
  subgroupMetrics: Array<{
    dimension: string;
    cohortKey: string;
    sampleSize: number;
    falseAcceptRate: number;
    falseRejectRate: number;
    abstentionRate: number;
  }>;
}

export interface SpeechCalibrationReceiptBody {
  schemaVersion: 'v2-speech-calibration-receipt.v1';
  provider: string;
  model: string;
  modelVersion: string;
  configHash: string;
  speechLocale: string;
  capturePipelineVersion: string;
  evidencePolicyRef: VersionedPolicyRef<'evidence'>;
  scoringPolicyRef: VersionedPolicyRef<'scoring'>;
  goldenCorpusHash: string;
  humanRubricVersion: string;
  calibratedScopes: [SpeechCalibrationScope, ...SpeechCalibrationScope[]];
  approvedAt: string;
  expiresAt: string;
}

export interface SpeechCalibrationReceiptRecord {
  receiptId: string;
  version: number;
  status: 'approved';
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: SpeechCalibrationReceiptBody;
}

export interface VoiceConsentCopyBody {
  schemaVersion: 'v2-voice-consent-copy.v1';
  copyId: string;
  version: number;
  locale: string;
  title: string;
  disclosureTemplate: string;
  purposeLabels: Readonly<Record<VoiceProcessingPurpose, string>>;
  acceptAction: string;
  declineAction: string;
  revokeAction: string;
  deleteAction: string;
  operationStatusLabels: {
    queued: string;
    processing: string;
    retrying: string;
    retentionObligationActive: string;
    deletionResumed: string;
    completed: string;
    slaBreachedRetrying: string;
    failedTerminal: string;
  };
  approvedAt: string;
}

export interface VoiceConsentCopyRecord {
  copyId: string;
  version: number;
  locale: string;
  status: 'approved';
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceConsentCopyBody;
}

export interface VoiceDeletionRouteBody {
  schemaVersion: 'v2-voice-deletion-route.v1';
  deletionRouteId: string;
  version: number;
  processor: string;
  storageKinds: Array<'phraseman_managed' | 'processor' | 'safety_record' | 'processor_dispatch'>;
  supportedPurposes: VoiceProcessingPurpose[];
  protocol: 'phraseman_internal' | 'provider_deletion_api';
  idempotencyRequired: true;
  externalFinalityProofRequired: boolean;
  legalHoldIsNonTerminal: true;
  approvedAt: string;
  expiresAt: string;
}

export interface VoiceDeletionRouteRecord {
  deletionRouteId: string;
  version: number;
  status: 'approved';
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceDeletionRouteBody;
}

export interface VoiceMinorsPolicyBody {
  schemaVersion: 'v2-voice-minors-policy.v1';
  minorsPolicyId: string;
  version: number;
  authoritativeClassificationSourceKeys: [string, ...string[]];
  classificationIssuerKey: string;
  eligibilityIssuerKey: string;
  guardianConsentIssuerKey: string;
  guardianConsentVerifierKey: string;
  guardianConsentMaximumAgeDays: number;
  subjectEligibilityTtlHours: number;
  unknownSubjectBehavior: 'block_network_voice';
  minorWithoutActiveGuardianConsentBehavior: 'block_network_voice';
  rawBirthDateAllowedInVoiceRecords: false;
  approvedAt: string;
  expiresAt: string;
}

export interface VoiceMinorsPolicyRecord {
  minorsPolicyId: string;
  version: number;
  status: 'approved';
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceMinorsPolicyBody;
}

export interface VoiceNetworkEgressBody {
  schemaVersion: 'v2-voice-network-egress.v1';
  gatewayId: 'voice-network-egress';
  version: number;
  environment: 'development' | 'staging' | 'production';
  deploymentId: string;
  adapterInventoryHash: string;
  supportedPurposes: [VoiceProcessingPurpose, ...VoiceProcessingPurpose[]];
  dispatchLifecycleProtocol: 'reservation-consume-settle-reconcile.v1';
  providerFinalityContract: 'terminal-no-future-writes.v1';
  dispatchDeletionBinding: 'operation-target-settlement-hash.v1';
  requiresSingleUseReservation: true;
  directProviderCallsAllowed: false;
  deployedAt: string;
}

export interface VoiceNetworkEgressRecord {
  gatewayId: 'voice-network-egress';
  version: number;
  status: 'deployed';
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceNetworkEgressBody;
}

export interface VoiceDataPolicyBody {
  schemaVersion: 'v2-voice-data-policy.v2';
  consentCopyRefs: [VoiceConsentCopyRef, ...VoiceConsentCopyRef[]];
  processors: Array<{
    provider: string;
    purpose: VoiceProcessingPurpose;
    processingRegions: string[];
    providerRetentionDays: number;
    providerTrainingAllowed: false;
    deletionRouteRef: VoiceDeletionRouteRef;
  }>;
  rawAudioRetention: 'ephemeral_until_result' | { maxHours: number };
  transcriptRetention: 'ephemeral_until_result' | { maxDays: number };
  safetyRecordRetentionDays: number;
  consentWithdrawalBehavior: 'stop_future_processing_and_delete_policy_scoped_data';
  accountSwitchBehavior: 'purge_local_and_isolate_pending_by_account_generation';
  accountDeleteBehavior: 'delete_local_server_and_processor_copies';
  managedDeletionRouteRef: VoiceDeletionRouteRef;
  deletionSlaHours: number;
  minorsPolicyRef: VoiceMinorsPolicyRef;
  approvedAt: string;
  expiresAt: string;
}

export interface VoiceDataPolicyRecord {
  policyId: string;
  version: number;
  status: 'approved';
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceDataPolicyBody;
}

export type VoiceDataPolicyStaleReasonCode =
  | 'voice_policy_missing_from_registry'
  | 'voice_policy_registry_key_mismatch'
  | 'voice_policy_expired'
  | 'voice_policy_revoked'
  | 'voice_policy_superseded'
  | 'voice_policy_hash_mismatch';

export type VoiceDataPolicyRegistryEntry =
  | {
      registryKey: string;
      ref: VoiceDataPolicyRef;
      lifecycle: 'active';
      activatedAt: string;
      expiresAt: string;
      staleReason?: never;
      supersededBy?: never;
    }
  | {
      registryKey: string;
      ref: VoiceDataPolicyRef;
      lifecycle: 'revoked' | 'expired';
      activatedAt: string;
      expiresAt: string;
      staleReason: 'voice_policy_revoked' | 'voice_policy_expired';
      supersededBy?: never;
    }
  | {
      registryKey: string;
      ref: VoiceDataPolicyRef;
      lifecycle: 'superseded';
      activatedAt: string;
      expiresAt: string;
      staleReason: 'voice_policy_superseded';
      supersededBy: VoiceDataPolicyRef;
    };

export type VoiceReleaseRequirements =
  | {
      allowedTaskTypes: Array<VoiceTaskSpec['taskType']>;
      processingMode: 'on_device_only';
      calibrationReceiptRef?: SpeechCalibrationReceiptRef;
      voiceDataPolicyRef?: never;
      activePolicyRegistryKey?: never;
      requiredNetworkPurposes?: never;
      networkEgressRef?: never;
    }
  | {
      allowedTaskTypes: Array<VoiceTaskSpec['taskType']>;
      processingMode: 'network_allowed' | 'network_required';
      calibrationReceiptRef?: SpeechCalibrationReceiptRef;
      voiceDataPolicyRef: VoiceDataPolicyRef;
      activePolicyRegistryKey: string;
      requiredNetworkPurposes: [VoiceProcessingPurpose, ...VoiceProcessingPurpose[]];
      networkEgressRef: VoiceNetworkEgressRef;
    };

export type VoiceProcessingPurpose =
  | 'recognition'
  | 'speech_scoring'
  | 'club_reply'
  | 'safety_review';

export interface VoiceAccountScope {
  stableId: string;
  accountGeneration: number;
}

export interface VoiceSubjectClassificationAttestationBody {
  schemaVersion: 'v2-voice-subject-classification-attestation.v1';
  classificationAttestationId: string;
  version: number;
  accountScope: VoiceAccountScope;
  subjectBindingKey: string;
  sourceKey: string;
  issuerKey: string;
  subjectClass: 'adult' | 'minor' | 'unknown';
  issuedAt: string;
  expiresAt: string;
}

export interface VoiceSubjectClassificationAttestationRecord {
  classificationAttestationId: string;
  version: number;
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceSubjectClassificationAttestationBody;
}

export type VoiceGuardianConsentDecision =
  | {
      state: 'granted';
      guardianAuthorityProofDigest: string;
      supersedesReceiptRef?: VoiceGuardianConsentReceiptRef;
      revokedReceiptRef?: never;
    }
  | {
      state: 'revoked';
      guardianAuthorityProofDigest?: never;
      supersedesReceiptRef?: never;
      revokedReceiptRef: VoiceGuardianConsentReceiptRef;
    };

export interface VoiceGuardianConsentReceiptBody {
  schemaVersion: 'v2-voice-guardian-consent-receipt.v1';
  guardianConsentReceiptId: string;
  version: number;
  accountScope: VoiceAccountScope;
  subjectBindingKey: string;
  minorsPolicyRef: VoiceMinorsPolicyRef;
  issuerKey: string;
  verifierKey: string;
  decision: VoiceGuardianConsentDecision;
  decidedAt: string;
  expiresAt: string;
  idempotencyKey: string;
}

export interface VoiceGuardianConsentReceiptRecord {
  guardianConsentReceiptId: string;
  version: number;
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceGuardianConsentReceiptBody;
}

export interface VoiceGuardianConsentActiveProjection {
  schemaVersion: 'v2-voice-guardian-consent-active.v1';
  accountScope: VoiceAccountScope;
  subjectBindingKey: string;
  minorsPolicyRef: VoiceMinorsPolicyRef;
  state: 'granted' | 'revoked' | 'expired' | 'superseded';
  sourceReceiptRef: VoiceGuardianConsentReceiptRef;
  projectionRevision: number;
  updatedAt: string;
}

export type VoiceSubjectEligibilityDecision =
  | {
      subjectClass: 'adult';
      networkVoiceEligibility: 'eligible';
      guardianConsentReceiptRef?: never;
      blockedReasonCode?: never;
    }
  | {
      subjectClass: 'minor';
      networkVoiceEligibility: 'eligible_with_guardian';
      guardianConsentReceiptRef: VoiceGuardianConsentReceiptRef;
      blockedReasonCode?: never;
    }
  | {
      subjectClass: 'minor';
      networkVoiceEligibility: 'blocked';
      guardianConsentReceiptRef?: never;
      blockedReasonCode:
        | 'guardian_consent_missing'
        | 'guardian_consent_expired'
        | 'minors_policy_disallows_network_voice';
    }
  | {
      subjectClass: 'unknown';
      networkVoiceEligibility: 'blocked';
      guardianConsentReceiptRef?: never;
      blockedReasonCode: 'subject_eligibility_unknown';
    };

export interface VoiceSubjectEligibilityReceiptBody {
  schemaVersion: 'v2-voice-subject-eligibility-receipt.v1';
  eligibilityReceiptId: string;
  version: number;
  accountScope: VoiceAccountScope;
  subjectBindingKey: string;
  classificationAttestationRef: VoiceSubjectClassificationAttestationRef;
  minorsPolicyRef: VoiceMinorsPolicyRef;
  issuerKey: string;
  decision: VoiceSubjectEligibilityDecision;
  issuedAt: string;
  expiresAt: string;
}

export interface VoiceSubjectEligibilityReceiptRecord {
  eligibilityReceiptId: string;
  version: number;
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceSubjectEligibilityReceiptBody;
}

export type VoiceAuthorizedSubjectEligibility =
  | {
      subjectClass: 'adult';
      minorsPolicyRef: VoiceMinorsPolicyRef;
      eligibilityReceiptRef: VoiceSubjectEligibilityReceiptRef;
      guardianConsentReceiptRef?: never;
    }
  | {
      subjectClass: 'minor';
      minorsPolicyRef: VoiceMinorsPolicyRef;
      eligibilityReceiptRef: VoiceSubjectEligibilityReceiptRef;
      guardianConsentReceiptRef: VoiceGuardianConsentReceiptRef;
    };

export interface VoiceConsentReceiptRef {
  consentReceiptId: string;
  sequence: number;
  contentHash: string;
}

export type VoiceConsentDecision =
  | {
      state: 'accepted';
      consentCopyRef: VoiceConsentCopyRef;
      supersedesReceiptRef?: VoiceConsentReceiptRef;
    }
  | {
      state: 'declined';
      consentCopyRef: VoiceConsentCopyRef;
      supersedesReceiptRef?: VoiceConsentReceiptRef;
    }
  | {
      state: 'revoked';
      consentCopyRef: VoiceConsentCopyRef;
      supersedesAcceptedReceiptRef: VoiceConsentReceiptRef;
    };

export interface VoiceConsentReceiptBody {
  schemaVersion: 'v2-voice-consent-receipt.v2';
  consentReceiptId: string;
  accountScope: VoiceAccountScope;
  sequence: number;
  policyRef: VoiceDataPolicyRef;
  purpose: VoiceProcessingPurpose;
  decision: VoiceConsentDecision;
  decidedAt: string;
  idempotencyKey: string;
}

export interface VoiceConsentReceiptRecord {
  consentReceiptId: string;
  sequence: number;
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceConsentReceiptBody;
}

export interface VoiceConsentActiveProjection {
  schemaVersion: 'v2-voice-consent-active.v2';
  accountScope: VoiceAccountScope;
  policyRef: VoiceDataPolicyRef;
  purpose: VoiceProcessingPurpose;
  state: VoiceConsentDecision['state'];
  sourceReceiptRef: VoiceConsentReceiptRef;
  projectionRevision: number;
  dispatchBarrierRevision: number;
  updatedAt: string;
}

export interface VoiceConsentMutationOutboxEntryBody {
  schemaVersion: 'v2-voice-consent-mutation-outbox.v1';
  mutationId: string;
  accountScope: VoiceAccountScope;
  policyRef: VoiceDataPolicyRef;
  purpose: VoiceProcessingPurpose;
  decision: VoiceConsentDecision;
  idempotencyKey: string;
  enqueuedAt: string;
}

export interface VoiceLocalNetworkDenyLatch {
  schemaVersion: 'v2-voice-local-deny-latch.v1';
  accountScope: VoiceAccountScope;
  policyRef: VoiceDataPolicyRef;
  purpose: VoiceProcessingPurpose;
  sourceMutationId: string;
  state: 'decline_pending' | 'revoke_pending' | 'revoked_confirmed';
  setAt: string;
}

export interface VoiceNetworkDispatchReservationRef {
  reservationId: string;
  contentHash: string;
}

export interface VoiceNetworkDispatchReservationBody {
  schemaVersion: 'v2-voice-network-dispatch-reservation.v1';
  reservationId: string;
  accountScope: VoiceAccountScope;
  policyRef: VoiceDataPolicyRef;
  purpose: VoiceProcessingPurpose;
  activePolicyRegistryKey: string;
  networkEgressRef: VoiceNetworkEgressRef;
  providerAdapterKey: string;
  processor: string;
  processorDeletionRouteRef: VoiceDeletionRouteRef;
  consentReceiptRef: VoiceConsentReceiptRef;
  consentProjectionRevision: number;
  dispatchBarrierRevision: number;
  subjectEligibility: VoiceAuthorizedSubjectEligibility;
  reservedAt: string;
  expiresAt: string;
}

export interface VoiceNetworkDispatchReservationRecord {
  reservationId: string;
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceNetworkDispatchReservationBody;
}

export interface VoiceNetworkDispatchConsumptionRef {
  reservationId: string;
  consumptionId: string;
  contentHash: string;
}

export interface VoiceNetworkDispatchConsumptionBody {
  schemaVersion: 'v2-voice-network-dispatch-consumption.v1';
  consumptionId: string;
  reservationRef: VoiceNetworkDispatchReservationRef;
  accountScope: VoiceAccountScope;
  dispatchBarrierRevision: number;
  providerRequestIdempotencyKeyDigest: string;
  consumedAt: string;
}

export interface VoiceNetworkDispatchConsumptionRecord {
  reservationId: string;
  consumptionId: string;
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceNetworkDispatchConsumptionBody;
}

export interface VoiceNetworkDispatchSettlementRef {
  reservationId: string;
  settlementId: string;
  contentHash: string;
}

export interface VoiceExternalProviderDispatchFinalityProof {
  providerRequestDigest: string;
  providerResponseDigest: string;
  providerOutcomeCode: string;
  providerFinalAt: string;
  finality: 'request_terminal_no_future_writes';
}

interface VoiceNetworkDispatchSettlementBase {
  schemaVersion: 'v2-voice-network-dispatch-settlement.v1';
  settlementId: string;
  reservationRef: VoiceNetworkDispatchReservationRef;
  accountScope: VoiceAccountScope;
  settledAt: string;
}

export type VoiceNetworkDispatchSettlementBody =
  | (VoiceNetworkDispatchSettlementBase & {
      disposition: 'cancelled_before_provider_call';
      consumptionRef?: never;
      providerProof?: never;
      processorTarget?: never;
      reason:
        | 'consent_revoked'
        | 'explicit_delete'
        | 'account_delete'
        | 'reservation_expired';
      finalBarrierRevision: number;
    })
  | (VoiceNetworkDispatchSettlementBase & {
      disposition: 'provider_request_final_no_artifact';
      consumptionRef: VoiceNetworkDispatchConsumptionRef;
      providerProof: VoiceExternalProviderDispatchFinalityProof;
      processorTarget?: never;
      reason?: never;
      finalBarrierRevision?: never;
    })
  | (VoiceNetworkDispatchSettlementBase & {
      disposition: 'provider_request_final_artifact_registered';
      consumptionRef: VoiceNetworkDispatchConsumptionRef;
      providerProof: VoiceExternalProviderDispatchFinalityProof;
      processorTarget: {
        targetId: string;
        policyRef: VoiceDataPolicyRef;
        purpose: VoiceProcessingPurpose;
        processor: string;
        deletionRouteRef: VoiceDeletionRouteRef;
        protectedLocatorDigest: string;
      };
      reason?: never;
      finalBarrierRevision?: never;
    });

export interface VoiceNetworkDispatchSettlementRecord {
  reservationId: string;
  settlementId: string;
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceNetworkDispatchSettlementBody;
}

export type VoiceNetworkDispatchJournalEvent =
  | { kind: 'reservation_recorded'; reservationRef: VoiceNetworkDispatchReservationRef }
  | { kind: 'consumption_committed'; consumptionRef: VoiceNetworkDispatchConsumptionRef }
  | { kind: 'settlement_recorded'; settlementRef: VoiceNetworkDispatchSettlementRef }
  | {
      kind: 'deletion_reconciled';
      operationId: string;
      targetId: string;
      settlementRef: VoiceNetworkDispatchSettlementRef;
      receiptRef: VoiceDeletionReceiptRef;
    };

export interface VoiceNetworkDispatchJournalEntry {
  schemaVersion: 'v2-voice-network-dispatch-journal-entry.v1';
  reservationRef: VoiceNetworkDispatchReservationRef;
  sequence: number;
  eventId: string;
  event: VoiceNetworkDispatchJournalEvent;
  occurredAt: string;
}

export type VoiceNetworkDispatchLifecycleState =
  | { state: 'reserved' }
  | {
      state: 'consumed_in_flight';
      consumptionRef: VoiceNetworkDispatchConsumptionRef;
    }
  | {
      state: 'cancelled_before_provider_call';
      settlementRef: VoiceNetworkDispatchSettlementRef;
    }
  | {
      state: 'settled_no_artifact';
      consumptionRef: VoiceNetworkDispatchConsumptionRef;
      settlementRef: VoiceNetworkDispatchSettlementRef;
    }
  | {
      state: 'settled_artifact_pending_deletion';
      consumptionRef: VoiceNetworkDispatchConsumptionRef;
      settlementRef: VoiceNetworkDispatchSettlementRef;
      targetId: string;
    }
  | {
      state: 'reconciled_deleted';
      consumptionRef: VoiceNetworkDispatchConsumptionRef;
      settlementRef: VoiceNetworkDispatchSettlementRef;
      deletionReceiptRef: VoiceDeletionReceiptRef;
    };

export interface VoiceNetworkDispatchProjection {
  schemaVersion: 'v2-voice-network-dispatch-state.v1';
  reservationRef: VoiceNetworkDispatchReservationRef;
  lifecycle: VoiceNetworkDispatchLifecycleState;
  lastJournalSequence: number;
  updatedAt: string;
}

export type VoiceNetworkAuthorizationResult =
  | {
      decision: 'authorized_for_immediate_dispatch';
      accountScope: VoiceAccountScope;
      policyRef: VoiceDataPolicyRef;
      purpose: VoiceProcessingPurpose;
      activePolicyRegistryKey: string;
      networkEgressRef: VoiceNetworkEgressRef;
      consentReceiptRef: VoiceConsentReceiptRef;
      dispatchReservationRef: VoiceNetworkDispatchReservationRef;
      subjectEligibility: VoiceAuthorizedSubjectEligibility;
      checkedAt: string;
    }
  | {
      decision: 'fallback_required';
      reasonCode:
        | VoiceDataPolicyStaleReasonCode
        | 'voice_policy_purpose_not_allowed'
        | 'voice_consent_missing'
        | 'voice_consent_declined'
        | 'voice_consent_revoked'
        | 'voice_consent_account_generation_mismatch'
        | 'voice_consent_copy_ref_mismatch'
        | 'voice_local_deny_latch_active'
        | 'voice_subject_eligibility_unknown'
        | 'voice_minor_guardian_consent_missing_or_stale'
        | 'voice_minors_policy_ref_mismatch'
        | 'voice_network_egress_ref_mismatch'
        | 'voice_dispatch_barrier_advanced'
        | 'voice_deletion_in_progress'
        | 'voice_retention_obligation_active';
    };

export type VoiceDeletionScope =
  | {
      kind: 'policy_purpose';
      policyRef: VoiceDataPolicyRef;
      purpose: VoiceProcessingPurpose;
    }
  | {
      kind: 'account_all_voice_data';
    };

export type VoiceDeletionTarget =
  | {
      targetId: string;
      storageKind: 'phraseman_managed';
      policyRef?: VoiceDataPolicyRef;
      purpose?: VoiceProcessingPurpose;
      processor: 'phraseman';
      deletionRouteRef: VoiceDeletionRouteRef;
      deadlineAt: string;
    }
  | {
      targetId: string;
      storageKind: 'processor' | 'safety_record';
      policyRef: VoiceDataPolicyRef;
      purpose: VoiceProcessingPurpose;
      processor: string;
      deletionRouteRef: VoiceDeletionRouteRef;
      deadlineAt: string;
    }
  | {
      targetId: string;
      storageKind: 'processor_dispatch';
      policyRef: VoiceDataPolicyRef;
      purpose: VoiceProcessingPurpose;
      processor: string;
      deletionRouteRef: VoiceDeletionRouteRef;
      sourceDispatchReservationRef: VoiceNetworkDispatchReservationRef;
      deadlineAt: string;
    };

export interface VoiceDeletionOperationBody {
  schemaVersion: 'v2-voice-deletion-operation.v2';
  operationId: string;
  accountScope: VoiceAccountScope;
  requestKind: 'explicit_delete' | 'consent_revoke' | 'account_delete';
  scope: VoiceDeletionScope;
  targets: VoiceDeletionTarget[];
  coveredDispatchReservationRefs: VoiceNetworkDispatchReservationRef[];
  requestedAt: string;
  idempotencyKey: string;
}

export interface VoiceDeletionOperationRecord {
  operationId: string;
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceDeletionOperationBody;
}

export interface VoiceDeletionReceiptRef {
  receiptId: string;
  contentHash: string;
}

export type VoiceManagedDeletionOutcome =
  | {
      status: 'deleted' | 'not_found';
    }
  | {
      status: 'retained_under_legal_hold';
      legalBasisKey: string;
      retentionUntil: string;
    };

export interface VoiceExternalProviderDeletionProof {
  providerIdempotencyKeyDigest: string;
  providerRequestDigest: string;
  providerResponseDigest: string;
  providerReceiptDigest?: string;
  providerOutcomeCode: string;
  providerCompletedAt: string;
}

export type VoiceExternalDeletionOutcome =
  | {
      status: 'deleted' | 'not_found';
      providerProof: VoiceExternalProviderDeletionProof;
    }
  | {
      status: 'retained_under_legal_hold';
      legalBasisKey: string;
      retentionUntil: string;
      providerProof: VoiceExternalProviderDeletionProof;
    };

export type VoiceDeletionOutcome = VoiceManagedDeletionOutcome | VoiceExternalDeletionOutcome;

export interface VoiceDeletionReceiptBodyBase {
  schemaVersion: 'v2-voice-deletion-receipt.v2';
  receiptId: string;
  operationId: string;
  recordedAt: string;
}

export type VoiceDeletionReceiptBody = VoiceDeletionReceiptBodyBase &
  (
    | {
        target: Extract<VoiceDeletionTarget, { storageKind: 'phraseman_managed' }>;
        outcome: VoiceManagedDeletionOutcome;
      }
    | {
        target: Extract<VoiceDeletionTarget, { storageKind: 'processor' | 'safety_record' }>;
        outcome: VoiceExternalDeletionOutcome;
      }
    | {
        target: Extract<VoiceDeletionTarget, { storageKind: 'processor_dispatch' }>;
        sourceDispatchSettlementRef: VoiceNetworkDispatchSettlementRef;
        outcome: VoiceExternalDeletionOutcome;
      }
  );

export interface VoiceDeletionReceiptRecord {
  receiptId: string;
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceDeletionReceiptBody;
}

export interface VoiceRetentionObligationRef {
  obligationId: string;
  revision: number;
  contentHash: string;
}

export interface VoiceRetentionObligationBody {
  schemaVersion: 'v2-voice-retention-obligation.v1';
  obligationId: string;
  revision: number;
  operationId: string;
  accountScope: VoiceAccountScope;
  target: VoiceDeletionTarget;
  sourceLegalHoldReceiptRef: VoiceDeletionReceiptRef;
  legalBasisKey: string;
  retentionUntil: string;
  nextRecheckAt: string;
  supersedesObligationRef?: VoiceRetentionObligationRef;
  openedAt: string;
}

export interface VoiceRetentionObligationRecord {
  obligationId: string;
  revision: number;
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: VoiceRetentionObligationBody;
}

export type VoiceDeletionFailureReasonCode =
  | 'transient_network'
  | 'processor_rate_limited'
  | 'processor_unavailable'
  | 'processor_auth_rejected'
  | 'deletion_route_invalid'
  | 'receipt_invalid'
  | 'unknown_categorical_failure';

export type VoiceDeletionJournalEvent =
  | { kind: 'operation_accepted' }
  | {
      kind: 'dispatch_target_waiting_for_settlement';
      reservationRef: VoiceNetworkDispatchReservationRef;
    }
  | {
      kind: 'dispatch_settlement_recorded';
      reservationRef: VoiceNetworkDispatchReservationRef;
      settlementRef: VoiceNetworkDispatchSettlementRef;
    }
  | {
      kind: 'dispatch_target_attempt_started';
      targetId: string;
      settlementRef: VoiceNetworkDispatchSettlementRef;
      attempt: number;
    }
  | {
      kind: 'dispatch_no_artifact_reconciled';
      reservationRef: VoiceNetworkDispatchReservationRef;
      settlementRef: VoiceNetworkDispatchSettlementRef;
    }
  | { kind: 'target_attempt_started'; targetId: string; attempt: number }
  | {
      kind: 'target_retry_scheduled';
      targetId: string;
      attempt: number;
      reasonCode: VoiceDeletionFailureReasonCode;
      nextAttemptAt: string;
    }
  | {
      kind: 'target_receipt_recorded';
      targetId: string;
      receiptRef: VoiceDeletionReceiptRef;
    }
  | {
      kind: 'retention_obligation_opened';
      targetId: string;
      obligationRef: VoiceRetentionObligationRef;
    }
  | {
      kind: 'retention_obligation_recheck_scheduled';
      targetId: string;
      obligationRef: VoiceRetentionObligationRef;
      nextRecheckAt: string;
    }
  | {
      kind: 'retention_obligation_extended';
      targetId: string;
      previousObligationRef: VoiceRetentionObligationRef;
      replacementObligationRef: VoiceRetentionObligationRef;
    }
  | {
      kind: 'retention_obligation_released';
      targetId: string;
      obligationRef: VoiceRetentionObligationRef;
      releasedAt: string;
    }
  | {
      kind: 'target_deletion_requeued_after_hold';
      targetId: string;
      obligationRef: VoiceRetentionObligationRef;
      nextAttemptAt: string;
    }
  | {
      kind: 'retention_obligation_resolved';
      targetId: string;
      obligationRef: VoiceRetentionObligationRef;
      finalReceiptRef: VoiceDeletionReceiptRef;
    }
  | { kind: 'sla_breached_retrying'; targetId: string; attempt: number }
  | {
      kind: 'target_failed_terminal';
      targetId: string;
      attempt: number;
      reasonCode: VoiceDeletionFailureReasonCode;
    }
  | {
      kind: 'operation_completed';
      completionKind: 'deleted_or_not_found';
    };

export interface VoiceDeletionJournalEntry {
  schemaVersion: 'v2-voice-deletion-journal-entry.v2';
  operationId: string;
  sequence: number;
  eventId: string;
  event: VoiceDeletionJournalEvent;
  occurredAt: string;
}

export interface VoiceDeletionOperationProjection {
  schemaVersion: 'v2-voice-deletion-operation-state.v2';
  operationId: string;
  accountScope: VoiceAccountScope;
  status:
    | 'queued'
    | 'processing'
    | 'retry_wait'
    | 'sla_breached_retrying'
    | 'retention_obligation_active'
    | 'completed'
    | 'failed_terminal';
  lastJournalSequence: number;
  attemptCount: number;
  targetStates: Array<{
    targetId: string;
    status:
      | 'queued'
      | 'processing'
      | 'retry_wait'
      | 'sla_breached_retrying'
      | 'receipt_recorded'
      | 'retention_obligation_active'
      | 'failed_terminal';
    attemptCount: number;
    nextAttemptAt?: string;
    receiptRef?: VoiceDeletionReceiptRef;
    retentionObligationRef?: VoiceRetentionObligationRef;
  }>;
  derivedDispatchTargets: Array<{
    settlementRef: VoiceNetworkDispatchSettlementRef;
    target: Extract<VoiceDeletionTarget, { storageKind: 'processor_dispatch' }>;
  }>;
  coveredDispatchStates: Array<{
    reservationRef: VoiceNetworkDispatchReservationRef;
    status:
      | 'waiting_for_dispatch_settlement'
      | 'cancelled_before_provider_call'
      | 'settled_no_artifact'
      | 'settled_artifact_pending_deletion'
      | 'reconciled_deleted';
    settlementRef?: VoiceNetworkDispatchSettlementRef;
    derivedTargetId?: string;
    receiptRef?: VoiceDeletionReceiptRef;
  }>;
  nextAttemptAt?: string;
  updatedAt: string;
}
```

Hash invariant для calibration, всех voice-governance policy/receipt bodies, dispatch reservation/consumption/settlement, deletion receipts и retention obligations одинаков:

```text
record.contentHash = ref.contentHash = sha256(canonicalJsonV1(record.body))
record identity/version = ref identity/version
```

`SpeechCalibrationReceiptBody`, `VoiceConsentCopyBody`, `VoiceDeletionRouteBody`, `VoiceMinorsPolicyBody`, `VoiceNetworkEgressBody`, `VoiceDataPolicyBody`, `VoiceSubjectClassificationAttestationBody`, `VoiceGuardianConsentReceiptBody`, `VoiceSubjectEligibilityReceiptBody`, `VoiceConsentReceiptBody`, `VoiceNetworkDispatchReservationBody`, `VoiceNetworkDispatchConsumptionBody`, `VoiceNetworkDispatchSettlementBody`, `VoiceDeletionOperationBody`, `VoiceDeletionReceiptBody` и `VoiceRetentionObligationBody` — hashable payloads своих immutable records. Они не содержат собственного `contentHash`, object path/generation или другого self-reference. `*Record` — resolved envelope над body; lightweight `*Ref` переносит только identity/version/sequence/revision/locale и проверяемый hash. Validator заново canonicalizes body, сравнивает hash и identity с ref и fail-closed отклоняет mismatch. Каждый specialized ref обязан разрешаться в exact immutable approved/deployed record/body того же identity/version/hash; строковый alias или mutable registry head их не заменяет. Хеширование полного record/ref запрещено: это создало бы circular/self-hash contract.

Calibration не трактует отдельные массивы task types и constructs как декартово произведение. Единственная единица разрешения — конкретный `calibratedScopes[]` tuple `scopeId + taskType + construct` со своими sample size, observed metrics, thresholds и subgroup metrics. Каждый `SpeechCalibrationScopeRef` уверенного result обязан разрешаться ровно в один такой tuple того же receipt hash.

Release validators применяют non-waivable правила:

- любой network voice/ASR/scoring/Club template обязан иметь опубликованный `VoiceDataPolicyRef`, который через `activePolicyRegistryKey` разрешается в exact `VoiceDataPolicyRegistryEntry(lifecycle='active')`, и exact `VoiceNetworkEgressRef`, который разрешается в развёрнутый server gateway той же версии/hash. Expired/revoked/superseded/missing/hash-mismatch policy или отсутствующий gateway включает fallback до первой отправки;
- `activePolicyRegistryKey` обязан совпасть с `VoiceDataPolicyRegistryEntry.registryKey`; on-device requirement типом запрещает policy ref/registry key/network purposes/egress ref, а network requirement требует exact policy, registry key, egress ref и непустой список purposes, каждый из которых существует в policy body;
- policy содержит непустые exact `VoiceConsentCopyRef` для поддерживаемых locale, `VoiceDeletionRouteRef` для каждого processor/purpose и managed storage, а также exact `VoiceMinorsPolicyRef`. Каждый ref разрешается в immutable approved body/record; locale duplicate, mutable string key, missing route/minors body или ref/hash mismatch блокирует release. Registry `expiresAt` обязан совпасть с immutable policy body;
- Content Studio проверяет publish-time `VoiceReleaseRequirements`, но не может выдать account-specific consent/eligibility. Непосредственно перед **каждой** network dispatch provider-agnostic server egress в одной transaction заново проверяет authenticated `stableId + accountGeneration`, exact active policy/registry/purpose/egress, отсутствие deletion/retention block, `VoiceConsentActiveProjection(state='accepted')`, exact receipt body/ref/hash и показанный `VoiceConsentCopyRef`, а также server-owned subject eligibility. Та же transaction пишет одноразовую `VoiceNetworkDispatchReservationRecord` с exact consent receipt sequence, projection revision, processor/deletion route и `dispatchBarrierRevision`;
- network provider adapters не имеют client/public/direct entry point и импортируются только server egress module. ASR, scoring и Club используют один gateway; reservation остаётся server-internal, single-use и не является reusable bearer token. Exact deployed `VoiceNetworkEgressBody` обязан объявлять `reservation-consume-settle-reconcile.v1`, terminal provider finality и settlement-bound deletion; static dependency/inventory test перечисляет все network adapters и fail-closed запрещает activation, пока gateway отсутствует, protocol mismatch либо хотя бы один adapter обходит reservation/consumption/settlement;
- authoritative subject-classification adapter выпускает immutable attestation только из allowlisted `VoiceMinorsPolicyBody.authoritativeClassificationSourceKeys`; client age/classification игнорируется. Policy pin-ит classification/eligibility/guardian issuer+verifier keys и TTL. Server выдаёт eligibility receipt только из non-expired exact attestation того же account/subject binding: `adult` разрешён напрямую, `minor` — только когда active guardian projection указывает exact non-expired granted receipt того же subject/account generation/minors policy. Guardian grant/revoke/supersession являются append-only receipts с monotonic projection; unknown, missing/expired/revoked guardian consent, stale issuer/verifier/hash/account mismatch всегда дают typed fallback. Raw date of birth/age не попадает в voice consent/dispatch/deletion/analytics records;
- accept, decline и revoke записываются только server callable как append-only `VoiceConsentReceiptRecord` с exact `VoiceConsentCopyRef`; та же transaction с monotonic sequence обновляет server-owned active projection. Projection key — server HMAC от account scope + policy ref + purpose, а `sourceReceiptRef` обязан разрешаться в exact receipt того же scope/policy/purpose. Duplicate UUID-format `idempotencyKey` для того же account generation возвращает прежний receipt, а несовпадающий payload отклоняется;
- decline/revoke **до сети** синхронно ставит persistent account-generation-scoped `VoiceLocalNetworkDenyLatch`, очищает drafts и пишет `VoiceConsentMutationOutboxEntryBody`. Restart/reconnect не снимает latch; pending/offline accept никогда не разрешает dispatch. Outbox replay сначала получает server receipt/projection, для revoke — atomically deletion operation, и только затем подтверждает local mutation. Account switch изолирует latch/outbox; старый intent может replay-иться только под тем же authenticated account generation;
- reservation, single-use consumption и revoke конфликтуют на одном projection/barrier document и тем самым задают linearization. После reservation egress обязан commit-ить immutable consumption **до** provider call. Если revoke/barrier выигрывает до consume, reservation получает `cancelled_before_provider_call` settlement и adapter не вызывается. Если consume выигрывает, state становится `consumed_in_flight`; revoke включает exact reservation в deletion operation, но не может считать её завершённой до terminal provider-final settlement. Timeout, worker crash или unknown provider status не являются settlement и оставляют operation pending/SLA-escalated. После final settlement `no_artifact` reconciliation завершается без target; artifact settlement создаёт exact `processor_dispatch` target, а deletion вызывается только с idempotency key `HMAC(operationId + targetId + settlementRef.contentHash)`. Ранний `not_found`, полученный до settlement, типом недействителен и не кэшируется под final key;
- revoke атомарно обновляет consent projection/barrier и ставит exact policy/purpose deletion operation в durable queue. Explicit «удалить голосовые данные» создаёт такой же idempotent operation; account delete создаёт `account_all_voice_data` operation, но **не** заставляет `deleteAccountAndWipe()` ждать cloud/processor completion: локальный выход, wipe, очистка `stable_id` и pending-auth guard сохраняют существующий порядок;
- operation ID — непредсказуемый server HMAC от account scope + UUID idempotency key; immutable operation pin-ит exact known server/processor targets, covered dispatch reservations и SLA. Полный target set выводится как `operation.targets ∪ unique processorTarget` из terminal artifact settlements только для этих covered refs; projection pin-ит каждый derived target к settlement, произвольное journal expansion запрещено. Для `processor|safety_record|processor_dispatch` outcome `deleted|not_found|retained_under_legal_hold` действителен только внутри typed external receipt с обязательным `VoiceExternalProviderDeletionProof`; dispatch target дополнительно pin-ит exact final settlement. Внутреннее самоподтверждение, пустой/optional response digest, сырой provider receipt ID или receipt до settlement запрещены. Managed target использует отдельную internal receipt branch;
- `retained_under_legal_hold` не завершает target или operation: worker создаёт immutable `VoiceRetentionObligationRecord`, переводит projection в `retention_obligation_active` и планирует recheck не позже `retentionUntil`. Extension создаёт новую revision со ссылкой на предыдущую, release/expiry автоматически requeue-ит deletion, а obligation закрывается только final `deleted|not_found` receipt. `operation_completed` и copy «Удалено» допустимы лишь после final receipts для всех ordinary/derived targets **и** после reconciliation каждой `coveredDispatchReservationRef`: cancelled-before-call, settled-no-artifact либо settlement-bound final deletion receipt. `reserved`, `consumed_in_flight`, ambiguous timeout, artifact pending deletion и legal hold всегда non-terminal;
- local voice/transcript drafts удаляются синхронно при revoke/explicit delete/account switch/account delete; account-delete guard блокирует все новые voice writes до inventory snapshot. Server operation, reservation/consumption/settlement reconciliation, journals и retention obligation переживают offline, sign-out и удаление auth user. Новый account generation не может читать, продолжать или отменять операции прежнего поколения;
- consent/deletion/classification/guardian/eligibility/reservation/consumption/settlement/retention collections, active projections, journals и processor proofs недоступны для прямой client write; UI работает через account-checked callables. Generic analytics не получает `stableId`, account generation, operation/receipt/provider IDs, raw age, audio, transcript, free text или deletion-route/provider-proof payload — только allowlisted category/status/latency/SLA bands;
- любой voice-derived assessed `LearningEvidenceBody`, performance star, progress gate или corrective acoustic feedback требует approved, неистёкший `SpeechCalibrationReceiptRecord` для точных `provider + model + modelVersion + configHash + speechLocale + capturePipelineVersion + taskType + construct + evidence/scoring policy refs`;
- confident branch требует `captureValidity.status='valid'`, valid recognition evidence, оба evaluator provenance со `status='ran'` и непустые exact calibration scope refs, покрывающие каждый заявленный scored construct; scope metrics обязаны пройти собственные thresholds;
- каждый confident `SpeechCalibrationScopeRef` обязан совпасть с exact `task.taskType + construct` tuple того же receipt, а каждый фактически scored construct обязан иметь такой ref; лишний scope другого task/construct, декартово расширение и частичное покрытие fail closed;
- type union задаёт разрешённую матрицу task/evidence: scripted допускает transcript-match, acoustic pronunciation или dialogue objectives; spontaneous — только acoustic pronunciation или dialogue objectives, никогда transcript-match. Spontaneous route сохраняет `V2TranscriptConfirmationFact` как факт подтверждения неизменённого ASR transcript, хотя сам текст transcript удаляется из sanitized attempt; edited transcript остаётся neutral semantic route;
- изменение любого из этих полей немедленно делает calibration receipt, preview/review fingerprints и ещё не активированный downstream release stale; активный release выключается voice kill switch до повторной калибровки либо использует deterministic non-voice/guided fallback;
- отсутствие policy/receipt нельзя снять admin override. Sound Lab без подходящего receipt остаётся guided listen-and-repeat, не создаёт acoustic evidence и не выдаёт acoustic/performance star.

### 3.3 Normalized result и retry policy

```ts
export type V2ResultCode =
  | V2VoiceResultCode
  | 'CORRECT'
  | 'WRONG'
  | 'COMPLETED'
  | 'SKIPPED';

export type V2TechnicalRetryReasonCode =
  | V2CaptureValidityReasonCode
  | 'recognition_low_confidence'
  | 'recognition_unsupported'
  | 'scoring_disagreement'
  | 'service_timeout'
  | 'service_unavailable'
  | 'network_unavailable'
  | 'calibration_missing_or_stale'
  | VoiceDataPolicyStaleReasonCode;

export type V2LearningRetryReasonCode =
  | 'target_not_yet_met'
  | 'critical_objective_missed'
  | 'focused_repair_requested';

export const V2_MAX_MANDATORY_LEARNING_RETRIES = 2 as const;
export const V2_MANDATORY_LEARNING_RETRY_HYPOTHESIS = 'HYP-V2-002' as const;

export type V2FreeTechnicalRetryDirective =
  | {
      kind: 'free_technical';
      reasonCode: V2TechnicalRetryReasonCode;
      consumesMandatoryLearningRetry: false;
      technicalFailureBand: 'first' | 'second';
      alternateRouteRequired: false;
      alternateRouteId?: never;
    }
  | {
      kind: 'free_technical';
      reasonCode: V2TechnicalRetryReasonCode;
      consumesMandatoryLearningRetry: false;
      technicalFailureBand: 'repeated';
      alternateRouteRequired: true;
      alternateRouteId: string;
    };

export type V2RetryDirective =
  | { kind: 'none'; consumesMandatoryLearningRetry: false }
  | {
      kind: 'mandatory_learning';
      reasonCode: V2LearningRetryReasonCode;
      consumesMandatoryLearningRetry: true;
      mandatoryLearningRetryNumber: 1 | 2;
    }
  | V2FreeTechnicalRetryDirective
  | {
      kind: 'supported_continue';
      reasonCode: 'mandatory_learning_retry_cap_reached';
      consumesMandatoryLearningRetry: false;
    };

export type V2OutcomeDecision =
  | {
      resultCode: 'PASS_CONFIDENT';
      candidatePerformanceStars: 0 | 1 | 2 | 3;
      voiceEvidence: true;
      rewardEligible: boolean;
      retryDirective: Extract<V2RetryDirective, { kind: 'none' }>;
    }
  | {
      resultCode: 'NEEDS_WORK_CONFIDENT';
      candidatePerformanceStars: 0 | 1;
      voiceEvidence: true;
      rewardEligible: boolean;
      retryDirective: Exclude<V2RetryDirective, V2FreeTechnicalRetryDirective>;
    }
  | {
      resultCode: 'UNCERTAIN' | 'INVALID_AUDIO_OR_SYSTEM';
      candidatePerformanceStars: 0;
      voiceEvidence: false;
      rewardEligible: false;
      retryDirective: V2FreeTechnicalRetryDirective;
    }
  | {
      resultCode: 'CORRECT' | 'COMPLETED';
      candidatePerformanceStars: 0 | 1 | 2 | 3;
      voiceEvidence: false;
      rewardEligible: boolean;
      retryDirective: Extract<V2RetryDirective, { kind: 'none' }>;
    }
  | {
      resultCode: 'WRONG';
      candidatePerformanceStars: 0;
      voiceEvidence: false;
      rewardEligible: false;
      retryDirective: Exclude<V2RetryDirective, V2FreeTechnicalRetryDirective>;
    }
  | {
      resultCode: 'SKIPPED';
      candidatePerformanceStars: 0;
      voiceEvidence: false;
      rewardEligible: false;
      retryDirective: Extract<V2RetryDirective, { kind: 'none' }>;
    };

interface V2ActivityResultBase {
  qualityBand?: string;
}

type V2AssessedCompletedOutcome =
  | Extract<
      V2OutcomeDecision,
      { resultCode: 'PASS_CONFIDENT' | 'CORRECT' | 'COMPLETED' }
    >
  | (Extract<V2OutcomeDecision, { resultCode: 'NEEDS_WORK_CONFIDENT' }> & {
      retryDirective: Extract<V2RetryDirective, { kind: 'none' | 'supported_continue' }>;
    });

type V2AssessedNotCompletedOutcome =
  | Extract<V2OutcomeDecision, { resultCode: 'WRONG' }>
  | (Extract<V2OutcomeDecision, { resultCode: 'NEEDS_WORK_CONFIDENT' }> & {
      retryDirective: Extract<
        V2RetryDirective,
        { kind: 'mandatory_learning' | 'supported_continue' }
      >;
    });

export type V2ActivityResult =
  | (V2ActivityResultBase & {
      completed: false;
      completionKind: 'not_completed';
      outcome: Extract<
        V2OutcomeDecision,
        { resultCode: 'UNCERTAIN' | 'INVALID_AUDIO_OR_SYSTEM' }
      >;
      nextAction: 'retry_free' | 'offer_fallback' | 'route_repair';
    })
  | (V2ActivityResultBase & {
      completed: false;
      completionKind: 'skipped';
      outcome: Extract<V2OutcomeDecision, { resultCode: 'SKIPPED' }>;
      nextAction: 'continue' | 'offer_fallback';
    })
  | (V2ActivityResultBase & {
      completed: true;
      completionKind: 'primary' | 'fallback' | 'accessibility_alternative';
      outcome: V2AssessedCompletedOutcome;
      nextAction: 'continue' | 'show_feedback';
    })
  | (V2ActivityResultBase & {
      completed: false;
      completionKind: 'not_completed';
      outcome: V2AssessedNotCompletedOutcome;
      nextAction: 'show_feedback' | 'offer_fallback' | 'route_repair';
    });
```

Правила:

- `UNCERTAIN` и `INVALID_AUDIO_OR_SYSTEM` не являются wrong answer и типом всегда означают `candidatePerformanceStars=0`, `voiceEvidence=false`, `rewardEligible=false`, только declared per-tuple non-assessment refs и бесплатный technical retry;
- `V2OutcomeDecision` намеренно не содержит attempt-wide `learningEvidenceEligible`: до хеширования sanitizer создаёт исчерпывающие graph-final dispositions либо delayed client candidates, а после появления `CanonicalAttemptRef` materializer проверяет graph entries напрямую или delayed terminal resolutions из exact server receipt против declaration, pedagogical provenance и ID-only observation. Не-`SKIPPED` declaration даёт ровно assessed либо non-assessment ref только после своего materialization basis; `SKIPPED/no_record` ref не даёт, node/probe без declarations имеет пустой массив. Один boolean не может корректно представить `0..N`, mixed accessibility result и server-timed delayed mapping;
- voice kernel никогда не преобразует uncertainty в `WRONG`; только новый уверенно измеренный результат может создать learning evidence или performance stars;
- `PASS_CONFIDENT`, `CORRECT` и `COMPLETED` допускают только `retryDirective.kind='none'`; завершённый/правильный outcome никогда не требует mandatory retry. `WRONG` всегда имеет ноль candidate performance stars/reward; `SKIPPED` всегда означает `completed=false`, `completionKind='skipped'`, содержит по одному `no_record/skipped_by_learner` disposition на каждую declaration и не создаёт assessed/non-assessment refs;
- `NEEDS_WORK_CONFIDENT` может выдать только `0 | 1` candidate performance star; quality/transfer stars для этого исхода запрещены независимо от renderer или template;
- максимум — две обязательные learning retries после исходной попытки. Этот code-owned pilot cap явно относится к `HYP-V2-002`, не может быть увеличен ModeTemplate/recovery policy и после него всегда открывает `supported_continue`/alternate route;
- permission, capture, route, noise, ASR, network, timeout, provider, stale calibration и privacy failures не расходуют обязательные learning retries;
- первая и вторая technical failure дают бесплатный retry; третья и каждая следующая имеют `technicalFailureBand='repeated'` и типом требуют конкретный `alternateRouteId`;
- typed fallback не выдаёт `voiceEvidence`;
- accessibility alternative может давать эквивалентные completion, performance и access, а также assessed learning evidence для construct, который её input действительно измеряет; для каждого неизмеренного spoken/listening/другого tuple после attempt ref runtime создаёт нормативный `LearningNonAssessmentBody{assessmentStatus:'not_assessed_accessibility'}` документа 05. Один envelope поэтому может содержать и assessed, и non-assessment refs, но typed route никогда не подменяет неизмеренный construct;
- current transcript score не маркируется как phoneme/acoustic evidence;
- критическая ошибка в маршруте, аллергии, оплате или правилах создаёт короткий repair node, а не полный reset episode;
- AI reply сам по себе не доказывает достижение цели; Club scoring использует явные objectives и input source;
- keyboard completion в Club не выдаёт voice-specific evidence.

### 3.4 Attempt envelope

```ts
// LearningEvidenceRef and LearningNonAssessmentRef are canonical imports from
// document 05. They can only be created after CanonicalAttemptRef exists.
export type V2AttemptTupleObservation =
  | {
      source: 'objective_outcome';
      targetKind: 'objective';
      targetId: string;
      observed: 'met' | 'missed';
    }
  | {
      source: 'semantic_slot_outcome';
      targetKind: 'semantic_slot';
      targetId: string;
      observed: 'met' | 'missed';
    }
  | {
      source: 'critical_constraint_outcome';
      targetKind: 'critical_constraint';
      targetId: string;
      observed: 'met' | 'missed';
    }
  | {
      source: 'speech_feature_observation';
      targetKind: LearningAssessmentTarget['targetKind'];
      targetId: string;
      speechConstruct: V2SpeechConstruct;
      observed: 'meets_target' | 'needs_work';
    };

export type V2AttemptAssessedInputBinding =
  | {
      construct: 'spoken';
      input: {
        source: 'microphone';
        speechLocale: string;
        evaluatorProvenance: V2EvaluatorProvenance;
        calibrationReceiptRef: SpeechCalibrationReceiptRef;
        calibrationScopeRef: SpeechCalibrationScopeRef;
      };
    }
  | {
      construct: 'listening';
      input: {
        source: 'tap' | 'word_bank' | 'keyboard';
        answerRevealingCaptionUsed: false;
      };
    }
  | {
      construct: 'semantic' | 'recall' | 'interaction';
      input:
        | {
            source: 'microphone';
            speechLocale: string;
            evaluatorProvenance: V2EvaluatorProvenance;
            calibrationReceiptRef: SpeechCalibrationReceiptRef;
            calibrationScopeRef: SpeechCalibrationScopeRef;
          }
        | {
            source: 'tap' | 'word_bank' | 'keyboard' | 'accessibility_alternative';
          };
    };

type V2AttemptLearningTupleBase = {
  [P in LearningEvidencePhase]: V2NodeEvidenceDeclaration & {
    phase: P;
    nodeId: string;
    pedagogicalProvenance: Extract<
      LearningPedagogicalProvenance,
      { phase: P }
    >;
  };
}[LearningEvidencePhase];

export type V2AttemptLearningTupleDisposition =
  | (V2AttemptLearningTupleBase & {
      disposition: 'assessed_candidate';
      observation: V2AttemptTupleObservation;
      candidateOutcome: 'success' | 'needs_work';
      inputBinding: V2AttemptAssessedInputBinding;
    })
  | (V2AttemptLearningTupleBase & {
      disposition: 'non_assessment_candidate';
      observation?: never;
      candidateOutcome?: never;
      inputBinding?: never;
      attemptedInputSource:
        | 'microphone'
        | 'tap'
        | 'word_bank'
        | 'keyboard'
        | 'accessibility_alternative';
      assessmentStatus:
        | 'not_assessed_accessibility'
        | 'not_assessed_system'
        | 'invalid';
      reasonCode:
        | 'accessibility_route_does_not_measure_construct'
        | 'uncertain_measurement'
        | 'invalid_audio_or_system'
        | 'technical_failure'
        | 'support_or_hint_contract_violated';
    })
  | (V2AttemptLearningTupleBase & {
      disposition: 'no_record';
      observation?: never;
      candidateOutcome?: never;
      inputBinding?: never;
      attemptedInputSource?: never;
      reasonCode: 'skipped_by_learner';
    });

// Client-observed delayed candidates are not terminal learning dispositions.
// In particular, the client cannot mint not_assessed_system/window status.
export type V2DelayedClientTupleDisposition =
  | Extract<
      V2AttemptLearningTupleDisposition,
      { disposition: 'assessed_candidate' }
    >
  | (V2AttemptLearningTupleBase & {
      disposition: 'non_assessment_candidate';
      observation?: never;
      candidateOutcome?: never;
      inputBinding?: never;
      attemptedInputSource:
        | 'microphone'
        | 'tap'
        | 'word_bank'
        | 'keyboard'
        | 'accessibility_alternative';
      assessmentStatus: 'not_assessed_accessibility';
      reasonCode: 'accessibility_route_does_not_measure_construct';
    })
  | (V2AttemptLearningTupleBase & {
      disposition: 'non_assessment_candidate';
      observation?: never;
      candidateOutcome?: never;
      inputBinding?: never;
      attemptedInputSource:
        | 'microphone'
        | 'tap'
        | 'word_bank'
        | 'keyboard'
        | 'accessibility_alternative';
      assessmentStatus: 'invalid';
      reasonCode:
        | 'uncertain_measurement'
        | 'invalid_audio_or_system'
        | 'technical_failure'
        | 'support_or_hint_contract_violated';
    })
  | Extract<
      V2AttemptLearningTupleDisposition,
      { disposition: 'no_record' }
    >;

// Immutable server resolution carried by an exact timing/failure receipt.
// It maps, but never rewrites, the hash-pinned delayed client candidate.
export type V2DelayedTerminalTupleResolution =
  | (V2AttemptLearningTupleBase & {
      sourceCandidateDisposition: 'assessed_candidate';
      terminalDisposition: 'assessed';
      observation: V2AttemptTupleObservation;
      outcome: 'success' | 'needs_work';
      inputBinding: V2AttemptAssessedInputBinding;
      assessmentStatus?: never;
      reasonCode?: never;
    })
  | (V2AttemptLearningTupleBase & {
      sourceCandidateDisposition: 'non_assessment_candidate';
      terminalDisposition: 'non_assessment';
      observation?: never;
      outcome?: never;
      inputBinding?: never;
      assessmentStatus: 'not_assessed_accessibility' | 'invalid';
      reasonCode:
        | 'accessibility_route_does_not_measure_construct'
        | 'uncertain_measurement'
        | 'invalid_audio_or_system'
        | 'technical_failure'
        | 'support_or_hint_contract_violated';
    })
  | (V2AttemptLearningTupleBase & {
      sourceCandidateDisposition:
        | 'assessed_candidate'
        | 'non_assessment_candidate';
      terminalDisposition: 'non_assessment';
      observation?: never;
      outcome?: never;
      inputBinding?: never;
      assessmentStatus: 'not_assessed_for_window';
      reasonCode: 'outside_pinned_assessment_window';
    })
  | (V2AttemptLearningTupleBase & {
      sourceCandidateDisposition:
        | 'assessed_candidate'
        | 'non_assessment_candidate';
      terminalDisposition: 'non_assessment';
      observation?: never;
      outcome?: never;
      inputBinding?: never;
      assessmentStatus: 'not_assessed_system';
      reasonCode: V2DelayedProbeSystemFailureReasonCode;
    })
  | (V2AttemptLearningTupleBase & {
      sourceCandidateDisposition: 'no_record';
      terminalDisposition: 'no_record';
      observation?: never;
      outcome?: never;
      inputBinding?: never;
      assessmentStatus?: never;
      reasonCode: 'skipped_by_learner';
    });

export interface V2AttemptEventBodyBase {
  schemaVersion: 'v2-attempt-body.v1';
  opId: string;
  stableId: string;
  accountGeneration: number;
  seasonId: string;
  chapterId: string;
  episodeId: string;
  nodeId: string;
  activityId: string;
  attemptSurface:
    | { kind: 'episode_graph_node' }
    | {
        kind: 'scheduled_delayed_probe';
        assignmentRef: V2DelayedProbeAssignmentRef;
        launchReceiptRef: V2DelayedProbeLaunchReceiptRef;
        probeRef: V2DelayedProbeRef;
      };
  starSlotId?: string;
  progressCompatibilityKey: string;
  releaseId: string;
  contentHash: string;
  activityTypeKey: ActivityTypeKey;
  kernelVersion: number;
  templateId: string;
  templateVersion: number;
  templateContentHash: string;
  payloadSchemaVersion: number;
  policies: V2RuntimePolicyRefs;
  mandatoryLearningRetriesUsed: 0 | 1 | 2;
  technicalRetryCount: number;
  durationMs: number;
  occurredAtClient: string;
}

export type V2AttemptEvidenceOutcome =
  | {
      evidence: V2ConfidentVoiceEvidenceEnvelope;
      outcome: Extract<
        V2OutcomeDecision,
        { resultCode: 'PASS_CONFIDENT' | 'NEEDS_WORK_CONFIDENT' }
      >;
    }
  | {
      evidence: V2NeutralVoiceEvidenceEnvelope;
      outcome: Extract<
        V2OutcomeDecision,
        { resultCode: 'UNCERTAIN' | 'INVALID_AUDIO_OR_SYSTEM' }
      >;
    }
  | {
      evidence: V2NonVoiceEvidence;
      outcome: Extract<
        V2OutcomeDecision,
        { resultCode: 'CORRECT' | 'WRONG' | 'COMPLETED' }
      >;
    }
  | {
      evidence: V2NonVoiceEvidence;
      outcome: Extract<V2OutcomeDecision, { resultCode: 'SKIPPED' }>;
    };

export type V2GraphAttemptEventBody = Omit<
  V2AttemptEventBodyBase,
  'attemptSurface'
> & {
  attemptSurface: { kind: 'episode_graph_node' };
  learningTupleDispositions: V2AttemptLearningTupleDisposition[];
} & V2AttemptEvidenceOutcome;

export type V2DelayedAttemptEventBody = Omit<
  V2AttemptEventBodyBase,
  'attemptSurface'
> & {
  attemptSurface: Extract<
    V2AttemptEventBodyBase['attemptSurface'],
    { kind: 'scheduled_delayed_probe' }
  >;
  learningTupleDispositions: V2DelayedClientTupleDisposition[];
} & V2AttemptEvidenceOutcome;

// Hashable body: it contains runtime evidence/outcome and graph-final or
// delayed-client candidate tuples, but no learning record/ref, attempt ref,
// server terminal resolution or self hash.
export type V2AttemptEventBody =
  | V2GraphAttemptEventBody
  | V2DelayedAttemptEventBody;

export interface CanonicalAttemptRef {
  schemaVersion: 'v2-attempt-ref.v1';
  opId: string;
  attemptBodyHash: string;
  releaseId: string;
  contentHash: string;
}

interface V2AttemptEventEnvelopeBase {
  schemaVersion: 'v2-attempt-envelope.v1';
  attemptRef: CanonicalAttemptRef;
  learningEvidenceRefs: LearningEvidenceRef[];
  learningNonAssessmentRefs: LearningNonAssessmentRef[];
}

// Ledger join envelope. It is never canonical-hashed as one object; integrity
// is checked per attempt body/ref, exact materialization basis and each learning
// body/ref. Delayed terminal resolution lives in the immutable receipt, not in
// the already hashed client body.
export type V2AttemptEvent = V2AttemptEventEnvelopeBase &
  (
    | {
        attemptBody: V2GraphAttemptEventBody;
        materializationBasis: { kind: 'graph_attempt_body' };
      }
    | {
        attemptBody: V2DelayedAttemptEventBody;
        materializationBasis:
          | {
              kind: 'delayed_timing_receipt';
              timingReceiptRef: V2DelayedProbeTimingReceiptRef;
            }
          | {
              kind: 'delayed_system_failure_receipt';
              failureReceiptRef: V2DelayedProbeFailureReceiptRef;
            };
      }
  );

// Two-phase input for scheduler-owned delayed evidence. It deliberately has no
// learning refs because only the server can attest the assessment window.
export interface V2DelayedAttemptCandidate {
  schemaVersion: 'v2-delayed-attempt-candidate.v1';
  attemptBody: V2DelayedAttemptEventBody;
  attemptRef: CanonicalAttemptRef;
}

export interface V2DelayedProbeFailureReceiptRef {
  failureReceiptId: string;
  contentHash: string;
}

export type V2DelayedAttemptAcknowledgement =
  | {
      schemaVersion: 'v2-delayed-attempt-ack.v2';
      decision: 'timed_finalized';
      attemptRef: CanonicalAttemptRef;
      timingReceiptRef: V2DelayedProbeTimingReceiptRef;
      failureReceiptRef?: never;
      finalizedEvent: V2AttemptEvent & {
        attemptBody: V2DelayedAttemptEventBody;
        materializationBasis: {
          kind: 'delayed_timing_receipt';
          timingReceiptRef: V2DelayedProbeTimingReceiptRef;
        };
      };
      serverMaterialized: true;
    }
  | {
      schemaVersion: 'v2-delayed-attempt-ack.v2';
      decision: 'system_non_assessment_finalized';
      attemptRef: CanonicalAttemptRef;
      timingReceiptRef?: never;
      failureReceiptRef: V2DelayedProbeFailureReceiptRef;
      finalizedEvent: V2AttemptEvent & {
        attemptBody: V2DelayedAttemptEventBody;
        materializationBasis: {
          kind: 'delayed_system_failure_receipt';
          failureReceiptRef: V2DelayedProbeFailureReceiptRef;
        };
      };
      serverMaterialized: true;
    }
  | {
      schemaVersion: 'v2-delayed-attempt-ack.v2';
      decision: 'protocol_rejected';
      attemptRef: CanonicalAttemptRef;
      timingReceiptRef?: never;
      failureReceiptRef: V2DelayedProbeFailureReceiptRef;
      finalizedEvent?: never;
      serverMaterialized: false;
    };
```

Канонический порядок не допускает цикла: (1) `sanitizeAttemptBody` создаёт hash-free `V2GraphAttemptEventBody` с graph-final dispositions либо `V2DelayedAttemptEventBody` только с client-observed candidates; (2) `CanonicalAttemptRef.attemptBodyHash = sha256(canonicalJsonV1(attemptBody))`; (3a) graph materializer разрешает dispositions напрямую, а (3b) delayed server создаёт immutable timing/system-failure receipt с исчерпывающими `terminalTupleResolutions`, не меняя уже хешированный body; (4) из body + exact declaration + materialization basis создаются hash-free `LearningEvidenceBody`/`LearningNonAssessmentBody` документа 05 и собственные refs; (5) нехэшируемый `V2AttemptEvent` envelope соединяет original body/ref, exact graph/receipt basis и learning refs. `CanonicalRuntimeEvidenceRef.runtimeEvidenceHash` отдельно равен `sha256(canonicalJsonV1(attemptBody.evidence))` и pin-ит тот же `CanonicalAttemptRef`; materializer отклоняет подмену evidence другой попыткой. Запрещено хэшировать envelope, включать learning refs/server resolution в attempt body, менять body после receipt или вычислять learning body до attempt ref и, для delayed, до terminal receipt.

Одна finalized attempt содержит `0..N` assessed refs и `0..N` non-assessment refs. Для graph `learningTupleDispositions` содержит **ровно одну** запись на каждую declaration exact published node и ни одной лишней: `assessed_candidate` связывается с одним ID-only outcome того же target и детерминированным mapping `met|meets_target → success`, `missed|needs_work → needs_work`; её `inputBinding.construct` обязан равняться declaration construct, а source/evaluator/calibration receipt+scope — существовать в том же immutable runtime evidence envelope. Для spoken/acoustic construct observation дополнительно обязан быть exact `speech_feature_observation` из sanitized speech-features layer; один semantic objective outcome без него не может стать spoken evidence. `non_assessment_candidate` создаёт соответствующий diagnostic; `no_record` допустим только для `SKIPPED`. Node без declarations имеет пустой массив. Для любого не-`SKIPPED` graph outcome каждая declaration обязана стать assessed либо non-assessment ref; для `SKIPPED` каждая declaration имеет `no_record`, а refs отсутствуют. Их объединённый набор уникален по `nodeId + objectiveId + skillId + construct + phase + targetKind + targetId` и индексируется только общим collision-free `buildLearningEvidenceTupleKey`; ref разрешается в body с тем же `sourceAttempt`, tuple и content hash. Duplicate, assessed/non-assessed collision, missing/unknown disposition, observation-target/input mismatch и превышение cardinality fail-closed. `UNCERTAIN`/`INVALID_AUDIO_OR_SYSTEM` создают только typed non-assessment bodies/refs. Accessibility attempt может создать assessed refs для exact tuples, реально измеряемых её input route, и одновременно `not_assessed_accessibility` refs для остальных declared tuples; non-voice route типом не может создать spoken/acoustic evidence.

`attemptBody.evidence.hintsUsed` — единственный canonical attempt-wide факт о подсказках; дублирующего `V2AttemptEventBodyBase.hintsUsed` нет. `pedagogicalProvenance.support.hintsUsed` каждой graph disposition или delayed candidate обязан точно равняться ему, а не просто попадать в общий bound. Для `independent_probe` и `delayed_probe` parser дополнительно требует literal `0`; body с evidence hints `>0`, скрытым как provenance `0`, отклоняется до хэширования/materialization и не может создать assessed либо non-assessment learning record. Для encounter/near-transfer exact факт затем проверяется против published maximum. То же exact-equality правило действует для answer exposure и остальных actual support facts.

Graph-node ветка может materialize learning bodies/refs локально после `CanonicalAttemptRef`, потому что declaration и per-tuple disposition сверяются с exact published node/activity: phase/context/prompt actual provenance совпадают, а support/hints/exposure удовлетворяют опубликованным bounds. `declaration.phase` обязана равняться node phase; optional-review node не имеет declarations. Поэтому training/near-transfer attempt нельзя переименовать в independent evidence.

Scheduled delayed ветка всегда двухфазная. Client атомарно сохраняет и отправляет только `V2DelayedAttemptCandidate`; её `learningTupleDispositions` — candidates, не terminal mapping, и типом не содержат `not_assessed_system`/`not_assessed_for_window`. Server receipt содержит ровно одну `V2DelayedTerminalTupleResolution` на каждый exact candidate/declaration и ни одной лишней. Для `inside_pinned_window`: assessed candidate сохраняет observation/input и становится assessed `success|needs_work`, client non-assessment остаётся accessibility/invalid, `no_record` остаётся `no_record`. Для `outside_pinned_window` каждый не-`no_record` candidate становится `not_assessed_for_window`; для system-failure receipt каждый не-`no_record` candidate становится `not_assessed_system`; `SKIPPED/no_record` никогда не материализуется в learning ref. Receipt hash immutable pin-ит mapping, а `finalizedEvent.materializationBasis` обязан указывать ровно этот receipt; объединённый learning-ref set должен 1:1 совпасть с terminal resolutions. Protocol-rejection receipt не содержит resolutions, finalized event или learning refs. Так server не переписывает candidate body и ранний `assessed_candidate` не превращается в evidence без server timing.

Server создаёт `timed_finalized`, `system_non_assessment_finalized` для missing/stale assignment либо missing/expired launch после валидной account/probe binding, или terminal `protocol_rejected` для account/probe/template/declaration/hash substitution. Все три ветки очищают pending candidate exact старого account namespace; только timed inside-window branch может дать assessed delayed evidence, а protocol rejection уходит в quarantine. До ack client показывает completion как pending sync и не обновляет durable mastery/DTS. Client никогда не добавляет receipt задним числом в attempt body и не создаёт delayed learning refs самостоятельно.

Для starless node `candidatePerformanceStars` всегда `0`, а `starSlotId` отсутствует. При `episode_graph_node` поле `nodeId` показывает место попытки в DAG; при `scheduled_delayed_probe` оно обязано равняться scheduler-owned `probeNodeId` exact definition и никогда не считается graph node. `activityId` в обеих ветках указывает конкретное immutable упражнение. Телеметрия и progress merge не подменяют один ID другим. Sanitizer сохраняет layered bands, ID-only target outcomes, typed reason codes, policy/receipt provenance и решения, но удаляет raw audio, распознанный/отредактированный transcript, actual semantic-slot value и любой свободный текст.

## 4. Season и episode graph

### 4.1 Localized text и translation units

Все пользовательские подписи, инструкции, подсказки, значения can-do и learner-language explanations проходят через стабильные translation units. Педагогическая target-language фраза хранится в phrase frame отдельно и не подменяется переводом интерфейса.

```ts
export type LocaleTag = string;

export interface LocalizedTextRef {
  translationUnitId: string;
  contentHash: string;
}

export interface V2TranslationUnitDraft {
  translationUnitId: string;
  sourceLocale: LocaleTag;
  sourceText: string;
  sourceHash: string;
  context: string;
  requiredLocales: LocaleTag[];
  translations: Record<LocaleTag, {
    text: string;
    status: 'draft' | 'needs_review' | 'changes_requested' | 'approved' | 'stale';
    reviewerId?: string;
  }>;
}

export interface LocalizedTextBody {
  sourceLocale: LocaleTag;
  values: Record<LocaleTag, string>;
}

export interface LocalizedTextRecord {
  translationUnitId: string;
  contentHash: string;
  hashAlgorithm: 'sha256';
  canonicalization: 'canonical-json.v1';
  body: LocalizedTextBody;
}

export type LocalizedText = LocalizedTextRecord;
```

Published bundle содержит только approved locales, immutable translation-unit hash и явный fallback locale. `LocalizedText` — resolved alias `LocalizedTextRecord`; hash считается только как `sha256(canonicalJsonV1(record.body))`, а `LocalizedTextBody` не содержит собственного hash/ref/record metadata. Изменение source text делает переводы stale; отсутствие обязательного перевода блокирует release, а не приводит к молчаливому смешиванию target/source language.

### 4.2 Учебные контракты эпизода

```ts
export interface V2ScenarioContract<TText = LocalizedText> {
  scenarioId: string;
  title: TText;
  setting: TText;
  learnerRole: TText;
  partnerRole: TText;
  communicativeGoal: TText;
  successCondition: TText;
  criticalConstraintIds: string[];
}

export interface V2PhraseFrame<TText = LocalizedText> {
  phraseFrameId: string;
  targetPattern: string;
  learnerMeaning: TText;
  semanticSlotIds: string[];
  skillIds: string[];
  required: boolean;
}

export interface V2SemanticSlot<TText = LocalizedText> {
  semanticSlotId: string;
  role: TText;
  acceptedTargetValues: string[];
  allowedContentUnitIds: string[];
  minimumDistinctValues: number;
  requiredInCapstone: boolean;
  critical: boolean;
}

export interface V2CapstoneContract {
  objectiveIds: string[];
  requiredSemanticSlotIds: string[];
  criticalConstraintIds: string[];
  primaryNodeIds: string[];
  deterministicAlternateNodeIds: string[];
}

export interface V2MasteryContract {
  evidencePolicyRef: VersionedPolicyRef<'evidence'>;
  requirements: Array<{
    objectiveId: string;
    construct: 'semantic' | 'listening' | 'recall' | 'spoken' | 'interaction';
    phase: 'near_transfer' | 'independent_probe' | 'delayed_probe';
    requiredValidity: 'assessed';
    requiredOutcome: 'success';
    maximumSupport: 'model' | 'full_text' | 'partial_cue' | 'visual_only' | 'none';
  }>;
  durableClaimRequiresDelayedProbe: true;
  accessibilityHandling: 'learning_non_assessment_no_failure';
  numericCutoffHypothesisRef: 'HYP-V2-003';
  performanceStarsAreLearningEvidence: false;
  confidentVoiceTurnCountAloneIsSufficient: false;
}

// Runtime projection is structurally identical to EpisodeLearningDesign in document 03.
export interface V2EpisodeLearningDesign {
  primaryOutcomeId: string;
  objectiveIds: string[];
  prerequisiteEdges: Array<{
    from: {
      kind: 'outcome' | 'objective';
      id: string;
      sourceEpisodeId: string;
    };
    toObjectiveId: string;
    requiredState: 'exposed' | 'supported_success' | 'independent_evidence';
  }>;
  supportPlan: Array<{
    objectiveId: string;
    initialSupport: 'model' | 'full_text' | 'partial_cue' | 'visual_only' | 'none';
    fadeRuleId: string;
    escalationRuleId: string;
  }>;
  independentProbeRef: string;
  delayedProbeRef: V2DelayedProbeRef;
  delayedWindowPolicyId: string;
}
```

`scenario`, `phraseFrames`, `semanticSlots`, `capstoneContract`, `masteryContract` и `learningDesign` — отдельные валидируемые поля, а не свободный prose внутри prompt. Именно они позволяют генератору собрать разные activity instances вокруг одной проверяемой речевой цели. `V2EpisodeLearningDesign` обязан оставаться структурно идентичным каноническому `EpisodeLearningDesign` документа 03; несовпадение schema fingerprint блокирует materialization.

`V2MasteryContract` агрегирует только нормативные `LearningEvidenceBody` records документа 05 по exact objective/construct/phase и versioned evidence policy. Performance/access stars, количество voice turns и completion сами по себе не являются mastery. Любой numeric cutoff остаётся `HYP-V2-003`; accessibility/outside-window non-assessment не считается ни success, ни failure, а durable claim невозможен без валидного in-window delayed probe.

### 4.3 Draft season и episode

Draft — mutable authoring state. У него нет `contentReleaseId`: релиз появляется только после approval, materialization, deterministic QA и seal. Season draft не встраивает изменяемые episode drafts; он закрепляет точные approved EpisodeRevision refs, чтобы изменение одного эпизода явно делало season validation/review stale.

```ts
export interface V2ChapterDefinition<TText = LocalizedText> {
  chapterId: string;
  ordinal: 1 | 2 | 3 | 4;
  title: TText;
  canDoOutcome: TText;
  episodeIds: string[];
  checkpointEpisodeId: string;
}

export interface V2EpisodeGateDefinition {
  gateId: string;
  targetEpisodeId: string;
  priorEpisodeId: string;
  localEarnedMinimum: number;
  requiredCumulativeAccess: number;
  requiresPriorLoopsComplete: true;
  requiredCheckpointEpisodeId?: string;
  accessBoostPolicyKey: string;
}

export interface V2LegacyMappingDefinition {
  legacyLessonId: number;
  evidenceTargetEpisodeIds: string[];
  mappingKind: 'placement_evidence_only' | 'content_source_only';
  grantsV2Checkpoint: false;
  grantsV2Stars: false;
}

// Canonical authoring contracts are defined once in
// 08-admin-content-studio-and-mode-authoring.md and imported by both runtimes.
export type V2EpisodeRevisionRef = SeasonEpisodeRevisionRef;
export type V2SeasonReleaseScope = SeasonReleaseScope;
export type V2SeasonDraft = SeasonDraft;
export type V2EpisodeDraft = EpisodeDraft;

// List/table projections preserve the canonical body/record/status envelope.
// They select fields from the nested canonical types instead of pretending
// that SeasonDraft/EpisodeDraft expose those fields at their top level.
export type V2SeasonDraftListItem = {
  body: Pick<
    SeasonDraft['body'],
    | 'schemaVersion'
    | 'draftId'
    | 'seasonId'
    | 'revision'
    | 'releaseScope'
    | 'gatePolicyVersion'
    | 'decisionRegistryRef'
  >;
  record: Pick<
    SeasonDraft['record'],
    | 'schemaVersion'
    | 'draftId'
    | 'seasonId'
    | 'revision'
    | 'fingerprint'
  >;
  status: SeasonDraft['status'];
};

export type V2EpisodeDraftListItem = {
  body: Pick<
    EpisodeDraft['body'],
    | 'schemaVersion'
    | 'draftId'
    | 'episodeId'
    | 'revision'
    | 'ordinal'
    | 'chapterId'
  >;
  record: Pick<
    EpisodeDraft['record'],
    | 'schemaVersion'
    | 'draftId'
    | 'episodeId'
    | 'revision'
    | 'fingerprint'
  >;
  status: EpisodeDraft['status'];
};
```

`SeasonDraft`, `EpisodeDraft`, `SeasonRevision`, `EpisodeRevision`, `SeasonEpisodeRevisionRef` и `SeasonReleaseScope` берутся без переобъявления из [канонической Content Studio спецификации](08-admin-content-studio-and-mode-authoring.md). Draft body/record schema keys — `season-draft-body.v1` / `season-draft-record.v1` и `episode-draft-body.v1` / `episode-draft-record.v1`; immutable revision body/record keys — `season-authoring-body.v1` / `season-authoring-record.v1` и `episode-authoring-body.v1` / `episode-authoring-record.v1`. List selectors сохраняют вложенные `body`, `record` и `status`; flattening является только UI view-model после runtime validation, не wire schema. Editing approved draft создаёт новую revision; оно не мутирует approved artifact и автоматически делает dependent episode graph, localization, preview и review fingerprints stale.

### 4.4 Published season и episode

Published-модели immutable и содержат только точные template versions/hashes, resolved translations и совместимые kernels.

```ts
export interface PublishedV2SeasonDefinition {
  schemaVersion: 'v2-season.v1';
  seasonId: string;
  publishedRevision: number;
  contentReleaseId: string;
  contentHash: string;
  releaseScope: V2SeasonReleaseScope;
  gatePolicyVersion: string;
  decisionRegistryRef: VersionRef;
  studyTarget: string;
  learnerSourceLocale: string;
  minAppVersion: string;
  title: LocalizedText;
  outcomeSummary: LocalizedText;
  intendedOutcome: {
    start: 'A0';
    end: 'strong_A1_early_A2';
    certificationClaim: false;
  };
  languageProfileId: string;
  chapters: V2ChapterDefinition[];
  episodes: PublishedV2EpisodeDefinition[];
  gates: V2EpisodeGateDefinition[];
  legacyMapping: V2LegacyMappingDefinition[];
}

export interface PublishedV2EpisodeDefinition {
  episodeId: string;
  publishedRevision: number;
  contentHash: string;
  ordinal: number;
  chapterId: string;
  title: LocalizedText;
  canDoOutcome: LocalizedText;
  progressCompatibilityKey: string;
  scenario: V2ScenarioContract;
  phraseFrames: V2PhraseFrame[];
  semanticSlots: V2SemanticSlot[];
  capstoneContract: V2CapstoneContract;
  masteryContract: V2MasteryContract;
  learningDesign: V2EpisodeLearningDesign;
  templateRefs: PublishedModeTemplateRef[];
  activities: V2ActivityInstance[];
  nodes: V2ActivityGraphNode[];
  delayedProbeDefinitions: V2ResolvedDelayedProbeDefinition[];
  startNodeId: string;
  edges: V2ActivityGraphEdge[];
  starSlots: V2StarSlotDefinition[];
  requiredLoops: V2RequiredLoopDefinition;
  assessmentNodes: V2AssessmentNodeDefinition;
  optionalNodeIds: string[];
  checkpointContract?: V2CheckpointContract;
  reviewLinks: V2ReviewLink[];
}

export interface V2ActivityGraphEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  condition:
    | 'completed'
    | 'passed'
    | 'needs_reinforcement'
    | 'fallback_selected';
}

export interface V2StarSlotDefinition {
  starSlotId: string;
  maxStars: 3;
  acceptedNodeIds: string[];
}

export interface V2RequiredLoopDefinition {
  encounterBuildNodeIds: string[];
  nearTransferNodeIds: string[];
}

export interface V2AssessmentNodeDefinition {
  independentProbeNodeIds: string[];
  optionalReviewNodeIds: string[];
}

export type V2ReviewLink =
  | {
      scheduleKind: 'optional_review';
      targetEpisodeId: string;
      delay: 'next_episode' | 'chapter_checkpoint';
      probeRef?: never;
      windowPolicyId?: never;
      skillIds: string[];
    }
  | {
      scheduleKind: 'delayed_probe';
      targetEpisodeId: string;
      delay: 'd_plus_1' | 'd_plus_7' | 'd_plus_21';
      probeRef: V2DelayedProbeRef;
      windowPolicyId: string;
      skillIds: string[];
    };

export interface V2DelayedProbeAssignmentRef {
  assignmentId: string;
  contentHash: string;
}

export interface V2DelayedProbeAssignmentBody {
  schemaVersion: 'v2-delayed-probe-assignment.v1';
  assignmentId: string;
  stableId: string;
  accountGeneration: number;
  releaseId: string;
  seasonRevision: { seasonId: string; revision: number; contentHash: string };
  targetEpisodeRevision: {
    episodeId: string;
    revision: number;
    contentHash: string;
  };
  probeRef: V2DelayedProbeRef;
  initialExposureAttemptRef: CanonicalAttemptRef;
  exposureOccurredAtServer: string;
  windowPolicyId: string;
  assessableWindowOpensAt: string;
  assessableWindowClosesAt: string;
  scheduledDeliveryAt: string;
}

export interface V2DelayedProbeAssignmentRecord {
  ref: V2DelayedProbeAssignmentRef;
  body: V2DelayedProbeAssignmentBody;
  createdAtServer: string;
}

export interface V2DelayedProbeLaunchReceiptRef {
  launchId: string;
  contentHash: string;
}

export interface V2DelayedProbeLaunchReceiptBody {
  schemaVersion: 'v2-delayed-probe-launch-receipt.v1';
  launchId: string;
  assignmentRef: V2DelayedProbeAssignmentRef;
  stableId: string;
  accountGeneration: number;
  probeRef: V2DelayedProbeRef;
  authorizedAtServer: string;
  expiresAtServer: string;
}

export interface V2DelayedProbeLaunchReceiptRecord {
  ref: V2DelayedProbeLaunchReceiptRef;
  body: V2DelayedProbeLaunchReceiptBody;
  createdAtServer: string;
}

export interface V2DelayedProbeTimingReceiptRef {
  timingReceiptId: string;
  contentHash: string;
}

export interface V2DelayedProbeTimingReceiptBody {
  schemaVersion: 'v2-delayed-probe-timing-receipt.v1';
  timingReceiptId: string;
  assignmentRef: V2DelayedProbeAssignmentRef;
  launchReceiptRef: V2DelayedProbeLaunchReceiptRef;
  attemptRef: CanonicalAttemptRef;
  acceptedAtServer: string;
  observedDelayMs: number;
  assessmentTiming: 'inside_pinned_window' | 'outside_pinned_window';
  windowPolicyId: string;
  terminalTupleResolutions: V2DelayedTerminalTupleResolution[];
}

export interface V2DelayedProbeTimingReceiptRecord {
  ref: V2DelayedProbeTimingReceiptRef;
  body: V2DelayedProbeTimingReceiptBody;
  createdAtServer: string;
}

export type V2DelayedProbeSystemFailureReasonCode =
  | 'assignment_missing'
  | 'assignment_stale'
  | 'launch_missing'
  | 'launch_expired'
  | 'server_timing_unavailable';

export type V2DelayedProbeProtocolRejectionReasonCode =
  | 'account_generation_mismatch'
  | 'probe_ref_mismatch'
  | 'activity_or_template_mismatch'
  | 'declaration_or_provenance_mismatch'
  | 'attempt_hash_mismatch';

export interface V2DelayedProbeFailureReceiptBody {
  schemaVersion: 'v2-delayed-probe-failure-receipt.v1';
  failureReceiptId: string;
  attemptRef: CanonicalAttemptRef;
  probeRef: V2DelayedProbeRef;
  claimedAssignmentRef: V2DelayedProbeAssignmentRef;
  claimedLaunchReceiptRef: V2DelayedProbeLaunchReceiptRef;
  decision:
    | {
        kind: 'system_non_assessment';
        reasonCode: V2DelayedProbeSystemFailureReasonCode;
        terminalTupleResolutions: V2DelayedTerminalTupleResolution[];
      }
    | {
        kind: 'protocol_rejection';
        reasonCode: V2DelayedProbeProtocolRejectionReasonCode;
        terminalTupleResolutions?: never;
      };
  rejectedAtServer: string;
}

export interface V2DelayedProbeFailureReceiptRecord {
  ref: V2DelayedProbeFailureReceiptRef;
  body: V2DelayedProbeFailureReceiptBody;
  createdAtServer: string;
}
```

`V2DelayedProbeDefinitionBody` не является graph node: `probeNodeId` живёт в отдельном scheduler namespace, не входит в `nodes`, `requiredLoops`, `starSlots` или checkpoint. Definition bind-ит exact ActivityInstance/template и delayed evidence declarations; `ref.contentHash = sha256(canonicalJsonV1(body))`. Season validator разрешает `learningDesign.delayedProbeRef` и каждый delayed `V2ReviewLink.probeRef` только в exact target EpisodeRevision, recompute-ит nested body hash и запрещает mutable/latest или строковый ref.

Scheduler создаёт immutable assignment из server-attested initial exposure и exact Season/Episode/probe refs, затем перед запуском выдаёт короткоживущий launch receipt. Для `attemptSurface.kind='scheduled_delayed_probe'` поля `nodeId`, `activityId`, template/payload/policy identity и candidate tuples обязаны byte-for-byte совпасть с resolved definition; actual per-tuple provenance обязан удовлетворять её exact context/prompt/support bounds, а canonical `attemptBody.evidence.hintsUsed` — точно совпадать с каждым tuple и быть `0`. Graph-node lookup для такого event запрещён. После приёма exact attempt server создаёт timing receipt с одной terminal resolution на каждый candidate; только `assessmentTiming='inside_pinned_window'` может разрешить assessed delayed evidence. Outside-window receipt отображает каждый non-skipped candidate в `not_assessed_for_window`, а `no_record` оставляет без ref. Body/ref/record для assignment и receipts проходят тот же canonical hash check; client time не участвует в timing classification. Отсутствующий/stale assignment или missing/expired launch после подтверждения account generation и exact probe definition создаёт immutable system-failure receipt с exhaustive non-skipped `not_assessed_system` resolutions и terminal `system_non_assessment_finalized` acknowledgement без timing receipt; `SKIPPED/no_record` снова остаётся ref-free. Finalized envelope сохраняет исходный candidate body/hash и pin-ит exact receipt как `materializationBasis`. Account-generation, probe/activity/template/declaration/provenance или attempt-hash mismatch создаёт отдельный `protocol_rejection` receipt/ack без resolution table, finalized event и learning refs; это quarantine, а не учебный diagnostic или фиктивный timing receipt.

`d_plus_1 | d_plus_7 | d_plus_21` в `V2ReviewLink.delay` — cadence доставки/review, а не автоматическая классификация evidence. DTS/durable mastery оценивается только когда server timing receipt подтверждает фактическую задержку внутри exact pinned `HYP-V2-007` window D+3…D+7 и выполнены остальные условия delayed probe. D+1, D+21 и любое фактическое время вне окна материализуют `LearningNonAssessmentBody{assessmentStatus:'not_assessed_for_window', reasonCode:'outside_pinned_assessment_window'}` и projection `not_assessed/outside_window`; они не создают delayed `LearningEvidenceBody`, не считаются failure и не могут дать checkpoint/mastery/DTS/durable success; union cadence при этом не меняется.

### 4.5 Checkpoint contract

```ts
export interface V2CheckpointContract {
  contractKind: 'chapter_assessment';
  coveredEpisodeIds: string[];
  assessedObjectiveIds: string[];
  assessmentNodeIds: string[];
  criticalSemanticSlotIds: string[];
  criticalConstraintIds: string[];
  evidenceRequirements: Array<{
    assessmentNodeId: string;
    objectiveId: string;
    skillId: string;
    construct: LearningConstruct;
    phase: 'independent_probe';
    target: LearningAssessmentTarget;
    requiredOutcome: 'success';
  }>;
  passPolicyKey: string;
  deterministicAlternateRoutes: Array<{
    primaryNodeId: string;
    alternateNodeId: string;
    assessedObjectiveIds: string[];
    evidenceTupleKeys: LearningEvidenceTupleKey[];
    aiIndependent: true;
    voiceEvidenceEquivalent: false;
  }>;
  criticalRepairRoutes: Array<{
    target:
      | { targetKind: 'semantic_slot'; targetId: string }
      | { targetKind: 'critical_constraint'; targetId: string };
    repairNodeId: string;
    reassessmentNodeId: string;
  }>;
}
```

Checkpoint — не activity family и не отдельный renderer. Контракт объединяет только independent-probe evidence обычных nodes в bounded projection документа 05. Каждый requirement — exact `assessmentNodeId + objectiveId + skillId + construct + phase='independent_probe' + targetKind + targetId` tuple и обязан byte-for-byte совпасть с `V2NodeEvidenceDeclaration` этой node. Каждый `criticalSemanticSlotId` и `criticalConstraintId` имеет ровно один critical requirement и ровно один targeted repair route; raw slot values, answers, transcript и PII в contract/projection запрещены. Scheduler-owned delayed records оценивают durable learning отдельно и никогда не входят в checkpoint pass/access gate.

Pass вычисляется, а не записывается флагом: non-critical requirements удовлетворяют exact `passPolicyKey`, а все critical slot/constraint targets обязаны иметь assessed `success`. Assessed `needs_work` critical target даёт только его declared repair и повторную independent assessment, но не reset главы. Missing observation оставляет checkpoint incomplete; accessibility/system/invalid non-assessment не считается failure/success и открывает equivalent alternate route. `not_assessed_for_window` принадлежит только delayed scheduler и validator запрещает помещать его или любой `phase='delayed_probe'` record в checkpoint projection. Каждая AI-assisted/Club node внутри обязательного assessment path имеет deterministic non-AI alternate с теми же objective/target tuples; typed alternate может завершить core assessment, но не выдаёт voice-specific mastery. Purchased access не входит в checkpoint projection.

### 4.6 Graph invariants

Admin и client validator проверяют:

- season draft закрепляет exact approved EpisodeRevision refs с совпадающими fingerprint/content hash для каждого ordinal своего `releaseScope`;
- `vertical_slice` содержит только E1 и разрешён лишь для lab/staging; `chapter_internal` содержит E1–E8 и checkpoint E8; production-eligible `full_season` содержит ordinals `1..32`, четыре chapter по восемь и checkpoints 8/16/24/32;
- ordinals внутри scope уникальны и непрерывны;
- episode 1 не имеет gate, а каждый следующий episode внутри scope имеет ровно один gate;
- `localEarnedMinimum` и `requiredCumulativeAccess` детерминированно совпадают с выбранным immutable `gatePolicyVersion` из документа 05; администратор выбирает policy version, но не вводит произвольную кривую;
- `decisionRegistryRef` разрешается через canonical `VersionRef` документа 08 в один immutable registry artifact с exact version/hash; season definition, release manifest и materialized bundle provenance обязаны pin-ить один и тот же ref;
- каждый `learningDesign.delayedWindowPolicyId` разрешается внутри pinned registry как `HYP-V2-007`, code-owned `V2_MAX_MANDATORY_LEARNING_RETRIES=2` — как `HYP-V2-002`, а `masteryContract.numericCutoffHypothesisRef` и применённые completion/independent/checkpoint cutoffs — как `HYP-V2-003`; отсутствующий decision, несовпадающее значение/version/hash или ссылка на другой registry блокирует materialization/seal/activation без admin override;
- release/seal validator обязан разрешить весь registry range `HYP-V2-001..008`: season/checkpoint shape (`001`), dosage и retry cap (`002`), learning/checkpoint cutoffs (`003`), star budget/award criteria (`004`), two-loop gate curve (`005`), Access Boost price/caps (`006`), delayed window/DTS policy (`007`) и rollout percentages/observation windows (`008`); episode validator проверяет используемое подмножество, но season seal не может пропустить ни одну из восьми областей;
- validator перечисляет primary path и каждую capability/accessibility alternate route, рассчитывает для каждой максимальные достижимые `candidatePerformanceStars` по уникальным slots и derived access stars и доказывает достижимость `localEarnedMinimum`/соответствующего gate; route, которая делает gate математически недостижимым, блокирует release;
- gate после checkpoint 8/16/24 содержит соответствующий `requiredCheckpointEpisodeId`;
- обычный episode имеет 8–9 visible nodes;
- ровно восемь gate-eligible star slots, по три stars;
- все node/activity/star-slot IDs уникальны в своих season namespaces;
- graph ацикличен;
- `startNodeId` существует;
- каждый node ссылается на существующий `activityId`, а каждый published activity — на точный immutable template version/hash;
- каждый node с `requiredForCore: true` достижим;
- все core-required branches сходятся к completion;
- альтернативы capability делят star slot с основной веткой;
- starless node не имеет `starSlotId`, всегда имеет `maxStars: 0` и не участвует в gates;
- gate-eligible node имеет `starSlotId`, `maxStars: 3`, а slot перечисляет её `nodeId`;
- обязательный network/AI node не является единственным core path;
- `requiredLoops` содержит только непустые `encounterBuildNodeIds` и `nearTransferNodeIds`: эти node имеют одноимённые `phase`, различны по prompt/context и следуют `fadeRuleId`; independent probe и optional review никогда не засчитываются как required loop;
- `assessmentNodes.independentProbeNodeIds` непустой и содержит только node с `phase: 'independent_probe'`; `optionalReviewNodeIds` содержит только node с `phase: 'optional_review'` и является подмножеством `optionalNodeIds`; если есть `checkpointContract`, то его `assessmentNodeIds` уникальны, непусты, равны множеству `evidenceRequirements[].assessmentNodeId` и являются подмножеством `assessmentNodes.independentProbeNodeIds`, а `assessedObjectiveIds` равны множеству `evidenceRequirements[].objectiveId`. Для каждого requirement соответствующие node, declaration и requirement имеют `phase: 'independent_probe'`; alternate/reassessment nodes, поставляющие checkpoint evidence, также входят в `independentProbeNodeIds`, тогда как training repair node сам не проектируется в checkpoint;
- каждая graph `V2NodeEvidenceDeclaration` и каждая delayed definition declaration ссылается только на objective/skill/semantic-slot/critical-constraint IDs exact episode contracts; tuple `nodeId + objectiveId + skillId + construct + phase + targetKind + targetId` уникален и получает key только через canonical JCS/base64url `buildLearningEvidenceTupleKey`, target `objective` равен `objectiveId`, каждая graph declaration имеет `declaration.phase === node.phase`, а `pedagogicalContextContract.phase` равна обоим. Optional-review node имеет пустые declarations; `phase='delayed_probe'` разрешена только внутри hash-verified `V2DelayedProbeDefinitionBody`, но не в graph node;
- `learningDesign.primaryOutcomeId/objectiveIds` разрешаются в episode contracts, support plan покрывает каждую objective ровно один раз, а fade/escalation rules существуют в versioned catalog;
- `prerequisiteEdges` образуют acyclic outcome/exposure DAG между опубликованными episode identities; самостоятельное производство нельзя требовать до `exposed`, а `independent_evidence` нельзя подменять supported success;
- `independentProbeRef` и typed/hash-pinned `delayedProbeRef` существуют, различаются друг от друга и от training prompts, указывают target construct, lower-support/new-context surface и accessibility route; `independentProbeRef` разрешается через `assessmentNodes.independentProbeNodeIds`, а не через required loop или review link; `delayedProbeRef` разрешается ровно в один `delayedProbeDefinitions` body/ref pair exact target EpisodeRevision;
- delayed probe не является graph-node loop или construct: он доставляется только scheduler link с `scheduleKind: 'delayed_probe'`, exact content-hashed `probeRef`, `windowPolicyId` и immutable assignment от server-attested exposure. Assignment/launch/timing receipts обязаны совпадать по account generation, release, Season/Episode revision, probe definition, activity/template identity и window; `V2AttemptEventBody.attemptSurface` обязан быть `scheduled_delayed_probe`. D+1/D+7/D+21 остаются cadence, assessable HYP-V2-007 window — D+3…D+7, а missing timing proof или out-of-window материализует только non-assessment/`outside_window` и не входит в mastery/checkpoint; optional review использует только `scheduleKind: 'optional_review'` и не создаёт delayed claim;
- `masteryContract.requirements` ссылаются только на objective, construct (`semantic | listening | recall | spoken | interaction`) и phase (`near_transfer | independent_probe | delayed_probe`), которые реально измеряет соответствующий probe; delayed — только phase, а resolved canonical `LearningNonAssessment` не удовлетворяет assessed requirement;
- checkpoint не вводит новую обязательную лексику/грамматику; его independent-only evidence requirements ровно совпадают с declared node tuples, каждый critical semantic-slot/constraint ID покрыт ровно одним requirement и repair route, а deterministic alternate покрывает те же non-voice-equivalent tuples; delayed scheduler tuple в checkpoint contract/index запрещён;
- checkpoint pass выводится только из bounded `checkpointEvidenceIndex`: все critical targets требуют assessed success, `needs_work` ведёт в targeted repair/reassessment, non-assessment — в alternate route, unobserved — в incomplete; boolean OR и purchased access запрещены;
- каждый contentUnitId разрешается;
- каждый scheduler review link ссылается на существующий episode/skill; delayed link дополнительно byte-for-byte совпадает с typed `learningDesign.delayedProbeRef`, разрешается в exact hash-verified delayed definition target EpisodeRevision и совпадает с `delayedWindowPolicyId`, а independent probe в `reviewLinks` запрещён;
- max duration/content limits укладываются в curriculum spec;
- `minAppVersion` поддерживает все `activityTypeKey`, kernel/template/payload schema versions и policy keys.

### 4.7 Минимальный JSON episode bundle

```json
{
  "schemaVersion": "lesson-bundle.v2",
  "lessonId": 1,
  "phrases": [],
  "vocabulary": [],
  "drills": [],
  "v2Episode": {
    "seasonId": "pilot-32-en-ru",
    "episodeId": "ep-01",
    "ordinal": 1,
    "chapterId": "chapter-01",
    "progressCompatibilityKey": "pilot.ep01.v1",
    "episode": {},
    "modeTemplates": [],
    "translationUnits": [],
    "contentUnits": {},
    "assetManifest": [],
    "requiredActivityTypes": [
      { "activityTypeKey": "visual.discovery.v1", "kernelVersion": 1 },
      { "activityTypeKey": "phrase.build.v1", "kernelVersion": 1 },
      { "activityTypeKey": "voice.repeat_compare.v1", "kernelVersion": 1 }
    ]
  }
}
```

Legacy fields остаются в superset, поэтому будущий legacy remote adapter может читать `phrases/vocabulary/drills`, а V2 — `v2Episode`.

## 5. Runtime engine

### 5.1 Слои

```text
V2CourseRepository
  ├─ release/catalog loader
  ├─ disk/memory cache
  └─ bundled fallback

V2EpisodeRuntime
  ├─ graph navigator
  ├─ capability resolver
  ├─ activity registry
  ├─ renderer shell
  ├─ evidence/scoring registry
  ├─ progress reducer/outbox
  └─ recovery scheduler
```

Screen получает synchronously hydrated last-known episode/session state. Он не показывает полноэкранный spinner вместо финальной геометрии. Network refresh выполняется тихо и не делает `setState`, если release/catalog не изменился.

### 5.2 Activity lifecycle

```text
preflight capabilities
  → choose primary/fallback branch
  → render prompt
  → explicit user input start
  → capture/submit
  → normalize evidence
  → evaluate versioned scoring policy
  → atomic local progress commit
  → feedback/retry/repair
  → graph transition
  → background sync
```

Runtime не должен:

- начинать запись автоматически после permission dialog;
- держать STT/TTS одновременно;
- оставлять recorder после blur/AppState/route change;
- использовать бесконечный animation loop без focus/AppState gate;
- писать progress из renderer;
- менять releaseId в середине activity;
- загружать все 32 episode bundles в память.

### 5.3 Voice Activity Shell seam

Каждый voice renderer использует один shell для:

- permission и fresh explicit start;
- audio session и route changes;
- hold/tap interaction policy;
- signal-quality precheck;
- capture watchdog;
- scripted/spontaneous task routing и transcript-origin handling;
- раздельные capture, recognition, speech-feature, pedagogy и reward layers;
- STT/acoustic provider provenance и calibration/data-policy gates;
- discriminated result taxonomy и typed retry reasons;
- TTS/STT mutual exclusion;
- cleanup при blur/background;
- максимум две mandatory learning retries, бесплатные technical retries и accessibility fallback.

Mode template задаёт разрешённую конфигурацию, а ActivityInstance — конкретный prompt/content payload; ни family, ни template не дублируют lifecycle state machine kernel.

## 6. Content release integration

### 6.1 Использовать существующий CourseRelease v1

Существующий `CourseRelease` требует четыре canonical surfaces: `lesson`, `quiz`, `flashcard`, `arena`. Добавление нового обязательного surface прямо в `CANONICAL_RELEASE_SURFACES` сломает sealing старых jobs и validators.

Для пилота V2 episode bundle публикуется как backward-compatible superset внутри `lesson` surface:

```text
course-releases/<releaseId>/lesson/index.json
course-releases/<releaseId>/lesson/1.json
...
course-releases/<releaseId>/lesson/32.json
```

`course-release.v1` и остальные surfaces остаются валидными. `lesson/<id>.json` получает `schemaVersion=lesson-bundle.v2` и поле `v2Episode`. Новый обязательный surface допускается только в отдельном `course-release.v2` с dual-version validator, но для pilot он не нужен.

### 6.2 Stage-to-release adapter

```ts
export interface V2EpisodeBundleAdapterInput {
  releaseId: string;
  studyTarget: string;
  learnerSourceLocale: string;
  lessonId: number;
  legacyLessonArtifact: LessonArtifact;
  seasonDefinitionRef: string;
  decisionRegistryRef: VersionRef;
  episodeDefinition: PublishedV2EpisodeDefinition;
  modeTemplates: PublishedModeTemplate[];
  translationUnits: LocalizedText[];
  contentUnits: Record<string, V2ContentUnit>;
  assetManifest: V2AssetManifestEntry[];
  dependencyHashes: string[];
}
```

Adapter:

1. валидирует legacy lesson artifact и V2 episode отдельно;
2. убеждается, что locale/release/episode identity совпадают;
3. собирает deterministic JSON superset;
4. canonicalizes property order/normalization;
5. пишет immutable object;
6. получает SHA-256, object generation и byte size;
7. добавляет unit в существующий lesson index;
8. не меняет approved source artifacts;
9. фиксирует engine/stage versions и canonical `V2BundleAuthoringProvenance` документа 08, включая тот же exact `decisionRegistryRef`.

### 6.3 Published manifest seam

Текущий `getPublishedCourseRelease` возвращает активный release, но клиент его пока не потребляет. Единственные canonical hashable release schemas — `V2SeasonReleaseManifestBody`, `V2SeasonReleaseManifestRecord` и `V2SeasonReleasePointer` из документа 08 §19.2; они генерируются из общего contract corpus и не переопределяются здесь второй ослабленной формой. V2 client использует additive resolved read view поверх exact body/record/pointer:

```ts
export interface PublishedV2SeasonManifest {
  schemaVersion: 'published-v2-season-manifest-view.v1';
  catalogRevision: number;
  manifestBody: V2SeasonReleaseManifestBody;
  manifestRecord: V2SeasonReleaseManifestRecord;
  activePointer: V2SeasonReleasePointer;
  release: CourseRelease;
  gatePolicyVersion: string;
  resolvedVoiceReleaseGates: {
    calibrationReceipts: SpeechCalibrationReceiptRef[];
    dataPolicies: VoiceDataPolicyRef[];
    supportManifests: readonly [
      {
        ref: AppCapabilitySupportManifestRef;
        body: AppCapabilitySupportManifestBody;
      },
      {
        ref: AppCapabilitySupportManifestRef;
        body: AppCapabilitySupportManifestBody;
      },
    ];
    networkEgress: Array<{
      ref: VoiceNetworkEgressRef;
      body: VoiceNetworkEgressBody;
    }>;
  };
}
```

`resolvedVoiceReleaseGates` — только удобный server-resolved read model, не canonical artifact и не доверенный replacement refs из `manifestBody`. Server строит его заново из exact SeasonRevision/templates и принимает только когда: оба support manifest ref byte-for-byte равны `manifestBody.supportManifestRefs`; `networkEgress[].ref` после dedupe равны `manifestBody.voiceNetworkEgressRefs`; каждый egress ref присутствует в обоих platform support manifests и подтверждает безопасный dispatch lifecycle/finality/deletion binding. Body/record/pointer/release и resolved bodies проверяются до выдачи ответа и повторно при activation/loader validation.

Identity всегда включает:

```text
manifestBody.studyTarget + manifestBody.learnerSourceLocale +
manifestBody.seasonId + manifestBody.releaseId
```

Нельзя выбирать release только по target или только по source locale.

## 7. Loader, cache, hash и offline

### 7.1 Loader sequence

1. Синхронно вернуть memory/disk last-known-good для первого кадра.
2. Получить active pointer, exact manifest record/body и CourseRelease с TTL и quiet revalidation.
3. Проверить pointer → record → body hash/identity chain, `catalogRevision`, target/source/season/release identity и server-owned environment/scope eligibility.
4. Проверить `minAppVersion`, required activity kernels, template versions/hashes, payload schemas и exact `decisionRegistryRef`; manifest/season/bundle refs должны совпасть, а registry body — пройти content-hash validation.
5. Разрешить ровно один iOS и один Android `supportManifestRef` exact environment/minAppVersion, затем проверить, что `voiceNetworkEgressRefs` равны deduplicated union фактически используемых network templates, присутствуют в обоих support manifests и подтверждают `reservation-consume-settle-reconcile.v1 + terminal-no-future-writes.v1 + operation-target-settlement-hash.v1`.
6. Скачать lesson index по `entryIndex`.
7. Проверить SHA-256 index из `release.artifacts.lesson.contentHash`.
8. Разобрать index через существующий strict delivery contract.
9. Найти unit конкретного episode.
10. Скачать unit, проверить unit SHA-256 и object generation.
11. Ограничить bytes до parse, затем провести JSON/schema/semantic validation.
12. Проверить asset manifest и полную kernel/template/payload compatibility.
13. Записать temp file, fsync/close и атомарно переключить pointer.
14. Только после полной проверки сделать release last-known-good.

Hash mismatch, identity mismatch, invalid JSON, unsupported schema, missing kernel или несовместимый template hash никогда не перезаписывают рабочий cache.

### 7.2 Cache keys

```text
v2-content/<target>/<source>/<releaseId>/<surface>/<episodeId>/<contentHash>/<objectGeneration>
v2-manifest/<target>/<source>/<seasonId>/<releaseId>/<manifestHash>
v2-active-pointer/<target>/<source>/<seasonId>
```

`catalogRevision` проверяется как атрибут exact pointer/read view, но не участвует в immutable manifest cache identity: релизы A и B одного сезона могут законно использовать одну capability-catalog revision. `releaseId + manifestHash` позволяет одновременно хранить active и previous LKG, исключает overwrite при A→B и делает rollback точным.

Memory cache имеет max entries/TTL. Disk retention:

- active release;
- previous last-known-good;
- release текущей незавершённой session;
- не более двух обычных releases на locale pair;
- media LRU с начальным cap около 250 MB;
- raw generation sources в app cache не попадают.

Нет 30-дневного expiry: проверенный cached episode остаётся доступным offline, пока пользователь сам не очистил данные или eviction не оставил гарантированный fallback.

### 7.3 Delivery access

`storage.rules` сейчас default-deny для `course-releases/**`. Для пилота рекомендуется read-only authenticated path:

```text
match /course-releases/{allPaths=**} {
  allow get: if request.auth != null;
  allow list, write: if false;
}
```

Приложение уже обеспечивает anonymous/provider auth. Если продукт решит, что content bytes являются строго premium-protected, вместо общего authenticated get используется callable с entitlement check и короткоживущим signed URL. Этот выбор не меняет hash/cache contract.

### 7.4 Offline behavior

- bundled episode 1 является bootstrap/fallback;
- cached active episodes открываются без сети;
- current episode загружается по запросу;
- следующий episode prefetch выполняется только после current validation и по network policy;
- chapter bundle — пользовательская явная загрузка, не обязательный 70–80 MB пакет;
- при отсутствии uncached content UI показывает конкретную download/retry state в финальной геометрии;
- AI activity имеет deterministic non-AI alternate path для core progression;
- progress привязан к stable IDs/compatibility key, а не к локальному файлу.

## 8. Activation и rollback

Существующие механизмы `content_factory_catalog`, revision check, immutable release membership, activation history и rollback сохраняются.

Дополнительные V2 правила:

1. Runtime pin фиксирует `releaseId` при входе в activity/episode session.
2. Новый active release применяется только при следующем безопасном входе.
3. Rollback не удаляет cache старого/нового release немедленно.
4. Progress не откатывается вместе с content.
5. Совместимые activities переносят best по compatibility key.
6. Несовместимые получают новый key, но ранее открытый episode остаётся grandfathered.
7. `gatePolicyVersion` и `decisionRegistryRef` pin-ятся для enrollment; content rollback не меняет задним числом цену/curve, уже выданные unlock receipts или интерпретацию прошлых attempts.
8. Более строгая policy применяется только к новым enrollment; старые unlock не отзываются.
9. Kill switch может отключить remote content и вернуть bundled/legacy path без удаления V2 data.
10. Rollback drill обязателен до controlled cohort.
11. `vertical_slice` и `chapter_internal` могут активироваться только для lab/internal staging cohorts; production cohort принимает только `full_season`.
12. Activation повторно проверяет canonical `manifestBody.supportManifestRefs + manifestBody.voiceNetworkEgressRefs`, строит их exact resolved union из двух platform manifests и network templates, затем разрешает calibration/data-policy gates из точных voice templates/evaluator provenance; missing, stale, expired, unsupported lifecycle или несовпадающий non-waivable ref/receipt блокирует voice activation и включает только объявленный guided/non-voice fallback.
13. Activation повторно разрешает exact `decisionRegistryRef`, сверяет hash и release-validation receipt для всех `HYP-V2-001..008`; missing/mismatch блокирует весь V2 release, а не только отдельный renderer.

## 9. Admin generator

Админ-генератор расширяется до Content Studio: один и тот же authoring flow создаёт безопасные mode templates, конкретные ActivityInstances, episode graph, SeasonRevision с exact episode refs и звёздными воротами, переводы и release. Детальная IA, экраны, права, поля и E2E-путь фиксируются в `08-admin-content-studio-and-mode-authoring.md`; настоящий документ остаётся нормативным источником runtime/release contracts.

### 9.1 Поверхности Content Studio

- **Mode Library:** каталог kernels и опубликованных/draft mode templates, compatibility и usage impact.
- **Activity Editor внутри Episode Builder:** создание конкретных упражнений из шаблона, payload validation и эталонные ответы; graph-owned stars/phase/fallback здесь не редактируются.
- **Episode Builder:** scenario, phrase frames, semantic slots, instances, DAG, два required loops, independent assessment nodes, optional review, star slots, capstone/mastery и checkpoint contract.
- **Season workspace внутри страницы «Сезоны и эпизоды»:** scope-specific exact approved EpisodeRevision refs и `decisionRegistryRef`; production `full_season` содержит 32/4×8/checkpoints, а gate table всегда рассчитывается из code-owned policy pinned тем же registry.
- **Preview Lab:** prompt, active, processing, success, needs-work и recovery на поддерживаемых device profiles; HTML mock не считается runtime parity proof.
- **Translations:** translation units, source-change staleness, locale coverage и approval.
- **Review Queue:** machine issues, content diff, dependency hashes, reviewer decision и audit trail.
- **Releases:** materialize → seal → activate → rollback без редактирования immutable artifacts.

Новая UI-механика не создаётся no-code. Разработчик регистрирует kernel; администратор создаёт его безопасные шаблоны и сколько угодно content instances без app release, пока совместимость уже поддерживается установленной версией приложения.

### 9.2 Новые stage kinds

```ts
export type V2GenerationStageKind =
  | 'v2_season_outline'
  | 'v2_episode_outline'
  | 'v2_scene_set'
  | 'v2_dialogue_script'
  | 'v2_speaking_mission'
  | 'v2_voice_targets'
  | 'v2_activity_instances'
  | 'v2_activity_graph'
  | 'v2_asset_manifest'
  | 'v2_localization'
  | 'v2_preview_receipt'
  | 'v2_episode_bundle'
  | 'v2_season_qa';
```

Это 13 V2 stage kinds. ModeTemplate не является generation stage: его published immutable version подключается как prerequisite. Stage kinds дополняют, а не обходят существующие `stageId`, `artifactId`, `idempotencyKey`, dependency IDs, lease/retry и approval fingerprint. Один stage kind может производить много artifacts, но каждый activity instance, translation unit, preview receipt и episode bundle получает собственную immutable identity и hash.

### 9.3 Mode-template authoring lifecycle

```text
registered kernel catalog
  → template draft
  → schema + policy validation
  → reference examples
  → six-state runtime preview
  → human review
  → approved immutable template version/hash
  → available in Activity Editor
  → ActivityInstances
  → episode graph
```

Канонический lifecycle: `draft → needs_review → changes_requested → draft` либо `needs_review → approved → published → deprecated → archived`. Validation и preview представлены привязанными к fingerprint receipts, а не отдельными статусами сущности. `deprecated` применяется только к уже опубликованной версии и не удаляет использующие её releases. Редактирование `approved`/`published` создаёт новую authoring draft revision и затем новую immutable version; восстановление старой version также создаёт новый draft, а не переписывает историю. Clone получает новый `templateId`, сохраняет provenance и не наследует approval.

Перед публикацией ModeTemplate фиксирует `activityTypeKey`, kernel version, template/payload schema versions, точные version/hash refs всех пяти policies (`evidence`, `scoring`, `progress`, `reward`, `recovery`), voice release requirements, min app version, example fixtures и content hash. Любое изменение этих полей инвалидирует preview/review fingerprints и все ещё не опубликованные downstream artifacts.

### 9.4 Dependency DAG

```text
language profile + kernel catalog + published mode template versions
  → season outline
  → episode outline
      ├─ phrases/vocabulary/theory
      ├─ scenes/microstory
      ├─ scripted dialogue
      ├─ Speaking Club mission
      └─ voice targets
  → ActivityInstances from approved templates
  → activity graph
  → localization + asset manifest
  → preview receipt
  → episode bundle
  → deterministic QA
  → human review
  → lesson-surface adapter
  → immutable CourseRelease
  → activation
```

Редактирование upstream artifact меняет hash и автоматически делает downstream preview/review stale. Graph не может ссылаться на mutable template draft при materialization: он разрешается в точный published `templateId + version + contentHash`.

### 9.5 Authoring input

Mode Template form задаёт:

- человекочитаемое название, family и учебную цель;
- зарегистрированный `activityTypeKey` и поддерживаемую kernel version;
- только разрешённые template/payload controls из kernel manifest;
- scoring/evidence, progress, recovery и reward policies из versioned catalogs;
- capability/fallback и accessibility contract;
- эталонные valid/invalid examples;
- min app version и поддерживаемые locale/script profiles.

Episode Builder задаёт:

- project/season ID;
- study target и learner source locale;
- language profile;
- episode range;
- can-do objective и scenario;
- target phrase frames/semantic slots;
- permitted activity families и approved mode-template versions;
- конкретные ActivityInstances и их payloads;
- graph nodes, branches, learning phases, два required loops, assessment nodes, scheduler review links и star slots;
- capstone/mastery и, где применимо, checkpoint assessment contract;
- voice/acoustic provider capabilities;
- content counts и duration budget;
- prompt/schema versions;
- QA policy;
- minimum app version;
- idempotency/request IDs.

Season workspace задаёт:

- season identity, language pair/profile и intended outcome;
- четыре главы и checkpoint positions;
- exact approved EpisodeRevision refs;
- immutable `gatePolicyVersion` из code-owned catalog;
- exact `decisionRegistryRef` из approved immutable registry catalog;
- рассчитанную, но не вручную редактируемую gate table для included episodes (`full_season`: E2–E32);
- legacy evidence mapping и minimum app version.

Нельзя вручную вводить renderer implementation path, JavaScript/CSS, scoring formula, shards price, network action или произвольный production URL. Они выбираются из versioned catalogs и kernel manifest.

### 9.6 Deterministic machine gates

Для каждого mode template:

- `activityTypeKey`/kernel существуют и поддерживают family;
- template/payload schemas и version/hash refs всех пяти policies входят в manifest allowlist;
- published ref имеет точные version/hash и min-app compatibility;
- fixtures покрывают valid, invalid, success, needs-work и recovery;
- capability fallback и accessibility route достижимы;
- network voice имеет approved `VoiceDataPolicyRef`; voice scoring/feedback/reward имеет exact неистёкший `SpeechCalibrationReceiptRecord`, совместимый с task type, construct, locale, capture pipeline, provider/model/config и evidence/scoring policies;
- template не содержит executable code, secrets, произвольные URL или экономику;
- runtime preview прошёл на реальном renderer shell, а не только в HTML mock.

Для каждого episode:

- schema/identity/locale valid;
- can-do objective наблюдаем и проверяем;
- phrase frames естественны и уникальны;
- content unit IDs существуют;
- graph DAG без unreachable/dead-end и без смешивания `nodeId`/`activityId`;
- 8–9 visible nodes и ровно восемь gate-eligible star slots; starless nodes разрешены только с `maxStars: 0`;
- отдельные encounter-build и near-transfer required loops, отдельные independent probe nodes и scheduler-only delayed-probe links с semantic validation learning-design refs/support fade/prerequisite DAG;
- capability fallback;
- primary и каждая accessibility/capability route имеют рассчитанные max reachable performance/derived-access stars, достаточные для local minimum и применимого gate;
- no required AI-only path;
- checkpoint position/contract корректен и не маскируется под activity family;
- каждая обязательная AI-assisted checkpoint route имеет deterministic non-AI alternate с теми же objectives;
- required kernel/template/payload/scoring versions и hashes поддерживаются;
- voice target имеет speech locale и normalization profile;
- каждая voice ActivityInstance имеет discriminated `VoiceTaskSpec`; `spontaneous` не содержит reference text, а edited/typed transcript route не может создать spoken/transcript-match/acoustic evidence;
- каждый confident voice result имеет valid capture/recognition, два executed evaluator provenance и exact calibrated scope tuples; acoustic result дополнительно имеет `speechFeatures.status='valid'` и непустые observations;
- Sound Lab без exact calibration receipt публикуется только как guided practice без acoustic evidence и acoustic/performance star;
- asset имеет provider/source ID, URI/path, SHA-256, bytes и rights metadata;
- translation units approved, source-change staleness отсутствует, target/source text не смешаны;
- no raw provider keys/prompts/internal metadata в release;
- dependency/review fingerprints свежие;

Для season revision:

- exact approved EpisodeRevision refs и непрерывные ordinals совпадают с `releaseScope`;
- `vertical_slice` = E1 только для lab/staging, `chapter_internal` = E1–E8 с checkpoint E8, `full_season` = 4×8 с checkpoints 8/16/24/32 и только он production-eligible;
- E1 не имеет gate, каждый следующий included episode имеет по одному gate;
- local/cumulative star thresholds совпадают с выбранным `gatePolicyVersion`;
- SeasonRevision, PublishedV2SeasonDefinition, manifest и каждый materialized bundle pin-ят один exact `decisionRegistryRef`; registry body hash валиден, а seal разрешает все `HYP-V2-001..008`, включая structure, retry/dosage, cutoffs, star budget, gate curve, boost economics, delayed window и rollout policy;
- checkpoint gates нельзя открыть purchased access без реального checkpoint pass;
- изменение любого pinned episode fingerprint делает season validation/review stale;
- lesson bundle сохраняет legacy-compatible fields;
- index/unit hashes и object generations согласованы;
- scheduler review links разрешаются в существующие episode/skill/probe refs и допустимые окна; independent probe не кодируется как review link;
- language profile покрывает все activities;
- required assets не выходят за budget;
- release целиком проходит app compatibility validator.

### 9.7 Human review

Machine QA не заменяет содержательный review. Администратор видит:

- can-do и фразы;
- scenario, semantic slots, capstone/mastery и checkpoint assessment coverage;
- season composition, exact episode refs и объяснимость star-gate table;
- точную связку family → kernel → template version/hash → ActivityInstance → graph node;
- sequence/graph;
- каждую activity payload;
- prompt/expected/fallback/result examples;
- voice target и честное название scorer;
- UI-state preview либо deep link в device preview;
- source/dependency hashes;
- machine QA issues;
- diff с прошлой revision;
- release impact и rollback target.

Approve/reject требует reason, reviewer ID, request ID и audit record. Template approval не означает episode approval. Seal разрешён только при complete approved templates, activities, translation units и episodes со свежими review fingerprints, а также свежем hash-bound decision-registry validation receipt, покрывающем `HYP-V2-001..008` exact pinned ref.

### 9.8 Versioning, clone и restore

- Draft autosave увеличивает authoring revision, но не создаёт production version.
- Publish template создаёт immutable monotonically increasing version и SHA-256.
- Clone template/episode создаёт новые IDs и provenance link; approvals сбрасываются.
- Restore revision материализует её как новую draft revision; audit history не переписывается.
- Изменение template создаёт impact report всех draft/published consumers; старые releases продолжают ссылаться на старый hash.
- Удаление запрещено, пока существует release membership; вместо него используется deprecation.
- Episode publish разрешает все draft refs в immutable versions/hashes и сохраняет dependency snapshot.

### 9.9 Порядок производства

1. Зафиксировать schemas/registry, kernel catalog и language profile `en ← ru`.
2. Создать и опубликовать минимальный набор mode templates для episode 1.
3. Создать ActivityInstances и graph только episode 1 через Content Studio.
4. Пройти generate → validate → runtime preview → review → adapt → seal в staging.
5. Загрузить release реальным app loader.
6. Пройти offline, voice fallback, account switch и rollback drill.
7. Выпустить chapter 1 для internal cohort.
8. После стабильного vertical slice создать все 32 тем же template/instance workflow.
9. Следующий язык добавлять через новый language profile и тот же pipeline, а не копию generator.

Runtime никогда не вызывает content generation provider. Пользователь получает только approved immutable artifacts.

## 10. Масштабирование языков

### 10.1 Language profile

```ts
export interface V2LanguageProfile {
  profileId: string;
  studyTarget: string;
  learnerSourceLocale: string;
  writingSystem: 'latin' | 'cyrillic' | 'arabic' | 'han' | 'mixed';
  direction: 'ltr' | 'rtl';
  speechRecognitionLocale: string;
  ttsLocale: string;
  tokenizerKey: string;
  normalizationKey: string;
  comparisonKey: string;
  supportedEvidenceKinds: EvidenceKind[];
  sourceSpecificSoundContrasts: Array<{
    targetSound: string;
    likelySourceSubstitution: string;
  }>;
  punctuationPolicyKey: string;
  casingPolicyKey: string;
}
```

Каждый composite ID/cache/progress/release включает и target, и source locale. Нельзя считать русский универсальным source profile для английского: sound contrasts `/w-v/`, `/θ-s/` и другие трудности зависят от родного языка.

### 10.2 Что остаётся общим

- episode/activity schemas;
- graph engine;
- renderer shells;
- progress/gates;
- release/cache/hash;
- admin workflow;
- analytics event names;
- accessibility и motion contracts.

### 10.3 Что конфигурируется по языку

- phrase/content payload;
- translation/explanation copy;
- tokenizer/normalizer/comparator;
- writing direction/script;
- STT/TTS locale/provider;
- source-specific sound contrasts;
- accepted variants;
- word-boundary/highlighting rules;
- voice thresholds после калибровки;
- fonts/manual line breaks для конкретного script.

Новый язык не должен требовать нового screen. Код меняется только если платформа не поддерживает нужный script, tokenizer, audio provider или evidence type; это оформляется новым versioned adapter.

### 10.4 Locale isolation

Admin и runtime обязаны отклонять:

- artifact с несовпадающим target/source;
- release index от другой locale pair;
- cache hit только по lessonId без locale/release;
- target text в source field;
- source-specific sound profile другого языка;
- progress merge между locale pairs;
- fallback на English content без явной bundled policy.

## 11. Предлагаемая структура файлов

```text
modules/learning-v2/contracts/activity.ts
modules/learning-v2/contracts/evidence.ts
modules/learning-v2/contracts/season.ts
modules/learning-v2/contracts/localization.ts
modules/learning-v2/registry/activity_registry.ts
modules/learning-v2/registry/scoring_registry.ts
modules/learning-v2/engine/graph_validator.ts
modules/learning-v2/engine/episode_runtime.ts
modules/learning-v2/engine/capability_resolver.ts
modules/learning-v2/progress/progress_store.ts
modules/learning-v2/progress/progress_merge.ts
modules/learning-v2/progress/progress_outbox.ts
modules/learning-v2/content/course_release_loader.ts
modules/learning-v2/content/course_release_cache.ts
modules/learning-v2/content/bundled_fallback.ts
modules/learning-v2/adapters/legacy_activity_adapters.ts

functions/src/v2_progress.ts
functions/src/v2_content_manifest.ts
functions/src/content_factory/v2_episode_bundle.ts
functions/src/content_factory/v2_episode_qa.ts
functions/src/content_factory/v2_language_profile.ts
functions/src/content_factory/v2_mode_template.ts
functions/src/content_factory/v2_translation_units.ts

admin/v2/scripts/pages/content-generator.js
admin/v2/scripts/pages/mode-library.js
admin/v2/scripts/pages/episode-builder.js
admin/v2/scripts/pages/activity-editor.js
admin/v2/scripts/pages/preview-lab.js
admin/v2/scripts/pages/translations.js
admin/v2/scripts/pages/content-review.js
functions/src/content_factory/stage_contracts.ts
functions/src/content_factory/dependency_catalog.ts
storage.rules
firestore.rules
```

Экраны должны импортировать episode data только через repository/loader. Прямые статические импорты сотен generated rows запрещены.

## 12. Test strategy

### 12.1 Contract и registry

```text
tests/v2_activity_registry.test.ts
tests/v2_activity_schema.test.ts
tests/v2_evidence_contract.test.ts
tests/v2_result_contract.test.ts
tests/v2_attempt_learning_hash_chain.test.ts
tests/v2_attempt_learning_cardinality.test.ts
tests/v2_attempt_learning_disposition.test.ts
tests/v2_voice_task_spec_contract.test.ts
tests/v2_voice_type_negative_fixtures.test-d.ts
tests/v2_voice_calibration_gate.test.ts
tests/v2_voice_data_policy_contract.test.ts
tests/v2_voice_governance_records.test.ts
tests/v2_voice_subject_classification_guardian.test.ts
tests/v2_voice_network_dispatch_lifecycle.test.ts
tests/v2_voice_deletion_dispatch_reconciliation.test.ts
tests/v2_graph_validator.test.ts
tests/v2_learning_design_semantics.test.ts
tests/v2_delayed_probe_window_contract.test.ts
tests/v2_checkpoint_projection.test.ts
tests/v2_route_star_reachability.test.ts
tests/v2_authoring_alias_contract.test-d.ts
tests/v2_decision_registry_pin.test.ts
tests/v2_renderer_compatibility.test.ts
tests/v2_mode_template_contract.test.ts
tests/v2_translation_unit_contract.test.ts
tests/v2_localized_text_hash_contract.test.ts
```

Проверить unknown kernel/template/schema fail-closed, registry exhaustiveness, все пять policy refs, learning-design schema/semantic DAG/fade/probes, D+1/D+7/D+21 delivery cadence отдельно от assessable D+3…D+7 window и normative `not_assessed_for_window → outside_window` without mastery, primary+accessibility route star reachability, scripted/spontaneous discriminator, layered evidence, exact calibration/data-policy/specialized-governance gate, authoritative classification+guardian lifecycle, reservation→consume→terminal settlement→deletion reconciliation, exact decision-registry version/hash и полное разрешение `HYP-V2-001..008`, node/activity ID separation, starless nodes, DAG, capability fallback и отсутствие AI-only core path. Hash-chain fixtures доказывают порядок attempt body with exhaustive dispositions → attempt ref → learning bodies → refs, отсутствие learning refs/self hash в attempt body и отсутствие общего envelope hash. Cardinality fixtures проверяют `0..N`, combined tuple uniqueness, exact node declaration/disposition membership, provenance/input/scoped-calibration binding и bounded checkpoint index. Delayed fixtures проверяют все три terminal ack branches. Dispatch fixtures проверяют три deterministic revoke interleavings, unresolved timeout, late artifact, settlement-bound deletion and rejection of early `not_found`. `v2_authoring_alias_contract.test-d.ts` запускается отдельным `tsc --noEmit --strict --exactOptionalPropertyTypes`: он импортирует реальные canonical `SeasonDraft`/`EpisodeDraft` и V2 list aliases, compile-positive проверяет nested `body/record/status`, а `@ts-expect-error` fixture запрещает прежний top-level `Pick<SeasonDraft, 'schemaVersion' | ...>`.

Compile-negative fixtures обязаны падать для: confident result с invalid capture/evaluator `not_run`; spontaneous `voice_transcript_match`; acoustic confident result с `speechFeatures.status!='valid'` либо пустыми observations; calibration task×construct без exact scope; spoken tuple без speech-feature observation/scoped calibration; `NEEDS_WORK_CONFIDENT` с 2–3 stars; `PASS_CONFIDENT`, `CORRECT` или `COMPLETED` с mandatory retry; `WRONG` со stars; `SKIPPED + completed=true`, без per-declaration `no_record` или с learning ref; repeated technical failure без `alternateRouteId`; learning ref в `V2AttemptEventBody`; self/envelope hash; evidence/non-assessment body без exact `sourceAttempt`; missing/duplicate/undeclared tuple disposition; node/declaration/provenance phase mismatch; generic `{id,...}` template ref; accessibility/outside-window non-assessment, выданный за `LearningEvidenceBody`; checkpoint set/subset mismatch или pass без assessed success всех critical slot/constraint targets; delayed requirement или `outside_window` ref внутри checkpoint contract/index; system delayed ack с timing receipt; protocol rejection с learning refs; dispatch deletion receipt без exact terminal settlement.

### 12.2 Runtime/component

```text
tests/v2_episode_runtime.test.ts
tests/v2_capability_resolver.test.ts
tests/v2_voice_shell_integration.test.ts
tests/v2_activity_accessibility.test.ts
tests/v2_activity_session_release_pin.test.ts
```

Проверить permission denial, fresh explicit record start, background/blur cleanup, Bluetooth route change, TTS/STT exclusion, uncertain/invalid free recovery, code-owned cap в две mandatory learning retries, edited/typed transcript separation, privacy consent/revoke/delete/account-switch lifecycle, large text, screen reader, reduced motion и lime/dark contrast.

### 12.3 Content delivery

```text
tests/v2_course_release_loader.test.ts
tests/v2_course_release_cache.test.ts
tests/v2_release_hash_guard.test.ts
tests/v2_release_rollback.test.ts
tests/v2_release_min_app_version.test.ts
tests/v2_lazy_content_contract.test.ts
```

Проверить identity/hash/generation, invalid JSON, oversized bytes, corrupted temp/cache, unsupported renderer, mid-session release switch, last-known-good, bundled fallback, target/source cache isolation, max cache entries и lazy episode loading.

### 12.4 Admin/factory

```text
functions/src/content_factory/v2_episode_bundle.test.ts
functions/src/content_factory/v2_episode_qa.test.ts
functions/src/content_factory/v2_language_profile.test.ts
functions/src/content_factory/v2_locale_isolation.test.ts
functions/src/content_factory/v2_release_compatibility.test.ts
functions/src/content_factory/v2_mode_template.test.ts
functions/src/content_factory/v2_translation_units.test.ts
tests/admin_v2_episode_generator_contract.test.ts
tests/admin_v2_episode_preview_contract.test.ts
tests/admin_v2_mode_library_contract.test.ts
tests/admin_v2_episode_builder_contract.test.ts
tests/admin_v2_content_studio_e2e.test.ts
```

Проверить stage idempotency, dependency order, template create/clone/version/deprecate, stale approval, edit invalidation, translation staleness, mode → instance → graph authoring, все season scopes, exact production 32/4×8/checkpoints, legacy superset, immutable object/hash, activation, rollback membership и audit log.

### 12.5 End-to-end gates

Обязательные E2E journeys:

1. admin создаёт template из kernel, activity instance и episode graph, проходит preview/review, seal, activation и rollback;
2. fresh user проходит episode 1 online и продолжает offline;
3. микрофон запрещён, alternate route не создаёт dead end;
4. checkpoint Club/AI route недоступен, deterministic alternate измеряет те же objectives;
5. app закрыт между local progress commit и sync;
6. account switch во время background sync;
7. episode начат на release A, catalog активировал B;
8. release B повреждён и loader остаётся на A;
9. admin активирует B и выполняет rollback на A;
10. checkpoint episode 8 не вводит новый material;
11. existing legacy user получает только explicit mapped access/evidence;
12. V2 kill switch возвращает нетронутый legacy path;
13. `UNCERTAIN`/`INVALID_AUDIO_OR_SYSTEM` не создают performance stars/learning evidence/reward и не расходуют mandatory learning retry;
14. learner edit/typed transcript закрывает speech-derived result, но может отдельно завершить semantic objective без voice evidence;
15. provider/model/config/locale/capture/policy change делает calibration stale и включает guided/non-voice fallback;
16. Club consent decline/revoke, account switch и account delete не оставляют доступного новому аккаунту audio/transcript/history и выполняют provider deletion contract.

### 12.6 Existing focused regressions

Новая реализация должна сохранить текущие guards release/factory/account/performance, включая:

```text
functions/src/content_factory/course_release_contract.test.ts
functions/src/content_factory/release_surface_delivery.test.ts
functions/src/content_factory/release_sealing.test.ts
functions/src/language_release.test.ts
tests/cloud_sync_account_race_contract.test.ts
tests/perf_freeze_contract.test.ts
tests/navigation_back_underlay_contract.test.ts
tests/owner_direction_runtime_contract.test.ts
```

## 13. Acceptance criteria

- episode 1 проходит полный путь generator → approved artifact → immutable release → client loader → activity registry → progress → offline restore;
- 32 episode schemas проходят один и тот же validator без per-episode code branches;
- каждый kernel имеет все registry contracts и fixtures, а каждый mode template — immutable version/hash и compatibility proof;
- Content Studio создаёт полный путь mode template → ActivityInstance → graph node → approved EpisodeRevision → SeasonRevision с exact 32 refs/gate policy → translation → preview → approval → `lesson-bundle.v2` → rollback;
- рассчитанная gate table E2–E32 совпадает с immutable `gatePolicyVersion`, а browser не принимает произвольную star curve или shards price;
- published season, manifest и bundle provenance pin-ят один exact `decisionRegistryRef`; seal/activation разрешают весь `HYP-V2-001..008`, включая delayed window (`007`), retry cap (`002`), numeric cutoffs (`003`), structure/star/gate/boost (`001/004/005/006`) и rollout (`008`), только внутри этого hash-verified registry;
- каждый published episode содержит exact learning design из документа 03; validator проверяет prerequisite outcome/exposure DAG, support fade, independent assessment-node semantics и scheduler-only delayed probe/window policy, а не только непустые refs;
- primary и каждая accessibility/capability route математически достигают local performance minimum и применимого access gate;
- draft season/episode не требуют release ID, published models не содержат mutable draft refs;
- starless nodes допустимы без `starSlotId`, но никогда не начисляют stars;
- checkpoint остаётся assessment contract, пинит objective/skill/construct/phase/critical-target tuples, вычисляет pass/targeted repair из bounded ID-only evidence projection и имеет deterministic non-AI alternate для обязательных AI-assisted routes;
- voice lifecycle не дублируется по экранам;
- `VoiceTaskSpec` разделяет scripted/spontaneous, spontaneous сохраняет transcript-confirmation fact и не допускает transcript-match, а edited/typed transcript никогда не создаёт spoken/transcript-match/acoustic evidence;
- confident voice result требует valid capture/recognition, executed recognition+scoring provenance и exact per-task+construct calibrated scopes; confident acoustic evidence требует valid nonempty speech features;
- `UNCERTAIN`/`INVALID_AUDIO_OR_SYSTEM` типом гарантируют ноль performance stars, learning evidence и reward, бесплатный technical retry и невозможность mapping в `WRONG`;
- `PASS_CONFIDENT`, `CORRECT` и `COMPLETED` не требуют retry, `NEEDS_WORK_CONFIDENT` ограничен 0–1 stars, `WRONG` не выдаёт stars, а skipped/completionKind согласованы типом;
- mandatory learning retries ограничены кодом двумя по `HYP-V2-002`, technical failures их не расходуют, repeated technical failure требует alternate route;
- current transcript scoring честно отличён от acoustic evidence, Sound Lab остаётся guided до exact calibration receipt;
- network voice/Club release fail-closed без active-registry `VoiceDataPolicyRecord` с deletion route/expiry и exact неистёкшего `SpeechCalibrationReceiptRecord`; provider/model/config/policy lifecycle change имеет typed stale reason;
- canonical integrity chain не циклична: hash-free `V2AttemptEventBody` → `CanonicalAttemptRef` → hash-free learning bodies → learning refs; ledger `V2AttemptEvent` envelope не хэшируется целиком;
- одна attempt может создать `0..N` typed evidence/non-assessment refs, но не более одного record на каждый exact declared node/objective/skill/construct/phase/target tuple с canonical collision-free key;
- diagnostic attempt, out-of-window delayed probe и `LearningNonAssessmentRef` никогда не материализуются как assessed `LearningEvidenceBody` и не участвуют в mastery/checkpoint pass;
- ModeTemplate, calibration, voice-policy и localized-text canonical hashes считаются только по соответствующим hash-free bodies;
- raw audio/transcript/history исключены из generic analytics, а consent, retention, provider deletion, account switch и account delete проходят release tests;
- unknown/unsupported remote content не ломает last-known-good;
- hash и locale identity проверяются до cache activation;
- release rollback не откатывает пользовательский прогресс и не меняет текущую session;
- admin edit инвалидирует downstream approval и оставляет audit trail;
- новый язык добавляется language profile + content run, без копирования screens;
- generated content остаётся lazy/server-delivered и не утяжеляет startup bundle;
- legacy остаётся доступен за rollout flag до доказанного паритета.

import {
  LEARNING_V2_GENERATION_INTERFACE_LOCALES,
  LEARNING_V2_GENERATION_STAGE_KINDS,
  type LearningV2GenerationStageKind,
} from './learning_v2_generation_artifacts';
import { LEARNING_V2_AUDIO_VOICES } from '../../../modules/learning-v2/content/generator_course_manifest';

const STAGE_STATES = Object.freeze([
  'queued', 'running', 'paused', 'needs_review', 'approved', 'rejected',
  'failed', 'cancelled', 'superseded',
] as const);
const TOKEN_RE = /^[A-Za-z0-9._:-]{1,500}$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const MAX_STAGE_DOCUMENTS = 100;

type EvidenceState = 'missing' | 'stale' | 'invalid' | 'verified';
type StageState = (typeof STAGE_STATES)[number];

export type LearningV2WorkspaceStageRef = Readonly<{
  stageId: string;
  kind: LearningV2GenerationStageKind;
  revision: number;
  state: StageState;
  artifactId: string | null;
  contentHash: string | null;
}>;

export type LearningV2CourseWorkspaceProjectionV1 = Readonly<{
  schemaVersion: 'learning-v2-course-workspace-projection.v1';
  requestId: string;
  studyTarget: string;
  sourceLocale: string;
  scopeId: string;
  history: Readonly<{ scannedStageCount: number; historyIncomplete: boolean; invalidStageCount: number }>;
  rollups: readonly Readonly<{
    kind: LearningV2GenerationStageKind;
    approvedBaseline: LearningV2WorkspaceStageRef | null;
    latestWorkingRevision: LearningV2WorkspaceStageRef | null;
    approvalState: EvidenceState;
    releaseAuthority: false;
  }>[];
  locales: readonly Readonly<{
    locale: (typeof LEARNING_V2_GENERATION_INTERFACE_LOCALES)[number];
    structuralState: EvidenceState;
    specialistReviewState: EvidenceState;
    sourceBindingState: EvidenceState;
  }>[];
  audio: Readonly<{
    voices: typeof LEARNING_V2_AUDIO_VOICES;
    manifestState: EvidenceState;
    assetBytesState: EvidenceState;
    listeningReviewState: EvidenceState;
    deviceReviewState: EvidenceState;
  }>;
  curriculumScience: Readonly<{
    alignmentState: EvidenceState;
    outcomeCapabilityState: EvidenceState;
    introClaimBindingState: EvidenceState;
    independentEvidenceState: EvidenceState;
    delayedEvidenceState: EvidenceState;
    checkpointBlueprintState: EvidenceState;
    proficiencyCertification: 'none';
  }>;
  canonicalAuthoringState: EvidenceState;
  provenanceState: EvidenceState;
  publicationPolicy: 'draft_only_no_consumer';
  runtimeConsumer: false;
  releaseEligible: false;
  blockers: readonly string[];
}>;

export type LearningV2WorkspaceProjectionInput = Readonly<{
  requestId: string;
  studyTarget: string;
  sourceLocale: string;
  scopeId: string;
  stageDocuments: readonly unknown[];
  historyIncomplete?: boolean;
}>;

function dataRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return null;
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !('value' in descriptor)) return null;
    result[key] = descriptor.value;
  }
  return result;
}

function parseStage(value: unknown): LearningV2WorkspaceStageRef | null {
  const record = dataRecord(value);
  if (!record) return null;
  const stageId = typeof record.id === 'string' ? record.id : typeof record.stageId === 'string' ? record.stageId : '';
  const kind = record.kind as LearningV2GenerationStageKind;
  const revision = record.revision;
  const state = record.state as StageState;
  if (!TOKEN_RE.test(stageId) || !LEARNING_V2_GENERATION_STAGE_KINDS.includes(kind) ||
      !Number.isSafeInteger(revision) || Number(revision) < 1 || Number(revision) > 10_000 ||
      !STAGE_STATES.includes(state)) return null;
  const artifactId = typeof record.artifactId === 'string' && TOKEN_RE.test(record.artifactId) ? record.artifactId : null;
  const contentHash = typeof record.contentHash === 'string' && HASH_RE.test(record.contentHash) ? record.contentHash : null;
  return Object.freeze({ stageId, kind, revision: Number(revision), state, artifactId, contentHash });
}

const newest = (items: readonly LearningV2WorkspaceStageRef[]): LearningV2WorkspaceStageRef | null =>
  [...items].sort((left, right) => right.revision - left.revision || right.stageId.localeCompare(left.stageId))[0] ?? null;

export function buildLearningV2CourseWorkspaceProjectionV1(
  input: LearningV2WorkspaceProjectionInput,
): LearningV2CourseWorkspaceProjectionV1 {
  if (!TOKEN_RE.test(input.requestId) || !TOKEN_RE.test(input.scopeId) ||
      typeof input.studyTarget !== 'string' || !input.studyTarget ||
      typeof input.sourceLocale !== 'string' || !input.sourceLocale ||
      !Array.isArray(input.stageDocuments) || input.stageDocuments.length > MAX_STAGE_DOCUMENTS) {
    throw new Error('learning_v2_workspace_projection_input_invalid');
  }
  const parsed = input.stageDocuments.map(parseStage);
  const validStages = parsed.filter((stage): stage is LearningV2WorkspaceStageRef => stage !== null);
  const blockers: string[] = [];
  if (input.historyIncomplete) blockers.push('stage_history_incomplete');
  if (validStages.length !== parsed.length) blockers.push('stage_metadata_invalid');

  const rollups = LEARNING_V2_GENERATION_STAGE_KINDS.map((kind) => {
    const matching = validStages.filter((stage) => stage.kind === kind);
    const latestWorkingRevision = newest(matching);
    const approvedBaseline = newest(matching.filter((stage) => stage.state === 'approved'));
    let approvalState: EvidenceState = 'missing';
    if (approvedBaseline && latestWorkingRevision) {
      approvalState = approvedBaseline.stageId === latestWorkingRevision.stageId &&
        approvedBaseline.contentHash !== null && approvedBaseline.artifactId !== null ? 'verified' : 'stale';
    }
    if (!latestWorkingRevision) blockers.push(`rollup_missing:${kind}`);
    else if (approvalState !== 'verified') blockers.push(`rollup_not_current:${kind}`);
    return Object.freeze({ kind, approvedBaseline, latestWorkingRevision, approvalState, releaseAuthority: false as const });
  });

  const localizedRollup = rollups.find((rollup) => rollup.kind === 'learning_v2_localized_course');
  const audioRollup = rollups.find((rollup) => rollup.kind === 'learning_v2_audio');
  const structuralLocaleState: EvidenceState = localizedRollup?.latestWorkingRevision ? 'invalid' : 'missing';
  const locales = LEARNING_V2_GENERATION_INTERFACE_LOCALES.map((locale) => Object.freeze({
    locale,
    structuralState: structuralLocaleState,
    specialistReviewState: 'missing' as const,
    sourceBindingState: 'missing' as const,
  }));
  blockers.push('localization_source_bound_receipts_missing', 'localization_human_reviews_missing');

  const manifestState: EvidenceState = audioRollup?.latestWorkingRevision ? 'invalid' : 'missing';
  blockers.push('audio_asset_bytes_missing', 'audio_listening_reviews_missing', 'audio_device_receipts_missing');
  blockers.push(
    'curriculum_science_contract_missing',
    'outcome_capability_matrix_missing',
    'intro_claim_bindings_missing',
    'independent_evidence_contract_missing',
    'delayed_evidence_receipts_missing',
    'checkpoint_blueprints_missing',
    'canonical_content_studio_authority_missing',
    'production_provenance_missing',
  );

  return Object.freeze({
    schemaVersion: 'learning-v2-course-workspace-projection.v1',
    requestId: input.requestId,
    studyTarget: input.studyTarget,
    sourceLocale: input.sourceLocale,
    scopeId: input.scopeId,
    history: Object.freeze({
      scannedStageCount: input.stageDocuments.length,
      historyIncomplete: input.historyIncomplete === true,
      invalidStageCount: parsed.length - validStages.length,
    }),
    rollups: Object.freeze(rollups),
    locales: Object.freeze(locales),
    audio: Object.freeze({
      voices: LEARNING_V2_AUDIO_VOICES,
      manifestState,
      assetBytesState: 'missing',
      listeningReviewState: 'missing',
      deviceReviewState: 'missing',
    }),
    curriculumScience: Object.freeze({
      alignmentState: 'missing',
      outcomeCapabilityState: 'missing',
      introClaimBindingState: 'missing',
      independentEvidenceState: 'missing',
      delayedEvidenceState: 'missing',
      checkpointBlueprintState: 'missing',
      proficiencyCertification: 'none',
    }),
    canonicalAuthoringState: 'missing',
    provenanceState: 'missing',
    publicationPolicy: 'draft_only_no_consumer',
    runtimeConsumer: false,
    releaseEligible: false,
    blockers: Object.freeze([...new Set(blockers)]),
  });
}

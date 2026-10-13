import { getDialogueV2CatalogueEntry } from '../../shared/dialogue_v2_catalogue_index';
import { validateDialogueV2PackReference } from '../../shared/dialogue_v2_contract';
import {
  DIALOGUE_V2_REVIEW_ROLES,
  validateDialogueV2LanguagePack,
  type DialogueV2LanguagePack,
} from '../../shared/dialogue_v2_language_pack_contract';
import { HttpsError } from 'firebase-functions/v2/https';
import { validateDialogueV2CompletionFeedback } from '../../shared/dialogue_v2_completion_contract';
import {
  createDialogueV2SessionCompletionReleaseSnapshot,
  type DialogueV2SessionCompletionReleaseSnapshot,
} from './dialogue_v2_session_completion_core';
import type {
  DialogueV2MemoryPlan,
  DialogueV2MemoryStudyTarget,
} from './dialogue_v2_memory_contract';
import { deriveDialogueV2MemoryPlan } from './dialogue_v2_memory_contract';
import {
  authorizeDialogueV2ServerPacket,
  type DialogueV2ServerRelease,
} from './dialogue_v2_server_authorization';
import { reportCauseServer } from './swallowed_error'; // зачем (координатор 13.10): причина сбоя в журнале, поведение прежнее

/**
 * Pure boundary for a future server persistence adapter.
 *
 * This module deliberately performs no Firestore I/O and invents no collection
 * path. A callable/transaction, Firestore Rules, retention policy and account
 * deletion/export integration must be implemented and reviewed separately.
 */

export type DialogueV2ManifestProvenReference = Readonly<{
  studyTarget: DialogueV2MemoryStudyTarget;
  scenarioId: string;
  packVersion: string;
  packSha256: string;
  catalogueSha256: string;
  reviewReceiptSha256: string;
}>;

export type DialogueV2MemoryWriteTrustedContext = Readonly<{
  memoryPlan?: unknown;
  manifestReference?: unknown;
  originScenarioId?: unknown;
  memoryAllowlist?: unknown;
}>;

export type DialogueV2MemoryWriteRequest = Readonly<{
  sharedMemoryId?: unknown;
  summary?: unknown;
  scenarioThreadId?: unknown;
  checkpoint?: unknown;
  [field: string]: unknown;
}>;

export type DialogueV2MemorySummary = Readonly<{
  strengths: readonly string[];
  focusAreas: readonly string[];
  completedObjectives: number;
}>;

export type DialogueV2MemoryCheckpoint = Readonly<{
  nextObjectiveIndex: number;
  completedObjectiveIds: readonly string[];
  personaState: Readonly<Record<string, string>>;
}>;

export type DialogueV2MemoryAllowlist = Readonly<{
  objectiveIds: readonly string[];
  personaStates: Readonly<Record<string, readonly string[]>>;
}>;

type SharedMemoryTarget = DialogueV2MemoryPlan['sharedMemory'];
type ScenarioThreadTarget = NonNullable<DialogueV2MemoryPlan['scenarioThread']>;

type SharedMemoryDocument = Readonly<{
  target: SharedMemoryTarget;
  value: Readonly<{
    contractVersion: 'dialogue_v2_memory_v1';
    studyTarget: DialogueV2MemoryStudyTarget;
    manifestReference: DialogueV2ManifestProvenReference;
    summary: DialogueV2MemorySummary;
  }>;
}>;

type ScenarioThreadDocument = Readonly<{
  target: ScenarioThreadTarget;
  value: Readonly<{
    contractVersion: 'dialogue_v2_memory_v1';
    studyTarget: DialogueV2MemoryStudyTarget;
    scenarioId: string;
    manifestReference: DialogueV2ManifestProvenReference;
    checkpoint: DialogueV2MemoryCheckpoint;
  }>;
}>;

export type DialogueV2MemoryWriteCommand = Readonly<{
  commandVersion: 'dialogue_v2_memory_write_v1';
  authorization: Readonly<{
    memoryAllowlist: DialogueV2MemoryAllowlist;
  }>;
  documents: readonly (SharedMemoryDocument | ScenarioThreadDocument)[];
}>;

export type DialogueV2MemoryWriteError =
  | 'trusted_context_invalid'
  | 'manifest_reference_invalid'
  | 'request_fields_invalid'
  | 'memory_identity_mismatch'
  | 'thread_identity_mismatch'
  | 'checkpoint_not_allowed'
  | 'structured_payload_invalid';

export type DialogueV2MemoryWriteResult =
  | Readonly<{ ok: true; command: DialogueV2MemoryWriteCommand }>
  | Readonly<{ ok: false; error: DialogueV2MemoryWriteError }>;

export type DialogueV2MemoryPersistenceDocument = Readonly<{
  exists: boolean;
  data?: unknown;
}>;

export type DialogueV2MemoryPersistenceTransaction = Readonly<{
  get(path: string): Promise<DialogueV2MemoryPersistenceDocument>;
  set(path: string, value: unknown): void;
}>;

export type DialogueV2MemoryPersistenceRepository = Readonly<{
  runTransaction<T>(
    work: (transaction: DialogueV2MemoryPersistenceTransaction) => Promise<T>,
  ): Promise<T>;
}>;

export type DialogueV2MemoryCallableRequest = Readonly<{
  auth?: Readonly<{ uid?: unknown }>;
  data?: unknown;
}>;

export type DialogueV2MemoryWriteDependencies = Readonly<{
  repository: DialogueV2MemoryPersistenceRepository;
  identifierSecret: string;
  resolveStableAccountId(authUid: string): Promise<string>;
  resolvePremiumAccess(stableAccountId: string, authUid: string): Promise<boolean>;
  resolveApprovedLanguagePack(
    studyTarget: DialogueV2MemoryStudyTarget,
    scenarioId: string,
  ): Promise<DialogueV2LanguagePack | null>;
}>;

export type DialogueV2MemoryReadDependencies = Readonly<{
  repository: DialogueV2MemoryPersistenceRepository;
  identifierSecret: string;
  resolveStableAccountId(authUid: string): Promise<string>;
  resolvePremiumAccess(stableAccountId: string, authUid: string): Promise<boolean>;
  resolveRelease(): Promise<DialogueV2ServerRelease | null>;
}>;

export type DialogueV2MemoryReadResponse = Readonly<{
  ok: true;
  sharedSummary: DialogueV2MemorySummary | null;
  scenarioCheckpoint: DialogueV2MemoryCheckpoint | null;
}>;

export type DialogueV2MemoryWriteResponse = Readonly<{
  ok: true;
  sharedMemoryStored: true;
  scenarioCheckpointStored: boolean;
}>;

export type DialogueV2CompletionMemoryRequest = Readonly<{
  authUid?: unknown;
  studyTarget?: unknown;
  scenarioId?: unknown;
  completion?: unknown;
  releaseSnapshot?: unknown;
}>;

export type DialogueV2PreparedCompletionMemory = Readonly<{
  authUid: string;
  stableAccountId: string;
  command: DialogueV2MemoryWriteCommand;
  receipt: DialogueV2MemoryWriteResponse;
}>;

export type DialogueV2CompletionMemoryPreparationDependencies = Readonly<{
  identifierSecret: string;
  resolveStableAccountId(authUid: string): Promise<string>;
  resolvePremiumAccess(stableAccountId: string, authUid: string): Promise<boolean>;
  resolveApprovedLanguagePack(
    studyTarget: DialogueV2MemoryStudyTarget,
    scenarioId: string,
  ): Promise<DialogueV2LanguagePack | null>;
}>;

const SHARED_MEMORY_ID_PATTERN = /^d2m_[a-f0-9]{40}$/;
const SCENARIO_THREAD_ID_PATTERN = /^d2t_[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const REQUEST_FIELDS = new Set([
  'sharedMemoryId',
  'summary',
  'scenarioThreadId',
  'checkpoint',
]);
const MEMORY_LABEL_PATTERN = /^(?=.{1,64}$)[a-z][a-z0-9]*(?:[_:-][a-z0-9]+)*$/;
const MAX_OBJECTIVE_COUNT = 12;
const MAX_PERSONA_COUNT = 6;
const CALLABLE_REQUEST_FIELDS = new Set(['studyTarget', 'scenarioId', 'summary', 'checkpoint']);
const READ_REQUEST_FIELDS = new Set(['studyTarget', 'scenarioId']);

type PlainRecord = Record<string, unknown>;

function plainDataRecord(value: unknown): PlainRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== 'string')) return null;
  for (const key of ownKeys as string[]) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
  }
  return value as PlainRecord;
}

function hasExactFields(record: PlainRecord, fields: readonly string[]): boolean {
  const actual = Object.keys(record);
  return actual.length === fields.length && actual.every((field) => fields.includes(field));
}

function hasOwnField(record: PlainRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, field);
}

function cloneLabelArray(value: unknown, maxItems: number): readonly string[] | null {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
  if (value.length > maxItems) return null;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== 'string') || ownKeys.length !== value.length + 1) return null;
  const clone: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
    if (typeof descriptor.value !== 'string' || !MEMORY_LABEL_PATTERN.test(descriptor.value)
      || seen.has(descriptor.value)) return null;
    seen.add(descriptor.value);
    clone.push(descriptor.value);
  }
  return Object.freeze(clone);
}

function cloneMemoryAllowlist(value: unknown): DialogueV2MemoryAllowlist | null {
  const record = plainDataRecord(value);
  if (!record || !hasExactFields(record, ['objectiveIds', 'personaStates'])) return null;
  const objectiveIds = cloneLabelArray(record.objectiveIds, MAX_OBJECTIVE_COUNT);
  const personaStatesRecord = plainDataRecord(record.personaStates);
  if (!objectiveIds || objectiveIds.length === 0 || !personaStatesRecord) return null;
  const personaIds = Object.keys(personaStatesRecord);
  if (personaIds.length > MAX_PERSONA_COUNT) return null;
  const personaStates: Record<string, readonly string[]> = Object.create(null);
  for (const personaId of personaIds) {
    if (!MEMORY_LABEL_PATTERN.test(personaId)) return null;
    const states = cloneLabelArray(personaStatesRecord[personaId], 4);
    if (!states || states.length === 0) return null;
    personaStates[personaId] = states;
  }
  return Object.freeze({
    objectiveIds,
    personaStates: Object.freeze(personaStates),
  });
}

function cloneMemorySummary(
  value: unknown,
  allowlist: DialogueV2MemoryAllowlist,
): DialogueV2MemorySummary | null {
  const record = plainDataRecord(value);
  if (!record || !hasExactFields(record, ['strengths', 'focusAreas', 'completedObjectives'])) {
    return null;
  }
  const strengths = cloneLabelArray(record.strengths, MAX_OBJECTIVE_COUNT);
  const focusAreas = cloneLabelArray(record.focusAreas, MAX_OBJECTIVE_COUNT);
  if (
    !strengths
    || !focusAreas
    || strengths.some((label) => !allowlist.objectiveIds.includes(label))
    || focusAreas.some((label) => !allowlist.objectiveIds.includes(label))
    || !Number.isInteger(record.completedObjectives)
    || (record.completedObjectives as number) < 0
    || (record.completedObjectives as number) > MAX_OBJECTIVE_COUNT
  ) return null;
  return Object.freeze({
    strengths,
    focusAreas,
    completedObjectives: record.completedObjectives as number,
  });
}

function clonePersonaState(
  value: unknown,
  allowlist: DialogueV2MemoryAllowlist,
): Readonly<Record<string, string>> | null {
  const record = plainDataRecord(value);
  if (!record) return null;
  const personaIds = Object.keys(record);
  if (personaIds.length > MAX_PERSONA_COUNT) return null;
  const clone: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const personaId of personaIds) {
    const state = record[personaId];
    if (!MEMORY_LABEL_PATTERN.test(personaId)
      || typeof state !== 'string'
      || !MEMORY_LABEL_PATTERN.test(state)
      || !allowlist.personaStates[personaId]?.includes(state)) return null;
    clone[personaId] = state;
  }
  return Object.freeze(clone);
}

function cloneMemoryCheckpoint(
  value: unknown,
  allowlist: DialogueV2MemoryAllowlist,
): DialogueV2MemoryCheckpoint | null {
  const record = plainDataRecord(value);
  if (!record || !hasExactFields(record, [
    'nextObjectiveIndex', 'completedObjectiveIds', 'personaState',
  ])) return null;
  const completedObjectiveIds = cloneLabelArray(record.completedObjectiveIds, MAX_OBJECTIVE_COUNT);
  const personaState = clonePersonaState(record.personaState, allowlist);
  if (
    !Number.isInteger(record.nextObjectiveIndex)
    || (record.nextObjectiveIndex as number) < 0
    || (record.nextObjectiveIndex as number) > MAX_OBJECTIVE_COUNT
    || !completedObjectiveIds
    || completedObjectiveIds.some((objectiveId) => !allowlist.objectiveIds.includes(objectiveId))
    || !personaState
  ) return null;
  return Object.freeze({
    nextObjectiveIndex: record.nextObjectiveIndex as number,
    completedObjectiveIds,
    personaState,
  });
}

function cloneSharedMemoryTarget(value: unknown): SharedMemoryTarget | null {
  const record = plainDataRecord(value);
  if (!record || !hasExactFields(record, [
    'id', 'scope', 'studyTarget', 'format', 'rawTranscriptRetention',
  ])) return null;
  if (
    typeof record.id !== 'string'
    || !SHARED_MEMORY_ID_PATTERN.test(record.id)
    || record.scope !== 'account_language'
    || !['en', 'es', 'fr', 'de'].includes(record.studyTarget as string)
    || record.format !== 'structured_summary'
    || record.rawTranscriptRetention !== 'forbidden'
  ) return null;
  return Object.freeze({
    id: record.id,
    scope: 'account_language',
    studyTarget: record.studyTarget as DialogueV2MemoryStudyTarget,
    format: 'structured_summary',
    rawTranscriptRetention: 'forbidden',
  });
}

function cloneScenarioThreadTarget(value: unknown): ScenarioThreadTarget | null {
  const record = plainDataRecord(value);
  if (!record || !hasExactFields(record, [
    'id', 'scope', 'studyTarget', 'scenarioId', 'resumable', 'format',
    'rawTranscriptRetention',
  ])) return null;
  if (
    typeof record.id !== 'string'
    || !SCENARIO_THREAD_ID_PATTERN.test(record.id)
    || record.scope !== 'account_language_scenario'
    || !['en', 'es', 'fr', 'de'].includes(record.studyTarget as string)
    || typeof record.scenarioId !== 'string'
    || !getDialogueV2CatalogueEntry(record.scenarioId)
    || record.resumable !== true
    || record.format !== 'structured_checkpoint'
    || record.rawTranscriptRetention !== 'forbidden'
  ) return null;
  return Object.freeze({
    id: record.id,
    scope: 'account_language_scenario',
    studyTarget: record.studyTarget as DialogueV2MemoryStudyTarget,
    scenarioId: record.scenarioId,
    resumable: true,
    format: 'structured_checkpoint',
    rawTranscriptRetention: 'forbidden',
  });
}

function cloneMemoryPlan(value: unknown): DialogueV2MemoryPlan | null {
  const record = plainDataRecord(value);
  if (!record || !hasExactFields(record, ['contractVersion', 'sharedMemory', 'scenarioThread'])) {
    return null;
  }
  if (record.contractVersion !== 'dialogue_v2_memory_v1') return null;
  const sharedMemory = cloneSharedMemoryTarget(record.sharedMemory);
  const scenarioThread = record.scenarioThread === null
    ? null
    : cloneScenarioThreadTarget(record.scenarioThread);
  if (!sharedMemory || (record.scenarioThread !== null && !scenarioThread)) return null;
  if (scenarioThread && scenarioThread.studyTarget !== sharedMemory.studyTarget) return null;
  return Object.freeze({
    contractVersion: 'dialogue_v2_memory_v1',
    sharedMemory,
    scenarioThread,
  });
}

function cloneManifestReference(
  value: unknown,
  memoryPlan: DialogueV2MemoryPlan,
  originScenarioId: string,
): DialogueV2ManifestProvenReference | null {
  const record = plainDataRecord(value);
  if (!record || !hasExactFields(record, [
    'studyTarget', 'scenarioId', 'packVersion', 'packSha256',
    'catalogueSha256', 'reviewReceiptSha256',
  ])) return null;
  if (
    record.studyTarget !== memoryPlan.sharedMemory.studyTarget
    || record.scenarioId !== originScenarioId
    || !validateDialogueV2PackReference({
      scenarioId: record.scenarioId,
      packVersion: record.packVersion,
      packSha256: record.packSha256,
      catalogueSha256: record.catalogueSha256,
    }).ok
    || typeof record.reviewReceiptSha256 !== 'string'
    || !SHA256_PATTERN.test(record.reviewReceiptSha256)
    || !getDialogueV2CatalogueEntry(record.scenarioId as string)
    || (memoryPlan.scenarioThread !== null
      && memoryPlan.scenarioThread.scenarioId !== record.scenarioId)
  ) return null;
  return Object.freeze({
    studyTarget: record.studyTarget as DialogueV2MemoryStudyTarget,
    scenarioId: record.scenarioId as string,
    packVersion: record.packVersion as string,
    packSha256: record.packSha256 as string,
    catalogueSha256: record.catalogueSha256 as string,
    reviewReceiptSha256: record.reviewReceiptSha256,
  });
}

function failed(error: DialogueV2MemoryWriteError): DialogueV2MemoryWriteResult {
  return Object.freeze({ ok: false as const, error });
}

export function buildDialogueV2MemoryWriteCommand(
  trustedContext: DialogueV2MemoryWriteTrustedContext | null | undefined,
  request: DialogueV2MemoryWriteRequest | null | undefined,
): DialogueV2MemoryWriteResult {
  const trustedRecord = plainDataRecord(trustedContext);
  if (!trustedRecord || !hasExactFields(trustedRecord, [
    'memoryPlan', 'manifestReference', 'originScenarioId', 'memoryAllowlist',
  ])) {
    return failed('trusted_context_invalid');
  }
  const memoryPlan = cloneMemoryPlan(trustedRecord.memoryPlan);
  const memoryAllowlist = cloneMemoryAllowlist(trustedRecord.memoryAllowlist);
  if (!memoryPlan || !memoryAllowlist) return failed('trusted_context_invalid');
  if (typeof trustedRecord.originScenarioId !== 'string'
    || !getDialogueV2CatalogueEntry(trustedRecord.originScenarioId)) {
    return failed('trusted_context_invalid');
  }
  const manifestReference = cloneManifestReference(
    trustedRecord.manifestReference,
    memoryPlan,
    trustedRecord.originScenarioId,
  );
  if (!manifestReference) return failed('manifest_reference_invalid');

  const requestRecord = plainDataRecord(request);
  if (!requestRecord) return failed('request_fields_invalid');
  if (
    Object.keys(requestRecord).some((field) => !REQUEST_FIELDS.has(field))
    || !hasOwnField(requestRecord, 'sharedMemoryId')
    || !hasOwnField(requestRecord, 'summary')
  ) return failed('request_fields_invalid');
  if (
    typeof requestRecord.sharedMemoryId !== 'string'
    || !SHARED_MEMORY_ID_PATTERN.test(requestRecord.sharedMemoryId)
    || requestRecord.sharedMemoryId !== memoryPlan.sharedMemory.id
  ) return failed('memory_identity_mismatch');

  const summary = cloneMemorySummary(requestRecord.summary, memoryAllowlist);
  if (!summary) return failed('structured_payload_invalid');

  const hasThreadId = hasOwnField(requestRecord, 'scenarioThreadId');
  const hasCheckpoint = hasOwnField(requestRecord, 'checkpoint');
  if (!memoryPlan.scenarioThread && (hasThreadId || hasCheckpoint)) {
    return failed('checkpoint_not_allowed');
  }
  if (hasThreadId !== hasCheckpoint) return failed('thread_identity_mismatch');

  const sharedDocument: SharedMemoryDocument = Object.freeze({
    target: memoryPlan.sharedMemory,
    value: Object.freeze({
      contractVersion: 'dialogue_v2_memory_v1' as const,
      studyTarget: memoryPlan.sharedMemory.studyTarget,
      manifestReference,
      summary,
    }),
  });
  const documents: (SharedMemoryDocument | ScenarioThreadDocument)[] = [sharedDocument];

  if (hasCheckpoint) {
    const scenarioThread = memoryPlan.scenarioThread;
    if (
      !scenarioThread
      || typeof requestRecord.scenarioThreadId !== 'string'
      || !SCENARIO_THREAD_ID_PATTERN.test(requestRecord.scenarioThreadId)
      || requestRecord.scenarioThreadId !== scenarioThread.id
    ) return failed('thread_identity_mismatch');
    const checkpoint = cloneMemoryCheckpoint(requestRecord.checkpoint, memoryAllowlist);
    if (!checkpoint) return failed('structured_payload_invalid');
    documents.push(Object.freeze({
      target: scenarioThread,
      value: Object.freeze({
        contractVersion: 'dialogue_v2_memory_v1' as const,
        studyTarget: scenarioThread.studyTarget,
        scenarioId: scenarioThread.scenarioId,
        manifestReference,
        checkpoint,
      }),
    }));
  }

  return Object.freeze({
    ok: true as const,
    command: Object.freeze({
      commandVersion: 'dialogue_v2_memory_write_v1' as const,
      authorization: Object.freeze({ memoryAllowlist }),
      documents: Object.freeze(documents),
    }),
  });
}

function safeDocumentSegment(value: unknown, maxLength: number): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= maxLength
    && value !== '.'
    && value !== '..'
    && !value.includes('/')
    && !/[\u0000-\u001f\u007f]/.test(value);
}

function dataArray(value: unknown, minItems: number, maxItems: number): readonly unknown[] | null {
  if (!Array.isArray(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || value.length < minItems
    || value.length > maxItems) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== 'string') || keys.length !== value.length + 1) return null;
  const clone: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
    clone.push(descriptor.value);
  }
  return Object.freeze(clone);
}

function canonicalPersistenceCommand(value: unknown): DialogueV2MemoryWriteCommand | null {
  const command = plainDataRecord(value);
  if (!command
    || !hasExactFields(command, ['commandVersion', 'authorization', 'documents'])
    || command.commandVersion !== 'dialogue_v2_memory_write_v1') return null;
  const authorization = plainDataRecord(command.authorization);
  if (!authorization || !hasExactFields(authorization, ['memoryAllowlist'])) return null;
  const documents = dataArray(command.documents, 1, 2);
  if (!documents) return null;

  const sharedDocument = plainDataRecord(documents[0]);
  const sharedValue = plainDataRecord(sharedDocument?.value);
  if (!sharedDocument
    || !hasExactFields(sharedDocument, ['target', 'value'])
    || !sharedValue
    || !hasExactFields(sharedValue, [
      'contractVersion', 'studyTarget', 'manifestReference', 'summary',
    ])) return null;

  let scenarioThread: unknown = null;
  let threadValue: PlainRecord | null = null;
  if (documents.length === 2) {
    const threadDocument = plainDataRecord(documents[1]);
    threadValue = plainDataRecord(threadDocument?.value);
    if (!threadDocument
      || !hasExactFields(threadDocument, ['target', 'value'])
      || !threadValue
      || !hasExactFields(threadValue, [
        'contractVersion', 'studyTarget', 'scenarioId', 'manifestReference', 'checkpoint',
      ])) return null;
    scenarioThread = threadDocument.target;
  }

  const manifestReference = plainDataRecord(sharedValue.manifestReference);
  if (!manifestReference || typeof manifestReference.scenarioId !== 'string') return null;
  const memoryPlan = {
    contractVersion: 'dialogue_v2_memory_v1',
    sharedMemory: sharedDocument.target,
    scenarioThread,
  };
  const request = {
    sharedMemoryId: plainDataRecord(sharedDocument.target)?.id,
    summary: sharedValue.summary,
    ...(threadValue ? {
      scenarioThreadId: plainDataRecord(scenarioThread)?.id,
      checkpoint: threadValue.checkpoint,
    } : {}),
  };
  const result = buildDialogueV2MemoryWriteCommand({
    memoryPlan,
    manifestReference: sharedValue.manifestReference,
    originScenarioId: manifestReference.scenarioId,
    memoryAllowlist: authorization.memoryAllowlist,
  }, request);
  return result.ok ? result.command : null;
}

function persistenceDocuments(
  command: DialogueV2MemoryWriteCommand,
): readonly Readonly<{ relativePath: string; value: unknown }>[] {
  if (command.commandVersion !== 'dialogue_v2_memory_write_v1'
    || !Array.isArray(command.documents)
    || command.documents.length < 1
    || command.documents.length > 2) {
    throw new Error('dialogue_v2_memory_command_invalid');
  }
  const shared = command.documents[0];
  if (shared.target.scope !== 'account_language'
    || !SHARED_MEMORY_ID_PATTERN.test(shared.target.id)) {
    throw new Error('dialogue_v2_memory_command_invalid');
  }
  const documents: Readonly<{ relativePath: string; value: unknown }>[] = [{
    relativePath: `dialogue_v2_memory/${shared.target.id}`,
    value: shared.value,
  }];
  if (command.documents.length === 2) {
    const thread = command.documents[1];
    if (thread.target.scope !== 'account_language_scenario'
      || !SCENARIO_THREAD_ID_PATTERN.test(thread.target.id)
      || thread.target.studyTarget !== shared.target.studyTarget) {
      throw new Error('dialogue_v2_memory_command_invalid');
    }
    documents.push({
      relativePath: `dialogue_v2_memory/${shared.target.id}/threads/${thread.target.id}`,
      value: thread.value,
    });
  }
  return Object.freeze(documents);
}

/** Bridges the narrow persistence contract to the Admin SDK without exposing
 * collection names or document references to the callable request. */
export function makeFirestoreDialogueV2MemoryRepository(
  db: FirebaseFirestore.Firestore,
): DialogueV2MemoryPersistenceRepository {
  return Object.freeze({
    runTransaction: async <T>(
      work: (transaction: DialogueV2MemoryPersistenceTransaction) => Promise<T>,
    ): Promise<T> => db.runTransaction(async (firestoreTransaction) => work({
      get: async (path) => {
        const snapshot = await firestoreTransaction.get(db.doc(path));
        return snapshot.exists
          ? { exists: true, data: snapshot.data() }
          : { exists: false };
      },
      set: (path, value) => {
        firestoreTransaction.set(
          db.doc(path),
          value as FirebaseFirestore.DocumentData,
        );
      },
    })),
  });
}

/**
 * Commits the already-sanitized command to fixed server-owned paths. Identity
 * and deletion state are re-read in the same transaction as the writes, so an
 * account cannot enter deletion between callable authorization and commit.
 */
export async function persistDialogueV2MemoryCommand(
  repository: DialogueV2MemoryPersistenceRepository,
  authUid: string,
  stableAccountId: string,
  command: DialogueV2MemoryWriteCommand,
): Promise<void> {
  await repository.runTransaction((transaction) => applyDialogueV2MemoryCommand(
    transaction,
    authUid,
    stableAccountId,
    command,
  ));
}

/** Applies a canonical memory command inside a caller-owned transaction. */
export async function applyDialogueV2MemoryCommand(
  transaction: DialogueV2MemoryPersistenceTransaction,
  authUid: string,
  stableAccountId: string,
  command: DialogueV2MemoryWriteCommand,
): Promise<void> {
  if (!safeDocumentSegment(authUid, 128) || !safeDocumentSegment(stableAccountId, 256)) {
    throw new Error('dialogue_v2_memory_identity_invalid');
  }
  const canonicalCommand = canonicalPersistenceCommand(command);
  if (!canonicalCommand) throw new Error('dialogue_v2_memory_command_invalid');
  const documents = persistenceDocuments(canonicalCommand);
  const [authLink, tombstone] = await Promise.all([
    transaction.get(`auth_links/${authUid}`),
    transaction.get(`account_deletion_tombstones/${stableAccountId}`),
  ]);
  const authLinkData = plainDataRecord(authLink.data);
  if (!authLink.exists || !authLinkData || authLinkData.stable_id !== stableAccountId) {
    throw new Error('dialogue_v2_memory_identity_mismatch');
  }
  if (tombstone.exists) {
    throw new Error('dialogue_v2_memory_account_delete_pending');
  }
  for (const document of documents) {
    transaction.set(`users/${stableAccountId}/${document.relativePath}`, document.value);
  }
}

function callableRequestData(value: unknown): PlainRecord | null {
  const record = plainDataRecord(value);
  if (!record
    || Object.keys(record).some((field) => !CALLABLE_REQUEST_FIELDS.has(field))
    || !hasOwnField(record, 'studyTarget')
    || !hasOwnField(record, 'scenarioId')
    || !hasOwnField(record, 'summary')) return null;
  return record;
}

function persistenceError(error: DialogueV2MemoryWriteError): HttpsError {
  if (error === 'checkpoint_not_allowed') {
    return new HttpsError('permission-denied', 'dialogue_v2_memory_checkpoint_not_allowed');
  }
  return new HttpsError('invalid-argument', 'dialogue_v2_memory_request_invalid');
}

function memoryAuthorizationFromApprovedPack(
  value: unknown,
  studyTarget: DialogueV2MemoryStudyTarget,
  scenarioId: string,
): Readonly<{
  manifestReference: DialogueV2ManifestProvenReference;
  memoryAllowlist: DialogueV2MemoryAllowlist;
}> | null {
  if (!validateDialogueV2LanguagePack(value).ok) return null;
  const packet = value as DialogueV2LanguagePack;
  if (packet.studyTarget !== studyTarget
    || packet.scenario.id !== scenarioId
    || DIALOGUE_V2_REVIEW_ROLES.some((role) => packet.review[role] !== 'PASS')) return null;
  const memoryAllowlist = cloneMemoryAllowlist({
    objectiveIds: packet.scenario.objectives.map((objective) => objective.id),
    personaStates: Object.fromEntries(packet.scenario.personas.map((persona) => [
      persona.id,
      [...new Set([persona.replyStyle, persona.mood, persona.correctionStyle])],
    ])),
  });
  if (!memoryAllowlist) return null;
  return Object.freeze({
    manifestReference: Object.freeze({
      studyTarget: packet.studyTarget,
      scenarioId: packet.scenario.id,
      packVersion: packet.packVersion,
      packSha256: packet.packSha256,
      catalogueSha256: packet.catalogueSha256,
      reviewReceiptSha256: packet.reviewReceiptSha256,
    }),
    memoryAllowlist,
  });
}

function memoryAuthorizationFromCompletionSnapshot(
  snapshot: DialogueV2SessionCompletionReleaseSnapshot,
): Readonly<{
  manifestReference: DialogueV2ManifestProvenReference;
  memoryAllowlist: DialogueV2MemoryAllowlist;
}> | null {
  if (!getDialogueV2CatalogueEntry(snapshot.scenarioId)) return null;
  const memoryAllowlist = cloneMemoryAllowlist({
    objectiveIds: snapshot.objectives.map((objective) => objective.id),
    personaStates: Object.fromEntries(snapshot.personas.map((persona) => [
      persona.id,
      [...new Set([persona.replyStyle, persona.mood, persona.correctionStyle])],
    ])),
  });
  if (!memoryAllowlist) return null;
  return Object.freeze({
    manifestReference: Object.freeze({
      studyTarget: snapshot.studyTarget,
      scenarioId: snapshot.scenarioId,
      packVersion: snapshot.packVersion,
      packSha256: snapshot.packSha256,
      catalogueSha256: snapshot.catalogueSha256,
      reviewReceiptSha256: snapshot.reviewReceiptSha256,
    }),
    memoryAllowlist,
  });
}

function sameManifestReference(
  value: unknown,
  expected: DialogueV2ManifestProvenReference,
): boolean {
  const record = plainDataRecord(value);
  return Boolean(record
    && hasExactFields(record, [
      'studyTarget', 'scenarioId', 'packVersion', 'packSha256',
      'catalogueSha256', 'reviewReceiptSha256',
    ])
    && record.studyTarget === expected.studyTarget
    && record.scenarioId === expected.scenarioId
    && record.packVersion === expected.packVersion
    && record.packSha256 === expected.packSha256
    && record.catalogueSha256 === expected.catalogueSha256
    && record.reviewReceiptSha256 === expected.reviewReceiptSha256);
}

function storedSharedSummary(
  value: unknown,
  studyTarget: DialogueV2MemoryStudyTarget,
  release: DialogueV2ServerRelease,
): DialogueV2MemorySummary | null {
  const document = plainDataRecord(value);
  const manifestReference = plainDataRecord(document?.manifestReference);
  if (!document
    || !hasExactFields(document, [
      'contractVersion', 'studyTarget', 'manifestReference', 'summary',
    ])
    || document.contractVersion !== 'dialogue_v2_memory_v1'
    || document.studyTarget !== studyTarget
    || !manifestReference
    || manifestReference.studyTarget !== studyTarget
    || typeof manifestReference.scenarioId !== 'string') return null;
  const originPacket = authorizeDialogueV2ServerPacket({
    studyTarget,
    scenarioId: manifestReference.scenarioId,
  }, release);
  const originAuthorization = memoryAuthorizationFromApprovedPack(
    originPacket,
    studyTarget,
    manifestReference.scenarioId,
  );
  if (!originAuthorization
    || !sameManifestReference(document.manifestReference, originAuthorization.manifestReference)) {
    return null;
  }
  const allowlist = originAuthorization.memoryAllowlist;
  const summary = cloneMemorySummary(document.summary, allowlist);
  if (!summary
    || summary.completedObjectives !== summary.strengths.length
    || summary.completedObjectives > allowlist.objectiveIds.length
    || summary.strengths.some((objectiveId) => summary.focusAreas.includes(objectiveId))) return null;
  return summary;
}

function storedScenarioCheckpoint(
  value: unknown,
  studyTarget: DialogueV2MemoryStudyTarget,
  scenarioId: string,
  expectedReference: DialogueV2ManifestProvenReference,
  allowlist: DialogueV2MemoryAllowlist,
): DialogueV2MemoryCheckpoint | null {
  const document = plainDataRecord(value);
  if (!document
    || !hasExactFields(document, [
      'contractVersion', 'studyTarget', 'scenarioId', 'manifestReference', 'checkpoint',
    ])
    || document.contractVersion !== 'dialogue_v2_memory_v1'
    || document.studyTarget !== studyTarget
    || document.scenarioId !== scenarioId
    || !sameManifestReference(document.manifestReference, expectedReference)) return null;
  const checkpoint = cloneMemoryCheckpoint(document.checkpoint, allowlist);
  if (!checkpoint || checkpoint.nextObjectiveIndex > allowlist.objectiveIds.length) return null;
  return checkpoint;
}

function sameOrderedIds(value: unknown, expected: readonly string[]): value is readonly string[] {
  return Array.isArray(value)
    && value.length === expected.length
    && value.every((item, index) => item === expected[index]);
}

function completionMemoryPayload(
  value: unknown,
  scenario: Readonly<{
    objectives: readonly Readonly<{ id: string }>[];
    personas: readonly Readonly<{ id: string; mood: string }>[];
  }>,
  includeCheckpoint: boolean,
): Readonly<{
  summary: DialogueV2MemorySummary;
  checkpoint?: DialogueV2MemoryCheckpoint;
}> | null {
  const completion = plainDataRecord(value);
  const context = plainDataRecord(completion?.context);
  const feedback = plainDataRecord(completion?.feedback);
  const expectedObjectiveIds = scenario.objectives.map((objective) => objective.id);
  const expectedPersonaIds = scenario.personas.map((persona) => persona.id);
  if (!completion || !context || !feedback
    || !sameOrderedIds(context.objectiveIds, expectedObjectiveIds)
    || !sameOrderedIds(context.personaIds, expectedPersonaIds)
    || !Array.isArray(context.userMessageIds)
    || !validateDialogueV2CompletionFeedback(feedback, {
      objectiveIds: expectedObjectiveIds,
      personaIds: expectedPersonaIds,
      userMessageIds: context.userMessageIds as readonly string[],
    }).ok) return null;

  const feedbackResults = feedback.objectiveResults as readonly Readonly<{
    objectiveId: string;
    status: 'met' | 'not_met';
  }>[];
  const resultByObjective = new Map(feedbackResults.map((result) => [result.objectiveId, result.status]));
  const strengths = expectedObjectiveIds.filter((objectiveId) => resultByObjective.get(objectiveId) === 'met');
  const focusAreas = expectedObjectiveIds.filter((objectiveId) => resultByObjective.get(objectiveId) === 'not_met');
  const summary: DialogueV2MemorySummary = Object.freeze({
    strengths: Object.freeze(strengths),
    focusAreas: Object.freeze(focusAreas),
    completedObjectives: strengths.length,
  });
  if (!includeCheckpoint) return Object.freeze({ summary });

  const speakerPersonaId = feedback.speakerPersonaId as string;
  const speakerPersona = scenario.personas.find((persona) => persona.id === speakerPersonaId);
  if (!speakerPersona) return null;
  const firstUnmetIndex = expectedObjectiveIds.findIndex(
    (objectiveId) => resultByObjective.get(objectiveId) === 'not_met',
  );
  const checkpoint: DialogueV2MemoryCheckpoint = Object.freeze({
    nextObjectiveIndex: firstUnmetIndex >= 0 ? firstUnmetIndex : expectedObjectiveIds.length,
    completedObjectiveIds: summary.strengths,
    personaState: Object.freeze({ [speakerPersonaId]: speakerPersona.mood }),
  });
  return Object.freeze({ summary, checkpoint });
}

/**
 * Persists memory derived only from a server-validated terminal completion.
 * Learner messages, assessment prose, evidence text and audio never enter the
 * command. The entitlement is resolved on the server: Free receives only the
 * account/language summary, while Plus additionally receives a resumable
 * scenario checkpoint.
 */
export async function prepareDialogueV2CompletionMemory(
  request: DialogueV2CompletionMemoryRequest,
  dependencies: DialogueV2CompletionMemoryPreparationDependencies,
): Promise<DialogueV2PreparedCompletionMemory> {
  const authUid = request.authUid;
  const studyTarget = request.studyTarget;
  const scenarioId = request.scenarioId;
  if (typeof authUid !== 'string' || !safeDocumentSegment(authUid, 128)) {
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  if (typeof studyTarget !== 'string'
    || !['en', 'es', 'fr', 'de'].includes(studyTarget)
    || typeof scenarioId !== 'string') {
    throw new HttpsError('invalid-argument', 'dialogue_v2_memory_request_invalid');
  }

  const storedSnapshot = request.releaseSnapshot === undefined
    ? null
    : createDialogueV2SessionCompletionReleaseSnapshot(request.releaseSnapshot);
  let approvedLanguagePack: DialogueV2LanguagePack | null = null;
  if (request.releaseSnapshot !== undefined && (!storedSnapshot
    || storedSnapshot.studyTarget !== studyTarget
    || storedSnapshot.scenarioId !== scenarioId)) {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_release_unavailable');
  }
  if (!storedSnapshot) {
    try {
      approvedLanguagePack = await dependencies.resolveApprovedLanguagePack(
        studyTarget as DialogueV2MemoryStudyTarget,
        scenarioId,
      );
    } catch (cause) {
      reportCauseServer('dialogue_v2_memory_writer:release', cause);
      throw new HttpsError('failed-precondition', 'dialogue_v2_memory_release_unavailable');
    }
  }
  const memoryAuthorization = storedSnapshot
    ? memoryAuthorizationFromCompletionSnapshot(storedSnapshot)
    : memoryAuthorizationFromApprovedPack(
      approvedLanguagePack,
      studyTarget as DialogueV2MemoryStudyTarget,
      scenarioId,
    );
  if (!memoryAuthorization || (!storedSnapshot && !approvedLanguagePack)) {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_release_unavailable');
  }

  // Validate the completion and reduce it to structured IDs before any user
  // identity or entitlement read. Prose/evidence fields are intentionally not
  // copied into the persistence payload.
  const validatedPayload = completionMemoryPayload(
    request.completion,
    storedSnapshot ?? approvedLanguagePack!.scenario,
    true,
  );
  if (!validatedPayload?.checkpoint) {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_completion_invalid');
  }

  let stableAccountId: string;
  let isPremium: boolean;
  try {
    stableAccountId = await dependencies.resolveStableAccountId(authUid);
    if (!safeDocumentSegment(stableAccountId, 256)) throw new Error('identity_invalid');
    isPremium = await dependencies.resolvePremiumAccess(stableAccountId, authUid);
  } catch (cause) {
    reportCauseServer('dialogue_v2_memory_writer:identity_or_premium', cause);
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_identity_unavailable');
  }
  if (typeof isPremium !== 'boolean') {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_entitlement_unavailable');
  }

  const memoryPlan = deriveDialogueV2MemoryPlan({
    stableAccountId,
    isPremium,
    identifierSecret: dependencies.identifierSecret,
    approvedPackManifest: Object.freeze({
      [`${studyTarget}:${scenarioId}`]: memoryAuthorization.manifestReference,
    }),
  }, { studyTarget: studyTarget as DialogueV2MemoryStudyTarget, scenarioId });
  if (!memoryPlan) {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_contract_unavailable');
  }
  const commandResult = buildDialogueV2MemoryWriteCommand({
    memoryPlan,
    manifestReference: memoryAuthorization.manifestReference,
    originScenarioId: scenarioId,
    memoryAllowlist: memoryAuthorization.memoryAllowlist,
  }, {
    sharedMemoryId: memoryPlan.sharedMemory.id,
    summary: validatedPayload.summary,
    ...(isPremium ? {
      scenarioThreadId: memoryPlan.scenarioThread?.id,
      checkpoint: validatedPayload.checkpoint,
    } : {}),
  });
  if (!commandResult.ok) throw persistenceError(commandResult.error);
  return Object.freeze({
    authUid,
    stableAccountId,
    command: commandResult.command,
    receipt: Object.freeze({
      ok: true as const,
      sharedMemoryStored: true as const,
      scenarioCheckpointStored: isPremium,
    }),
  });
}

export async function persistDialogueV2CompletionMemory(
  request: DialogueV2CompletionMemoryRequest,
  dependencies: DialogueV2MemoryWriteDependencies,
): Promise<DialogueV2MemoryWriteResponse> {
  const prepared = await prepareDialogueV2CompletionMemory(request, dependencies);
  try {
    await persistDialogueV2MemoryCommand(
      dependencies.repository,
      prepared.authUid,
      prepared.stableAccountId,
      prepared.command,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    if (reason.includes('account_delete')) {
      throw new HttpsError('failed-precondition', 'dialogue_v2_memory_account_delete_pending');
    }
    if (reason.includes('identity')) {
      throw new HttpsError('permission-denied', 'dialogue_v2_memory_identity_mismatch');
    }
    throw new HttpsError('internal', 'dialogue_v2_memory_write_failed');
  }
  return prepared.receipt;
}

/**
 * Callable handler core. Every authority input is resolved by injected server
 * dependencies; the request may select only a released language/scenario and
 * submit the compact structured summary/checkpoint schema.
 */
export async function executeDialogueV2MemoryWrite(
  request: DialogueV2MemoryCallableRequest,
  dependencies: DialogueV2MemoryWriteDependencies,
): Promise<DialogueV2MemoryWriteResponse> {
  const authUid = request.auth?.uid;
  if (typeof authUid !== 'string' || !safeDocumentSegment(authUid, 128)) {
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const data = callableRequestData(request.data);
  if (!data) throw new HttpsError('invalid-argument', 'dialogue_v2_memory_request_invalid');
  const studyTarget = data.studyTarget;
  const scenarioId = data.scenarioId;
  if (typeof studyTarget !== 'string'
    || !['en', 'es', 'fr', 'de'].includes(studyTarget)
    || typeof scenarioId !== 'string') {
    throw new HttpsError('invalid-argument', 'dialogue_v2_memory_request_invalid');
  }

  let stableAccountId: string;
  let isPremium: boolean;
  let approvedLanguagePack: DialogueV2LanguagePack | null;
  try {
    stableAccountId = await dependencies.resolveStableAccountId(authUid);
    if (!safeDocumentSegment(stableAccountId, 256)) throw new Error('identity_invalid');
    [isPremium, approvedLanguagePack] = await Promise.all([
      dependencies.resolvePremiumAccess(stableAccountId, authUid),
      dependencies.resolveApprovedLanguagePack(
        studyTarget as DialogueV2MemoryStudyTarget,
        scenarioId,
      ),
    ]);
  } catch (cause) {
    reportCauseServer('dialogue_v2_memory_writer:identity_bundle', cause);
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_identity_unavailable');
  }
  if (typeof isPremium !== 'boolean') {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_entitlement_unavailable');
  }
  const memoryAuthorization = memoryAuthorizationFromApprovedPack(
    approvedLanguagePack,
    studyTarget as DialogueV2MemoryStudyTarget,
    scenarioId,
  );
  if (!memoryAuthorization) {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_release_unavailable');
  }
  const { manifestReference, memoryAllowlist } = memoryAuthorization;
  const approvedPackManifest = Object.freeze({
    [`${studyTarget}:${scenarioId}`]: manifestReference,
  });
  const memoryPlan = deriveDialogueV2MemoryPlan({
    stableAccountId,
    isPremium,
    identifierSecret: dependencies.identifierSecret,
    approvedPackManifest,
  }, { studyTarget, scenarioId });
  if (!memoryPlan) {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_contract_unavailable');
  }

  const hasCheckpoint = hasOwnField(data, 'checkpoint');
  const commandResult = buildDialogueV2MemoryWriteCommand({
    memoryPlan,
    manifestReference,
    originScenarioId: scenarioId,
    memoryAllowlist,
  }, {
    sharedMemoryId: memoryPlan.sharedMemory.id,
    summary: data.summary,
    ...(hasCheckpoint ? {
      scenarioThreadId: memoryPlan.scenarioThread?.id,
      checkpoint: data.checkpoint,
    } : {}),
  });
  if (!commandResult.ok) throw persistenceError(commandResult.error);

  try {
    await persistDialogueV2MemoryCommand(
      dependencies.repository,
      authUid,
      stableAccountId,
      commandResult.command,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    if (reason.includes('account_delete')) {
      throw new HttpsError('failed-precondition', 'dialogue_v2_memory_account_delete_pending');
    }
    if (reason.includes('identity')) {
      throw new HttpsError('permission-denied', 'dialogue_v2_memory_identity_mismatch');
    }
    throw new HttpsError('internal', 'dialogue_v2_memory_write_failed');
  }
  return Object.freeze({
    ok: true as const,
    sharedMemoryStored: true as const,
    scenarioCheckpointStored: hasCheckpoint,
  });
}

/**
 * Server-only read/resume core. The caller can select only a released language
 * and scenario. Stable identity, entitlement and opaque storage paths remain
 * server-owned, and persisted documents are reduced to the bounded structured
 * fields before crossing the callable boundary.
 */
export async function executeDialogueV2MemoryRead(
  request: DialogueV2MemoryCallableRequest,
  dependencies: DialogueV2MemoryReadDependencies,
): Promise<DialogueV2MemoryReadResponse> {
  const authUid = request.auth?.uid;
  if (typeof authUid !== 'string' || !safeDocumentSegment(authUid, 128)) {
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const data = plainDataRecord(request.data);
  if (!data
    || !hasExactFields(data, [...READ_REQUEST_FIELDS])
    || typeof data.studyTarget !== 'string'
    || !['en', 'es', 'fr', 'de'].includes(data.studyTarget)
    || typeof data.scenarioId !== 'string'
    || !getDialogueV2CatalogueEntry(data.scenarioId)) {
    throw new HttpsError('invalid-argument', 'dialogue_v2_memory_read_request_invalid');
  }
  const studyTarget = data.studyTarget as DialogueV2MemoryStudyTarget;
  const scenarioId = data.scenarioId;

  let stableAccountId: string;
  try {
    stableAccountId = await dependencies.resolveStableAccountId(authUid);
    if (!safeDocumentSegment(stableAccountId, 256)) throw new Error('identity_invalid');
  } catch (cause) {
    reportCauseServer('dialogue_v2_memory_writer:identity', cause);
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_identity_unavailable');
  }

  let isPremium: boolean;
  try {
    isPremium = await dependencies.resolvePremiumAccess(stableAccountId, authUid);
  } catch (cause) {
    reportCauseServer('dialogue_v2_memory_writer:entitlement', cause);
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_entitlement_unavailable');
  }
  if (typeof isPremium !== 'boolean') {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_entitlement_unavailable');
  }
  if (isPremium !== true) {
    throw new HttpsError('permission-denied', 'dialogue_v2_memory_plus_required');
  }

  let release: DialogueV2ServerRelease | null;
  try {
    release = await dependencies.resolveRelease();
  } catch (cause) {
    reportCauseServer('dialogue_v2_memory_writer:resolve_release', cause);
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_release_unavailable');
  }
  if (!release) {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_release_unavailable');
  }
  const approvedLanguagePack = authorizeDialogueV2ServerPacket({
    studyTarget,
    scenarioId,
  }, release);
  const memoryAuthorization = memoryAuthorizationFromApprovedPack(
    approvedLanguagePack,
    studyTarget,
    scenarioId,
  );
  if (!memoryAuthorization) {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_release_unavailable');
  }
  const { manifestReference, memoryAllowlist } = memoryAuthorization;
  const memoryPlan = deriveDialogueV2MemoryPlan({
    stableAccountId,
    isPremium,
    identifierSecret: dependencies.identifierSecret,
    approvedPackManifest: Object.freeze({
      [`${studyTarget}:${scenarioId}`]: manifestReference,
    }),
  }, { studyTarget, scenarioId });
  if (!memoryPlan) {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_contract_unavailable');
  }

  const sharedPath = `users/${stableAccountId}/dialogue_v2_memory/${memoryPlan.sharedMemory.id}`;
  const threadPath = memoryPlan.scenarioThread
    ? `${sharedPath}/threads/${memoryPlan.scenarioThread.id}`
    : null;
  try {
    return await dependencies.repository.runTransaction(async (transaction) => {
      const authLink = await transaction.get(`auth_links/${authUid}`);
      const authLinkData = plainDataRecord(authLink.data);
      if (!authLink.exists || !authLinkData || authLinkData.stable_id !== stableAccountId) {
        throw new Error('dialogue_v2_memory_identity_mismatch');
      }
      const tombstone = await transaction.get(
        `account_deletion_tombstones/${stableAccountId}`,
      );
      if (tombstone.exists) {
        throw new Error('dialogue_v2_memory_account_delete_pending');
      }

      const sharedDocument = await transaction.get(sharedPath);
      const threadDocument = threadPath ? await transaction.get(threadPath) : null;
      const sharedSummary = sharedDocument.exists
        ? storedSharedSummary(
          sharedDocument.data,
          studyTarget,
          release,
        )
        : null;
      const scenarioCheckpoint = threadDocument?.exists
        ? storedScenarioCheckpoint(
          threadDocument.data,
          studyTarget,
          scenarioId,
          manifestReference,
          memoryAllowlist,
        )
        : null;
      return Object.freeze({
        ok: true as const,
        sharedSummary,
        scenarioCheckpoint,
      });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    if (reason.includes('account_delete')) {
      throw new HttpsError('failed-precondition', 'dialogue_v2_memory_account_delete_pending');
    }
    if (reason.includes('identity')) {
      throw new HttpsError('permission-denied', 'dialogue_v2_memory_identity_mismatch');
    }
    throw new HttpsError('internal', 'dialogue_v2_memory_read_failed');
  }
}

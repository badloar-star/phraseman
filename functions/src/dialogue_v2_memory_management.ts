import { types as nodeTypes } from 'node:util';
import { HttpsError } from 'firebase-functions/v2/https';
import { DIALOGUE_V2_CATALOGUE_INDEX } from '../../shared/dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_REVIEW_ROLES,
  validateDialogueV2LanguagePack,
  type DialogueV2LanguagePack,
} from '../../shared/dialogue_v2_language_pack_contract';
import {
  deriveDialogueV2MemoryPlan,
  deriveDialogueV2MemoryStorageIds,
  type DialogueV2MemoryPlan,
  type DialogueV2MemoryStudyTarget,
} from './dialogue_v2_memory_contract';
import {
  buildDialogueV2MemoryWriteCommand,
  type DialogueV2ManifestProvenReference,
  type DialogueV2MemoryAllowlist,
  type DialogueV2MemoryCheckpoint,
  type DialogueV2MemorySummary,
  type DialogueV2MemoryWriteTrustedContext,
} from './dialogue_v2_memory_writer';
import { reportCauseServer } from './swallowed_error'; // зачем (координатор 13.10): причина сбоя в журнале, поведение прежнее

const STUDY_TARGETS: ReadonlySet<string> = new Set(['en', 'es', 'fr', 'de']);
const EMPTY_SUMMARY = Object.freeze({
  strengths: Object.freeze([]),
  focusAreas: Object.freeze([]),
  completedObjectives: 0,
});

type PlainRecord = Record<string, unknown>;

export type DialogueV2MemoryLanguageScenarioAuthorization = Readonly<{
  scenarioId: string;
  manifestReference: DialogueV2ManifestProvenReference;
  memoryAllowlist: DialogueV2MemoryAllowlist;
  memoryPlan: DialogueV2MemoryPlan;
}>;

export type DialogueV2MemoryLanguageAuthorization = Readonly<{
  studyTarget: DialogueV2MemoryStudyTarget;
  scenarios: readonly DialogueV2MemoryLanguageScenarioAuthorization[];
}>;

export type DialogueV2MemoryManagementDocument = Readonly<{
  exists: boolean;
  data?: unknown;
}>;

export type DialogueV2MemoryManagementTransaction = Readonly<{
  get(path: string): Promise<DialogueV2MemoryManagementDocument>;
  delete(path: string): void;
}>;

export type DialogueV2MemoryManagementRepository = Readonly<{
  runTransaction<T>(
    work: (transaction: DialogueV2MemoryManagementTransaction) => Promise<T>,
  ): Promise<T>;
}>;

export type DialogueV2MemoryManagementDependencies = Readonly<{
  repository: DialogueV2MemoryManagementRepository;
  identifierSecret: string;
  resolveStableAccountId(authUid: string): Promise<string>;
  resolvePremiumAccess(stableAccountId: string, authUid: string): Promise<boolean>;
  resolveLanguageAuthorization(
    studyTarget: DialogueV2MemoryStudyTarget,
    stableAccountId: string,
    identifierSecret: string,
  ): Promise<DialogueV2MemoryLanguageAuthorization | null>;
}>;

export type BuildDialogueV2MemoryLanguageAuthorizationInput = Readonly<{
  studyTarget: DialogueV2MemoryStudyTarget;
  stableAccountId: string;
  identifierSecret: string;
  approvedPacks: readonly DialogueV2LanguagePack[];
}>;

export type DialogueV2MemoryManagementRequest = Readonly<{
  auth?: Readonly<{ uid?: unknown }>;
  data?: unknown;
}>;

export type DialogueV2MemoryViewResponse = Readonly<{
  ok: true;
  studyTarget: DialogueV2MemoryStudyTarget;
  sharedSummary: (DialogueV2MemorySummary & Readonly<{ scenarioId: string }>) | null;
  scenarioCheckpoints: readonly (DialogueV2MemoryCheckpoint & Readonly<{ scenarioId: string }>)[];
}>;

export type DialogueV2MemoryClearResponse = Readonly<{
  ok: true;
  studyTarget: DialogueV2MemoryStudyTarget;
  cleared: true;
  deletedDocuments: number;
}>;

function plainDataRecord(value: unknown): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string')) return null;
    const result = Object.create(null) as PlainRecord;
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable || !('value' in descriptor)) return null;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function hasExactFields(record: PlainRecord, fields: readonly string[]): boolean {
  const keys = Object.keys(record);
  return keys.length === fields.length && keys.every((key) => fields.includes(key));
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

function exactStudyTarget(value: unknown): DialogueV2MemoryStudyTarget | null {
  const data = plainDataRecord(value);
  if (!data
    || !hasExactFields(data, ['studyTarget'])
    || typeof data.studyTarget !== 'string'
    || !STUDY_TARGETS.has(data.studyTarget)) return null;
  return data.studyTarget as DialogueV2MemoryStudyTarget;
}

/**
 * Converts a fully release-authorized language pack set into exact opaque
 * storage plans. The account and secret are server-owned inputs only.
 */
export function buildDialogueV2MemoryLanguageAuthorization(
  input: BuildDialogueV2MemoryLanguageAuthorizationInput,
): DialogueV2MemoryLanguageAuthorization | null {
  if (!safeDocumentSegment(input.stableAccountId, 256)
    || typeof input.identifierSecret !== 'string'
    || input.identifierSecret.length < 32
    || !STUDY_TARGETS.has(input.studyTarget)
    || !Array.isArray(input.approvedPacks)
    || input.approvedPacks.length !== DIALOGUE_V2_CATALOGUE_INDEX.length) return null;

  const scenarios: DialogueV2MemoryLanguageScenarioAuthorization[] = [];
  for (let index = 0; index < DIALOGUE_V2_CATALOGUE_INDEX.length; index += 1) {
    const entry = DIALOGUE_V2_CATALOGUE_INDEX[index];
    const candidate = input.approvedPacks[index];
    if (!validateDialogueV2LanguagePack(candidate).ok) return null;
    const pack = candidate as DialogueV2LanguagePack;
    if (pack.studyTarget !== input.studyTarget
      || pack.scenario.id !== entry.id
      || DIALOGUE_V2_REVIEW_ROLES.some((role) => pack.review[role] !== 'PASS')) return null;
    const manifestReference = Object.freeze({
      studyTarget: pack.studyTarget,
      scenarioId: pack.scenario.id,
      packVersion: pack.packVersion,
      packSha256: pack.packSha256,
      catalogueSha256: pack.catalogueSha256,
      reviewReceiptSha256: pack.reviewReceiptSha256,
    });
    const memoryAllowlist = Object.freeze({
      objectiveIds: Object.freeze(pack.scenario.objectives.map((objective) => objective.id)),
      personaStates: Object.freeze(Object.fromEntries(pack.scenario.personas.map((persona) => [
        persona.id,
        Object.freeze([...new Set([
          persona.replyStyle,
          persona.mood,
          persona.correctionStyle,
        ])]),
      ]))),
    });
    const memoryPlan = deriveDialogueV2MemoryPlan({
      stableAccountId: input.stableAccountId,
      isPremium: true,
      identifierSecret: input.identifierSecret,
      approvedPackManifest: {
        [`${input.studyTarget}:${entry.id}`]: manifestReference,
      },
    }, { studyTarget: input.studyTarget, scenarioId: entry.id });
    if (!memoryPlan?.scenarioThread) return null;
    scenarios.push(Object.freeze({
      scenarioId: entry.id,
      manifestReference,
      memoryAllowlist,
      memoryPlan,
    }));
  }
  return canonicalLanguageAuthorization(Object.freeze({
    studyTarget: input.studyTarget,
    scenarios: Object.freeze(scenarios),
  }), input.studyTarget);
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

function trustedContext(
  scenario: DialogueV2MemoryLanguageScenarioAuthorization,
): DialogueV2MemoryWriteTrustedContext {
  return Object.freeze({
    memoryPlan: scenario.memoryPlan,
    manifestReference: scenario.manifestReference,
    originScenarioId: scenario.scenarioId,
    memoryAllowlist: scenario.memoryAllowlist,
  });
}

function canonicalLanguageAuthorization(
  value: DialogueV2MemoryLanguageAuthorization | null,
  studyTarget: DialogueV2MemoryStudyTarget,
): DialogueV2MemoryLanguageAuthorization | null {
  if (!value || value.studyTarget !== studyTarget
    || !Array.isArray(value.scenarios)
    || value.scenarios.length !== DIALOGUE_V2_CATALOGUE_INDEX.length) return null;

  const scenarios: DialogueV2MemoryLanguageScenarioAuthorization[] = [];
  let sharedMemoryId: string | null = null;
  const threadIds = new Set<string>();
  for (let index = 0; index < DIALOGUE_V2_CATALOGUE_INDEX.length; index += 1) {
    const expectedEntry = DIALOGUE_V2_CATALOGUE_INDEX[index];
    const scenario = value.scenarios[index];
    const thread = scenario?.memoryPlan.scenarioThread;
    if (!scenario
      || scenario.scenarioId !== expectedEntry.id
      || scenario.manifestReference.studyTarget !== studyTarget
      || scenario.manifestReference.scenarioId !== expectedEntry.id
      || scenario.memoryPlan.sharedMemory.studyTarget !== studyTarget
      || !thread
      || thread.studyTarget !== studyTarget
      || thread.scenarioId !== expectedEntry.id
      || threadIds.has(thread.id)) return null;
    const command = buildDialogueV2MemoryWriteCommand(trustedContext(scenario), {
      sharedMemoryId: scenario.memoryPlan.sharedMemory.id,
      summary: EMPTY_SUMMARY,
      scenarioThreadId: thread.id,
      checkpoint: {
        nextObjectiveIndex: 0,
        completedObjectiveIds: [],
        personaState: {},
      },
    });
    if (!command.ok) return null;
    if (sharedMemoryId === null) sharedMemoryId = scenario.memoryPlan.sharedMemory.id;
    if (sharedMemoryId !== scenario.memoryPlan.sharedMemory.id) return null;
    threadIds.add(thread.id);
    scenarios.push(scenario);
  }
  return Object.freeze({ studyTarget, scenarios: Object.freeze(scenarios) });
}

function sharedPath(stableAccountId: string, languageAuthorization: DialogueV2MemoryLanguageAuthorization): string {
  return `users/${stableAccountId}/dialogue_v2_memory/${languageAuthorization.scenarios[0].memoryPlan.sharedMemory.id}`;
}

function threadPath(
  stableAccountId: string,
  languageAuthorization: DialogueV2MemoryLanguageAuthorization,
  scenario: DialogueV2MemoryLanguageScenarioAuthorization,
): string {
  const thread = scenario.memoryPlan.scenarioThread;
  if (!thread) throw new Error('dialogue_v2_memory_management_authorization_invalid');
  return `${sharedPath(stableAccountId, languageAuthorization)}/threads/${thread.id}`;
}

function projectSharedSummary(
  value: unknown,
  languageAuthorization: DialogueV2MemoryLanguageAuthorization,
): DialogueV2MemoryViewResponse['sharedSummary'] {
  const document = plainDataRecord(value);
  const reference = plainDataRecord(document?.manifestReference);
  if (!document
    || !hasExactFields(document, [
      'contractVersion', 'studyTarget', 'manifestReference', 'summary',
    ])
    || document.contractVersion !== 'dialogue_v2_memory_v1'
    || document.studyTarget !== languageAuthorization.studyTarget
    || !reference
    || typeof reference.scenarioId !== 'string') return null;
  const scenario = languageAuthorization.scenarios.find(
    (candidate) => candidate.scenarioId === reference.scenarioId,
  );
  if (!scenario || !sameManifestReference(reference, scenario.manifestReference)) return null;
  const result = buildDialogueV2MemoryWriteCommand(trustedContext(scenario), {
    sharedMemoryId: scenario.memoryPlan.sharedMemory.id,
    summary: document.summary,
  });
  if (!result.ok) return null;
  const sharedDocument = result.command.documents[0];
  if (!('summary' in sharedDocument.value)) return null;
  const storedSummary = sharedDocument.value.summary;
  return Object.freeze({ scenarioId: scenario.scenarioId, ...storedSummary });
}

function projectScenarioCheckpoint(
  value: unknown,
  scenario: DialogueV2MemoryLanguageScenarioAuthorization,
): DialogueV2MemoryViewResponse['scenarioCheckpoints'][number] | null {
  const document = plainDataRecord(value);
  const thread = scenario.memoryPlan.scenarioThread;
  if (!document || !thread
    || !hasExactFields(document, [
      'contractVersion', 'studyTarget', 'scenarioId', 'manifestReference', 'checkpoint',
    ])
    || document.contractVersion !== 'dialogue_v2_memory_v1'
    || document.studyTarget !== scenario.memoryPlan.sharedMemory.studyTarget
    || document.scenarioId !== scenario.scenarioId
    || !sameManifestReference(document.manifestReference, scenario.manifestReference)) return null;
  const result = buildDialogueV2MemoryWriteCommand(trustedContext(scenario), {
    sharedMemoryId: scenario.memoryPlan.sharedMemory.id,
    summary: EMPTY_SUMMARY,
    scenarioThreadId: thread.id,
    checkpoint: document.checkpoint,
  });
  if (!result.ok || result.command.documents.length !== 2) return null;
  const threadDocument = result.command.documents[1];
  if (!('checkpoint' in threadDocument.value)) return null;
  return Object.freeze({ scenarioId: scenario.scenarioId, ...threadDocument.value.checkpoint });
}

async function authorizeManagementRequest(
  request: DialogueV2MemoryManagementRequest,
  dependencies: DialogueV2MemoryManagementDependencies,
): Promise<Readonly<{
  authUid: string;
  stableAccountId: string;
  studyTarget: DialogueV2MemoryStudyTarget;
  languageAuthorization: DialogueV2MemoryLanguageAuthorization;
}>> {
  const authUid = request.auth?.uid;
  if (!safeDocumentSegment(authUid, 128)) {
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const studyTarget = exactStudyTarget(request.data);
  if (!studyTarget) {
    throw new HttpsError('invalid-argument', 'dialogue_v2_memory_management_request_invalid');
  }

  let stableAccountId: string;
  try {
    stableAccountId = await dependencies.resolveStableAccountId(authUid);
    if (!safeDocumentSegment(stableAccountId, 256)) throw new Error('identity_invalid');
  } catch (cause) {
    reportCauseServer('dialogue_v2_memory_management:identity', cause);
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_identity_unavailable');
  }

  let isPremium: boolean;
  try {
    isPremium = await dependencies.resolvePremiumAccess(stableAccountId, authUid);
  } catch (cause) {
    reportCauseServer('dialogue_v2_memory_management:entitlement', cause);
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_entitlement_unavailable');
  }
  if (isPremium !== true) {
    throw new HttpsError('permission-denied', 'dialogue_v2_memory_plus_required');
  }

  let unresolvedAuthorization: DialogueV2MemoryLanguageAuthorization | null;
  try {
    unresolvedAuthorization = await dependencies.resolveLanguageAuthorization(
      studyTarget,
      stableAccountId,
      dependencies.identifierSecret,
    );
  } catch (cause) {
    reportCauseServer('dialogue_v2_memory_management:release', cause);
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_release_unavailable');
  }
  const languageAuthorization = canonicalLanguageAuthorization(unresolvedAuthorization, studyTarget);
  if (!languageAuthorization) {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_release_unavailable');
  }
  return Object.freeze({ authUid, stableAccountId, studyTarget, languageAuthorization });
}

async function authorizeClearRequest(
  request: DialogueV2MemoryManagementRequest,
  dependencies: DialogueV2MemoryManagementDependencies,
): Promise<Readonly<{
  authUid: string;
  stableAccountId: string;
  studyTarget: DialogueV2MemoryStudyTarget;
  sharedMemoryId: string;
  scenarioThreadIds: readonly string[];
}>> {
  const authUid = request.auth?.uid;
  if (!safeDocumentSegment(authUid, 128)) {
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const studyTarget = exactStudyTarget(request.data);
  if (!studyTarget) {
    throw new HttpsError('invalid-argument', 'dialogue_v2_memory_management_request_invalid');
  }

  let stableAccountId: string;
  try {
    stableAccountId = await dependencies.resolveStableAccountId(authUid);
    if (!safeDocumentSegment(stableAccountId, 256)) throw new Error('identity_invalid');
  } catch (cause) {
    reportCauseServer('dialogue_v2_memory_management:identity_clear', cause);
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_identity_unavailable');
  }

  const derived = DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => deriveDialogueV2MemoryStorageIds({
    stableAccountId,
    identifierSecret: dependencies.identifierSecret,
  }, { studyTarget, scenarioId: entry.id }));
  if (derived.some((ids) => ids === null)) {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_identifier_unavailable');
  }
  const storageIds = derived as readonly NonNullable<(typeof derived)[number]>[];
  const sharedMemoryId = storageIds[0]?.sharedMemoryId;
  const scenarioThreadIds = storageIds.map((ids) => ids.scenarioThreadId);
  if (!sharedMemoryId
    || storageIds.some((ids) => ids.sharedMemoryId !== sharedMemoryId)
    || new Set(scenarioThreadIds).size !== DIALOGUE_V2_CATALOGUE_INDEX.length) {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_identifier_unavailable');
  }
  return Object.freeze({
    authUid,
    stableAccountId,
    studyTarget,
    sharedMemoryId,
    scenarioThreadIds: Object.freeze(scenarioThreadIds),
  });
}

function mapTransactionError(error: unknown, operation: 'view' | 'clear'): never {
  const reason = error instanceof Error ? error.message : '';
  if (reason.includes('account_delete')) {
    throw new HttpsError('failed-precondition', 'dialogue_v2_memory_account_delete_pending');
  }
  if (reason.includes('identity')) {
    throw new HttpsError('permission-denied', 'dialogue_v2_memory_identity_mismatch');
  }
  throw new HttpsError('internal', `dialogue_v2_memory_${operation}_failed`);
}

async function readOwnerFence(
  transaction: DialogueV2MemoryManagementTransaction,
  authUid: string,
  stableAccountId: string,
): Promise<void> {
  const [authLink, tombstone] = await Promise.all([
    transaction.get(`auth_links/${authUid}`),
    transaction.get(`account_deletion_tombstones/${stableAccountId}`),
  ]);
  const authLinkData = plainDataRecord(authLink.data);
  if (!authLink.exists || !authLinkData || authLinkData.stable_id !== stableAccountId) {
    throw new Error('dialogue_v2_memory_identity_mismatch');
  }
  if (tombstone.exists) throw new Error('dialogue_v2_memory_account_delete_pending');
}

export async function executeDialogueV2MemoryView(
  request: DialogueV2MemoryManagementRequest,
  dependencies: DialogueV2MemoryManagementDependencies,
): Promise<DialogueV2MemoryViewResponse> {
  const approved = await authorizeManagementRequest(request, dependencies);
  const rootPath = sharedPath(approved.stableAccountId, approved.languageAuthorization);
  try {
    return await dependencies.repository.runTransaction(async (transaction) => {
      await readOwnerFence(transaction, approved.authUid, approved.stableAccountId);
      const [sharedDocument, ...threadDocuments] = await Promise.all([
        transaction.get(rootPath),
        ...approved.languageAuthorization.scenarios.map((scenario) => transaction.get(
          threadPath(approved.stableAccountId, approved.languageAuthorization, scenario),
        )),
      ]);
      const scenarioCheckpoints = approved.languageAuthorization.scenarios.flatMap((scenario, index) => {
        const document = threadDocuments[index];
        if (!document?.exists) return [];
        const checkpoint = projectScenarioCheckpoint(document.data, scenario);
        return checkpoint ? [checkpoint] : [];
      });
      return Object.freeze({
        ok: true as const,
        studyTarget: approved.studyTarget,
        sharedSummary: sharedDocument.exists
          ? projectSharedSummary(sharedDocument.data, approved.languageAuthorization)
          : null,
        scenarioCheckpoints: Object.freeze(scenarioCheckpoints),
      });
    });
  } catch (error) {
    return mapTransactionError(error, 'view');
  }
}

export async function executeDialogueV2MemoryClear(
  request: DialogueV2MemoryManagementRequest,
  dependencies: DialogueV2MemoryManagementDependencies,
): Promise<DialogueV2MemoryClearResponse> {
  const approved = await authorizeClearRequest(request, dependencies);
  const rootPath = `users/${approved.stableAccountId}/dialogue_v2_memory/${approved.sharedMemoryId}`;
  const paths = Object.freeze([
    rootPath,
    ...approved.scenarioThreadIds.map((threadId) => `${rootPath}/threads/${threadId}`),
  ]);
  try {
    return await dependencies.repository.runTransaction(async (transaction) => {
      await readOwnerFence(transaction, approved.authUid, approved.stableAccountId);
      const documents = await Promise.all(paths.map((path) => transaction.get(path)));
      for (const path of paths) transaction.delete(path);
      return Object.freeze({
        ok: true as const,
        studyTarget: approved.studyTarget,
        cleared: true as const,
        deletedDocuments: documents.filter((document) => document.exists).length,
      });
    });
  } catch (error) {
    return mapTransactionError(error, 'clear');
  }
}

/** Firestore adapter with no caller-selectable collection or document path. */
export function makeFirestoreDialogueV2MemoryManagementRepository(
  db: FirebaseFirestore.Firestore,
): DialogueV2MemoryManagementRepository {
  return Object.freeze({
    runTransaction: async <T>(
      work: (transaction: DialogueV2MemoryManagementTransaction) => Promise<T>,
    ): Promise<T> => db.runTransaction(async (firestoreTransaction) => work({
      get: async (path) => {
        const snapshot = await firestoreTransaction.get(db.doc(path));
        return snapshot.exists
          ? { exists: true, data: snapshot.data() }
          : { exists: false };
      },
      delete: (path) => { firestoreTransaction.delete(db.doc(path)); },
    })),
  });
}

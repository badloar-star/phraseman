import { createHmac } from 'node:crypto';
import { getDialogueV2CatalogueEntry } from '../../shared/dialogue_v2_catalogue_index';
import { validateDialogueV2PackReference } from '../../shared/dialogue_v2_contract';

export type DialogueV2MemoryStudyTarget = 'en' | 'es' | 'fr' | 'de';

export type DialogueV2MemoryServerContext = Readonly<{
  stableAccountId?: unknown;
  isPremium?: unknown;
  identifierSecret?: unknown;
  approvedPackManifest?: unknown;
}>;

export type DialogueV2MemoryRequest = Readonly<{
  studyTarget?: unknown;
  scenarioId?: unknown;
  [field: string]: unknown;
}>;

export type DialogueV2MemoryPlan = Readonly<{
  contractVersion: 'dialogue_v2_memory_v1';
  sharedMemory: Readonly<{
    id: string;
    scope: 'account_language';
    studyTarget: DialogueV2MemoryStudyTarget;
    format: 'structured_summary';
    rawTranscriptRetention: 'forbidden';
  }>;
  scenarioThread: Readonly<{
    id: string;
    scope: 'account_language_scenario';
    studyTarget: DialogueV2MemoryStudyTarget;
    scenarioId: string;
    resumable: true;
    format: 'structured_checkpoint';
    rawTranscriptRetention: 'forbidden';
  }> | null;
}>;

export type DialogueV2MemoryStorageIds = Readonly<{
  sharedMemoryId: string;
  scenarioThreadId: string;
}>;

const STUDY_TARGETS: ReadonlySet<string> = new Set(['en', 'es', 'fr', 'de']);
const SCENARIO_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MIN_IDENTIFIER_SECRET_LENGTH = 32;
const MAX_STABLE_ACCOUNT_ID_LENGTH = 256;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function asStudyTarget(value: unknown): DialogueV2MemoryStudyTarget | null {
  return typeof value === 'string' && STUDY_TARGETS.has(value)
    ? value as DialogueV2MemoryStudyTarget
    : null;
}

function asStableAccountId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0
    && trimmed.length <= MAX_STABLE_ACCOUNT_ID_LENGTH
    && trimmed === value
    ? value
    : null;
}

function asIdentifierSecret(value: unknown): string | null {
  return typeof value === 'string' && value.length >= MIN_IDENTIFIER_SECRET_LENGTH
    ? value
    : null;
}

function opaqueId(prefix: 'd2m' | 'd2t', secret: string, parts: readonly string[]): string {
  const digest = createHmac('sha256', secret)
    .update(parts.join('\u0000'), 'utf8')
    .digest('hex')
    .slice(0, 40);
  return `${prefix}_${digest}`;
}

/**
 * Derives only the server-owned storage identifiers needed for privacy erasure.
 * It deliberately does not depend on current entitlement or release availability.
 */
export function deriveDialogueV2MemoryStorageIds(
  serverContext: Pick<DialogueV2MemoryServerContext, 'stableAccountId' | 'identifierSecret'> | null | undefined,
  request: DialogueV2MemoryRequest | null | undefined,
): DialogueV2MemoryStorageIds | null {
  const stableAccountId = asStableAccountId(serverContext?.stableAccountId);
  const identifierSecret = asIdentifierSecret(serverContext?.identifierSecret);
  const studyTarget = asStudyTarget(request?.studyTarget);
  const scenarioId = typeof request?.scenarioId === 'string'
    && SCENARIO_ID_PATTERN.test(request.scenarioId)
    && getDialogueV2CatalogueEntry(request.scenarioId)
    ? request.scenarioId
    : null;
  if (!stableAccountId || !identifierSecret || !studyTarget || !scenarioId) return null;
  return Object.freeze({
    sharedMemoryId: opaqueId('d2m', identifierSecret, [
      'dialogue_v2_memory_v1', 'shared', stableAccountId, studyTarget,
    ]),
    scenarioThreadId: opaqueId('d2t', identifierSecret, [
      'dialogue_v2_memory_v1', 'thread', stableAccountId, studyTarget, scenarioId,
    ]),
  });
}

function hasApprovedLanguageScenario(
  value: unknown,
  studyTarget: DialogueV2MemoryStudyTarget,
  scenarioId: string,
): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const pin = (value as Record<string, unknown>)[`${studyTarget}:${scenarioId}`];
  if (!pin || typeof pin !== 'object' || Array.isArray(pin)) return false;
  const record = pin as Record<string, unknown>;
  return record.studyTarget === studyTarget
    && record.scenarioId === scenarioId
    && validateDialogueV2PackReference({
      scenarioId: record.scenarioId,
      packVersion: record.packVersion,
      packSha256: record.packSha256,
      catalogueSha256: record.catalogueSha256,
    }).ok
    && typeof record.reviewReceiptSha256 === 'string'
    && SHA256_PATTERN.test(record.reviewReceiptSha256);
}

/**
 * Builds storage scopes from server-owned identity and entitlement only.
 * Extra request fields are deliberately ignored so legacy clients cannot
 * replace the authenticated stable account or promote their own access.
 */
export function deriveDialogueV2MemoryPlan(
  serverContext: DialogueV2MemoryServerContext | null | undefined,
  request: DialogueV2MemoryRequest | null | undefined,
): DialogueV2MemoryPlan | null {
  const stableAccountId = asStableAccountId(serverContext?.stableAccountId);
  const identifierSecret = asIdentifierSecret(serverContext?.identifierSecret);
  const isPremium = serverContext?.isPremium;
  const studyTarget = asStudyTarget(request?.studyTarget);
  const scenarioId = typeof request?.scenarioId === 'string'
    && SCENARIO_ID_PATTERN.test(request.scenarioId)
    && getDialogueV2CatalogueEntry(request.scenarioId)
    ? request.scenarioId
    : null;
  const storageIds = deriveDialogueV2MemoryStorageIds(serverContext, request);
  if (
    !stableAccountId
    || !identifierSecret
    || typeof isPremium !== 'boolean'
    || !studyTarget
    || !scenarioId
    || !storageIds
    || !hasApprovedLanguageScenario(serverContext?.approvedPackManifest, studyTarget, scenarioId)
  ) return null;

  const sharedMemory = Object.freeze({
    id: storageIds.sharedMemoryId,
    scope: 'account_language' as const,
    studyTarget,
    format: 'structured_summary' as const,
    rawTranscriptRetention: 'forbidden' as const,
  });

  const scenarioThread = isPremium ? Object.freeze({
    id: storageIds.scenarioThreadId,
    scope: 'account_language_scenario' as const,
    studyTarget,
    scenarioId,
    resumable: true as const,
    format: 'structured_checkpoint' as const,
    rawTranscriptRetention: 'forbidden' as const,
  }) : null;

  return Object.freeze({
    contractVersion: 'dialogue_v2_memory_v1' as const,
    sharedMemory,
    scenarioThread,
  });
}

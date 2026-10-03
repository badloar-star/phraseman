import type { AccountsV2EntityType } from '../accounts_v2_contract';
import {
  evaluateMigrationCutover,
  type MigrationClientRequest,
  type MigrationCutoverState,
} from './compatibility';

/**
 * Account Authority 2.0, Task 6 — the intentionally narrow migration surface.
 * `library_membership` and flashcard tombstones are part of `flashcards_srs`
 * at the authority boundary; they are separate Account V2 entity semantics.
 */
export const PRESERVED_DOMAIN_MIGRATION_POLICY = Object.freeze({
  carriedEntityTypes: Object.freeze([
    'lesson_progress',
    'flashcard',
    'library_membership',
  ] satisfies readonly AccountsV2EntityType[]),
  accountAuthorityDomains: Object.freeze(['lesson_progress', 'flashcards_srs'] as const),
  flashcardSemantics: Object.freeze([
    'saved_card_membership',
    'srs',
    'tombstone',
    'community_pack_membership',
  ] as const),
  keepInPlaceAdapters: Object.freeze(['account', 'coins', 'streak'] as const),
  rejectedLegacyDomains: Object.freeze(['xp', 'league', 'season', 'arena', 'retired'] as const),
});

export type AccountIdMapping = Readonly<{
  legacyOwnerId: string;
  accountId: string;
}>;

export type PreservedDomainHydrationReceipt = Readonly<{
  status: 'missing' | 'verified';
  accountId: string | null;
}>;

export type VersionedMigrationClientRequest = MigrationClientRequest & Readonly<{
  /** Monotonic native/app writer contract version; null means an unversioned old client. */
  clientVersion: number | null;
}>;

export type PreservedDomainMigrationInput = Readonly<{
  cutover: MigrationCutoverState;
  accountMapping: AccountIdMapping | null;
  hydration: PreservedDomainHydrationReceipt;
  minimumWriterVersion: number;
  request: VersionedMigrationClientRequest;
}>;

export type PreservedDomainMigrationDecision = Readonly<{
  migrationCompletionAllowed: boolean;
  preservedWriteAllowed: boolean;
  reasons: readonly string[];
}>;

function addReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function safeIdentity(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 256
    && value.trim() === value
    && !/[\\/\u0000-\u001f\u007f]/.test(value)
    && !value.includes('..')
    && !/%2e|%2f|%5c/i.test(value);
}

function postCutover(state: MigrationCutoverState): boolean {
  return state.phase === 'v2_cutover' || state.phase === 'purged' || state.legacySyncDisabled;
}

/**
 * Composes the existing migration/cutover decision with the Account Authority
 * identity binding and writer-version floor. It is pure and fail-closed.
 */
export function evaluatePreservedDomainMigration(
  input: PreservedDomainMigrationInput,
): PreservedDomainMigrationDecision {
  const base = evaluateMigrationCutover(input.cutover, {
    protocolVersion: input.request.protocolVersion,
    operation: input.request.operation,
  });
  const reasons = [...base.reasons];

  const mappingValid = input.accountMapping !== null
    && safeIdentity(input.accountMapping.legacyOwnerId)
    && safeIdentity(input.accountMapping.accountId);
  if (input.accountMapping === null) addReason(reasons, 'account_id_mapping_missing');
  else if (!mappingValid) addReason(reasons, 'account_id_mapping_invalid');

  const hydrationVerified = input.hydration.status === 'verified'
    && safeIdentity(input.hydration.accountId);
  if (!hydrationVerified) addReason(reasons, 'hydration_not_verified');

  const hydrationMatches = mappingValid
    && hydrationVerified
    && input.hydration.accountId === input.accountMapping?.accountId;
  if (mappingValid && hydrationVerified && !hydrationMatches) {
    addReason(reasons, 'hydration_account_mismatch');
  }

  const minimumVersionValid = Number.isSafeInteger(input.minimumWriterVersion)
    && input.minimumWriterVersion >= 1;
  if (!minimumVersionValid) addReason(reasons, 'invalid_minimum_writer_version');

  let writerVersionAllowed = true;
  if (input.request.operation === 'write' && postCutover(input.cutover)) {
    writerVersionAllowed = minimumVersionValid
      && Number.isSafeInteger(input.request.clientVersion)
      && (input.request.clientVersion as number) >= input.minimumWriterVersion;
    if (!writerVersionAllowed) addReason(reasons, 'client_version_below_cutover_minimum');
  }

  const identityReady = mappingValid && hydrationMatches;
  const compatibilityReady = base.valid && base.blockingReasons.length === 0;
  const migrationReady = compatibilityReady
    && input.cutover.migrationStatus === 'ready'
    && input.cutover.applyAllowed === true
    && input.cutover.pendingDomainCount === 0
    && input.cutover.hydration === 'verified'
    && input.cutover.backupVerified === true;
  return Object.freeze({
    migrationCompletionAllowed: base.cutoverAllowed
      && compatibilityReady
      && identityReady
      && minimumVersionValid,
    preservedWriteAllowed: input.request.operation === 'write'
      && base.clientAllowed
      && migrationReady
      && identityReady
      && minimumVersionValid
      && writerVersionAllowed,
    reasons: Object.freeze(reasons),
  });
}

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

/*
 * AA S5 (D-AA3, режим 1.6.24; на подтверждение координатору): можно ли ЗАПИСЬ
 * старого писателя (1.6.24, прямые записи старого cloud_sync без аренды) в
 * сохраняемый домен. Чистая модель: принуждает её будущее правило Firestore
 * (S8, тесты правил на эмуляторе) — здесь закреплено само решение.
 *
 * Правило: старый писатель допускается ВСЕГДА, кроме одного случая — cutover
 * включён И миграция ЭТОГО аккаунта на Account Authority доказана (метка
 * миграции). Состояние миграции неизвестно (метку не прочитать) — допускаем:
 * законный старый клиент не должен терять данные из-за сбоя чтения.
 * Новый писатель (2.0 с арендой) этим правилом не ограничивается.
 */
export type PreservedWriterKind = 'legacy_1_6_24' | 'authority_2_0';
export type AccountAuthorityMigrationState = 'migrated' | 'not_migrated' | 'unknown';

export type LegacyWriterPreservedWriteInput = Readonly<{
  writer: PreservedWriterKind;
  /** Домен записи; вне сохраняемых это правило не решает. */
  domain: string;
  cutoverEnabled: boolean;
  accountMigration: AccountAuthorityMigrationState;
}>;

export type LegacyWriterPreservedWriteDecision = Readonly<{
  allowed: boolean;
  reason:
    | 'not_preserved_domain'
    | 'authority_writer'
    | 'cutover_off'
    | 'account_not_migrated'
    | 'migration_state_unknown_allowed'
    | 'legacy_write_after_authority_migration'
    | 'invalid_input';
}>;

const AUTHORITY_DOMAINS: ReadonlySet<string> = new Set(PRESERVED_DOMAIN_MIGRATION_POLICY.accountAuthorityDomains);

export function evaluateLegacyWriterPreservedWrite(
  input: LegacyWriterPreservedWriteInput,
): LegacyWriterPreservedWriteDecision {
  const decide = (allowed: boolean, reason: LegacyWriterPreservedWriteDecision['reason']): LegacyWriterPreservedWriteDecision => (
    Object.freeze({ allowed, reason })
  );
  const writer: unknown = input.writer;
  const migration: unknown = input.accountMigration;
  if (
    (writer !== 'legacy_1_6_24' && writer !== 'authority_2_0')
    || typeof input.domain !== 'string'
    || typeof input.cutoverEnabled !== 'boolean'
    || (migration !== 'migrated' && migration !== 'not_migrated' && migration !== 'unknown')
  ) {
    // зачем: битый вход — только новый писатель мог бы его прислать; старого не режем
    // молча, но и решение «можно» на мусоре не выдаём.
    return decide(false, 'invalid_input');
  }
  if (!AUTHORITY_DOMAINS.has(input.domain)) return decide(true, 'not_preserved_domain');
  if (writer === 'authority_2_0') return decide(true, 'authority_writer');
  if (!input.cutoverEnabled) return decide(true, 'cutover_off');
  if (migration === 'not_migrated') return decide(true, 'account_not_migrated');
  if (migration === 'unknown') return decide(true, 'migration_state_unknown_allowed');
  return decide(false, 'legacy_write_after_authority_migration');
}

import {
  PRESERVED_DOMAIN_MIGRATION_POLICY,
  evaluatePreservedDomainMigration,
  type PreservedDomainMigrationInput,
} from './preserved_domains';
import {
  ACCOUNT_V2_MIGRATION_SCHEMA_VERSION,
  type MigrationCutoverState,
} from './compatibility';

const cutoverState = (overrides: Partial<MigrationCutoverState> = {}): MigrationCutoverState => ({
  schemaVersion: ACCOUNT_V2_MIGRATION_SCHEMA_VERSION,
  phase: 'dual_write',
  legacySyncDisabled: false,
  hydration: 'verified',
  migrationStatus: 'ready',
  applyAllowed: true,
  pendingDomainCount: 0,
  backupVerified: true,
  rollbackWindowOpen: true,
  purgeCompleted: false,
  ...overrides,
});

const input = (overrides: Partial<PreservedDomainMigrationInput> = {}): PreservedDomainMigrationInput => ({
  cutover: cutoverState(),
  accountMapping: { legacyOwnerId: 'legacy-owner-1', accountId: 'account-1' },
  hydration: { status: 'verified', accountId: 'account-1' },
  minimumWriterVersion: 200,
  request: { protocolVersion: 2, operation: 'write', clientVersion: 200 },
  ...overrides,
});

describe('Account Authority 2.0 preserved-domain migration contract', () => {
  it('names the only carried semantics, keep-in-place adapters, and rejected legacy domains', () => {
    expect(PRESERVED_DOMAIN_MIGRATION_POLICY).toEqual({
      carriedEntityTypes: ['lesson_progress', 'flashcard', 'library_membership'],
      accountAuthorityDomains: ['lesson_progress', 'flashcards_srs'],
      flashcardSemantics: ['saved_card_membership', 'srs', 'tombstone', 'community_pack_membership'],
      keepInPlaceAdapters: ['account', 'coins', 'streak'],
      rejectedLegacyDomains: ['xp', 'league', 'season', 'arena', 'retired'],
    });
  });

  it.each([
    ['missing mapping', { accountMapping: null }, 'account_id_mapping_missing'],
    ['missing hydration', { hydration: { status: 'missing' as const, accountId: null } }, 'hydration_not_verified'],
    ['different hydrated account', { hydration: { status: 'verified' as const, accountId: 'account-2' } }, 'hydration_account_mismatch'],
  ])('does not mark migration complete with %s', (_name, overrides, reason) => {
    const decision = evaluatePreservedDomainMigration(input(overrides));

    expect(decision.migrationCompletionAllowed).toBe(false);
    expect(decision.preservedWriteAllowed).toBe(false);
    expect(decision.reasons).toContain(reason);
  });

  it('permits completion only when the mapping and verified hydration bind the same accountId', () => {
    const decision = evaluatePreservedDomainMigration(input());

    expect(decision.migrationCompletionAllowed).toBe(true);
    expect(decision.preservedWriteAllowed).toBe(true);
    expect(decision.reasons).not.toEqual(expect.arrayContaining([
      'account_id_mapping_missing',
      'hydration_not_verified',
      'hydration_account_mismatch',
    ]));
  });

  it.each([
    ['missing version', null],
    ['older version', 199],
  ])('blocks a post-cutover preserved-domain writer with %s', (_name, clientVersion) => {
    const decision = evaluatePreservedDomainMigration(input({
      cutover: cutoverState({ phase: 'v2_cutover', legacySyncDisabled: true }),
      request: { protocolVersion: 2, operation: 'write', clientVersion },
    }));

    expect(decision.preservedWriteAllowed).toBe(false);
    expect(decision.reasons).toContain('client_version_below_cutover_minimum');
  });

  it('allows a current V2 writer after cutover and still rejects a legacy protocol writer', () => {
    const state = cutoverState({ phase: 'v2_cutover', legacySyncDisabled: true });
    const current = evaluatePreservedDomainMigration(input({ cutover: state }));
    const legacy = evaluatePreservedDomainMigration(input({
      cutover: state,
      request: { protocolVersion: 1, operation: 'write', clientVersion: 999 },
    }));

    expect(current.preservedWriteAllowed).toBe(true);
    expect(legacy.preservedWriteAllowed).toBe(false);
    expect(legacy.reasons).toContain('legacy_write_blocked_after_cutover');
  });

  it.each([
    ['unknown', 3],
    ['null', null],
    ['missing', undefined],
  ])('fails closed for a post-cutover writer with %s protocolVersion', (_name, protocolVersion) => {
    const unsafeRequest = {
      protocolVersion,
      operation: 'write',
      clientVersion: 200,
    } as unknown as PreservedDomainMigrationInput['request'];
    const decision = evaluatePreservedDomainMigration(input({
      cutover: cutoverState({ phase: 'v2_cutover', legacySyncDisabled: true }),
      request: unsafeRequest,
    }));

    expect(decision.preservedWriteAllowed).toBe(false);
    expect(decision.reasons).toContain('unsupported_protocol_version');
  });

  it.each([
    ['unknown', 'unknown'],
    ['missing', undefined],
  ])('fails closed for %s migration phase at the runtime boundary', (_name, phase) => {
    const unsafeCutover = {
      ...cutoverState(),
      phase,
    } as unknown as MigrationCutoverState;
    const decision = evaluatePreservedDomainMigration(input({
      cutover: unsafeCutover,
      request: { protocolVersion: 2, operation: 'write', clientVersion: null },
    }));

    expect(decision.migrationCompletionAllowed).toBe(false);
    expect(decision.preservedWriteAllowed).toBe(false);
    expect(decision.reasons).toContain('unsupported_phase');
  });

  it.each([
    ['unknown', 'mutate'],
    ['missing', undefined],
  ])('fails closed for %s migration operation at the runtime boundary', (_name, operation) => {
    const unsafeRequest = {
      protocolVersion: 2,
      operation,
      clientVersion: 200,
    } as unknown as PreservedDomainMigrationInput['request'];
    const decision = evaluatePreservedDomainMigration(input({ request: unsafeRequest }));

    expect(decision.migrationCompletionAllowed).toBe(false);
    expect(decision.preservedWriteAllowed).toBe(false);
    expect(decision.reasons).toContain('unsupported_operation');
  });

  it.each([
    ['string', 'closed'],
    ['missing', undefined],
  ])('fails closed for a dual-write state with %s rollbackWindowOpen', (_name, rollbackWindowOpen) => {
    const unsafeCutover = {
      ...cutoverState(),
      rollbackWindowOpen,
    } as unknown as MigrationCutoverState;
    const decision = evaluatePreservedDomainMigration(input({ cutover: unsafeCutover }));

    expect(decision.migrationCompletionAllowed).toBe(false);
    expect(decision.preservedWriteAllowed).toBe(false);
    expect(decision.reasons).toContain('invalid_rollback_window_flag');
  });

  it('fails closed for writes when migration readiness is internally inconsistent after cutover', () => {
    const decision = evaluatePreservedDomainMigration(input({
      cutover: cutoverState({
        phase: 'v2_cutover',
        legacySyncDisabled: true,
        migrationStatus: 'hold',
        applyAllowed: false,
      }),
    }));

    expect(decision.preservedWriteAllowed).toBe(false);
    expect(decision.reasons).toEqual(expect.arrayContaining(['migration_not_ready', 'apply_forbidden']));
  });

  it('rejects a dual-write state that falsely claims purge completion', () => {
    const decision = evaluatePreservedDomainMigration(input({
      cutover: cutoverState({ phase: 'dual_write', purgeCompleted: true }),
    }));

    expect(decision.migrationCompletionAllowed).toBe(false);
    expect(decision.preservedWriteAllowed).toBe(false);
    expect(decision.reasons).toContain('purge_completion_phase_mismatch');
  });

  it('rejects a cutover state whose legacy writer flag is still enabled', () => {
    const decision = evaluatePreservedDomainMigration(input({
      cutover: cutoverState({ phase: 'v2_cutover', legacySyncDisabled: false }),
    }));

    expect(decision.migrationCompletionAllowed).toBe(false);
    expect(decision.preservedWriteAllowed).toBe(false);
    expect(decision.reasons).toContain('legacy_sync_flag_phase_mismatch');
  });

  it('fails closed when the configured writer version floor is invalid', () => {
    const decision = evaluatePreservedDomainMigration(input({ minimumWriterVersion: -1 }));

    expect(decision.migrationCompletionAllowed).toBe(false);
    expect(decision.preservedWriteAllowed).toBe(false);
    expect(decision.reasons).toContain('invalid_minimum_writer_version');
  });
});

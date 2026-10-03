import {
  ACCOUNT_V2_MIGRATION_SCHEMA_VERSION,
  evaluateMigrationCutover,
  type MigrationClientRequest,
  type MigrationCutoverState,
} from './compatibility';

const baseState = (overrides: Partial<MigrationCutoverState> = {}): MigrationCutoverState => ({
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

const request = (overrides: Partial<MigrationClientRequest> = {}): MigrationClientRequest => ({
  protocolVersion: 2,
  operation: 'read',
  ...overrides,
});

describe('accounts_v2_migration compatibility/cutover contract', () => {
  it('rejects an unsupported migration schema before evaluating access', () => {
    const result = evaluateMigrationCutover(baseState({ schemaVersion: 99 as never }));
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('unsupported_schema_version');
    expect(result.cutoverAllowed).toBe(false);
    expect(result.purgeAllowed).toBe(false);
  });

  it('dual-write permits both protocols, but V2 reads require verified hydration', () => {
    const state = baseState();
    expect(evaluateMigrationCutover(state, request({ protocolVersion: 1, operation: 'write' })).clientAllowed).toBe(true);
    expect(evaluateMigrationCutover(state, request({ protocolVersion: 2, operation: 'write' })).clientAllowed).toBe(true);
    expect(evaluateMigrationCutover(state, request({ protocolVersion: 2, operation: 'read' })).clientAllowed).toBe(true);
    expect(evaluateMigrationCutover({ ...state, hydration: 'missing' }, request()).clientAllowed).toBe(false);
  });

  it('cutover blocks legacy writes while retaining legacy reads until purge', () => {
    const state = baseState({ phase: 'v2_cutover', legacySyncDisabled: true });
    const legacyWrite = evaluateMigrationCutover(state, request({ protocolVersion: 1, operation: 'write' }));
    const legacyRead = evaluateMigrationCutover(state, request({ protocolVersion: 1, operation: 'read' }));
    expect(legacyWrite.clientAllowed).toBe(false);
    expect(legacyWrite.reasons).toContain('legacy_write_blocked_after_cutover');
    expect(legacyRead.clientAllowed).toBe(true);
    expect(evaluateMigrationCutover(state, request({ protocolVersion: 2, operation: 'write' })).clientAllowed).toBe(true);
  });

  it.each([
    ['hold report', { migrationStatus: 'hold' as const }],
    ['apply forbidden', { applyAllowed: false }],
    ['pending domain', { pendingDomainCount: 1 }],
    ['missing hydration', { hydration: 'missing' as const }],
    ['missing backup', { backupVerified: false }],
  ])('blocks cutover and purge when %s', (_name, overrides) => {
    const result = evaluateMigrationCutover(baseState(overrides));
    expect(result.cutoverAllowed).toBe(false);
    expect(result.purgeAllowed).toBe(false);
  });

  it('permits cutover only from dual-write and purge only after the rollback window closes', () => {
    const cutover = evaluateMigrationCutover(baseState());
    expect(cutover.cutoverAllowed).toBe(true);
    expect(cutover.purgeAllowed).toBe(false);
    expect(cutover.reasons).toContain('rollback_window_open');

    const purge = evaluateMigrationCutover(baseState({
      phase: 'v2_cutover', legacySyncDisabled: true, rollbackWindowOpen: false,
    }));
    expect(purge.purgeAllowed).toBe(true);
  });

  it('keeps rollback available before purge and rejects it after purge', () => {
    expect(evaluateMigrationCutover(baseState()).rollbackAllowed).toBe(true);
    expect(evaluateMigrationCutover(baseState({
      phase: 'v2_cutover', legacySyncDisabled: true, rollbackWindowOpen: false,
    })).rollbackAllowed).toBe(false);
    expect(evaluateMigrationCutover(baseState({
      phase: 'purged', legacySyncDisabled: true, rollbackWindowOpen: false, purgeCompleted: true,
    })).reasons).toContain('rollback_forbidden_after_purge');
  });

  it('does not allow a purged account to use the legacy protocol', () => {
    const state = baseState({ phase: 'purged', legacySyncDisabled: true, rollbackWindowOpen: false, purgeCompleted: true });
    expect(evaluateMigrationCutover(state, request({ protocolVersion: 1, operation: 'read' })).clientAllowed).toBe(false);
    expect(evaluateMigrationCutover(state, request({ protocolVersion: 2, operation: 'read' })).clientAllowed).toBe(true);
  });

  it.each([
    ['unknown', 3],
    ['null', null],
    ['missing', undefined],
  ])('rejects a runtime request with %s protocolVersion', (_name, protocolVersion) => {
    const unsafe = { protocolVersion, operation: 'write' } as unknown as MigrationClientRequest;
    const result = evaluateMigrationCutover(
      baseState({ phase: 'v2_cutover', legacySyncDisabled: true }),
      unsafe,
    );

    expect(result.clientAllowed).toBe(false);
    expect(result.blockingReasons).toContain('unsupported_protocol_version');
  });

  it.each([
    ['unknown', 'unknown'],
    ['missing', undefined],
  ])('rejects a runtime state with %s phase', (_name, phase) => {
    const unsafe = { ...baseState(), phase } as unknown as MigrationCutoverState;
    const result = evaluateMigrationCutover(unsafe, request({ operation: 'write' }));

    expect(result.valid).toBe(false);
    expect(result.clientAllowed).toBe(false);
    expect(result.blockingReasons).toContain('unsupported_phase');
    expect(result.cutoverAllowed).toBe(false);
    expect(result.purgeAllowed).toBe(false);
  });

  it.each([
    ['unknown', 'mutate'],
    ['missing', undefined],
  ])('rejects a runtime request with %s operation', (_name, operation) => {
    const unsafe = { protocolVersion: 2, operation } as unknown as MigrationClientRequest;
    const result = evaluateMigrationCutover(baseState(), unsafe);

    expect(result.clientAllowed).toBe(false);
    expect(result.blockingReasons).toContain('unsupported_operation');
  });

  it.each([
    ['dual-write string', { phase: 'dual_write' as const, rollbackWindowOpen: 'closed' }],
    ['dual-write missing', { phase: 'dual_write' as const, rollbackWindowOpen: undefined }],
    [
      'cutover missing',
      { phase: 'v2_cutover' as const, legacySyncDisabled: true, rollbackWindowOpen: undefined },
    ],
  ])('rejects an invalid rollback-window flag: %s', (_name, overrides) => {
    const unsafe = { ...baseState(), ...overrides } as unknown as MigrationCutoverState;
    const result = evaluateMigrationCutover(unsafe, request({ operation: 'write' }));

    expect(result.valid).toBe(false);
    expect(result.clientAllowed).toBe(false);
    expect(result.cutoverAllowed).toBe(false);
    expect(result.purgeAllowed).toBe(false);
    expect(result.rollbackAllowed).toBe(false);
    expect(result.blockingReasons).toContain('invalid_rollback_window_flag');
    for (const value of [result.valid, result.clientAllowed, result.cutoverAllowed, result.purgeAllowed, result.rollbackAllowed]) {
      expect(typeof value).toBe('boolean');
    }
  });

  it.each([
    [
      'dual-write with completed purge',
      { phase: 'dual_write' as const, purgeCompleted: true },
      'purge_completion_phase_mismatch',
    ],
    [
      'cutover with legacy sync enabled',
      { phase: 'v2_cutover' as const, legacySyncDisabled: false },
      'legacy_sync_flag_phase_mismatch',
    ],
  ])('invalidates contradictory phase state: %s', (_name, overrides, reason) => {
    const result = evaluateMigrationCutover(baseState(overrides));

    expect(result.valid).toBe(false);
    expect(result.blockingReasons).toContain(reason);
    expect(result.cutoverAllowed).toBe(false);
    expect(result.purgeAllowed).toBe(false);
  });
});

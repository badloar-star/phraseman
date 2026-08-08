const storage = new Map<string, string>();
let multiGetImpl = (keys: string[]) => Promise.resolve(keys.map(key => [key, storage.get(key) ?? null] as [string, string | null]));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(storage.get(key) ?? null),
    multiGet: (keys: string[]) => multiGetImpl(keys),
  },
}));

describe('shared clean-install recovery transition guard', () => {
  beforeEach(() => {
    jest.resetModules();
    storage.clear();
    multiGetImpl = (keys: string[]) => Promise.resolve(
      keys.map(key => [key, storage.get(key) ?? null] as [string, string | null]),
    );
  });

  it('blocks while an in-memory owner is active and releases exactly once', async () => {
    const guard = require('../app/auth_clean_install_recovery_transition') as typeof import('../app/auth_clean_install_recovery_transition');
    const release = guard.beginCleanInstallRecoveryTransition();
    await expect(guard.assertNoCleanInstallRecoveryTransition())
      .rejects.toThrow('clean_recovery_transition_active');
    release();
    release();
    await expect(guard.assertNoCleanInstallRecoveryTransition()).resolves.toBeUndefined();
  });

  it.each([
    'auth_clean_install_recovery_v1',
    'auth_clean_install_recovery_adoption_v1',
    'auth_clean_install_recovery_request_intent_v1',
  ])('blocks account mutation while durable journal %s exists', async key => {
    storage.set(key, 'opaque');
    const guard = require('../app/auth_clean_install_recovery_transition') as typeof import('../app/auth_clean_install_recovery_transition');
    await expect(guard.assertNoCleanInstallRecoveryTransition())
      .rejects.toThrow('clean_recovery_transition_active');
  });

  it('mutation-first: reserves before the durable read and blocks recovery until final release', async () => {
    let resolveRead!: (rows: [string, string | null][]) => void;
    multiGetImpl = () => new Promise(resolve => { resolveRead = resolve; });
    const guard = require('../app/auth_clean_install_recovery_transition') as typeof import('../app/auth_clean_install_recovery_transition');

    const reservation = guard.reserveCleanInstallRecoveryAccountTransition();
    await Promise.resolve();

    expect(() => guard.beginCleanInstallRecoveryTransition())
      .toThrow('clean_recovery_account_transition_active');
    resolveRead([]);
    const release = await reservation;

    expect(() => guard.beginCleanInstallRecoveryTransition())
      .toThrow('clean_recovery_account_transition_active');
    release();
  });

  it('recovery-first: rejects an account mutation without weakening the active recovery owner', async () => {
    const guard = require('../app/auth_clean_install_recovery_transition') as typeof import('../app/auth_clean_install_recovery_transition');
    const releaseRecovery = guard.beginCleanInstallRecoveryTransition();
    await expect(guard.reserveCleanInstallRecoveryAccountTransition())
      .rejects.toThrow('clean_recovery_transition_active');
    await expect(guard.assertNoCleanInstallRecoveryTransition())
      .rejects.toThrow('clean_recovery_transition_active');
    releaseRecovery();
    const releaseMutation = await guard.reserveCleanInstallRecoveryAccountTransition();
    releaseMutation();
  });

  it('does not let an expired request intent block normal account mutation', async () => {
    storage.set('auth_clean_install_recovery_request_intent_v1', JSON.stringify({
      version: 1,
      createdAt: 100,
      expiresAt: 1_000,
      guardExpiresAt: 200,
    }));
    const guard = require('../app/auth_clean_install_recovery_transition') as typeof import('../app/auth_clean_install_recovery_transition');
    const release = await guard.reserveCleanInstallRecoveryAccountTransition(201);
    release();
  });

  it('keeps malformed request intent fail-closed', async () => {
    storage.set('auth_clean_install_recovery_request_intent_v1', '{not-json');
    const guard = require('../app/auth_clean_install_recovery_transition') as typeof import('../app/auth_clean_install_recovery_transition');
    await expect(guard.reserveCleanInstallRecoveryAccountTransition())
      .rejects.toThrow('clean_recovery_transition_active');
  });
});

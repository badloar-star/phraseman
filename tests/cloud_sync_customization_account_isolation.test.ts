import AsyncStorage from '@react-native-async-storage/async-storage';
import type { V2CompiledRequiredSession } from '../modules/learning-v2/content/session_compiler';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import { restoreAccountSwitchEmergencyBackupIfSafe } from '../app/account_switch_backup_restore';
import {
  accountLocalDataKeysForToday,
  saveAccountSwitchEmergencyBackup,
  wipeLocalAccountData,
  wipeLocalAccountDataForCleanInstallRecovery,
} from '../app/cloud_sync';
import { createLesson1LocalProgressStore } from '../modules/learning-v2/progress/lesson1_local_progress';
import { createProgressOutbox } from '../modules/learning-v2/progress/progress_outbox';
import {
  deriveLocalOfflineProgressAccountScopeHash,
  LOCAL_OFFLINE_PROGRESS_GENERATION,
} from '../modules/learning-v2/progress/progress_account_scope';
import { materializeRequiredSessionCompletionEnvelope } from '../modules/learning-v2/progress/required_session_completion_envelope';
import { createRequiredSessionLocalCommitCoordinator } from '../modules/learning-v2/progress/required_session_local_commit';
import type { ProgressStorage } from '../modules/learning-v2/progress/progress_store';
import { getLesson1SessionRuntime } from '../modules/learning-v2/runtime/lesson1_session_runtime';
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from '../modules/learning-v2/policies/decision_registry';
import { shardDeltaQueueStorageKey } from '../app/shards_delta_queue';
import { getAppSnapshot, patchAppSnapshot } from '../app/app_snapshot_store';
import { CUSTOMIZATION_ACCOUNT_LOCAL_KEYS } from '../constants/customization_storage_keys';
import {
  legacyFreeLessonCapKey,
  legacyFreeLessonMigrationKey,
} from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/user_id_policy', () => ({
  clearArenaAuthUidCache: jest.fn(),
  getAuthUserId: jest.fn(() => null),
  getCanonicalUserId: jest.fn(async () => 'local-stable-id'),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getCanonicalUserId } = require('../app/user_id_policy');

const store: Record<string, string> = {};
const BACKUP_KEY = 'account_switch_emergency_backup_latest_v1';
const BACKUP_PAGE_PREFIX = 'account_switch_emergency_backup_page_v1:';
const REQUIRED_SESSION_IDS = ['understand', 'use', 'master'].flatMap((zone) =>
  [1, 2, 3, 4].map((index) => `lesson-1-${zone}-${index}`));
const localStableId = 'local-stable-id';
const localScope = {
  stableId: localStableId,
  accountScopeHash: deriveLocalOfflineProgressAccountScopeHash(localStableId),
  seasonId: 'learning-v2',
  studyTarget: 'en',
  learnerSourceLocale: 'ru',
  generation: LOCAL_OFFLINE_PROGRESS_GENERATION,
};

const completionEnvelopeFor = (
  session: V2CompiledRequiredSession,
  sessionRunId: string,
) => {
  const runtime = getLesson1SessionRuntime();
  return materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: REQUIRED_SESSION_IDS[session.ordinal - 1],
    sessionRunId,
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
};

const progressStorage: ProgressStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
  getAllKeys: () => AsyncStorage.getAllKeys(),
};

const legacyBackupRootFor = (stableId: string): string => JSON.stringify({
  version: 1,
  createdAt: Date.now(),
  stableId,
  pairs: [],
});

const writeOwnerBackupV3 = async (
  stableId: string,
  backupId: string,
  pairs: readonly (readonly [string, string])[],
): Promise<{ rootRaw: string; pageRaw: string }> => {
  const pageBody = {
    schemaVersion: 'account-switch-emergency-backup-page.v1' as const,
    backupId,
    stableId,
    pageIndex: 0,
    previousPageFingerprint: null,
    pairs,
  };
  const pageFingerprint = hashCanonicalBody(pageBody);
  const pageRaw = canonicalJsonV1({ ...pageBody, pageFingerprint });
  const rootBody = {
    version: 3 as const,
    schemaVersion: 'account-switch-emergency-backup.v3' as const,
    backupId,
    stableId,
    createdAt: Date.now(),
    reason: 'multi-account-test',
    pageCount: 1,
    pairCount: pairs.length,
    totalUtf8Bytes: pairs.reduce((total, [key, value]) =>
      total + utf8ByteLengthV1(key) + utf8ByteLengthV1(value), 0),
    lastPageFingerprint: pageFingerprint,
    requiredSessionReceiptCount: 0,
  };
  const rootRaw = canonicalJsonV1({
    ...rootBody,
    manifestFingerprint: hashCanonicalBody(rootBody),
  });
  await AsyncStorage.setItem(`${BACKUP_PAGE_PREFIX}${backupId}:0`, pageRaw);
  await AsyncStorage.setItem(BACKUP_KEY, rootRaw);
  return { rootRaw, pageRaw };
};

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  [
    AsyncStorage.getItem,
    AsyncStorage.setItem,
    AsyncStorage.removeItem,
    AsyncStorage.multiGet,
    AsyncStorage.multiSet,
    AsyncStorage.multiRemove,
    AsyncStorage.getAllKeys,
  ].forEach((mock) => (mock as jest.Mock).mockReset());
  (getCanonicalUserId as jest.Mock).mockReset();
  Object.keys(store).forEach((key) => delete store[key]);
  (getCanonicalUserId as jest.Mock).mockResolvedValue(localStableId);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => store[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    store[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete store[key];
  });
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => (
    keys.map((key) => [key, store[key] ?? null])
  ));
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => delete store[key]);
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: Array<[string, string]>) => {
    pairs.forEach(([key, value]) => { store[key] = value; });
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(store));
  __resetAccountGenerationForTests();
  beginAccountGeneration(localStableId);
});

const readBackupPairs = async (): Promise<Array<[string, string]>> => {
  const root = JSON.parse(store[BACKUP_KEY]) as {
    version: number;
    backupId: string;
    pageCount: number;
  };
  expect(root.version).toBe(3);
  const pairs: Array<[string, string]> = [];
  for (let pageIndex = 0; pageIndex < root.pageCount; pageIndex += 1) {
    const page = JSON.parse(store[
      `account_switch_emergency_backup_page_v1:${root.backupId}:${pageIndex}`
    ]) as { pairs: Array<[string, string]> };
    pairs.push(...page.pairs);
  }
  return pairs;
};

it('removes purchase recovery and spend ledger during account switch wipe', async () => {
  CUSTOMIZATION_ACCOUNT_LOCAL_KEYS.forEach((key) => { store[key] = 'sentinel'; });
  patchAppSnapshot({
    customization: {
      source: 'storage', updatedAt: 1, activeAvatar: '18', storedAuraSelection: null,
      totalXp: 1, level: 1, shards: 1, ownedAvatars: {}, ownedAuras: {},
      giftedAvatarId: null, giftedAuraId: null,
    },
  });

  expect(accountLocalDataKeysForToday('2026-07-13')).toEqual(
    expect.arrayContaining([...CUSTOMIZATION_ACCOUNT_LOCAL_KEYS]),
  );
  await wipeLocalAccountData();

  CUSTOMIZATION_ACCOUNT_LOCAL_KEYS.forEach((key) => expect(store[key]).toBeUndefined());
  expect(getAppSnapshot().customization).toBeUndefined();
});

it('removes legacy lesson caps and migration markers during account switch wipe', async () => {
  const legacyKeys = [
    legacyFreeLessonCapKey('en'),
    legacyFreeLessonMigrationKey('en'),
    legacyFreeLessonCapKey('fr'),
    legacyFreeLessonMigrationKey('fr'),
  ];
  legacyKeys.forEach((key) => { store[key] = 'sentinel'; });

  expect(accountLocalDataKeysForToday('2026-07-13')).toEqual(
    expect.arrayContaining(legacyKeys),
  );
  await wipeLocalAccountData();

  legacyKeys.forEach((key) => expect(store[key]).toBeUndefined());
});

it('removes fixed and wildcard personal-plan replay state without clearing device preferences', async () => {
  const oldAccountKeys = [
    'personal_plan_attempt_events_v1',
    'personal_plan_recovery_applied_actions_v1',
    'personal_plan_day_runtime_v1:account_a_plan:gavan:1',
    'personal_plan_day_runtime_v1:account_a_plan:gavan:32',
    'learning_v2_lesson1_progress:account-a',
    'learning_v2_progress:account-a',
    'v2:outbox:v1:account-a',
    'v2:outbox:v2:account-a',
    'v2:required-session-local-commit:v1:account-a',
    'v2:required-session-local-commit:v2:account-a:mutation-1',
    'v2:required-session-local-commit:v3:account-a:prepare',
    'v2:required-session-local-commit-index:v1:account-a:head',
    'v2:required-session-local-commit-index:v1:account-a:page:0',
    'v2:required-session-local-commit-index:v1:account-a:member:mutation-1',
    'v2:required-session-local-commit-index:v1:account-a:transaction',
    'v2:required-session-local-commit-index:v1:account-a:legacy-scan-complete',
    'v2:required-session-completion-receipt:v1:account-a',
    `v2:required-session-completion-scheduler:v1:${'a'.repeat(64)}`,
    'learning_v2_owner_repository:v1:account-a:root',
    'learning_v2_coin_exchange_outbox:v1:account-a:g1:exchange-1',
    'client_shard_semantic_paid_v1:account-a:profile_card_level:1',
  ];
  const deviceKeys = ['app_theme', 'app_font_size', 'haptics_tap'];

  [...oldAccountKeys, ...deviceKeys, 'unrelated_device_cache_v1'].forEach((key) => {
    store[key] = `sentinel:${key}`;
  });

  await wipeLocalAccountData();

  oldAccountKeys.forEach((key) => expect(store[key]).toBeUndefined());
  deviceKeys.forEach((key) => expect(store[key]).toBe(`sentinel:${key}`));
  expect(store.unrelated_device_cache_v1).toBe('sentinel:unrelated_device_cache_v1');
});

it('dedicated clean-install wipe preserves both recovery journals while removing source data', async () => {
  store.auth_clean_install_recovery_v1 = 'confirmed-clean-journal';
  store.auth_clean_install_recovery_adoption_v1 = 'prepared-adoption-journal';
  store.personal_plan_attempt_events_v1 = 'source-account-data';

  await wipeLocalAccountDataForCleanInstallRecovery();

  expect(store.auth_clean_install_recovery_v1).toBe('confirmed-clean-journal');
  expect(store.auth_clean_install_recovery_adoption_v1).toBe('prepared-adoption-journal');
  expect(store.personal_plan_attempt_events_v1).toBeUndefined();
});

it('dedicated clean-install wipe removes every computed source account key', async () => {
  store.auth_clean_install_recovery_v1 = 'confirmed-clean-journal';
  store.auth_clean_install_recovery_adoption_v1 = 'prepared-adoption-journal';
  const sourceKeys = accountLocalDataKeysForToday();
  sourceKeys.forEach((key) => { store[key] = `source:${key}`; });

  await wipeLocalAccountDataForCleanInstallRecovery();

  sourceKeys.forEach((key) => expect(store[key]).toBeUndefined());
  expect(store.auth_clean_install_recovery_v1).toBe('confirmed-clean-journal');
  expect(store.auth_clean_install_recovery_adoption_v1).toBe('prepared-adoption-journal');
});

it('keeps account B isolated when a deferred account A callback writes replay state during the wipe', async () => {
  let releaseFirstRemoval: (() => void) | undefined;
  let firstRemovalStarted: (() => void) | undefined;
  const firstRemovalStartedPromise = new Promise<void>((resolve) => {
    firstRemovalStarted = resolve;
  });
  const releaseFirstRemovalPromise = new Promise<void>((resolve) => {
    releaseFirstRemoval = resolve;
  });

  (AsyncStorage.multiRemove as jest.Mock).mockImplementationOnce(async (keys: string[]) => {
    keys.forEach((key) => delete store[key]);
    firstRemovalStarted?.();
    await releaseFirstRemovalPromise;
  });

  store.personal_plan_attempt_events_v1 = 'account-a-before-switch';
  const wipePromise = wipeLocalAccountData();
  await firstRemovalStartedPromise;

  store.personal_plan_attempt_events_v1 = 'account-a-deferred-attempt';
  store['personal_plan_day_runtime_v1:account_a_plan:gavan:7'] = 'account-a-deferred-runtime';
  releaseFirstRemoval?.();
  await wipePromise;

  expect(store.personal_plan_attempt_events_v1).toBeUndefined();
  expect(store['personal_plan_day_runtime_v1:account_a_plan:gavan:7']).toBeUndefined();

  store.personal_plan_attempt_events_v1 = 'account-b-attempt';
  store['personal_plan_day_runtime_v1:account_b_plan:gavan:1'] = 'account-b-runtime';
  expect(store.personal_plan_attempt_events_v1).toBe('account-b-attempt');
  expect(store['personal_plan_day_runtime_v1:account_b_plan:gavan:1']).toBe('account-b-runtime');
});

it('fails closed when wildcard account-key discovery is unavailable', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';
  store['personal_plan_day_runtime_v1:account_a_plan:gavan:9'] = 'account-a-runtime';
  (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(new Error('storage scan failed'));

  await expect(wipeLocalAccountData()).rejects.toThrow('learning_v2_account_key_scan_failed');

  expect(store.personal_plan_attempt_events_v1).toBe('account-a-attempts');
  expect(store['personal_plan_day_runtime_v1:account_a_plan:gavan:9']).toBe('account-a-runtime');
});

it('fails closed when account-key removal is incomplete', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';
  (AsyncStorage.multiRemove as jest.Mock).mockRejectedValueOnce(new Error('storage remove failed'));

  await expect(wipeLocalAccountData()).rejects.toThrow('storage remove failed');

  expect(store.personal_plan_attempt_events_v1).toBe('account-a-attempts');
});

it('fails closed when storage silently keeps one paged spool key', async () => {
  const retainedKey = 'v2:required-session-local-commit-index:v1:account-a:member:mutation-1';
  store[retainedKey] = 'account-a-private-completion';
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => {
      if (key !== retainedKey) delete store[key];
    });
  });

  await expect(wipeLocalAccountData()).rejects.toThrow('account_wipe_incomplete');
  expect(store[retainedKey]).toBe('account-a-private-completion');
});

it('fails closed when the final defense-in-depth removal fails', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-before-switch';
  (AsyncStorage.multiRemove as jest.Mock)
    .mockImplementationOnce(async (keys: string[]) => {
      keys.forEach((key) => delete store[key]);
      store.personal_plan_attempt_events_v1 = 'account-a-late-write';
    })
    .mockRejectedValueOnce(new Error('late storage remove failed'));

  await expect(wipeLocalAccountData()).rejects.toThrow('late storage remove failed');

  expect(store.personal_plan_attempt_events_v1).toBe('account-a-late-write');
});

it('backs up the same fixed and wildcard V2 keys that account wipe removes', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';
  store.personal_plan_recovery_applied_actions_v1 = 'account-a-recovery';
  store['personal_plan_day_runtime_v1:account_a_plan:gavan:17'] = 'account-a-runtime';
  const multiGet = AsyncStorage.multiGet as jest.Mock;
  multiGet.mockClear();

  await saveAccountSwitchEmergencyBackup('test');

  expect(await readBackupPairs()).toEqual(expect.arrayContaining([
    ['personal_plan_attempt_events_v1', 'account-a-attempts'],
    ['personal_plan_recovery_applied_actions_v1', 'account-a-recovery'],
    ['personal_plan_day_runtime_v1:account_a_plan:gavan:17', 'account-a-runtime'],
  ]));
  expect(multiGet.mock.calls.every(([keys]) => (keys as string[]).length <= 64)).toBe(true);
});

it('backs up, wipes, restores, and drains one exact pending completion graph', async () => {
  const session = getLesson1SessionRuntime().compiled.sessions[0];
  const envelope = completionEnvelopeFor(session, 'backup-restore-session-run');
  const coordinator = createRequiredSessionLocalCommitCoordinator(
    progressStorage,
    () => true,
    REQUIRED_SESSION_IDS,
  );
  await coordinator.commit(localScope, envelope);
  expect(await coordinator.pendingCount(localScope)).toBeGreaterThan(0);

  await saveAccountSwitchEmergencyBackup('pending-completion-e2e', localStableId);
  await wipeLocalAccountData();
  expect(Object.keys(store).some((key) =>
    key.startsWith('v2:required-session-local-commit:'))).toBe(false);

  await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual(
    expect.objectContaining({ status: 'restored' }),
  );
  const recovered = createRequiredSessionLocalCommitCoordinator(
    progressStorage,
    () => true,
    REQUIRED_SESSION_IDS,
  );
  await recovered.recover(localScope);
  await recovered.recover(localScope);

  expect(await recovered.pendingCount(localScope)).toBe(0);
  const pending = await createProgressOutbox(progressStorage, () => true).list(localScope);
  expect(pending).toHaveLength(1);
  expect(pending[0].payload).toEqual(expect.objectContaining({
    sessionRunId: 'backup-restore-session-run',
  }));
  const progress = await createLesson1LocalProgressStore(
    progressStorage,
    () => true,
    REQUIRED_SESSION_IDS,
  ).load(localScope);
  expect(progress.sessions[REQUIRED_SESSION_IDS[0]]).toBe('completed');
});

it('backs up and verifies the exact owner-scoped shard earn queue before account switch', async () => {
  const queueKey = shardDeltaQueueStorageKey('local-stable-id');
  const queueRaw = JSON.stringify([{
    opId: 'op-owner-a-1234',
    ownerStableId: 'local-stable-id',
    delta: 2,
    type: 'earn',
    reason: 'lesson_first',
    createdAtMs: 1,
  }]);
  store[queueKey] = queueRaw;

  await expect(saveAccountSwitchEmergencyBackup(
    'pending_shard_earn_before_account_switch',
    'local-stable-id',
  )).resolves.toBe(true);

  const payload = JSON.parse(store[BACKUP_KEY]) as {
    version: number;
    stableId: string;
  };
  expect(payload.version).toBe(3);
  expect(payload.stableId).toBe('local-stable-id');
  expect(await readBackupPairs()).toContainEqual([queueKey, queueRaw]);
});

it('does not report an emergency backup when wildcard discovery fails', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';
  const priorRoot = legacyBackupRootFor(localStableId);
  store[BACKUP_KEY] = priorRoot;
  (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(new Error('storage scan failed'));

  await expect(saveAccountSwitchEmergencyBackup('test')).rejects.toThrow(
    'learning_v2_account_key_scan_failed',
  );

  expect(store[BACKUP_KEY]).toBe(priorRoot);
});

it('rejects a silent multiGet row omission before publishing a backup root', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';
  (AsyncStorage.multiGet as jest.Mock).mockImplementationOnce(async (keys: string[]) => (
    keys.slice(1).map((key) => [key, store[key] ?? null])
  ));

  await expect(saveAccountSwitchEmergencyBackup('test')).rejects.toThrow(
    'account_switch_backup_verification_failed',
  );

  expect(store[BACKUP_KEY]).toBeUndefined();
  expect(Object.keys(store).some((key) =>
    key.startsWith(BACKUP_PAGE_PREFIX))).toBe(false);
});

it('fails rollback when storage hides a retained staged page', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';
  const priorRoot = legacyBackupRootFor(localStableId);
  store[BACKUP_KEY] = priorRoot;
  (AsyncStorage.setItem as jest.Mock)
    .mockImplementationOnce(async (key: string, value: string) => { store[key] = value; })
    .mockImplementationOnce(async (key: string) => { store[key] = 'corrupt-root'; });
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => (
    keys.every((key) => key.startsWith(BACKUP_PAGE_PREFIX))
      ? []
      : keys.map((key) => [key, store[key] ?? null])
  ));
  (AsyncStorage.multiRemove as jest.Mock).mockImplementationOnce(async () => {
    // Silent native failure: the staged page remains.
  });

  await expect(saveAccountSwitchEmergencyBackup('test')).rejects.toThrow(
    'account_switch_backup_rollback_failed',
  );

  expect(store[BACKUP_KEY]).toBe(priorRoot);
  expect(Object.keys(store).some((key) => key.startsWith(BACKUP_PAGE_PREFIX))).toBe(true);
});

it('never stages into the namespace of the currently published backup', async () => {
  const now = 1_234_567_890;
  const random = 0.123456789;
  const baseId = `${now.toString(36)}-${random.toString(36).slice(2, 14)}`;
  const priorPageKey = `${BACKUP_PAGE_PREFIX}${baseId}:0`;
  const { rootRaw: priorRoot, pageRaw: priorPage } = await writeOwnerBackupV3(
    localStableId,
    baseId,
    [['prior-owner-key', 'prior-owner-value']],
  );
  expect(store[priorPageKey]).toBe(priorPage);
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';
  const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
  const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(random);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (key === BACKUP_KEY && value !== priorRoot) throw new Error('cut-before-new-root');
    store[key] = value;
  });

  await expect(saveAccountSwitchEmergencyBackup('test')).rejects.toThrow('cut-before-new-root');
  nowSpy.mockRestore();
  randomSpy.mockRestore();

  expect(store[BACKUP_KEY]).toBe(priorRoot);
  expect(store[priorPageKey]).toBe(priorPage);
  expect(Object.keys(store).filter((key) => key.startsWith(BACKUP_PAGE_PREFIX))).toEqual([
    priorPageKey,
  ]);
});

it('preserves an oversized legacy root and blocks account switch backup overwrite', async () => {
  const oversizedLegacyRoot = 'x'.repeat(512 * 1024 + 1);
  store[BACKUP_KEY] = oversizedLegacyRoot;
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';

  await expect(saveAccountSwitchEmergencyBackup('test')).rejects.toThrow(
    'account_switch_backup_history_upgrade_required',
  );

  expect(store[BACKUP_KEY]).toBe(oversizedLegacyRoot);
  expect(Object.keys(store).some((key) => key.startsWith(BACKUP_PAGE_PREFIX))).toBe(false);
});

it('preserves another account backup until that owner returns', async () => {
  const backupId = 'stable-a-pending-backup';
  const { rootRaw, pageRaw } = await writeOwnerBackupV3(
    'stable-A',
    backupId,
    [['multi_account_pending_key', 'pending-value']],
  );
  (AsyncStorage.setItem as jest.Mock).mockClear();
  (getCanonicalUserId as jest.Mock)
    .mockResolvedValueOnce(localStableId)
    .mockResolvedValueOnce('stable-A');

  await expect(saveAccountSwitchEmergencyBackup('test', localStableId)).rejects.toThrow(
    'account_switch_backup_other_owner_pending',
  );
  expect(store[BACKUP_KEY]).toBe(rootRaw);
  expect(store[`${BACKUP_PAGE_PREFIX}${backupId}:0`]).toBe(pageRaw);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();

  beginAccountGeneration('stable-A');
  await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({
    status: 'restored',
    restoredKeys: 1,
    skippedExisting: 0,
  });
  expect(store.multi_account_pending_key).toBe('pending-value');
  expect(store[BACKUP_KEY]).toBeUndefined();
});

it('restores the prior valid backup when replacement verification fails', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';
  const priorRoot = legacyBackupRootFor(localStableId);
  store[BACKUP_KEY] = priorRoot;
  (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(async (key: string) => {
    store[key] = 'corrupt-replacement';
  });

  await expect(saveAccountSwitchEmergencyBackup('test')).rejects.toThrow(
    'account_switch_backup_verification_failed',
  );

  expect(store[BACKUP_KEY]).toBe(priorRoot);
});

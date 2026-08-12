import AsyncStorage from '@react-native-async-storage/async-storage';
import { restoreAccountSwitchEmergencyBackupIfSafe } from '../app/account_switch_backup_restore';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from '../modules/learning-v2/policies/decision_registry';

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getCanonicalUserId } = require('../app/user_id_policy');

const BACKUP_KEY = 'account_switch_emergency_backup_latest_v1';

function makeBackup(overrides: Partial<Record<string, unknown>> = {}): string {
  return JSON.stringify({
    version: 1,
    createdAt: Date.now(),
    reason: 'force_sync_failed_before_account_switch',
    stableId: 'stable-A',
    pairs: [
      ['xp_total', '500'],
      ['streak_count', '7'],
    ],
    ...overrides,
  });
}

async function writePagedBackupV3(
  pairs: readonly (readonly [string, string])[],
): Promise<{ backupId: string; pageCount: number }> {
  const backupId = 'paged-backup-test-1';
  let previousPageFingerprint: string | null = null;
  let pageCount = 0;
  for (let offset = 0; offset < pairs.length; offset += 64) {
    const pagePairs = pairs.slice(offset, offset + 64);
    const body = {
      schemaVersion: 'account-switch-emergency-backup-page.v1' as const,
      backupId,
      stableId: 'stable-A',
      pageIndex: pageCount,
      previousPageFingerprint,
      pairs: pagePairs,
    };
    const pageFingerprint = hashCanonicalBody(body);
    await AsyncStorage.setItem(
      `account_switch_emergency_backup_page_v1:${backupId}:${pageCount}`,
      canonicalJsonV1({ ...body, pageFingerprint }),
    );
    previousPageFingerprint = pageFingerprint;
    pageCount += 1;
  }
  const body = {
    version: 3 as const,
    schemaVersion: 'account-switch-emergency-backup.v3' as const,
    backupId,
    stableId: 'stable-A',
    createdAt: Date.now(),
    reason: 'paged-test',
    pageCount,
    pairCount: pairs.length,
    totalUtf8Bytes: pairs.reduce((total, [key, value]) =>
      total + utf8ByteLengthV1(key) + utf8ByteLengthV1(value), 0),
    lastPageFingerprint: previousPageFingerprint,
    requiredSessionReceiptCount: pairs.filter(([key]) =>
      key.startsWith('v2:required-session-completion-receipt:v1:')).length,
  };
  await AsyncStorage.setItem(
    BACKUP_KEY,
    canonicalJsonV1({ ...body, manifestFingerprint: hashCanonicalBody(body) }),
  );
  return { backupId, pageCount };
}

async function rewriteBackupManifest(
  mutate: (body: Record<string, unknown>) => void,
): Promise<void> {
  const parsed = JSON.parse((await AsyncStorage.getItem(BACKUP_KEY))!) as Record<string, unknown>;
  const { manifestFingerprint: _ignored, ...body } = parsed;
  mutate(body);
  await AsyncStorage.setItem(
    BACKUP_KEY,
    canonicalJsonV1({ ...body, manifestFingerprint: hashCanonicalBody(body) }),
  );
}

beforeEach(() => {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
  __resetAccountGenerationForTests();
  beginAccountGeneration('stable-A');
  jest.clearAllMocks();
  (getCanonicalUserId as jest.Mock).mockResolvedValue('stable-A');
});

describe('restoreAccountSwitchEmergencyBackupIfSafe', () => {
  it('возвращает no_backup, когда копии нет', async () => {
    expect(await restoreAccountSwitchEmergencyBackupIfSafe()).toEqual({ status: 'no_backup' });
  });

  it('доливает только отсутствующие ключи и удаляет копию', async () => {
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup());
    await AsyncStorage.setItem('xp_total', '900'); // облако уже восстановило — не трогаем

    const res = await restoreAccountSwitchEmergencyBackupIfSafe();

    expect(res).toEqual({ status: 'restored', restoredKeys: 1, skippedExisting: 1 });
    expect(await AsyncStorage.getItem('xp_total')).toBe('900');
    expect(await AsyncStorage.getItem('streak_count')).toBe('7');
    expect(await AsyncStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('restores the owner-bound version 2 backup payload', async () => {
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup({ version: 2 }));

    const res = await restoreAccountSwitchEmergencyBackupIfSafe();

    expect(res).toEqual({ status: 'restored', restoredKeys: 2, skippedExisting: 0 });
    expect(await AsyncStorage.getItem('streak_count')).toBe('7');
    expect(await AsyncStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('restores a 130-pair paged v3 backup in bounded pages', async () => {
    const pairs = Array.from({ length: 130 }, (_, index) => [
      `paged_key_${String(index).padStart(3, '0')}`,
      `value-${index}`,
    ] as const);
    await writePagedBackupV3(pairs);
    const multiGet = AsyncStorage.multiGet as jest.Mock;
    multiGet.mockClear();

    const res = await restoreAccountSwitchEmergencyBackupIfSafe();

    expect(res).toEqual({ status: 'restored', restoredKeys: 130, skippedExisting: 0 });
    expect(await AsyncStorage.getItem('paged_key_000')).toBe('value-0');
    expect(await AsyncStorage.getItem('paged_key_129')).toBe('value-129');
    expect(await AsyncStorage.getItem(BACKUP_KEY)).toBeNull();
    expect((await AsyncStorage.getAllKeys()).some((key) =>
      key.startsWith('account_switch_emergency_backup_page_v1:'))).toBe(false);
    expect(multiGet.mock.calls.every(([keys]) => (keys as string[]).length <= 64)).toBe(true);
  });

  it('rejects a paged spool graph conflict instead of merging two queue heads', async () => {
    const headKey = 'v2:required-session-local-commit-index:v1:account-a:head';
    await writePagedBackupV3([[headKey, 'backup-head']]);
    await AsyncStorage.setItem(headKey, 'new-account-head');

    expect(await restoreAccountSwitchEmergencyBackupIfSafe()).toEqual({ status: 'invalid' });
    expect(await AsyncStorage.getItem(headKey)).toBe('new-account-head');
    expect(await AsyncStorage.getItem(BACKUP_KEY)).not.toBeNull();
  });

  it('audits every page before writing any target key', async () => {
    const pairs = Array.from({ length: 65 }, (_, index) => [
      `audit_key_${String(index).padStart(3, '0')}`,
      `value-${index}`,
    ] as const);
    const { backupId } = await writePagedBackupV3(pairs);
    await AsyncStorage.removeItem(`account_switch_emergency_backup_page_v1:${backupId}:1`);

    expect(await restoreAccountSwitchEmergencyBackupIfSafe()).toEqual({ status: 'invalid' });
    expect(await AsyncStorage.getItem('audit_key_000')).toBeNull();
    expect(await AsyncStorage.getItem(BACKUP_KEY)).not.toBeNull();
  });

  it('rejects wrong manifest totals before writing any target key', async () => {
    await writePagedBackupV3([['audit_total_key', 'value']]);
    await rewriteBackupManifest((body) => { body.pairCount = 2; });

    expect(await restoreAccountSwitchEmergencyBackupIfSafe()).toEqual({ status: 'invalid' });
    expect(await AsyncStorage.getItem('audit_total_key')).toBeNull();
  });

  it('finds a conflict on the last page before restoring the first page', async () => {
    const headKey = 'v2:required-session-local-commit-index:v1:account-a:head';
    const pairs = [
      ...Array.from({ length: 64 }, (_, index) => [
        `audit_normal_${String(index).padStart(3, '0')}`,
        `value-${index}`,
      ] as const),
      [headKey, 'backup-head'] as const,
    ];
    await writePagedBackupV3(pairs);
    await AsyncStorage.setItem(headKey, 'conflicting-head');

    expect(await restoreAccountSwitchEmergencyBackupIfSafe()).toEqual({ status: 'invalid' });
    expect(await AsyncStorage.getItem('audit_normal_000')).toBeNull();
    expect(await AsyncStorage.getItem(headKey)).toBe('conflicting-head');
  });

  it('rolls a process cut forward from leaves without exposing a partial queue root', async () => {
    const entryKey = 'v2:required-session-local-commit:v2:account-a:mutation-a';
    const headKey = 'v2:required-session-local-commit-index:v1:account-a:head';
    const memberKey = 'v2:required-session-local-commit-index:v1:account-a:member:mutation-a';
    const pageKey = 'v2:required-session-local-commit-index:v1:account-a:page:0';
    const graphPairs: Array<readonly [string, string]> = [
      [headKey, 'head'],
      [memberKey, 'member'],
      [pageKey, 'page'],
      [entryKey, 'entry'],
    ];
    graphPairs.sort(([a], [b]) => a.localeCompare(b));
    await writePagedBackupV3(graphPairs);
    const multiSet = AsyncStorage.multiSet as jest.Mock;
    const persist = multiSet.getMockImplementation()!;
    multiSet.mockImplementationOnce(async (pairs: Array<[string, string]>) => {
      await persist(pairs);
      throw new Error('process-cut-after-leaves');
    });

    await expect(restoreAccountSwitchEmergencyBackupIfSafe())
      .rejects.toThrow('process-cut-after-leaves');
    expect(await AsyncStorage.getItem(entryKey)).toBe('entry');
    expect(await AsyncStorage.getItem(pageKey)).toBe('page');
    expect(await AsyncStorage.getItem(headKey)).toBeNull();
    expect(await AsyncStorage.getItem(BACKUP_KEY)).not.toBeNull();

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({
      status: 'restored',
      restoredKeys: 1,
      skippedExisting: 3,
    });
    expect(await AsyncStorage.getItem(headKey)).toBe('head');
    expect(await AsyncStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('restores transaction authority before publishing the queue head', async () => {
    const headKey = 'v2:required-session-local-commit-index:v1:account-a:head';
    const transactionKey = 'v2:required-session-local-commit-index:v1:account-a:transaction';
    const pageKey = 'v2:required-session-local-commit-index:v1:account-a:page:0';
    const memberKey = 'v2:required-session-local-commit-index:v1:account-a:member:mutation-a';
    const graphPairs: Array<readonly [string, string]> = [
      [headKey, 'head-after'],
      [transactionKey, 'recoverable-transaction'],
      [pageKey, 'page-after'],
      [memberKey, 'member-after'],
    ];
    graphPairs.sort(([a], [b]) => a.localeCompare(b));
    await writePagedBackupV3(graphPairs);
    const multiSet = AsyncStorage.multiSet as jest.Mock;
    const persist = multiSet.getMockImplementation()!;
    multiSet
      .mockImplementationOnce(persist)
      .mockImplementationOnce(async (pairs: Array<[string, string]>) => {
        await persist(pairs);
        throw new Error('process-cut-after-transaction');
      });

    await expect(restoreAccountSwitchEmergencyBackupIfSafe())
      .rejects.toThrow('process-cut-after-transaction');
    expect(await AsyncStorage.getItem(pageKey)).toBe('page-after');
    expect(await AsyncStorage.getItem(memberKey)).toBe('member-after');
    expect(await AsyncStorage.getItem(transactionKey)).toBe('recoverable-transaction');
    expect(await AsyncStorage.getItem(headKey)).toBeNull();
    expect(await AsyncStorage.getItem(BACKUP_KEY)).not.toBeNull();

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({
      status: 'restored',
      restoredKeys: 1,
      skippedExisting: 3,
    });
    expect(await AsyncStorage.getItem(headKey)).toBe('head-after');
    expect(await AsyncStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('preflights every legacy chunk before restoring any key', async () => {
    const headKey = 'v2:required-session-local-commit-index:v1:account-a:head';
    const pairs = [
      ...Array.from({ length: 64 }, (_, index) => [
        `legacy_normal_${String(index).padStart(3, '0')}`,
        `value-${index}`,
      ]),
      [headKey, 'backup-head'],
    ];
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup({ pairs }));
    await AsyncStorage.setItem(headKey, 'conflicting-head');

    expect(await restoreAccountSwitchEmergencyBackupIfSafe()).toEqual({ status: 'invalid' });
    expect(await AsyncStorage.getItem('legacy_normal_000')).toBeNull();
  });

  it.each([
    ['inside one chunk', [
      ['legacy_duplicate', 'first'],
      ['legacy_duplicate', 'second'],
    ]],
    ['across the 64-pair boundary', [
      ['legacy_duplicate', 'first'],
      ...Array.from({ length: 63 }, (_, index) => [
        `legacy_filler_${String(index).padStart(3, '0')}`,
        `value-${index}`,
      ]),
      ['legacy_duplicate', 'second'],
    ]],
  ])('rejects a duplicate legacy key %s before the first target write', async (_label, pairs) => {
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup({ pairs }));

    expect(await restoreAccountSwitchEmergencyBackupIfSafe()).toEqual({ status: 'invalid' });
    expect(await AsyncStorage.getItem('legacy_duplicate')).toBeNull();
    expect(await AsyncStorage.getItem('legacy_filler_000')).toBeNull();
    expect(await AsyncStorage.getItem(BACKUP_KEY)).not.toBeNull();
  });

  it('не восстанавливает копию чужого аккаунта и не удаляет её', async () => {
    (getCanonicalUserId as jest.Mock).mockResolvedValue('stable-B');
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup());

    const res = await restoreAccountSwitchEmergencyBackupIfSafe();

    expect(res).toEqual({ status: 'different_account' });
    expect(await AsyncStorage.getItem('streak_count')).toBeNull();
    expect(await AsyncStorage.getItem(BACKUP_KEY)).not.toBeNull();
  });

  it('не восстанавливает без stableId в копии', async () => {
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup({ stableId: null }));

    const res = await restoreAccountSwitchEmergencyBackupIfSafe();

    expect(res).toEqual({ status: 'different_account' });
    expect(await AsyncStorage.getItem('streak_count')).toBeNull();
  });

  it('удаляет протухшую копию (старше 30 дней)', async () => {
    await AsyncStorage.setItem(
      BACKUP_KEY,
      makeBackup({ createdAt: Date.now() - 31 * 24 * 60 * 60_000 }),
    );

    const res = await restoreAccountSwitchEmergencyBackupIfSafe();

    expect(res).toEqual({ status: 'expired' });
    expect(await AsyncStorage.getItem(BACKUP_KEY)).toBeNull();
    expect(await AsyncStorage.getItem('streak_count')).toBeNull();
  });

  it('удаляет страницы протухшей V3-копии вместе с корнем', async () => {
    const { backupId } = await writePagedBackupV3([['expired_page_key', 'value']]);
    await rewriteBackupManifest((body) => {
      body.createdAt = Date.now() - 31 * 24 * 60 * 60_000;
    });

    expect(await restoreAccountSwitchEmergencyBackupIfSafe()).toEqual({ status: 'expired' });
    expect(await AsyncStorage.getItem(BACKUP_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(
      `account_switch_emergency_backup_page_v1:${backupId}:0`,
    )).toBeNull();
  });

  it('удаляет повреждённую копию', async () => {
    await AsyncStorage.setItem(BACKUP_KEY, 'not-json{');

    const res = await restoreAccountSwitchEmergencyBackupIfSafe();

    expect(res).toEqual({ status: 'invalid' });
    expect(await AsyncStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('игнорирует мусорные пары, восстанавливая валидные', async () => {
    await AsyncStorage.setItem(
      BACKUP_KEY,
      makeBackup({ pairs: [['ok_key', 'v'], ['broken', null], 'garbage'] }),
    );

    const res = await restoreAccountSwitchEmergencyBackupIfSafe();

    expect(res).toEqual({ status: 'restored', restoredKeys: 1, skippedExisting: 0 });
    expect(await AsyncStorage.getItem('ok_key')).toBe('v');
  });

  it('does not commit backup data after its account generation becomes stale', async () => {
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup());
    const isCurrent = jest.fn(() => false);

    const res = await restoreAccountSwitchEmergencyBackupIfSafe(isCurrent);

    expect(res).toEqual({ status: 'stale_generation' });
    expect(await AsyncStorage.getItem('streak_count')).toBeNull();
    expect(await AsyncStorage.getItem(BACKUP_KEY)).not.toBeNull();
  });

  it('serializes backup restoration with the account transition lock', async () => {
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup());
    let release!: () => void;
    const blocker = withAccountTransitionLock(
      () => new Promise<void>((resolve) => { release = resolve; }),
    );
    await Promise.resolve();

    const restoring = restoreAccountSwitchEmergencyBackupIfSafe();
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(await AsyncStorage.getItem('streak_count')).toBeNull();

    release();
    await blocker;
    await expect(restoring).resolves.toEqual({
      status: 'restored',
      restoredKeys: 2,
      skippedExisting: 0,
    });
  });

  it('preserves the backup when its captured generation becomes stale in the lock queue', async () => {
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup());
    const originalBackup = await AsyncStorage.getItem(BACKUP_KEY);
    let release!: () => void;
    const blocker = withAccountTransitionLock(
      () => new Promise<void>((resolve) => { release = resolve; }),
    );
    await Promise.resolve();

    const restoring = restoreAccountSwitchEmergencyBackupIfSafe();
    invalidateAccountGeneration();
    release();
    await blocker;

    await expect(restoring).resolves.toEqual({ status: 'stale_generation' });
    expect(await AsyncStorage.getItem('streak_count')).toBeNull();
    expect(await AsyncStorage.getItem(BACKUP_KEY)).toBe(originalBackup);
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  restoreAccountSwitchEmergencyBackupIfSafe,
  shelvesAllowedForPostAuthStage,
} from '../app/account_switch_backup_restore';
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

// ── TG-0AE4918142EE: полки `…_shelved_v1:<владелец>:<время>` возвращаются владельцу ──
const SHELF_PREFIX = 'account_switch_emergency_backup_shelved_v1:';
const PAGE_PREFIX = 'account_switch_emergency_backup_page_v1:';
const shelfKey = (owner: string, stampedAt: number): string => `${SHELF_PREFIX}${owner}:${stampedAt.toString(36)}`;

/** v3-копия под произвольным корневым ключом (полка), владелец страниц = владелец корня. */
async function writeShelfV3(
  rootKey: string,
  owner: string,
  backupId: string,
  pairs: readonly (readonly [string, string])[],
  createdAt: number = Date.now(),
): Promise<void> {
  const pageBody = {
    schemaVersion: 'account-switch-emergency-backup-page.v1' as const,
    backupId,
    stableId: owner,
    pageIndex: 0,
    previousPageFingerprint: null,
    pairs,
  };
  const pageFingerprint = hashCanonicalBody(pageBody);
  await AsyncStorage.setItem(`${PAGE_PREFIX}${backupId}:0`, canonicalJsonV1({ ...pageBody, pageFingerprint }));
  const body = {
    version: 3 as const,
    schemaVersion: 'account-switch-emergency-backup.v3' as const,
    backupId,
    stableId: owner,
    createdAt,
    reason: 'shelf-test',
    pageCount: 1,
    pairCount: pairs.length,
    totalUtf8Bytes: pairs.reduce((total, [key, value]) => total + utf8ByteLengthV1(key) + utf8ByteLengthV1(value), 0),
    lastPageFingerprint: pageFingerprint,
    requiredSessionReceiptCount: 0,
  };
  await AsyncStorage.setItem(rootKey, canonicalJsonV1({ ...body, manifestFingerprint: hashCanonicalBody(body) }));
}

describe('restoreAccountSwitchEmergencyBackupIfSafe — полки владельца (TG-0AE4918142EE)', () => {
  const now = Date.now();

  it('слот пуст → доливает полку владельца, удаляет её корень и страницы', async () => {
    const key = shelfKey('stable-A', now - 1_000);
    await writeShelfV3(key, 'stable-A', 'shelf-a-1', [['coin_rank_v1:stable-A', 'rank-3'], ['streak_count', '7']]);
    await AsyncStorage.setItem('streak_count', '9'); // облако уже вернуло — не трогаем

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({
      status: 'restored', restoredKeys: 1, skippedExisting: 1,
    });
    expect(await AsyncStorage.getItem('coin_rank_v1:stable-A')).toBe('rank-3');
    expect(await AsyncStorage.getItem('streak_count')).toBe('9');
    expect(await AsyncStorage.getItem(key)).toBeNull();
    expect(await AsyncStorage.getItem(`${PAGE_PREFIX}shelf-a-1:0`)).toBeNull();
  });

  it('слот занят копией Б → доливает полку A, копию Б в слоте не трогает', async () => {
    const slotB = makeBackup({ stableId: 'stable-B', pairs: [['b_only', 'b-value']] });
    await AsyncStorage.setItem(BACKUP_KEY, slotB);
    const key = shelfKey('stable-A', now - 1_000);
    await AsyncStorage.setItem(key, makeBackup({ pairs: [['a_only', 'a-value']] }));

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({
      status: 'restored', restoredKeys: 1, skippedExisting: 0,
    });
    expect(await AsyncStorage.getItem('a_only')).toBe('a-value');
    expect(await AsyncStorage.getItem('b_only')).toBeNull();
    expect(await AsyncStorage.getItem(BACKUP_KEY)).toBe(slotB);
    expect(await AsyncStorage.getItem(key)).toBeNull();
  });

  // Ревью TG-92BAE5BC536D, MEDIUM 1: старая полка после долива свежей снимается и больше
  // не доливается при следующем входе с пустым слотом (иначе — воскрешение удалённого).
  it('при двух полках берёт свежую; старую снимает — следующий вход её уже не дольёт', async () => {
    const oldKey = shelfKey('stable-A', now - 60_000);
    const freshKey = shelfKey('stable-A', now - 1_000);
    await writeShelfV3(oldKey, 'stable-A', 'shelf-old', [['coin_rank_v1:stable-A', 'old'], ['v2:outbox:sent-1', 'sent']], now - 70_000);
    await AsyncStorage.setItem(freshKey, makeBackup({ createdAt: now - 2_000, pairs: [['coin_rank_v1:stable-A', 'fresh']] }));

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toMatchObject({ status: 'restored' });
    expect(await AsyncStorage.getItem('coin_rank_v1:stable-A')).toBe('fresh');
    expect(await AsyncStorage.getItem(freshKey)).toBeNull();
    expect(await AsyncStorage.getItem(oldKey)).toBeNull();
    expect(await AsyncStorage.getItem(`${PAGE_PREFIX}shelf-old:0`)).toBeNull();

    // Человек удалил ключ и очередь ушла на сервер; следующий вход со стиранием — пустой слот.
    await AsyncStorage.removeItem('coin_rank_v1:stable-A');
    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({ status: 'no_backup' });
    expect(await AsyncStorage.getItem('coin_rank_v1:stable-A')).toBeNull();
    expect(await AsyncStorage.getItem('v2:outbox:sent-1')).toBeNull();
  });

  it('своя копия из слота снимает свои полки, отложенные до её создания; более поздние и чужие не трогает', async () => {
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup({ createdAt: now - 10_000 }));
    const olderOwn = shelfKey('stable-A', now - 20_000);
    const laterOwn = shelfKey('stable-A', now - 5_000);
    const foreign = shelfKey('stable-B', now - 30_000);
    await AsyncStorage.setItem(olderOwn, makeBackup({ createdAt: now - 25_000, pairs: [['stale', 'x']] }));
    await AsyncStorage.setItem(laterOwn, makeBackup({ createdAt: now - 6_000, pairs: [['later', 'y']] }));
    await AsyncStorage.setItem(foreign, makeBackup({ stableId: 'stable-B', pairs: [['b_only', 'b']] }));

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toMatchObject({ status: 'restored' });
    expect(await AsyncStorage.getItem('stale')).toBeNull();
    expect(await AsyncStorage.getItem(olderOwn)).toBeNull();
    expect(await AsyncStorage.getItem(laterOwn)).not.toBeNull();
    expect(await AsyncStorage.getItem(foreign)).not.toBeNull();
  });

  // Ревью TG-2307361A2567, LOW: возраст полки — по createdAt внутри копии, не по метке ключа.
  it('сбитые часы: снятие решает createdAt внутри полки, а не метка в имени ключа', async () => {
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup({ createdAt: now - 10_000 }));
    // Метка «из будущего», но копия внутри старше долитой → устарела.
    const futureStampOld = shelfKey('stable-A', now + 86_400_000);
    // Метка «из прошлого», но копия внутри новее долитой → не трогаем.
    const pastStampNew = shelfKey('stable-A', now - 86_400_000);
    await AsyncStorage.setItem(futureStampOld, makeBackup({ createdAt: now - 50_000, pairs: [['old_k', 'o']] }));
    await AsyncStorage.setItem(pastStampNew, makeBackup({ createdAt: now - 1_000, pairs: [['new_k', 'n']] }));

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toMatchObject({ status: 'restored' });
    expect(await AsyncStorage.getItem(futureStampOld)).toBeNull();
    expect(await AsyncStorage.getItem(pastStampNew)).not.toBeNull();
  });

  it('устаревшие дубли (один backupId): страницы снимаются только с последним корнем', async () => {
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup({ createdAt: now - 1_000 }));
    const dupOld = shelfKey('stable-A', now - 30_000);
    const dupNew = shelfKey('stable-A', now - 20_000);
    await writeShelfV3(dupOld, 'stable-A', 'dup-a', [['dup_k', 'd']], now - 40_000);
    await AsyncStorage.setItem(dupNew, (await AsyncStorage.getItem(dupOld))!);

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toMatchObject({ status: 'restored' });
    expect(await AsyncStorage.getItem(dupOld)).toBeNull();
    expect(await AsyncStorage.getItem(dupNew)).toBeNull();
    expect(await AsyncStorage.getItem(`${PAGE_PREFIX}dup-a:0`)).toBeNull();
  });

  it('копия гостя по метке merge не снимает полки текущего владельца', async () => {
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup({ stableId: 'stable-guest', pairs: [['guest_key', 'g']] }));
    await AsyncStorage.setItem('account_switch_backup_merge_alias_v1', JSON.stringify({ from: 'stable-guest', to: 'stable-A', at: now }));
    const ownShelf = shelfKey('stable-A', now - 60_000);
    await AsyncStorage.setItem(ownShelf, makeBackup({ createdAt: now - 70_000, pairs: [['a_only', 'a']] }));

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toMatchObject({ status: 'restored' });
    expect(await AsyncStorage.getItem('guest_key')).toBe('g');
    expect(await AsyncStorage.getItem(ownShelf)).not.toBeNull();
  });

  it('onKeysScanned отдаёт список ключей без снятых полок (для чистки, один getAllKeys)', async () => {
    const freshKey = shelfKey('stable-A', now - 1_000);
    const foreign = shelfKey('stable-B', now - 1_000);
    await AsyncStorage.setItem(freshKey, makeBackup({ pairs: [['a_only', 'a']] }));
    await AsyncStorage.setItem(foreign, makeBackup({ stableId: 'stable-B' }));
    const getAllKeys = AsyncStorage.getAllKeys as unknown as jest.Mock;
    getAllKeys.mockClear();
    let scanned: readonly string[] | null = null;

    await restoreAccountSwitchEmergencyBackupIfSafe(undefined, { onKeysScanned: (keys) => { scanned = keys; } });

    expect(getAllKeys).toHaveBeenCalledTimes(1);
    expect(scanned).not.toBeNull();
    expect(scanned!).toContain(foreign);
    expect(scanned!).not.toContain(freshKey);
  });

  it('полки доливаются только во вход со стиранием', () => {
    expect(shelvesAllowedForPostAuthStage('swap_restore')).toBe(true);
    expect(shelvesAllowedForPostAuthStage('keeplocal_restore')).toBe(true);
    for (const stage of ['keeplocal_restore_same', 'linked_restore', 'created_restore', 'unknown']) {
      expect({ stage, allowed: shelvesAllowedForPostAuthStage(stage) }).toEqual({ stage, allowed: false });
    }
  });

  // Требование координатора (в): телефон, на котором всё лежит «по-старому».
  it('обратная совместимость: старый единый слот A + оболочки полок без страниц — A получает слот, оболочки не ломают вход', async () => {
    await AsyncStorage.setItem(BACKUP_KEY, makeBackup({ createdAt: now - 1_000 }));
    // Оболочки, созданные до правки: корень v3 есть, страниц нет (их снял старый save).
    const ownShellOld = shelfKey('stable-A', now - 86_400_000);
    const ownShellNewer = shelfKey('stable-A', now - 500);
    const foreignShell = shelfKey('stable-B', now - 86_400_000);
    await writeShelfV3(ownShellOld, 'stable-A', 'shell-a-old', [['shell_key', 'x']], now - 2 * 86_400_000);
    await writeShelfV3(ownShellNewer, 'stable-A', 'shell-a-new', [['shell_key', 'y']], now - 600);
    await writeShelfV3(foreignShell, 'stable-B', 'shell-b', [['shell_key', 'z']], now - 2 * 86_400_000);
    for (const id of ['shell-a-old', 'shell-a-new', 'shell-b']) await AsyncStorage.removeItem(`${PAGE_PREFIX}${id}:0`);

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({
      status: 'restored', restoredKeys: 2, skippedExisting: 0,
    });
    expect(await AsyncStorage.getItem('xp_total')).toBe('500');
    expect(await AsyncStorage.getItem('streak_count')).toBe('7');
    expect(await AsyncStorage.getItem('shell_key')).toBeNull();
    // Старая своя оболочка — устарела и снята; более новая и чужая — на месте.
    expect(await AsyncStorage.getItem(ownShellOld)).toBeNull();
    expect(await AsyncStorage.getItem(ownShellNewer)).not.toBeNull();
    expect(await AsyncStorage.getItem(foreignShell)).not.toBeNull();

    // Следующий вход A с пустым слотом: оболочка пропускается (invalid), вход цел.
    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({ status: 'no_backup' });
    expect(await AsyncStorage.getItem('shell_key')).toBeNull();
    expect(await AsyncStorage.getItem(ownShellNewer)).not.toBeNull();
  });

  it('полка чужого владельца не доливается и не удаляется (в т.ч. id-префикс stable-AB)', async () => {
    const foreignKey = shelfKey('stable-B', now - 1_000);
    const prefixKey = shelfKey('stable-AB', now - 500);
    await AsyncStorage.setItem(foreignKey, makeBackup({ stableId: 'stable-B', pairs: [['b_only', 'b']] }));
    await AsyncStorage.setItem(prefixKey, makeBackup({ stableId: 'stable-AB', pairs: [['ab_only', 'ab']] }));

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({ status: 'no_backup' });
    expect(await AsyncStorage.getItem('b_only')).toBeNull();
    expect(await AsyncStorage.getItem('ab_only')).toBeNull();
    expect(await AsyncStorage.getItem(foreignKey)).not.toBeNull();
    expect(await AsyncStorage.getItem(prefixKey)).not.toBeNull();
  });

  it('владелец сверяется внутри копии: полка с именем A, но копией Б — не доливается', async () => {
    const forgedKey = shelfKey('stable-A', now - 1_000);
    await AsyncStorage.setItem(forgedKey, makeBackup({ stableId: 'stable-B', pairs: [['b_only', 'b']] }));

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({ status: 'no_backup' });
    expect(await AsyncStorage.getItem('b_only')).toBeNull();
    expect(await AsyncStorage.getItem(forgedKey)).not.toBeNull();
  });

  it('свежая полка без страниц (битая) пропускается, доливается следующая; битая остаётся', async () => {
    const brokenKey = shelfKey('stable-A', now - 1_000);
    await writeShelfV3(brokenKey, 'stable-A', 'shelf-broken', [['coin_rank_v1:stable-A', 'lost']]);
    await AsyncStorage.removeItem(`${PAGE_PREFIX}shelf-broken:0`);
    const olderKey = shelfKey('stable-A', now - 60_000);
    // Копия создана раньше, чем отложена (как в жизни): битая свежая полка не «устаревает» от неё.
    await AsyncStorage.setItem(olderKey, makeBackup({ createdAt: now - 70_000, pairs: [['coin_rank_v1:stable-A', 'older']] }));

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toMatchObject({ status: 'restored' });
    expect(await AsyncStorage.getItem('coin_rank_v1:stable-A')).toBe('older');
    expect(await AsyncStorage.getItem(brokenKey)).not.toBeNull();
    expect(await AsyncStorage.getItem(olderKey)).toBeNull();
  });

  it('skipShelves: только слот — полку не трогает', async () => {
    const key = shelfKey('stable-A', now - 1_000);
    await AsyncStorage.setItem(key, makeBackup({ pairs: [['a_only', 'a']] }));

    await expect(restoreAccountSwitchEmergencyBackupIfSafe(undefined, { skipShelves: true }))
      .resolves.toEqual({ status: 'no_backup' });
    expect(await AsyncStorage.getItem('a_only')).toBeNull();
    expect(await AsyncStorage.getItem(key)).not.toBeNull();
  });

  it('полок нет вовсе → канонический id не читается (дешёвый ранний выход)', async () => {
    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({ status: 'no_backup' });
    expect(getCanonicalUserId).not.toHaveBeenCalled();
  });

  it('поколение устарело к моменту полки → stale_generation, полка цела', async () => {
    const key = shelfKey('stable-A', now - 1_000);
    const raw = makeBackup({ pairs: [['a_only', 'a']] });
    await AsyncStorage.setItem(key, raw);
    (getCanonicalUserId as jest.Mock).mockImplementationOnce(async () => {
      invalidateAccountGeneration();
      return 'stable-A';
    });

    await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({ status: 'stale_generation' });
    expect(await AsyncStorage.getItem('a_only')).toBeNull();
    expect(await AsyncStorage.getItem(key)).toBe(raw);
  });
});

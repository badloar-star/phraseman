import AsyncStorage from '@react-native-async-storage/async-storage';
import { restoreAccountSwitchEmergencyBackupIfSafe } from '../app/account_switch_backup_restore';

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

beforeEach(() => {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
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
});

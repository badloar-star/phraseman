/**
 * Dev-подмены съёмки зоны Авторизации (координатор 12.10):
 * - `robot_no_cloud=1` — тумблеры «Уведомлений» и «Приватности» не сохраняют и не пишут в облако;
 * - `restore=offer|restored` — окно «Восстановить аккаунт?» без сервера, настоящее восстановление недостижимо.
 * зачем: робот жмёт тумблеры и «Восстановить»; любая запись в прод с робота — только по слову владельца.
 */
import fs from 'fs';
import path from 'path';

const alerts: Array<{ title: string; buttons: Array<{ text: string; onPress?: () => void }> }> = [];
jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (options: Record<string, unknown>) => options.android ?? options.default },
  Alert: {
    alert: (title: string, _body: string, buttons: Array<{ text: string; onPress?: () => void }>) => {
      alerts.push({ title, buttons });
    },
  },
}));
const statusMock = jest.fn();
const restoreMock = jest.fn();
jest.mock('../app/account_delete_restore_client', () => ({
  fetchAccountDeleteStatus: () => statusMock(),
  restoreDeletedAccount: () => restoreMock(),
}));

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

async function pressLast(choiceIndex: number): Promise<void> {
  for (let i = 0; i < 20 && alerts.length === 0; i += 1) await Promise.resolve();
  alerts[alerts.length - 1].buttons[choiceIndex].onPress?.();
}

beforeEach(() => {
  alerts.length = 0;
  statusMock.mockReset();
  restoreMock.mockReset();
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
});

afterEach(() => {
  delete (globalThis as { __DEV__?: boolean }).__DEV__;
});

describe('robot_no_cloud', () => {
  it('флаг только в dev: включается, выключается, вне dev отклоняется', () => {
    const flag = require('../app/dev_robot_no_cloud');
    flag.resetDevRobotNoCloudForTests();
    expect(flag.isDevRobotNoCloud()).toBe(false);
    expect(flag.setDevRobotNoCloud(true)).toBe(true);
    expect(flag.isDevRobotNoCloud()).toBe(true);
    delete (globalThis as { __DEV__?: boolean }).__DEV__;
    expect(flag.isDevRobotNoCloud()).toBe(false);
    expect(flag.setDevRobotNoCloud(true)).toBe(false);
    flag.resetDevRobotNoCloudForTests();
  });

  it('Приватность: при флаге выход ДО сохранения и облака; переключатели с testID', () => {
    const src = read('app/privacy_settings.tsx');
    const hook = src.indexOf('if (isDevRobotNoCloud()) {');
    expect(hook).toBeGreaterThan(0);
    expect(hook).toBeLessThan(src.indexOf("await save(val ? 'granted' : 'denied');"));
    expect(hook).toBeLessThan(src.indexOf('scheduleConsentCloudRecord(key, recordToCloud);'));
    for (const id of ['privacy-analytics-consent-switch', 'privacy-ai-explain-consent-switch', 'privacy-ai-dialog-consent-switch']) {
      expect(src).toContain(`testID="${id}"`);
    }
  });

  it('Уведомления: при флаге выход ДО сохранения, pushPrefs и разрешения; переключатели с testID', () => {
    const src = read('app/settings_notifications.tsx');
    const prefsHook = src.indexOf('noteRobotNoCloudSkip(`notif-prefs');
    expect(prefsHook).toBeGreaterThan(0);
    expect(prefsHook).toBeLessThan(src.indexOf('await saveNotifPrefs(next);'));
    const scheduleHook = src.indexOf('noteRobotNoCloudSkip(`notif-schedule');
    expect(scheduleHook).toBeGreaterThan(0);
    expect(scheduleHook).toBeLessThan(src.indexOf('await saveNotifSettings(next);'));
    expect(src).toContain('testID="notif-master-switch"');
    expect(src).toContain('switchTestID="notif-daily-switch"');
    expect((src.match(/switchTestID="notif-switch-\w+"/g) ?? []).length).toBe((src.match(/toggleCategory\('/g) ?? []).length);
  });
});

describe('restore=offer|restored', () => {
  it('restored: подставной статус, «Восстановить» → restored, сервер не вызван', async () => {
    const account = require('../app/dev_account_state');
    account.resetDevAccountStateForTests();
    expect(account.setDevAccountState({ restoreMode: 'restored' })).toBe(true);
    expect(account.getDevSignInError()).toBe('account_delete_pending');
    const { promptAccountRestoreAfterSignInRefusal } = require('../app/account_delete_restore_prompt');
    const pending = promptAccountRestoreAfterSignInRefusal('ru');
    await pressLast(1);
    await expect(pending).resolves.toBe('restored');
    expect(statusMock).not.toHaveBeenCalled();
    expect(restoreMock).not.toHaveBeenCalled();
    account.resetDevAccountStateForTests();
  });

  it('offer: «Восстановить» не восстанавливает по-настоящему (restore_failed), сервер не вызван', async () => {
    const account = require('../app/dev_account_state');
    account.resetDevAccountStateForTests();
    account.setDevAccountState({ restoreMode: 'offer' });
    const { promptAccountRestoreAfterSignInRefusal } = require('../app/account_delete_restore_prompt');
    const pending = promptAccountRestoreAfterSignInRefusal('ru');
    await pressLast(1);
    await expect(pending).resolves.toBe('restore_failed');
    expect(restoreMock).not.toHaveBeenCalled();
    account.resetDevAccountStateForTests();
  });

  it('при подмене выход и смена аккаунта отказывают (стирание недостижимо)', () => {
    const account = require('../app/dev_account_state');
    account.resetDevAccountStateForTests();
    account.setDevAccountState({ restoreMode: 'offer' });
    expect(account.getDevSignOutOutcome(false)).toMatchObject({ reason: 'sync_failed' });
    expect(account.getDevSignOutOutcome(true)).toMatchObject({ reason: 'unknown' });
    account.resetDevAccountStateForTests();
  });

  it('без подмены — настоящий путь (статус с сервера)', async () => {
    const account = require('../app/dev_account_state');
    account.resetDevAccountStateForTests();
    statusMock.mockResolvedValue({ pending: false });
    const { promptAccountRestoreAfterSignInRefusal } = require('../app/account_delete_restore_prompt');
    await expect(promptAccountRestoreAfterSignInRefusal('ru')).resolves.toBe('not_restorable');
    expect(statusMock).toHaveBeenCalledTimes(1);
  });
});

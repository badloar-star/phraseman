// зачем (координатор 12.10, R1 «нет пути», зона аккаунта): dev-состояния auth=none, switch=, logout=, delete=fail, restore=retired, plustransfer=on работают ТОЛЬКО в dev-сборке;
// хуки отказывают ДО любого побочного эффекта (замки, запись, сеть), поэтому реальный выход/удаление/вход недостижимы; в стор-сборке геттеры «выключено».
jest.mock('../app/dev_energy_tools', () => ({ devSetEnergy: jest.fn(async () => true), setDevEnergyModeOverride: jest.fn(async () => true) }));
jest.mock('../app/dev_plus_controls', () => ({ setDevLocalPlusOverride: jest.fn(async () => undefined), getDevLocalPlusStorageKey: (id: string) => `k:${id}` }));
jest.mock('../app/dev_as_free_flag', () => ({ setDevAsFreeFlag: jest.fn(async () => true) }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-1') }));
jest.mock('../app/spire_tab_flag', () => ({ setSpireTabDevOverride: jest.fn(async () => undefined) }));
jest.mock('../app/spire_gate_refresh', () => ({ forceRefreshSpireGatesNow: jest.fn(async () => ({ tab: true, config: true })) }));
const mockStorage = {
  getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined),
  multiSet: jest.fn(async () => undefined), multiRemove: jest.fn(async () => undefined), multiGet: jest.fn(async () => []),
};
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: mockStorage }));
let mockStoreRelease = false;
jest.mock('../app/config', () => ({
  ...jest.requireActual('../app/config'),
  get IS_STORE_RELEASE() { return mockStoreRelease; },
}));

/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import { applyDevState, parseDevStateParams } from '../app/dev_state_fixtures';
import {
  getDevGreetName, getDevNameCheck, getDevSignInError, isDevConfettiHold, getDevSignOutOutcome, isDevAuthNone, isDevDeleteFail, isDevPlusTransferNotice, isDevUnsavedCardsPrompt, resetDevAccountStateForTests, setDevAccountState,
} from '../app/dev_account_state';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const bodyOf = (source: string, signature: string, length = 2600): string => {
  const at = source.indexOf(signature);
  if (at < 0) throw new Error(`нет ${signature}`);
  return source.slice(at, at + length);
};

describe('dev account states', () => {
  beforeEach(() => {
    mockStoreRelease = false;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    resetDevAccountStateForTests();
    Object.values(mockStorage).forEach((fn) => fn.mockClear());
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('parses the link parameters and rejects unknown values', () => {
    const { request, rejected } = parseDevStateParams({ auth: 'none', switch: 'pending_spend', logout: 'precommit', delete: 'fail', restore: 'retired', plustransfer: 'on' });
    expect(request).toMatchObject({ auth: 'none', switch: 'pending_spend', logout: 'precommit', delete: 'fail', restore: 'retired', plustransfer: 'on' });
    expect(rejected).toEqual({});
    const bad = parseDevStateParams({ auth: 'x', switch: 'boom', logout: 'maybe', delete: 'yes', restore: 'gone', plustransfer: '1' });
    expect(Object.keys(bad.rejected).sort()).toEqual(['auth', 'delete', 'logout', 'plustransfer', 'restore', 'switch']);
  });

  it('applies the flags in a dev build and ok/off clears them', async () => {
    const applied = await applyDevState({ auth: 'none', switch: 'unsaved_cards', delete: 'fail', restore: 'retired', plustransfer: 'on' });
    expect(applied.skipped).toEqual({});
    expect([isDevAuthNone(), isDevUnsavedCardsPrompt(), isDevDeleteFail(), getDevSignInError(), isDevPlusTransferNotice()]).toEqual([true, true, true, 'identity_retired', true]);
    await applyDevState({ auth: 'ok', switch: 'ok', delete: 'ok', restore: 'ok', plustransfer: 'off' });
    expect([isDevAuthNone(), isDevUnsavedCardsPrompt(), isDevDeleteFail(), getDevSignInError(), isDevPlusTransferNotice(), getDevSignOutOutcome(false)]).toEqual([false, false, false, null, false, null]);
    expect(mockStorage.multiSet).not.toHaveBeenCalled(); // всё только в памяти
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it('passes the greeting name through with its case, trimmed to 24 characters, and clears it on empty', async () => {
    expect(parseDevStateParams({ greet: 'Aleksandrovich-Konstantinopolskiy-Long' }).request.greet).toBe('Aleksandrovich-Konstanti');
    expect(parseDevStateParams({ greet: '  Alex ' }).request.greet).toBe('Alex');
    await applyDevState({ greet: 'Alex' });
    expect(getDevGreetName()).toBe('Alex');
    await applyDevState({ greet: '' });
    expect(getDevGreetName()).toBeNull();
    mockStoreRelease = true;
    expect(setDevAccountState({ greetName: 'Alex' })).toBe(false);
    mockStoreRelease = false;
    setDevAccountState({ greetName: 'Alex' });
    mockStoreRelease = true;
    expect(getDevGreetName()).toBeNull(); // в стор-сборке имя не отдаётся, даже если уже стояло
  });

  // зачем (координатор 12.10): конфетти онбординга замирает на пике для кадров onboarding-019/020/021 — только dev, только память.
  it('holds the onboarding confetti only in a dev build and off clears it', async () => {
    expect(parseDevStateParams({ confetti: 'hold' }).request.confetti).toBe('hold');
    await applyDevState({ confetti: 'hold' });
    expect(isDevConfettiHold()).toBe(true);
    await applyDevState({ confetti: 'off' });
    expect(isDevConfettiHold()).toBe(false);
    setDevAccountState({ confettiHold: true });
    mockStoreRelease = true;
    expect(isDevConfettiHold()).toBe(false);
  });

  it('refuses both the plain and the forced sign-out so real wiping is unreachable', () => {
    setDevAccountState({ logoutMode: 'fail' });
    expect(getDevSignOutOutcome(false)).toMatchObject({ reason: 'wipe_failed', delayMs: 0 });
    expect(getDevSignOutOutcome(true)).toMatchObject({ reason: 'wipe_failed' });
    setDevAccountState({ logoutMode: 'precommit' });
    expect(getDevSignOutOutcome(false)).toMatchObject({ reason: 'sync_failed' });
    setDevAccountState({ logoutMode: null });
    for (const [mode, first] of [['pending_spend', 'pending_shard_spend'], ['quarantine', 'shard_queue_quarantined'], ['guard', 'sync_failed'], ['unsaved_cards', 'sync_failed'], ['slow', 'sync_failed']] as const) {
      setDevAccountState({ switchMode: mode });
      expect(getDevSignOutOutcome(false)?.reason).toBe(first);
      expect(getDevSignOutOutcome(true)).toMatchObject({ reason: 'unknown', detail: 'dev_guard' }); // форсированная смена: защитная проверка
    }
    setDevAccountState({ switchMode: 'slow' });
    expect(getDevSignOutOutcome(false)?.delayMs).toBeGreaterThan(45_000);
    setDevAccountState({ switchMode: 'not_uploaded' });
    expect(getDevSignInError()).toBe('local_progress_not_uploaded'); // экран — ошибка ВХОДА…
    expect(getDevSignOutOutcome(false)?.reason).toBe('sync_failed'); // …но выход при этом тоже отказывает: настоящее стирание недостижимо
    expect(getDevSignOutOutcome(true)?.reason).toBe('unknown');
    setDevAccountState({ switchMode: 'backup_blocked' });
    expect(getDevSignInError()).toBe('local_progress_backup_blocked');
    expect(getDevSignOutOutcome(false)?.reason).toBe('sync_failed');
    setDevAccountState({ switchMode: null, restoreRetired: true });
    expect(getDevSignInError()).toBe('identity_retired');
    expect(getDevSignOutOutcome(false)?.reason).toBe('sync_failed'); // restore=retired тоже защищает выход (ревью R-1)
  });

  it('refuses sign-out under every account-zone flag, and latches forced refusal after the first dev refusal', () => {
    for (const patch of [{ authNone: true }, { restoreRetired: true }, { deleteFail: true }, { plusTransfer: true }] as const) {
      resetDevAccountStateForTests();
      setDevAccountState(patch);
      expect(getDevSignOutOutcome(false)?.reason).toBe('sync_failed'); // ревью R-1: «Сменить» при таком флаге не стирает
      expect(getDevSignOutOutcome(true)?.reason).toBe('unknown');
    }
    resetDevAccountStateForTests();
    expect(getDevSignOutOutcome(false)).toBeNull(); // без флагов — настоящее поведение
    expect(getDevSignOutOutcome(true)).toBeNull();
    setDevAccountState({ switchMode: 'guard' });
    expect(getDevSignOutOutcome(false)?.reason).toBe('sync_failed');
    setDevAccountState({ switchMode: null }); // switch=ok при открытом окне
    expect(getDevSignOutOutcome(false)).toBeNull(); // обычный выход вернулся к настоящему…
    expect(getDevSignOutOutcome(true)).toMatchObject({ reason: 'unknown', detail: 'dev_guard_latched' }); // …но форсированный стирающий — нет (R-2)
  });

  it('does nothing in a store build', async () => {
    mockStoreRelease = true;
    expect(getDevSignOutOutcome(true)).toBeNull();
    expect(setDevAccountState({ authNone: true, switchMode: 'guard', logoutMode: 'fail', deleteFail: true, restoreRetired: true, plusTransfer: true })).toBe(false);
    expect((await applyDevState({ auth: 'none', delete: 'fail' })).skipped).toEqual({ all: 'not_dev_build' });
    mockStoreRelease = false;
    setDevAccountState({ authNone: true, switchMode: 'guard', logoutMode: 'fail', deleteFail: true, restoreRetired: true, plusTransfer: true });
    mockStoreRelease = true; // даже если флаг уже стоял — в стор-сборке геттеры его гасят
    expect([isDevAuthNone(), getDevSignOutOutcome(false), getDevSignOutOutcome(true), getDevSignInError(), isDevDeleteFail(), isDevPlusTransferNotice(), isDevUnsavedCardsPrompt()])
      .toEqual([false, null, null, null, false, false, false]);
  });

  it('places the hooks BEFORE any side effect', () => {
    const auth = read('app/auth_provider.ts');
    const signOut = bodyOf(auth, 'export async function signOutAndWipeForAccountSwitch(');
    expect(signOut.indexOf('getDevSignOutOutcome(')).toBeGreaterThan(-1);
    expect(signOut.indexOf('getDevSignOutOutcome(')).toBeLessThan(signOut.indexOf('reserveCleanInstallRecoveryAccountTransition'));
    const signIn = bodyOf(auth, 'export async function signInWithProvider(');
    expect(signIn.indexOf('getDevSignInError()')).toBeLessThan(signIn.indexOf('assertNoCleanInstallRecoveryTransition'));
    const del = bodyOf(auth, 'export async function beginAccountDeletion(');
    expect(del.indexOf('isDevDeleteFail()')).toBeGreaterThan(-1);
    expect(del.indexOf('isDevDeleteFail()')).toBeLessThan(del.indexOf('discardAccountSwitchResumeCredential'));
    expect(del.indexOf('isDevDeleteFail()')).toBeLessThan(del.indexOf('beginLocalAccountDeletionAttempt'));
    for (const fn of ['export async function isAppleSignInAvailable(', 'export function peekAppleSignInAvailability(', 'export function isGoogleSignInAvailableSync(']) {
      expect(bodyOf(auth, fn, 300)).toMatch(/isDevAuthNone\(\)/);
    }
    expect(read('app/account_switch_unsaved_cards.ts')).toMatch(/isDevUnsavedCardsPrompt\(\)/);
    expect(read('app/plus_transfer_hold.ts')).toMatch(/hasFreshStorePlusEvidenceFor\(currentStableId\) \|\| isDevPlusTransferNotice\(\)/);
  });

  // зачем (координатор 12.10, кадры settings-gap-024/025/026/031 и profile-028): ответ проверки имени и «выход выполняется» — фикстурой в памяти.
  it('answers the name check from namecheck= before the cache and the network, only in a dev build', async () => {
    const { request, rejected } = parseDevStateParams({ namecheck: 'taken' });
    expect([request.namecheck, rejected]).toEqual(['taken', {}]);
    expect(Object.keys(parseDevStateParams({ namecheck: 'free' }).rejected)).toEqual(['namecheck']);
    await applyDevState({ namecheck: 'checking' });
    expect(getDevNameCheck()).toBe('checking');
    await applyDevState({ namecheck: 'none' });
    expect(getDevNameCheck()).toBeNull();
    setDevAccountState({ nameCheck: 'error' });
    mockStoreRelease = true;
    expect(getDevNameCheck()).toBeNull();
    const modal = read('components/account/NicknameEditModal.tsx');
    expect(modal.indexOf('getDevNameCheck()')).toBeGreaterThan(-1);
    // 18.10: проверка+применение — один вызов брони по паузе; dev-подмена стоит до кэша «занято» и до вызова.
    expect(modal.indexOf('getDevNameCheck()')).toBeLessThan(modal.indexOf('takenCacheRef.current.has(normalizeNameIndexKey(trimmed))'));
    expect(modal.indexOf('getDevNameCheck()')).toBeLessThan(modal.indexOf('requestApplyRef.current(trimmed);\n    }, NAME_APPLY_DEBOUNCE_MS)'));
  });

  // зачем (координатор 12.10, auth-gap-003/012): switch=required — вход отдаёт account_switch_required до сети, выход по-прежнему отказывает.
  it('switch=required answers sign-in with account_switch_required and keeps sign-out refused', async () => {
    const { request, rejected } = parseDevStateParams({ switch: 'required' });
    expect([request.switch, rejected]).toEqual(['required', {}]);
    await applyDevState({ switch: 'required' });
    expect(getDevSignInError()).toBe('account_switch_required');
    expect(getDevSignOutOutcome(false)).toMatchObject({ reason: 'sync_failed' });
    expect(getDevSignOutOutcome(true)).toMatchObject({ reason: 'unknown', detail: 'dev_guard' });
    mockStoreRelease = true;
    expect(getDevSignInError()).toBeNull();
  });

  it('holds the sign-out stage with logout=hold and still refuses both attempts', () => {
    setDevAccountState({ logoutMode: 'hold' });
    expect(getDevSignOutOutcome(false)).toMatchObject({ reason: 'sync_failed' });
    expect(getDevSignOutOutcome(false)?.delayMs).toBeGreaterThan(60_000);
    expect(getDevSignOutOutcome(true)).toMatchObject({ reason: 'unknown', detail: 'dev_logout_hold' });
  });

  it('keeps the module free of storage, network and real account actions', () => {
    const code = read('app/dev_account_state.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/AsyncStorage|multiSet|setItem|firebase|fetch\(|signOut|deleteAccount|beginAccountDeletion/);
  });
});

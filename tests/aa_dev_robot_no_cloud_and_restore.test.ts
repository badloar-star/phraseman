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
// зачем (координатор 13.10, auth-gap-007): окно «Восстановить аккаунт?» идёт через тёмную очередь, не через Alert.
jest.mock('../app/themed_blocking_alert_queue', () => ({
  THEMED_ALERT_DISMISSED: 'dismiss',
  enqueueThemedBlockingInfoAlert: () => Promise.resolve(),
  enqueueThemedBlockingChoiceAlert: (title: string, _message: string, actions: Array<{ label: string; value: string }>) =>
    new Promise<string>((resolve) => {
      alerts.push({ title, buttons: actions.map((action) => ({ text: action.label, onPress: () => resolve(action.value) })) });
    }),
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

describe('guest=required', () => {
  it('чистая проверка: только анонимный гость без провайдеров проходит, без побочных эффектов', () => {
    const { checkDisposableGuestNow } = require('../app/dev_state_account_guard');
    expect(checkDisposableGuestNow(() => ({ isAnonymous: true, uid: 'guest123', providerData: [] })))
      .toEqual({ ok: true, uid: 'guest123', uidMasked: 'gues…(8)', isAnonymous: true });
    expect(checkDisposableGuestNow(() => ({ isAnonymous: false, uid: 'acc1', providerData: [{}] })))
      .toMatchObject({ uidMasked: 'acc1…(4)', isAnonymous: false });
    expect(checkDisposableGuestNow(() => null)).toMatchObject({ uidMasked: 'none', isAnonymous: null });
    expect(checkDisposableGuestNow(() => ({ isAnonymous: false, uid: 'acc1', providerData: [{}] }))).toMatchObject({ ok: false, reason: 'not_anonymous' });
    expect(checkDisposableGuestNow(() => ({ isAnonymous: true, uid: 'x', providerData: [{}] }))).toMatchObject({ ok: false, reason: 'linked_providers_1' });
    expect(checkDisposableGuestNow(() => null)).toMatchObject({ ok: false, reason: 'no_auth_user' });
    const guardSrc = read('app/dev_state_account_guard.ts');
    const fn = guardSrc.slice(guardSrc.indexOf('export function checkDisposableGuestNow'), guardSrc.indexOf('export type GuestCheckWithTrace'));
    expect(fn).toContain('classifyGuestUser(user)');
    expect(fn).not.toContain('markDevFixtureNoUpload');
  });

  it('applyDevState: проверка гостя стоит ДО первого шага и обрывает ссылку без перехода', () => {
    const src = read('app/dev_state_fixtures.ts');
    const start = src.indexOf('export async function applyDevState(');
    const guard = src.indexOf("if (request.guest === 'required') {", start);
    const firstStep = src.indexOf('await step(', start);
    expect(guard).toBeGreaterThan(start);
    expect(guard).toBeLessThan(firstStep);
    const block = src.slice(guard, guard + 900);
    expect(block).toContain('return { applied, skipped: { all: `guest_required_refused:${verdict.reason}` }, next: null };');
    expect(block).not.toContain('assertDisposableGuest');
    // формат координатора: маска uid и само значение isAnonymous
    expect(block).toContain('[DEV-STATE] refused guest_required uid=${verdict.uidMasked} isAnonymous=${String(verdict.isAnonymous)}');
  });
});

describe('signin=hold|offline|generic', () => {
  it('режимы дают подставной результат; вне dev — null; выход при флаге отказывает', () => {
    const account = require('../app/dev_account_state');
    account.resetDevAccountStateForTests();
    expect(account.getDevSignInStub()).toBeNull();
    account.setDevAccountState({ signIn: 'hold' });
    expect(account.getDevSignInStub()).toEqual({ mode: 'hold', delayMs: 60_000, error: null });
    account.setDevAccountState({ signIn: 'offline' });
    expect(account.getDevSignInStub()).toEqual({ mode: 'offline', delayMs: 0, error: 'dev_stub:network-request-failed' });
    account.setDevAccountState({ signIn: 'generic' });
    expect(account.getDevSignInStub()).toEqual({ mode: 'generic', delayMs: 0, error: 'dev_stub:generic' });
    expect(account.getDevSignOutOutcome(false)).toMatchObject({ reason: 'sync_failed' });
    expect(account.getDevSignOutOutcome(true)).toMatchObject({ reason: 'unknown' });
    delete (globalThis as { __DEV__?: boolean }).__DEV__;
    expect(account.getDevSignInStub()).toBeNull();
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    account.resetDevAccountStateForTests();
  });

  it('auth_provider: подмена стоит до замков и сети, с меткой [AUTH-SIGNIN] … reason=dev_state', () => {
    const src = read('app/auth_provider.ts');
    const fn = src.indexOf('export async function signInWithProvider(');
    const stub = src.indexOf('const devSignInStub = getDevSignInStub();', fn);
    expect(stub).toBeGreaterThan(fn);
    expect(stub).toBeLessThan(src.indexOf('assertNoCleanInstallRecoveryTransition()', fn));
    expect(src.slice(stub, stub + 900)).toContain('[AUTH-SIGNIN] ignored provider=${provider} reason=dev_state');
  });

  it('онбординг не дописывает код dev_stub: к тексту ошибки', () => {
    expect(read('components/CleanOnboarding.tsx')).toContain("return ENABLE_DEV_TOOLS && code && !code.startsWith('dev_stub:') ? `${human}");
  });

  it('стор-заглушка: подмены входа нет', () => {
    const stub = require('../store_release_stubs/dev_state/dev_account_state_stub');
    expect(stub.getDevSignInStub()).toBeNull();
    expect(stub.DEV_SIGNIN_MODES).toEqual([]);
  });
});

describe('delete=throw и обход ввода «УДАЛИТЬ» — только dev', () => {
  it('обход ввода слова есть ТОЛЬКО при флаге удаления и только в dev', () => {
    const account = require('../app/dev_account_state');
    account.resetDevAccountStateForTests();
    expect(account.isDevDeleteConfirmBypass()).toBe(false);
    account.setDevAccountState({ deleteThrow: true });
    expect(account.isDevDeleteThrow()).toBe(true);
    expect(account.isDevDeleteConfirmBypass()).toBe(true);
    expect(account.getDevSignOutOutcome(true)).toMatchObject({ reason: 'unknown' });
    delete (globalThis as { __DEV__?: boolean }).__DEV__;
    expect(account.isDevDeleteThrow()).toBe(false);
    expect(account.isDevDeleteConfirmBypass()).toBe(false);
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    account.resetDevAccountStateForTests();
    account.setDevAccountState({ deleteFail: true });
    expect(account.isDevDeleteConfirmBypass()).toBe(true);
    account.resetDevAccountStateForTests();
  });

  it('СТОРОЖ: в стор-сборке ввод «УДАЛИТЬ» обязателен всегда (заглушка false, другого обхода в окне нет)', () => {
    const stub = require('../store_release_stubs/dev_state/dev_account_state_stub');
    expect(stub.isDevDeleteConfirmBypass()).toBe(false);
    expect(stub.isDevDeleteThrow()).toBe(false);
    const modal = read('components/DeleteAccountConfirmModal.tsx');
    const line = modal.split(/\r?\n/).find((l) => l.includes('const deleteConfirmMatches ='));
    expect(line).toBe('  const deleteConfirmMatches = isDevDeleteConfirmBypass() || normalizeConfirm(deleteConfirmInput) === normalizeConfirm(deleteConfirmWord);');
    expect(modal.match(/isDevDeleteConfirmBypass\(\)/g)?.length).toBe(1);
  });

  it('исключение — первая проверка beginAccountDeletion, до отмены входа и замков', () => {
    const src = read('app/auth_provider.ts');
    const fn = src.indexOf('export async function beginAccountDeletion()');
    const thrown = src.indexOf("throw new Error('dev_delete_throw');", fn);
    expect(thrown).toBeGreaterThan(fn);
    expect(thrown).toBeLessThan(src.indexOf('if (isDevDeleteFail())', fn));
    expect(thrown).toBeLessThan(src.indexOf("discardAccountSwitchResumeCredential('account_delete');", fn));
  });
});

describe('account=support_only — настоящий «Выйти» только на №3', () => {
  const google = [{ providerId: 'google.com' }];
  it('проходит только Google-аккаунт «Phraseman Support»; маска без полной почты', () => {
    const { classifySupportAccount, maskEmailForLog } = require('../app/dev_state_account_guard');
    expect(classifySupportAccount({ isAnonymous: false, email: 'someone.long@gmail.com', displayName: 'Phraseman Support', providerData: google }))
      .toEqual({ ok: true, reason: 'support_account', emailMasked: 'som…@gmail.com(22)', providers: 'google.com' });
    expect(classifySupportAccount(null)).toMatchObject({ ok: false, reason: 'no_auth_user' });
    expect(classifySupportAccount({ isAnonymous: true, providerData: [] })).toMatchObject({ ok: false, reason: 'anonymous' });
    expect(classifySupportAccount({ isAnonymous: false, displayName: 'Phraseman Support', providerData: [{ providerId: 'apple.com' }] }))
      .toMatchObject({ ok: false, reason: 'not_google' });
    expect(classifySupportAccount({ isAnonymous: false, displayName: 'Owner', providerData: google }))
      .toMatchObject({ ok: false, reason: 'display_name_mismatch' });
    expect(classifySupportAccount({ isAnonymous: false, displayName: null, providerData: google }))
      .toMatchObject({ ok: false, reason: 'display_name_mismatch' });
    expect(maskEmailForLog('abcdef@x.io')).toBe('abc…@x.io(11)');
    expect(maskEmailForLog(null)).toBe('none');
    // почта и uid в коде проверки не хранятся
    const guardSrc = read('app/dev_state_account_guard.ts');
    expect(guardSrc).not.toMatch(/[A-Za-z0-9._%+-]+@(gmail|googlemail)\.com/);
  });

  it('applyDevState: проверка №3 стоит до первого шага и обрывает ссылку без перехода', () => {
    const src = read('app/dev_state_fixtures.ts');
    const start = src.indexOf('export async function applyDevState(');
    const guard = src.indexOf("if (request.account === 'support_only') {", start);
    expect(guard).toBeGreaterThan(start);
    expect(guard).toBeLessThan(src.indexOf('await step(', start));
    expect(src.slice(guard, guard + 900)).toContain('return { applied, skipped: { all: `account_support_only_refused:${support.reason}` }, next: null };');
  });
});

describe('onboarding-005 и 029: подмены без входа и без сохранений', () => {
  it('signin=unknown → created_new с вымышленной почтой, без сети; вне dev — нет', () => {
    const account = require('../app/dev_account_state');
    account.resetDevAccountStateForTests();
    account.setDevAccountState({ signIn: 'unknown' });
    const stub = account.getDevSignInStub();
    expect(stub).toMatchObject({ mode: 'unknown', error: null, createdNew: { email: 'alex.demo@example.com', displayName: 'Alex Demo' } });
    expect(stub.createdNew.email.endsWith('@example.com')).toBe(true);
    delete (globalThis as { __DEV__?: boolean }).__DEV__;
    expect(account.getDevSignInStub()).toBeNull();
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    account.resetDevAccountStateForTests();
    const auth = read('app/auth_provider.ts');
    expect(auth).toContain("? { result: 'created_new', email: devSignInStub.createdNew.email, displayName: devSignInStub.createdNew.displayName }");
  });

  it('language_welcome devStep=done — только dev, сразу экран «готово» без сохранений', () => {
    const src = read('app/language_welcome.tsx');
    expect(src).toContain("const devDonePreview = typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE && devStepRaw === 'done';");
    expect(src).toContain("useState<WelcomeStep>(devDonePreview ? 'done' : 'welcome')");
    // сохранения языка — только в activateLanguage (по кнопке «Начать»), devStep их не вызывает
    const activate = src.indexOf('const activateLanguage = useCallback(');
    expect(src.indexOf('saveLanguageProfile(target')).toBeGreaterThan(activate);
    expect(src.slice(0, activate)).not.toMatch(/devDonePreview[^\n]*(saveLanguageProfile|applyStudyLanguageSelection)/);
  });
});

/**
 * Релизный пол 10.10 (решения координатора): правда в окне удаления; окно
 * «аккаунт удалён навсегда» вместо молчаливого закрытия; подтверждение смены
 * аккаунта в онбординге; тихий спиннер, пока данные догружаются после входа.
 */
import fs from 'fs';
import path from 'path';
// зачем (15.10, красный HEAD): рабочая копия в CRLF — вырезки до закрывающей скобки функции были пустыми; читаем исходники с нормализованными концами строк
import { normalizeEol } from './helpers/read_source';

const queued: Array<{ title: string; message: string; actions: Array<{ label: string; value: string; ghost?: boolean }> }> = [];
let nextChoice = 'switch';
let choiceQueue: string[] = [];
jest.mock('../app/themed_blocking_alert_queue', () => ({
  THEMED_ALERT_DISMISSED: 'dismiss',
  enqueueThemedBlockingInfoAlert: (title: string, message: string, ok: string) => {
    queued.push({ title, message, actions: [{ label: ok, value: 'ok' }] });
    return Promise.resolve();
  },
  enqueueThemedBlockingChoiceAlert: (title: string, message: string, actions: Array<{ label: string; value: string; ghost?: boolean }>) => {
    queued.push({ title, message, actions });
    return Promise.resolve(choiceQueue.length ? choiceQueue.shift() : nextChoice);
  },
}));
const signOutMock = jest.fn();
jest.mock('../app/auth_provider', () => ({ signOutAndWipeForAccountSwitch: (...args: unknown[]) => signOutMock(...args) }));
jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Alert: { alert: jest.fn() },
}));
const cardsDecisionMock = jest.fn();
jest.mock('../app/account_switch_unsaved_cards', () => ({ readAccountSwitchUnsavedCardsDecision: () => cardsDecisionMock() }));
jest.mock('../app/account_delete_restore_client', () => ({
  fetchAccountDeleteStatus: jest.fn(),
  restoreDeletedAccount: jest.fn(),
}));

import { noticeAccountDeletedForever } from '../app/account_delete_restore_prompt';
import { confirmAndSwitchAccountInOnboarding, onboardingAccountSwitchFailureText } from '../app/onboarding_account_switch_confirm';
import {
  __resetCloudProfileRefreshForTests,
  beginCloudProfileRefresh,
  isCloudProfileRefreshing,
} from '../app/cloud_profile_refresh_state';

const root = path.join(__dirname, '..');
const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(root, rel), 'utf8'));

beforeEach(() => {
  queued.length = 0;
  nextChoice = 'switch';
  choiceQueue = [];
  signOutMock.mockReset();
  cardsDecisionMock.mockReset();
  cardsDecisionMock.mockResolvedValue({ kind: 'proceed' });
  __resetCloudProfileRefreshForTests();
});

describe('окно удаления говорит правду о 14 днях', () => {
  it('нет «периода восстановления нет», есть 14 дней и «войди снова»', () => {
    const modal = read('components/DeleteAccountConfirmModal.tsx');
    expect(modal).not.toMatch(/периода восстановления нет|no recovery period/);
    expect(modal).toContain("ru: 'Аккаунт удалится через 14 дней. Если передумаешь — просто войди снова тем же способом. Подписка в App Store или Google Play не отменится автоматически.'");
    expect(read('functions/src/account_delete_grace.ts')).toContain('14 * 24 * 60 * 60 * 1000');
  });

  it('гостю (без входа через Google/Apple) — не обещаем «войди снова», ему некуда входить', () => {
    const modal = read('components/DeleteAccountConfirmModal.tsx');
    expect(modal).toContain('peekLinkedAuthFromCurrentUser() !== null');
    expect(modal).toContain('{hasProviderSignIn ? L(');
    expect(modal).toContain("ru: 'Прогресс удалится безвозвратно. Подписка в App Store или Google Play не отменится автоматически.'");
  });
});

describe('окончательно удалённый аккаунт — окно, а не тишина', () => {
  it('инфо-окно очереди с понятным текстом', () => {
    noticeAccountDeletedForever('ru', 'test');
    expect(queued).toHaveLength(1);
    expect(queued[0].title).toBe('Аккаунт удалён');
    expect(queued[0].message).toBe('Этот аккаунт удалён безвозвратно. Войди другим способом или начни заново.');
  });

  it('окно входа и оба пути онбординга зовут его на identity_retired', () => {
    const modal = read('components/RegistrationPromptModal.tsx');
    const at = modal.indexOf("result.error === 'identity_retired'");
    expect(modal.slice(at, at + 400)).toContain("noticeAccountDeletedForever(lang, 'registration_modal')");
    const onboarding = read('components/CleanOnboarding.tsx');
    expect(onboarding.match(/noticeAccountDeletedForever\(lang, 'onboarding'\)/g)).toHaveLength(2);
  });
});

describe('смена аккаунта в онбординге — с кнопкой подтверждения', () => {
  it('окно выбора: «Отмена» (ghost) и действие смены; согласие — та же смена, что в Настройках', async () => {
    signOutMock.mockResolvedValue({ ok: true, synced: true });
    await expect(confirmAndSwitchAccountInOnboarding('ru')).resolves.toEqual({ kind: 'switched' });
    expect(queued[0].actions.map((a) => [a.value, a.ghost === true])).toEqual([['cancel', true], ['switch', false]]);
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('отмена — ничего не стирает', async () => {
    nextChoice = 'cancel';
    await expect(confirmAndSwitchAccountInOnboarding('ru')).resolves.toEqual({ kind: 'cancelled' });
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('сбой смены без развилки — причина наружу, не «успех»', async () => {
    signOutMock.mockResolvedValue({ ok: false, reason: 'clean_recovery_transition_active' });
    await expect(confirmAndSwitchAccountInOnboarding('ru')).resolves.toEqual({ kind: 'failed', reason: 'clean_recovery_transition_active' });
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it.each(['sync_failed', 'pending_shard_spend', 'shard_queue_quarantined'])('%s → «Остаться здесь» ничего не стирает', async (reason) => {
    signOutMock.mockResolvedValue({ ok: false, reason });
    choiceQueue = ['switch', 'stay'];
    await expect(confirmAndSwitchAccountInOnboarding('ru')).resolves.toEqual({ kind: 'cancelled' });
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(queued[1].actions.map((a) => [a.value, a.ghost === true])).toEqual([['stay', true], ['force', false]]);
    expect(queued[1].message).toContain('исчезнет с этого телефона');
  });

  it('«Сменить без сохранения» — та же смена с разрешением стереть без синхронизации, как в Настройках', async () => {
    signOutMock.mockResolvedValueOnce({ ok: false, reason: 'pending_shard_spend' }).mockResolvedValueOnce({ ok: true, synced: false });
    choiceQueue = ['switch', 'force'];
    await expect(confirmAndSwitchAccountInOnboarding('ru')).resolves.toEqual({ kind: 'switched' });
    expect(signOutMock).toHaveBeenCalledTimes(2);
    // (а) координатор 12.10: первая попытка — с потолком облака 3 с и правом стирать после аварийной копии (без окна «Сменить без сохранения»).
    expect(signOutMock.mock.calls[0]).toEqual([{ syncDeadlineMs: 3000, allowWipeWithoutSync: true }]);
    expect(signOutMock.mock.calls[1]).toEqual([{ allowWipeWithoutSync: true, allowPendingShardSpendDiscard: true }]);
  });

  it('несохранённые карточки — отдельное предупреждение; «Остаться здесь» ничего не стирает', async () => {
    signOutMock.mockResolvedValue({ ok: false, reason: 'sync_failed' });
    cardsDecisionMock.mockResolvedValue({ kind: 'confirm_unsaved_cards', reason: 'pages_locked' });
    choiceQueue = ['switch', 'force', 'stay'];
    await expect(confirmAndSwitchAccountInOnboarding('ru')).resolves.toEqual({ kind: 'cancelled' });
    expect(queued[2].title).toBe('Несохранённые карточки будут удалены с этого телефона');
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('оба пути онбординга обрабатывают account_switch_required до общей ошибки', () => {
    const onboarding = read('components/CleanOnboarding.tsx');
    // 12.10: + крючки «ждём решения» (под окном нет спиннера и плашки «вход выполняется»).
    expect(onboarding.match(/await confirmAndSwitchAccountInOnboarding\(lang, switchDecisionHooks\)/g)).toHaveLength(2);
    // §AUTH-0110 п.3: текст ошибки строится на языке момента показа (uiLang), а не на языке момента ошибки.
    expect(onboarding.match(/onboardingAccountSwitchFailureText\(uiLang, switched\.reason\)/g)).toHaveLength(2);
  });

  it('после смены вход продолжается сам тем же пропуском; без пропуска — прежний текст (шаг 3, прогон 11.10)', () => {
    const onboarding = read('components/CleanOnboarding.tsx');
    // Оба пути: после switched — продолжение входа, а не сразу «Войди ещё раз».
    expect(onboarding.match(/await withOnboardingAuthSlowNotice\(resumeSignInAfterAccountSwitch\(provider\), \(\) => setAuthSlow\(true\)\)/g)).toHaveLength(2);
    expect(onboarding.match(/if \(!resumed\) \{[\s\S]{0,400}?setAuthError\(\(uiLang\) => onboardingSwitchedSignInAgainText\(uiLang\)\);/g)).toHaveLength(2);
    expect(onboarding.match(/result = resumed;/g)).toHaveLength(2);
    // Поздний ответ после ухода «Позже»/«Назад» не рисует текст поверх чужого шага.
    expect(onboarding.match(/settleLateOnboardingAuthResult\(provider, resumed\?\.result \?\? 'error', attempt\)/g)).toHaveLength(2);
    // Смена не состоялась — пропуск стирается сразу.
    expect(onboarding.match(/discardAccountSwitchResumeCredential\('switch_cancelled'\)/g)).toHaveLength(2);
    expect(onboarding.match(/discardAccountSwitchResumeCredential\('switch_failed'\)/g)).toHaveLength(2);
    // Прежний текст сохранён дословно как запасной путь.
    expect(onboarding).toContain("ru: 'Аккаунт сменён. Войди ещё раз нужным способом.'");
    // Ревью L-1: пропуск сохраняет только онбординг (явный флаг), окно входа — нет.
    expect(onboarding.match(/signInWithProvider\(provider, \{ captureAccountSwitchResume: true \}\)/g)).toHaveLength(2);
    expect(read('components/RegistrationPromptModal.tsx')).not.toContain('captureAccountSwitchResume');
    // Ревью L-2: брошенная попытка не входит за человека и сжигает пропуск.
    // 2 — перед продолжением входа в обоих путях, 1 — в settleLateOnboardingAuthResult (любой поздний ответ).
    expect(onboarding.match(/discardAccountSwitchResumeCredential\('attempt_stale'\)/g)).toHaveLength(3);
    const settle = onboarding.slice(onboarding.indexOf('const settleLateOnboardingAuthResult = useCallback('));
    expect(settle.indexOf("discardAccountSwitchResumeCredential('attempt_stale');")).toBeLessThan(settle.indexOf('decideLateOnboardingAuthResult('));
    expect(onboarding.match(/onboarding resume skipped provider=\$\{provider\} source=(existing_account|privacy) reason=attempt_stale/g)).toHaveLength(2);
    for (const source of ['existing_account', 'privacy']) {
      const skip = onboarding.indexOf(`onboarding resume skipped provider=\${provider} source=${source}`);
      const resume = onboarding.indexOf('resumeSignInAfterAccountSwitch(provider)', skip);
      expect(skip).toBeGreaterThan(0);
      expect(resume).toBeGreaterThan(skip);
    }
    // Ревью L-4: упавший обработчик сжигает пропуск.
    expect(onboarding.match(/discardAccountSwitchResumeCredential\('handler_threw'\)/g)).toHaveLength(2);
    // Ревью M-2: смена обрабатывается ПЕРВОЙ, ответ входа после смены проходит через окна
    // «удалён навсегда» / «вернуть аккаунт», как ответ первого входа.
    for (const marker of ['source=existing_account result=${resumed.result}', 'source=privacy result=${resumed.result}']) {
      const continued = onboarding.indexOf(marker);
      expect(continued).toBeGreaterThan(0);
      expect(onboarding.indexOf("result.error === 'identity_retired'", continued)).toBeGreaterThan(continued);
      // аудит Optimistic UI 12.10: онбординг получает исход восстановления (restore_failed — свой текст).
      expect(onboarding.indexOf("const restoreOutcome = result.error === 'account_delete_pending' ? await offerAccountRestore(lang, switchDecisionHooks) : null;", continued)).toBeGreaterThan(continued); // №23 (13.10): окно восстановления прячет спиннер/плашку теми же крючками, что окно смены
    }

    const auth = read('app/auth_provider.ts');
    // Пропуск — только память процесса: ни AsyncStorage, ни SecureStore, ни журнал с токеном.
    const stashStart = auth.indexOf('const ACCOUNT_SWITCH_RESUME_CREDENTIAL_TTL_MS');
    const stashEnd = auth.indexOf('function takeAccountSwitchResumeCredential', stashStart);
    const stash = auth.slice(stashStart, auth.indexOf('\n}\n', stashEnd) + 2);
    expect(stashStart).toBeGreaterThan(0);
    expect(stash).toContain('10 * 60_000');
    expect(stash).not.toMatch(/AsyncStorage|SecureStore|setItem|idToken|appleNonce|email/);
    // Apple пропуск не переносит: одноразовый nonce.
    expect(stash).toContain("if (provider !== 'google')");
    // Ревью L-1: сохранение только по флагу; обычный выход и удаление стирают пропуск,
    // а выход внутри самой смены — нет.
    expect(auth).toContain('} else if (options.captureAccountSwitchResume) {');
    expect(auth).toContain("discardAccountSwitchResumeCredential('provider_sign_out');");
    expect(auth).toContain("discardAccountSwitchResumeCredential('account_delete');");
    // зачем (15.10, 414bb1713 Ядра): выход внутри смены по-прежнему сохраняет пропуск, но перед ним теперь снимается push-токен A
    // (LOGOUT_WIPE_AUDIT, приватность). Проверяем смысл: в signOut смены — сначала снятие push, затем выход с сохранением пропуска.
    const switchSignOut = auth.slice(auth.indexOf('    signOut: async (): Promise<void> => {'), auth.indexOf('    wipeLocalData: async (): Promise<void> =>'));
    expect(switchSignOut.indexOf('await clearAccountPushBeforeSwitchSignOut();')).toBeGreaterThan(0);
    expect(switchSignOut.indexOf('await signOutCurrentProviderKeepingSwitchResume();')).toBeGreaterThan(switchSignOut.indexOf('await clearAccountPushBeforeSwitchSignOut();'));
    // Ревью L-3/M-2: пропуск сгорает при любом исходе продолжения; две ошибки идут как есть.
    const resume = auth.slice(auth.indexOf('export async function resumeSignInAfterAccountSwitch('));
    const settled = resume.indexOf("discardAccountSwitchResumeCredential('resume_settled');");
    expect(settled).toBeGreaterThan(0);
    expect(settled).toBeLessThan(resume.indexOf("if (result.result === 'error' && isResumePassthroughError(result.error))"));
    expect(auth).toContain("const RESUME_PASSTHROUGH_ERRORS = ['identity_retired', 'account_delete_pending'] as const;");
  });

  it('сбой смены — причина простыми словами, не повтор «подтверди смену»', () => {
    expect(onboardingAccountSwitchFailureText('ru', 'sync_failed')).toContain('Проверь интернет');
    expect(onboardingAccountSwitchFailureText('ru', 'pending_shard_spend')).toContain('через минуту');
    expect(onboardingAccountSwitchFailureText('ru', 'whatever')).toBe('Не получилось сменить аккаунт. Прогресс на месте — попробуй ещё раз.');
  });

  it('сбой копии и сбой после маркера — правда, а не «Прогресс на месте» (решение 06:20 п.5)', () => {
    expect(onboardingAccountSwitchFailureText('ru', 'backup_failed')).toContain('Ничего не удалено');
    expect(onboardingAccountSwitchFailureText('ru', 'backup_failed')).not.toContain('на месте');
    for (const reason of ['recovery_required', 'wipe_failed']) {
      const text = onboardingAccountSwitchFailureText('ru', reason);
      expect(text).toContain('Перезапусти приложение');
      expect(text).not.toContain('на месте');
    }
    for (const lang of ['uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      expect(onboardingAccountSwitchFailureText(lang, 'backup_failed')).not.toBe(onboardingAccountSwitchFailureText('ru', 'backup_failed'));
      expect(onboardingAccountSwitchFailureText(lang, 'recovery_required')).not.toBe(onboardingAccountSwitchFailureText('ru', 'recovery_required'));
    }
    const source = normalizeEol(fs.readFileSync(path.join(__dirname, '../app/onboarding_account_switch_confirm.ts'), 'utf8'));
    expect(source).not.toMatch(/switch_threw reason=\$\{[^}]*\.message/);
    expect(source).toContain('identityErrorCode(error)');
  });
});

describe('удаление гостя: шаг закрытия хранилища не упирается в 1 с (живой прогон 10.10)', () => {
  it('свой потолок 2,5 с; вместе с ожиданием писателей помещается в общий потолок стирания 5 с', () => {
    const auth = read('app/auth_provider.ts');
    const num = (name: string) => Number((auth.match(new RegExp(`const ${name} = ([0-9_]+);`)) ?? [])[1]?.replace(/_/g, ''));
    const retire = num('ACCOUNT_DELETE_PHONE_STATE_RETIRE_TIMEOUT_MS');
    expect(retire).toBe(2500);
    expect(num('ACCOUNT_TRANSITION_DRAIN_TIMEOUT_MS') + retire).toBeLessThan(num('ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS'));
    const fn = auth.slice(auth.indexOf('async function retirePhoneStateForDeletion('), auth.indexOf('async function retirePhoneStateThenWipe('));
    expect(fn).toContain('withLocalStepDeadline(() => flight!, false, ACCOUNT_DELETE_PHONE_STATE_RETIRE_TIMEOUT_MS)');
    expect(fn).toContain('phone_state_retire_deadline_or_fail_after_ms=');
  });
});

describe('Optimistic UI: вход в онбординге не запускается дважды', () => {
  it('оба обработчика входа держат синхронную ссылку и снимают её в finally', () => {
    const onboarding = read('components/CleanOnboarding.tsx');
    expect(onboarding).toContain('const authInFlightRef = useRef(false);');
    expect(onboarding.match(/if \(authLoading \|\| authInFlightRef\.current\) \{/g)).toHaveLength(2);
    expect(onboarding.match(/authInFlightRef\.current = true;/g)).toHaveLength(2);
    expect(onboarding.match(/\} finally \{\r?\n\s+authInFlightRef\.current = false;/g)).toHaveLength(2);
  });
});

describe('тихий спиннер догрузки после входа', () => {
  it('флаг включается на время догрузки и гаснет; повторное завершение безвредно', () => {
    const endA = beginCloudProfileRefresh('a');
    const endB = beginCloudProfileRefresh('b');
    expect(isCloudProfileRefreshing()).toBe(true);
    endA();
    endA();
    expect(isCloudProfileRefreshing()).toBe(true);
    endB();
    expect(isCloudProfileRefreshing()).toBe(false);
  });

  it('страховка гасит зависшую догрузку', () => {
    jest.useFakeTimers();
    beginCloudProfileRefresh('stuck');
    expect(isCloudProfileRefreshing()).toBe(true);
    jest.advanceTimersByTime(30_000);
    expect(isCloudProfileRefreshing()).toBe(false);
    jest.useRealTimers();
  });

  it('вход включает флаг и гасит его на любом исходе догрузки; шапка Главной показывает KitSpinner', () => {
    const auth = read('app/auth_provider.ts');
    const at = auth.indexOf('function scheduleSameStablePostAuthRefresh(');
    const body = auth.slice(at, auth.indexOf('async function markOnboardedAfterSignIn', at));
    expect(body).toContain('const endCloudRefresh = beginCloudProfileRefresh(stage);');
    expect(body).toContain('}).finally(endCloudRefresh);');
    const header = read('components/home/v2/HomeV2Header.tsx');
    expect(header).toContain('{refreshing ? <KitSpinner');
    expect(read('app/(tabs)/home.tsx')).toContain('refreshing={cloudProfileRefreshing}');
  });
});

// зачем (координатор 18.10 07:10, вариант А): после выхода/смены аккаунта при следующем запуске — ТОЛЬКО экран согласия
// онбординга (Условия + аналитика + возраст), остальной онбординг не повторяется. Условия принимает сам человек,
// аналитика выключена до его выбора. Решение показа — по метке выхода, в журнал [CONSENT-REGATE].
import fs from 'node:fs';
import path from 'node:path';

jest.mock('../app/user_id_policy', () => ({
  clearArenaAuthUidCache: jest.fn(),
  getAuthUserId: jest.fn(() => null),
  getCanonicalUserId: jest.fn(async () => 'stable-a'),
}));

// eslint-disable-next-line import/first
import { ACCOUNT_TRANSITION_MARKER_KEYS, CONSENT_REGATE_PENDING_KEY, resolveConsentRegate } from '../app/device_onboarding_marks';
// eslint-disable-next-line import/first
import { accountOwnedStorageKeysFrom, SYNC_KEYS } from '../app/cloud_sync';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('решение показа экрана согласия на старте', () => {
  it('показ только при пройденном онбординге, метке выхода и непринятых Условиях', () => {
    expect(resolveConsentRegate('1', null, '1')).toEqual({ show: true, reason: 'pending_after_signout' });
    expect(resolveConsentRegate('1', '1', '1')).toEqual({ show: false, reason: 'legal_already_accepted' });
    // старый пользователь без ключа Условий (вход «уже есть аккаунт») и без метки выхода — экран не тревожит
    expect(resolveConsentRegate('1', null, null)).toEqual({ show: false, reason: 'no_pending_mark' });
    // онбординг не пройден — идёт полный онбординг, согласие спросит он сам
    expect(resolveConsentRegate(null, null, '1')).toEqual({ show: false, reason: 'onboarding_not_done' });
  });

  it('метка выхода — ключ устройства: не синхронизируется и не входит в опись аккаунта', () => {
    expect(SYNC_KEYS).not.toContain(CONSENT_REGATE_PENDING_KEY);
    expect(accountOwnedStorageKeysFrom([CONSENT_REGATE_PENDING_KEY])).not.toContain(CONSENT_REGATE_PENDING_KEY);
  });
});

describe('проводка экрана согласия', () => {
  const layout = read('app/_layout.tsx');
  const onboarding = read('components/CleanOnboarding.tsx');

  it('старт: решение по метке и ключу Условий, значения в журнале, онбординг в режиме consentOnly', () => {
    expect(layout).toContain('resolveConsentRegate(val, legalRaw, pendingRaw)');
    expect(layout).toContain('[CONSENT-REGATE] boot show=${consentRegate.show} reason=${consentRegate.reason}');
    expect(layout).toContain('setShow(willShowOnboarding || consentRegate.show);');
    expect(layout).toContain('consentOnly={onboardingConsentOnly}');
    expect(layout).toContain('onDone={onboardingConsentOnly ? handleConsentRegateDone : handleOnboardingDone}');
  });

  it('выход A → вход B без перезапуска: подписка корня на событие осталась (старые метки), но выход его больше не шлёт', () => {
    const cloudSync = read('app/cloud_sync.ts');
    // зачем (решение координатора 18.10, прогон Сверки №2): выход/смена согласия не сбрасывают — экран согласия не открывается.
    expect(cloudSync).not.toContain("emitAppEvent('consent_regate_requested'");
    expect(cloudSync).toContain("reason: keepConsents ? 'handoff_rollback_same_person' : 'owner_rule_keep_on_signout'");
    // 18.10: проверка вынесена в check() над подпиской (отложенный показ во время смены аккаунта)
    const handler = layout.slice(layout.indexOf('const check = (source: string, attempt: number): void => {'), layout.indexOf('const handleOnboardingIntroFullAccessStart'));
    expect(handler).toContain("onAppEvent('consent_regate_requested'");
    expect(handler).toContain("resolveConsentRegate('1', legalRaw, pendingRaw)");
    expect(handler).toContain('[CONSENT-REGATE] event source=${source} show=${decision.show} reason=${decision.reason}');
    expect(handler).toMatch(/if \(!decision\.show\) return;\s*onboardingDoneHandledRef\.current = false;[\s\S]*setOnboardingConsentOnly\(true\);\s*setShow\(true\);/);
    expect(handler).toContain('reason=onboarding_already_shown');
  });

  it('смена A→B через карантин: пока идёт смена или вход провайдера — показ откладывается, причина в журнале', () => {
    const handler = layout.slice(layout.indexOf('const check = (source: string, attempt: number): void => {'), layout.indexOf('const handleOnboardingIntroFullAccessStart'));
    expect(handler).toContain('...ACCOUNT_TRANSITION_MARKER_KEYS]');
    expect(handler).toMatch(/if \(activeTransition\.length > 0\) \{[\s\S]*deferred reason=account_transition_active[\s\S]*setTimeout\(\(\) => check\(source, attempt \+ 1\), CONSENT_REGATE_DEFER_STEP_MS\);\s*return;/);
    expect(handler).toContain('deferred_gave_up');
    // показ — только после проверки, что смены нет
    expect(handler.indexOf('activeTransition.length > 0')).toBeLessThan(handler.indexOf('setShow(true)'));
  });

  it('имена ключей смены совпадают с модулем карантина (сторож дрейфа)', () => {
    const quarantine = read('app/account_switch_quarantine.ts');
    expect(quarantine).toContain("export const ACCOUNT_SWITCH_QUARANTINE_KEY = 'account_switch_quarantine_v1';");
    expect(quarantine).toContain("export const ACCOUNT_PROVIDER_HANDOFF_KEY = 'account_provider_handoff_v1';");
    expect(ACCOUNT_TRANSITION_MARKER_KEYS).toEqual(['account_switch_quarantine_v1', 'account_provider_handoff_v1']);
  });

  it('завершение согласия не запускает сценарий нового ученика (пуши, бонус, приветствие)', () => {
    const fn = layout.slice(layout.indexOf('const handleConsentRegateDone = useCallback('), layout.indexOf('const handleOnboardingIntroFullAccessStart'));
    expect(fn).toContain('setShow(false)');
    expect(fn).not.toMatch(/requestNotificationPermission|startIntroFullAccessAfterOnboarding|pm\.app\.welcome|router\.replace/);
  });

  it('онбординг: сразу шаг согласия, без стрелки назад, без восстановления шага и метрики воронки', () => {
    expect(onboarding).toContain("useState<CleanOnboardingStep>(startAtNameStep || consentOnly ? 'name' : 'welcome')");
    expect(onboarding).toContain('onBack={consentOnly ? undefined : back}');
    expect(onboarding).toMatch(/if \(consentOnly\) \{\s*\/\/[^\n]*\n\s*console\.log\('\[CONSENT-REGATE\] onboarding mounted/);
    expect(onboarding).toMatch(/if \(consentOnly\) return;\s*void recordOnboardingFunnelStart\(\);/);
    expect(onboarding).toContain('void (consentOnly ? finishConsentOnly() : finish());');
  });

  it('«Продолжить»: Условия принимает сам человек, аналитика — по его галочке (по умолчанию снята), метка снимается', () => {
    expect(onboarding).toContain('const [analyticsAllowed, setAnalyticsAllowed] = useState(false);');
    const fn = onboarding.slice(onboarding.indexOf('const finishConsentOnly = useCallback('), onboarding.indexOf('const finish = useCallback('));
    expect(fn).toContain("if (ageAnswer !== 'yes')");
    expect(fn).toContain('[LEGAL_ACCEPTED_KEY, \'1\']');
    expect(fn).toContain("const analyticsChoice = analyticsAllowed ? 'granted' : 'denied';");
    expect(fn).toContain('AsyncStorage.removeItem(CONSENT_REGATE_PENDING_KEY)');
    expect(fn).toContain('[CONSENT-REGATE] accepted');
    // анкету и профиль нового ученика не пишет
    expect(fn).not.toMatch(/user_profile|GENERATED_NICKNAME_PENDING_KEY|DONE_KEY, '1'|go\(/);
  });
});

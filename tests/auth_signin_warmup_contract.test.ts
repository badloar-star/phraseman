import { readFileSync } from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

// зачем: владелец 2026-08-22 — вход через Google висел 10–30 с из-за холодных
// стартов callable-функций пути входа. Ускорение держится на трёх опорах:
//   1) authEnsureStableLink держит один тёплый инстанс (minInstances: 1);
//   2) у всех трёх callable пути входа есть warmup-ветка ДО auth-чека и ДО
//      любого обращения к Firestore (прогрев = только boot контейнера);
//   3) клиент прогревает их с экранов входа (онбординг + модалка регистрации),
//      с троттлом и fire-and-forget.
// Этот сторож не даёт молча выпилить любую из опор при рефакторинге.

const authIdentitySource = normalizeEol(readFileSync(
  path.join(process.cwd(), 'functions', 'src', 'auth_identity.ts'), 'utf8'));
const authMergeSource = normalizeEol(readFileSync(
  path.join(process.cwd(), 'functions', 'src', 'auth_merge.ts'), 'utf8'));
const cloudSyncSource = normalizeEol(readFileSync(
  path.join(process.cwd(), 'app', 'cloud_sync.ts'), 'utf8'));
const onboardingSource = normalizeEol(readFileSync(
  path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8'));
const registrationSource = normalizeEol(readFileSync(
  path.join(process.cwd(), 'components', 'RegistrationPromptModal.tsx'), 'utf8'));

/** Тело callable: от export до первого закрытия `});` в нулевой колонке. */
function callableSlice(source: string, exportName: string): string {
  const start = source.indexOf(`export const ${exportName} = onCall(`);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf('\n});', start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('sign-in warm path contract (latency fix 2026-08-22)', () => {
  // зачем (10.10): ревизия тёплых инстансов 29.08 (519de9ff0) — постоянный тёплый инстанс снят ради денег; вход
  // прогревает клиентский пинг (тест ниже). Сторож держит HOT-опции и явный осознанный minInstances: 0.
  test('authEnsureStableLink runs on HOT options without a paid always-warm instance', () => {
    const slice = callableSlice(authIdentitySource, 'authEnsureStableLink');
    expect(slice).toContain('...HOT_CALLABLE_OPTIONS');
    expect(slice).toContain('minInstances: 0');
  });

  test.each([
    ['authEnsureStableLink', authIdentitySource],
    ['authStampAnonOwnership', authIdentitySource],
    ['authMergeStableAccounts', authMergeSource],
  ])('%s answers warmup before auth check and before any Firestore access', (name, source) => {
    const slice = callableSlice(source, name);
    const warmupAt = slice.indexOf("request.data?.warmup === true");
    expect(warmupAt).toBeGreaterThan(-1);
    // Прогрев не требует auth и не трогает Firestore — только boot контейнера.
    expect(warmupAt).toBeLessThan(slice.indexOf('request.auth?.uid'));
    expect(warmupAt).toBeLessThan(slice.indexOf('admin.firestore()'));
    expect(slice).toContain('warm: true');
  });

  test('client warm helper pings all three sign-in callables, throttled and fire-and-forget', () => {
    const start = cloudSyncSource.indexOf('export function warmAuthSignInCallables');
    expect(start).toBeGreaterThan(-1);
    const slice = cloudSyncSource.slice(start, cloudSyncSource.indexOf('\n}', start));
    expect(slice).toContain("'authEnsureStableLink'");
    expect(slice).toContain("'authStampAnonOwnership'");
    expect(slice).toContain("'authMergeStableAccounts'");
    // 18.10 (Ядро, Cloud Run: 7,2 с холодной привязки Apple на iPhone) — привязка Apple греется вместе с остальными
    expect(slice).toContain("'authAppleLinkByVerifiedEmail'");
    expect(slice).toContain('[AUTH-WARM] sent source=${source}');
    expect(slice).toContain('[AUTH-WARM] skip source=${source} reason=throttled');
    expect(slice).toContain('AUTH_WARMUP_THROTTLE_MS');
    // ошибка прогрева не глушится молча (правило «ни одного немого catch»), но и не мешает входу.
    expect(slice).toContain("swallowError('cloud_sync:warmAuthSignInCallables')");
    expect(slice).toContain('[ACC-SPEED] warm skip source=${source} reason=throttled');
    // 14.10 (прогон №5, лог Cloud Run): прогрев — обычным fetch, мимо однопоточной очереди RNFirebase callable;
    // итог каждого — [WARM-FETCH] в app/auth_warm_fetch.ts. callable() в прогреве больше нет.
    expect(slice).toContain('warmCallableViaFetch(name, source)');
    expect(slice).not.toContain('callable<');
  });

  test('warm ping fires from both sign-in surfaces', () => {
    // Онбординг: welcome («уже есть аккаунт») и сейф-экран privacy.
    expect(onboardingSource).toMatch(
      /if \(step === 'welcome' \|\| step === 'privacy'\) warmAuthSignInCallables\('onboarding'\);/,
    );
    // Модалка регистрации/восстановления: при каждом открытии.
    expect(registrationSource).toMatch(/if \(visible\) warmAuthSignInCallables\('registration_prompt'\);/);
    // Экран аккаунта (14.10, [ACC-SPEED]): будим функции входа ещё до тапа «Войти»/«Сменить».
    const accountDetails = readFileSync(path.join(__dirname, '..', 'app', 'account_details.tsx'), 'utf8');
    expect(accountDetails).toContain("useEffect(() => { warmAuthSignInCallables('account_details'); }, []);");
    // 18.10: ещё раньше — на фокусе Настроек, после кадра (оттуда идут в «Аккаунт» и к окну входа)
    const settings = readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'settings.tsx'), 'utf8');
    expect(settings).toContain("InteractionManager.runAfterInteractions(() => { warmAuthSignInCallables('settings_focus'); });");
  });
});

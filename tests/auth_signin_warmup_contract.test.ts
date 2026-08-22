import { readFileSync } from 'fs';
import path from 'path';

// зачем: владелец 2026-08-22 — вход через Google висел 10–30 с из-за холодных
// стартов callable-функций пути входа. Ускорение держится на трёх опорах:
//   1) authEnsureStableLink держит один тёплый инстанс (minInstances: 1);
//   2) у всех трёх callable пути входа есть warmup-ветка ДО auth-чека и ДО
//      любого обращения к Firestore (прогрев = только boot контейнера);
//   3) клиент прогревает их с экранов входа (онбординг + модалка регистрации),
//      с троттлом и fire-and-forget.
// Этот сторож не даёт молча выпилить любую из опор при рефакторинге.

const authIdentitySource = readFileSync(
  path.join(process.cwd(), 'functions', 'src', 'auth_identity.ts'), 'utf8');
const authMergeSource = readFileSync(
  path.join(process.cwd(), 'functions', 'src', 'auth_merge.ts'), 'utf8');
const cloudSyncSource = readFileSync(
  path.join(process.cwd(), 'app', 'cloud_sync.ts'), 'utf8');
const onboardingSource = readFileSync(
  path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');
const registrationSource = readFileSync(
  path.join(process.cwd(), 'components', 'RegistrationPromptModal.tsx'), 'utf8');

/** Тело callable: от export до первого закрытия `});` в нулевой колонке. */
function callableSlice(source: string, exportName: string): string {
  const start = source.indexOf(`export const ${exportName} = onCall(`);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf('\n});', start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('sign-in warm path contract (latency fix 2026-08-22)', () => {
  test('authEnsureStableLink keeps one warm instance on top of HOT options', () => {
    const slice = callableSlice(authIdentitySource, 'authEnsureStableLink');
    expect(slice).toContain('...HOT_CALLABLE_OPTIONS');
    expect(slice).toContain('minInstances: 1');
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
    expect(slice).toContain('AUTH_WARMUP_THROTTLE_MS');
    expect(slice).toContain('.catch(() => {})');
    expect(slice).toContain('{ warmup: true }');
  });

  test('warm ping fires from both sign-in surfaces', () => {
    // Онбординг: welcome («уже есть аккаунт») и сейф-экран privacy.
    expect(onboardingSource).toMatch(
      /if \(step === 'welcome' \|\| step === 'privacy'\) warmAuthSignInCallables\(\);/,
    );
    // Модалка регистрации/восстановления: при каждом открытии.
    expect(registrationSource).toMatch(/if \(visible\) warmAuthSignInCallables\(\);/);
  });
});

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const layout = fs.readFileSync(path.join(__dirname, '../app/_layout.tsx'), 'utf8');

test('startup has no coin animation or minimum presentation time', () => {
  expect(layout).not.toMatch(/\b(SplashCoin|splashMinHold|StartupSplashHold)\b/);
});

test('native splash retries one failed dismissal and records a successful dismissal only once', async () => {
  const start = layout.indexOf('let nativeSplashHideInFlight');
  const end = layout.indexOf('// зачем (координатор 04.10, п.1):', start);
  const hideAsync = jest.fn().mockRejectedValueOnce(new Error('native splash busy')).mockResolvedValue(undefined);
  const markNativeSplashHidden = jest.fn();
  const code = ts.transpile(layout.slice(start, end) + '\nhideNativeStartupSplash;');
  const dismiss = vm.runInNewContext(
    code,
    { SplashScreen: { hideAsync }, markNativeSplashHidden, noteSwallowedHandler: () => jest.fn(), console: { warn: jest.fn() } },
  ) as () => void;

  dismiss();
  dismiss();
  await new Promise<void>((resolve) => setImmediate(resolve));
  dismiss();

  expect(hideAsync).toHaveBeenCalledTimes(2);
  expect(markNativeSplashHidden).toHaveBeenCalledTimes(1);
});

test('bootstrap and Home share lesson reads without caching the rest of the bootstrap batch', () => {
  const boot = fs.readFileSync(path.join(__dirname, '../app/app_snapshot_bootstrap.ts'), 'utf8');
  const home = fs.readFileSync(path.join(__dirname, '../app/(tabs)/home.tsx'), 'utf8');
  expect(boot).toContain('readStoredItems(keys, new Set([...lessonProgressKeys, lastOpenedKey]))');
  expect(home).toContain('readStoredItems([...lessonKeys, lastOpenedKey])');
});

test('onboarding import failure exposes a retry that triggers another import', () => {
  const start = layout.indexOf('if (!effectiveShowOnboarding || onboardingComponent) return;');
  const end = layout.indexOf('}, [effectiveShowOnboarding, onboardingComponent', start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const effect = layout.slice(start, end);
  expect(effect.slice(effect.indexOf('.catch((error)'))).toContain('setOnboardingLoadFailed(true)');
  expect(layout).toMatch(/\[effectiveShowOnboarding, onboardingComponent, onboardingLoadAttempt\]/);
  expect(layout).toMatch(/onPress=\{\(\) => setOnboardingLoadAttempt\(\(attempt\) => attempt \+ 1\)\}/);
});

test('cancelling before heavy initialization executes allows it to be scheduled again', () => {
  const start = layout.indexOf('const gate = { ready, effectiveShowOnboarding, isBanned, firstContentReady,');
  const end = layout.indexOf('}, [effectiveShowOnboarding, firstContentReady, isBanned, ready]);', start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const init = jest.fn();
  const deferred: Array<() => void> = [];
  const timers: Array<() => void> = [];
  const context = {
    ready: true, effectiveShowOnboarding: false, isBanned: false, firstContentReady: true,
    heavyInitStartedRef: { current: false }, heavyInitRanRef: { current: false },
    heavyInitCancelledBeforeRunRef: { current: false }, runHeavyInitRef: { current: init },
    BOOT_T0: 0, console: { warn: jest.fn(), log: jest.fn() },
    setTimeout: (fn: () => void) => timers.push(fn), clearTimeout: jest.fn(),
    runAfterHomeFirstFrame: (_: string, fn: () => void) => {
      deferred.push(fn);
      return jest.fn();
    },
  };
  const effect = ts.transpile(`(() => { ${layout.slice(start, end)} })()`);
  const runEffect = () => vm.runInNewContext(effect, context) as () => void;
  runEffect()();
  runEffect();
  expect(deferred).toHaveLength(2);
  deferred[1]();
  timers[0]();
  expect(init).toHaveBeenCalledTimes(1);
  runEffect();
  expect(deferred).toHaveLength(2);
});

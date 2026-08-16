import fs from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';

const layout = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
const effectStart = layout.indexOf('const bootstrap = async () => {');
const effectEnd = layout.indexOf("const sub = onAppEvent('achievement_unlocked'", effectStart);
const bootstrapRegion = layout.slice(effectStart, effectEnd);

function loadRetryPolicy() {
  const start = layout.indexOf('// AUTH_RECOVERY_BOOT_RETRY_POLICY_START');
  const endMarker = '// AUTH_RECOVERY_BOOT_RETRY_POLICY_END';
  const end = layout.indexOf(endMarker, start);
  const source = layout.slice(start, end + endMarker.length);
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} as Record<string, unknown> };
  new Function('module', 'exports', compiled)(loaded, loaded.exports);
  return loaded.exports as {
    AUTH_RECOVERY_BOOT_RETRY_DELAYS_MS: readonly number[];
    createAuthRecoveryBootRetryScheduler: (options: {
      isInFlight: () => boolean;
      run: () => void;
      setTimer: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
      clearTimer: (timer: ReturnType<typeof setTimeout>) => void;
    }) => {
      schedule: () => boolean;
      triggerActive: () => void;
      cancel: () => void;
    };
  };
}

describe('auth recovery pre-cloud boot integration', () => {
  it('runs account-delete recovery first, then the recovery gate, before every cloud/bootstrap seam', () => {
    const accountDelete = bootstrapRegion.indexOf('await resumePendingAccountDeleteLocalExit()');
    const recoveryGate = bootstrapRegion.indexOf('await runAuthRecoveryBootGate(');
    const safetyTimer = bootstrapRegion.indexOf('safetyTimer = setTimeout');
    const cloudCoordinator = bootstrapRegion.indexOf('createBootCloudRestoreCoordinator');

    expect(layout).toContain("from './auth_recovery_boot_gate'");
    expect(accountDelete).toBeGreaterThan(-1);
    expect(recoveryGate).toBeGreaterThan(accountDelete);
    expect(safetyTimer).toBeGreaterThan(recoveryGate);
    expect(cloudCoordinator).toBeGreaterThan(recoveryGate);
  });

  it('preserves the no-journal proceed path and starts the existing bootstrap once', () => {
    expect(bootstrapRegion).toContain("if (recoveryGate.result !== 'proceed')");
    expect(bootstrapRegion).toContain('recoveryBootAllowsCloud = true;');
    const earlyCloud = bootstrapRegion.indexOf('cloudHydratePromise = bootCoordinator.run();');
    const deferredHeavy = bootstrapRegion.indexOf('if (heavyInitRequestedWhileBlocked) {');
    expect(earlyCloud).toBeGreaterThan(-1);
    expect(deferredHeavy).toBeGreaterThan(earlyCloud);
    expect(bootstrapRegion).toContain('heavyInitRequestedWhileBlocked = false;');
    expect(bootstrapRegion).toContain('runHeavyInit();');
    expect(bootstrapRegion.match(/cloudHydratePromise = bootCoordinator\.run\(\);/g)).toHaveLength(1);
  });

  it('renders only the local shell on transient block and schedules bounded timer/AppState retries', () => {
    expect(bootstrapRegion).toContain("recoveryGate.result === 'blocked_transient'");
    expect(bootstrapRegion).toContain('setReady(true);');
    expect(bootstrapRegion).toContain('scheduleAuthRecoveryBootRetry()');
    expect(bootstrapRegion).toContain("AppState.addEventListener('change'");
    expect(bootstrapRegion).toContain("if (state === 'active')");
    expect(bootstrapRegion).toContain('authRecoveryBootRetryScheduler.schedule()');
    expect(bootstrapRegion).toContain('authRecoveryBootRetryScheduler.triggerActive()');
  });

  it('does not retry hard quarantine and safely opens startup recovery support', () => {
    const blockedStart = bootstrapRegion.indexOf("if (recoveryGate.result !== 'proceed')");
    const blockedEnd = bootstrapRegion.indexOf('recoveryBootAllowsCloud = true;', blockedStart);
    const blocked = bootstrapRegion.slice(blockedStart, blockedEnd);
    const transient = blocked.indexOf("recoveryGate.result === 'blocked_transient'");
    const schedule = blocked.indexOf('scheduleAuthRecoveryBootRetry()', transient);
    const support = blocked.indexOf('setStartupAuthRecoveryVisible(true)', schedule);

    expect(transient).toBeGreaterThan(-1);
    expect(schedule).toBeGreaterThan(transient);
    expect(support).toBeGreaterThan(schedule);
    expect(blocked.slice(support)).not.toContain('scheduleAuthRecoveryBootRetry()');
    expect(blocked).toContain('return;');
  });

  it('coalesces retry races and keeps heavy init from bypassing the gate', () => {
    expect(bootstrapRegion).toContain('if (authRecoveryBootstrapInFlight) return;');
    expect(bootstrapRegion).toContain('authRecoveryBootstrapInFlight = true;');
    expect(bootstrapRegion).toContain('authRecoveryBootstrapInFlight = false;');
    expect(layout).toContain('if (!recoveryBootAllowsCloud)');
    expect(layout).toContain('heavyInitRequestedWhileBlocked = true;');
    expect(layout).toContain('runHeavyInitRef.current = requestHeavyInit;');
  });

  // Владелец, 2026-08-16: «ни один юзер никогда не должен увидеть такого».
  // Экран-стена «Нужна безопасная проверка» держал приложение закрытым, когда
  // дочистка удалённого аккаунта не проходила. Но она не проходит и по
  // будничным причинам — нет сети (метро!), Firebase не поднялся за 2.5 с,
  // enqueue не достучался. Вход НЕ блокируется больше никогда.
  it('never blocks entry when the pending-delete cleanup cannot finish', () => {
    const deleteRecoveryStart = bootstrapRegion.indexOf('const pendingDeleteRecovered');
    const recoveryGateStart = bootstrapRegion.indexOf('authRecoveryBootAbort = new AbortController()', deleteRecoveryStart);
    const deleteRecovery = bootstrapRegion.slice(deleteRecoveryStart, recoveryGateStart);

    // Провал дочистки больше не поднимает никакого блокирующего состояния...
    expect(deleteRecovery).not.toContain('setStartupSecurityBlocked');
    // ...и не прерывает загрузку — старт продолжается обычным путём.
    expect(deleteRecovery).not.toMatch(/\n\s*return;\s*\n/);

    // Но сама дочистка сохранена: конечный бэкофф в фоне, без горячего цикла.
    expect(deleteRecovery).toContain('accountDeleteRecoveryRetryTimer = setTimeout');
    expect(deleteRecovery).toContain('AUTH_RECOVERY_BOOT_RETRY_DELAYS_MS[accountDeleteRecoveryRetryAttempt]');
    expect(deleteRecovery).toContain('accountDeleteRecoveryRetryAttempt += 1;');
    expect(deleteRecovery).not.toMatch(/accountDeleteRecoveryRetryTimer\s*=\s*setTimeout[\s\S]*?},\s*1_500\)/);
  });

  it('keeps no trace of the removed security-blocker screen', () => {
    // Ни состояния, ни ретрая, ни разметки, ни текста — иначе экран вернётся.
    expect(layout).not.toContain('startupSecurityBlocked');
    expect(layout).not.toContain('retryStartupSecurityCheckRef');
    // Заголовок экрана — только как ru-строка в разметке. Упоминание в
    // комментарии «зачем» разрешено: оно объясняет, почему экрана больше нет.
    expect(layout).not.toContain("ru: 'Нужна безопасная проверка'");
    expect(layout).not.toContain('Приложение остаётся закрытым, чтобы не показать данные другого пользователя.');
  });

  it('shows the normal splash and overlays instead of a blocker', () => {
    expect(layout).toContain('const appOverlaysEnabled = ready && !effectiveShowOnboarding && !isBanned');
    expect(layout).toContain('const startupSplashVisible = !fontsReady || !ready');
    expect(layout).toContain('const nativeSplashCanHide = fontsReady && ready');
  });

  it('uses a finite backoff budget that AppState and in-flight timer races cannot reset', () => {
    jest.useFakeTimers();
    const policy = loadRetryPolicy();
    const run = jest.fn();
    let inFlight = true;
    const scheduler = policy.createAuthRecoveryBootRetryScheduler({
      isInFlight: () => inFlight,
      run,
      setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
      clearTimer: timer => clearTimeout(timer),
    });

    expect(policy.AUTH_RECOVERY_BOOT_RETRY_DELAYS_MS).toEqual([1_500, 5_000, 15_000, 30_000]);
    expect(scheduler.schedule()).toBe(true);
    scheduler.triggerActive();
    expect(run).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1_500);
    expect(run).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);
    inFlight = false;
    jest.advanceTimersByTime(250);
    expect(run).toHaveBeenCalledTimes(1);

    for (const delayMs of policy.AUTH_RECOVERY_BOOT_RETRY_DELAYS_MS.slice(1)) {
      expect(scheduler.schedule()).toBe(true);
      jest.advanceTimersByTime(delayMs);
    }
    expect(run).toHaveBeenCalledTimes(4);
    expect(scheduler.schedule()).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    scheduler.cancel();
    jest.useRealTimers();
  });

  it('cancels gate, timer, and AppState subscription on unmount without starting cloud work', () => {
    const cleanupStart = layout.indexOf('return () => {', effectEnd);
    const cleanupEnd = layout.indexOf('};', cleanupStart);
    const cleanup = layout.slice(cleanupStart, cleanupEnd + 2);

    expect(layout).toContain('authRecoveryBootAbort = new AbortController();');
    expect(bootstrapRegion).toContain('signal: authRecoveryBootAbort.signal');
    expect(cleanup).toContain('authRecoveryBootAbort?.abort();');
    expect(cleanup).toContain('clearAuthRecoveryBootRetry();');
    expect(layout).toContain('authRecoveryBootAppStateSub?.remove()');
  });
});

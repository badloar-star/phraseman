import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');

function extractSchedule(): string {
  const file = ts.createSourceFile('_layout.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const constants: string[] = [];
  let schedule = '';
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.name.text.startsWith('BACKGROUND_TAB_PREMOUNT_')) constants.push(`const ${node.getText(file)};`);
      if (node.name.text === 'scheduleMount') schedule = `const ${node.getText(file)};`;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (!schedule) throw new Error('actual tab premount scheduler missing');
  return ts.transpileModule([...constants, schedule, 'return scheduleMount;'].join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
}

function extractArrow(predicate: (node: ts.CallExpression, file: ts.SourceFile) => boolean): string {
  const file = ts.createSourceFile('_layout.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); let arrow = '';
  const visit = (node: ts.Node): void => { if (ts.isCallExpression(node) && predicate(node, file)) { const candidate = node.arguments[0]; if (candidate && ts.isCallExpression(candidate)) arrow = candidate.arguments[0]?.getText(file) ?? ''; else arrow = candidate?.getText(file) ?? ''; } ts.forEachChild(node, visit); };
  visit(file); if (!arrow) throw new Error('actual lifecycle callback missing'); return ts.transpileModule(`return (${arrow});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
}

/** Стрелочная функция, присвоенная `target = (...) => {...}` в настоящем _layout.tsx (последняя подходящая). */
function extractAssigned(target: string, accept: (text: string) => boolean = () => true): string {
  const file = ts.createSourceFile('_layout.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); let arrow = '';
  const visit = (node: ts.Node): void => {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && node.left.getText(file) === target && ts.isArrowFunction(node.right) && accept(node.right.getText(file))) arrow = node.right.getText(file);
    ts.forEachChild(node, visit);
  };
  visit(file); if (!arrow) throw new Error(`actual assignment to ${target} missing`);
  return ts.transpileModule(`return (${arrow});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
}

/** Функция, объявленная как `const name = (...) => {...}` в настоящем _layout.tsx. */
function extractDeclared(name: string): string {
  const file = ts.createSourceFile('_layout.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); let init = '';
  const visit = (node: ts.Node): void => { if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) init = node.initializer.getText(file); ts.forEachChild(node, visit); };
  visit(file); if (!init) throw new Error(`actual declaration of ${name} missing`);
  return ts.transpileModule(`return (${init});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
}

function harness(active = true, queueBlocked = false) {
  let now = 10_000;
  let serial = 0;
  let framesQueued = 0;
  const timers = new Map<number, { callback: () => void; at: number }>();
  const prewarms: number[] = [];
  const commits: string[] = [];
  const backgroundPremountActiveRef = { current: active };
  const AppState = { currentState: 'active' };
  let releaseQueue: (() => void) | undefined;
  const scheduledMountsRef = { current: new Map<number, { cancel?: () => void }>() };
  const premountChainRef = { current: queueBlocked ? new Promise<void>((resolve) => { releaseQueue = resolve; }) : Promise.resolve() };
  const setTimeoutMock = (callback: () => void, delay = 0) => { const id = ++serial; timers.set(id, { callback, at: now + delay }); return id; };
  const scheduleMount = new Function('useCallback', 'Date', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'AppState', 'backgroundPremountActiveRef', 'mountedTabsRef', 'scheduledMountsRef', 'premountChainRef', 'foregroundBusyUntilRef', 'foregroundMountsRef', 'lastTouchAtRef', 'scheduleIdleTask', 'prewarmDeferredTabScreen', 'setVisitedTabs', 'setMountedTabs', 'addVisitedTab', 'isLiteModeOn', 'console', extractSchedule())(
    (callback: unknown) => callback, { now: () => now }, setTimeoutMock, (id: number) => timers.delete(id), (callback: () => void) => { framesQueued += 1; return setTimeoutMock(callback, 16); }, AppState, backgroundPremountActiveRef,
    { current: new Set([0, 1]) }, scheduledMountsRef, premountChainRef, { current: 0 }, { current: new Set() }, { current: 0 },
    (callback: () => void) => { const id = setTimeoutMock(callback, 1); return { cancel: () => timers.delete(id) }; }, (idx: number) => { prewarms.push(idx); return true; }, () => commits.push('visited'), () => commits.push('mounted'), (value: Set<number>, idx: number) => new Set([...value, idx]), () => false, { log: () => undefined },
  ) as (idx: number) => void;
  const next = async () => {
    const entry = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (!entry) return false;
    timers.delete(entry[0]); now = entry[1].at; entry[1].callback(); await Promise.resolve(); await Promise.resolve(); return true;
  };
  return { AppState, backgroundPremountActiveRef, commits, get framesQueued() { return framesQueued; }, next, prewarms, releaseQueue, scheduleMount, scheduledMountsRef, timers };
}

describe('tab premount focus lifecycle', () => {
  it('does not require or commit actual scheduled work after tab blur or app inactivity, including idle-ready and before RAF', async () => {
    const blurred = harness(false); blurred.scheduleMount(2); await Promise.resolve(); await Promise.resolve(); expect(blurred.prewarms).toEqual([]); expect(blurred.commits).toEqual([]);

    const beforeIdle = harness(); beforeIdle.scheduleMount(2); await Promise.resolve(); await Promise.resolve(); while (beforeIdle.framesQueued === 0) await beforeIdle.next(); beforeIdle.backgroundPremountActiveRef.current = false; while (await beforeIdle.next()) undefined;
    expect(beforeIdle.prewarms).toEqual([]); expect(beforeIdle.commits).toEqual([]);

    const inactive = harness(); inactive.scheduleMount(2); await Promise.resolve(); await Promise.resolve(); while (inactive.framesQueued === 0) await inactive.next(); inactive.AppState.currentState = 'background'; while (await inactive.next()) undefined;
    expect(inactive.prewarms).toEqual([]); expect(inactive.commits).toEqual([]);
  });

  it('runs the same actual scheduler after focus becomes eligible again', async () => {
    const resumed = harness(false); resumed.scheduleMount(2); await Promise.resolve(); await Promise.resolve();
    resumed.backgroundPremountActiveRef.current = true; resumed.scheduleMount(2); await Promise.resolve(); await Promise.resolve();
    let steps = 0; while (steps++ < 20 && await resumed.next()) undefined;
    expect(resumed.prewarms).toEqual([2]); expect(resumed.commits).toEqual(['visited', 'mounted']);
  });

  it('keeps the replacement queued step registered when a blurred predecessor starts later', async () => {
    const queued = harness(true, true); queued.scheduleMount(2); const oldTask = queued.scheduledMountsRef.current.get(2); oldTask?.cancel?.(); queued.scheduledMountsRef.current.clear(); queued.scheduleMount(2);
    const replacement = queued.scheduledMountsRef.current.get(2); expect(replacement).toBeDefined(); queued.releaseQueue?.(); await Promise.resolve(); await Promise.resolve();
    expect(queued.scheduledMountsRef.current.get(2)).toBe(replacement);
  });

  it('executes actual focus and AppState lifecycle callbacks through event-owned refs', () => {
    const active = { current: false }, cancelled = jest.fn(), resumed = jest.fn(), ticks = jest.fn();
    const focus = new Function('backgroundPremountActiveRef', 'backgroundPremountResumeRef', 'backgroundPremountCancelRef', '__DEV__', 'console', 'noteBackStep', 'setFocusTick', extractArrow((node, file) => node.expression.getText(file) === 'useFocusEffect'))(active, { current: resumed }, { current: cancelled }, false, { log: jest.fn() }, jest.fn(), ticks) as () => () => void;
    const blur = focus(); expect(active.current).toBe(true); expect(resumed).toHaveBeenCalledTimes(1); blur(); expect(active.current).toBe(false); expect(cancelled).toHaveBeenCalledTimes(1);
    let listener: ((state: string) => void) | undefined; const remove = jest.fn(); let cleanup: (() => void) | undefined;
    const appEffect = extractArrow((node, file) => node.expression.getText(file) === 'useEffect' && node.getText(file).includes("AppState.addEventListener('change'"));
    const appCallback = new Function('AppState', 'backgroundPremountResumeRef', 'backgroundPremountCancelRef', appEffect)({ addEventListener: (_: string, fn: (state: string) => void) => { listener = fn; return { remove }; } }, { current: resumed }, { current: cancelled }) as () => () => void; cleanup = appCallback();
    listener?.('active'); listener?.('background'); expect(resumed).toHaveBeenCalledTimes(2); expect(cancelled).toHaveBeenCalledTimes(2); cleanup?.(); expect(remove).toHaveBeenCalledTimes(1);
  });

  it('uses the actual Settings idle callback gate after blur/inactivity', () => {
    const settings = extractArrow((node, file) => node.expression.getText(file) === 'scheduleIdleTask' && node.getText(file).includes('prewarmDeferredTabScreen(4)'));
    const inactivePrewarm = jest.fn(); new Function('settingsModulePrewarmRef', 'cancelled', 'mountedTabsRef', 'backgroundPremountActiveRef', 'AppState', 'foregroundBusyUntilRef', 'lastTouchAtRef', 'Date', 'prewarmDeferredTabScreen', 'console', 'BACKGROUND_TAB_PREMOUNT_QUIET_TOUCH_MS', 'requestedAt', settings)({ current: {} }, false, { current: new Set() }, { current: false }, { currentState: 'background' }, { current: 0 }, { current: 0 }, { now: () => 10_000 }, inactivePrewarm, { log: jest.fn() }, 1200, 0)(); expect(inactivePrewarm).not.toHaveBeenCalled();
    // F19: выход «не тихо / не в фокусе» больше не немой
    expect(settings).toContain("reason: 'not_quiet'");
    const activePrewarm = jest.fn(); new Function('settingsModulePrewarmRef', 'cancelled', 'mountedTabsRef', 'backgroundPremountActiveRef', 'AppState', 'foregroundBusyUntilRef', 'lastTouchAtRef', 'Date', 'prewarmDeferredTabScreen', 'console', 'BACKGROUND_TAB_PREMOUNT_QUIET_TOUCH_MS', 'requestedAt', settings)({ current: {} }, false, { current: new Set() }, { current: true }, { currentState: 'active' }, { current: 0 }, { current: 0 }, { now: () => 10_000 }, activePrewarm, { log: jest.fn() }, 1200, 0)(); expect(activePrewarm).toHaveBeenCalledWith(4);
  });

  // зачем (F19): «после ухода в урок подгрузка прекращается — проверить возврат и отмену старой очереди».
  // Настоящая функция отмены из _layout.tsx: гасит шаги, таймеры и прогрев «Настроек», снимает отметку «уже запущено» (иначе возврат ничего не поднимет) и пишет причину.
  it('F19: actual cancel drops every queued step, timer and Settings prewarm, re-opens the start gate and logs the reason', () => {
    const stepCancel = jest.fn(), settingsCancel = jest.fn(), cleared: unknown[] = [], log = jest.fn();
    const scheduledMountsRef = { current: new Map<number, { cancel?: () => void }>([[1, { cancel: stepCancel }]]) };
    const backgroundPremountTimersRef = { current: [11, 12] as unknown[] };
    const settingsModulePrewarmRef = { current: { cancel: settingsCancel } as { cancel?: () => void } | null };
    const backgroundPremountStartedRef = { current: true };
    const cancel = new Function('scheduledMountsRef', 'backgroundPremountTimersRef', 'settingsModulePrewarmRef', 'backgroundPremountStartedRef', 'mountedTabsRef', 'clearTimeout', 'console', extractAssigned('backgroundPremountCancelRef.current'))(
      scheduledMountsRef, backgroundPremountTimersRef, settingsModulePrewarmRef, backgroundPremountStartedRef, { current: new Set([0]) }, (id: unknown) => cleared.push(id), { log },
    ) as (reason?: string) => void;
    cancel('tabs_blur');
    expect(stepCancel).toHaveBeenCalledTimes(1); expect(settingsCancel).toHaveBeenCalledTimes(1); expect(cleared).toEqual([11, 12]);
    expect(scheduledMountsRef.current.size).toBe(0); expect(backgroundPremountTimersRef.current).toEqual([]); expect(settingsModulePrewarmRef.current).toBeNull(); expect(backgroundPremountStartedRef.current).toBe(false);
    expect(log).toHaveBeenCalledTimes(1); expect(log.mock.calls[0][0]).toBe('[TABS-PREMOUNT] pause'); expect(JSON.parse(log.mock.calls[0][1])).toMatchObject({ reason: 'tabs_blur', steps: [1], timers: 2, settingsPrewarm: true });
    // пустая очередь — повторная отмена молчит и ничего не ломает
    cancel('app_background'); expect(log).toHaveBeenCalledTimes(1);
  });

  it('F19: Settings module prewarm is re-armed on return and is not lost after a blur cancelled it', () => {
    const arm = (over: { active?: boolean; loaded?: boolean; armed?: boolean } = {}) => {
      const scheduled: (() => void)[] = [], prewarm = jest.fn(() => true), log = jest.fn();
      const settingsModulePrewarmRef = { current: (over.armed ? { cancel: () => undefined } : null) as { cancel?: () => void } | null };
      const fn = new Function('cancelled', 'mountedTabsRef', 'deferredSettingsScreen', 'settingsModulePrewarmRef', 'backgroundPremountActiveRef', 'AppState', 'console', 'scheduleIdleTask', 'lastTouchAtRef', 'foregroundBusyUntilRef', 'Date', 'prewarmDeferredTabScreen', 'requestedAt', 'BACKGROUND_TAB_PREMOUNT_QUIET_TOUCH_MS', 'SETTINGS_MODULE_PREWARM_IDLE_TIMEOUT_MS', extractDeclared('armSettingsModulePrewarm'))(
        false, { current: new Set([0]) }, over.loaded ? {} : null, settingsModulePrewarmRef, { current: over.active ?? true }, { currentState: 'active' }, { log },
        (run: () => void) => { scheduled.push(run); return { cancel: () => undefined }; }, { current: 0 }, { current: 0 }, { now: () => 10_000 }, prewarm, 0, 1200, 2000,
      ) as (why: string) => void;
      return { fn, log, prewarm, scheduled, settingsModulePrewarmRef };
    };
    // возврат на вкладки: прогрев встаёт в очередь заново и выполняется
    const back = arm(); back.fn('tabs_focus'); expect(back.scheduled).toHaveLength(1); expect(back.settingsModulePrewarmRef.current).not.toBeNull();
    back.scheduled[0](); expect(back.prewarm).toHaveBeenCalledWith(4); expect(back.settingsModulePrewarmRef.current).toBeNull();
    // вкладки не в фокусе (человек в уроке) — не взводим и пишем причину
    const away = arm({ active: false }); away.fn('home_painted'); expect(away.scheduled).toHaveLength(0); expect(JSON.parse(away.log.mock.calls[0][1])).toEqual({ why: 'home_painted', skip: 'tabs_blurred' });
    // модуль уже загружен — тихо, без работы и без строки в журнале на каждом возврате
    const loaded = arm({ loaded: true }); loaded.fn('tabs_focus'); expect(loaded.scheduled).toHaveLength(0); expect(loaded.log).not.toHaveBeenCalled();
    // уже взведён — второй раз не ставим (двойной фокус + AppState active)
    const twice = arm({ armed: true }); twice.fn('app_active'); expect(twice.scheduled).toHaveLength(0);
  });

  it('F19: return resumes both the tab queue and the Settings prewarm, and a late idle callback of a closed step cannot mount', () => {
    const resume = extractAssigned('backgroundPremountResumeRef.current', (text) => text.includes('armSettingsModulePrewarm'));
    expect(resume).toContain('armSettingsModulePrewarm(why)'); expect(resume).toContain('scheduleBackgroundPremount()'); expect(resume).toContain("'[TABS-PREMOUNT] resume'");
    expect(source.replace(/\r\n/g, '\n')).toContain('inner = scheduleIdleTask(() => {\n        // зачем (F19): шаг уже закрыт (отмена уходом в урок или охранный таймер) — опоздавший idle-вызов не должен монтировать вкладку за спиной новой очереди\n        if (cancelled || done) return;');
    expect(source).toContain("backgroundPremountResumeRef.current('tabs_focus')"); expect(source).toContain("backgroundPremountCancelRef.current('tabs_blur')");
  });
});

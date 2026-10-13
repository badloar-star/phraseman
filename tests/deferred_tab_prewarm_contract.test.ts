import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('background tab pre-mount contract', () => {
  it('starts staged tab pre-mount after first content or a short fallback', () => {
    const source = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');

    expect(source).toContain('const ENABLE_BACKGROUND_TAB_PREMOUNT = true');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_FALLBACK_MS = 1600');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_FIRST_DELAY_MS = 0');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_STEP_MS = 180');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_IDLE_TIMEOUT_MS = 400');
    // зачем (R1, ревью скорости 12.10): при старте на Главной премаунт ждёт НАСТОЯЩИЙ кадр Главной (whenHomePainted) + паузу; прежний путь по событию — только для старта на другой вкладке
    expect(source).toContain("onAppEvent('app_first_content_ready', () => startPremount('content_ready_non_home_start'))");
    expect(source).toContain('whenHomePainted(BACKGROUND_TAB_PREMOUNT_HOME_PAINT_CEILING_MS)');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_AFTER_PAINT_DELAY_MS = 500;');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_HOME_PAINT_CEILING_MS = 6000;');
    expect(source).toContain('if (startTabIdxRef.current === 0) {');
    expect(source).toContain('BACKGROUND_TAB_PREMOUNT_ORDER.forEach');
    expect(source).not.toContain('const DEFERRED_TAB_PREWARM_FALLBACK_MS = 4000');
    expect(source).not.toContain("onAppEvent('app_first_content_ready', schedulePrewarm)");
  });

  // зачем (координатор 13.10, профиль Сверки + стеки Ядра): премаунт четырёх вкладок шёл подряд (коммиты ≈1,2–1,35 с без окон) — теперь шаги в одной цепочке: следующий после коммита предыдущего и паузы, с замером в журнале.
  it('serialises tab pre-mount steps: one chain, quiet gap after each commit, guard timeout, per-step log', () => {
    const source = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8').replace(/\r\n/g, '\n');

    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_STEP_GAP_MS = 150;');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_STEP_GUARD_MS = BACKGROUND_TAB_PREMOUNT_QUIET_MAX_WAIT_MS + 4000;');
    expect(source).toContain('const premountChainRef = useRef<Promise<void>>(Promise.resolve());');
    expect(source).toContain('premountChainRef.current = premountChainRef.current.then(() => new Promise<void>((resolve) => {');
    expect(source).toContain("setTimeout(() => finish('mounted', { ...quiet, idleWaitMs, prewarmMs, commitMs }), BACKGROUND_TAB_PREMOUNT_STEP_GAP_MS)");
    expect(source).toContain("guard = setTimeout(() => finish('guard_timeout'), BACKGROUND_TAB_PREMOUNT_STEP_GUARD_MS)");
    expect(source).toContain("console.log('[TABS-PREMOUNT] step'");
    // отмена тапом (mountNow) и дедупликация сохранены: запись о шаге ставится сразу
    expect(source).toContain('scheduledMountsRef.current.set(idx, { cancel: () => { cancelled = true; inner?.cancel?.(); finishStep?.(); } });');
  });

  // зачем (координатор 13.10, замер Сверки f0d559796): коммиты премаунта идут блоками ≥1 с в окне +5…+12 с; шаг ждёт «тихое окно» (нет касаний, нет лага цикла событий), потолок 8 с — премаунт всё равно случится.
  it('waits for a quiet window before each pre-mount step: no recent touch, no event-loop lag, with a ceiling', () => {
    const source = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8').replace(/\r\n/g, '\n');

    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_QUIET_TOUCH_MS = 1200;');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_QUIET_LAG_MAX_MS = 80;');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_QUIET_POLL_MS = 200;');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_QUIET_MAX_WAIT_MS = 8000;');
    expect(source).toContain('const lastTouchAtRef = useRef(0);');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_QUIET_CLEAN_TICKS = 4;');
    expect(source).toContain('const tickClean = sinceTouchMs >= BACKGROUND_TAB_PREMOUNT_QUIET_TOUCH_MS && lastLagMs <= BACKGROUND_TAB_PREMOUNT_QUIET_LAG_MAX_MS;');
    expect(source).toContain('cleanTicks = tickClean ? cleanTicks + 1 : 0;');
    expect(source).toContain('const isQuiet = cleanTicks >= BACKGROUND_TAB_PREMOUNT_QUIET_CLEAN_TICKS;');
    expect(source).toContain("quietReason: isQuiet ? 'quiet' : 'ceiling'");
    expect(source).toContain('if (isQuiet || quietWaitMs >= BACKGROUND_TAB_PREMOUNT_QUIET_MAX_WAIT_MS) {');
    // обёртка отмечает касания, но их НЕ перехватывает (всегда false) и вида не меняет (flex: 1)
    expect(source).toContain('onStartShouldSetResponderCapture={markTouchForPremount}');
    const markAt = source.indexOf('const markTouchForPremount = useCallback(() => {');
    expect(source.slice(markAt, markAt + 160)).toContain('return false;');
    // лог шага несёт замеры тишины
    expect(source).toContain("{ ...quiet, idleWaitMs, prewarmMs, commitMs }");
  });
});

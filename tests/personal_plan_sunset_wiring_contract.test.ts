import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('Personal Plan sunset wiring contract', () => {
  test('hides the Route tab until account-scoped grandfather eligibility resolves', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).toContain('readAnyPersonalPlanState');
    expect(lessons).toContain('resolvePersonalPlanSunsetAccess');
    expect(lessons).toContain('personalPlanSunsetTabVisible');
    expect(lessons).toMatch(/personalPlanSunsetTabVisible\s*\?\s*\(\s*<TabUnderlineButton/);
    expect(lessons).not.toMatch(/state\s*\?\s*["']\/personal_plan["']\s*:\s*["']\/personal_plan_setup["']/);
  });

  test('guards setup and every production Personal Plan route against deep links', () => {
    const productionRoutes = [
      'personal_plan.tsx',
      'personal_plan_setup.tsx',
      'personal_plan_exercise.tsx',
      'personal_plan_quiz.tsx',
      'personal_plan_complete.tsx',
      'personal_plan_task_done.tsx',
      'personal_plan_thank_you.tsx',
      'personal_plan_exercise_transition.tsx',
      'personal_plan_stats_screen.tsx',
      'personal_plan_theory.tsx',
    ];
    for (const file of productionRoutes) {
      const source = read(`app/${file}`);
      expect(source).toContain('withPersonalPlanSunsetGuard');
    }
    expect(read('app/personal_plan_setup.tsx'))
      .toContain('withPersonalPlanSunsetGuard(PersonalPlanSetupScreen)');
  });

  test('waits for fresh premium resolution when a premium gate is active', () => {
    const guard = read('app/personal_plan_sunset_guard.tsx');
    const lessons = read('app/(tabs)/lessons.tsx');
    expect(guard).toContain('usePremium');
    expect(guard).toContain('accessResolved');
    expect(guard).toContain("shouldGateFeature('personal_plan', false)");
    expect(guard).toContain('resolvePersonalPlanPremiumProbe');
    expect(lessons).toContain('accessResolved');
    expect(lessons).toMatch(/shouldGateFeature\(\s*['"]personal_plan['"],\s*false,?\s*\)/);
    expect(lessons).toContain('resolvePersonalPlanPremiumProbe');
    expect(lessons).toContain('getVerifiedPremiumAccessStatus');
  });

  test('uses the persisted monotonic clock at tab, route, setup, screen and activation boundaries', () => {
    for (const file of [
      'app/(tabs)/lessons.tsx',
      'app/personal_plan_sunset_guard.tsx',
      'app/personal_plan_setup.tsx',
      'app/personal_plan.tsx',
      'app/personal_plan_state.ts',
    ]) {
      expect(read(file)).toContain('readPersonalPlanSunsetEffectiveNow');
    }
  });

  test('preflights stale plan purchase context and routes retired post-purchase context away', () => {
    const purchase = read('app/paywall_purchase.ts');
    const postPremium = read('app/personal_plan_post_premium.ts');
    expect(purchase).toContain('hasCurrentPersonalPlanSunsetAccess');
    expect(postPremium).toContain("'/lessons_list'");
    expect(postPremium).not.toContain("'/personal_plan_setup'");
  });

  test('guards only plan-marked uses of shared lesson, practice and flashcard routes', () => {
    const guard = read('app/personal_plan_sunset_guard.tsx');
    expect(guard).toMatch(/if \(!isPersonalPlanRoute\) return <Screen \{\.\.\.props\} \/>/);
    const sharedRoutes: [string, string][] = [
      ['app/lesson_menu.tsx', 'planTask'],
      ['app/lesson1.tsx', 'planTask'],
      ['app/mistake_practice_session.tsx', 'planTaskId'],
      ['app/flashcards_swipe.tsx', 'planFlashcardsTask'],
    ];
    for (const [file, marker] of sharedRoutes) {
      const source = read(file);
      expect(source).toContain('withOptionalPersonalPlanSunsetGuard');
      expect(source).toContain(`['${marker}']`);
    }
  });

  test('re-checks grandfather eligibility in both direct and post-premium activation paths', () => {
    const state = read('app/personal_plan_state.ts');
    const activation = read('app/personal_plan_activation.ts');
    expect(state).toMatch(/activatePersonalPlan[\s\S]*withPersonalPlanStateStorageLock[\s\S]*parseAnyPersonalPlanState[\s\S]*assertPersonalPlanActivationAllowed/);
    // зачем (2026-08-24): суть правила — grandfather-дата СУЩЕСТВУЮЩЕГО плана
    // обязана пережить пересоздание. Форма записи стала null-safe
    // (`existing?.createdAt ?? base.createdAt`), потому что в dev-обходе заката
    // плана может не быть вовсе и `existing.createdAt` ронял активацию.
    // Сторожим правило, а не устаревший синтаксис.
    expect(state).toMatch(/createdAt:\s*existing\??\.createdAt/);
    expect(activation).toMatch(/activatePendingPersonalPlanAfterPremium[\s\S]*activatePersonalPlan\(/);
  });

  test('renders a static accessible notice with exact shutdown copy and a stable timer', () => {
    const notice = read('components/PersonalPlanSunsetNotice.tsx');
    const screen = read('app/personal_plan.tsx');
    expect(notice).toContain('Раздел «Планы» будет отключён 20 октября 2026 в 00:00 UTC');
    expect(notice).toContain('accessibilityLabel');
    expect(notice).not.toContain('accessibilityLiveRegion');
    expect(notice).toContain("fontVariant: ['tabular-nums']");
    expect(screen).toContain('<PersonalPlanSunsetNotice');
    expect(screen).toContain('setInterval');
    expect(screen).toContain('clearInterval');
  });

  test('ticks the visible countdown without durable storage I/O every second', () => {
    const screen = read('app/personal_plan.tsx');
    expect(screen).toContain('peekPersonalPlanSunsetEffectiveNow');
    expect(screen).toContain('PERSONAL_PLAN_SUNSET_CLOCK_REFRESH_MS');
    expect(screen).toContain('sunsetClockRefreshInFlightRef');
    expect(screen).not.toMatch(/setInterval\(\(\)\s*=>\s*\{\s*void\s+tick\(\);\s*\},\s*1_000\)/);
  });

  test('keeps local grandfather eligibility live after an initially hidden tab', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).toMatch(/onAppEvent\(["']personal_plan_updated["']/);
    expect(lessons).toContain('Math.min(remainingMs, 60_000)');
    expect(lessons).toContain('const localAccess = resolvePersonalPlanSunsetAccess');
    expect(lessons).toContain('if (localAccess.status !== "allowed")');
    expect(lessons).toContain('if (shouldPoll) scheduleEligibilityRefresh(effectiveNowMs)');
  });
});

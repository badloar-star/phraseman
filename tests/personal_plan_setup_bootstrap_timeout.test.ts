import fs from 'fs';
import path from 'path';
import {
  PERSONAL_PLAN_SETUP_BOOTSTRAP_TIMEOUT_MS,
  racePersonalPlanSetupBootstrap,
} from '../app/personal_plan_setup_bootstrap';

describe('personal plan setup bootstrap', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('fails open to setup defaults when storage never settles', async () => {
    jest.useFakeTimers();
    const fallback = [null, []] as const;
    const resultPromise = racePersonalPlanSetupBootstrap(
      new Promise<readonly [unknown, readonly [string, string | null][]]>(() => {}),
      fallback,
    );

    await jest.advanceTimersByTimeAsync(PERSONAL_PLAN_SETUP_BOOTSTRAP_TIMEOUT_MS);

    await expect(resultPromise).resolves.toBe(fallback);
  });

  it('returns hydrated answers when storage wins the deadline', async () => {
    type BootstrapResult = readonly [
      { planId: string } | null,
      readonly (readonly [string, string | null])[],
    ];
    const hydrated: BootstrapResult = [
      { planId: 'voyazh' },
      [['onboarding_plan_goal', 'travel']],
    ];
    const fallback: BootstrapResult = [null, []];

    await expect(racePersonalPlanSetupBootstrap(Promise.resolve(hydrated), fallback))
      .resolves.toBe(hydrated);
  });

  it('renders an accessible nonblank loading state with an escape route', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'personal_plan_setup.tsx'), 'utf8');
    const loadingStart = source.indexOf('if (!answersReady) {');
    const loadingBlock = source.slice(loadingStart, loadingStart + 1800);

    expect(source).toContain('racePersonalPlanSetupBootstrap(');
    expect(loadingBlock).toContain('ActivityIndicator');
    expect(loadingBlock).toContain('accessibilityLabel=');
    expect(loadingBlock).toContain('safeRouterBack(router, exitFallback)');
    expect(loadingBlock).not.toContain('return <View style={[styles.safe, { backgroundColor: screenBg }]} />;');
    expect(source).toContain('if (!alive) return;');
    expect(source).toContain('if (alive) setAnswersReady(true);');
  });
});

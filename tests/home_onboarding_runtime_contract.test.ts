import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');
const rootLayout = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
const events = fs.readFileSync(path.join(ROOT, 'app', 'events.ts'), 'utf8');

describe('hidden Home runtime behind onboarding', () => {
  it('does not give Home runtime ownership until onboarding is complete', () => {
    expect(home).toContain('const [homeOnboardingDone, setHomeOnboardingDone] = useState(false)');
    expect(home).toContain('useRuntimeActive(isHomeOwner && homeOnboardingDone)');
    expect(home).not.toContain('useRuntimeActive(isHomeOwner);');
    expect(home).toContain('HOME_ONBOARDING_DONE_KEY');
    expect(home).toContain('AsyncStorage.multiGet([HOME_FEATURE_TIPS_INDEX_KEY, HOME_FEATURE_TIPS_DONE_KEY, HOME_FEATURE_TIPS_REPLAY_COUNT_KEY, HOME_ONBOARDING_DONE_KEY])');
    expect(home).toContain("setHomeOnboardingDone(stored.get(HOME_ONBOARDING_DONE_KEY) === '1')");
  });

  it('gates hidden prefetch, below-fold mounting, animations and the crown request', () => {
    const prefetchEffect = home.slice(
      home.indexOf('void prefetchTrainerPracticeSnapshot({'),
      home.indexOf('const appSnapshot =', home.indexOf('void prefetchTrainerPracticeSnapshot({')),
    );
    expect(prefetchEffect).toContain('homeRuntimeActive');

    const belowFoldEffect = home.slice(
      home.indexOf('const [belowFoldReady'),
      home.indexOf('perfScreenMount', home.indexOf('const [belowFoldReady')),
    );
    expect(belowFoldEffect).toContain('if (!homeRuntimeActive) return undefined');

    const crownEffect = home.slice(
      home.indexOf('if (!homeRuntimeActive || homeLeagueCrownLoadedRef.current)'),
      home.indexOf('/** Подсказка по блоку статистики', home.indexOf('if (!homeRuntimeActive || homeLeagueCrownLoadedRef.current)')),
    );
    expect(crownEffect).toContain('[homeRuntimeActive]');
  });

  it('wakes the preserved Home tree only after CleanOnboarding persisted completion', () => {
    expect(events).toContain('onboarding_completed: undefined');
    expect(rootLayout).toContain("emitAppEvent('onboarding_completed')");
    expect(home).toContain("onAppEvent('onboarding_completed'");
    expect(home).toContain('setHomeOnboardingDone(true)');
    const finishStart = rootLayout.indexOf('const handleOnboardingDone = useCallback(async () => {');
    const finishBody = rootLayout.slice(finishStart, finishStart + 8000);
    expect(finishBody.indexOf('setShow(false)')).toBeLessThan(finishBody.indexOf("emitAppEvent('onboarding_completed')"));
  });
});

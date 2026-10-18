import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');
const rootLayout = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
const events = fs.readFileSync(path.join(ROOT, 'app', 'events.ts'), 'utf8');

describe('hidden Home runtime behind onboarding', () => {
  it('does not give Home runtime ownership until onboarding is complete', () => {
    // зачем (HOME-COLD_cold1, 11.10): стартовое значение — одноразовый флаг, уже прочитанный корнем; «пройден» только при '1'.
    expect(home).toContain('const [homeOnboardingDone, setHomeOnboardingDone] = useState(() => takeOnboardingDonePeek() === true)');
    expect(rootLayout).toContain("rememberOnboardingDonePeek(val === '1')");
    // перепин R137 (18.10): Главная берёт активность через useRuntimeActiveSettled — тот же useRuntimeActive с отсрочкой активации до конца перехода после возврата с экрана стека; условие владения прежнее
    expect(home).toContain('useRuntimeActiveSettled(isHomeOwner && homeOnboardingDone)');
    expect(home).not.toContain('useRuntimeActive(isHomeOwner);');
    expect(home).not.toContain('useRuntimeActiveSettled(isHomeOwner);');
    expect(home).toContain('HOME_ONBOARDING_DONE_KEY');
    expect(home).toContain('AsyncStorage.multiGet([HOME_FEATURE_TIPS_INDEX_KEY, HOME_FEATURE_TIPS_DONE_KEY, HOME_FEATURE_TIPS_REPLAY_COUNT_KEY, HOME_ONBOARDING_DONE_KEY])');
    expect(home).toContain("setHomeOnboardingDone(stored.get(HOME_ONBOARDING_DONE_KEY) === '1')");
  });

  it('gates hidden prefetch, below-fold mounting, animations and the crown request', () => {
    // 30.09: скрытый прогрев тренажёра удалён вместе со старым тренажёром (4ccd8c4f4, 21.08) —
    // за онбордингом Главной больше нечего прогревать.
    expect(home).not.toContain('prefetchTrainerPracticeSnapshot');

    const belowFoldEffect = home.slice(
      home.indexOf('const [belowFoldReady'),
      home.indexOf('perfScreenMount', home.indexOf('const [belowFoldReady')),
    );
    expect(belowFoldEffect).toContain('if (!homeRuntimeActive) return undefined');

    // 30.09: Лиги удалены (D78) — запроса короны лиги на Главной больше нет.
    expect(home).not.toContain('homeLeagueCrownLoadedRef');
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

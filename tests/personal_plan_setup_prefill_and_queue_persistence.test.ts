import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan setup prefill + pending-queue persistence (3 related fixes)', () => {
  const setupSource = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_setup.tsx'), 'utf8');
  const homeSource = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

  it('FIX 1: activating a plan marks the next navigation as replace before leaving setup', () => {
    const start = setupSource.indexOf('const activate = async (planId: PersonalPlanId) => {');
    expect(start).toBeGreaterThan(-1);
    const idx = setupSource.indexOf("router.replace('/personal_plan' as any)", start);
    expect(idx).toBeGreaterThan(-1);
    const before = setupSource.slice(Math.max(start, idx - 400), idx);
    expect(before).toContain('markNextNavigationAsReplace()');
    expect(setupSource).toContain("import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back'");
  });

  it('FIX 2: home no longer wipes the pending plan-activation queue when premium is missing', () => {
    const start = homeSource.indexOf('Самовосстановление личного плана');
    expect(start).toBeGreaterThan(-1);
    const block = homeSource.slice(start, start + 2200);
    expect(block).toContain('readPendingPersonalPlanActivation()');
    expect(block).toContain('activatePendingPersonalPlanAfterPremium()');
    // Раньше здесь был безусловный clearPendingPersonalPlanActivation() в else-ветке
    // без премиума — это стирало отложенную активацию навсегда. Теперь его там быть
    // не должно, а импорт clearPendingPersonalPlanActivation в home.tsx не нужен.
    expect(block).not.toContain('clearPendingPersonalPlanActivation()');
    expect(homeSource).not.toContain('clearPendingPersonalPlanActivation');
  });

  it('FIX 3: setup screen reads saved onboarding answers and the pending activation queue on mount', () => {
    expect(setupSource).toContain("import { readPendingPersonalPlanActivation } from './personal_plan_activation'");
    expect(setupSource).toContain("'onboarding_plan_goal'");
    expect(setupSource).toContain("'onboarding_plan_level'");
    expect(setupSource).toContain("'onboarding_plan_minutes'");
    expect(setupSource).toContain('readPendingPersonalPlanActivation()');
  });

  it('FIX 3: starts directly at the result step when all three answers or a pending activation exist', () => {
    expect(setupSource).toContain("if ((hasGoal && hasLevel && hasMinutes) || pending != null) {");
    const idx = setupSource.indexOf("if ((hasGoal && hasLevel && hasMinutes) || pending != null) {");
    const block = setupSource.slice(idx, idx + 120);
    expect(block).toContain("setStep('result')");
  });

  it('FIX 3: still allows stepping back from result through minutes/level/goal (no dead end)', () => {
    expect(setupSource).toContain("const canGoBack = step !== 'goal' && !directToPlans;");
    expect(setupSource).toContain("if (step === 'level') setStep('goal');");
    expect(setupSource).toContain("else if (step === 'minutes') setStep('level');");
    expect(setupSource).toContain("else if (step === 'result') setStep('minutes');");
  });

  it('FIX 3: does not render the goal step before saved-answers read resolves (anti-flicker)', () => {
    expect(setupSource).toContain('const [answersReady, setAnswersReady] = useState(directToPlans);');
    expect(setupSource).toContain('if (!answersReady) {');
    const idx = setupSource.indexOf('if (!answersReady) {');
    const block = setupSource.slice(idx, idx + 200);
    expect(block).toContain('return <View style={[styles.safe, { backgroundColor: screenBg }]} />;');
  });

  it('FIX 3: does not weaken the premium gate on activation', () => {
    expect(setupSource).toContain('if (!canActivatePlan({ hasPremiumAccess })) {');
    const idx = setupSource.indexOf('if (!canActivatePlan({ hasPremiumAccess })) {');
    const block = setupSource.slice(idx, idx + 200);
    expect(block).toContain("pathname: '/premium_modal'");
  });
});

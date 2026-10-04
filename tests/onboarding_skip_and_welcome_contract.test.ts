import fs from 'fs';
import path from 'path';

const onboarding = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');
const flags = fs.readFileSync(path.join(process.cwd(), 'app', 'remote_flags.ts'), 'utf8');
const legacy = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');

// зачем: владелец (2026-07-26) — «Пропустить» на каждом экране кроме оплаты.
// Фича обязана оставаться выключаемой из админки без релиза, а «Пропустить» —
// не появляться на пейволе, иначе это прямой удар по конверсии.
describe('Onboarding skip link', () => {
  // 2026-08-17: privacy и notifications тоже без «Пропустить» — у них уже есть
  // своя серая ссылка («Позже» / «Не сейчас»), вторая подряд читалась бы дублем.
  // 2026-08-17b: trialReminder тоже без «Пропустить»: он стоит после «name»,
  // поэтому общий переход на обязательный шаг выглядел бы как шаг НАЗАД.
  it('is hidden on the paywall, the mandatory step and screens with their own grey exit', () => {
    expect(onboarding).toContain("const SKIP_HIDDEN_STEPS: readonly CleanOnboardingStep[] = ['onboardingPaywall', 'name', 'privacy', 'notifications', 'trialReminder']");
    expect(onboarding).toContain('if (!skip || SKIP_HIDDEN_STEPS.includes(step)) return null');
  });

  it('jumps straight to the mandatory consent step and guards double taps', () => {
    expect(onboarding).toContain('go(MANDATORY_ONBOARDING_STEP)');
    // На «name» и ПОСЛЕ него (trialReminder/пейвол) пропуск — no-op: иначе он вёл бы назад.
    expect(onboarding).toContain('if (skippedRef.current || enabledOrder.indexOf(step) >= enabledOrder.indexOf(MANDATORY_ONBOARDING_STEP)) return;');
  });

  it('is killable from the admin without a release', () => {
    expect(flags).toContain("| 'onboarding_skip_enabled'");
    expect(flags).toContain('onboarding_skip_enabled: true');
    expect(onboarding).toContain("getRemoteBool('onboarding_skip_enabled')");
    // null в контексте = ссылки нет вовсе, а не «есть, но не работает».
    expect(onboarding).toContain('skipEnabled ? skipOnboarding : null');
  });

  it('records the skip once so the admin can show a percentage', () => {
    expect(onboarding).toContain("trackActivity('onboarding_skip'");
    expect(onboarding).toContain('writeToFirestore: true');
  });
});

describe('Admin controls for onboarding behaviour', () => {
  it('exposes both kill switches in the working admin panel', () => {
    expect(legacy).toContain("saveOnboardingBehaviourFlag('onboarding_skip_enabled'");
    expect(legacy).toContain('window.saveControlPanelBool(key, next)');
  });

  it('rolls the toggle back when the write fails', () => {
    expect(legacy).toContain('if (input) input.checked = !next;');
  });

  // зачем (04.10): процент пропусков онбординга снят в 2.0 (карточка теперь «n/a»: честного
  // знаменателя без серверной воронки нет) — сторож на подсчёт по onboarding_skip удалён
  it('keeps the skip counter card in the onboarding exits summary', () => {
    expect(legacy).toContain("['Пропустили онбординг'");
  });
});

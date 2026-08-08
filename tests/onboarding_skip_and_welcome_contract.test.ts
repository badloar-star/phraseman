import fs from 'fs';
import path from 'path';

const onboarding = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');
const sheet = fs.readFileSync(path.join(process.cwd(), 'components', 'OnboardingWelcomeSheet.tsx'), 'utf8');
const flags = fs.readFileSync(path.join(process.cwd(), 'app', 'remote_flags.ts'), 'utf8');
const legacy = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');
const host = fs.readFileSync(path.join(process.cwd(), 'components', 'OnboardingWelcomeHost.tsx'), 'utf8');
const rootLayout = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');

// зачем: владелец (2026-07-26) — «Пропустить» на каждом экране кроме оплаты и
// приветственная шторка после онбординга. Обе фичи обязаны оставаться
// выключаемыми из админки без релиза, а «Пропустить» — не появляться на пейволе,
// иначе это прямой удар по конверсии.
describe('Onboarding skip link', () => {
  it('is hidden on the paywall and on the mandatory final step', () => {
    expect(onboarding).toContain("const SKIP_HIDDEN_STEPS: readonly CleanOnboardingStep[] = ['onboardingPaywall', 'name']");
    expect(onboarding).toContain('if (!skip || SKIP_HIDDEN_STEPS.includes(step)) return null');
  });

  it('jumps straight to the mandatory consent step and guards double taps', () => {
    expect(onboarding).toContain('go(MANDATORY_ONBOARDING_STEP)');
    expect(onboarding).toContain('if (skippedRef.current || step === MANDATORY_ONBOARDING_STEP) return;');
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

describe('Onboarding welcome sheet', () => {
  it('reuses the shared sheet shell instead of a new modal', () => {
    expect(sheet).toContain("import ReferralSheetShell from './referral_sheet_shell'");
  });

  // зачем: владелец (2026-07-27) — «модал должен быть не на этом экране, а когда
  // открылся экран главной». Онбординг больше НЕ рисует шторку и не держит onDone:
  // он ставит одноразовый флаг и сразу отпускает управление.
  it('never renders the sheet itself — onboarding only raises a one-shot flag', () => {
    expect(onboarding).not.toContain('OnboardingWelcomeSheet');
    expect(onboarding).not.toContain('welcomeSheetVisible');
    expect(onboarding).toContain('await markOnboardingWelcomePending();');
  });

  it('releases the app immediately, on both flag branches', () => {
    // onDone() стоит ПОСЛЕ if-а, а не внутри else — управление отдаётся всегда.
    expect(onboarding).toMatch(/if \(welcomeSheetEnabled\) \{[\s\S]*?\}\s*onDone\(\);/);
  });

  it('is raised over Home through the arbiter, not with a private visible', () => {
    expect(rootLayout).toContain('<OnboardingWelcomeHost />');
    // Первый в OVERLAY_PRIORITY — новичок видит приветствие раньше наград/update.
    expect(host).toContain("useOverlayVisible('onboardingWelcome', wantShow)");
  });

  it('shows once: the pending flag is cleared when the sheet closes', () => {
    expect(host).toContain('clearOnboardingWelcomePending()');
  });

  it('falls back to the old behaviour when disabled from the admin', () => {
    expect(flags).toContain("| 'onboarding_welcome_sheet_enabled'");
    expect(flags).toContain('onboarding_welcome_sheet_enabled: true');
    expect(onboarding).toContain('if (welcomeSheetEnabled) {');
    // Рубильник проверяется и в хосте — выключили после установки флага → шторки нет.
    expect(host).toContain("getRemoteBool('onboarding_welcome_sheet_enabled')");
  });

  it('greets without a name rather than inventing one', () => {
    // На последнем шаге имени нет (возраст + согласия), ник генерируется позже.
    expect(sheet).toContain("return name ? `Спасибо, ${name}!` : 'Спасибо!';");
  });

  // зачем: владелец (2026-07-27) — «план собран под твои ответы» врёт, никакого
  // персонального плана мы не собираем. Только благодарность + совет.
  it('does not promise a personal plan it never built', () => {
    expect(sheet).not.toContain('план собран');
    expect(sheet).toContain('Спасибо, что установил приложение.');
  });

  it('respects the owner design bans: no borders, weights only 400/700', () => {
    expect(sheet).not.toMatch(/borderWidth|borderColor/);
    const weights = [...sheet.matchAll(/fontWeight: '(\d+)'/g)].map((m) => m[1]);
    expect(weights.length).toBeGreaterThan(0);
    expect([...new Set(weights)].sort()).toEqual(['400', '700']);
  });
});

describe('Admin controls for onboarding behaviour', () => {
  it('exposes both kill switches in the working admin panel', () => {
    expect(legacy).toContain("saveOnboardingBehaviourFlag('onboarding_skip_enabled'");
    expect(legacy).toContain("saveOnboardingBehaviourFlag('onboarding_welcome_sheet_enabled'");
    expect(legacy).toContain('window.saveControlPanelBool(key, next)');
  });

  it('rolls the toggle back when the write fails', () => {
    expect(legacy).toContain('if (input) input.checked = !next;');
  });

  it('shows the skip percentage without extra Firestore queries', () => {
    expect(legacy).toContain("['Пропустили онбординг'");
    expect(legacy).toContain("r.action === 'onboarding_skip'");
    // Проценты считаем по уникальным пользователям, а не по сырым событиям.
    expect(legacy).toContain('const uniqUsers = (list) =>');
  });
});

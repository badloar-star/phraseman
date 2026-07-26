import fs from 'fs';
import path from 'path';

const onboarding = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');
const sheet = fs.readFileSync(path.join(process.cwd(), 'components', 'OnboardingWelcomeSheet.tsx'), 'utf8');
const flags = fs.readFileSync(path.join(process.cwd(), 'app', 'remote_flags.ts'), 'utf8');
const legacy = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');

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

  it('defers onDone until the sheet closes, exactly once', () => {
    expect(onboarding).toContain('setWelcomeSheetVisible(true)');
    expect(onboarding).toContain('if (welcomeDoneRef.current) return;');
    expect(onboarding).toContain('welcomeDoneRef.current = true;');
  });

  it('falls back to the old behaviour when disabled from the admin', () => {
    expect(flags).toContain("| 'onboarding_welcome_sheet_enabled'");
    expect(flags).toContain('onboarding_welcome_sheet_enabled: true');
    expect(onboarding).toContain('if (welcomeSheetEnabled) {');
    // CRLF-безопасно: важен сам факт else-ветки с прямым onDone().
    expect(onboarding).toMatch(/\}\s*else\s*\{\s*onDone\(\);\s*\}/);
  });

  it('greets without a name rather than inventing one', () => {
    // На последнем шаге имени нет (возраст + согласия), ник генерируется позже.
    expect(sheet).toContain("return name ? `Спасибо, ${name}!` : 'Спасибо!';");
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

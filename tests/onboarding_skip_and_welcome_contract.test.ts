import fs from 'fs';
import path from 'path';

const onboarding = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');
const flags = fs.readFileSync(path.join(process.cwd(), 'app', 'remote_flags.ts'), 'utf8');
const legacy = fs.readFileSync(path.join(process.cwd(), 'admin', 'legacy.html'), 'utf8');
const rootLayout = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
const welcomeGift = fs.readFileSync(path.join(process.cwd(), 'app', 'welcome_gift.ts'), 'utf8');

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

// зачем (PM-049, D09/S51 владельца, 2026-09-24): «бонус входа» больше не
// прерывает первый вход праздничной модалкой — WelcomeGiftModal,
// OnboardingWelcomeHost и onboarding_welcome_state.ts удалены целиком.
// Контракт сторожит то, что осталось: деньги (+100 жемчужин, +300 рун)
// НЕ пропали — welcome_gift.ts начисляет их молча, вызванный напрямую из
// bootstrap _layout.tsx, без модалки/флага/хоста.
describe('Welcome gift keeps crediting silently after the ceremony was removed', () => {
  it('onboarding no longer raises any pending flag or renders the ceremony', () => {
    expect(onboarding).not.toContain('WelcomeGiftModal');
    expect(onboarding).not.toContain('markOnboardingWelcomePending');
    expect(onboarding).not.toContain('welcomeSheetEnabled');
  });

  it('layout grants the gift directly on bootstrap, not through a host/modal', () => {
    expect(rootLayout).not.toContain('<OnboardingWelcomeHost />');
    expect(rootLayout).not.toContain('raiseWelcomeGiftForExistingUserIfEligible');
    expect(rootLayout).toContain('void ensureWelcomeGiftGranted();');
    expect(rootLayout).toContain("import { ensureWelcomeGiftGranted } from './welcome_gift';");
  });

  it('grant amounts and per-account idempotency are unchanged', () => {
    expect(welcomeGift).toContain('export const WELCOME_GIFT_PEARLS = 100;');
    expect(welcomeGift).toContain('export const WELCOME_GIFT_RUNES = 300;');
    expect(welcomeGift).toContain('export async function ensureWelcomeGiftGranted(): Promise<void>');
  });

  it('admin kill switch for the removed ceremony/grant still exists as a flag (harmless if unused elsewhere)', () => {
    expect(flags).toContain("| 'onboarding_welcome_sheet_enabled'");
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

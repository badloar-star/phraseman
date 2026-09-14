import fs from 'fs';
import path from 'path';

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

const PAYWALL_AUDIO_EVENT_IDS = [
  'pm.paywall.plan_select',
  'pm.paywall.trial_highlight',
  'pm.paywall.promo_reveal',
  'pm.premium.modal_open',
  'pm.promo.code_applied',
  'pm.promo.code_rejected',
  'pm.purchase.failed',
  'pm.purchase.restored',
  'pm.purchase.start',
  'pm.purchase.success',
  'pm.subscription.manage_open',
] as const;

describe('paywall surfaces stay silent', () => {
  it('has no direct sound dispatches in subscription and promo surfaces', () => {
    const directSoundSurfaces = [
      'app/paywall_purchase.ts',
      'app/premium_modal.tsx',
      'app/promo_code_entry.tsx',
      'app/manage_subscription.tsx',
      'components/paywall/PaywallTrialTimeline.tsx',
    ];

    for (const file of directSoundSurfaces) {
      const source = read(file);
      expect(source).not.toContain('soundDirector');
      expect(source).not.toContain("scope: 'paywall'");
    }
  });

  it('does not bundle dedicated paywall audio events', () => {
    const eventCatalog = read('modules/audio/sound_events.ts');

    for (const eventId of PAYWALL_AUDIO_EVENT_IDS) {
      expect(eventCatalog).not.toContain(`'${eventId}'`);
    }
  });

  it('skips the generic onboarding step sound when the next step is the paywall', () => {
    const onboarding = read('components/CleanOnboarding.tsx');
    const stepSound = "soundDirector.request('pm.onboarding.step'";
    const guard = "if (step !== 'onboardingPaywall')";

    expect(onboarding).toContain(guard);
    expect(onboarding.indexOf(guard)).toBeLessThan(onboarding.indexOf(stepSound));
  });

  it('keeps shard paywall button feedback haptic-only', () => {
    const pressable = read('components/PressableHybrid.tsx');
    const themePaywall = read('app/ThemeShardPaywallModal.tsx');
    const cardPackPaywall = read('app/flashcards/CardPackShardPaywallModal.tsx');

    expect(pressable).toContain('withSound?: boolean');
    expect(pressable).toMatch(/if \(!silent && withHaptic && withSound\)\s*\{/u);
    expect(themePaywall).toContain('withSound={false}');
    expect(cardPackPaywall).toContain('withSound={false}');
  });
});

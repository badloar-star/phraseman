import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'),
  'utf8',
);

describe('onboarding notification skip interaction', () => {
  it('defers the native Alert action until the dialog dismissal interaction is finished', () => {
    expect(source).toContain('const continueAfterNotificationDialog = useCallback(() => {');
    expect(source).toContain("InteractionManager.runAfterInteractions(() => go('name'))");
    expect(source).toContain("style: 'cancel', onPress: continueAfterNotificationDialog");
  });

  it('persists the visible notification skip before continuing', () => {
    expect(source).toContain('testID="onboarding-notifications-skip"');
    expect(source).toContain('void skipPracticeNotification()');
    expect(source).toContain("await setOnboardingNotificationChoice('skip')");
  });

  it('uses the current device time and explains the trial reminder', () => {
    expect(source).toContain('<Text style={styles.phoneClock}>{timeLabel}</Text>');
    expect(source).not.toContain('<Text style={styles.phoneClock}>9:41</Text>');
    expect(source).toContain('Попробуй Plus бесплатно ${trialDays} ${pluralDays(trialDays)}.');
  });

  it('persists allow/blocked outcomes and conditions reminder copy on the choice', () => {
    expect(source).toContain("await setOnboardingNotificationChoice('allow')");
    expect(source).toContain("await setOnboardingNotificationChoice('blocked')");
    expect(source).toContain("notificationChoice === 'allow'");
  });
});

describe('onboarding notification prompt consumers', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
  const purchase = fs.readFileSync(path.join(process.cwd(), 'app', 'paywall_purchase.ts'), 'utf8');

  it('root completion respects the persisted choice', () => {
    expect(layout).toContain('readOnboardingNotificationChoice()');
    expect(layout).toContain('shouldPromptForOnboardingNotifications(notificationChoice)');
  });

  it('both onboarding purchase sources respect skip/blocked', () => {
    expect(purchase).toContain('ONBOARDING_PURCHASE_SOURCES.has(source)');
    expect(purchase).toContain("reminderChoice === 'skip' || reminderChoice === 'blocked'");
  });
});

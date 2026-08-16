import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'),
  'utf8',
);

describe('onboarding notification skip interaction', () => {
  it('defers the native Alert action until the dialog dismissal interaction is finished', () => {
    expect(source).toContain('const continueAfterNotificationDialog = useCallback(() => {');
    expect(source).toContain("InteractionManager.runAfterInteractions(() => go('trialReminder'))");
    expect(source).toContain("style: 'cancel', onPress: continueAfterNotificationDialog");
  });

  it('keeps the visible notification skip button directly interactive', () => {
    expect(source).toContain('testID="onboarding-notifications-skip"');
    expect(source).toContain("onPress={() => go('trialReminder')}");
  });
});

import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

describe('Settings account deletion immediate clean-onboarding handoff', () => {
  test('closes and clears the native dialog before mounting onboarding, without awaiting completion', () => {
    const modal = read('components/DeleteAccountConfirmModal.tsx');
    const successStart = modal.indexOf("soundDirector.request('pm.system.destructive_done'");
    const successEnd = modal.indexOf('    } catch {', successStart);
    const success = modal.slice(successStart, successEnd);

    expect(successStart).toBeGreaterThan(-1);
    expect(modal).toContain('const res = await beginAccountDeletion();');
    expect(modal).not.toContain('await res.completion');
    expect(modal).not.toContain('await handoff.completion');
    expect(success).toContain('setDeleting(false);');
    expect(success).toContain('deleteInFlightRef.current = false;');
    expect(success.indexOf('setDeleting(false);')).toBeLessThan(success.indexOf('onRequestClose();'));
    expect(success.indexOf('onRequestClose();')).toBeLessThan(success.indexOf("emitAppEvent('account_deleted')"));
    expect(success.indexOf("emitAppEvent('account_deleted')"))
      .toBeLessThan(success.indexOf('setTimeout(() => {'));
  });

  test('the root event destroys every native account/settings presentation before mounting onboarding', () => {
    const layout = read('app/_layout.tsx');
    const modal = read('components/DeleteAccountConfirmModal.tsx');
    const settings = read('app/(tabs)/settings.tsx');
    const eventStart = layout.indexOf("const subDelete = onAppEvent('account_deleted'");
    const eventEnd = layout.indexOf('    });', eventStart);
    const eventHandler = layout.slice(eventStart, eventEnd);

    expect(settings).toContain('visible={deleteAccountModalVisible}');
    expect(settings).toContain('onRequestClose={() => setDeleteAccountModalVisible(false)}');
    expect(eventHandler).toContain('setOnboardingStartAtName(false);');
    expect(eventHandler).toContain('setOnboardingPaywallActive(false);');
    expect(eventHandler).toContain('setAccountDeletionNavigationEpoch((value) => value + 1);');
    expect(eventHandler).toContain('router.dismissAll();');
    expect(eventHandler).toContain("router.replace('/(tabs)/home' as never);");
    expect(eventHandler.indexOf('setAccountDeletionNavigationEpoch((value) => value + 1);'))
      .toBeLessThan(eventHandler.indexOf('setShow(true);'));
    expect(eventHandler.indexOf("router.replace('/(tabs)/home' as never);"))
      .toBeLessThan(eventHandler.indexOf('setShow(true);'));
    expect(eventHandler.indexOf('router.dismissAll();'))
      .toBeLessThan(eventHandler.indexOf("router.replace('/(tabs)/home' as never);"));
    expect(eventHandler).toContain('setShow(true);');
    expect(layout).toContain('<Stack\n      key={`account-generation-${accountDeletionNavigationEpoch}`}');
    expect(layout).toContain('{ready && effectiveShowOnboarding && (');
    expect(layout).toContain('<Onboarding');
    expect(layout).toContain('startAtNameStep={onboardingStartAtName}');
    expect(modal).not.toContain("import { router } from 'expo-router';");
    expect(modal).not.toContain('router.dismissAll');
    expect(modal).not.toContain("router.replace('/(tabs)/home'");
  });
});

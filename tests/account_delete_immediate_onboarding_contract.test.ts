import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const root = path.join(__dirname, '..');
const read = (relative: string): string => normalizeEol(fs.readFileSync(path.join(root, relative), 'utf8'));

describe('Settings account deletion immediate clean-onboarding handoff', () => {
  test('closes and clears the native dialog before mounting onboarding, without awaiting completion', () => {
    const modal = read('components/DeleteAccountConfirmModal.tsx');
    const successStart = modal.indexOf("soundDirector.request('pm.system.destructive_done'");
    const successEnd = modal.indexOf('    } catch {', successStart);
    const success = modal.slice(successStart, successEnd);

    expect(successStart).toBeGreaterThan(-1);
    // зачем (вариант Б, 25.10): «Удалить навсегда сейчас» — та же быстрая фаза через beginAccountDeletionNow; ждём только её.
    expect(modal).toContain("const attemptHandoff = async (): Promise<DeleteAccountHandoff> => (mode === 'now' ? await beginAccountDeletionNow() : await beginAccountDeletion());");
    expect(modal).toContain('const res = variantB ? await retryAccountDeleteHandoffQuietly(attemptHandoff, mode) : await attemptHandoff();');
    expect(modal).not.toContain('await res.completion');
    expect(modal).not.toContain('await handoff.completion');
    expect(success).toContain('setDeleting(false);');
    expect(success).toContain('deleteInFlightRef.current = false;');
    expect(success.indexOf('setDeleting(false);')).toBeLessThan(success.indexOf('onRequestClose();'));
    expect(success.indexOf('onRequestClose();')).toBeLessThan(success.indexOf("emitAppEvent('account_deleted')"));
    // зачем (координатор §46, 2026-10-01): отложенное окно «аккаунт удалён» через
    // setTimeout снято (правило владельца: уведомлений об удалении не показывать).
    // Контракт теперь обратный: после события корня ничего не откладывается.
    expect(success.indexOf("emitAppEvent('account_deleted')")).toBeGreaterThan(-1);
    expect(success).not.toContain('setTimeout(');
  });

  test('the root event destroys every native account/settings presentation before mounting onboarding', () => {
    const layout = read('app/_layout.tsx');
    const modal = read('components/DeleteAccountConfirmModal.tsx');
    const settings = read('app/(tabs)/settings.tsx');
    const eventStart = layout.indexOf("const subDelete = onAppEvent('account_deleted'");
    const eventEnd = layout.indexOf('    });', eventStart);
    const eventHandler = layout.slice(eventStart, eventEnd);

    // 12.10: недостижимый экземпляр удаления в Настройках убран (аудит COVERAGE_AUDIT_R1 §C);
    // удаление открывается только из «Аккаунта» (app/account_details.tsx).
    expect(settings).not.toContain('deleteAccountModalVisible');
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

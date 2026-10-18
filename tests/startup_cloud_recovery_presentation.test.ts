import {
  decideStartupCloudRecoveryPresentation,
  type StartupCloudRecoveryPresentation,
} from '../app/startup_cloud_recovery_presentation';
import fs from 'fs';
import path from 'path';

type FailureReason = Parameters<typeof decideStartupCloudRecoveryPresentation>[0]['failureReason'];

describe('startup cloud recovery presentation policy', () => {
  const transientReasons: FailureReason[] = [
    'app_check_unavailable',
    'identity_unavailable',
    'transport_unavailable',
  ];

  it.each(transientReasons)(
    'keeps %s silent for anonymous or otherwise unlinked sessions',
    failureReason => {
      expect(decideStartupCloudRecoveryPresentation({
        failureReason,
        hasLinkedProvider: false,
        hasLocalAccountData: false,
      })).toBe<StartupCloudRecoveryPresentation>('none');
    },
  );

  it.each(transientReasons)(
    'keeps %s silent when a linked session has meaningful local data',
    failureReason => {
      expect(decideStartupCloudRecoveryPresentation({
        failureReason,
        hasLinkedProvider: true,
        hasLocalAccountData: true,
      })).toBe<StartupCloudRecoveryPresentation>('none');
    },
  );

  it.each(transientReasons)(
    'shows a neutral cloud-unavailable toast for linked/no-local-data %s',
    failureReason => {
      expect(decideStartupCloudRecoveryPresentation({
        failureReason,
        hasLinkedProvider: true,
        hasLocalAccountData: false,
      })).toBe<StartupCloudRecoveryPresentation>('cloud_unavailable_toast');
    },
  );

  it.each([
    [false, false],
    [true, false],
    [true, true],
  ])(
    'keeps provider reauthentication modal-authoritative (linked=%s, local=%s)',
    (hasLinkedProvider, hasLocalAccountData) => {
      expect(decideStartupCloudRecoveryPresentation({
        failureReason: 'provider_reauth_required',
        hasLinkedProvider,
        hasLocalAccountData,
      })).toBe<StartupCloudRecoveryPresentation>('provider_reauth_modal');
    },
  );

  it('keeps an unclassified failure silent', () => {
    expect(decideStartupCloudRecoveryPresentation({
      failureReason: null,
      hasLinkedProvider: true,
      hasLocalAccountData: false,
    })).toBe<StartupCloudRecoveryPresentation>('none');
  });

  // зачем (правило владельца 18.10, матрица Сайта A12): прежний тост «Облако сейчас недоступно… открой позже» отменён — решение 'cloud_unavailable_toast'
  // по-прежнему вычисляется, но показывает его уже не тост, а тихий повтор восстановления в фоне (app/startup_restore_retry.ts).
  it('turns the cloud_unavailable decision into a silent background retry instead of a toast', () => {
    const layout = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8').replace(/\r\n/g, '\n');
    const start = layout.indexOf("recoveryPresentation === 'cloud_unavailable_toast'");
    expect(start).toBeGreaterThan(-1);
    const branch = layout.slice(start, start + 900);
    expect(branch).toContain('scheduleSilentStartupRestore(');
    expect(branch).not.toContain("emitAppEvent('action_toast'");
    expect(layout).not.toContain('Облако сейчас недоступно');
  });
});

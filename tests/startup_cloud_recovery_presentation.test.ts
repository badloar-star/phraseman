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

  it('tells linked users to retry on a later app open without promising an automatic retry', () => {
    const layout = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');
    const toastStart = layout.indexOf("recoveryPresentation === 'cloud_unavailable_toast'");
    const toastEnd = layout.indexOf('});', toastStart);
    const toastSource = layout.slice(toastStart, toastEnd);

    expect(toastStart).toBeGreaterThan(-1);
    expect(toastEnd).toBeGreaterThan(toastStart);
    expect(toastSource).toContain(
      'Облако сейчас недоступно. Откройте приложение позже, чтобы повторить восстановление.',
    );
    expect(toastSource).toContain(
      'La nube no está disponible ahora. Abre la aplicación más tarde para volver a intentar la restauración.',
    );
    expect(toastSource).not.toMatch(
      /автомат|автоматич|automáticamente|automaticamente|tự thử|otomatis|otomatik|automatycznie/i,
    );
  });
});

import type { CloudRestoreFailureReason } from './cloud_sync';

export type StartupCloudRecoveryPresentation =
  | 'none'
  | 'provider_reauth_modal'
  | 'cloud_unavailable_toast';

type StartupCloudRecoveryPresentationInput = Readonly<{
  failureReason: CloudRestoreFailureReason | null;
  hasLinkedProvider: boolean;
  hasLocalAccountData: boolean;
}>;

const TRANSIENT_CLOUD_FAILURES: ReadonlySet<CloudRestoreFailureReason> = new Set([
  'app_check_unavailable',
  'identity_unavailable',
  'transport_unavailable',
]);

export function decideStartupCloudRecoveryPresentation(
  input: StartupCloudRecoveryPresentationInput,
): StartupCloudRecoveryPresentation {
  if (input.failureReason === 'provider_reauth_required') return 'provider_reauth_modal';
  if (
    input.failureReason
    && TRANSIENT_CLOUD_FAILURES.has(input.failureReason)
    && input.hasLinkedProvider
    && !input.hasLocalAccountData
  ) {
    return 'cloud_unavailable_toast';
  }
  return 'none';
}

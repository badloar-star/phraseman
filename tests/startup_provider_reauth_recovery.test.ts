import fs from 'fs';
import path from 'path';
import { __cloudSyncTestHooks } from '../app/cloud_sync';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('startup provider reauthentication recovery', () => {
  const cloudSync = read('app/cloud_sync.ts');
  const layout = read('app/_layout.tsx');
  const authProvider = read('app/auth_provider.ts');
  const registrationPrompt = read('components/RegistrationPromptModal.tsx');
  const overlayCore = read('components/overlay_arbiter_core.ts');

  it('keeps a stable-owner mismatch distinct from generic identity and transport failures', () => {
    const hooks = __cloudSyncTestHooks as unknown as {
      classifyCloudAccessFailure?: (error: unknown, appCheckReady: boolean) => string;
      cloudRestoreFailureForStableLink?: (failure?: string) => string;
    };
    const classify = hooks.classifyCloudAccessFailure;
    const mapFailure = hooks.cloudRestoreFailureForStableLink;

    expect(classify).toEqual(expect.any(Function));
    expect(mapFailure).toEqual(expect.any(Function));
    if (typeof classify !== 'function' || typeof mapFailure !== 'function') return;

    expect(mapFailure(classify(
      { code: 'functions/permission-denied', message: 'stable_id_mismatch' },
      false,
    ))).toBe('provider_reauth_required');
    expect(mapFailure('stable_id_mismatch')).toBe('provider_reauth_required');
    expect(mapFailure('identity_unavailable')).toBe('identity_unavailable');
    expect(mapFailure('app_check_unavailable')).toBe('app_check_unavailable');
    expect(mapFailure('transport_unavailable')).toBe('transport_unavailable');
    expect(cloudSync).toContain("| 'provider_reauth_required'");
  });

  it('opens the existing provider modal once per boot instead of emitting a cloud toast', () => {
    expect(layout).toContain("import RegistrationPromptModal from '../components/RegistrationPromptModal';");
    expect(layout).toContain('const startupAuthRecoveryOfferedRef = useRef(false);');
    expect(layout).toContain("recoveryPresentation === 'provider_reauth_modal'");
    expect(layout).toContain('setStartupAuthRecoveryVisible(true);');
    expect(layout).toContain("useOverlayVisible('authRecovery', startupAuthRecoveryVisible)");
    expect(layout).toContain('<RegistrationPromptModal');
    expect(layout).toContain('context="startup_recovery"');

    const recoveryBranchStart = layout.indexOf("if (recoveryPresentation === 'provider_reauth_modal')");
    const recoveryElse = layout.indexOf('} else if (', recoveryBranchStart);
    const recoveryBranch = layout.slice(recoveryBranchStart, recoveryElse);
    expect(recoveryBranchStart).toBeGreaterThan(-1);
    expect(recoveryElse).toBeGreaterThan(recoveryBranchStart);
    expect(recoveryBranch).not.toContain("emitAppEvent('action_toast'");
  });

  it('requires the chosen provider to prove ownership of the persisted stable id', () => {
    expect(registrationPrompt).toContain("| 'startup_recovery'");
    expect(registrationPrompt).toContain("requireCurrentStableIdOwnership: context === 'startup_recovery'");
    expect(registrationPrompt).toContain("testID=\"auth-recovery-entry\"");
    expect(registrationPrompt).toContain('recoveryCopy.entry');

    expect(authProvider).toContain('requireCurrentStableIdOwnership?: boolean;');
    expect(authProvider).toContain('providerSignInInFlight.requireCurrentStableIdOwnership !== Boolean(options.requireCurrentStableIdOwnership)');
    expect(authProvider).toContain("return rejectRecoveryProviderMismatch(provider, 'linked_to_different_stable_id')");
    expect(authProvider).toContain("return rejectRecoveryProviderMismatch(provider, 'stable_owner_mismatch')");

    const helperStart = authProvider.indexOf('async function rejectRecoveryProviderMismatch');
    const helperEnd = authProvider.indexOf('export async function signInWithProvider', helperStart);
    const helper = authProvider.slice(helperStart, helperEnd);
    expect(helperStart).toBeGreaterThan(-1);
    expect(helper).toContain('await signOutCurrentProvider()');
    expect(helper).toContain('await ensureAnonUser()');
    expect(helper).not.toContain('clearStableId');
    expect(helper).not.toContain('setStableId');
    expect(helper).not.toContain('wipeLocalAccountData');
  });

  it('queues the recovery prompt as a native modal in the existing overlay arbiter', () => {
    expect(overlayCore).toContain("| 'authRecovery'");
    expect(overlayCore).toContain("  'authRecovery',");
    expect(overlayCore).toContain('authRecovery: false');
    const nativeStart = overlayCore.indexOf('export const NATIVE_MODAL_KEYS');
    const nativeEnd = overlayCore.indexOf(']);', nativeStart);
    expect(overlayCore.slice(nativeStart, nativeEnd)).toContain("'authRecovery'");
  });
});

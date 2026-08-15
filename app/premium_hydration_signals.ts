import {
  captureAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import {
  getAppSnapshot,
  subscribeAppSnapshot,
  type AppSnapshotProfile,
} from './app_snapshot_store';

export type PremiumHydrationSignal = Readonly<{
  initial: boolean;
  accountToken?: AccountGenerationToken;
  entitlementProfile?: AppSnapshotProfile;
}>;

export type PremiumHydrationSignalActions = Readonly<{
  invalidateStartup: () => void;
  resetForAccountTransition: () => void;
  invalidateForSnapshot: () => void;
  restartListener: () => void;
  reload: () => void;
}>;

function accountSignature(token: AccountGenerationToken): string | null {
  if (token.phase !== 'active' || !token.stableId) return null;
  return `${token.generation}:${token.stableId}`;
}

function entitlementSignature(profile: AppSnapshotProfile | undefined): string | null {
  if (!profile) return null;
  return JSON.stringify([
    profile.premiumActive,
    profile.premiumPlan ?? '',
    profile.vipActive,
    profile.vipLifetime ?? false,
  ]);
}

/**
 * Bridges the two boot signals PremiumProvider cannot safely assume are ready
 * at mount: canonical account activation and shared-snapshot hydration.
 * Current values are replayed after listeners are attached, closing both the
 * mount-before-hydration and hydration-before-effect races.
 */
export function subscribePremiumHydrationSignals(
  onSignal: (signal: PremiumHydrationSignal) => void,
): { remove: () => void } {
  let removed = false;
  let lastAccountSignature: string | null = null;
  let lastEntitlementSignature: string | null = null;

  const publishAccount = (token: AccountGenerationToken) => {
    if (removed) return;
    const signature = accountSignature(token);
    if (!signature || signature === lastAccountSignature) return;
    lastAccountSignature = signature;
    const entitlementProfile = getAppSnapshot().profile;
    const currentEntitlementSignature = entitlementSignature(entitlementProfile);
    lastEntitlementSignature = currentEntitlementSignature;
    onSignal({
      initial: false,
      accountToken: token,
      entitlementProfile: currentEntitlementSignature ? entitlementProfile : undefined,
    });
  };

  const publishSnapshot = () => {
    if (removed) return;
    if (!accountSignature(captureAccountGeneration())) return;
    const profile = getAppSnapshot().profile;
    const signature = entitlementSignature(profile);
    if (!profile || !signature || signature === lastEntitlementSignature) return;
    lastEntitlementSignature = signature;
    onSignal({ initial: false, entitlementProfile: profile });
  };

  const accountSubscription = subscribeAccountGeneration(publishAccount);
  const snapshotUnsubscribe = subscribeAppSnapshot(publishSnapshot);
  const initialAccount = captureAccountGeneration();
  const initialAccountSignature = accountSignature(initialAccount);
  const initialProfile = getAppSnapshot().profile;
  const initialEntitlementSignature = initialAccountSignature
    ? entitlementSignature(initialProfile)
    : null;
  lastAccountSignature = initialAccountSignature;
  lastEntitlementSignature = initialEntitlementSignature;
  onSignal({
    initial: true,
    accountToken: initialAccountSignature ? initialAccount : undefined,
    entitlementProfile: initialEntitlementSignature ? initialProfile : undefined,
  });

  return {
    remove: () => {
      if (removed) return;
      removed = true;
      accountSubscription.remove();
      snapshotUnsubscribe();
    },
  };
}

/**
 * Applies one provider refresh per signal. The synchronous initial replay can
 * contain both account and snapshot data, but it is deliberately treated as a
 * single startup invalidation/reload and does not restart a listener whose
 * mount effect has not run yet.
 */
export function applyPremiumHydrationSignal(
  signal: PremiumHydrationSignal,
  actions: PremiumHydrationSignalActions,
): void {
  if (signal.initial) {
    if (!signal.accountToken) return;
    actions.invalidateStartup();
    actions.reload();
    return;
  }

  if (signal.accountToken) {
    actions.resetForAccountTransition();
    actions.restartListener();
  } else if (signal.entitlementProfile) {
    actions.invalidateForSnapshot();
  } else {
    return;
  }
  actions.reload();
}

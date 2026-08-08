import type { ReferralDrainState, ReferralInvite } from './referral_cloud';

type RemotePolicyState = Readonly<{
  softEnabled: boolean;
  emergencyStop: boolean;
  remoteHydrated: boolean;
}>;

export function selectAccountScopedReferralState(
  currentAccountKey: string | null,
  stored: Readonly<{
    accountKey: string | null;
    invites?: ReferralInvite[];
    drain?: ReferralDrainState | null;
    spins?: number;
    referralCode?: string | null;
  }>,
): Readonly<{
  accountMatches: boolean;
  invites: ReferralInvite[];
  drain: ReferralDrainState | null;
  spins: number;
  referralCode: string | null;
}> {
  const accountMatches = !!currentAccountKey && stored.accountKey === currentAccountKey;
  if (!accountMatches) {
    return { accountMatches: false, invites: [], drain: null, spins: 0, referralCode: null };
  }
  return {
    accountMatches: true,
    invites: stored.invites ?? [],
    drain: stored.drain ?? null,
    spins: Math.max(0, Math.floor(Number(stored.spins) || 0)),
    referralCode: String(stored.referralCode ?? '').trim() || null,
  };
}

export function selectReferralSurfaceState(input: Readonly<{
  referralEnabled: boolean;
  remotePolicy: RemotePolicyState;
  persistedDrain: ReferralDrainState | null | undefined;
}>): Readonly<{
  softEnabled: boolean;
  emergencyStop: boolean;
  marketingVisible: boolean;
  drainVisible: boolean;
  rouletteAvailable: boolean;
  availableCreditCount: number;
}> {
  const effectivePolicy = !input.remotePolicy.remoteHydrated && input.persistedDrain
    ? input.persistedDrain
    : input.remotePolicy;
  const emergencyStop = effectivePolicy.emergencyStop === true;
  const softEnabled = effectivePolicy.softEnabled !== false;
  const activePendingCount = Math.max(0, input.persistedDrain?.activePendingCount ?? 0);
  const claimableQualifiedCount = Math.max(0, input.persistedDrain?.claimableQualifiedCount ?? 0);
  const persistedAvailable = Math.max(0, input.persistedDrain?.availableCreditCount ?? 0);
  const hasDrain = activePendingCount > 0 || claimableQualifiedCount > 0 || persistedAvailable > 0;
  const availableCreditCount = emergencyStop ? 0 : persistedAvailable;
  return {
    softEnabled,
    emergencyStop,
    marketingVisible: input.referralEnabled && softEnabled && !emergencyStop,
    drainVisible: input.referralEnabled && !softEnabled && !emergencyStop && hasDrain,
    rouletteAvailable: input.referralEnabled
      && !emergencyStop
      && (softEnabled || persistedAvailable > 0),
    availableCreditCount,
  };
}

export default function __RouteShim() { return null; }

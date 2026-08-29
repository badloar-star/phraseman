/**
 * MAX subscription commerce was retired in favour of server-verified,
 * non-expiring voice-minute consumables. These fail-closed stubs are kept only
 * for version-skewed imports; they never open billing, restore, or grant access.
 */

export type MaxSubscriptionResult = Readonly<{ status: 'unavailable' }>;

export async function loadMaxSubscriptionPackage(): Promise<undefined> {
  return undefined;
}

export async function purchaseMaxSubscription(): Promise<MaxSubscriptionResult> {
  return { status: 'unavailable' };
}

export async function restoreMaxSubscription(): Promise<MaxSubscriptionResult> {
  return { status: 'unavailable' };
}

export async function hasCurrentMaxSubscription(): Promise<false> {
  return false;
}

export async function confirmMaxSubscriptionActivation(): Promise<false> {
  return false;
}

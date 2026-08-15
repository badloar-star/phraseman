export type PendingPurchaseCorrelationGrant = Readonly<{
  journalId: string;
  storeTransactionId: string | null;
  productId: string;
  expectedShards: number;
  createdAtMs: number;
}>;

export type ConfirmedPurchaseCorrelationEvent = Readonly<{
  eventId: string;
  amount: number;
  productId: string;
  createdAtMs: number;
  transactionAliases: readonly string[];
}>;

const MAX_WEAK_CORRELATION_SKEW_MS = 15 * 60 * 1000;

function isStrongMatch(
  grant: PendingPurchaseCorrelationGrant,
  event: ConfirmedPurchaseCorrelationEvent,
): boolean {
  return Boolean(grant.storeTransactionId && (
    event.eventId === grant.storeTransactionId
    || event.transactionAliases.includes(grant.storeTransactionId)
  ));
}

function isWeakMatch(
  grant: PendingPurchaseCorrelationGrant,
  event: ConfirmedPurchaseCorrelationEvent,
): boolean {
  return grant.productId === event.productId
    && grant.expectedShards === event.amount
    && Math.abs(grant.createdAtMs - event.createdAtMs) <= MAX_WEAK_CORRELATION_SKEW_MS;
}

/**
 * Resolve only mutual one-to-one matches. An event that could satisfy two local
 * obligations, or an obligation with two possible server facts, remains pending.
 */
export function correlatePendingPurchases(
  grants: readonly PendingPurchaseCorrelationGrant[],
  events: readonly ConfirmedPurchaseCorrelationEvent[],
  reservedEventIds: ReadonlySet<string> = new Set(),
): ReadonlyMap<string, string> {
  const availableEvents = events.filter((event) => !reservedEventIds.has(event.eventId));
  const candidates = new Map<string, ConfirmedPurchaseCorrelationEvent[]>();
  for (const grant of grants) {
    const strong = availableEvents.filter((event) => isStrongMatch(grant, event));
    candidates.set(grant.journalId, strong.length > 0
      ? strong
      : availableEvents.filter((event) => isWeakMatch(grant, event)));
  }
  const result = new Map<string, string>();
  for (const grant of grants) {
    const matches = candidates.get(grant.journalId) ?? [];
    if (matches.length !== 1) continue;
    const [candidate] = matches;
    const competingGrants = grants.filter((other) => (
      candidates.get(other.journalId) ?? []
    ).some((event) => event.eventId === candidate.eventId));
    if (competingGrants.length !== 1) continue;
    result.set(grant.journalId, candidate.eventId);
  }
  return result;
}

const PROTECTED_SETTLEMENT_FAILURE = /^pending_grant_(?:claim|energy|quota|playable|ack)_/;

/**
 * The historical ordinary-swipe fallback is intentionally narrow. Once a
 * durable claim or any settlement step has started, local play would bypass
 * the authoritative energy/quota record and is therefore always forbidden.
 */
export function canUseLegacySwipeGrantFailOpen(
  errorMessage: string,
  isTrueFalseSession: boolean,
): boolean {
  return !isTrueFalseSession
    && /^pending_grant/.test(errorMessage)
    && !PROTECTED_SETTLEMENT_FAILURE.test(errorMessage);
}

export function flashcardPendingGrantPreset(isTrueFalseSession: boolean): 'trainer' | 'truefalse' {
  return isTrueFalseSession ? 'truefalse' : 'trainer';
}

export async function persistSpentEnergyOrRefund<RecordType>(input: Readonly<{
  persistCharged: () => Promise<Readonly<{ status: string; record?: RecordType }>>;
  refundSpent: () => Promise<void>;
}>): Promise<RecordType> {
  let result: Readonly<{ status: string; record?: RecordType }>;
  try {
    result = await input.persistCharged();
  } catch {
    try {
      await input.refundSpent();
    } catch {
      throw new Error('pending_grant_energy_refund_failed');
    }
    throw new Error('pending_grant_energy_persist_failed');
  }
  if (result.status !== 'charged' || result.record === undefined) {
    try {
      await input.refundSpent();
    } catch {
      throw new Error('pending_grant_energy_refund_failed');
    }
    throw new Error(`pending_grant_energy_${result.status}`);
  }
  return result.record;
}

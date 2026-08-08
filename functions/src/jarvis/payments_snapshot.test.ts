import { buildPaymentsSnapshot } from './payments_snapshot';
import type { FetchPaymentsSourceResult, PaymentFailureCollection } from './payments_firestore_fetcher';

const NOW = 1_800_000_000_000;

function result(
  sourceId: PaymentFailureCollection,
  state: FetchPaymentsSourceResult['state'],
): FetchPaymentsSourceResult {
  return {
    sourceId,
    state,
    truncated: false,
    droppedCount: 0,
    rows: [],
    observedAtMs: NOW,
  };
}

describe('Jarvis payments snapshot mandatory-source propagation', () => {
  test('scheduled snapshot preserves a partial source failure as one insufficient decision', async () => {
    const snapshot = await buildPaymentsSnapshot({
      fetchers: {
        telegram_premium_dead_letter: async () => result('telegram_premium_dead_letter', 'error'),
        revenuecat_premium_denials: async () => result('revenuecat_premium_denials', 'empty'),
      },
      trigger: 'scheduled',
      nowMs: NOW,
    });

    expect(snapshot.decisions).toHaveLength(1);
    expect(snapshot.decisions[0]).toMatchObject({
      department: 'payments',
      status: 'insufficient_evidence',
    });
  });
});

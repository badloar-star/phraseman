import {
  canUseLegacySwipeGrantFailOpen,
  flashcardPendingGrantPreset,
  persistSpentEnergyOrRefund,
} from '../app/flashcards/training_entry_policy';

describe('flashcard protected-start fail-closed policy', () => {
  test.each([
    'pending_grant_claim_missing',
    'pending_grant_claim_unavailable',
    'pending_grant_energy_claim_required',
    'pending_grant_quota_claim_required',
    'pending_grant_playable_claim_required',
    'pending_grant_ack_ack_failed',
  ])('never enters local play after protected settlement failure: %s', (message) => {
    expect(canUseLegacySwipeGrantFailOpen(message, false)).toBe(false);
    expect(canUseLegacySwipeGrantFailOpen(message, true)).toBe(false);
  });

  test('keeps only the pre-claim ordinary-swipe compatibility fallback', () => {
    expect(canUseLegacySwipeGrantFailOpen('pending_grant_account_unavailable', false)).toBe(true);
    expect(canUseLegacySwipeGrantFailOpen('pending_grant_account_unavailable', true)).toBe(false);
  });

  test('refunds a confirmed spend exactly once when charged journal persistence rejects', async () => {
    const refundSpent = jest.fn(async () => {});

    await expect(persistSpentEnergyOrRefund({
      persistCharged: async () => { throw new Error('storage_write_failed'); },
      refundSpent,
    })).rejects.toThrow('pending_grant_energy_persist_failed');

    expect(refundSpent).toHaveBeenCalledTimes(1);
  });

  test('refunds a confirmed spend exactly once when the journal reports claim_required', async () => {
    const refundSpent = jest.fn(async () => {});

    await expect(persistSpentEnergyOrRefund({
      persistCharged: async () => ({ status: 'claim_required' }),
      refundSpent,
    })).rejects.toThrow('pending_grant_energy_claim_required');

    expect(refundSpent).toHaveBeenCalledTimes(1);
  });

  test('uses distinct pending-grant fingerprints for ordinary swipe and True/False', () => {
    expect(flashcardPendingGrantPreset(false)).toBe('trainer');
    expect(flashcardPendingGrantPreset(true)).toBe('truefalse');
    expect(flashcardPendingGrantPreset(false)).not.toBe(flashcardPendingGrantPreset(true));
  });
});

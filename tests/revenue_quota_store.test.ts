const readProjection = jest.fn();
const commitReceipt = jest.fn();

jest.mock('../app/phone_state_practice_bridge', () => ({
  readPhoneStatePracticeFactProjection: (...args: unknown[]) => readProjection(...args),
  commitPhoneStatePracticeReceipt: (...args: unknown[]) => commitReceipt(...args),
}));

import {
  commitFlashcardTrainingQuotaReceipt,
  readFlashcardTrainingQuotaReceipts,
} from '../app/revenue_quota_store';

const receipt = {
  schemaVersion: 'revenue-quota.v1' as const,
  quota: 'flashcard_training_starts' as const,
  lineage: 7,
  period: '2026-03-29@Europe/Dublin',
  timeZone: 'Europe/Dublin',
  resetAt: Date.parse('2026-03-29T23:00:00.000Z'),
  observedAtMs: Date.parse('2026-03-29T12:00:00.000Z'),
  receiptId: 'swipe-session-1',
  mode: 'swipe' as const,
};

describe('Revenue VNext quota PhoneState store', () => {
  beforeEach(() => jest.clearAllMocks());

  test('distinguishes unavailable PhoneState from an available empty projection', async () => {
    readProjection.mockResolvedValueOnce({ status: 'unavailable' });
    await expect(readFlashcardTrainingQuotaReceipts('account-a')).resolves.toEqual({ status: 'unavailable' });

    readProjection.mockResolvedValueOnce({ status: 'available', stableUid: 'account-a', lineage: 7, facts: {} });
    await expect(readFlashcardTrainingQuotaReceipts('account-a')).resolves.toEqual({
      status: 'available', stableUid: 'account-a', lineage: 7, receipts: [],
    });
  });

  test('reads only valid current-lineage immutable attempt receipts under the reserved prefix', async () => {
    readProjection.mockResolvedValue({
      status: 'available', stableUid: 'account-a', lineage: 7,
      facts: {
        'revenue_quota:v1:flashcard_training_starts:7:one': receipt,
        'revenue_quota:v1:flashcard_training_starts:6:old': { ...receipt, lineage: 6 },
        'personal-plan-attempt': { anything: true },
        'revenue_quota:v1:flashcard_training_starts:7:broken': { ...receipt, resetAt: -1 },
      },
    });
    await expect(readFlashcardTrainingQuotaReceipts('account-a')).resolves.toEqual({
      status: 'available', stableUid: 'account-a', lineage: 7, receipts: [receipt],
    });
  });

  test('commits one idempotent attempt fact with the exact receipt as its durable result', async () => {
    commitReceipt.mockResolvedValue({ status: 'committed', duplicate: false });
    await expect(commitFlashcardTrainingQuotaReceipt('account-a', receipt)).resolves.toEqual({
      status: 'committed', duplicate: false,
    });
    expect(commitReceipt).toHaveBeenCalledWith(
      'attempt',
      'revenue_quota:v1:flashcard_training_starts:7:swipe-session-1',
      receipt,
      'revenue_quota:v1:flashcard_training_starts:7:swipe-session-1',
      'account-a',
      7,
    );
  });
});

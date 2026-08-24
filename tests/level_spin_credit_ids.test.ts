import {
  isLocalSpinCreditId,
  isLocalSpinReceiptCreditId,
} from '../app/level_spin_credit_ids';

describe('shared local Spin credit ID contract', () => {
  const storedCredits = [
    'local_spin_v1_005',
    'local_spin_dev_abc123',
    'local_spin_lesson_en-3',
    'local_spin_session_en-s1',
    'local_spin_arena_ranked_match-42',
  ];

  it.each(storedCredits)('accepts stored credit source %s', (creditId) => {
    expect(isLocalSpinCreditId(creditId)).toBe(true);
  });

  it('accepts the canonical level receipt plus every non-level stored credit source', () => {
    expect(isLocalSpinReceiptCreditId('level_spin_v1_005')).toBe(true);
    for (const creditId of storedCredits.slice(1)) {
      expect(isLocalSpinReceiptCreditId(creditId)).toBe(true);
    }
  });

  it('rejects unknown or malformed IDs fail-closed', () => {
    for (const creditId of ['', 'local_spin_hack_x', 'local_spin_v1_5', 'level_spin_v1_9999', 'local_spin_session_!']) {
      expect(isLocalSpinCreditId(creditId)).toBe(false);
      expect(isLocalSpinReceiptCreditId(creditId)).toBe(false);
    }
  });
});

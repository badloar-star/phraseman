import {
  isLocalSpinGiftAllowedForCatalogVersion,
  mergeLocalSpinJournal,
  parseLocalPendingReveal,
  type LocalLevelSpinReceipt,
  type LocalLevelSpinJournalEntry,
} from '../app/level_spin_local_contract';

const recoverableReceipt = (): LocalLevelSpinReceipt => ({
  ok: true,
  stableUid: 'account-a',
  requestId: 'request_recover_0001',
  creditId: 'level_spin_v1_002',
  level: 2,
  kind: 'standard',
  baseGiftId: 'xp_250',
  premiumGiftId: null,
  createdAtMs: 1_800_000_000_000,
  expiresAtMs: 1_800_259_200_000,
  balanceAfter: 0,
  status: 'awaiting_ack',
  revealState: 'pending',
  deliveries: { base: { state: 'unclaimed' } },
  catalogVersion: 1,
  schemaVersion: 1,
  localOnly: true,
});

describe('local Spin catalog version authority', () => {
  const legacyV1 = [
    'energy_full', 'xp_100', 'xp_250', 'hint_1', 'xp_bank_150', 'xp_2x_24h',
    'energy_plus2', 'chain_shield_1', 'hint_3', 'xp_bank_300',
    'cosmetic_avatar_common', 'xp_2x_48h', 'energy_plus3', 'xp_bank_600',
  ];

  test.each(legacyV1)('v1 keeps its historical reward %s', (giftId) => {
    expect(isLocalSpinGiftAllowedForCatalogVersion(giftId, 1)).toBe(true);
  });

  test.each([
    ['cosmetic_avatar_aura', 2, false], ['cosmetic_avatar_aura', 3, true],
    ['cosmetic_theme', 3, false], ['cosmetic_theme', 4, true],
    ['cosmetic_avatar_common', 4, false], ['cosmetic_avatar_common', 5, true],
    ['attempt_restore_all', 5, false], ['attempt_restore_all', 6, true],
  ] as const)('%s introduction is enforced for catalog v%i', (giftId, version, allowed) => {
    expect(isLocalSpinGiftAllowedForCatalogVersion(giftId, version)).toBe(allowed);
  });

  test('later catalog rewards cannot be forged into a v1 receipt', () => {
    expect(isLocalSpinGiftAllowedForCatalogVersion('pearls_500', 1)).toBe(false);
    expect(isLocalSpinGiftAllowedForCatalogVersion('cosmetic_theme', 1)).toBe(false);
    expect(isLocalSpinGiftAllowedForCatalogVersion('attempt_restore_all', 1)).toBe(false);
  });

  test.each([
    ['acknowledged status', { status: 'acknowledged' }],
    ['acknowledged reveal', { revealState: 'acknowledged' }],
    ['claimed delivery', { deliveries: { base: { state: 'claimed' } } }],
    ['unsafe balance', { balanceAfter: Number.MAX_SAFE_INTEGER + 1 }],
    ['negative balance', { balanceAfter: -1 }],
    ['kind mismatch', { kind: 'milestone' }],
  ] as const)('pending recovery rejects %s', (_name, patch) => {
    const receipt = { ...recoverableReceipt(), ...patch } as LocalLevelSpinReceipt;
    expect(parseLocalPendingReveal(JSON.stringify({ owner: 'account-a', receipt }), 'account-a', 1_800_000_000_001))
      .toBeNull();
  });

  test('pending recovery accepts valid v1 before expiry and rejects it at expiry', () => {
    const receipt = recoverableReceipt();
    const raw = JSON.stringify({ owner: 'account-a', receipt });
    expect(parseLocalPendingReveal(raw, 'account-a', receipt.expiresAtMs - 1)).toEqual(receipt);
    expect(parseLocalPendingReveal(raw, 'account-a', receipt.expiresAtMs)).toBeNull();
  });
});

describe('local Spin outer journal retention', () => {
  const entry = (index: number, claimed: boolean): LocalLevelSpinJournalEntry => ({
    owner: 'account-a', requestId: `request_${String(index).padStart(16, '0')}`,
    creditId: `local_spin_session_${index}`, level: 2,
    receivedAtMs: index + 1, expiresAtMs: 259_200_001 + index, localOnly: true,
    occurrences: [{
      occurrenceId: `level-spin:request_${String(index).padStart(16, '0')}:base`,
      lane: 'base', giftId: 'xp_250', claimed,
    }],
  });

  test('never evicts an unclaimed outer lane while bounding terminal history', () => {
    const pending = entry(0, false);
    const terminal = Array.from({ length: 64 }, (_, index) => entry(index + 1, true));
    const merged = mergeLocalSpinJournal([pending, ...terminal.slice(0, 63)], terminal[63]!);
    expect(merged.some((candidate) => candidate.requestId === pending.requestId)).toBe(true);
    expect(merged).toHaveLength(64);
  });
});

import {
  isRecoverableLocalLevelSpinReceipt,
  localJournalEntryForReceipt,
  localLevelSpinReceiptToInventory,
  mergeLocalSpinJournal,
  parseLocalPendingReveal,
  type FreeLocalLevelSpinReceipt,
  type LocalLevelSpinJournalEntry,
} from '../app/level_spin_local_contract';

// зачем (§99 «ядро журнала», 03.10): каталог подарков уровня удалён (D09), а подписанные квитанции старых
// спинов остаются на телефонах. Эти тесты воспроизводят СТАРЫЕ записи (v1–v7, retired-призы, журнал с
// «выданным/невыданным») и фиксируют: читаются, retired-призы закрываются монетами (shards_6), журнал не
// теряет невыданное и не «раздаёт» выданное повторно. Без каталога подарков (GiftDef — только форма).
const OWNER = 'stable_owner_1';
const NOW = 1_725_000_000_000;

function freeReceipt(over: Partial<FreeLocalLevelSpinReceipt> = {}): FreeLocalLevelSpinReceipt {
  return {
    ok: true,
    stableUid: OWNER,
    requestId: 'req_0123456789abcdef',
    baseGiftId: 'plus_days_3',
    premiumGiftId: null,
    createdAtMs: NOW,
    expiresAtMs: NOW + 259_200_000,
    balanceAfter: 10,
    status: 'awaiting_ack',
    revealState: 'pending',
    deliveries: { base: { state: 'unclaimed' } },
    catalogVersion: 2,
    localOnly: true,
    schemaVersion: 2,
    creditId: 'level_spin_v1_005',
    level: 5,
    kind: 'milestone',
    ...over,
  };
}

describe('старые квитанции спинов читаются без каталога подарков', () => {
  test.each([
    ['xp_100', 2], ['xp_5000', 4], ['xp_bank_1500', 7], ['xp_2x_24h', 3], ['chain_shield_3', 7],
    ['energy_full', 2], ['energy_plus1', 5], ['energy_plus3', 6],
  ])('retired-приз %s (каталог v%i) закрывается монетами shards_6', (giftId, version) => {
    const inv = localLevelSpinReceiptToInventory(freeReceipt({ baseGiftId: giftId, catalogVersion: version as 2 }));
    expect(inv.gift.id).toBe('shards_6');
    expect(inv.kind).toBe('single');
    expect(inv.level).toBe(5);
    expect(inv.receivedAtMs).toBe(NOW);
  });

  test('v1: квитанция со старой схемой читается, приз сохраняется как есть', () => {
    const inv = localLevelSpinReceiptToInventory(
      freeReceipt({ schemaVersion: 1, catalogVersion: 1, baseGiftId: 'hint_1' }),
    );
    expect(inv.gift.id).toBe('hint_1');
  });

  test('приз показывается нейтрально: форма GiftDef есть, текст — сам id, без каталога', () => {
    const { gift } = localLevelSpinReceiptToInventory(freeReceipt());
    expect(gift).toMatchObject({ id: 'plus_days_3', rarity: 'common', weight: 1, descRU: '' });
    expect(gift.titleEN).toBe('plus_days_3');
  });

  test.each([
    ['чужой id', { baseGiftId: 'not_a_gift' }],
    ['приз из будущей версии каталога', { baseGiftId: 'plus_days_30', catalogVersion: 6 as const }],
    ['неверный срок жизни', { expiresAtMs: NOW + 1 }],
    ['уровень вне 2..60', { level: 1, creditId: 'level_spin_v1_001' }],
    ['кредит не совпадает с уровнем', { creditId: 'level_spin_v1_010' }],
    ['схема не совпадает с версией каталога', { schemaVersion: 1 as const, catalogVersion: 4 as const }],
  ])('битая запись (%s) отвергается, а не молча принимается', (_name, over) => {
    expect(() => localLevelSpinReceiptToInventory(freeReceipt(over as Partial<FreeLocalLevelSpinReceipt>)))
      .toThrow('local_spin_receipt_invalid');
  });
});

describe('восстановление невыданного спина после перезапуска', () => {
  test('невыданная квитанция владельца восстанавливается', () => {
    expect(isRecoverableLocalLevelSpinReceipt(freeReceipt(), OWNER, NOW + 1000)).toBe(true);
  });

  test.each([
    ['чужой владелец', freeReceipt(), 'someone_else', NOW + 1000],
    ['срок истёк', freeReceipt(), OWNER, NOW + 259_200_001],
    ['уже подтверждена', freeReceipt({ status: 'acknowledged' }), OWNER, NOW + 1000],
    ['вид не совпадает с уровнем (5 — milestone)', freeReceipt({ kind: 'standard' }), OWNER, NOW + 1000],
    ['выдана на счёт', freeReceipt({ deliveries: { base: { state: 'claimed' } } as never }), OWNER, NOW + 1000],
    ['отрицательный баланс', freeReceipt({ balanceAfter: -1 }), OWNER, NOW + 1000],
  ])('не восстанавливается: %s', (_name, receipt, owner, nowMs) => {
    expect(isRecoverableLocalLevelSpinReceipt(receipt, owner, nowMs)).toBe(false);
  });

  test('parseLocalPendingReveal: битый JSON, чужой владелец и пусто → null, своя запись → квитанция', () => {
    const raw = JSON.stringify({ owner: OWNER, receipt: freeReceipt() });
    expect(parseLocalPendingReveal(raw, OWNER, NOW + 1000)?.requestId).toBe('req_0123456789abcdef');
    expect(parseLocalPendingReveal(raw, 'other', NOW + 1000)).toBeNull();
    expect(parseLocalPendingReveal('{not json', OWNER, NOW + 1000)).toBeNull();
    expect(parseLocalPendingReveal(null, OWNER, NOW + 1000)).toBeNull();
  });
});

describe('журнал спинов: невыданное не теряется, выданное не возвращается', () => {
  const entry = (n: number, claimed: boolean): LocalLevelSpinJournalEntry => ({
    ...localJournalEntryForReceipt(freeReceipt({ requestId: `req_${String(n).padStart(16, '0')}` }), OWNER),
    occurrences: [{ occurrenceId: `level-spin:req_${n}:base`, lane: 'base', giftId: 'shards_6', claimed }],
  });

  test('повторная запись той же квитанции не сбрасывает признак «выдано»', () => {
    const first = [entry(1, true)];
    const merged = mergeLocalSpinJournal(first, { ...entry(1, false) });
    expect(merged).toHaveLength(1);
    expect(merged[0].occurrences[0].claimed).toBe(true);
  });

  test('невыданные записи не вытесняются, даже когда выданных больше 64', () => {
    const terminal = Array.from({ length: 70 }, (_v, i) => entry(i + 1, true));
    const pending = entry(1000, false);
    const merged = mergeLocalSpinJournal(terminal, pending);
    expect(merged.some((e) => e.requestId === pending.requestId)).toBe(true);
    expect(merged.filter((e) => e.occurrences.every((o) => o.claimed))).toHaveLength(63);
  });

  test('невыданных больше бюджета — все остаются (закреплены), выданные вытеснены', () => {
    const pending = Array.from({ length: 66 }, (_v, i) => entry(i + 1, false));
    const merged = mergeLocalSpinJournal([...pending, entry(5000, true)], entry(6000, true));
    expect(merged.filter((e) => !e.occurrences.every((o) => o.claimed))).toHaveLength(66);
    expect(merged).toHaveLength(66);
  });
});

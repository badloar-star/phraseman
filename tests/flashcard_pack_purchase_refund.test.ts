import * as fs from 'fs';
import * as path from 'path';

/**
 * Контракт возврата монет при неудачной выдаче пака (находка аудита 2026-07-25).
 *
 * ДЫРА БЫЛА ТАКАЯ: purchaseCardPackWithShards списывал монеты через
 * spendShards, а потом звал addOwnedPackId → saveOwnedPackIds →
 * AsyncStorage.setItem БЕЗ try/catch. При заполненном диске setItem бросает,
 * исключение уходит наверх — юзер остаётся БЕЗ ДЕНЕГ И БЕЗ ПАКА, отката нет.
 *
 * Полноценный рантайм-тест потребовал бы мока половины shards_system с его
 * облачной сверкой; здесь фиксируем структурный контракт — он ловит именно то,
 * что было сломано: отсутствие отката и его причину в списке исключений перка.
 */

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards', 'cardPackShardPurchase.ts'),
  'utf8',
);
describe('покупка пака за жемчуг: выдача и списание — одна операция', () => {
  it('передаёт право на пак внутрь composite operation', () => {
    expect(SRC).toContain('await commitShardCompositeOperation({');
    expect(SRC).toContain("kind: 'official_card_pack'");
    expect(SRC).toContain('[flashcardsOwnedPacksKey(studyTarget), JSON.stringify(nextOwned)]');
  });

  it('не содержит отдельного списания, последующей выдачи или refund-компенсации', () => {
    const purchase = SRC.slice(
      SRC.indexOf('export async function purchaseCardPackWithShards'),
      SRC.indexOf('/**\n * Активувати 48-год ваучер'),
    );
    expect(purchase).not.toContain('spendShards');
    expect(purchase).not.toContain('addOwnedPackId');
    expect(purchase).not.toContain('card_pack_refund');
    expect(purchase).toContain('Жемчуг не списан');
  });

  it('провал кэша карточек НЕ отменяет покупку — пак уже оплачен и выдан', () => {
    // primeMarketplaceBuiltCardsCache — не критичен: список подтянется при входе.
    expect(SRC).toMatch(/primeMarketplaceBuiltCardsCacheFromOwnedStorage\(studyTarget\)\.catch/);
  });
});

describe('ваучер: порядок операций безопасен', () => {
  it('пак выдаётся ДО списания ваучера, а не после', () => {
    const voucher = SRC.slice(SRC.indexOf('export async function redeemPackGiftVoucher'));
    const giveIdx = voucher.indexOf('addOwnedPackId');
    const burnIdx = voucher.indexOf('consumePackGiftTrial(trial.localVoucherId)');
    expect(giveIdx).toBeGreaterThan(0);
    expect(burnIdx).toBeGreaterThan(giveIdx);
  });
});

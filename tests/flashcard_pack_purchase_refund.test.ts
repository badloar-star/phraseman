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
const SHARDS = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'shards_system.ts'),
  'utf8',
);

describe('покупка пака за монеты: откат при сбое выдачи', () => {
  it('addOwnedPackId обёрнут в try/catch — исключение не уходит наверх', () => {
    const idx = SRC.indexOf('addOwnedPackId(pack.id, studyTarget)');
    expect(idx).toBeGreaterThan(0);
    // Перед вызовом должен быть try в пределах пары строк.
    const before = SRC.slice(Math.max(0, idx - 200), idx);
    expect(before).toMatch(/try\s*\{/);
  });

  it('при сбое выдачи монеты возвращаются', () => {
    expect(SRC).toContain("addShardsRaw(pack.priceShards, 'card_pack_refund')");
  });

  it('после возврата баланс на экране обновляется', () => {
    const refundIdx = SRC.indexOf("'card_pack_refund'");
    const after = SRC.slice(refundIdx, refundIdx + 700);
    expect(after).toContain('shards_balance_updated');
  });

  it('юзеру говорят, что покупка не прошла и деньги вернули', () => {
    expect(SRC).toContain('Жемчуг возвращён');
  });

  it('возврат НЕ считается заработком — иначе перк карточки IV+ начислит +5% сверху', () => {
    const setIdx = SHARDS.indexOf('PROFILE_CARD_PERK_EXCLUDED_REASONS');
    const block = SHARDS.slice(setIdx, setIdx + 600);
    expect(block).toContain("'card_pack_refund'");
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
    const burnIdx = voucher.indexOf('consumePackGiftTrial(studyTarget)');
    expect(giveIdx).toBeGreaterThan(0);
    expect(burnIdx).toBeGreaterThan(giveIdx);
  });
});

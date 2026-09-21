/**
 * Сторож начисления автору набора (владелец 2026-09-21: «начисление должно быть
 * юзеры чьи наборы покупаются, а не блять приложению»).
 *
 * Проверяет ИМЕННО защиты от накрутки, а не «функция вызвалась»: это деньги
 * (пусть и внутриигровые), и разъехавшаяся проверка здесь означает, что автор
 * крутит себе руны бесконечно.
 */
import { decidePackSale, authorNetRunes } from './community_pack_rune_sale';

const AUTHOR = 'author_stable_1';
const BUYER = 'buyer_stable_2';

const publishedPaidPack = {
  listingStatus: 'published',
  authorStableId: AUTHOR,
  priceRunes: 1000,
};

describe('доля автора', () => {
  // зачем (владелец 2026-09-21, дословно «100 % автору блять!»): комиссии
  // платформы НЕТ. Сторож существует ровно затем, чтобы её не вернули
  // «для единообразия с осколками» — это решение владельца, а не недосмотр.
  it('автор получает ВСЮ цену набора, без удержаний', () => {
    expect(authorNetRunes(1000)).toBe(1000);
    expect(authorNetRunes(100)).toBe(100);
    expect(authorNetRunes(5000)).toBe(5000);
  });

  it('никакой комиссии не удерживается ни на одной цене', () => {
    for (const price of [100, 500, 1000, 2500, 5000]) {
      expect(authorNetRunes(price)).toBe(price);
    }
  });

  it('мусорная цена не превращается в начисление', () => {
    expect(authorNetRunes(0)).toBe(0);
    expect(authorNetRunes(-100)).toBe(0);
    expect(authorNetRunes(Number.NaN)).toBe(0);
  });
});

describe('решение о продаже набора', () => {
  it('обычная покупка чужого платного набора начисляет автору', () => {
    const decision = decidePackSale(publishedPaidPack, BUYER);
    expect(decision).toEqual({
      ok: true,
      authorStableId: AUTHOR,
      priceRunes: 1000,
      netRunes: 1000,
    });
  });

  it('автор НЕ может купить свой набор', () => {
    // Иначе автор крутил бы себе руны собственным набором по кругу.
    const decision = decidePackSale(publishedPaidPack, AUTHOR);
    expect(decision).toEqual({ ok: false, reason: 'cannot_buy_own_pack' });
  });

  it('неопубликованный набор не продаётся', () => {
    const decision = decidePackSale({ ...publishedPaidPack, listingStatus: 'draft' }, BUYER);
    expect(decision).toEqual({ ok: false, reason: 'pack_not_published' });
  });

  it('бесплатный набор не даёт начисления', () => {
    const decision = decidePackSale({ ...publishedPaidPack, priceRunes: 0 }, BUYER);
    expect(decision).toEqual({ ok: false, reason: 'pack_is_not_paid' });
  });

  it('набор без автора не продаётся', () => {
    const decision = decidePackSale({ ...publishedPaidPack, authorStableId: '' }, BUYER);
    expect(decision).toEqual({ ok: false, reason: 'pack_has_no_author' });
  });

  it('цена выше потолка отвергается — защита от подделанного документа', () => {
    const decision = decidePackSale({ ...publishedPaidPack, priceRunes: 999_999 }, BUYER);
    expect(decision).toEqual({ ok: false, reason: 'pack_is_not_paid' });
  });

  it('цена берётся ИЗ НАБОРА, а поля запроса на решение не влияют', () => {
    // Ключевая защита: клиент не может назначить автору сумму. Функция вообще
    // не принимает цену от вызывающего — только документ набора.
    const decision = decidePackSale({ ...publishedPaidPack, priceRunes: 200 }, BUYER);
    expect(decision.ok && decision.priceRunes).toBe(200);
    expect(decision.ok && decision.netRunes).toBe(200);
  });
});

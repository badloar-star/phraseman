// ═════════════════════════════════════════════════════════════════════
// packPurchaseGate.ts — можно ли открыть окно покупки набора за руны (R1_PAYWALL_UX п.2, координатор 12.10).
//
// зачем: окно рисует цену из `pack.priceRunes`, а списывает цену, которую передал вызывающий. Набор без цены (или если две цены разошлись) давал кнопку «за 0»
// и отказ `invalid_price` уже ПОСЛЕ тапа. Теперь такой набор не открывает окно вовсе, а причина попадает в журнал ([PACK-BUY] gate:refused).
// Чистая функция — чтобы тест держал каждую причину отказа.
// ═════════════════════════════════════════════════════════════════════
import { communityPackPriceRunes } from '../flashcards/marketplace';
import type { FlashcardMarketPack } from '../flashcards/marketplace';

export type PackPurchaseGateResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'no_pack_id' | 'invalid_price' | 'pack_has_no_price' | 'price_mismatch' };

export function packPurchaseGate(pack: Pick<FlashcardMarketPack, 'id' | 'priceRunes' | 'isCommunityUgc'>, price: number): PackPurchaseGateResult {
  if (!pack.id) return { ok: false, reason: 'no_pack_id' };
  if (!Number.isFinite(price) || price <= 0) return { ok: false, reason: 'invalid_price' };
  const packPrice = communityPackPriceRunes(pack);
  if (packPrice <= 0) return { ok: false, reason: 'pack_has_no_price' };
  if (packPrice !== Math.floor(price)) return { ok: false, reason: 'price_mismatch' };
  return { ok: true };
}

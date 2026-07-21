/**
 * Spanish terminology policy (neutral, widely used in LatAm + natural in Spain).
 *
 * • Coins (RU «монеты», ранее «осколки»): one in-product name `BRAND_SHARDS_ES` everywhere —
 *   never mix gemas / piezas / cristales for this currency unless you intentionally split economies.
 *   Идентификатор константы оставлен прежним — это отображаемое переименование.
 *
 * • Quiz section: prefer «cuestionario(s)» in user-visible copy (professional ELT tone, matches tabs
 *   in LangContext). Keep code identifiers / analytics as quiz.
 */
export const BRAND_SHARDS_ES = 'Monedas';

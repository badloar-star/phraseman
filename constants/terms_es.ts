/**
 * Spanish terminology policy (neutral, widely used in LatAm + natural in Spain).
 *
 * • Pearls (RU «жемчуг», ранее «монеты» → ещё раньше «осколки»): one in-product name
 *   `BRAND_SHARDS_ES` everywhere — never mix gemas / piezas / cristales / monedas for this
 *   currency unless you intentionally split economies.
 *   Идентификатор константы оставлен прежним — это отображаемое переименование.
 *
 * • Quiz section: prefer «cuestionario(s)» in user-visible copy (professional ELT tone, matches tabs
 *   in LangContext). Keep code identifiers / analytics as quiz.
 */
// зачем (PM-008, Q74): жемчуг удалён, единственная валюта 2.0 — монеты («monedas»).
export const BRAND_SHARDS_ES = 'Monedas';

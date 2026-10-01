/**
 * Canonical rune artwork used by every balance and reward surface.
 *
 * Keep the static require in this dependency-free module so animation and
 * wallet tests do not have to load the Expo Image renderer just to reuse the
 * same asset.
 */
// зачем (владелец 01.10): в 2.0 валюта — монеты; старая руна stars_10 заменена базовой монетой.
export const HOME_RUNE_ICON_SOURCE = require('../../assets/images/coins/coin_rank_00.webp');

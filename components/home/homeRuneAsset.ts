/**
 * Canonical rune artwork used by every balance and reward surface.
 *
 * Keep the static require in this dependency-free module so animation and
 * wallet tests do not have to load the Expo Image renderer just to reuse the
 * same asset.
 */
export const HOME_RUNE_ICON_SOURCE = require('../../assets/images/level-spin-rewards/stars_10.webp');

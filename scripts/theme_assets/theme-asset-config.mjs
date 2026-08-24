export const LIVE_THEMES = Object.freeze([
  "indigo",
  "sagePorcelain",
  "olive",
  "midnight",
  "ember",
  "aurora",
  "volt",
  "dark",
  "gold",
]);

export const LEGACY_THEME_TOMBSTONES = Object.freeze([
  "minimalDark",
  "candyBlue",
  "business",
  "businessLight",
]);

export const RETIRED_RASTER_PREFIXES = Object.freeze([
  "assets/images/level_gifts/",
  "assets/images/level_gift_reward_icons/",
  "assets/images/league_bonus/",
  "assets/images/weekly_boon_icons/",
  "assets/images/trainer_theme_icons/",
]);

// Semantic catalogs can contain live-theme words without reacting to the UI
// theme (for example `community_18_aurora` or the gold medal tier).
export const NON_THEME_ASSET_PREFIXES = Object.freeze([
  'assets/images/flashcard_backs/',
  'assets/images/levels/',
]);

export const SOURCE_ROOTS = Object.freeze([
  "app",
  "components",
  "constants",
  "hooks",
  "lib",
  "modules",
]);

export const SOURCE_EXTENSIONS = Object.freeze(
  new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]),
);

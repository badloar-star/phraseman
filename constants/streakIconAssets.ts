import type { ImageSourcePropType } from "react-native";
import type { ThemeMode } from "./theme";

// зачем: ТЗ «Единое перо цепочки дней» (docs/superpowers/specs/
// 2026-08-30-streak-feather-design.md) — один образ на все темы, ступень
// ровно каждые 10 дней, насыщение на 90+. Прежние тематические огоньки с
// шагом 1/2/3/5/7/10/20/35/60/100 сняты вместе с 90 файлами streak-fire-*.
export const STREAK_ICON_TIERS = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90,
] as const;

export type StreakIconTierDays = (typeof STREAK_ICON_TIERS)[number];

export interface StreakIconVariant {
  source: ImageSourcePropType;
  assetPath: string;
  tierDays: StreakIconTierDays;
  backgroundColor: string;
  borderColor: string;
  glowColor: string;
  accentColor: string;
  intensity: number;
}

type ThemeTierMap<T> = Record<ThemeMode, Record<StreakIconTierDays, T>>;

const DEFAULT_THEME_MODE: ThemeMode = "indigo";

// зачем: единый набор перьев вместо 10 тематических наборов огня.
// Перо одинаково во всех темах — тему несут окружающие поверхности, а
// ступень зависит только от длины цепочки. Пути статичны для сборщика.
const STREAK_FEATHER_ICON_ASSET_PATHS: Record<StreakIconTierDays, string> = {
  0: "assets/images/streak_icons/feather/streak-feather-01.webp",
  10: "assets/images/streak_icons/feather/streak-feather-02.webp",
  20: "assets/images/streak_icons/feather/streak-feather-03.webp",
  30: "assets/images/streak_icons/feather/streak-feather-04.webp",
  40: "assets/images/streak_icons/feather/streak-feather-05.webp",
  50: "assets/images/streak_icons/feather/streak-feather-06.webp",
  60: "assets/images/streak_icons/feather/streak-feather-07.webp",
  70: "assets/images/streak_icons/feather/streak-feather-08.webp",
  80: "assets/images/streak_icons/feather/streak-feather-09.webp",
  90: "assets/images/streak_icons/feather/streak-feather-10.webp",
};

const STREAK_FEATHER_ICON_SOURCES: Record<
  StreakIconTierDays,
  ImageSourcePropType
> = {
  0: require("../assets/images/streak_icons/feather/streak-feather-01.webp"),
  10: require("../assets/images/streak_icons/feather/streak-feather-02.webp"),
  20: require("../assets/images/streak_icons/feather/streak-feather-03.webp"),
  30: require("../assets/images/streak_icons/feather/streak-feather-04.webp"),
  40: require("../assets/images/streak_icons/feather/streak-feather-05.webp"),
  50: require("../assets/images/streak_icons/feather/streak-feather-06.webp"),
  60: require("../assets/images/streak_icons/feather/streak-feather-07.webp"),
  70: require("../assets/images/streak_icons/feather/streak-feather-08.webp"),
  80: require("../assets/images/streak_icons/feather/streak-feather-09.webp"),
  90: require("../assets/images/streak_icons/feather/streak-feather-10.webp"),
};

const FIRE_CHROME: Record<
  ThemeMode,
  { rgb: readonly [number, number, number]; accent: string }
> = {
  dark: { rgb: [38, 217, 177], accent: "#26D9B1" },
  gold: { rgb: [246, 201, 92], accent: "#F6C95C" },
  olive: { rgb: [201, 168, 76], accent: "#C9A84C" },
  sagePorcelain: { rgb: [139, 99, 32], accent: "#315F50" },
  midnight: { rgb: [255, 210, 122], accent: "#FFD27A" },
  ember: { rgb: [255, 138, 42], accent: "#FF8A2A" },
  aurora: { rgb: [242, 210, 122], accent: "#F2D27A" },
  volt: { rgb: [255, 232, 92], accent: "#FFE85C" },
  indigo: { rgb: [200, 195, 255], accent: "#C8C3FF" },
};

const FREEZE_CHROME: Record<
  ThemeMode,
  { rgb: readonly [number, number, number]; accent: string }
> = {
  dark: { rgb: [100, 210, 255], accent: "#64D2FF" },
  gold: { rgb: [246, 227, 161], accent: "#F6E3A1" },
  olive: { rgb: [151, 169, 161], accent: "#97A9A1" },
  sagePorcelain: { rgb: [97, 112, 106], accent: "#52605A" },
  midnight: { rgb: [143, 160, 255], accent: "#8FA0FF" },
  ember: { rgb: [122, 200, 232], accent: "#7AC8E8" },
  aurora: { rgb: [46, 157, 255], accent: "#2E9DFF" },
  volt: { rgb: [111, 231, 220], accent: "#6FE7DC" },
  indigo: { rgb: [154, 149, 194], accent: "#9A95C2" },
};

const STREAK_FREEZE_ICON_ASSET_PATH =
  "assets/images/streak_icons/streak-freeze.webp";
const STREAK_FREEZE_ICON_SOURCE = require("../assets/images/streak_icons/streak-freeze.webp");

const STREAK_FREEZE_ICON_ASSET_PATHS: Record<ThemeMode, string> = {
  dark: "assets/images/streak_icons/dark/streak-freeze-dark.webp",
  gold: "assets/images/streak_icons/gold/streak-freeze-gold.webp",
  olive: "assets/images/streak_icons/olive/streak-freeze-olive.webp",
  sagePorcelain:
    "assets/images/streak_icons/sagePorcelain/streak-freeze-sagePorcelain.webp",
  midnight: "assets/images/streak_icons/midnight/streak-freeze-midnight.webp",
  ember: "assets/images/streak_icons/ember/streak-freeze-ember.webp",
  aurora: "assets/images/streak_icons/aurora/streak-freeze-aurora.webp",
  volt: "assets/images/streak_icons/volt/streak-freeze-volt.webp",
  indigo: "assets/images/streak_icons/indigo/streak-freeze-indigo.webp",
};

const STREAK_FREEZE_ICON_SOURCES: Record<ThemeMode, ImageSourcePropType> = {
  dark: require("../assets/images/streak_icons/dark/streak-freeze-dark.webp"),
  gold: require("../assets/images/streak_icons/gold/streak-freeze-gold.webp"),
  olive: require("../assets/images/streak_icons/olive/streak-freeze-olive.webp"),
  sagePorcelain: require("../assets/images/streak_icons/sagePorcelain/streak-freeze-sagePorcelain.webp"),
  midnight: require("../assets/images/streak_icons/midnight/streak-freeze-midnight.webp"),
  ember: require("../assets/images/streak_icons/ember/streak-freeze-ember.webp"),
  aurora: require("../assets/images/streak_icons/aurora/streak-freeze-aurora.webp"),
  volt: require("../assets/images/streak_icons/volt/streak-freeze-volt.webp"),
  indigo: require("../assets/images/streak_icons/indigo/streak-freeze-indigo.webp"),
};

const STREAK_FREEZE_ICON_SOURCE_PROMPTS: Record<ThemeMode, string> = {
  dark: "assets/images/streak_icons/sources/streak-freeze-dark-dalle-source.png",
  gold: "assets/images/streak_icons/sources/streak-freeze-gold-dalle-source.png",
  olive: "not-tracked-in-repo:olive-premium-asset-session",
  // зачем: путь на .codex-tmp/ был мёртвой ссылкой — эта папка в .gitignore
  // и на других машинах/CI её просто нет. Сам webp уже лежит в assets/ и
  // грузится через require() ниже; эта строка — только справка "откуда взят
  // исходник", реального рантайм-эффекта не имеет.
  sagePorcelain: "not-tracked-in-repo:source-was-in-.codex-tmp",
  // зачем: cinema_dalle_sources/ (черновики генерации) вынесены из assets/ —
  // готовые webp-иконки лежат в assets/images/streak_icons/<тема>/ и грузятся
  // через require() ниже, эта строка — только справка "откуда взят исходник".
  midnight:
    "moved-out-of-assets:cinema_dalle_sources/midnight-object-rewards-dalle.png#streak-icons",
  ember:
    "moved-out-of-assets:cinema_dalle_sources/ember-object-rewards-dalle.png#streak-icons",
  aurora:
    "moved-out-of-assets:cinema_dalle_sources/aurora-object-rewards-dalle.png#streak-icons",
  volt: "moved-out-of-assets:cinema_dalle_sources/volt-object-rewards-dalle.png#streak-icons",
  indigo:
    "assets/images/streak_icons/sources/2026-07-26-theme-refresh/indigo-atlas-source.png",
};

function rgba(rgb: readonly [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha.toFixed(2)})`;
}

function normalizeThemeMode(
  themeMode: ThemeMode | null | undefined,
): ThemeMode {
  // зачем: тему больше выбирает только заморозка (у пера один вид на все
  // темы), поэтому валидность режима сверяем по freeze-набору.
  return themeMode && STREAK_FREEZE_ICON_SOURCES[themeMode]
    ? themeMode
    : DEFAULT_THEME_MODE;
}

export function streakIconTierForDays(streakDays: number): StreakIconTierDays {
  // зачем: обрыв цепочки и мусорные значения дают первое слабое перо (ступень
  // 0), дальше ступень меняется ровно каждые 10 дней и стоит на 90+.
  if (!Number.isFinite(streakDays) || streakDays <= 0) return 0;
  const tier =
    [...STREAK_ICON_TIERS]
      .filter((candidate) => candidate <= streakDays)
      .at(-1) ?? 0;
  return tier as StreakIconTierDays;
}

export function streakIconIntensity(tierDays: StreakIconTierDays): number {
  return STREAK_ICON_TIERS.indexOf(tierDays) / (STREAK_ICON_TIERS.length - 1);
}

/**
 * Ступень пера личной цепочки. Само перо одинаково во всех темах; от темы
 * зависит только подложка/свечение вокруг него, чтобы иконка садилась на
 * поверхность экрана.
 */
export function getStreakFeatherIconVariant(
  themeMode: ThemeMode,
  streakDays: number,
): StreakIconVariant {
  const safeThemeMode = normalizeThemeMode(themeMode);
  const tierDays = streakIconTierForDays(streakDays);
  const intensity = streakIconIntensity(tierDays);
  const chrome = FIRE_CHROME[safeThemeMode];
  return {
    source: STREAK_FEATHER_ICON_SOURCES[tierDays],
    assetPath: STREAK_FEATHER_ICON_ASSET_PATHS[tierDays],
    tierDays,
    backgroundColor: rgba(chrome.rgb, 0.12 + intensity * 0.1),
    borderColor: rgba(chrome.rgb, 0.36 + intensity * 0.28),
    glowColor: rgba(chrome.rgb, 0.22 + intensity * 0.18),
    accentColor: chrome.accent,
    intensity,
  };
}

/**
 * Историческое имя: цепочку рисовал огонь. Оставлено, чтобы не трогать
 * StreakChainIcon/LiveStreakFlame/статистику одним коммитом; отдаёт перо.
 */
export const getStreakFireIconVariant = getStreakFeatherIconVariant;

export function getStreakFreezeIconVariant(
  themeMode: ThemeMode,
): StreakIconVariant {
  const safeThemeMode = normalizeThemeMode(themeMode);
  const chrome = FREEZE_CHROME[safeThemeMode];
  return {
    source:
      STREAK_FREEZE_ICON_SOURCES[safeThemeMode] ?? STREAK_FREEZE_ICON_SOURCE,
    assetPath:
      STREAK_FREEZE_ICON_ASSET_PATHS[safeThemeMode] ??
      STREAK_FREEZE_ICON_ASSET_PATH,
    tierDays: 10,
    backgroundColor: rgba(chrome.rgb, 0.16),
    borderColor: rgba(chrome.rgb, 0.54),
    glowColor: rgba(chrome.rgb, 0.3),
    accentColor: chrome.accent,
    intensity: 1,
  };
}

export const STREAK_ICON_MODEL = {
  tiers: STREAK_ICON_TIERS,
  featherAssetPaths: STREAK_FEATHER_ICON_ASSET_PATHS,
  freezeAssetPaths: STREAK_FREEZE_ICON_ASSET_PATHS,
  freezeAssetPath: STREAK_FREEZE_ICON_ASSET_PATH,
  sourcePrompts: {
    // зачем: исходник пера — зелёный model sheet 30.08 вне бандла; финальные
    // webp вырезаны из него хромакеем (см. ТЗ, раздел «Генерация и файлы»).
    feather: "not-bundled:.codex-tmp/streak-feather/model-sheet.png",
    freeze: "assets/images/streak_icons/sources/streak-freeze-dalle-source.png",
    freezeThemes: STREAK_FREEZE_ICON_SOURCE_PROMPTS,
  },
} as const;

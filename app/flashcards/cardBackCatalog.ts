import type { ImageSourcePropType } from 'react-native';
import { triLang, type Lang } from '../../constants/i18n';
import type { FlashcardMarketPack } from './marketplace';
import {
  OFFICIAL_DARK_LOGIC_EN_ID,
  OFFICIAL_MOVIE_SERIES_EN_ID,
  OFFICIAL_NEGOTIATOR_EN_ID,
  OFFICIAL_PEAKY_BLINDERS_EN_ID,
  OFFICIAL_PREP_AT_EN_ID,
  OFFICIAL_PREP_BY_EN_ID,
  OFFICIAL_PREP_IN_EN_ID,
  OFFICIAL_PREP_ON_EN_ID,
  OFFICIAL_PREP_TO_EN_ID,
  OFFICIAL_PHRASAL_VERBS_EN_ID,
  OFFICIAL_ROYAL_TEA_EN_ID,
  OFFICIAL_WILD_WEST_EN_ID,
} from './bundles/packIds';

export const UGC_CARD_BACK_DEFAULT_ID = 'community_01_aqua_circuit';

export const UGC_CARD_BACK_IDS = [
  'community_01_aqua_circuit',
  'community_02_coral_sunset',
  'community_03_violet_nebula',
  'community_04_ivory_marble',
  'community_05_neon_grid',
  'community_06_forest_rune',
  'community_07_glacier_blue',
  'community_08_ruby_velvet',
  'community_09_brass_clockwork',
  'community_10_paper_manuscript',
  'community_11_obsidian_star',
  'community_12_mint_enamel',
  'community_13_royal_purple',
  'community_14_desert_sand',
  'community_15_sakura_ink',
  'community_16_steel_blueprint',
  'community_17_cyber_lime',
  'community_18_aurora',
  'community_19_coffee_leather',
  'community_20_crystal_prism',
  'community_21_midnight_moon',
  'community_22_teal_mosaic',
  'community_23_amber_glass',
  'community_24_ink_noir',
  'community_25_garden_botanical',
  'community_26_ocean_pearl',
  'community_27_crimson_chess',
  'community_28_cloud_silver',
  'community_29_rainbow_foil',
  'community_30_slate_minimal',
] as const;

export type UgcCardBackId = (typeof UGC_CARD_BACK_IDS)[number];
export type FlashcardBackId =
  | UgcCardBackId
  | typeof OFFICIAL_PREP_IN_EN_ID
  | typeof OFFICIAL_PREP_ON_EN_ID
  | typeof OFFICIAL_PREP_AT_EN_ID
  | typeof OFFICIAL_PREP_TO_EN_ID
  | typeof OFFICIAL_PREP_BY_EN_ID
  | typeof OFFICIAL_PHRASAL_VERBS_EN_ID
  | typeof OFFICIAL_MOVIE_SERIES_EN_ID
  | typeof OFFICIAL_NEGOTIATOR_EN_ID
  | typeof OFFICIAL_DARK_LOGIC_EN_ID
  | typeof OFFICIAL_WILD_WEST_EN_ID
  | typeof OFFICIAL_ROYAL_TEA_EN_ID
  | typeof OFFICIAL_PEAKY_BLINDERS_EN_ID;

const CARD_BACK_IMAGE: Record<string, ImageSourcePropType> = {
  [OFFICIAL_PREP_IN_EN_ID]: require('../../assets/images/flashcard_backs/official_prep_in_en.webp'),
  [OFFICIAL_PREP_ON_EN_ID]: require('../../assets/images/flashcard_backs/official_prep_on_en.webp'),
  [OFFICIAL_PREP_AT_EN_ID]: require('../../assets/images/flashcard_backs/official_prep_at_en.webp'),
  [OFFICIAL_PREP_TO_EN_ID]: require('../../assets/images/flashcard_backs/official_prep_to_en.webp'),
  [OFFICIAL_PREP_BY_EN_ID]: require('../../assets/images/flashcard_backs/official_prep_by_en.webp'),
  [OFFICIAL_PHRASAL_VERBS_EN_ID]: require('../../assets/images/flashcard_backs/official_phrasal_verbs_en.webp'),
  [OFFICIAL_MOVIE_SERIES_EN_ID]: require('../../assets/images/flashcard_backs/official_movie_series_en.webp'),
  [OFFICIAL_NEGOTIATOR_EN_ID]: require('../../assets/images/flashcard_backs/official_negotiator_en.webp'),
  [OFFICIAL_DARK_LOGIC_EN_ID]: require('../../assets/images/flashcard_backs/official_dark_logic_en.webp'),
  [OFFICIAL_WILD_WEST_EN_ID]: require('../../assets/images/flashcard_backs/official_wild_west_en.webp'),
  [OFFICIAL_ROYAL_TEA_EN_ID]: require('../../assets/images/flashcard_backs/official_royal_tea_en.webp'),
  [OFFICIAL_PEAKY_BLINDERS_EN_ID]: require('../../assets/images/flashcard_backs/official_peaky_blinders_en.webp'),
  community_01_aqua_circuit: require('../../assets/images/flashcard_backs/community_01_aqua_circuit.webp'),
  community_02_coral_sunset: require('../../assets/images/flashcard_backs/community_02_coral_sunset.webp'),
  community_03_violet_nebula: require('../../assets/images/flashcard_backs/community_03_violet_nebula.webp'),
  community_04_ivory_marble: require('../../assets/images/flashcard_backs/community_04_ivory_marble.webp'),
  community_05_neon_grid: require('../../assets/images/flashcard_backs/community_05_neon_grid.webp'),
  community_06_forest_rune: require('../../assets/images/flashcard_backs/community_06_forest_rune.webp'),
  community_07_glacier_blue: require('../../assets/images/flashcard_backs/community_07_glacier_blue.webp'),
  community_08_ruby_velvet: require('../../assets/images/flashcard_backs/community_08_ruby_velvet.webp'),
  community_09_brass_clockwork: require('../../assets/images/flashcard_backs/community_09_brass_clockwork.webp'),
  community_10_paper_manuscript: require('../../assets/images/flashcard_backs/community_10_paper_manuscript.webp'),
  community_11_obsidian_star: require('../../assets/images/flashcard_backs/community_11_obsidian_star.webp'),
  community_12_mint_enamel: require('../../assets/images/flashcard_backs/community_12_mint_enamel.webp'),
  community_13_royal_purple: require('../../assets/images/flashcard_backs/community_13_royal_purple.webp'),
  community_14_desert_sand: require('../../assets/images/flashcard_backs/community_14_desert_sand.webp'),
  community_15_sakura_ink: require('../../assets/images/flashcard_backs/community_15_sakura_ink.webp'),
  community_16_steel_blueprint: require('../../assets/images/flashcard_backs/community_16_steel_blueprint.webp'),
  community_17_cyber_lime: require('../../assets/images/flashcard_backs/community_17_cyber_lime.webp'),
  community_18_aurora: require('../../assets/images/flashcard_backs/community_18_aurora.webp'),
  community_19_coffee_leather: require('../../assets/images/flashcard_backs/community_19_coffee_leather.webp'),
  community_20_crystal_prism: require('../../assets/images/flashcard_backs/community_20_crystal_prism.webp'),
  community_21_midnight_moon: require('../../assets/images/flashcard_backs/community_21_midnight_moon.webp'),
  community_22_teal_mosaic: require('../../assets/images/flashcard_backs/community_22_teal_mosaic.webp'),
  community_23_amber_glass: require('../../assets/images/flashcard_backs/community_23_amber_glass.webp'),
  community_24_ink_noir: require('../../assets/images/flashcard_backs/community_24_ink_noir.webp'),
  community_25_garden_botanical: require('../../assets/images/flashcard_backs/community_25_garden_botanical.webp'),
  community_26_ocean_pearl: require('../../assets/images/flashcard_backs/community_26_ocean_pearl.webp'),
  community_27_crimson_chess: require('../../assets/images/flashcard_backs/community_27_crimson_chess.webp'),
  community_28_cloud_silver: require('../../assets/images/flashcard_backs/community_28_cloud_silver.webp'),
  community_29_rainbow_foil: require('../../assets/images/flashcard_backs/community_29_rainbow_foil.webp'),
  community_30_slate_minimal: require('../../assets/images/flashcard_backs/community_30_slate_minimal.webp'),
};

const CARD_BACK_FAN_IMAGE: Record<string, ImageSourcePropType> = {
  [OFFICIAL_PREP_IN_EN_ID]: require('../../assets/images/flashcard_backs/official_prep_in_en_fan.webp'),
  [OFFICIAL_PREP_ON_EN_ID]: require('../../assets/images/flashcard_backs/official_prep_on_en_fan.webp'),
  [OFFICIAL_PREP_AT_EN_ID]: require('../../assets/images/flashcard_backs/official_prep_at_en_fan.webp'),
  [OFFICIAL_PREP_TO_EN_ID]: require('../../assets/images/flashcard_backs/official_prep_to_en_fan.webp'),
  [OFFICIAL_PREP_BY_EN_ID]: require('../../assets/images/flashcard_backs/official_prep_by_en_fan.webp'),
  [OFFICIAL_PHRASAL_VERBS_EN_ID]: require('../../assets/images/flashcard_backs/official_phrasal_verbs_en_fan.webp'),
  [OFFICIAL_MOVIE_SERIES_EN_ID]: require('../../assets/images/flashcard_backs/official_movie_series_en_fan.webp'),
  [OFFICIAL_NEGOTIATOR_EN_ID]: require('../../assets/images/flashcard_backs/official_negotiator_en_fan.webp'),
  [OFFICIAL_DARK_LOGIC_EN_ID]: require('../../assets/images/flashcard_backs/official_dark_logic_en_fan.webp'),
  [OFFICIAL_WILD_WEST_EN_ID]: require('../../assets/images/flashcard_backs/official_wild_west_en_fan.webp'),
  [OFFICIAL_ROYAL_TEA_EN_ID]: require('../../assets/images/flashcard_backs/official_royal_tea_en_fan.webp'),
  [OFFICIAL_PEAKY_BLINDERS_EN_ID]: require('../../assets/images/flashcard_backs/official_peaky_blinders_en_fan.webp'),
  community_01_aqua_circuit: require('../../assets/images/flashcard_backs/community_01_aqua_circuit_fan.webp'),
  community_02_coral_sunset: require('../../assets/images/flashcard_backs/community_02_coral_sunset_fan.webp'),
  community_03_violet_nebula: require('../../assets/images/flashcard_backs/community_03_violet_nebula_fan.webp'),
  community_04_ivory_marble: require('../../assets/images/flashcard_backs/community_04_ivory_marble_fan.webp'),
  community_05_neon_grid: require('../../assets/images/flashcard_backs/community_05_neon_grid_fan.webp'),
  community_06_forest_rune: require('../../assets/images/flashcard_backs/community_06_forest_rune_fan.webp'),
  community_07_glacier_blue: require('../../assets/images/flashcard_backs/community_07_glacier_blue_fan.webp'),
  community_08_ruby_velvet: require('../../assets/images/flashcard_backs/community_08_ruby_velvet_fan.webp'),
  community_09_brass_clockwork: require('../../assets/images/flashcard_backs/community_09_brass_clockwork_fan.webp'),
  community_10_paper_manuscript: require('../../assets/images/flashcard_backs/community_10_paper_manuscript_fan.webp'),
  community_11_obsidian_star: require('../../assets/images/flashcard_backs/community_11_obsidian_star_fan.webp'),
  community_12_mint_enamel: require('../../assets/images/flashcard_backs/community_12_mint_enamel_fan.webp'),
  community_13_royal_purple: require('../../assets/images/flashcard_backs/community_13_royal_purple_fan.webp'),
  community_14_desert_sand: require('../../assets/images/flashcard_backs/community_14_desert_sand_fan.webp'),
  community_15_sakura_ink: require('../../assets/images/flashcard_backs/community_15_sakura_ink_fan.webp'),
  community_16_steel_blueprint: require('../../assets/images/flashcard_backs/community_16_steel_blueprint_fan.webp'),
  community_17_cyber_lime: require('../../assets/images/flashcard_backs/community_17_cyber_lime_fan.webp'),
  community_18_aurora: require('../../assets/images/flashcard_backs/community_18_aurora_fan.webp'),
  community_19_coffee_leather: require('../../assets/images/flashcard_backs/community_19_coffee_leather_fan.webp'),
  community_20_crystal_prism: require('../../assets/images/flashcard_backs/community_20_crystal_prism_fan.webp'),
  community_21_midnight_moon: require('../../assets/images/flashcard_backs/community_21_midnight_moon_fan.webp'),
  community_22_teal_mosaic: require('../../assets/images/flashcard_backs/community_22_teal_mosaic_fan.webp'),
  community_23_amber_glass: require('../../assets/images/flashcard_backs/community_23_amber_glass_fan.webp'),
  community_24_ink_noir: require('../../assets/images/flashcard_backs/community_24_ink_noir_fan.webp'),
  community_25_garden_botanical: require('../../assets/images/flashcard_backs/community_25_garden_botanical_fan.webp'),
  community_26_ocean_pearl: require('../../assets/images/flashcard_backs/community_26_ocean_pearl_fan.webp'),
  community_27_crimson_chess: require('../../assets/images/flashcard_backs/community_27_crimson_chess_fan.webp'),
  community_28_cloud_silver: require('../../assets/images/flashcard_backs/community_28_cloud_silver_fan.webp'),
  community_29_rainbow_foil: require('../../assets/images/flashcard_backs/community_29_rainbow_foil_fan.webp'),
  community_30_slate_minimal: require('../../assets/images/flashcard_backs/community_30_slate_minimal_fan.webp'),
};

const UGC_CARD_BACK_LABELS: Record<UgcCardBackId, string> = {
  community_01_aqua_circuit: 'Study Circuit',
  community_02_coral_sunset: 'Sunset Dialogue',
  community_03_violet_nebula: 'Nebula Quiz',
  community_04_ivory_marble: 'Marble Library',
  community_05_neon_grid: 'Neon Syntax',
  community_06_forest_rune: 'Forest Vocabulary',
  community_07_glacier_blue: 'Glacier Memory',
  community_08_ruby_velvet: 'Ruby Debate',
  community_09_brass_clockwork: 'Clockwork Grammar',
  community_10_paper_manuscript: 'Manuscript Notes',
  community_11_obsidian_star: 'Obsidian Focus',
  community_12_mint_enamel: 'Mint Flashcards',
  community_13_royal_purple: 'Crown Phrasebook',
  community_14_desert_sand: 'Desert Route',
  community_15_sakura_ink: 'Sakura Journal',
  community_16_steel_blueprint: 'Blueprint Lab',
  community_17_cyber_lime: 'Cyber Terminal',
  community_18_aurora: 'Aurora Word Path',
  community_19_coffee_leather: 'Coffee Notes',
  community_20_crystal_prism: 'Crystal Recall',
  community_21_midnight_moon: 'Moon Dictionary',
  community_22_teal_mosaic: 'Mosaic Tiles',
  community_23_amber_glass: 'Amber Lantern',
  community_24_ink_noir: 'Noir Casebook',
  community_25_garden_botanical: 'Botanical Verbs',
  community_26_ocean_pearl: 'Ocean Pearl',
  community_27_crimson_chess: 'Crimson Strategy',
  community_28_cloud_silver: 'Silver Cloud Sync',
  community_29_rainbow_foil: 'Rainbow Prism',
  community_30_slate_minimal: 'Slate Minimal',
};

export function isUgcCardBackId(s: string): s is UgcCardBackId {
  return (UGC_CARD_BACK_IDS as readonly string[]).includes(s);
}

export function normalizeUgcCardBackKey(raw: string | undefined | null): UgcCardBackId {
  const k = String(raw ?? '').trim();
  return isUgcCardBackId(k) ? k : UGC_CARD_BACK_DEFAULT_ID;
}

export function ugcCardBackLabel(raw: string, lang: Lang): string {
  const id = normalizeUgcCardBackKey(raw);
  const label = UGC_CARD_BACK_LABELS[id] ?? id;
  return triLang(lang, {
    ru: label,
    uk: label,
    en: label,
    es: label,
    'pt-BR': label,
    vi: label,
    id: label,
    tr: label,
    pl: label,
  });
}

export function cardBackImage(raw: string | undefined | null): ImageSourcePropType | undefined {
  return CARD_BACK_IMAGE[String(raw ?? '').trim()];
}

export function cardBackFanImage(raw: string | undefined | null): ImageSourcePropType | undefined {
  return CARD_BACK_FAN_IMAGE[String(raw ?? '').trim()];
}

function backIdForPack(pack: Pick<FlashcardMarketPack, 'id' | 'isCommunityUgc' | 'ugcCardBackKey'>): string {
  if (pack.isCommunityUgc) return normalizeUgcCardBackKey(pack.ugcCardBackKey);
  return pack.id;
}

export function cardBackImageForPack(
  pack: Pick<FlashcardMarketPack, 'id' | 'isCommunityUgc' | 'ugcCardBackKey'> | null | undefined,
): ImageSourcePropType | undefined {
  return pack ? cardBackImage(backIdForPack(pack)) : undefined;
}

export function cardBackFanImageForPack(
  pack: Pick<FlashcardMarketPack, 'id' | 'isCommunityUgc' | 'ugcCardBackKey'> | null | undefined,
): ImageSourcePropType | undefined {
  return pack ? cardBackFanImage(backIdForPack(pack)) : undefined;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

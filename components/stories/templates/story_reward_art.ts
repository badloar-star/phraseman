// ═══════════════════════════════════════════════════════════════════════════
// story_reward_art.ts — бронзовые статуэтки 12 лиг Пика для кадров историй наград (U36).
//
// зачем (владелец 11.11: «Да, можно» — статуэтки вершин можно показывать в историях как лицо лиги; картинки — «внутрь приложения»):
// кадр итога недели должен открываться мгновенно и без сети, поэтому 12 картинок лежат в бандле (~1,1 МБ), а не тянутся из облака.
// Порядок строк = порядок лиг (tier 0 Гранит … 11 Алмаз, modules/spire/tier_names.ts) — менять его нельзя.
// ═══════════════════════════════════════════════════════════════════════════
import { clampSpireTierIndex, SPIRE_TIER_COUNT } from '../../../modules/spire/tier_names';

// зачем: require картинки в React Native — число (номер ресурса бандла); его принимают и Image, и expo-image
const STATUES: readonly number[] = [
  require('../../../assets/images/spire-achievements/spire_summit_granite.webp'),
  require('../../../assets/images/spire-achievements/spire_summit_basalt.webp'),
  require('../../../assets/images/spire-achievements/spire_summit_marble.webp'),
  require('../../../assets/images/spire-achievements/spire_summit_jade.webp'),
  require('../../../assets/images/spire-achievements/spire_summit_quartz.webp'),
  require('../../../assets/images/spire-achievements/spire_summit_agate.webp'),
  require('../../../assets/images/spire-achievements/spire_summit_onyx.webp'),
  require('../../../assets/images/spire-achievements/spire_summit_amethyst.webp'),
  require('../../../assets/images/spire-achievements/spire_summit_opal.webp'),
  require('../../../assets/images/spire-achievements/spire_summit_topaz.webp'),
  require('../../../assets/images/spire-achievements/spire_summit_obsidian.webp'),
  require('../../../assets/images/spire-achievements/spire_summit_diamond.webp'),
];

/** Сколько статуэток в бандле — сторож сверяет с числом лиг. */
export const SPIRE_LEAGUE_STATUE_COUNT = STATUES.length;

/** Статуэтка лиги по её номеру; битое число из кэша прижимается к 0…11 и кадр не падает. */
export function spireLeagueStatue(tier: unknown): number {
  // индекс прижат к 0…11, а картинок ровно 12 — значение есть всегда
  return STATUES[clampSpireTierIndex(tier)] as number;
}

/** true — картинок ровно столько, сколько лиг (проверка порядка и полноты списка). */
export const SPIRE_LEAGUE_STATUES_COMPLETE = STATUES.length === SPIRE_TIER_COUNT;

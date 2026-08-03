// ════════════════════════════════════════════════════════════════════════════
// season_pass_track_config.ts — раскладка наград дорожки сезона (60 уровней).
// зачем: единый источник истины для экрана дорожки; типы и количества позиций —
// из утверждённого каталога docs/plans/2026-08-03-season-pass-gift-catalog.ru.md.
// Этап 1: конфиг read-only для отображения. Этап 2: серверная копия для клеймов.
// ════════════════════════════════════════════════════════════════════════════
import type { ImageSourcePropType } from 'react-native';

export type SeasonRewardKind =
  | 'pearls'            // жемчужины, amount
  | 'battery'           // полный заряд энергии
  | 'league_boost'      // очки лиги ×2 до конца дня
  | 'club_totem'        // +10% всей группе лиги на день
  | 'golden_lesson'     // следующий урок ×3 XP + гарантированный дроп
  | 'collection_magnet' // 24ч двойной шанс дропа коллекции
  | 'turbo_regen'       // энергия восстанавливается ×2 до конца дня
  | 'tournament_ticket' // вход в турнир без ставки
  | 'time_machine'      // чинит вчерашнюю дыру серии
  | 'friend_battery'    // отправить другу заряд энергии
  | 'choice_3'          // выбор: батарея / буст лиги / жемчуг
  | 'xp_bank'           // ×2 на следующие amount XP
  | 'plus_days'         // дни Plus (Pro получает жемчуг по курсу рулетки)
  | 'frame'             // рамка профиля сезона
  | 'aura_stage'        // стадия ауры (amount = 1..4, 4 = финальный вихрь)
  | 'nick_color'        // цвет ника сезона
  | 'custom_avatar'     // кастомный аватар
  | 'card_pack'         // фирменный набор карточек навсегда
  | 'season_finale';    // финал: аура-вихрь + перелив ника + титул (в профиле)

export interface SeasonReward { kind: SeasonRewardKind; amount?: number }
export interface SeasonTrackNode { level: number; free?: SeasonReward; pass?: SeasonReward }

// Иконки — утверждённые ассеты (assets/images/season). Жемчуг рисуется
// компонентом (тематическая жемчужина из coin_icons), у него иконки-файла нет.
export const SEASON_REWARD_ICONS: Partial<Record<SeasonRewardKind, ImageSourcePropType>> = {
  battery: require('../assets/images/season/reward_battery.webp'),
  league_boost: require('../assets/images/season/reward_league_boost.webp'),
  club_totem: require('../assets/images/season/reward_totem.webp'),
  golden_lesson: require('../assets/images/season/reward_golden_lesson.webp'),
  collection_magnet: require('../assets/images/season/reward_chest.webp'),
  turbo_regen: require('../assets/images/season/reward_battery.webp'),
  tournament_ticket: require('../assets/images/season/reward_crown.webp'),
  time_machine: require('../assets/images/season/reward_golden_lesson.webp'),
  friend_battery: require('../assets/images/season/reward_battery.webp'),
  choice_3: require('../assets/images/season/reward_chest.webp'),
  xp_bank: require('../assets/images/season/reward_golden_lesson.webp'),
  plus_days: require('../assets/images/season/reward_league_boost.webp'),
  frame: require('../assets/images/season/reward_crown.webp'),
  aura_stage: require('../assets/images/season/reward_aura.webp'),
  nick_color: require('../assets/images/season/reward_crown.webp'),
  custom_avatar: require('../assets/images/season/reward_aura.webp'),
  card_pack: require('../assets/images/season/reward_chest.webp'),
  season_finale: require('../assets/images/season/reward_crown.webp'),
};
// TODO(владелец): часть иконок временно переиспользована (магнит/билет/машина
// времени и др.) — уникальные генерятся Кодексом отдельным заходом.

const N = (level: number, free?: SeasonReward, pass?: SeasonReward): SeasonTrackNode => ({ level, free, pass });
const P = (amount: number): SeasonReward => ({ kind: 'pearls', amount });

/**
 * Правила раскладки (из ресерча и каталога): вехи статуса на 2/10/20/25/30/40/45/60;
 * free-линия без дыр длиннее 2 уровней; платный жемчуг суммарно 210 (self-refund
 * ~85% от цены 250); free-жемчуг 12; дни Plus на 12 и 33.
 */
export const SEASON_TRACK: readonly SeasonTrackNode[] = [
  N(1,  { kind: 'xp_bank', amount: 75 }),
  N(2,  undefined,                          { kind: 'frame' }),
  N(3,  P(2)),
  N(4,  { kind: 'golden_lesson' }),
  N(5,  undefined,                          P(15)),
  N(6,  { kind: 'battery' }),
  N(7,  { kind: 'turbo_regen' }),
  N(8,  undefined,                          { kind: 'league_boost' }),
  N(9,  P(2)),
  N(10, undefined,                          { kind: 'aura_stage', amount: 1 }),
  N(11, undefined,                          { kind: 'collection_magnet' }),
  N(12, { kind: 'plus_days', amount: 3 }),
  N(13, { kind: 'choice_3' }),
  N(14, undefined,                          P(20)),
  N(15, undefined,                          { kind: 'club_totem' }),
  N(16, { kind: 'battery' }),
  N(17, undefined,                          { kind: 'tournament_ticket' }),
  N(18, { kind: 'golden_lesson' }),
  N(19, { kind: 'friend_battery' }),
  N(20, undefined,                          { kind: 'nick_color' }),
  N(21, P(2)),
  N(22, undefined,                          { kind: 'choice_3' }),
  N(23, undefined,                          P(20)),
  N(24, undefined,                          { kind: 'league_boost' }),
  N(25, undefined,                          { kind: 'aura_stage', amount: 2 }),
  N(26, { kind: 'battery' }),
  N(27, { kind: 'turbo_regen' }),
  N(28, { kind: 'golden_lesson' }),
  N(29, undefined,                          { kind: 'collection_magnet' }),
  N(30, { kind: 'xp_bank', amount: 100 },   { kind: 'custom_avatar' }),
  N(31, P(2)),
  N(32, undefined,                          P(25)),
  N(33, { kind: 'plus_days', amount: 7 }),
  N(34, { kind: 'choice_3' }),
  N(35, undefined,                          { kind: 'club_totem' }),
  N(36, { kind: 'battery' }),
  N(37, undefined,                          { kind: 'tournament_ticket' }),
  N(38, undefined,                          { kind: 'league_boost' }),
  N(39, undefined,                          { kind: 'time_machine' }),
  N(40, undefined,                          { kind: 'aura_stage', amount: 3 }),
  N(41, undefined,                          P(25)),
  N(42, { kind: 'turbo_regen' }),
  N(43, P(2)),
  N(44, { kind: 'golden_lesson' }),
  N(45, undefined,                          { kind: 'card_pack' }),
  N(46, { kind: 'battery' }),
  N(47, undefined,                          { kind: 'collection_magnet' }),
  N(48, { kind: 'friend_battery' }),
  N(49, undefined,                          P(25)),
  N(50, undefined,                          P(40)),
  N(51, undefined,                          { kind: 'time_machine' }),
  N(52, undefined,                          { kind: 'league_boost' }),
  N(53, undefined,                          { kind: 'tournament_ticket' }),
  N(54, { kind: 'golden_lesson' }),
  N(55, P(2)),
  N(56, { kind: 'turbo_regen' }),
  N(57, undefined,                          P(40)),
  N(58, { kind: 'golden_lesson' },          { kind: 'collection_magnet' }),
  N(59, { kind: 'choice_3' }),
  N(60, { kind: 'xp_bank', amount: 150 },   { kind: 'season_finale' }),
] as const;

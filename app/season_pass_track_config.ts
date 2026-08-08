// ════════════════════════════════════════════════════════════════════════════
// season_pass_track_config.ts — раскладка наград дорожки сезона (60 уровней).
// зачем: единый источник истины для экрана дорожки; типы и количества позиций —
// из утверждённого каталога docs/plans/2026-08-03-season-pass-gift-catalog.ru.md.
// Этап 1: конфиг read-only для отображения. Этап 2: серверная копия для клеймов.
// ════════════════════════════════════════════════════════════════════════════
import type { ImageSourcePropType } from 'react-native';
import { isLightThemeMode, type ThemeMode } from '../constants/theme';
import type { Lang } from '../constants/i18n';

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
  | 'friend_shield'     // отправить другу щит серии (+1 день chain_shield)
  | 'choice_3'          // выбор: батарея / буст лиги / жемчуг
  | 'xp_bank'           // ×2 на следующие amount XP
  | 'plus_days'         // дни Plus (VIP-канал, Pro получает жемчуг по курсу рулетки)
  | 'frame'             // рамка профиля сезона
  | 'aura_stage'        // стадия ауры (amount = 1..4, 4 = финальный вихрь)
  | 'aura_secret'       // секретная пурпурная аура — эксклюзив уровня 50
  | 'nick_color'        // цвет ника сезона
  | 'custom_avatar'     // кастомный аватар
  | 'card_pack'         // фирменный набор карточек навсегда
  | 'season_finale';    // финал: аура-вихрь + перелив ника + титул (в профиле)

export interface SeasonReward { kind: SeasonRewardKind; amount?: number }
export interface SeasonTrackNode { level: number; free?: SeasonReward; pass?: SeasonReward }

// Жемчуг остаётся системной тематической иконкой из coin_icons. Все остальные
// предметные награды получают собственный DALL·E-ассет в двух семействах:
// sagePorcelain → light, все остальные ThemeMode → dark.
// Арт-контракт владельца: современные дизайнерские collectible-charms с сильным
// силуэтом; без fantasy/RPG, золотой филиграни, гербов, крыльев и драгоценных камней.
export const SEASON_REWARD_ART_KINDS = [
  'battery',
  'league_boost',
  'club_totem',
  'golden_lesson',
  'collection_magnet',
  'turbo_regen',
  'tournament_ticket',
  'time_machine',
  'friend_shield',
  'choice_3',
  'xp_bank',
  'plus_days',
  'frame',
  'nick_color',
  'custom_avatar',
  'card_pack',
] as const;

export type SeasonRewardArtKind = typeof SEASON_REWARD_ART_KINDS[number];
type SeasonArtTheme = 'light' | 'dark';

/**
 * Season 1 decorates the existing user-card shell; it is not a replacement card
 * and not an avatar ring. These are the same Azure tokens used by the real
 * profile-card visual in profile_card_system.ts.
 */
export const SEASON_PROFILE_CARD_FRAME_COLORS = {
  highlight: '#A9CBFF',
  main: '#5AA6FF',
  deep: '#2E7BFF',
} as const;

const SEASON_REWARD_ICON_SOURCES: Readonly<Record<SeasonArtTheme, Readonly<Record<SeasonRewardArtKind, ImageSourcePropType>>>> = {
  light: {
    battery: require('../assets/images/season/rewards/light/battery.webp'),
    league_boost: require('../assets/images/season/rewards/light/league_boost.webp'),
    club_totem: require('../assets/images/season/rewards/light/club_totem.webp'),
    golden_lesson: require('../assets/images/season/rewards/light/golden_lesson.webp'),
    collection_magnet: require('../assets/images/season/rewards/light/collection_magnet.webp'),
    turbo_regen: require('../assets/images/season/rewards/light/turbo_regen.webp'),
    tournament_ticket: require('../assets/images/season/rewards/light/tournament_ticket.webp'),
    time_machine: require('../assets/images/season/rewards/light/time_machine.webp'),
    friend_shield: require('../assets/images/season/rewards/light/friend_shield.webp'),
    choice_3: require('../assets/images/season/rewards/light/choice_3.webp'),
    xp_bank: require('../assets/images/season/rewards/light/xp_bank.webp'),
    plus_days: require('../assets/images/season/rewards/light/plus_days.webp'),
    frame: require('../assets/images/season/rewards/light/frame.webp'),
    nick_color: require('../assets/images/season/rewards/light/nick_color.webp'),
    custom_avatar: require('../assets/images/season/rewards/light/custom_avatar.webp'),
    card_pack: require('../assets/images/season/rewards/light/card_pack.webp'),
  },
  dark: {
    battery: require('../assets/images/season/rewards/dark/battery.webp'),
    league_boost: require('../assets/images/season/rewards/dark/league_boost.webp'),
    club_totem: require('../assets/images/season/rewards/dark/club_totem.webp'),
    golden_lesson: require('../assets/images/season/rewards/dark/golden_lesson.webp'),
    collection_magnet: require('../assets/images/season/rewards/dark/collection_magnet.webp'),
    turbo_regen: require('../assets/images/season/rewards/dark/turbo_regen.webp'),
    tournament_ticket: require('../assets/images/season/rewards/dark/tournament_ticket.webp'),
    time_machine: require('../assets/images/season/rewards/dark/time_machine.webp'),
    friend_shield: require('../assets/images/season/rewards/dark/friend_shield.webp'),
    choice_3: require('../assets/images/season/rewards/dark/choice_3.webp'),
    xp_bank: require('../assets/images/season/rewards/dark/xp_bank.webp'),
    plus_days: require('../assets/images/season/rewards/dark/plus_days.webp'),
    frame: require('../assets/images/season/rewards/dark/frame.webp'),
    nick_color: require('../assets/images/season/rewards/dark/nick_color.webp'),
    custom_avatar: require('../assets/images/season/rewards/dark/custom_avatar.webp'),
    card_pack: require('../assets/images/season/rewards/dark/card_pack.webp'),
  },
};

function seasonArtTheme(themeMode: ThemeMode): SeasonArtTheme {
  return isLightThemeMode(themeMode) ? 'light' : 'dark';
}

function isSeasonRewardArtKind(kind: SeasonRewardKind): kind is SeasonRewardArtKind {
  return (SEASON_REWARD_ART_KINDS as readonly SeasonRewardKind[]).includes(kind);
}

export function getSeasonRewardIcon(
  kind: SeasonRewardKind,
  themeMode: ThemeMode,
): ImageSourcePropType | undefined {
  return isSeasonRewardArtKind(kind)
    ? SEASON_REWARD_ICON_SOURCES[seasonArtTheme(themeMode)][kind]
    : undefined;
}

/**
 * Каждая сезонная аура состоит из трёх независимых растровых слоёв. Base дышит,
 * flow вращается отдельно, particles мерцают и идут с третьей скоростью — так
 * аура ощущается живой, а не одним вращающимся PNG-монолитом.
 */
export type SeasonAuraAsset = Readonly<{
  baseSource: ImageSourcePropType;
  flowSource: ImageSourcePropType;
  particlesSource: ImageSourcePropType;
  pulseMs: number;
  baseSpinMs: number;
  flowSpinMs: number;
  particlesSpinMs: number;
  flowReverse: boolean;
  particlesReverse: boolean;
}>;

const SEASON_AURA_STAGE_ASSETS: Readonly<Record<SeasonArtTheme, readonly SeasonAuraAsset[]>> = {
  light: [
    {
      baseSource: require('../assets/images/season/auras/light/stage-1-base.webp'),
      flowSource: require('../assets/images/season/auras/light/stage-1-flow.webp'),
      particlesSource: require('../assets/images/season/auras/light/stage-1-particles.webp'),
      pulseMs: 7200, baseSpinMs: 0, flowSpinMs: 28000, particlesSpinMs: 19000, flowReverse: false, particlesReverse: true,
    },
    {
      baseSource: require('../assets/images/season/auras/light/stage-2-base.webp'),
      flowSource: require('../assets/images/season/auras/light/stage-2-flow.webp'),
      particlesSource: require('../assets/images/season/auras/light/stage-2-particles.webp'),
      pulseMs: 6600, baseSpinMs: 46000, flowSpinMs: 24000, particlesSpinMs: 17000, flowReverse: true, particlesReverse: false,
    },
    {
      baseSource: require('../assets/images/season/auras/light/stage-3-base.webp'),
      flowSource: require('../assets/images/season/auras/light/stage-3-flow.webp'),
      particlesSource: require('../assets/images/season/auras/light/stage-3-particles.webp'),
      pulseMs: 5800, baseSpinMs: 38000, flowSpinMs: 20000, particlesSpinMs: 14500, flowReverse: false, particlesReverse: true,
    },
    {
      baseSource: require('../assets/images/season/auras/light/stage-4-base.webp'),
      flowSource: require('../assets/images/season/auras/light/stage-4-flow.webp'),
      particlesSource: require('../assets/images/season/auras/light/stage-4-particles.webp'),
      pulseMs: 4800, baseSpinMs: 32000, flowSpinMs: 16000, particlesSpinMs: 11500, flowReverse: true, particlesReverse: false,
    },
  ],
  dark: [
    {
      baseSource: require('../assets/images/season/auras/dark/stage-1-base.webp'),
      flowSource: require('../assets/images/season/auras/dark/stage-1-flow.webp'),
      particlesSource: require('../assets/images/season/auras/dark/stage-1-particles.webp'),
      pulseMs: 7200, baseSpinMs: 0, flowSpinMs: 28000, particlesSpinMs: 19000, flowReverse: false, particlesReverse: true,
    },
    {
      baseSource: require('../assets/images/season/auras/dark/stage-2-base.webp'),
      flowSource: require('../assets/images/season/auras/dark/stage-2-flow.webp'),
      particlesSource: require('../assets/images/season/auras/dark/stage-2-particles.webp'),
      pulseMs: 6600, baseSpinMs: 46000, flowSpinMs: 24000, particlesSpinMs: 17000, flowReverse: true, particlesReverse: false,
    },
    {
      baseSource: require('../assets/images/season/auras/dark/stage-3-base.webp'),
      flowSource: require('../assets/images/season/auras/dark/stage-3-flow.webp'),
      particlesSource: require('../assets/images/season/auras/dark/stage-3-particles.webp'),
      pulseMs: 5800, baseSpinMs: 38000, flowSpinMs: 20000, particlesSpinMs: 14500, flowReverse: false, particlesReverse: true,
    },
    {
      baseSource: require('../assets/images/season/auras/dark/stage-4-base.webp'),
      flowSource: require('../assets/images/season/auras/dark/stage-4-flow.webp'),
      particlesSource: require('../assets/images/season/auras/dark/stage-4-particles.webp'),
      pulseMs: 4800, baseSpinMs: 32000, flowSpinMs: 16000, particlesSpinMs: 11500, flowReverse: true, particlesReverse: false,
    },
  ],
};

export function getSeasonAuraStageAsset(stage: number, themeMode: ThemeMode): SeasonAuraAsset {
  const index = Math.max(0, Math.min(3, Math.round(stage) - 1));
  return SEASON_AURA_STAGE_ASSETS[seasonArtTheme(themeMode)][index];
}

/**
 * зачем 2026-08-04 (владелец, со скриншотом «Аура стадия .. ок»: у стадии
 * ауры нет собственного имени, только римская цифра): каждая стадия — это
 * реально разный ассет с разной скоростью пульса и вращения (см.
 * SEASON_AURA_STAGE_ASSETS выше: пульс ускоряется 7200→4800мс, вращение
 * 28000→16000мс от стадии I к IV), но на плитке и в модалках это было видно
 * ТОЛЬКО как номер — «Аура · стадія II» ничего не говорит о том, что это за
 * аура. Имена подобраны по той же нарастающей интенсивности, что и сам
 * ассет: I — едва тлеет, IV — уже вихрь (отсюда и season_finale =
 * «финальный вихрь», следующая ступень после IV).
 *
 * Живёт здесь, а не в season_pass.tsx: и экран дорожки, и обе модалки
 * (SeasonGiftModal — клейм, SeasonRewardInfoModal — просмотр) должны
 * называть стадию одинаково, а не по-разному в трёх местах.
 */
export const SEASON_AURA_STAGE_NAMES: Record<Lang, readonly [string, string, string, string]> = {
  ru: ['Тление', 'Разгорание', 'Полыхание', 'Вихрь'],
  uk: ['Тління', 'Розгоряння', 'Полум\'я', 'Вихор'],
  es: ['Rescoldo', 'Llama', 'Incandescencia', 'Vórtice'],
  'pt-BR': ['Brasa', 'Chama', 'Incandescência', 'Vórtice'],
  vi: ['Âm ỉ', 'Bùng cháy', 'Rực sáng', 'Xoáy lốc'],
  id: ['Bara', 'Nyala', 'Berpijar', 'Pusaran'],
  tr: ['Köz', 'Alev', 'Kızıllık', 'Girdap'],
  pl: ['Żar', 'Płomień', 'Blask', 'Wir'],
};

/** Индекс стадии 0..3 из amount (1..4), с защитой от выхода за границы. */
export function seasonAuraStageIndex(amount: number | undefined): 0 | 1 | 2 | 3 {
  return Math.max(0, Math.min(3, Math.round(amount ?? 1) - 1)) as 0 | 1 | 2 | 3;
}

/** Секретная пурпурная аура — эксклюзив 50 уровня (владелец, 2026-08-03). */
const SEASON_SECRET_AURA_ASSETS: Readonly<Record<SeasonArtTheme, SeasonAuraAsset>> = {
  light: {
    baseSource: require('../assets/images/season/auras/light/secret-base.webp'),
    flowSource: require('../assets/images/season/auras/light/secret-flow.webp'),
    particlesSource: require('../assets/images/season/auras/light/secret-particles.webp'),
    pulseMs: 5200, baseSpinMs: 36000, flowSpinMs: 18000, particlesSpinMs: 10000, flowReverse: false, particlesReverse: true,
  },
  dark: {
    baseSource: require('../assets/images/season/auras/dark/secret-base.webp'),
    flowSource: require('../assets/images/season/auras/dark/secret-flow.webp'),
    particlesSource: require('../assets/images/season/auras/dark/secret-particles.webp'),
    pulseMs: 5200, baseSpinMs: 36000, flowSpinMs: 18000, particlesSpinMs: 10000, flowReverse: false, particlesReverse: true,
  },
};

export function getSeasonSecretAuraAsset(themeMode: ThemeMode): SeasonAuraAsset {
  return SEASON_SECRET_AURA_ASSETS[seasonArtTheme(themeMode)];
}

/** Resolves the canonical `user_avatar_aura` value to its layered season art. */
export function getSeasonAuraAssetForAvatarId(
  auraId: string | null | undefined,
  themeMode: ThemeMode,
): SeasonAuraAsset | undefined {
  switch (auraId) {
    case 'aura-season-1-stage-1': return getSeasonAuraStageAsset(1, themeMode);
    case 'aura-season-1-stage-2': return getSeasonAuraStageAsset(2, themeMode);
    case 'aura-season-1-stage-3': return getSeasonAuraStageAsset(3, themeMode);
    case 'aura-season-1-stage-4': return getSeasonAuraStageAsset(4, themeMode);
    case 'aura-season-1-secret': return getSeasonSecretAuraAsset(themeMode);
    default: return undefined;
  }
}

const N = (level: number, free?: SeasonReward, pass?: SeasonReward): SeasonTrackNode => ({ level, free, pass });
const P = (amount: number): SeasonReward => ({ kind: 'pearls', amount });

/**
 * Правила раскладки (из ресерча и каталога): вехи статуса на 2/10/20/25/30/40/45/60;
 * free-линия без дыр длиннее 2 уровней; платный жемчуг суммарно 210 (self-refund
 * ~85% от цены 250); free-жемчуг 12; дни Plus на 12 и 33.
 */
export const SEASON_TRACK: readonly SeasonTrackNode[] = [
  // зачем 2026-08-04 (владелец: «банк опыта первый 75 исправь на 1500 и
  // следующие соответственно чтобы была ценность»): 75/100/150 XP — меньше
  // одного пройденного урока, подарок ощущался как ничто на фоне соседних
  // наград (пропуск турнира, дни Plus). Новая база 1500/2000/3000 держит ТОТ
  // ЖЕ относительный рост между ступенями (×1.33, ×1.5), что и раньше, просто
  // на порядок, где число реально что-то весит. amount зачисляется НАПРЯМУЮ в
  // XP-банк (season_reward_apply.ts → creditXpBank), без множителей — то, что
  // здесь написано, игрок и получит.
  N(1,  { kind: 'xp_bank', amount: 1500 }),
  N(2,  undefined,                          { kind: 'frame' }),
  // зачем 2026-08-04 (владелец: «жемчужины для фри — первый 2, второй 4 и так
  // далее»): 6 подарков-жемчужин бесплатной линии (ур. 3/9/21/31/43/55) были
  // одинаковыми — 2 каждый раз, без чувства прогресса. Теперь удвоение на
  // каждый следующий: 2→4→8→16→32→64.
  N(3,  P(2)),
  N(4,  { kind: 'golden_lesson' }),
  N(5,  undefined,                          P(15)),
  N(6,  { kind: 'battery' }),
  N(7,  { kind: 'turbo_regen' }),
  N(8,  undefined,                          { kind: 'league_boost' }),
  N(9,  P(4)),
  N(10, undefined,                          { kind: 'aura_stage', amount: 1 }),
  N(11, undefined,                          { kind: 'collection_magnet' }),
  N(12, { kind: 'plus_days', amount: 3 }),
  N(13, { kind: 'choice_3' }),
  N(14, undefined,                          P(20)),
  N(15, undefined,                          { kind: 'club_totem' }),
  N(16, { kind: 'battery' }),
  N(17, undefined,                          { kind: 'tournament_ticket' }),
  N(18, { kind: 'golden_lesson' }),
  N(19, { kind: 'friend_shield' }),
  N(20, undefined,                          { kind: 'nick_color' }),
  N(21, P(8)),
  N(22, undefined,                          { kind: 'choice_3' }),
  N(23, undefined,                          P(20)),
  N(24, undefined,                          { kind: 'league_boost' }),
  N(25, undefined,                          { kind: 'aura_stage', amount: 2 }),
  N(26, { kind: 'battery' }),
  N(27, { kind: 'turbo_regen' }),
  N(28, { kind: 'golden_lesson' }),
  N(29, undefined,                          { kind: 'collection_magnet' }),
  N(30, { kind: 'xp_bank', amount: 2000 },  { kind: 'custom_avatar' }),
  N(31, P(16)),
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
  N(43, P(32)),
  N(44, { kind: 'golden_lesson' }),
  N(45, undefined,                          { kind: 'card_pack' }),
  N(46, { kind: 'battery' }),
  N(47, undefined,                          { kind: 'collection_magnet' }),
  N(48, { kind: 'friend_shield' }),
  N(49, undefined,                          P(25)),
  // зачем: слот 50 (владелец, 2026-08-03) — секретная пурпурная аура, эксклюзив
  // именно этого уровня: не выдаётся больше нигде и никогда, статус «дошедшего».
  N(50, undefined,                          { kind: 'aura_secret' }),
  N(51, undefined,                          { kind: 'time_machine' }),
  N(52, undefined,                          { kind: 'league_boost' }),
  N(53, undefined,                          { kind: 'tournament_ticket' }),
  N(54, { kind: 'golden_lesson' }),
  N(55, P(64)),
  N(56, { kind: 'turbo_regen' }),
  N(57, undefined,                          P(40)),
  N(58, { kind: 'golden_lesson' },          { kind: 'collection_magnet' }),
  N(59, { kind: 'choice_3' }),
  N(60, { kind: 'xp_bank', amount: 3000 },  { kind: 'season_finale' }),
] as const;

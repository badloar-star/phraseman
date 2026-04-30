/**
 * Level-Up Gift System — подарок при повышении уровня.
 *
 * F2P — расширенный пул: осколки, энергия до полуночи, арена, бесплатный буст клуба, пари-скидка, …
 * Premium — отдельный пул: крупные осколки + редко проба набора 48ч (без «лишней» энергии).
 *
 * Обычный уровень: 60% common / 30% rare / 10% epic.
 * Круг (10,20,30,40,50): только rare/epic 60%/40%.
 * Anti-frustration на круге: не выдать hint_1 третий подряд (см. историю).
 *
 * Множитель XP: 'gift_xp_multiplier' → { multiplier, expiresAt }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { triLang, type Lang } from '../constants/i18n';
import { addArenaPlaysBonusForToday } from './arena_daily_limit';
import { grantClubGiftFreeBoostFromLevel } from './club_boosts';
import { primeMarketplaceBuiltCardsCacheFromAccessibleStorage } from './flashcards/marketplace';
import { setRandomPackGiftTrial48h } from './flashcards/pack_trial_gift';
import { addShards, addShardsRaw } from './shards_system';
import { registerXP } from './xp_manager';
import { getVerifiedPremiumStatus } from './premium_guard';

export type GiftRarity = 'common' | 'rare' | 'epic';

export type GiftId = string;

export interface GiftDef {
  id:      GiftId;
  rarity:  GiftRarity;
  icon:    string;
  titleRU: string;
  titleUK: string;
  /** Если пусто при lang es — показываем titleRU */
  titleES?: string;
  descRU:  string;
  descUK:  string;
  descES?: string;
  weight:  number;
}

export function giftTitleForLang(g: GiftDef, lang: Lang): string {
  return triLang(lang, { ru: g.titleRU, uk: g.titleUK, es: g.titleES ?? g.titleRU });
}

export function giftDescForLang(g: GiftDef, lang: Lang): string {
  return triLang(lang, { ru: g.descRU, uk: g.descUK, es: g.descES ?? g.descRU });
}

export function giftLocaleStrings(lang: Lang, g: GiftDef): { title: string; desc: string } {
  return { title: giftTitleForLang(g, lang), desc: giftDescForLang(g, lang) };
}

const GIFT_RARITY_UI_LABEL: Record<GiftRarity, { ru: string; uk: string; es: string }> = {
  common: { ru: 'Обычный', uk: 'Звичайний', es: 'Común' },
  rare: { ru: 'Редкий', uk: 'Рідкісний', es: 'Raro' },
  epic: { ru: '✨ Эпический', uk: '✨ Епічний', es: '✨ Épico' },
};

export function giftRarityUiLabel(rarity: GiftRarity | string | undefined | null, lang: Lang): string {
  const r = rarity === 'rare' || rarity === 'epic' ? rarity : 'common';
  return triLang(lang, GIFT_RARITY_UI_LABEL[r]);
}

const GIFT_F2P: GiftDef[] = [
  {
    id: 'energy_full', rarity: 'common', icon: '⚡', weight: 9,
    titleRU: 'Полная энергия', titleUK: 'Повна енергія', titleES: 'Energía al máximo',
    descRU: 'Все слоты энергии восстановлены прямо сейчас',
    descUK: 'Всі слоти енергії відновлено прямо зараз',
    descES: 'Todas las ranuras de energía recuperadas al instante',
  },
  {
    id: 'energy_plus1', rarity: 'common', icon: '⚡', weight: 8,
    titleRU: '+1 к энергии до полуночи', titleUK: '+1 до енергії до півночі', titleES: '+1 energía hasta medianoche',
    descRU: 'Один бонус-слот энергии до полуночи (не суммируется с предыдущим бонусом — заменяет)',
    descUK: 'Один бонус-слот енергії до півночі (не додається до попереднього — замінює)',
    descES: 'Un hueco extra de energía hasta medianoche (no se acumula con el anterior; lo sustituye)',
  },
  {
    id: 'xp_50', rarity: 'common', icon: '✨', weight: 7,
    titleRU: '+50 XP', titleUK: '+50 XP', titleES: '+50 XP',
    descRU: 'Мгновенные 50 опыта', descUK: 'Миттєвих 50 досвіду', descES: 'Al instante +50 XP',
  },
  {
    id: 'xp_100', rarity: 'common', icon: '✨', weight: 7,
    titleRU: '+100 XP', titleUK: '+100 XP', titleES: '+100 XP',
    descRU: 'Мгновенные 100 опыта', descUK: 'Миттєвих 100 досвіду', descES: 'Al instante +100 XP',
  },
  {
    id: 'xp_250', rarity: 'common', icon: '✨', weight: 6,
    titleRU: '+250 XP', titleUK: '+250 XP', titleES: '+250 XP',
    descRU: 'Мгновенные 250 опыта', descUK: 'Миттєвих 250 досвіду', descES: 'Al instante +250 XP',
  },
  {
    id: 'hint_1', rarity: 'common', icon: '💡', weight: 8,
    titleRU: '+1 подсказка', titleUK: '+1 підказка', titleES: '+1 pista',
    descRU: 'Дополнительная подсказка в уроках сегодня', descUK: 'Додаткова підказка в уроках сьогодні',
    descES: 'Pista extra en las lecciones de hoy',
  },
  {
    id: 'shards_3', rarity: 'common', icon: '💎', weight: 7,
    titleRU: '+3 осколка', titleUK: '+3 осколки', titleES: '+3 fragmentos',
    descRU: 'Три осколка знаний', descUK: 'Три осколки знань', descES: 'Tres fragmentos de conocimiento',
  },
  {
    id: 'arena_extra_5', rarity: 'common', icon: '🎟️', weight: 5,
    titleRU: '+5 рейтинг-игр сегодня', titleUK: '+5 рейтинг-ігор сьогодні', titleES: '+5 partidas Arena hoy',
    descRU: 'Сегодня до 10 рейтинг-матчей (вместо 5). Обновится в полночь',
    descUK: 'Сьогодні до 10 рейтинг-матчів (замість 5). Оновиться о півночі',
    descES: 'Hoy hasta 10 partidas clasificadas (en lugar de 5). Se restablece a medianoche',
  },
  {
    id: 'xp_2x_24h', rarity: 'rare', icon: '🔥', weight: 9,
    titleRU: '+100% опыта на 24 часа', titleUK: '+100% досвіду на 24 години', titleES: '+100 % XP en 24 h',
    descRU: 'Все занятия приносят +100% опыта 1 день',
    descUK: 'Всі заняття приносять +100% досвіду 1 день',
    descES: 'Todas las actividades dan +100 % de XP durante un día',
  },
  {
    id: 'energy_plus2', rarity: 'rare', icon: '⚡', weight: 7,
    titleRU: '+2 к энергии до полуночи', titleUK: '+2 до енергії до півночі', titleES: '+2 energía hasta medianoche',
    descRU: 'Два бонус-слота энергии до полуночи', descUK: 'Два бонус-слоти енергії до півночі',
    descES: 'Dos huecos extra de energía hasta medianoche',
  },
  {
    id: 'chain_shield_1', rarity: 'rare', icon: '🛡️', weight: 8,
    titleRU: 'Заморозка цепочки', titleUK: 'Заморожування ланцюжка', titleES: 'Congelación de racha',
    descRU: 'Один день без занятий не прервёт твою цепочку',
    descUK: 'Один день без занять не перерве твій ланцюжок',
    descES: 'Un día sin practicar no romperá tu racha',
  },
  {
    id: 'hint_3', rarity: 'rare', icon: '💡', weight: 6,
    titleRU: '+3 подсказки', titleUK: '+3 підказки', titleES: '+3 pistas',
    descRU: 'Три доп. подсказки в уроках сегодня', descUK: 'Три дод. підказки в уроках сьогодні',
    descES: 'Tres pistas extra en las lecciones de hoy',
  },
  {
    id: 'shards_6', rarity: 'rare', icon: '💎', weight: 6,
    titleRU: '+6 осколков', titleUK: '+6 осколків', titleES: '+6 fragmentos',
    descRU: 'Шесть осколков — редкая награда', descUK: 'Шість осколків — рідкісна нагорода',
    descES: 'Seis fragmentos — premio poco habitual',
  },
  {
    id: 'club_boost_free', rarity: 'rare', icon: '👥', weight: 6,
    titleRU: 'Буст клуба бесплатно', titleUK: 'Буст клубу безкоштовно', titleES: 'Impulso de liga gratis',
    descRU: 'Следующая активация буста в клубе без осколков',
    descUK: 'Наступна активація буста в клубі без осколків',
    descES: 'La próxima activación del impulso en la liga no cuesta fragmentos',
  },
  {
    id: 'xp_2x_48h', rarity: 'epic', icon: '🚀', weight: 3,
    titleRU: '+100% опыта на 48 часов', titleUK: '+100% досвіду на 48 годин', titleES: '+100 % XP en 48 h',
    descRU: 'Все занятия приносят +100% опыта 2 дня', descUK: 'Всі заняття +100% досвіду 2 дні',
    descES: 'Todas las actividades dan +100 % de XP durante dos días',
  },
  {
    id: 'energy_plus3', rarity: 'epic', icon: '⚡', weight: 2,
    titleRU: '+3 к энергии до полуночи', titleUK: '+3 до енергії до півночі', titleES: '+3 energía hasta medianoche',
    descRU: 'Три бонус-слота энергии до полуночи', descUK: 'Три бонус-слоти енергії до півночі',
    descES: 'Tres huecos extra de energía hasta medianoche',
  },
  {
    id: 'chain_shield_3', rarity: 'epic', icon: '🛡️', weight: 2,
    titleRU: 'Заморозка на 3 дня', titleUK: 'Заморожування на 3 дні', titleES: 'Congelación 3 días',
    descRU: 'Три дня защиты цепочки', descUK: 'Три дні захисту ланцюжка', descES: 'Tres días de protección para la racha',
  },
  {
    id: 'wager_discount_25', rarity: 'epic', icon: '🎲', weight: 2,
    titleRU: 'Скидка на пари −25%', titleUK: 'Знижка на пари −25%', titleES: '−25 % en la apuesta',
    descRU: 'Следующее пари: на 25% дешевле (одно пари, ключ сбрасывается при ставке)',
    descUK: 'Наступне пари: на 25% дешевше (одне пари, знімається при ставці)',
    descES: 'La siguiente apuesta cuesta un 25 % menos (una sola vez; se usa al apostar)',
  },
  {
    id: 'shards_10', rarity: 'epic', icon: '💎', weight: 2,
    titleRU: '+10 осколков', titleUK: '+10 осколків', titleES: '+10 fragmentos',
    descRU: 'Десять осколков', descUK: 'Десять осколків', descES: 'Diez fragmentos',
  },
];

/** Тільки осколки + рідкісна проба набору — без дод. енергії для преміум (безкоштовна денна арена в нього і так є). */
const GIFT_PREMIUM: GiftDef[] = [
  {
    id: 'prem_shards_10', rarity: 'common', icon: '💎', weight: 5,
    titleRU: '+10 осколков (премиум)', titleUK: '+10 осколків (преміум)', titleES: '+10 fragmentos (Premium)',
    descRU: 'Щедрая награда для премиум',
    descUK: 'Щедра нагорода для преміум',
    descES: 'Recompensa generosa para usuarios Premium',
  },
  {
    id: 'prem_shards_15', rarity: 'rare', icon: '💎', weight: 4,
    titleRU: '+15 осколков (премиум)', titleUK: '+15 осколків (преміум)', titleES: '+15 fragmentos (Premium)',
    descRU: 'Щедрая награда', descUK: 'Щедра нагорода', descES: 'Recompensa generosa',
  },
  {
    id: 'prem_shards_20', rarity: 'epic', icon: '💎', weight: 4,
    titleRU: '+20 осколков (премиум)', titleUK: '+20 осколків (преміум)', titleES: '+20 fragmentos (Premium)',
    descRU: 'Много осколков за уровень', descUK: 'Багато осколків за рівень',
    descES: 'Muchos fragmentos por subir de nivel',
  },
  {
    id: 'prem_pack_48h', rarity: 'epic', icon: '📦', weight: 1,
    titleRU: '48 ч пробного набора', titleUK: '48 год пробного набору', titleES: 'Pack de prueba 48 h',
    descRU: 'Случайный платный набор — полный просмотр 48 ч (см. таймер в магазине)',
    descUK: 'Випадковий платний набір — повний перегляд 48 год (таймер у магазині)',
    descES: 'Un pack de pago aleatorio — acceso completo 48 h (cuenta atrás en la tienda)',
  },
];

const ROUND_LEVELS = new Set([10, 20, 30, 40, 50]);
const GIFT_HISTORY_KEY = 'level_gift_last_ids_v1';
const WAGER_DISCOUNT_KEY = 'wager_discount';
const PREMIUM_BLOCKED_F2P_IDS = new Set<GiftId>([
  'arena_extra_5',
  'energy_full',
  'energy_plus1',
  'energy_plus2',
  'energy_plus3',
]);

const weightedPick = (pool: GiftDef[], level: number): GiftDef => {
  const isRound = ROUND_LEVELS.has(level);
  const rr = Math.random();
  let target: GiftRarity;
  if (isRound) {
    target = rr < 0.6 ? 'rare' : 'epic';
  } else {
    if (rr < 0.6) target = 'common';
    else if (rr < 0.9) target = 'rare';
    else target = 'epic';
  }
  const sub = pool.filter(g => g.rarity === target);
  const totalWeight = sub.reduce((s, g) => s + g.weight, 0);
  let r = Math.random() * totalWeight;
  for (const g of sub) {
    r -= g.weight;
    if (r <= 0) return g;
  }
  return sub[sub.length - 1]!;
};

async function getRecentGiftIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(GIFT_HISTORY_KEY);
    if (!raw) return [];
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a.filter((x: unknown) => typeof x === 'string') : [];
  } catch { return []; }
}

async function pushGiftHistory(id: string): Promise<void> {
  const cur = await getRecentGiftIds();
  cur.push(id);
  const next = cur.slice(-3);
  await AsyncStorage.setItem(GIFT_HISTORY_KEY, JSON.stringify(next));
}

/**
 * Синхронный ролл (без премиум-ветки и без анти-повторов) — тесты / миграции.
 */
export function rollGift(level: number): GiftDef {
  return weightedPick(GIFT_F2P, level);
}

const getF2pPool = (premiumSafe: boolean): GiftDef[] =>
  premiumSafe ? GIFT_F2P.filter(g => !PREMIUM_BLOCKED_F2P_IDS.has(g.id)) : GIFT_F2P;

/** F2P-пул: анти-triple-hint_1 на круглых уровнях; premiumSafe исключает бесполезные для премиум награды. */
export async function rollF2pLevelGiftForUser(level: number, opts?: { premiumSafe?: boolean }): Promise<GiftDef> {
  const isRound = ROUND_LEVELS.has(level);
  const pool = getF2pPool(!!opts?.premiumSafe);
  let attempts = 0;
  let g: GiftDef;
  do {
    g = weightedPick(pool, level);
    attempts++;
    const hist = await getRecentGiftIds();
    const bad = isRound && g.id === 'hint_1' && hist[hist.length - 1] === 'hint_1' && hist[hist.length - 2] === 'hint_1';
    if (!bad) break;
  } while (attempts < 12);
  await pushGiftHistory(g.id);
  return g;
}

/** Второй сундук — только GIFT_PREMIUM; пишет историю. */
export async function rollPremiumLevelGiftForUser(level: number): Promise<GiftDef> {
  const g = weightedPick(GIFT_PREMIUM, level);
  await pushGiftHistory(g.id);
  return g;
}

/**
 * Один сундук (тесты / редкие сценарии):
 *  - `false` или `null` → F2P
 *  - `true` → только премиум-пул
 */
export async function rollLevelGiftForUser(level: number, isPremium: boolean | null = null): Promise<GiftDef> {
  if (isPremium === true) return rollPremiumLevelGiftForUser(level);
  return rollF2pLevelGiftForUser(level);
}

/** Storage */
const GIFT_MULT_KEY = 'gift_xp_multiplier';
const BONUS_HINTS_KEY = (date: string) => `bonus_hints_${date}`;
const CHAIN_SHIELD_KEY = 'chain_shield';
export const BONUS_ENERGY_KEY = 'energy_gift_bonus';

export interface BonusEnergyState { amount: number; expiresAt: number }

function getTomorrowMidnightMs(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const readBonusEnergy = async (): Promise<BonusEnergyState | null> => {
  try {
    const raw = await AsyncStorage.getItem(BONUS_ENERGY_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw) as BonusEnergyState;
    if (Date.now() >= b.expiresAt) {
      await AsyncStorage.removeItem(BONUS_ENERGY_KEY);
      return null;
    }
    return b;
  } catch { return null; }
};

export interface GiftMultiplierState { multiplier: number; expiresAt: number }

export const readGiftMultiplier = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(GIFT_MULT_KEY);
    if (!raw) return 1;
    const state: GiftMultiplierState = JSON.parse(raw);
    if (Date.now() > state.expiresAt) {
      await AsyncStorage.removeItem(GIFT_MULT_KEY);
      return 1;
    }
    return state.multiplier;
  } catch { return 1; }
};

export const getBonusHintsToday = async (): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    return parseInt((await AsyncStorage.getItem(BONUS_HINTS_KEY(today))) || '0', 10) || 0;
  } catch { return 0; }
};

export interface ApplyGiftResult {
  success: boolean;
  xpBoostAlreadyActive?: boolean;
  energyBoostAlreadyActive?: boolean;
}

const applyEnergyBonusN = async (
  n: 1 | 2 | 3,
  currentEnergy: number,
  setEnergy: (n: number) => void,
): Promise<ApplyGiftResult> => {
  const existing = await readBonusEnergy();
  const energyBoostAlreadyActive = existing !== null && (existing.amount ?? 0) > 0;
  const bonus: BonusEnergyState = { amount: n, expiresAt: getTomorrowMidnightMs() };
  await AsyncStorage.setItem(BONUS_ENERGY_KEY, JSON.stringify(bonus));
  await setEnergy(currentEnergy);
  return { success: true, energyBoostAlreadyActive };
};

export const applyGift = async (
  gift: GiftDef,
  userName: string,
  currentEnergy: number,
  maxEnergy: number,
  setEnergy: (n: number) => void,
  opts?: { isPremium?: boolean },
): Promise<ApplyGiftResult> => {
  try {
    const isPremium = opts?.isPremium ?? await getVerifiedPremiumStatus();
    const today = new Date().toISOString().split('T')[0];
    let id = gift.id;
    // Safety-net: если старый/ручной подарок всё же попал премиуму, заменяем на осколки.
    if (isPremium && PREMIUM_BLOCKED_F2P_IDS.has(id)) {
      id = 'prem_shards_10';
    }

    switch (id) {
      case 'energy_full': {
        setEnergy(maxEnergy);
        const esRaw = await AsyncStorage.getItem('energy_state');
        const es = esRaw ? (JSON.parse(esRaw) as { current: number; lastRecoveryTime: number }) : { lastRecoveryTime: Date.now() };
        await AsyncStorage.setItem('energy_state', JSON.stringify({ current: maxEnergy, lastRecoveryTime: es.lastRecoveryTime }));
        break;
      }
      case 'xp_50':
        await registerXP(50, 'achievement_reward', userName);
        break;
      case 'xp_100':
        await registerXP(100, 'achievement_reward', userName);
        break;
      case 'xp_250':
        await registerXP(250, 'achievement_reward', userName);
        break;
      case 'hint_1':
      case 'hint_3': {
        const count = id === 'hint_1' ? 1 : 3;
        const cur = parseInt((await AsyncStorage.getItem(BONUS_HINTS_KEY(today))) || '0', 10) || 0;
        await AsyncStorage.setItem(BONUS_HINTS_KEY(today), String(cur + count));
        break;
      }
      case 'energy_plus1':
        return await applyEnergyBonusN(1, currentEnergy, setEnergy);
      case 'energy_plus2':
        return await applyEnergyBonusN(2, currentEnergy, setEnergy);
      case 'energy_plus3':
        return await applyEnergyBonusN(3, currentEnergy, setEnergy);
      case 'chain_shield_1':
      case 'chain_shield_3': {
        const days = id === 'chain_shield_1' ? 1 : 3;
        const raw = await AsyncStorage.getItem(CHAIN_SHIELD_KEY);
        const ex = raw ? (JSON.parse(raw) as { daysLeft: number }) : null;
        const daysLeft = (ex?.daysLeft ?? 0) + days;
        await AsyncStorage.setItem(CHAIN_SHIELD_KEY, JSON.stringify({ daysLeft, grantedAt: today }));
        break;
      }
      case 'xp_2x_24h':
      case 'xp_2x_48h': {
        const hours = id === 'xp_2x_24h' ? 24 : 48;
        const existingRaw = await AsyncStorage.getItem(GIFT_MULT_KEY);
        const xpBoostAlreadyActive = existingRaw ? (() => {
          try { const s: GiftMultiplierState = JSON.parse(existingRaw); return Date.now() < s.expiresAt; } catch { return false; }
        })() : false;
        await AsyncStorage.setItem(GIFT_MULT_KEY, JSON.stringify({ multiplier: 2, expiresAt: Date.now() + hours * 3600000 }));
        return { success: true, xpBoostAlreadyActive };
      }
      case 'shards_3': {
        for (let i = 0; i < 3; i++) await addShards('level_gift', { suppressEarnEvent: true });
        break;
      }
      case 'shards_6': {
        for (let i = 0; i < 6; i++) await addShards('level_gift', { suppressEarnEvent: true });
        break;
      }
      case 'shards_10': {
        for (let i = 0; i < 10; i++) await addShards('level_gift', { suppressEarnEvent: true });
        break;
      }
      case 'arena_extra_5': {
        await addArenaPlaysBonusForToday(5);
        break;
      }
      case 'club_boost_free': {
        await grantClubGiftFreeBoostFromLevel();
        break;
      }
      case 'wager_discount_25': {
        await AsyncStorage.setItem(WAGER_DISCOUNT_KEY, '0.25');
        break;
      }
      case 'prem_shards_10': {
        await addShardsRaw(10, 'level_premium_gift');
        break;
      }
      case 'prem_shards_15': {
        await addShardsRaw(15, 'level_premium_gift');
        break;
      }
      case 'prem_shards_20': {
        await addShardsRaw(20, 'level_premium_gift');
        break;
      }
      case 'prem_pack_48h': {
        await setRandomPackGiftTrial48h();
        await primeMarketplaceBuiltCardsCacheFromAccessibleStorage();
        break;
      }
      default:
        return { success: false };
    }
    return { success: true };
  } catch { return { success: false }; }
};

export function isEnergyBonusGiftId(gid: string | undefined): boolean {
  if (!gid) return false;
  return gid === 'energy_plus1' || gid === 'energy_plus2' || gid === 'energy_plus3';
}

/**
 * Сколько осколков выдаёт подарок (0 = не осколочный).
 * Единый источник правды для UI: чтобы не рисовать 💎-эмодзи там, где должна быть
 * кучка осколков из `assets/images/levels/OSKOLOK*.png`.
 */
export function giftShardAmount(gid: string | undefined): number {
  if (!gid) return 0;
  switch (gid) {
    case 'shards_3': return 3;
    case 'shards_6': return 6;
    case 'shards_10': return 10;
    case 'prem_shards_10': return 10;
    case 'prem_shards_15': return 15;
    case 'prem_shards_20': return 20;
    default: return 0;
  }
}

export const ALL_LEVEL_GIFT_DEFS: GiftDef[] = [...GIFT_F2P, ...GIFT_PREMIUM];

export { GIFT_F2P as GIFT_POOL, WAGER_DISCOUNT_KEY };
export default {};

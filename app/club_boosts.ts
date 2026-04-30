/**
 * Club Boosts System
 * Управление групповыми бустерами для членов клуба
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { activateGroupBoost, getCachedGroupBoosts, invalidateGroupBoostsCache } from './firestore_boosts';
import { emitAppEvent } from './events';
import type { Lang } from '../constants/i18n';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface BoostDef {
  id: string; // 'xp_2x_1h', 'xp_1_5x_2h', 'energy_plus_1'
  nameRU: string;
  nameUK: string;
  nameES: string;
  descRU: string;
  descUK: string;
  descES: string;
  multiplier?: number; // для XP бустов (2.0, 1.5)
  durationMs: number; // длительность в миллисекундах
  cost: number; // стоимость
  costCurrency: 'xp' | 'shards'; // валюта стоимости
  icon: string;
  type: 'xp' | 'energy'; // тип буста
}

export interface ActiveBoost {
  id: string; // boostDef.id
  activatedBy: string; // имя игрока, кто активировал
  activatedAt: number; // timestamp активации
  durationMs: number; // длительность буста
}

export interface BoostHistory {
  boostId: string;
  activatedBy: string;
  activatedAt: number;
  cost: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOSTS CATALOG
// ═══════════════════════════════════════════════════════════════════════════

export const CLUB_BOOSTS: BoostDef[] = [
  {
    id: 'xp_2x_2h_250xp',
    nameRU: '+100% Опыта на 2 часа',
    nameUK: '+100% Досвіду на 2 години',
    nameES: '+100 % XP durante 2 horas',
    descRU: 'Все члены клуба получают +100% XP в течение 2 часов',
    descUK: 'Всі члени клубу отримують +100% XP протягом 2 годин',
    descES: 'Todos los miembros del club obtienen +100 % XP durante 2 horas',
    multiplier: 2.0,
    durationMs: 2 * 60 * 60 * 1000, // 2 часа
    cost: 25,
    costCurrency: 'shards',
    icon: '⚡',
    type: 'xp',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ASYNC STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const ACTIVE_BOOSTS_KEY = 'club_active_boosts'; // { boostId: ActiveBoost }
const BOOSTS_HISTORY_KEY = 'club_boosts_history'; // BoostHistory[]

// ═══════════════════════════════════════════════════════════════════════════
// GETTERS & SETTERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить все активные бустеры клуба
 * Автоматически удаляет истекшие бустеры
 */
export async function getActiveBoosts(): Promise<ActiveBoost[]> {
  try {
    const data = await AsyncStorage.getItem(ACTIVE_BOOSTS_KEY);
    const boosts = data ? JSON.parse(data) : {};
    const now = Date.now();
    const active: ActiveBoost[] = [];
    const toDelete: string[] = [];

    // Фильтруем и удаляем истекшие
    for (const [boostId, boost] of Object.entries(boosts)) {
      const typedBoost = boost as ActiveBoost;
      const expiresAt = typedBoost.activatedAt + typedBoost.durationMs;
      if (expiresAt > now) {
        active.push(typedBoost);
      } else {
        toDelete.push(boostId);
      }
    }

    // Сохраняем только активные
    if (toDelete.length > 0) {
      const remaining = { ...boosts };
      toDelete.forEach(id => delete remaining[id]);
      await AsyncStorage.setItem(
        ACTIVE_BOOSTS_KEY,
        JSON.stringify(remaining)
      );
    }

    // Мержим с групповыми бустами из Firestore (кэшируются 5 минут).
    // Важно: если Firestore недоступен, НЕ теряем локальные бусты.
    try {
      const groupBoosts = await getCachedGroupBoosts();
      const localIds = new Set(active.map(b => b.id));
      for (const gb of groupBoosts) {
        // Добавляем только те что не активированы локально самим игроком
        if (!localIds.has(gb.id)) {
          active.push(gb);
        }
      }
    } catch (groupError) {
      DebugLogger.error('club_boosts.ts:getActiveBoosts(group)', groupError, 'warning');
    }

    return active;
  } catch (error) {
    DebugLogger.error('club_boosts.ts:getActiveBoosts', error, 'critical');
    return [];
  }
}

/**
 * Получить конкретный активный буст по ID
 */
export async function getActiveBoostById(
  boostId: string
): Promise<ActiveBoost | null> {
  try {
    const data = await AsyncStorage.getItem(ACTIVE_BOOSTS_KEY);
    if (!data) return null;

    const boosts = JSON.parse(data);
    const boost = boosts[boostId] as ActiveBoost | undefined;

    if (!boost) return null;

    // Проверяем, не истек ли
    const now = Date.now();
    const expiresAt = boost.activatedAt + boost.durationMs;
    if (expiresAt <= now) {
      // Удаляем истекший
      delete boosts[boostId];
      await AsyncStorage.setItem(ACTIVE_BOOSTS_KEY, JSON.stringify(boosts));
      return null;
    }

    return boost;
  } catch (error) {
    DebugLogger.error('club_boosts.ts:getActiveBoostById', error, 'critical');
    return null;
  }
}

/**
 * Активировать новый буст для клуба
 * @param boostId ID буста из CLUB_BOOSTS
 * @param playerName Имя игрока, активирующего буст
 * @param cost Стоимость в фразменах
 */
export async function activateBoost(
  boostId: string,
  playerName: string,
  cost: number
): Promise<boolean> {
  try {
    const boostDef = CLUB_BOOSTS.find(b => b.id === boostId);
    if (!boostDef) {
      return false;
    }

    const now = Date.now();

    // Для энергии - только одна активация
    if (boostDef.type === 'energy') {
      const data = await AsyncStorage.getItem(ACTIVE_BOOSTS_KEY);
      const boosts = data ? JSON.parse(data) : {};

      // Удаляем предыдущую энергию буст если есть
      for (const key of Object.keys(boosts)) {
        const boost = boosts[key] as ActiveBoost;
        const def = CLUB_BOOSTS.find(b => b.id === boost.id);
        if (def?.type === 'energy') {
          delete boosts[key];
        }
      }

      boosts[boostId] = {
        id: boostId,
        activatedBy: playerName,
        activatedAt: now,
        durationMs: boostDef.durationMs,
      };

      await AsyncStorage.setItem(ACTIVE_BOOSTS_KEY, JSON.stringify(boosts));
    } else {
      // Для XP бустов добавляем новый
      const data = await AsyncStorage.getItem(ACTIVE_BOOSTS_KEY);
      const boosts = data ? JSON.parse(data) : {};

      // Генерируем уникальный ключ (может быть несколько одинаковых бустов)
      let key = boostId;
      let counter = 0;
      while (boosts[key]) {
        counter++;
        key = `${boostId}_${counter}`;
      }

      boosts[key] = {
        id: boostId,
        activatedBy: playerName,
        activatedAt: now,
        durationMs: boostDef.durationMs,
      };

      await AsyncStorage.setItem(ACTIVE_BOOSTS_KEY, JSON.stringify(boosts));
    }

    // Добавляем в историю
    const history = await getBoostsHistory();
    history.push({
      boostId,
      activatedBy: playerName,
      activatedAt: now,
      cost,
    });
    await AsyncStorage.setItem(BOOSTS_HISTORY_KEY, JSON.stringify(history));

    // Пушим буст в Firestore — чтобы вся группа получила его (fire-and-forget)
    const newBoost: ActiveBoost = {
      id: boostId,
      activatedBy: playerName,
      activatedAt: now,
      durationMs: boostDef.durationMs,
    };
    activateGroupBoost(newBoost).then(() => invalidateGroupBoostsCache()).catch(() => {});
    emitAppEvent('xp_changed');

    return true;
  } catch (error) {
    DebugLogger.error('club_boosts.ts:activateBoost', error, 'critical');
    return false;
  }
}

/**
 * Получить историю активаций бустов
 */
export async function getBoostsHistory(): Promise<BoostHistory[]> {
  try {
    const data = await AsyncStorage.getItem(BOOSTS_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    DebugLogger.error('club_boosts.ts:getBoostsHistory', error, 'warning');
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTIPLIER HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить текущий множитель XP для клуба
 * Если несколько бустов активны, используем максимальный
 */
export async function getXPMultiplier(): Promise<number> {
  try {
    const activeBoosts = await getActiveBoosts();
    let maxMultiplier = 1.0;

    for (const boost of activeBoosts) {
      const def = CLUB_BOOSTS.find(b => b.id === boost.id);
      if (def?.type === 'xp' && def.multiplier) {
        maxMultiplier = Math.max(maxMultiplier, def.multiplier);
      }
    }

    return maxMultiplier;
  } catch (error) {
    DebugLogger.error('club_boosts.ts:getXPMultiplier', error, 'warning');
    return 1.0;
  }
}

/**
 * Проверить есть ли активный буст энергии
 */
export async function hasEnergyBoost(): Promise<boolean> {
  try {
    const activeBoosts = await getActiveBoosts();
    return activeBoosts.some(b => {
      const def = CLUB_BOOSTS.find(d => d.id === b.id);
      return def?.type === 'energy';
    });
  } catch (error) {
    DebugLogger.error('club_boosts.ts:hasEnergyBoost', error, 'warning');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TIME HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить оставшееся время буста в миллисекундах
 */
export function getBoostTimeRemaining(boost: ActiveBoost): number {
  const now = Date.now();
  const expiresAt = boost.activatedAt + boost.durationMs;
  return Math.max(0, expiresAt - now);
}

/**
 * Форматировать оставшееся время буста
 * Например: "47m 23s", "1h 23m", "59s"
 */
export function formatBoostTimeRemaining(boost: ActiveBoost): string {
  const ms = getBoostTimeRemaining(boost);

  if (ms <= 0) return 'Истёк';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  } else if (minutes > 0) {
    return `${minutes}м ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Форматировать оставшееся время буста (英文)
 */
export function formatBoostTimeRemainingUK(boost: ActiveBoost): string {
  const ms = getBoostTimeRemaining(boost);

  if (ms <= 0) return 'Вийшов';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}г ${minutes}м`;
  } else if (minutes > 0) {
    return `${minutes}м ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/** Оставшееся время буста для языка интерфейса (RU / UK / ES). */
export function formatBoostTimeRemainingForLang(boost: ActiveBoost, lang: Lang): string {
  if (lang === 'uk') return formatBoostTimeRemainingUK(boost);
  if (lang === 'es') {
    const ms = getBoostTimeRemaining(boost);
    if (ms <= 0) return 'Terminado';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours} h ${minutes} min`;
    if (minutes > 0) return `${minutes} min ${seconds} s`;
    return `${seconds} s`;
  }
  return formatBoostTimeRemaining(boost);
}

export function boostNameForLang(def: BoostDef, lang: Lang): string {
  if (lang === 'uk') return def.nameUK;
  if (lang === 'es') return def.nameES;
  return def.nameRU;
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOST DEFINITION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function getBoostDef(boostId: string): BoostDef | undefined {
  return CLUB_BOOSTS.find(b => b.id === boostId);
}

/**
 * Получить уведомление для активации буста
 */
export function getBoostNotification(
  boostId: string,
  playerName: string,
  lang: Lang
): string {
  const boost = getBoostDef(boostId);
  if (!boost) return '';

  const name = boostNameForLang(boost, lang);
  if (lang === 'uk') return `🎉 ${playerName} активував ${name}`;
  if (lang === 'es') return `🎉 ${playerName} ha activado ${name}`;
  return `🎉 ${playerName} активировал ${name}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// GIFT: бесплатная активация буста (редкий подарок уровня)
// ═══════════════════════════════════════════════════════════════════════════

const CLUB_GIFT_FREE_BOOST_KEY = 'club_gift_free_boost_v1';

export async function hasClubGiftFreeBoostFromLevel(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLUB_GIFT_FREE_BOOST_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function grantClubGiftFreeBoostFromLevel(): Promise<void> {
  try {
    await AsyncStorage.setItem(CLUB_GIFT_FREE_BOOST_KEY, '1');
  } catch { /* empty */ }
}

export async function clearClubGiftFreeBoostFromLevel(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CLUB_GIFT_FREE_BOOST_KEY);
  } catch { /* empty */ }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLEAR FUNCTIONS (для тестирования)
// ═══════════════════════════════════════════════════════════════════════════

export async function clearAllBoosts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_BOOSTS_KEY);
    await AsyncStorage.removeItem(BOOSTS_HISTORY_KEY);
  } catch (error) {
    DebugLogger.error('club_boosts.ts:clearAllBoosts', error, 'warning');
  }
}

export async function clearBoostHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BOOSTS_HISTORY_KEY);
  } catch (error) {
    DebugLogger.error('club_boosts.ts:clearBoostHistory', error, 'warning');
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

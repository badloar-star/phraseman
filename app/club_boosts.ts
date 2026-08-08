/**
 * Club Boosts System
 * Управление групповыми бустерами для членов клуба
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { getVerifiedPremiumStatus } from './premium_guard';
import { activateGroupBoost, getCachedGroupBoosts, invalidateGroupBoostsCache } from './firestore_boosts';
import { emitAppEvent } from './events';
import { triLang, type Lang } from '../constants/i18n';
import { withStorageLock } from './storage_mutex';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface BoostDef {
  id: string; // 'xp_2x_1h', 'xp_1_5x_2h', 'energy_plus_1'
  nameRU: string;
  nameUK: string;
  nameES: string;
  namePtBr: string;
  nameVi: string;
  nameId: string;
  nameTr: string;
  namePl: string;
  descRU: string;
  descUK: string;
  descES: string;
  descPtBr: string;
  descVi: string;
  descId: string;
  descTr: string;
  descPl: string;
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
    namePtBr: '+100% de XP por 2 horas',
    nameVi: '+100% XP trong 2 giờ',
    nameId: '+100% XP selama 2 jam',
    nameTr: '2 saat boyunca +%100 XP',
    namePl: '+100% XP przez 2 godziny',
    descRU: 'Все участники лиги получают +100% XP в течение 2 часов',
    descUK: 'Усі учасники ліги отримують +100% XP протягом 2 годин',
    descES: 'Todos los participantes de la liga obtienen +100 % XP durante 2 horas',
    descPtBr: 'Todos os participantes da liga recebem +100% XP por 2 horas',
    descVi: 'Tất cả người tham gia giải đấu nhận +100% XP trong 2 giờ',
    descId: 'Semua peserta liga mendapatkan +100% XP selama 2 jam',
    descTr: 'Tüm lig katılımcıları 2 saat boyunca +%100 XP alır',
    descPl: 'Wszyscy uczestnicy ligi otrzymują +100% XP przez 2 godziny',
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

/** Постоянный множитель XP для подписчиков Plus — всегда видимая ценность подписки. */
export const PREMIUM_XP_MULTIPLIER = 1.25;

/**
 * Получить текущий множитель XP: клубные бусты (максимальный из активных) и
 * постоянный Plus-буст. Если активны оба — берём БОЛЬШИЙ, не перемножаем
 * (защита от стака буст×премиум).
 */
export async function getXPMultiplier(): Promise<number> {
  try {
    const [activeBoosts, isPremium] = await Promise.all([
      getActiveBoosts(),
      getVerifiedPremiumStatus().catch(() => false),
    ]);
    let maxMultiplier = isPremium ? PREMIUM_XP_MULTIPLIER : 1.0;

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

// зачем: formatBoostTimeRemainingForLang удалён — единственный потребитель
// (ActiveBoostBar) снесён 2026-07-25; boostNameForLang ниже ЖИВОЙ — его зовёт
// getBoostNotification, не удалять за компанию.
export function boostNameForLang(def: BoostDef, lang: Lang): string {
  return triLang(lang, {
    ru: def.nameRU,
    uk: def.nameUK,
    es: def.nameES,
    'pt-BR': def.namePtBr,
    vi: def.nameVi,
    id: def.nameId,
    tr: def.nameTr,
    pl: def.namePl,
  });
}

export function boostDescriptionForLang(def: BoostDef, lang: Lang): string {
  return triLang(lang, {
    ru: def.descRU,
    uk: def.descUK,
    es: def.descES,
    'pt-BR': def.descPtBr,
    vi: def.descVi,
    id: def.descId,
    tr: def.descTr,
    pl: def.descPl,
  });
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
  return triLang(lang, {
    ru: `🎉 ${playerName} активировал ${name}`,
    uk: `🎉 ${playerName} активував ${name}`,
    es: `🎉 ${playerName} ha activado ${name}`,
    'pt-BR': `🎉 ${playerName} ativou ${name}`,
    vi: `🎉 ${playerName} đã kích hoạt ${name}`,
    id: `🎉 ${playerName} mengaktifkan ${name}`,
    tr: `🎉 ${playerName}, ${name} etkinleştirdi`,
    pl: `🎉 ${playerName} aktywował ${name}`,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GIFT: бесплатная активация буста (редкий подарок уровня)
// ═══════════════════════════════════════════════════════════════════════════

const CLUB_GIFT_FREE_BOOST_KEY = 'club_gift_free_boost_v1';

const clubGiftFreeBoostCount = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export async function hasClubGiftFreeBoostFromLevel(): Promise<boolean> {
  try {
    return clubGiftFreeBoostCount(await AsyncStorage.getItem(CLUB_GIFT_FREE_BOOST_KEY)) > 0;
  } catch {
    return false;
  }
}

export async function grantClubGiftFreeBoostFromLevel(minimumCount?: number): Promise<void> {
  await withStorageLock(async () => {
    const current = clubGiftFreeBoostCount(await AsyncStorage.getItem(CLUB_GIFT_FREE_BOOST_KEY));
    const next = minimumCount === undefined
      ? current + 1
      : Math.max(current, Math.max(1, Math.floor(minimumCount)));
    // Storage errors must escape so the producer can release/retry its claim.
    await AsyncStorage.setItem(CLUB_GIFT_FREE_BOOST_KEY, String(next));
  });
}

export async function setClubGiftFreeBoostCountFromAuthority(count: number): Promise<void> {
  const canonical = Math.max(0, Math.floor(Number(count) || 0));
  await withStorageLock(async () => {
    if (canonical > 0) {
      await AsyncStorage.setItem(CLUB_GIFT_FREE_BOOST_KEY, String(canonical));
    } else {
      await AsyncStorage.removeItem(CLUB_GIFT_FREE_BOOST_KEY);
    }
  });
}

export async function clearClubGiftFreeBoostFromLevel(): Promise<void> {
  await withStorageLock(async () => {
    const current = clubGiftFreeBoostCount(await AsyncStorage.getItem(CLUB_GIFT_FREE_BOOST_KEY));
    if (current > 1) {
      await AsyncStorage.setItem(CLUB_GIFT_FREE_BOOST_KEY, String(current - 1));
      return;
    }
    await AsyncStorage.removeItem(CLUB_GIFT_FREE_BOOST_KEY);
  });
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

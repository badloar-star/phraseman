// ════════════════════════════════════════════════════════════════════════════
// paywall_personalization.ts — персонализированные «болевые» строки на пейволле
//
// Поток:
//  1. В ключевых точках приложения инкрементируем счётчики:
//     - energy_zero_count_v1      (NoEnergyModal.tsx onShow)
//     - streak_lost_count_v1      (hall_of_fame_utils.ts при streak reset)
//     - hard_paywall_blocks_v1    (quizzes.tsx / premium_modal context='quiz_hard')
//  2. premium_modal.tsx вызывает pickPaywallTags() → получает top-3 тега по «боли».
//  3. UI рендерит pill-карточки над hero-блоком.
//
// Принципы:
//  - Только позитивные/мотивирующие формулировки. Никаких «ты хуже X».
//  - Если активных тегов < 3 → дополняем generic-строками.
//  - All costs are computed on READ (не на записи), чтобы не блокировать UI.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getForegroundUsageMs } from './foreground_usage_ms';
import { DebugLogger } from './debug-logger';

// ── Storage keys (атомарные счётчики) ────────────────────────────────────────
export const ENERGY_ZERO_COUNT_KEY = 'energy_zero_count_v1';
export const STREAK_LOST_COUNT_KEY = 'streak_lost_count_v1';
export const HARD_PAYWALL_BLOCKS_KEY = 'hard_paywall_blocks_v1';

// ── Инкрементаторы (fire-and-forget) ─────────────────────────────────────────
async function bumpCounter(key: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const n = parseInt(raw ?? '0', 10) || 0;
    await AsyncStorage.setItem(key, String(n + 1));
  } catch (error) {
    DebugLogger.error(`paywall_personalization:bump(${key})`, error, 'warning');
  }
}

/** Вызывать когда у юзера закончилась энергия (NoEnergyModal стал visible). */
export function incrementEnergyZeroCount(): void {
  void bumpCounter(ENERGY_ZERO_COUNT_KEY);
}

/** Вызывать при каждом обнулении цепочки в updateStreakOnActivity. */
export function incrementStreakLostCount(): void {
  void bumpCounter(STREAK_LOST_COUNT_KEY);
}

/** Вызывать при тапе на Hard-квиз если !premium. */
export function incrementHardPaywallBlock(): void {
  void bumpCounter(HARD_PAYWALL_BLOCKS_KEY);
}

// ── Данные для пейволла ───────────────────────────────────────────────────────
export interface PaywallStats {
  energyZeroCount: number;
  streakLostCount: number;
  hardPaywallBlocks: number;
  /** Лучшее место в зале славы (#N). null = не попадал. */
  hofRank: number | null;
  /** Суммарное время в приложении в часах (округлено). */
  foregroundHours: number;
}

export async function collectPaywallStats(): Promise<PaywallStats> {
  try {
    const [energyRaw, streakRaw, hardRaw, hofRaw, foregroundMs] = await Promise.all([
      AsyncStorage.getItem(ENERGY_ZERO_COUNT_KEY),
      AsyncStorage.getItem(STREAK_LOST_COUNT_KEY),
      AsyncStorage.getItem(HARD_PAYWALL_BLOCKS_KEY),
      AsyncStorage.getItem('lifetime_best_hall_rank_v1'),
      getForegroundUsageMs(),
    ]);
    return {
      energyZeroCount: parseInt(energyRaw ?? '0', 10) || 0,
      streakLostCount: parseInt(streakRaw ?? '0', 10) || 0,
      hardPaywallBlocks: parseInt(hardRaw ?? '0', 10) || 0,
      hofRank: Number.isFinite(Number(hofRaw)) && Number(hofRaw) > 0 ? Number(hofRaw) : null,
      foregroundHours: Math.floor(foregroundMs / 3_600_000),
    };
  } catch (error) {
    DebugLogger.error('paywall_personalization:collectPaywallStats', error, 'warning');
    return { energyZeroCount: 0, streakLostCount: 0, hardPaywallBlocks: 0, hofRank: null, foregroundHours: 0 };
  }
}

// ── Теги и их формулировки ────────────────────────────────────────────────────
export interface PersonalizedTag {
  key: string;
  emoji: string;
  ru: string;
  uk: string;
  es: string;
  /** Вес «боли»: чем выше — тем раньше показываем. 0 = неактивный тег. */
  weight: number;
}

/** Generic-теги — используются как fallback если активных тегов < 3. */
const GENERIC_TAGS: PersonalizedTag[] = [
  {
    key: 'generic_energy',
    emoji: '⚡',
    ru: 'Безлимит энергии — учись без пауз',
    uk: 'Безліміт енергії — навчайся без пауз',
    es: 'Energía ilimitada — sin pausas',
    weight: 20,
  },
  {
    key: 'generic_mastery',
    emoji: '🔁',
    ru: 'Повтори любой урок неограниченно',
    uk: 'Повторюй будь-який урок необмежено',
    es: 'Repite cualquier lección sin límites',
    weight: 18,
  },
  {
    key: 'generic_trainer',
    emoji: '🧠',
    ru: 'Тренер слабых мест — умный повтор',
    uk: 'Тренер слабких місць — розумний повтор',
    es: 'Entrenador de puntos débiles',
    weight: 16,
  },
  {
    key: 'generic_analytics',
    emoji: '📊',
    ru: 'Подробная аналитика и карта 365 дней',
    uk: 'Детальна аналітика і карта 365 днів',
    es: 'Analítica detallada y mapa de 365 días',
    weight: 14,
  },
  {
    key: 'generic_quizhard',
    emoji: '🥇',
    ru: 'Сложные квизы и расширенные задания',
    uk: 'Складні квізи та розширені завдання',
    es: 'Quizzes difíciles y tareas avanzadas',
    weight: 12,
  },
];

/**
 * Вычислить персонализированные теги по статистике юзера.
 *
 * Возвращает массив ≤ 3 тегов, отсортированных по weight DESC.
 * Если активных тегов < 3 — дополняем generic-тегами (без дублирования ключей).
 *
 * Принцип формулировок: «болевая точка → Premium решает».
 * Никогда: «ты хуже», «ты медленнее». Всегда: конкретные числа + польза.
 */
export function pickPaywallTags(stats: PaywallStats, max = 3): PersonalizedTag[] {
  const tags: PersonalizedTag[] = [];

  // 1. Энергия закончилась N раз (самая острая боль)
  if (stats.energyZeroCount > 0) {
    const n = stats.energyZeroCount;
    const weight = n >= 10 ? 110 : n >= 5 ? 100 : n >= 2 ? 75 : 50;
    tags.push({
      key: 'energy_zero',
      emoji: '⚡',
      ru: `Энергия кончалась ${n} ${ru_times(n)} — Premium даёт безлимит`,
      uk: `Енергія закінчувалась ${n} ${uk_times(n)} — Premium дає безліміт`,
      es: `Quedaste sin energía ${n} ${es_times(n)} — Premium la hace ilimitada`,
      weight,
    });
  }

  // 2. Цепочка потеряна N раз
  if (stats.streakLostCount > 0) {
    const n = stats.streakLostCount;
    const weight = n >= 5 ? 105 : n >= 2 ? 95 : 60;
    tags.push({
      key: 'streak_lost',
      emoji: '🔥',
      ru: `Цепочка обрывалась ${n} ${ru_times(n)} — Premium защищает её`,
      uk: `Ланцюжок обривався ${n} ${uk_times(n)} — Premium захищає його`,
      es: `Perdiste la racha ${n} ${es_times(n)} — Premium la protege`,
      weight,
    });
  }

  // 4. Hard-квизы заблокированы N раз
  if (stats.hardPaywallBlocks > 0) {
    const n = stats.hardPaywallBlocks;
    const weight = n >= 5 ? 80 : n >= 2 ? 70 : 45;
    tags.push({
      key: 'hard_blocks',
      emoji: '💪',
      ru: `Hard квизы заблокированы — ты заходил ${n} ${ru_times(n)}`,
      uk: `Hard квізи заблоковані — ти заходив ${n} ${uk_times(n)}`,
      es: `Los quizzes Hard están bloqueados — intentaste ${n} ${es_times(n)}`,
      weight,
    });
  }

  // (зал славы удалён из приложения — тег не используется)

  // 9. Время в приложении (всегда позитивный, низкий вес — только как дополнение)
  if (stats.foregroundHours >= 1) {
    const h = stats.foregroundHours;
    tags.push({
      key: 'time_invested',
      emoji: '⏱️',
      ru: `${h} ${ru_hours(h)} в приложении — серьёзная инвестиция`,
      uk: `${h} ${uk_hours(h)} у застосунку — серйозна інвестиція`,
      es: `${h} ${es_hours(h)} en la app — una inversión real`,
      weight: h >= 50 ? 35 : h >= 10 ? 28 : 20,
    });
  }

  // Сортируем по убыванию веса
  tags.sort((a, b) => b.weight - a.weight);

  // Берём top-max из активных тегов
  const selected = tags.slice(0, max);

  // Дополняем generic если не набрали max
  if (selected.length < max) {
    const usedKeys = new Set(selected.map((t) => t.key));
    for (const g of GENERIC_TAGS) {
      if (selected.length >= max) break;
      if (!usedKeys.has(g.key)) {
        selected.push(g);
        usedKeys.add(g.key);
      }
    }
  }

  return selected;
}

// ── Утилиты склонения ─────────────────────────────────────────────────────────
function ru_times(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'раз';
  if (mod10 === 1) return 'раз';
  if (mod10 >= 2 && mod10 <= 4) return 'раза';
  return 'раз';
}

function uk_times(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'разів';
  if (mod10 === 1) return 'раз';
  if (mod10 >= 2 && mod10 <= 4) return 'рази';
  return 'разів';
}

function es_times(n: number): string {
  return n === 1 ? 'vez' : 'veces';
}

function ru_hours(h: number): string {
  const mod10 = h % 10;
  const mod100 = h % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'часов';
  if (mod10 === 1) return 'час';
  if (mod10 >= 2 && mod10 <= 4) return 'часа';
  return 'часов';
}

function uk_hours(h: number): string {
  const mod10 = h % 10;
  const mod100 = h % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'годин';
  if (mod10 === 1) return 'година';
  if (mod10 >= 2 && mod10 <= 4) return 'години';
  return 'годин';
}

function es_hours(h: number): string {
  return h === 1 ? 'hora' : 'horas';
}

/* expo-router route shim */
export default function __RouteShim() { return null; }

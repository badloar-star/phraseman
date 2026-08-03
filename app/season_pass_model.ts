// ════════════════════════════════════════════════════════════════════════════
// season_pass_model.ts — Season Pass: сезон-квартал, уровни по XP, локальный
// счётчик сезонного опыта. Этап 1 (каркас): только прогресс, без клеймов наград
// и без покупки платной дорожки — они приходят этапом 2 с серверными callable.
// зачем: владелец утвердил пропуск (docs/plans/2026-08-03-season-pass-gift-catalog.ru.md);
// прогресс идёт от того же earned-XP, что и weekly_xp — бусты качают и сезон.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';

const STORAGE_KEY = 'season_pass_xp_v1';

export const SEASON_PASS_LEVELS = 60;
export const SEASON_PASS_CHAPTER_SIZE = 20;
// зачем: первые уровни дешёвые — быстрая вкатка в первые дни (паттерн лиг Duolingo:
// ранние победы часто, поздние дороже). Числа калибруются по медианному XP/день
// перед запуском сезона (Remote Config-переопределение добавим этапом 2).
const EARLY_LEVELS = 10;
const EARLY_LEVEL_COST_XP = 400;
const LATE_LEVEL_COST_XP = 700;

export function seasonPassLevelCostXp(level: number): number {
  return level <= EARLY_LEVELS ? EARLY_LEVEL_COST_XP : LATE_LEVEL_COST_XP;
}

/** 'YYYY-Qn' — сезон равен календарному кварталу, кронов не требует. */
export function getSeasonPassSeasonId(now: Date = new Date()): string {
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  return `${now.getUTCFullYear()}-Q${q}`;
}

export function seasonPassEndsAtMs(now: Date = new Date()): number {
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  const endMonth = q * 3; // следующий квартал начинается с этого месяца (0-based: q*3)
  return Date.UTC(now.getUTCFullYear(), endMonth, 1, 0, 0, 0, 0);
}

export function seasonPassDaysLeft(now: Date = new Date()): number {
  return Math.max(0, Math.ceil((seasonPassEndsAtMs(now) - now.getTime()) / (24 * 60 * 60 * 1000)));
}

export interface SeasonPassProgress {
  seasonId: string;
  totalXp: number;
  level: number;        // 0..SEASON_PASS_LEVELS (0 = ещё не открыт первый)
  intoLevelXp: number;  // сколько XP набрано внутри текущего уровня
  levelCostXp: number;  // цена текущего (следующего открываемого) уровня
  chapter: 1 | 2 | 3;
}

export function computeSeasonPassProgress(seasonId: string, totalXp: number): SeasonPassProgress {
  let remaining = Math.max(0, Math.floor(totalXp));
  let level = 0;
  while (level < SEASON_PASS_LEVELS) {
    const cost = seasonPassLevelCostXp(level + 1);
    if (remaining < cost) break;
    remaining -= cost;
    level += 1;
  }
  const chapter = (Math.min(2, Math.floor(Math.max(0, level - (level > 0 ? 1 : 0)) / SEASON_PASS_CHAPTER_SIZE)) + 1) as 1 | 2 | 3;
  return {
    seasonId,
    totalXp: Math.max(0, Math.floor(totalXp)),
    level,
    intoLevelXp: level >= SEASON_PASS_LEVELS ? 0 : remaining,
    levelCostXp: level >= SEASON_PASS_LEVELS ? 0 : seasonPassLevelCostXp(level + 1),
    chapter,
  };
}

type Stored = { seasonId: string; xp: number };

// Синхронный кэш для мгновенного первого кадра плашки на главной
// (Performance Bible: первый кадр = финальная геометрия, без default-then-patch).
let cache: Stored | null = null;
let hydrated = false;

function freshStored(): Stored {
  return { seasonId: getSeasonPassSeasonId(), xp: 0 };
}

export function peekSeasonPassProgress(): SeasonPassProgress {
  const s = cache && cache.seasonId === getSeasonPassSeasonId() ? cache : freshStored();
  return computeSeasonPassProgress(s.seasonId, s.xp);
}

export async function hydrateSeasonPassProgress(): Promise<SeasonPassProgress> {
  // зачем: last-write-guard — если между стартом чтения диска и его завершением
  // addSeasonPassXp успел поднять кэш в памяти (юзер закончил урок и вернулся на
  // home одновременно), диск не должен откатывать прогресс-бар назад. Диск
  // побеждает только если он реально свежее (или другой сезон уже начался).
  const beforeSeasonId = cache?.seasonId;
  const beforeXp = cache?.xp ?? -1;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: Stored | null = raw ? JSON.parse(raw) : null;
    const fromDisk = parsed && parsed.seasonId === getSeasonPassSeasonId()
      ? { seasonId: parsed.seasonId, xp: Math.max(0, Math.floor(Number(parsed.xp) || 0)) }
      : freshStored();
    // guard-ok: это сезонный счётчик, а не баланс — обнуление при смене квартала
    // и есть контракт сезона (user_total_xp/жемчуг не затрагиваются вообще).
    // Ветка ниже — не «понижение», а отказ применить УСТАРЕВШЕЕ чтение поверх
    // уже более свежей записи того же сезона; при смене сезона диск всегда побеждает.
    cache = (fromDisk.seasonId === beforeSeasonId && fromDisk.xp < beforeXp)
      ? cache
      : fromDisk;
  } catch {
    cache = cache ?? freshStored();
  }
  hydrated = true;
  return peekSeasonPassProgress();
}

/**
 * Начисление сезонного XP. Вызывается ТОЛЬКО из registerXP (единый менеджер XP
 * сериализует начисления), поэтому отдельного storage-mutex здесь нет — гонок
 * между конкурентными вызовами addSeasonPassXp не существует по построению.
 * Optimistic: кэш и событие обновляются до завершения записи на диск.
 */
export async function addSeasonPassXp(delta: number): Promise<void> {
  if (!Number.isFinite(delta) || delta <= 0) return;
  if (!hydrated) await hydrateSeasonPassProgress();
  const current = cache && cache.seasonId === getSeasonPassSeasonId() ? cache : freshStored();
  cache = { seasonId: current.seasonId, xp: current.xp + Math.floor(delta) };
  emitAppEvent('season_pass_xp_changed', { totalXp: cache.xp });
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ошибка диска не откатывает кэш: следующая гидрация возьмёт последний
    // успешно записанный снапшот, сезонный XP самовосстановится от registerXP.
  }
}

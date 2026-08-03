// ════════════════════════════════════════════════════════════════════════════
// season_pass_model.ts — Season Pass: сезон-квартал, уровни за ТУРНИРНЫЕ ЗВЁЗДЫ.
// Этап 1 (каркас): только прогресс, без клеймов наград и без покупки платной
// дорожки — они приходят этапом 2 с серверными callable.
//
// зачем 2026-08-03 (владелец: «сезон с главной надо перенести в турнир и
// переделать чтобы сезон очки капали не за опыт а за звёзды»): раньше дорожка
// качалась ЛЮБЫМ earned-XP из registerXP — уроками, повторениями, бустами.
// Сезон из-за этого не был связан с турнирами вообще: пропуск закрывался
// пассивной учёбой, а турнирные звёзды никуда не вели. Теперь единственный
// источник прогресса — звёзды, заработанные в турнире, поэтому сезон стал
// наградой именно за соревновательную игру.
//
// Владелец 2026-08-03 выбрал ЖЁСТКИЙ вариант: уроки сезон НЕ двигают вовсе.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';

// зачем: ключ сменён с season_pass_xp_v1 — валюта дорожки другая, и старое
// значение в звёздах читалось бы как гигантский прогресс (400 XP ≠ 400⭐).
// Релиза ещё не было, накопленного прогресса ни у кого нет (подтверждено
// владельцем), поэтому миграция не нужна: чистый старт.
const STORAGE_KEY = 'season_pass_stars_v1';

export const SEASON_PASS_LEVELS = 60;
export const SEASON_PASS_CHAPTER_SIZE = 20;

/**
 * Калибровка шкалы (владелец 2026-08-03: «просчитать систему чтобы было сложно
 * но реализуемо», цель — 1 турнир в день ровно в срок).
 *
 * Потолок за ИДЕАЛЬНЫЙ турнир — 64⭐ (16 заданий: раунд 1 сложности 1 → 4×3⭐,
 * раунд 2 → 3 задания + поле пар, раунд 3 сложности 2 → 4×4⭐, раунд 4
 * сложности 3 → 3×5⭐ + поле пар). Реальный крепкий игрок ошибается и берёт
 * ~45⭐.
 *
 * Бюджет квартала: 90 дней × 45⭐ ≈ 4050⭐. Закладываем ~10% на пропущенные дни
 * → цель ≈ 3600⭐ на 60 уровней.
 *
 *   уровни 1–10  × 35⭐ =  350⭐   (быстрая вкатка: ~8 дней)
 *   уровни 11–60 × 65⭐ = 3250⭐
 *   ─────────────────────────────
 *   итого               3600⭐   ≈ 80 дней при 45⭐/день
 *
 * Остаток ~10 дней — запас на пропуски. Игрок, идущий на 2 турнира в день,
 * закрывает сезон примерно за 40 дней; играющий раз в два дня — не успевает,
 * и это осознанная планка сложности.
 */
const EARLY_LEVELS = 10;
const EARLY_LEVEL_COST_STARS = 35;
const LATE_LEVEL_COST_STARS = 65;

export function seasonPassLevelCostStars(level: number): number {
  return level <= EARLY_LEVELS ? EARLY_LEVEL_COST_STARS : LATE_LEVEL_COST_STARS;
}

/** Полная стоимость сезона в звёздах — для витрины и тестов баланса. */
export const SEASON_PASS_TOTAL_STARS =
  EARLY_LEVELS * EARLY_LEVEL_COST_STARS
  + (SEASON_PASS_LEVELS - EARLY_LEVELS) * LATE_LEVEL_COST_STARS;

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

/**
 * зачем 2026-08-03: поля переименованы Xp → Stars намеренно, а не «для красоты».
 * Валюта дорожки сменилась, и одинаковое имя поля при разном смысле — прямой
 * путь к тому, что какой-нибудь экран продолжит показывать «400» там, где
 * теперь «35». Компилятор обязан поймать КАЖДОГО потребителя.
 */
export interface SeasonPassProgress {
  seasonId: string;
  /** Всего турнирных звёзд, набранных за сезон. */
  totalStars: number;
  level: number;          // 0..SEASON_PASS_LEVELS (0 = ещё не открыт первый)
  intoLevelStars: number; // сколько звёзд набрано внутри текущего уровня
  levelCostStars: number; // цена текущего (следующего открываемого) уровня
  chapter: 1 | 2 | 3;
}

export function computeSeasonPassProgress(seasonId: string, totalStars: number): SeasonPassProgress {
  let remaining = Math.max(0, Math.floor(totalStars));
  let level = 0;
  while (level < SEASON_PASS_LEVELS) {
    const cost = seasonPassLevelCostStars(level + 1);
    if (remaining < cost) break;
    remaining -= cost;
    level += 1;
  }
  const chapter = (Math.min(2, Math.floor(Math.max(0, level - (level > 0 ? 1 : 0)) / SEASON_PASS_CHAPTER_SIZE)) + 1) as 1 | 2 | 3;
  return {
    seasonId,
    totalStars: Math.max(0, Math.floor(totalStars)),
    level,
    intoLevelStars: level >= SEASON_PASS_LEVELS ? 0 : remaining,
    levelCostStars: level >= SEASON_PASS_LEVELS ? 0 : seasonPassLevelCostStars(level + 1),
    chapter,
  };
}

type Stored = { seasonId: string; stars: number };

// Синхронный кэш для мгновенного первого кадра плашки
// (Performance Bible: первый кадр = финальная геометрия, без default-then-patch).
let cache: Stored | null = null;
let hydrated = false;

function freshStored(): Stored {
  return { seasonId: getSeasonPassSeasonId(), stars: 0 };
}

export function peekSeasonPassProgress(): SeasonPassProgress {
  const s = cache && cache.seasonId === getSeasonPassSeasonId() ? cache : freshStored();
  return computeSeasonPassProgress(s.seasonId, s.stars);
}

export async function hydrateSeasonPassProgress(): Promise<SeasonPassProgress> {
  // зачем: last-write-guard — если между стартом чтения диска и его завершением
  // addSeasonPassStars успел поднять кэш в памяти (турнир закончился и игрок
  // вернулся на экран одновременно), диск не должен откатывать прогресс-бар
  // назад. Диск побеждает только если он реально свежее (или начался новый сезон).
  const beforeSeasonId = cache?.seasonId;
  const beforeStars = cache?.stars ?? -1;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: Stored | null = raw ? JSON.parse(raw) : null;
    const fromDisk = parsed && parsed.seasonId === getSeasonPassSeasonId()
      ? { seasonId: parsed.seasonId, stars: Math.max(0, Math.floor(Number(parsed.stars) || 0)) }
      : freshStored();
    // guard-ok: это сезонный счётчик, а не баланс — обнуление при смене квартала
    // и есть контракт сезона (user_total_xp/жемчуг не затрагиваются вообще).
    // Ветка ниже — не «понижение», а отказ применить УСТАРЕВШЕЕ чтение поверх
    // уже более свежей записи того же сезона; при смене сезона диск всегда побеждает.
    cache = (fromDisk.seasonId === beforeSeasonId && fromDisk.stars < beforeStars)
      ? cache
      : fromDisk;
  } catch {
    cache = cache ?? freshStored();
  }
  hydrated = true;
  return peekSeasonPassProgress();
}

/**
 * Начисление сезонных звёзд за завершённый турнирный раунд.
 *
 * зачем 2026-08-03 (владелец: «сезон очки капали не за опыт а за звёзды»):
 * здесь была addSeasonPassXp, которую дёргал registerXP на ЛЮБОЕ начисление
 * опыта — сезон качался уроками и бустами, а турниры на него не влияли вовсе.
 * Теперь единственный вызывающий — турнирный экран, и звёзды приходят только
 * из подтверждённого сервером результата.
 *
 * Идемпотентность по раунду обязательна: экран может перемонтироваться, а
 * снапшот комнаты — прийти повторно. Ключ раунда гарантирует, что один и тот же
 * результат не начислится дважды.
 */
export async function addSeasonPassStars(delta: number): Promise<void> {
  if (!Number.isFinite(delta) || delta <= 0) return;
  if (!hydrated) await hydrateSeasonPassProgress();
  const current = cache && cache.seasonId === getSeasonPassSeasonId() ? cache : freshStored();
  cache = { seasonId: current.seasonId, stars: current.stars + Math.floor(delta) };
  emitAppEvent('season_pass_stars_changed', { totalStars: cache.stars });
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ошибка диска не откатывает кэш: следующая гидрация возьмёт последний
    // успешно записанный снапшот.
  }
}

/** Комнаты, уже зачтённые в сезон. Ключ переживает перезапуск приложения. */
const CREDITED_ROOMS_KEY = 'season_pass_credited_rooms_v1';

/**
 * Зачесть итог турнира в сезон РОВНО ОДИН РАЗ.
 *
 * зачем 2026-08-03: экран результатов перемонтируется (свернул/развернул
 * приложение, ушёл в разбор и вернулся), а снапшот комнаты приходит повторно на
 * каждое обновление документа. Без ключа комнаты один турнир начислялся бы
 * столько раз, сколько раз экран увидел финальный счёт, — и дорожка сезона
 * накручивалась бы простым переоткрытием экрана.
 *
 * Хранится список последних комнат, а не флаг: игрок за сезон играет много
 * турниров, и каждый должен быть зачтён свой ровно один раз. Список подрезаем,
 * чтобы ключ не рос бесконечно — 200 комнат заведомо перекрывают квартал при
 * трёх слотах в день.
 */
const CREDITED_ROOMS_LIMIT = 200;

export async function creditTournamentStarsToSeason(roomId: string, stars: number): Promise<boolean> {
  if (!roomId || !Number.isFinite(stars) || stars <= 0) return false;
  const seasonId = getSeasonPassSeasonId();
  const entryKey = `${seasonId}:${roomId}`;
  try {
    const raw = await AsyncStorage.getItem(CREDITED_ROOMS_KEY);
    const credited: string[] = raw ? JSON.parse(raw) : [];
    if (Array.isArray(credited) && credited.includes(entryKey)) return false;
    const next = [entryKey, ...(Array.isArray(credited) ? credited : [])].slice(0, CREDITED_ROOMS_LIMIT);
    // Отметку ставим ДО начисления: повторный вход, случившийся между двумя
    // операциями, не должен успеть начислить второй раз. Потерянное начисление
    // безопаснее задвоенного — сезон не должен накручиваться.
    await AsyncStorage.setItem(CREDITED_ROOMS_KEY, JSON.stringify(next));
  } catch {
    // Диск недоступен — не начисляем вовсе, чтобы не задвоить при следующем
    // запуске, когда отметка так и не сохранится.
    return false;
  }
  await addSeasonPassStars(stars);
  return true;
}

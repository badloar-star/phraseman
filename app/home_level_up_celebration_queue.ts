/**
 * Очередь «тихого» повышения уровня — то, что Главная должна проиграть.
 *
 * зачем (владелец, 2026-09-01): полноэкранная модалка поздравления удалена.
 * Она всплывала «когда попало» (старт, foreground, любой экран) и, что хуже,
 * показывала СТАРЫЙ уровень из durable-очереди: человек на 40-м уровне видел
 * «Поздравляем, уровень 13». Вместо неё повышение играется ТОЛЬКО на Главной:
 * полоска опыта доливается до конца, аватарка подпрыгивает и обновляется,
 * цифра уровня меняется. Спин при этом никуда не девается — он остаётся
 * золотой плашкой «Спины: N» на Главной, как и раньше.
 *
 * Почему очередь живёт ЗДЕСЬ, а не в состоянии экрана: уровень растёт в уроке,
 * в арене, в подарке — Главная в этот момент размонтирована (freezeOnBlur), и
 * состояние экрана не переживёт возврата. Модуль держит уровни в памяти
 * процесса до момента, когда Главная реально показана.
 *
 * Почему НЕ durable (без AsyncStorage): ровно durable-очередь и породила баг
 * «уровень 13 при 40-м» — непроигранный показ жил вечно и всплывал спустя
 * недели. Празднование — украшение момента, а не награда: пропустили показ
 * (убили приложение на полпути) — ничего не потеряно, спины и опыт durable и
 * лежат отдельно. Список специально умирает вместе с процессом.
 */
import { getLevelFromXP } from '../constants/theme';
import { emitAppEvent } from './events';

/** Максимум уровней в одном празднике: защита от абсурдной цепочки анимаций. */
const MAX_CELEBRATION_CHAIN = 8;

export type HomeLevelUpCelebration = Readonly<{
  /** Уровень ДО повышения — с него полоска начинает доливаться. */
  fromLevel: number;
  /** Уровень ПОСЛЕ повышения — на нём полоска замирает, цифра меняется. */
  toLevel: number;
}>;

let pending: HomeLevelUpCelebration | null = null;

function sanitizeLevel(value: unknown): number {
  const level = Math.trunc(Number(value));
  return Number.isFinite(level) && level > 0 ? level : 0;
}

/**
 * Поставить повышение в очередь показа. Зовётся из тех же мест, где уровень
 * реально вырос (xp_manager), СРАЗУ после durable-начисления спинов.
 *
 * Повторный вызов до показа не плодит очередь, а РАСШИРЯЕТ диапазон: два
 * повышения подряд, пока человек не заходил на Главную, дадут одну цепочку
 * fromLevel(самый ранний) → toLevel(самый поздний), а не два независимых
 * праздника друг поверх друга.
 */
export function enqueueHomeLevelUpCelebration(beforeLevel: number, afterLevel: number): void {
  const from = sanitizeLevel(beforeLevel);
  const to = sanitizeLevel(afterLevel);
  if (from <= 0 || to <= from) {
    // Ранний выход логируем: молчаливый отказ здесь означал бы «анимации нет и
    // непонятно почему» — ровно тот класс немых багов, что запрещён правилами.
    if (__DEV__ && to !== 0) {
      console.log('[HOME-LEVELUP] enqueue skipped: not a level up', { beforeLevel, afterLevel, from, to });
    }
    return;
  }
  const merged: HomeLevelUpCelebration = pending
    ? { fromLevel: Math.min(pending.fromLevel, from), toLevel: Math.max(pending.toLevel, to) }
    : { fromLevel: from, toLevel: to };
  pending = merged;
  if (__DEV__) {
    console.log('[HOME-LEVELUP] enqueued', { beforeLevel, afterLevel, merged, wasPending: !!pending });
  }
  emitAppEvent('home_level_up_celebration_pending');
}

/**
 * Поставить праздник по АВТОРИТЕТНЫМ уровням (сервер прислал список выданных
 * уровней, а не пару «до/после»). Диапазон берём краями списка.
 */
export function enqueueHomeLevelUpCelebrationForLevels(levels: readonly number[]): void {
  const clean = [...new Set(levels.map(sanitizeLevel).filter((level) => level > 0))].sort((a, b) => a - b);
  if (clean.length === 0) {
    if (__DEV__) console.log('[HOME-LEVELUP] enqueueForLevels skipped: empty', { levels });
    return;
  }
  // Уровень N в списке значит «человек ДОСТИГ N», то есть шёл с N-1.
  enqueueHomeLevelUpCelebration(clean[0] - 1, clean[clean.length - 1]);
}

/**
 * Забрать праздник для показа. Забирает НАСОВСЕМ (как pop), чтобы возврат на
 * Главную второй раз не проигрывал ту же анимацию повторно.
 *
 * @param currentXp текущий опыт — по нему сверяем, что человек и правда на
 *   заявленном уровне. Если опыт уже ушёл дальше (или уровня нет), диапазон
 *   подрезается по факту: показать «уровень 13», когда человек на 40-м, нельзя.
 */
export function takeHomeLevelUpCelebration(currentXp: number): HomeLevelUpCelebration | null {
  const claimed = pending;
  pending = null;
  if (!claimed) return null;
  const actualLevel = getLevelFromXP(Number.isFinite(currentXp) ? currentXp : 0);
  if (actualLevel !== claimed.toLevel) {
    // Опыт ушёл дальше, чем мы записали (или откатился). Празднуем ФАКТ, а не
    // запись: цель всегда текущий уровень человека, иначе цифра на экране
    // разойдётся с полоской. Это и есть защита от «уровень 13 при 40-м».
    if (__DEV__) {
      console.log('[HOME-LEVELUP] retargeted to actual level', { claimed, actualLevel, currentXp });
    }
    if (actualLevel <= claimed.fromLevel) {
      if (__DEV__) console.log('[HOME-LEVELUP] dropped: no growth vs actual', { claimed, actualLevel });
      return null;
    }
    return clampChain({ fromLevel: claimed.fromLevel, toLevel: actualLevel });
  }
  return clampChain(claimed);
}

/**
 * Обрезаем цепочку сверху: 30 уровней подряд (миграция, начисление долга) дали
 * бы полминуты анимации, во время которой экран заперт. Показываем последние
 * MAX_CELEBRATION_CHAIN переходов — финальная цифра при этом верная.
 */
function clampChain(celebration: HomeLevelUpCelebration): HomeLevelUpCelebration {
  const span = celebration.toLevel - celebration.fromLevel;
  if (span <= MAX_CELEBRATION_CHAIN) return celebration;
  const clamped = { fromLevel: celebration.toLevel - MAX_CELEBRATION_CHAIN, toLevel: celebration.toLevel };
  if (__DEV__) console.log('[HOME-LEVELUP] chain clamped', { celebration, clamped });
  return clamped;
}

/** Есть ли что праздновать — без забора. Для дешёвой проверки на монтировании. */
export function peekHomeLevelUpCelebration(): HomeLevelUpCelebration | null {
  return pending;
}

/** Смена аккаунта: чужой праздник показывать нельзя. */
export function resetHomeLevelUpCelebrations(): void {
  if (__DEV__ && pending) console.log('[HOME-LEVELUP] reset on account change', { pending });
  pending = null;
}

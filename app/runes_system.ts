/**
 * runes_system.ts — ЕДИНЫЙ кошелёк рун (валюта; поле `stars` в Firestore).
 *
 * зачем (владелец, 23.08): «выиграл в спине кучу рун, счётчик не изменился».
 * Расследование показало, что баланс рун жил в ТРЁХ несвязанных местах и ни одно
 * не было каноническим:
 *   1) `app/learning_v2_wallet_balance_store.ts` — кошелёк курса в подъединицах
 *      (10000 за руну), его показывал чип в шапке Уроков;
 *   2) ответ `arenaStarStore()` — только магазин Арены;
 *   3) `progress.stars` в снапшоте — сюда и пишет спин.
 * Спин клал руны в (3), пользователь смотрел на (1) — число не двигалось.
 *
 * Этот модуль — единственная точка правды для ПОКАЗА баланса рун. Он намеренно
 * НЕ дублирует логику начисления: писатель остаётся ровно один —
 * `level_spin_star_grants.ts` (это сторожит `tests/economy_constitution_contract.test.ts`,
 * см. «Spin star persistence overlays unacked composites»). Здесь только фасад:
 * синхронный peek, асинхронное чтение и событие об изменении — по образцу
 * `app/shards_system.ts` (жемчужины), чтобы экраны подключались одинаково.
 *
 * НЕ путать с звёздами-ОЦЕНКОЙ занятия (1–3 под узлом карты) и внутренней шкалой
 * сессии до 36 — это разные сущности, см. `constants/runes.ts` и
 * `docs/RUNES_RENAME_REGISTRY_2026-08-23.md`.
 */

import { getAppSnapshot, subscribeAppSnapshot } from './app_snapshot_store';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { emitAppEvent } from './events';
import { readUnifiedLevelSpinStars } from './level_spin_star_grants';

export type RunesBalance = Readonly<{
  /** Сколько рун можно потратить прямо сейчас. */
  balance: number;
  /** Сколько заработано всего (соревновательный прогресс; гранты сюда не идут). */
  earnedTotal: number;
}>;

const EMPTY: RunesBalance = Object.freeze({ balance: 0, earnedTotal: 0 });

function normalize(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}

/**
 * Баланс из снапшота. Снапшот гидрируется синхронно при старте, поэтому первый
 * кадр рисуется сразу правильным числом — без «0 и прыжок» (правило стабильности
 * вёрстки из Performance Bible).
 */
function readFromSnapshot(): RunesBalance {
  const progress = getAppSnapshot().progress;
  if (!progress) return EMPTY;
  return Object.freeze({
    balance: normalize(progress.stars),
    earnedTotal: normalize(progress.starsEarnedTotal),
  });
}

/**
 * Синхронный баланс «прямо сейчас» — аналог `peekLastKnownShardsBalance()`.
 * Годится для первого кадра и для `useState`-инициализаторов: чтения с диска нет,
 * значит нет и лишнего кадра с нулём.
 */
export function peekRunesBalance(): RunesBalance {
  return readFromSnapshot();
}

/** Короткая форма, когда нужно только тратимое число. */
export function peekRunes(): number {
  return readFromSnapshot().balance;
}

/**
 * Авторитетное чтение: поднимает проекцию с диска (включая ещё не подтверждённые
 * сервером начисления) и синхронизирует снапшот. Firestore при этом НЕ читается —
 * стоимости нет.
 */
export async function getRunesBalance(): Promise<RunesBalance> {
  const token = captureAccountGeneration();
  const stableId = token.stableId?.trim();
  if (!stableId || !isCurrentAccountGeneration(token, stableId)) return EMPTY;
  try {
    const unified = await readUnifiedLevelSpinStars(token);
    if (!isCurrentAccountGeneration(token, stableId)) return EMPTY;
    return Object.freeze({
      balance: normalize(unified.balance),
      earnedTotal: normalize(unified.earnedTotal),
    });
  } catch {
    // Проекция битая или аккаунт сменился — показываем то, что уже в снапшоте,
    // вместо нуля: занижать баланс на глазах у пользователя хуже, чем отстать.
    return readFromSnapshot();
  }
}

/**
 * Подписка на изменение баланса рун.
 *
 * Источник истины — снапшот: `publishProjection` в `level_spin_star_grants.ts`
 * патчит `progress.stars`, а `subscribeAppSnapshot` будит подписчиков. Здесь мы
 * лишь отсеиваем кадры, где руны не менялись, чтобы не будить экраны на каждое
 * несвязанное изменение снапшота (XP, серия, профиль).
 *
 * Дополнительно эмитим `runes_balance_updated` с дельтой — на нём висит анимация
 * начисления (полёт глифов футарка) на главной.
 */
export function subscribeRunesBalance(
  listener: (value: RunesBalance, delta: number) => void,
): () => void {
  let previous = readFromSnapshot();
  return subscribeAppSnapshot(() => {
    const next = readFromSnapshot();
    if (next.balance === previous.balance && next.earnedTotal === previous.earnedTotal) return;
    const delta = next.balance - previous.balance;
    previous = next;
    listener(next, delta);
    if (delta !== 0) {
      emitAppEvent('runes_balance_updated', { balance: next.balance, delta });
    }
  });
}

import type { ArenaEntryMode } from './contract';
import type { ArenaMatchPlanWire } from './duel_plan';
import type { ArenaLocalMatchState } from './match_machine';
import { arenaResolveDuel, type ArenaDuelOutcome } from './stars';
import { arenaOpponentMatchStars } from './match_view';

/**
 * Предварительный итог матча, посчитанный на устройстве.
 *
 * Зачем это существует (владелец, 2026-08-23: «после последнего вопроса очень
 * долго загружается экран завершения — сделай его прогретым»).
 *
 * Раньше порядок был такой: игрок отвечает на последнее задание → клиент шлёт
 * отчёт → ЖДЁТ ответа функции (холодный старт плюс сеть) → и только потом
 * открывает экран результата. Всё это время человек сидел на экране матча с
 * погашенным заданием и не понимал, что происходит.
 *
 * Но матч считается ЛОКАЛЬНО: свои звёзды известны в ту же миллисекунду, когда
 * закрылось последнее задание, а у сценарного соперника известен и его счёт
 * (его ходы приходят вперёд одним куском). Значит показать итог можно сразу, а
 * сервер пусть догоняет с наградами и рангом.
 *
 * Честность здесь важнее скорости, поэтому у предпросмотра два правила:
 *
 *  1. Исход объявляется ТОЛЬКО когда счёт соперника известен точно. У живого
 *     соперника, который ещё не прислал свои ходы, `opponentStars` равен null —
 *     тогда `outcome` тоже null, и экран не пишет «победа», которую сервер
 *     может опровергнуть.
 *  2. Предпросмотр НИКОГДА не начисляет: ни звёзд в кошелёк, ни ранга, ни
 *     наград. Это кадр на экране, а источник правды — ответ сервера, который
 *     приезжает следом и заменяет предпросмотр целиком.
 */
export type ArenaResultPreview = Readonly<{
  matchId: string;
  /** Режим матча: до ответа сервера только он объясняет, какие кнопки внизу. */
  mode: ArenaEntryMode;
  viewerSeat: 'a' | 'b';
  opponentSeat: 'a' | 'b';
  /** Имя и облик соперника: на экране результата плана уже нет. */
  opponentName: string;
  opponentAvatar?: string;
  opponentAura?: string;
  opponentRank: number;
  viewerStars: number;
  /** null — счёт соперника ещё неизвестен (живой соперник молчит). */
  opponentStars: number | null;
  /** null — исход честно неизвестен; экран обязан промолчать, а не гадать. */
  outcome: ArenaDuelOutcome | null;
}>;

/**
 * Сумма гонки соперника по закрытым заданиям — тай-брейк при равных звёздах.
 *
 * Считается только по непрерывному префиксу от начала: дырка в ходах означает,
 * что часть времени соперника неизвестна, и сравнивать «его сумму» со своей
 * было бы сравнением разного.
 */
function opponentTieBreakElapsedMs(
  plan: ArenaMatchPlanWire,
  state: ArenaLocalMatchState,
): number | null {
  let total = 0;
  for (let taskIndex = 0; taskIndex < plan.tasks.length; taskIndex += 1) {
    const tick = state.opponentByTask[taskIndex];
    if (!tick) return null;
    total += Math.max(0, tick.raceElapsedMs);
  }
  return total;
}

export function arenaResultPreview(
  plan: ArenaMatchPlanWire,
  state: ArenaLocalMatchState,
): ArenaResultPreview | null {
  if (state.phase !== 'finished') return null;
  // Сдача тоже доводит матч до `finished`, но она не итог игры: сдавшийся уже
  // отправлен на главную, и подсовывать ему экран результата значит отменять
  // его собственное решение выйти. Правило живёт здесь, а не на экране, чтобы
  // его сторожил тест и оно действовало для любого вызывающего.
  if (state.abandoned) return null;

  const opponentStars = arenaOpponentMatchStars(plan, state);
  const opponentElapsedMs = opponentTieBreakElapsedMs(plan, state);
  // Исход считается тем же движком, что и на сервере: расхождение показанного
  // с начисленным — ровно тот класс бага, ради которого сервер вообще
  // пересчитывает матч.
  const outcome = opponentStars !== null && opponentElapsedMs !== null
    ? arenaResolveDuel(
      { matchStars: state.matchStars, tieBreakElapsedMs: state.tieBreakElapsedMs },
      { matchStars: opponentStars, tieBreakElapsedMs: opponentElapsedMs },
    ).left
    : null;

  return {
    matchId: plan.matchId,
    mode: plan.mode,
    viewerSeat: plan.viewerSeat,
    opponentSeat: plan.opponent.seat,
    opponentName: plan.opponent.name,
    ...(plan.opponent.avatar ? { opponentAvatar: plan.opponent.avatar } : {}),
    ...(plan.opponent.aura ? { opponentAura: plan.opponent.aura } : {}),
    opponentRank: plan.opponent.rank,
    viewerStars: state.matchStars,
    opponentStars,
    outcome,
  };
}

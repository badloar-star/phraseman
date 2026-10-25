/**
 * [PEAK-CLOSE] Закрытие ступени Пика: в кадр закрытия — только видимое (окно итога и цифра монет), остальное — после анимаций.
 *
 * зачем (Сверка 24.10, docs/work/tasks/peak-perf-worst-frames-2026-10-24.txt: все кадры 1,1–1,7 с — в секунду закрытия ступени;
 * координатор 24.10): после записи на диск в ту же секунду шли повторный setWeek той же недели (второй полный проход экрана Пика),
 * пересчёт места для Главной с перечитыванием недели из AsyncStorage, отправка в облако и счётчик «Сегодня». Монеты не трогаем —
 * они ложатся сразу в spireRecordStepResult (закон «телефон решает»).
 */
import { InteractionManager } from 'react-native';
import { DebugLogger } from '../debug-logger';
import { recordTodayTaskActivity } from '../../modules/today-tasks/today_tasks_store';
import type { SpireFlushTrigger, SpireLang, SpireWeekLocal } from '../../modules/spire/report_queue';
import { addSpirePendingCoins, removeSpirePendingCoins, spireStepPendingCoins, type SpirePendingCoinsConfig } from './spire_pending_coins';
import { peekRunes } from '../runes_system';

export const PEAK_CLOSE = '[PEAK-CLOSE]';
const LOG = '[SPIRE]';

/** Та же неделя по содержимому — повторный setWeek дал бы лишний проход экрана без видимой разницы. */
export function spireSameWeek(a: SpireWeekLocal | null, b: SpireWeekLocal | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function spireCloseMark(reportId: string, t0: number, what: string): void {
  DebugLogger.info(LOG, `${PEAK_CLOSE} ${reportId} +${Date.now() - t0}мс ${what}`); // guard-ok: замер шагов закрытия
}

export type SpireStepCloseTail = Readonly<{
  reportId: string;
  t0: number;
  uid: string;
  lang: SpireLang;
  local: SpireWeekLocal;
  flushTrigger: SpireFlushTrigger | null;
  flush: (trigger: SpireFlushTrigger) => void;
  countToday: boolean;
  skipWhy: string;
}>;

/** Невидимая часть закрытия: облако, место для Главной (неделя из памяти, без диска), «Сегодня» — после анимаций окна итога. */
export function spireRunStepCloseTail(tail: SpireStepCloseTail): void {
  spireCloseMark(tail.reportId, tail.t0, 'хвост отложен до конца анимаций');
  InteractionManager.runAfterInteractions(() => {
    spireCloseMark(tail.reportId, tail.t0, `хвост пошёл: облако=${tail.flushTrigger ?? 'нет'} сегодня=${tail.countToday ? 'да' : `нет (${tail.skipWhy})`}`);
    if (tail.flushTrigger) tail.flush(tail.flushTrigger);
    void import('./spire_home_place')
      .then((m) => m.refreshSpireHomePlaceFromMemory(tail.uid, tail.lang, tail.local))
      .then((place) => spireCloseMark(tail.reportId, tail.t0, `место для Главной=${place ?? '—'} (неделя из памяти)`))
      .catch((error: unknown) => DebugLogger.warn(LOG, `${PEAK_CLOSE} ${tail.reportId} место для Главной не посчиталось: ${String(error)}`));
    // зачем (D49 + PM-280-A2, «Сегодня»): пройденная НОВАЯ ступень, легшая на диск, засчитывает «Пройти N ступеней Шпиля»; ключ — reportId
    if (tail.countToday) void recordTodayTaskActivity({ kind: 'spire_steps', unitKey: `spire:${tail.reportId}`, source: 'spire_step_passed' });
    else DebugLogger.info('[TODAY-TASKS]', `spire:skip ${tail.skipWhy} report=${tail.reportId}`);
  });
}

/**
 * [PEAK-COINS] Монеты ступени — сразу в момент итога, до записи на диск (координатор 25.10, вариант A; закон «телефон решает»).
 * Только новая пройденная ступень; повтор reportId отсекает addSpirePendingCoins. base — кошелёк сейчас (гашение по росту баланса).
 * Число на экранах — единый показ Ядра (peekDisplayedRunes / subscribeDisplayedRunes), своего счётчика здесь нет.
 */
export function spireStepCoinsNow(i: Readonly<{ owner: string | null | undefined; reportId: string; t0: number; coins: SpirePendingCoinsConfig | null | undefined; passedNew: boolean; floorBefore: number; floorCleared: boolean }>): boolean {
  if (!i.passedNew || !i.owner || !i.coins) {
    spireCloseMark(i.reportId, i.t0, `монеты сразу: нет (новая пройденная=${String(i.passedNew)} владелец=${i.owner ? 'есть' : 'нет'} конфиг=${i.coins ? 'есть' : 'нет'})`);
    return false;
  }
  const amount = spireStepPendingCoins(i.coins, i.floorBefore, i.floorCleared);
  addSpirePendingCoins(i.owner, i.reportId, amount, Date.now(), peekRunes());
  spireCloseMark(i.reportId, i.t0, `монеты сразу: +${amount} (этаж до=${i.floorBefore} этаж закрыт=${String(i.floorCleared)}) до записи на диск`);
  return true;
}

/** Запись не удалась или на диске повтор — снять показанные монеты (причина в журнал [PEAK-COINS] settle reason=…). */
export function spireStepCoinsUndo(owner: string | null | undefined, reportId: string, reason: 'save_failed' | 'save_threw' | 'duplicate_on_disk'): void {
  removeSpirePendingCoins(owner, reportId, reason);
}

// ════════════════════════════════════════════════════════════════════════
// use_today_week.ts — неделя для карточки «Неделя · N из 6 дней» на сцене «Сегодня».
//
// зачем (владелец 22.10, вариант 2 scenes-compact.html; координатор: вариант А): итоги прошедших дней лежат на телефоне
// (modules/today-tasks/today_tasks_week). Первый кадр — из памяти процесса (повторное открытие за запуск), иначе одно чтение диска
// за запуск; сети нет. Владелец — тот же, что у заданий дня на экране. fixture — для dev-превью и тестов. Журнал — [TODAY-WEEK].
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { peekTodayTasksOwnerKey, subscribeTodayTasks } from '../../../../modules/today-tasks/today_tasks_store';
import {
  peekTodayWeek,
  readTodayWeek,
  todayWeekActiveDays,
  todayWeekWindow,
  type TodayWeekCell,
  type TodayWeekDay,
} from '../../../../modules/today-tasks/today_tasks_week';

const LOG = '[TODAY-WEEK]';

export type TodayWeekView = Readonly<{
  cells: readonly TodayWeekCell[];
  /** Дней окна с занятием. */
  active: number;
  /** Неделя прочитана (из памяти, диска или fixture); до этого счётчик «N из 6» не показываем — без прыжка числа. */
  ready: boolean;
}>;

export function useTodayWeek(dayKey: string, fixture?: readonly TodayWeekDay[]): TodayWeekView {
  // зачем: владелец — подпиской на хранилище заданий: карточка в memo не перерисовалась бы, когда день загрузится после её монтирования
  const storeOwner = useSyncExternalStore(subscribeTodayTasks, peekTodayTasksOwnerKey);
  const ownerKey = fixture ? null : storeOwner;
  const [stored, setStored] = useState<Readonly<{ ownerKey: string; days: readonly TodayWeekDay[] }> | null>(() => {
    const memo = ownerKey ? peekTodayWeek(ownerKey) : null;
    return ownerKey && memo ? { ownerKey, days: memo } : null;
  });
  const days = fixture ?? (stored && stored.ownerKey === ownerKey ? stored.days : null);
  useEffect(() => {
    if (fixture) return undefined;
    if (!ownerKey) {
      console.log(LOG, 'view:wait', JSON.stringify({ reason: 'tasks_not_loaded', dayKey })); // guard-ok: ранний выход — заданий дня ещё нет
      return undefined;
    }
    if (stored && stored.ownerKey === ownerKey) return undefined;
    let alive = true;
    void readTodayWeek(ownerKey).then((next) => {
      if (!alive) {
        console.log(LOG, 'view:dropped', JSON.stringify({ reason: 'unmounted_before_read' })); // guard-ok: ранний выход
        return;
      }
      setStored({ ownerKey, days: next });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: читаем раз на владельца; день меняет только окно, не источник
  }, [ownerKey, fixture]);
  const view = useMemo<TodayWeekView>(() => {
    const cells = todayWeekWindow(days ?? [], dayKey);
    return { cells, active: todayWeekActiveDays(cells), ready: days !== null };
  }, [days, dayKey]);
  useEffect(() => {
    if (!view.ready) return;
    console.log(LOG, 'view', JSON.stringify({ dayKey, source: fixture ? 'fixture' : 'store', active: view.active, days: view.cells.map((c) => (c.day ? `${c.dayKey}:${c.day.progress.join('/')}` : `${c.dayKey}:none`)) })); // guard-ok: одна строка на показ недели
  }, [view, dayKey, fixture]);
  return view;
}

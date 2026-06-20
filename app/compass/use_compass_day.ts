/**
 * Компас — хук дня. Волна 2.3.
 *
 * Связывает шину сигналов и мозг: собирает снимок пути ученика → строит «День»
 * (тип + задачи). Чистый клиентский слой, 0 ИИ (ИИ-голос придёт отдельно, Волна 5).
 *
 * ИЗОЛЯЦИЯ: если Компас выключен — хук НИЧЕГО не грузит и отдаёт day=null. Любой
 * экран, использующий хук, при выключенном Компасе просто ничего не показывает.
 */
import { useEffect, useState } from 'react';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { compassOn } from './compass_flags';
import { collectCompassSnapshot } from './signal_bus';
import { buildCompassDay, type CompassDay } from './compass_brain';

export interface CompassDayState {
  day: CompassDay | null;
  loading: boolean;
}

/**
 * Загрузить сегодняшний «День» Компаса. Возвращает {day:null, loading:false},
 * если Компас выключен — без единого чтения сигналов.
 */
export function useCompassDay(nowMs: number): CompassDayState {
  const { studyTarget } = useStudyTarget();
  const [state, setState] = useState<CompassDayState>({ day: null, loading: compassOn() });

  useEffect(() => {
    if (!compassOn()) {
      setState({ day: null, loading: false });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    void (async () => {
      const snapshot = await collectCompassSnapshot(studyTarget, nowMs);
      if (cancelled) return;
      if (!snapshot) {
        setState({ day: null, loading: false });
        return;
      }
      setState({ day: buildCompassDay(snapshot, nowMs), loading: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [studyTarget, nowMs]);

  return state;
}

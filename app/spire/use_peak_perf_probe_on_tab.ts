/**
 * Замер [PEAK-PERF] экрана, живущего во вкладке: на виду = вкладка-владелец этот tab + экран в фокусе навигации + приложение активно.
 * зачем (координатор 25.10, владелец «скролл стал дёрганым, на главной»): вкладка Пика смонтирована и за Главной, react-freeze не
 * останавливает requestAnimationFrame замера. Экран Пика упирается в лимит 400 строк, поэтому фокус вкладки считаем здесь — тем же
 * правилом, что SpireEnergyPill / friends (runtimeOwnerId === tab). Отдельный файл: peak_perf_probe.ts остаётся без навигации
 * (его тест не тянет @react-navigation).
 */
import { useEffect } from 'react';
import { DebugLogger } from '../debug-logger';
import { useTabNav } from '../TabContext';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { usePeakPerfProbe } from './peak_perf_probe';

const SPIRE = '[SPIRE]';

export function usePeakPerfProbeOnTab(area: string, where: string, tab: string): void {
  const { runtimeOwnerId } = useTabNav();
  const active = useRuntimeActive(runtimeOwnerId === tab);
  useEffect(() => {
    // зачем: какое значение решило «на виду» — владелец вкладки (а фокус/фон приложения — если владелец совпал, а active=false)
    DebugLogger.info(SPIRE, `[PEAK-FOCUS] ${area}: вкладка-владелец=${String(runtimeOwnerId)} нужна=${tab} на виду=${String(active)}`);
  }, [active, area, runtimeOwnerId, tab]);
  usePeakPerfProbe(area, where, active);
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }

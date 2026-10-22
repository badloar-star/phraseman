// use_app_visit_gap.ts — снимок прошлого захода (welcome_back_signal) для экранов: перерисовка, когда recordLastActive его обновил.
// зачем (владелец 22.10, «По заходам»): герой Главной узнаёт разрыв, даже если сцена смонтировалась раньше, чем прочиталась отметка.
import { useSyncExternalStore } from 'react';
import { peekAppVisitGap, subscribeAppVisitGap, type AppVisitGap } from './welcome_back_signal';

export function useAppVisitGap(): AppVisitGap | null {
  return useSyncExternalStore(subscribeAppVisitGap, peekAppVisitGap, peekAppVisitGap);
}

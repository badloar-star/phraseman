/**
 * Сигнал «первое задание Learning V2 на экране» от плеера к гейту энергии.
 *
 * зачем: D72 — занятие Learning V2 платится в момент показа первого вопроса, а
 * не при открытии экрана (сейчас LearningV2SessionEnergyGate в
 * app/learning-v2/session/[id].tsx списывает ДО монтирования плеера, пока идёт
 * «Подготавливаем занятие и локальное аудио…»). Плеер живёт внутри гейта как
 * children, поэтому связь — через контекст: гейт кладёт колбэк, плеер зовёт его
 * один раз, когда первое задание реально отрисовано.
 *
 * Без провайдера (превью автора, неготовая сессия) хук — безопасный no-op с логом.
 */
import { createContext, useContext, useEffect, useRef } from 'react';

export type LearningV2FirstQuestionEnergySignal = Readonly<{
  onFirstQuestionShown: () => void;
}>;

export const LearningV2FirstQuestionEnergyContext = createContext<LearningV2FirstQuestionEnergySignal | null>(null);

/** Плеер: `useReportLearningV2FirstQuestionShown(Boolean(currentInteraction))`. */
export function useReportLearningV2FirstQuestionShown(firstQuestionRendered: boolean): void {
  const signal = useContext(LearningV2FirstQuestionEnergyContext);
  const reportedRef = useRef(false);
  useEffect(() => {
    if (!firstQuestionRendered || reportedRef.current) return;
    if (!signal) {
      console.log('[ENERGY-GATE] learning_v2: first question shown, but no energy gate provider (preview/legacy path)');
      return;
    }
    reportedRef.current = true;
    signal.onFirstQuestionShown();
  }, [firstQuestionRendered, signal]);
}

/**
 * Невидимый маркер: монтируется ТОЛЬКО в ветке рендера, где первое задание уже
 * на экране (после интро/входа в проверку). Так плееру не нужно вычислять флаг
 * до ранних return и не ломается порядок хуков.
 */
export function LearningV2FirstQuestionShownReporter(): null {
  useReportLearningV2FirstQuestionShown(true);
  return null;
}

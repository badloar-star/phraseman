import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Achievement } from '../app/achievements';
import { emitAppEvent } from '../app/events';

// H-TOASTQ: верхняя граница жизни одного тоста-достижения. showingRef сбрасывается
// в false ТОЛЬКО через dismissCurrent → showNext, а dismissCurrent зовёт рендерер
// (AchievementToast) при авто-дисмиссе. Если оверлей-слот так и не выдали
// (OverlayArbiter занят зависшей модалкой), авто-дисмисс не срабатывает → showingRef
// навсегда true → новые достижения только копятся в очереди и не показываются.
// Этот сторож гарантирует, что тост рано или поздно «закроется» и очередь продолжит
// движение даже без участия рендерера.
const TOAST_MAX_LIFETIME_MS = 12_000;

interface AchievementContextValue {
  /** Показать тост с ачивкой (может быть очередь) */
  showAchievement: (achievement: Achievement) => void;
  /** Текущий отображаемый тост */
  currentToast: Achievement | null;
  /** Скрыть текущий тост и показать следующий из очереди */
  dismissCurrent: () => void;
}

const AchievementContext = createContext<AchievementContextValue>({
  showAchievement: () => {},
  currentToast: null,
  dismissCurrent: () => {},
});

export const useAchievement = () => useContext(AchievementContext);

export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue]               = useState<Achievement[]>([]);
  const [currentToast, setCurrentToast] = useState<Achievement | null>(null);
  // Ref чтобы избежать stale closure при быстром добавлении
  const showingRef = useRef(false);
  const currentToastRef = useRef<Achievement | null>(null);
  const queuedIdsRef = useRef<Set<string>>(new Set());

  // Показать следующий из очереди
  const showNext = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0) {
        showingRef.current = false;
        currentToastRef.current = null;
        setCurrentToast(null);
        return prev;
      }
      const [next, ...rest] = prev;
      queuedIdsRef.current.delete(next.id);
      currentToastRef.current = next;
      setCurrentToast(next);
      return rest;
    });
  }, []);

  const dismissCurrent = useCallback(() => {
    currentToastRef.current = null;
    setCurrentToast(null);
    // Подождать анимацию закрытия, потом показать следующий
    setTimeout(showNext, 450);
  }, [showNext]);

  const showAchievement = useCallback((achievement: Achievement) => {
    if (currentToastRef.current?.id === achievement.id || queuedIdsRef.current.has(achievement.id)) {
      return;
    }
    if (!showingRef.current) {
      showingRef.current = true;
      currentToastRef.current = achievement;
      setCurrentToast(achievement);
    } else {
      queuedIdsRef.current.add(achievement.id);
      setQueue(prev => [...prev, achievement]);
    }
  }, []);

  // Удобная утилита: показать массив ачивок с задержкой между ними
  // Используется из hall_of_fame_utils.ts и других мест
  useEffect(() => {
    // Если очередь появилась и тост не показывается — показать
    if (queue.length > 0 && !showingRef.current) {
      showNext();
    }
  }, [queue, showNext]);

  // H-TOASTQ: страховочный сторож. Пока есть текущий тост, держим таймер; если за
  // TOAST_MAX_LIFETIME_MS его никто не закрыл (рендерер не получил оверлей-слот),
  // закрываем сами — это разблокирует showingRef и двигает очередь дальше.
  useEffect(() => {
    if (!currentToast) return;
    const t = setTimeout(() => {
      dismissCurrent();
      setTimeout(() => emitAppEvent('achievement_unlocked'), 520);
    }, TOAST_MAX_LIFETIME_MS);
    return () => clearTimeout(t);
  }, [currentToast, dismissCurrent]);

  // Мемоизируем value, чтобы не дёргать ре-рендером всех useAchievement()-потребителей.
  const contextValue = useMemo<AchievementContextValue>(
    () => ({ showAchievement, currentToast, dismissCurrent }),
    [showAchievement, currentToast, dismissCurrent],
  );

  return (
    <AchievementContext.Provider value={contextValue}>
      {children}
    </AchievementContext.Provider>
  );
}

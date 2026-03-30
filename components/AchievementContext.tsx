import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Achievement } from '../app/achievements';

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

  // Показать следующий из очереди
  const showNext = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0) {
        showingRef.current = false;
        setCurrentToast(null);
        return prev;
      }
      const [next, ...rest] = prev;
      setCurrentToast(next);
      return rest;
    });
  }, []);

  const dismissCurrent = useCallback(() => {
    setCurrentToast(null);
    // Подождать анимацию закрытия, потом показать следующий
    setTimeout(showNext, 450);
  }, [showNext]);

  const showAchievement = useCallback((achievement: Achievement) => {
    if (!showingRef.current) {
      showingRef.current = true;
      setCurrentToast(achievement);
    } else {
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

  return (
    <AchievementContext.Provider value={{ showAchievement, currentToast, dismissCurrent }}>
      {children}
    </AchievementContext.Provider>
  );
}

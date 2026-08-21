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

// H-TOASTBURST: сколько достижений подряд ещё празднуем поштучно. Владелец на новом
// аккаунте открыл разом больше десятка достижений, и каждое занимало слот на ~3.8с —
// получалась минутная лента тостов поверх модалок уровня. Начиная с этого порога
// схлопываем всю пачку в ОДИН сводный тост «Открыто N достижений».
const TOAST_SUMMARY_THRESHOLD = 3;

/** id синтетического тоста-сводки. Рендерер узнаёт его и ведёт на экран достижений. */
export const ACHIEVEMENT_SUMMARY_TOAST_ID = '__achievement_summary__';

/** Достижения, свёрнутые в сводку: рендерер показывает по ним счётчик и переход к списку. */
export interface AchievementSummaryToast extends Achievement {
  summaryCount: number;
  /**
   * id всех свёрнутых достижений. Нужны рендереру для markAchievementsNotified:
   * сводка гасит тосты сразу за всю пачку, иначе следующий flushPending поднял бы
   * те же достижения снова и лента вернулась бы.
   */
  summaryIds: string[];
}

export const isAchievementSummaryToast = (
  a: Achievement | null,
): a is AchievementSummaryToast =>
  !!a && a.id === ACHIEVEMENT_SUMMARY_TOAST_ID;

/**
 * Свернуть пачку достижений в один тост. Названия конкретных достижений сюда НЕ
 * подставляем: в сводке важно число и переход к списку, а не обрезанный многоточием
 * перечень. Локализация — в рендерере (там уже есть lang и triLang).
 */
const buildSummaryToast = (items: Achievement[]): AchievementSummaryToast => ({
  id: ACHIEVEMENT_SUMMARY_TOAST_ID,
  icon: '🏆',
  category: 'special',
  nameRu: '', nameUk: '', descRu: '', descUk: '',
  // XP уже начислен каждым достижением в отдельности (achievements.ts) —
  // у сводки собственной награды нет, иначе она бы удвоила выплату.
  xp: 0,
  summaryCount: items.length,
  summaryIds: items.flatMap((a) => (isAchievementSummaryToast(a) ? a.summaryIds : [a.id])),
});

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
      setQueue(prev => {
        // Сводка уже стоит в очереди — новое достижение вливается в её счётчик,
        // а не встаёт рядом. Иначе каскад снова растил бы ленту тостов за сводкой.
        const existingSummary = prev.find(isAchievementSummaryToast);
        if (existingSummary) {
          queuedIdsRef.current = new Set([ACHIEVEMENT_SUMMARY_TOAST_ID]);
          return [{
            ...existingSummary,
            summaryCount: existingSummary.summaryCount + 1,
            summaryIds: [...existingSummary.summaryIds, achievement.id],
          }];
        }
        const next = [...prev, achievement];
        // H-TOASTBURST: очередь разрослась — дальше показывать поштучно нельзя,
        // это та самая минутная лента. Схлопываем ВСЮ очередь в одну сводку.
        // Текущий тост (уже на экране) не трогаем: он досматривается как обычно.
        if (next.length >= TOAST_SUMMARY_THRESHOLD) {
          queuedIdsRef.current = new Set([ACHIEVEMENT_SUMMARY_TOAST_ID]);
          return [buildSummaryToast(next)];
        }
        return next;
      });
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

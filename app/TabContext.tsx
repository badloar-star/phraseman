import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { LOGICAL_TAB_IDS, type TabRuntimeOwnerId } from './tab_page_model';

interface TabCtx {
  activeIdx: number;
  goToTab: (idx: number) => void;
  goHome: () => void;
  runtimeOwnerId: TabRuntimeOwnerId;
  onSwipeStart: (idx: number) => void;
  onSwipeComplete: (idx: number) => void;
}

const TabContext = createContext<TabCtx>({
  activeIdx: 0,
  goToTab: () => {},
  goHome: () => {},
  runtimeOwnerId: 'home',
  onSwipeStart: () => {},
  onSwipeComplete: () => {},
});

export const useTabNav = () => useContext(TabContext);

// зачем (координатор 14.10, каскад [TABS-RENDER]): focusTick растёт на КАЖДЫЙ возврат фокуса группе вкладок (закрыли пейвол, вернулись из урока).
// В общем TabContext он будил всех потребителей useTabNav — и тех, кому он не нужен (Сообщество, Видео, Шпиль, каркас таббара).
// Теперь это отдельный контекст: подписываются только экраны, которые перечитывают данные по фокусу.
const TabFocusTickContext = createContext(0);
export const useTabFocusTick = () => useContext(TabFocusTickContext);

// Один источник правды: запасной runtime-владелец обязан иметь тот же индекс,
// что и физическая релизная страница. Иначе после удаления/перестановки таба
// fallback незаметно отдаёт владельца соседнего экрана.
export const TAB_KEYS = LOGICAL_TAB_IDS;

export function TabProvider({
  children,
  activeIdx,
  onTabChange,
  onSwipeStart,
  onSwipeComplete,
  focusTick,
  runtimeOwnerId: runtimeOwnerIdProp,
}: {
  children: React.ReactNode;
  activeIdx: number;
  onTabChange: (idx: number) => void;
  onSwipeStart: (idx: number) => void;
  onSwipeComplete: (idx: number) => void;
  focusTick: number;
  runtimeOwnerId?: TabRuntimeOwnerId;
}) {
  const goToTab = useCallback((idx: number) => onTabChange(idx), [onTabChange]);
  const goHome  = useCallback(() => onTabChange(0), [onTabChange]);
  const runtimeOwnerId = runtimeOwnerIdProp ?? TAB_KEYS[activeIdx] ?? 'home';
  const value = useMemo(
    () => ({ activeIdx, goToTab, goHome, runtimeOwnerId, onSwipeStart, onSwipeComplete }),
    [activeIdx, goToTab, goHome, runtimeOwnerId, onSwipeStart, onSwipeComplete],
  );
  return (
    <TabContext.Provider value={value}>
      <TabFocusTickContext.Provider value={focusTick}>{children}</TabFocusTickContext.Provider>
    </TabContext.Provider>
  );
}

/**
 * зачем (2.0, D39): Друзья переехали внутрь вкладки «Сообщество». Их экраны
 * гасят таймеры/анимации по runtimeOwnerId (например, === 'friends'). Раздел
 * внутри «Сообщества» переобъявляет владельца только для своего поддерева:
 * видимый раздел получает своё имя, скрытый — имя вкладки, то есть «не я».
 */
export function TabRuntimeOwnerOverride({
  runtimeOwnerId,
  children,
}: {
  runtimeOwnerId: TabRuntimeOwnerId;
  children: React.ReactNode;
}) {
  const parent = useContext(TabContext);
  const value = useMemo(() => ({ ...parent, runtimeOwnerId }), [parent, runtimeOwnerId]);
  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

// Required by Expo Router — not a screen
export default function TabContextModule() { return null; }

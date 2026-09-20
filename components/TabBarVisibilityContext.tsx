import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * Видимость нижнего таббара.
 *
 * зачем: раздел Learning V2 открывается ВНУТРИ вкладки «Уроки»
 * (`setPage("v2")`), поэтому таббар оставался поверх карты. Пока там был
 * обычный список, это не мешало; карта на весь экран — мешает. Владелец
 * 20.09: «какого хуя на карту пробрался таббар с главной».
 *
 * Механизм на СЧЁТЧИКЕ запросов, а не на булеве: если скрытия попросят два
 * экрана сразу, таббар вернётся только когда отпустят оба. Иначе
 * размонтирование одного экрана показало бы таббар поверх другого.
 */
type TabBarVisibilityValue = Readonly<{
  hidden: boolean;
  /** Просит скрыть таббар и возвращает функцию отмены. */
  requestHidden: () => () => void;
}>;

const TabBarVisibilityContext = createContext<TabBarVisibilityValue>({
  hidden: false,
  requestHidden: () => () => undefined,
});

export function TabBarVisibilityProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [hiddenCount, setHiddenCount] = useState(0);
  const requestHidden = useCallback(() => {
    setHiddenCount((value) => value + 1);
    let released = false;
    return () => {
      // Защита от двойного вызова: отпустить можно ровно один раз, иначе
      // счётчик уйдёт в минус и таббар пропадёт навсегда.
      if (released) return;
      released = true;
      setHiddenCount((value) => Math.max(0, value - 1));
    };
  }, []);
  const value = useMemo(
    () => ({ hidden: hiddenCount > 0, requestHidden }),
    [hiddenCount, requestHidden],
  );
  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility(): TabBarVisibilityValue {
  return useContext(TabBarVisibilityContext);
}

/**
 * Скрывает таббар, пока `active` истинно и экран смонтирован.
 * Отпускает запрос при размонтировании — таббар не может «залипнуть».
 */
export function useHideTabBar(active: boolean): void {
  const { requestHidden } = useTabBarVisibility();
  const releaseRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!active) {
      releaseRef.current?.();
      releaseRef.current = null;
      return undefined;
    }
    if (!releaseRef.current) releaseRef.current = requestHidden();
    return () => {
      releaseRef.current?.();
      releaseRef.current = null;
    };
  }, [active, requestHidden]);
}
